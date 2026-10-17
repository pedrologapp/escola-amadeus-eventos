import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { buscar, historicoDoAluno, lerAluno, listarAlunos } from "@/lib/rematricula-2027-dados";
import { linkDaCarta, type DadosCarta } from "@/lib/rematricula-2027-link";
import { legendaCarta, primeiroNome, trocaDeSegmento } from "@/lib/rematricula-2027";
import { chaveTelefone } from "@/lib/whatsapp-contatos";
import { enviarImagem, enviarTexto, type MensagemRecebida } from "@/lib/ycloud";
import { filhosCitados, perguntaValor, querRenovar, type Filho } from "@/lib/whatsapp-auto-regras";

/**
 * Resposta automática da rematrícula no WhatsApp oficial (pedido do Pedro em
 * 16/10/2026). Só age quando o pai pergunta o valor:
 *  1. "qual o valor?" → pede o nome do filho;
 *  2. o nome bate (90% das letras) com um filho ligado àquele número no
 *     Activesoft → manda a carta de 2027 de TODOS os filhos daquele número;
 *  3. não bate duas vezes, número sem cadastro ou caso fora do padrão →
 *     "a secretaria vai te enviar", e a secretaria responde pelo Inbox da YCloud.
 * Quem toca "Quero renovar" (botão do modelo da rematrícula) recebe na hora a
 * confirmação de que a secretaria vai falar com ele (pedido do Pedro, 17/10).
 * Qualquer outra mensagem fica para a equipe (nada é respondido).
 *
 * O desconto é o do ano passado, mantido (o que o Isaac tira no pagamento
 * além da Fidelidade), sem irmão nem desconto especial: o mesmo que a tela
 * da rematrícula mostra quando abre o aluno.
 *
 * Liga/desliga na Vercel: WHATSAPP_AUTO = "todos" ou uma lista de números
 * separados por vírgula (teste). Sem a variável, não responde ninguém.
 * A parte do valor/encarte só liga com WHATSAPP_AUTO_VALOR = "sim" (o Pedro
 * pediu em 17/10 para começar só com o "Quero renovar").
 */

const ESPERA_NOME_MIN = 60;
const origemDoSite = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";

const TEXTO = {
  pedirNome: "Claro! Para eu te mandar os valores certinhos, me confirma o nome completo do seu filho ou da sua filha?",
  nomeErrado: "Não encontrei esse nome no cadastro deste número. Pode escrever o nome completo do aluno, como está na matrícula?",
  secretaria: "A secretaria vai te enviar os valores por aqui em instantes.",
  semCadastro: "Não encontrei este número no cadastro dos alunos. A secretaria vai te enviar os valores por aqui em instantes.",
  depois: "Os descontos valem pagando até o dia 05 de cada mês. Para renovar, é só responder *Quero renovar* que a secretaria fala com você por aqui.",
  renovar: "Recebemos seu pedido de renovação para 2027. A secretaria vai falar com você por aqui em breve para concluir.\n\nEscola Amadeus",
  alguns: (nomes: string[]) => `Os valores de ${nomes.join(" e ")} a secretaria vai te enviar por aqui em instantes.`,
};

export function liberado(telefone: string): boolean {
  const v = (process.env.WHATSAPP_AUTO ?? "").trim();
  if (!v) return false;
  if (v.toLowerCase() === "todos") return true;
  const k = chaveTelefone(telefone);
  return v.split(",").some((n) => chaveTelefone(n) === k);
}

type Json = Record<string, unknown>;
const lista = (x: unknown) => (Array.isArray(x) ? x : ((x as { results?: Json[] })?.results ?? [])) as Json[];

/** Alunos ativos que têm aquele celular em responsável, responsável secundário, filiação ou adicionais. */
export async function filhosDoTelefone(telefone: string): Promise<Filho[]> {
  const k = chaveTelefone(telefone);
  if (!k) return [];
  const [cad, resp, ativos] = await Promise.all([buscar("v1/lista_alunos/", 3600), buscar("v1/lista_responsaveis/", 3600), listarAlunos()]);
  // Teste: WHATSAPP_AUTO_TESTE="84999999999=123|456" faz esse número agir como responsável desses alunos.
  for (const par of (process.env.WHATSAPP_AUTO_TESTE ?? "").split(",")) {
    const [n, ids] = par.split("=");
    if (n && ids && chaveTelefone(n) === k) {
      return ids.split("|").map(Number).flatMap((id) => ativos.filter((a) => a.id === id).map((a) => ({ id: a.id, nome: a.nome })));
    }
  }
  const meus = new Set(lista(resp).filter((r) => chaveTelefone(String(r.celular ?? "")) === k).map((r) => r.id as number));
  if (!meus.size) return [];
  const porId = new Map(ativos.map((a) => [a.id, a]));
  const saida: Filho[] = [];
  for (const c of lista(cad)) {
    const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...((c.responsaveis_adicionais_ids as number[]) ?? [])];
    const a = porId.get(c.id as number);
    if (a && ids.some((i) => meus.has(i as number)) && !saida.some((s) => s.id === a.id)) saida.push({ id: a.id, nome: a.nome });
  }
  return saida;
}

