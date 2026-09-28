import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Monitoramento do WhatsApp da escola — SÓ LEITURA. Nada aqui envia ou
 * responde mensagem (a direção proibiu: quem responde é a equipe).
 *
 * O n8n ("WhatsApp · Monitoramento (só leitura)") lê a última mensagem de
 * cada conversa a cada 5 min e manda para /api/whatsapp/monitor. O WAHA da
 * escola não guarda histórico, então só enxergamos a última mensagem de
 * cada conversa em cada leitura — suficiente para saber se o pai está
 * esperando resposta. Guardamos assunto, importância e resumo; o texto da
 * mensagem só fica guardado enquanto a conversa espera resposta, para quem
 * for responder pelo painel; é apagado quando a conversa é respondida ou
 * resolvida (LGPD).
 */

export const ASSUNTOS = [
  "Financeiro",
  "Rematrícula",
  "Falta ou saúde",
  "Pedagógico",
  "Reclamação",
  "Documentos",
  "Saída e transporte",
  "Eventos",
  "Uniforme e material",
  "Agradecimento",
  "Informação",
  "Outros",
] as const;

export type Importancia = "alta" | "media" | "baixa";

export interface MensagemVista {
  chatId: string;
  nome: string | null;
  id: string;
  ts: number; // segundos
  fromMe: boolean;
  body: string;
  hasMedia: boolean;
  mimetype: string | null;
}

interface Classificacao {
  assunto: string;
  importancia: Importancia;
  precisa_acao: boolean;
  acao: string;
  resumo: string;
}

const MODELO = "claude-haiku-4-5-20251001";

function tipoDeMidia(m: MensagemVista): string {
  const t = m.mimetype ?? "";
  if (t.startsWith("audio")) return "áudio";
  if (t.startsWith("image")) return "foto";
  if (t.startsWith("video")) return "vídeo";
  if (t) return "arquivo";
  return "mídia";
}

async function classificar(m: MensagemVista, contexto: string | null): Promise<Classificacao> {
  const texto = m.body.trim();
  if (!texto) {
    // Áudio, foto ou figurinha sem legenda: sem texto para a IA ler.
    return {
      assunto: "Outros",
      importancia: "media",
      precisa_acao: true,
      acao: `Ouvir/ver o ${tipoDeMidia(m)} enviado`,
      resumo: `Enviou ${tipoDeMidia(m)} sem texto.`,
    };
  }
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) throw new Error("ANTHROPIC_API_KEY não configurada");
  const cliente = new Anthropic({ apiKey: chave });
  const r = await cliente.messages.create({
    model: MODELO,
    max_tokens: 300,
    system:
      "Você organiza as mensagens que famílias e funcionários mandam no WhatsApp de uma escola (Centro Educacional Amadeus). " +
      "Você NUNCA responde a mensagem: só classifica para a equipe da escola saber o que fazer. " +
      `Assuntos possíveis: ${ASSUNTOS.join(", ")}. ` +
      "Importância: 'alta' para reclamação, saúde/segurança do aluno, problema de pagamento, prazo, ou pergunta direta que espera resposta hoje; " +
      "'media' para pedidos e dúvidas comuns; 'baixa' para 'ok', 'obrigado', emojis, cumprimentos e avisos que não pedem nada. " +
      "Responda SÓ um JSON: {\"assunto\":\"...\",\"importancia\":\"alta|media|baixa\",\"precisa_acao\":true|false,\"acao\":\"o que a escola precisa fazer, em até 10 palavras, ou vazio\",\"resumo\":\"o que a pessoa quer, em até 18 palavras\"}. " +
      "No resumo, não repita telefones nem dados de documentos.",
    messages: [
      {
        role: "user",
        content:
          (contexto ? `Contexto (resumo das mensagens anteriores ainda sem resposta): ${contexto}\n\n` : "") +
          `Nova mensagem${m.hasMedia ? ` (com ${tipoDeMidia(m)})` : ""}:\n${texto.slice(0, 1500)}`,
      },
    ],
  });
  const bruto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
  const json = bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1);
  const c = JSON.parse(json) as Partial<Classificacao>;
  return {
    assunto: ASSUNTOS.includes(c.assunto as (typeof ASSUNTOS)[number]) ? (c.assunto as string) : "Outros",
    importancia: c.importancia === "alta" || c.importancia === "baixa" ? c.importancia : "media",
    precisa_acao: !!c.precisa_acao,
    acao: String(c.acao ?? "").slice(0, 120),
    resumo: String(c.resumo ?? "").slice(0, 240),
  };
}

