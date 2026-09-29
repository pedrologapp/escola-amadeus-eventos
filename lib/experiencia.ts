import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEBHOOK_ENVIO } from "@/lib/rematricula-2027";

/**
 * Experiência Amadeus (sáb 10/10/2026, 14h). Envio do encarte pelo WhatsApp da escola usando o
 * MESMO fluxo do n8n da carta da rematrícula (webhook rematricula-carta): "capa" vai como imagem
 * com o "texto" na legenda; se "imagem" vier preenchida, sai uma segunda imagem.
 * Todo número que recebe entra em experiencia_contatos (lembrete da véspera + não perder o contato).
 */

export const DIA_LEMBRETE = "2026-10-09"; // sexta, véspera: o cron só manda neste dia
export const ENCARTES = {
  convite: { rotulo: "Convite “Mãe, pai”", arquivo: "/materiais/experiencia-convite.png" },
  original: { rotulo: "Encarte original", arquivo: "/materiais/experiencia-original.png" },
} as const;
export type EscolhaEncarte = "convite" | "original" | "os_dois";
export const escolhaValida = (v: unknown): EscolhaEncarte => (v === "original" || v === "os_dois" ? v : "convite");

const MAPA = "https://www.google.com/maps/search/?api=1&query=Centro+Educacional+Amadeus+Av.+Benedito+Santana+09+S%C3%A3o+Gon%C3%A7alo+do+Amarante";
const origemDoSite = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";
const primeiro = (nome?: string | null) => (nome ?? "").trim().split(/\s+/)[0] ?? "";

export const textoConvite = (crianca?: string | null) => {
  const p = primeiro(crianca);
  return `Olá, família${p ? ` de *${p}*` : ""}! 💛 Aqui é o Centro Educacional Amadeus.

Vocês estão convidados para a *Experiência Amadeus*: no *sábado, 10 de outubro, às 14h*, venham viver um dia dentro da nossa escola junto com ${p || "seu filho ou sua filha"} e sentir na prática um pouco do que vai viver aqui.

Para confirmar a presença, é só responder esta mensagem. Vai ser uma alegria receber vocês!

📍 Av. Benedito Santana, 09 · Amarante, São Gonçalo do Amarante
${MAPA}`;
};

export const textoLembrete = (crianca?: string | null) => {
  const p = primeiro(crianca);
  return `Olá, família${p ? ` de *${p}*` : ""}! 😊 Passando para lembrar: é *amanhã, sábado (10/10), às 14h*, a *Experiência Amadeus*.

Estamos preparando tudo com muito carinho para receber vocês${p ? ` e ${p}` : ""}. Até amanhã! 💛

📍 Av. Benedito Santana, 09 · Amarante
${MAPA}`;
};

export const limparTelefone = (t: string) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

export type StatusEnvio = "enviado" | "sem_whatsapp" | "erro";
export interface Contato {
  telefone: string;
  responsavel?: string | null;
  crianca?: string | null;
  serie?: string | null;
  origem?: "novato" | "simulador" | "avulso" | "manual";
}

/** Uma mensagem (1 ou 2 imagens) para um número, pelo fluxo do n8n. */
async function mandar(telefone: string, capa: string, texto: string, imagem = ""): Promise<{ status: StatusEnvio; detalhe?: string }> {
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { status: "erro", detalhe: "WEBHOOK_CONFIRM_SECRET não configurada" };
  try {
    const resp = await fetch(WEBHOOK_ENVIO, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({ telefone, capa, texto, imagem, legenda: "" }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await resp.json().catch(() => ({}))) as { status?: StatusEnvio; detalhe?: string };
    return { status: resp.ok && j.status ? j.status : "erro", detalhe: j.detalhe || (resp.ok ? undefined : `HTTP ${resp.status}`) };
  } catch (e) {
    return { status: "erro", detalhe: (e as Error).message };
  }
}

/**
 * Salva/atualiza o contato na lista da Experiência. Não apaga o que já existe:
 * só preenche nome/criança/série quando vierem e mantém a origem mais antiga.
 */
export async function guardarContato(c: Contato) {
  const admin = createAdminClient();
  const telefone = limparTelefone(c.telefone);
  const { data: atual } = await admin.from("experiencia_contatos").select("*").eq("telefone", telefone).maybeSingle();
  const linha = {
    telefone,
    responsavel: c.responsavel?.trim() || atual?.responsavel || null,
    crianca: c.crianca?.trim() || atual?.crianca || null,
    serie: c.serie?.trim() || atual?.serie || null,
    origem: atual?.origem ?? c.origem ?? "avulso",
    atualizado_em: new Date().toISOString(),
  };
  await admin.from("experiencia_contatos").upsert(linha, { onConflict: "telefone" });
  return telefone;
}

/** Manda o encarte escolhido e guarda o contato (mesmo se der erro, para não perder o número). */
export async function enviarEncarte(c: Contato, escolha: EscolhaEncarte, enviadoPor: string | null) {
  const telefone = await guardarContato(c);
  const o = origemDoSite();
  const capa = o + (escolha === "original" ? ENCARTES.original.arquivo : ENCARTES.convite.arquivo);
  const segunda = escolha === "os_dois" ? o + ENCARTES.original.arquivo : "";
  const r = await mandar(telefone, capa, textoConvite(c.crianca), segunda);
  const admin = createAdminClient();
  await admin.from("experiencia_envios").insert({ telefone, tipo: "convite", encarte: escolha, status: r.status, detalhe: r.detalhe ?? null, enviado_por: enviadoPor });
  if (r.status === "enviado") await admin.from("experiencia_contatos").update({ convite_em: new Date().toISOString() }).eq("telefone", telefone);
  return { telefone, ...r };
}

/** Lembrete da véspera para um contato (com o convite de novo como imagem). */
export async function enviarLembrete(telefone: string, crianca: string | null, enviadoPor: string | null) {
  const r = await mandar(telefone, origemDoSite() + ENCARTES.convite.arquivo, textoLembrete(crianca));
  const admin = createAdminClient();
  await admin.from("experiencia_envios").insert({ telefone, tipo: "lembrete", encarte: "convite", status: r.status, detalhe: r.detalhe ?? null, enviado_por: enviadoPor });
  if (r.status === "enviado") await admin.from("experiencia_contatos").update({ lembrete_em: new Date().toISOString() }).eq("telefone", telefone);
  return { telefone, ...r };
}

/** Quem ainda vai receber o lembrete: marcado para lembrar, recebeu encarte e ainda não foi lembrado. */
export async function pendentesDoLembrete() {
  const { data } = await createAdminClient()
    .from("experiencia_contatos")
    .select("telefone, crianca")
    .eq("lembrar", true)
    .not("convite_em", "is", null)
    .is("lembrete_em", null)
    .order("criado_em");
  return data ?? [];
}

/** Pausa entre envios em lote, para o WhatsApp da escola não ser marcado como spam. */
export const pausa = () => new Promise((r) => setTimeout(r, 6000 + Math.random() * 6000));
