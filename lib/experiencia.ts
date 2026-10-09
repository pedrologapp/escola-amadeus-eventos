import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEBHOOK_ENVIO } from "@/lib/rematricula-2027";

/**
 * Experiência Amadeus (sáb 10/10/2026, 14h). Envio do encarte pelo WhatsApp da escola usando o
 * MESMO fluxo do n8n da carta da rematrícula (webhook rematricula-carta): "capa" vai como imagem
 * com o "texto" na legenda; se "imagem" vier preenchida, sai uma segunda imagem. Se "video" vier
 * preenchido, sai o vídeo (com o "texto" na legenda) no lugar da imagem (05/10: o vídeo do convite é o padrão).
 * Todo número que recebe entra em experiencia_contatos (lembrete da véspera + não perder o contato).
 */

export const DIA_LEMBRETE = "2026-10-09"; // sexta, véspera: o cron só manda neste dia
export const ENCARTES = {
  video: { rotulo: "Vídeo do convite", arquivo: "/materiais/experiencia-video.mp4" },
  convite: { rotulo: "Convite “Mãe, pai”", arquivo: "/materiais/experiencia-convite.png" },
  original: { rotulo: "Encarte original", arquivo: "/materiais/experiencia-original.png" },
} as const;
export type EscolhaEncarte = "video" | "convite" | "original" | "os_dois";
export const escolhaValida = (v: unknown): EscolhaEncarte => (v === "convite" || v === "original" || v === "os_dois" ? v : "video");

// Link curto e legível (app/comochegar abre o Google Maps): os pais não clicam em link que não sabem para onde vai.
const COMO_CHEGAR = "🗺️ *Como chegar* (abre o mapa): https://www.escolaamadeus.com/comochegar";
const origemDoSite = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";
const primeiro = (nome?: string | null) => (nome ?? "").trim().split(/\s+/)[0] ?? "";

// Primeira linha quando vai o vídeo (aparece junto da miniatura): convida a dar o play com o filho (Pedro, 05/10).
const chamadaVideo = (p: string) => (p ? `▶️ Assista junto com *${p}*: vai adorar o final 😊` : "▶️ Assista com seu filho(a): ele(a) vai adorar o final 😊");

export const textoConvite = (crianca?: string | null, video = false) => {
  const p = primeiro(crianca);
  return `${video ? chamadaVideo(p) + "\n\n" : ""}Olá, família${p ? ` de *${p}*` : ""}! 💛 Aqui é o Centro Educacional Amadeus.

Vocês estão convidados para a *Experiência Amadeus*: no *sábado, 10 de outubro, às 14h*, venham viver um dia dentro da nossa escola junto com ${p || "seu filho ou sua filha"} e sentir na prática um pouco do que vai viver aqui. É *gratuito*.

Para confirmar a presença, responda *EU VOU* nesta mensagem. Vai ser uma alegria receber vocês!

📍 *Onde:* Av. Benedito Santana, 09 · Amarante, São Gonçalo do Amarante
${COMO_CHEGAR}`;
};

export const textoLembrete = (crianca?: string | null) => {
  const p = primeiro(crianca);
  return `Olá, família${p ? ` de *${p}*` : ""}! 😊 Passando para lembrar: é *amanhã, sábado (10/10), às 14h*, a *Experiência Amadeus*.

Estamos preparando tudo com muito carinho para receber vocês${p ? ` e ${p}` : ""}. Até amanhã! 💛

📍 *Onde:* Av. Benedito Santana, 09 · Amarante
${COMO_CHEGAR}`;
};

export const limparTelefone = (t: string) => t.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");

export type StatusEnvio = "enviado" | "sem_whatsapp" | "erro";
export interface Contato {
  telefone: string;
  responsavel?: string | null;
  crianca?: string | null;
  serie?: string | null;
  origem?: "novato" | "simulador" | "avulso" | "manual" | "whatsapp";
}