const PESO: Record<Importancia, number> = { baixa: 0, media: 1, alta: 2 };

/** Processa o lote que o n8n mandou. Devolve quantas mensagens novas entraram. */
export async function processarLote(msgs: MensagemVista[]): Promise<{ novas: number; classificadas: number; erros: number }> {
  const db = createAdminClient();
  const individuais = msgs.filter((m) => m.chatId.endsWith("@c.us") && m.id && m.ts);
  if (!individuais.length) return { novas: 0, classificadas: 0, erros: 0 };

  const { data: atuais } = await db
    .from("whatsapp_conversas")
    .select("*")
    .in("chat_id", individuais.map((m) => m.chatId));
  const porChat = new Map((atuais ?? []).map((c) => [c.chat_id as string, c]));

  let novas = 0;
  let classificadas = 0;
  let erros = 0;
  for (const m of individuais) {
    const atual = porChat.get(m.chatId);
    if (atual?.ultima_msg_id === m.id) {
      // Nada novo. Só completa o texto de quem ficou sem (conversas lidas antes de guardarmos o texto).
      if (!m.fromMe && atual.status === "aguardando" && !atual.ultimo_texto) {
        await db.from("whatsapp_conversas").update({ ultimo_texto: (m.body.trim() || `[${tipoDeMidia(m)}]`).slice(-2000) }).eq("chat_id", m.chatId);
      }
      continue;
    }
    novas++;
    const em = new Date(m.ts * 1000).toISOString();
    const telefone = m.chatId.replace(/@.*/, "");
    const base = { chat_id: m.chatId, contato: m.nome ?? atual?.contato ?? null, telefone, ultima_msg_id: m.id, ultima_msg_em: em, atualizado_em: new Date().toISOString() };

    if (m.fromMe) {
      // A escola respondeu. Se a conversa estava na lista, CONTINUA nela (só sai quando alguém
      // marca "Resolvido" — direção, 28/09/2026), agora marcada como respondida.
      await db.from("whatsapp_eventos").upsert({ msg_id: m.id, chat_id: m.chatId, da_escola: true, em });
      await db.from("whatsapp_conversas").upsert({
        ...base,
        ultima_da_escola: true,
        msgs_sem_resposta: 0,
        status: atual?.status ?? "respondida",
      });
      continue;
    }

    // Ainda sem resposta da escola desde a última mensagem do contato.
    const ainda = atual && atual.status === "aguardando" && !atual.ultima_da_escola;
    let cls: Classificacao;
    try {
      cls = await classificar(m, ainda ? atual.resumo : null);
      classificadas++;
    } catch {
      erros++;
      cls = { assunto: "Outros", importancia: "media", precisa_acao: true, acao: "Ler a mensagem", resumo: "Não foi possível classificar." };
    }
    // Mantém a maior importância enquanto a conversa segue sem resposta.
    const importancia =
      ainda && PESO[atual.importancia as Importancia] > PESO[cls.importancia] ? (atual.importancia as Importancia) : cls.importancia;
    await db.from("whatsapp_eventos").upsert({
      msg_id: m.id, chat_id: m.chatId, da_escola: false, em, assunto: cls.assunto, importancia: cls.importancia, resumo: cls.resumo,
    });
    await db.from("whatsapp_conversas").upsert({
      ...base,
      ultima_da_escola: false,
      aguardando_desde: ainda ? atual.aguardando_desde : em,
      msgs_sem_resposta: ainda ? (atual.msgs_sem_resposta ?? 0) + 1 : 1,
      assunto: cls.assunto,
      importancia,
      precisa_acao: cls.precisa_acao || (ainda ? !!atual.precisa_acao : false),
      acao: cls.acao || (ainda ? atual.acao : null),
      resumo: ainda && atual.resumo ? `${atual.resumo} / ${cls.resumo}`.slice(-400) : cls.resumo,
      // Texto só enquanto espera resposta (para quem for responder); apagado ao responder/resolver.
      ultimo_texto: (() => {
        const t = m.body.trim() || `[${tipoDeMidia(m)}]`;
        return (ainda && atual.ultimo_texto ? `${atual.ultimo_texto}
${t}` : t).slice(-2000);
      })(),
      status: "aguardando",
      resolvido_em: null,
    });
  }
  return { novas, classificadas, erros };
}