/** Link da carta de 2027 do aluno, ou o motivo de ir para a secretaria. */
export async function cartaDoAluno(id: number): Promise<{ link: string; nome: string } | { motivo: string; nome: string }> {
  const l = await lerAluno(id);
  if (!l) return { motivo: "aluno não encontrado", nome: "" };
  const nome = l.aluno.nome;
  if (!l.serie2027) return { motivo: "sem série em 2027 (9º ano ou série desconhecida)", nome };
  if ((await historicoDoAluno(id)).some((a) => a.ano === 2027)) return { motivo: "já rematriculado para 2027", nome };
  if (l.pendencias.length) return { motivo: "pendência financeira", nome };
  // "Provável" vai com a mesma base que a tela já traz preenchida; só "Precisa de você" fica com a secretaria.
  if (l.base === null || l.confianca === "revisar") return { motivo: `conferir a mensalidade (${l.explicacao})`, nome };
  const troca = trocaDeSegmento(l.aluno.serie, l.serie2027);
  const dados: DadosCarta = {
    nome,
    serie: l.serie2027,
    veterano: true,
    desconto: l.descontoPagamento ?? 0,
    irmao: false,
    extra: 0,
    base: troca ? null : l.base,
    serieAtual: l.aluno.serie,
    modo: "com",
    tipo: "mensal",
    data: new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "long", year: "numeric" }),
  };
  return { link: linkDaCarta(origemDoSite(), dados), nome };
}

type Evento = "pediu_nome" | "nome_errado" | "enviou_carta" | "secretaria" | "quer_renovar" | "ignorado";

export async function processarMensagem(m: MensagemRecebida): Promise<Evento | "repetida" | "bloqueado"> {
  const tel = m.de.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (!liberado(tel)) return "bloqueado";
  const db = createAdminClient();

  // Uma linha por mensagem recebida: se a YCloud reenviar o mesmo evento, o msg_id repetido barra aqui.
  const { data: linha, error } = await db.from("whatsapp_auto").insert({ telefone: tel, msg_id: m.id, evento: "ignorado" }).select("id").single();
  if (error || !linha) return "repetida";
  const marcar = (evento: Evento, extra: { aluno_id?: number | null; aluno_nome?: string | null; detalhe?: string | null } = {}) =>
    db.from("whatsapp_auto").update({ evento, ...extra }).eq("id", linha.id);

  const desde = new Date(Date.now() - ESPERA_NOME_MIN * 60_000).toISOString();
  const { data: recentes } = await db
    .from("whatsapp_auto")
    .select("evento, created_at")
    .eq("telefone", tel)
    .neq("id", linha.id)
    .neq("evento", "ignorado")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(5);
  const ultimo = recentes?.[0]?.evento as Evento | undefined;
  const aguardandoNome = ultimo === "pediu_nome" || ultimo === "nome_errado";

  if (querRenovar(m.texto)) {
    // Tocou de novo logo depois: não repete a confirmação.
    if (recentes?.some((r) => r.evento === "quer_renovar")) return "ignorado";
    const r = await enviarTexto(m.de, TEXTO.renovar);
    await marcar("quer_renovar", { detalhe: r.ok ? null : `envio falhou: ${r.detalhe}` });
    return "quer_renovar";
  }

  if (process.env.WHATSAPP_AUTO_VALOR !== "sim") return "ignorado";

  if (aguardandoNome) {
    const filhos = await filhosDoTelefone(tel);
    const citados = filhosCitados(m.texto, filhos);
    if (!citados.length) {
      if (ultimo === "nome_errado") {
        await enviarTexto(m.de, TEXTO.secretaria);
        await marcar("secretaria", { detalhe: "nome não bateu duas vezes" });
        return "secretaria";
      }
      await enviarTexto(m.de, TEXTO.nomeErrado);
      await marcar("nome_errado");
      return "nome_errado";
    }
    // Nome confirmado: vai a carta de todos os filhos daquele número.
    const enviados: string[] = [];
    const paraSecretaria: { nome: string; motivo: string }[] = [];
    for (const f of filhos) {
      const c = await cartaDoAluno(f.id).catch((e) => ({ motivo: (e as Error).message, nome: f.nome }));
      if ("link" in c) {
        const r = await enviarImagem(m.de, c.link, legendaCarta(primeiroNome(c.nome)));
        if (r.ok) enviados.push(c.nome);
        else paraSecretaria.push({ nome: c.nome, motivo: `envio falhou: ${r.detalhe}` });
      } else paraSecretaria.push({ nome: c.nome || f.nome, motivo: c.motivo });
    }
    if (enviados.length) await enviarTexto(m.de, TEXTO.depois);
    if (paraSecretaria.length) await enviarTexto(m.de, enviados.length ? TEXTO.alguns(paraSecretaria.map((p) => primeiroNome(p.nome))) : TEXTO.secretaria);
    const detalhe = paraSecretaria.map((p) => `${p.nome}: ${p.motivo}`).join(" · ") || null;
    await marcar(enviados.length ? "enviou_carta" : "secretaria", { aluno_id: citados[0].id, aluno_nome: [...enviados, ...paraSecretaria.map((p) => p.nome)].join(", "), detalhe });
    return enviados.length ? "enviou_carta" : "secretaria";
  }

  if (!perguntaValor(m.texto)) return "ignorado";
  // Acabou de receber a carta e perguntou de novo: deixa para a equipe.
  if (ultimo === "enviou_carta" || ultimo === "secretaria") return "ignorado";

  const filhos = await filhosDoTelefone(tel);
  if (!filhos.length) {
    await enviarTexto(m.de, TEXTO.semCadastro);
    await marcar("secretaria", { detalhe: "número sem aluno no cadastro" });
    return "secretaria";
  }
  await enviarTexto(m.de, TEXTO.pedirNome);
  await marcar("pediu_nome", { detalhe: `${filhos.length} aluno(s) neste número` });
  return "pediu_nome";
}