/** Uma mensagem (1 ou 2 imagens) para um número, pelo fluxo do n8n. */
async function mandar(telefone: string, capa: string, texto: string, imagem = "", video = ""): Promise<{ status: StatusEnvio; detalhe?: string }> {
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { status: "erro", detalhe: "WEBHOOK_CONFIRM_SECRET não configurada" };
  try {
    const resp = await fetch(WEBHOOK_ENVIO, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({ telefone, capa, texto, imagem, legenda: "", video }),
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
  const video = escolha === "video" ? o + ENCARTES.video.arquivo : "";
  const r = await mandar(telefone, capa, textoConvite(c.crianca, !!video), segunda, video);
  const admin = createAdminClient();
  await admin.from("experiencia_envios").insert({ telefone, tipo: "convite", encarte: escolha, status: r.status, detalhe: r.detalhe ?? null, enviado_por: enviadoPor });
  if (r.status === "enviado") await admin.from("experiencia_contatos").update({ convite_em: new Date().toISOString() }).eq("telefone", telefone);
  return { telefone, ...r };
}

/** Texto da confirmação para quem se inscreve pela página /experiencia (06/10/2026). */
export const textoConfirmacaoSite = (nome?: string | null) => {
  const p = primeiro(nome);
  return `Olá${p ? `, ${p}` : ""}! 💛 Aqui é o Centro Educacional Amadeus.

Sua inscrição na *Experiência Amadeus* está confirmada! 🎉
📅 *Sábado, 10 de outubro, às 14h*
👨‍👩‍👧 Venha com seu filho ou sua filha. É gratuito.

Enquanto o sábado não chega, conheça a escola por dentro no nosso folder digital:
👉 https://eventos.escolaamadeus.com/conheca

📍 *Onde:* Av. Benedito Santana, 09 · Amarante, São Gonçalo do Amarante
${COMO_CHEGAR}

Qualquer dúvida, é só responder esta mensagem. Até sábado!`;
};

/**
 * Confirmação automática de quem se inscreveu pelo site: o convite como imagem, com o texto
 * (e o link do folder) na legenda. Manda uma vez só por número.
 */
export async function enviarConfirmacaoSite(telefone: string, nome: string | null) {
  const admin = createAdminClient();
  const { data: ja } = await admin.from("experiencia_envios").select("id").eq("telefone", telefone).eq("tipo", "confirmacao").eq("status", "enviado").limit(1);
  if (ja?.length) return { telefone, status: "enviado" as StatusEnvio, detalhe: "já tinha recebido" };
  const r = await mandar(telefone, origemDoSite() + ENCARTES.convite.arquivo, textoConfirmacaoSite(nome));
  await admin.from("experiencia_envios").insert({ telefone, tipo: "confirmacao", encarte: "convite", status: r.status, detalhe: r.detalhe ?? null, enviado_por: "site" });
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

/** Quem vai receber o lembrete: só quem o Pedro CONFIRMOU na lista e ainda não foi lembrado. */
export async function pendentesDoLembrete() {
  const { data } = await createAdminClient()
    .from("experiencia_contatos")
    .select("telefone, crianca")
    .eq("lembrete_confirmado", true)
    .is("lembrete_em", null)
    .order("criado_em");
  return data ?? [];
}

/** Pausa entre envios em lote, para o WhatsApp da escola não ser marcado como spam. */
export const pausa = () => new Promise((r) => setTimeout(r, 6000 + Math.random() * 6000));

/**
 * O convite também sai pelo celular da escola (a equipe encaminha o vídeo sem passar pelo sistema).
 * O monitor do WhatsApp (só leitura) vê a última mensagem de cada conversa: quando é a escola
 * mandando o convite (texto com "Experiência Amadeus", ou um vídeo até o dia do evento), o número
 * entra na lista da Experiência com origem "whatsapp". Não envia nada.
 */
const normal = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
export function eConviteDaExperiencia(m: { fromMe: boolean; body: string; mimetype: string | null; ts: number }) {
  if (!m.fromMe) return false;
  if (normal(m.body).includes("experiencia amadeus")) return true;
  return (m.mimetype ?? "").startsWith("video") && m.ts * 1000 < Date.parse("2026-10-11T03:00:00Z");
}
export async function registrarEncaminhado(telefone: string, nome: string | null, em: string) {
  const tel = limparTelefone(telefone);
  if (tel.length < 10) return;
  const admin = createAdminClient();
  const { data: atual } = await admin.from("experiencia_contatos").select("telefone, convite_em").eq("telefone", tel).maybeSingle();
  await guardarContato({ telefone: tel, responsavel: nome, origem: "whatsapp" });
  if (!atual?.convite_em) await admin.from("experiencia_contatos").update({ convite_em: em }).eq("telefone", tel);
  await admin.from("experiencia_envios").insert({ telefone: tel, tipo: "convite", encarte: "encaminhado", status: "enviado", detalhe: "saiu pelo celular da escola (visto pelo monitor)", enviado_por: "WhatsApp da escola" });
}

/**
 * Resposta do pai confirmando presença ("EU VOU", "vou sim", "confirmado", "estaremos lá"...).
 * Só vale até o dia do evento. Mensagem longa só conta se citar a Experiência, para não confundir
 * "eu vou pagar amanhã" com confirmação; quem já está na lista pode confirmar com frase curta.
 */
const CONFIRMA = /\b(eu vou|vou sim|vou ir|nos vamos|a gente vai|vamos sim|vamos ir|vamos la|confirmad[oa]s?|confirmo|confirmando|estarei|estaremos|presenca confirmada|pode contar|com certeza vamos)\b/;
export function eConfirmacaoDaExperiencia(m: { fromMe: boolean; body: string; ts: number }, naLista: boolean) {
  if (m.fromMe || m.ts * 1000 > Date.parse("2026-10-10T20:00:00Z")) return false;
  const t = normal(m.body).replace(/[^a-z0-9 ]+/g, " ").replace(/ +/g, " ").trim();
  if (!t || !CONFIRMA.test(t)) return false;
  if (t.includes("experiencia")) return true;
  return naLista ? t.length <= 60 : t.length <= 40;
}
export async function registrarPresenca(telefone: string, nome: string | null, texto: string, em: string) {
  const tel = limparTelefone(telefone);
  if (tel.length < 10) return;
  await guardarContato({ telefone: tel, responsavel: nome, origem: "whatsapp" });
  await createAdminClient().from("experiencia_contatos").update({ vai_em: em, vai_texto: texto.trim().slice(0, 140), lembrar: true }).eq("telefone", tel).is("vai_em", null);
}
/**
 * Resposta ao pedido de confirmação da véspera (09/10/2026: "você poderia nos contar se vem e quantas pessoas?").
 * Lê se a família vem e quantas pessoas. O que não der para entender fica com conferir = true no admin.
 */
const NUMEROS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10 };
const NAO_VAI = /\b(nao (vou|vamos|poderei|poderemos|vai dar|da|consigo|conseguirei|conseguiremos|irei|iremos)|infelizmente|nao estarei|nao estaremos|fica pra proxima|fica para proxima)\b/;
const VEM = /\b(vou|vamos|irei|iremos|estarei|estaremos|confirm\w*|sim|somos|seremos|com certeza|presenca|eu e)\b/;
export function lerResposta(texto: string): { vai: boolean | null; pessoas: number | null } {
  const t = normal(texto).replace(/[^a-z0-9 ,]+/g, " ").replace(/ +/g, " ").trim();
  if (!t) return { vai: null, pessoas: null };
  if (NAO_VAI.test(t)) return { vai: false, pessoas: null };
  let pessoas: number | null = null;
  // "somos 3", "vamos em 4", "3 pessoas", "eu e meus 2 filhos" (= 1 + 2)
  const digitos = [...t.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 15);
  const palavras = t.split(" ").map((p) => NUMEROS[p]).filter((n): n is number => !!n);
  const filhos = t.match(/\beu e (meus|minhas|os|as)? ?(\d{1,2}|dois|duas|tres|quatro|cinco)\b/);
  if (filhos) pessoas = 1 + (Number(filhos[2]) || NUMEROS[filhos[2]] || 0);
  else if (digitos.length) pessoas = digitos[0];
  else if (/\bsomos|seremos|vamos em|vamos ser\b/.test(t) && palavras.length) pessoas = palavras[0];
  else if (/\b(so eu|apenas eu|somente eu|eu sozinh)/.test(t)) pessoas = 1;
  else if (/\beu e\b/.test(t)) pessoas = 1 + t.split(/\beu e\b/)[1].split(/,| e /).filter((p) => p.trim()).length; // "eu e meu filho" = 2
  else if (/\beu ?,/.test(t)) pessoas = 1 + t.split(/\beu ?,/)[1].split(/,| e /).filter((p) => p.trim()).length; // "eu, meu marido e minha filha" = 3
  else if (/\b(vou|irei|vamos|iremos) com\b/.test(t)) pessoas = 1 + t.split(/\b(?:vou|irei|vamos|iremos) com\b/)[1].split(/,| e /).filter((p) => p.trim()).length; // "vou com minha filha" = 2
  else if (palavras.length && /pessoa|filh|crianc|adult/.test(t)) pessoas = palavras[0];
  const vai = pessoas !== null || VEM.test(t) ? true : null;
  return { vai, pessoas };
}
const PEDIDO_EM = Date.parse("2026-10-09T11:00:00Z"); // quando a escola mandou o pedido de confirmação
export async function registrarResposta(telefone: string, nome: string | null, texto: string, em: string, ts: number) {
  if (ts * 1000 < PEDIDO_EM || ts * 1000 > Date.parse("2026-10-10T20:00:00Z")) return;
  const tel = limparTelefone(telefone);
  const admin = createAdminClient();
  const { data: c } = await admin.from("experiencia_contatos").select("telefone, pedido_confirmacao_em, vai_em").eq("telefone", tel).maybeSingle();
  if (!c?.pedido_confirmacao_em) return; // só quem recebeu o pedido de confirmação
  const r = lerResposta(texto);
  const muda: Record<string, unknown> = { resposta_texto: texto.trim().slice(0, 200), resposta_em: em, atualizado_em: em };
  if (r.vai === false) Object.assign(muda, { nao_vai_em: em, pessoas: null, conferir: false });
  else if (r.vai) Object.assign(muda, { nao_vai_em: null, vai_em: c.vai_em ?? em, vai_texto: c.vai_em ? undefined : texto.trim().slice(0, 140), pessoas: r.pessoas, conferir: r.pessoas === null });
  else muda.conferir = true;
  if (muda.vai_texto === undefined) delete muda.vai_texto;
  await admin.from("experiencia_contatos").update(muda).eq("telefone", tel);
  if (nome) await guardarContato({ telefone: tel, responsavel: nome, origem: "whatsapp" });
}
export async function estaNaLista(telefone: string) {
  const { data } = await createAdminClient().from("experiencia_contatos").select("telefone").eq("telefone", limparTelefone(telefone)).maybeSingle();
  return !!data;
}
