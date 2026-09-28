"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { avisarDirecao, telLegivel } from "@/lib/whatsapp-grupo";

/**
 * Ações do painel do WhatsApp. Marcar resolvido/ignorar não envia nada.
 * Responder envia pelo WhatsApp da escola SÓ quando uma pessoa da equipe
 * escreve e clica em enviar (nunca automático).
 *
 * A conversa só sai da lista quando alguém marca "Resolvido" (direção,
 * 28/09/2026): responder não tira da lista, só marca como respondida.
 */

const BUCKET = "whatsapp-anexos";
const WEBHOOK = "https://n8n.escolaamadeus.com/webhook/whatsapp-responder";

async function usuario() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function marcarConversa(chatId: string, status: "resolvida" | "ignorada" | "aguardando") {
  if (!(await usuario())) return { ok: false };
  await createAdminClient()
    .from("whatsapp_conversas")
    .update({
      status,
      resolvido_em: status === "aguardando" ? null : new Date().toISOString(),
      ...(status === "aguardando" ? {} : { ultimo_texto: null }),
    })
    .eq("chat_id", chatId);
  revalidatePath("/admin/comunicacao/whatsapp");
  return { ok: true };
}

/** URL para o navegador subir o anexo direto no Storage (sem passar pelo limite do servidor). */
export async function prepararAnexo(nome: string) {
  if (!(await usuario())) return { ok: false as const, erro: "Sessão expirada." };
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-80);
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${limpo}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio do arquivo." };
  return { ok: true as const, path, token: data.token };
}

export async function enviarResposta(entrada: {
  chatId?: string | null;
  telefone?: string | null; // mensagem nova para quem ainda não tem conversa
  nome?: string | null;
  texto: string;
  anexo?: { path: string; nome: string; tipo: string } | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const user = await usuario();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin." };
  const texto = entrada.texto.trim();
  if (!texto && !entrada.anexo) return { ok: false, erro: "Escreva a mensagem ou escolha um arquivo." };
  const telefone = (entrada.telefone ?? "").replace(/\D/g, "");
  if (entrada.chatId && !/^\d{10,15}@c\.us$/.test(entrada.chatId)) return { ok: false, erro: "Conversa inválida." };
  if (!entrada.chatId && telefone.length < 12) return { ok: false, erro: "Número inválido." };
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { ok: false, erro: "WEBHOOK_CONFIRM_SECRET não configurada no servidor." };

  const db = createAdminClient();
  let arquivo: { url: string; nome: string; tipo: string } | null = null;
  if (entrada.anexo) {
    const { data } = await db.storage.from(BUCKET).createSignedUrl(entrada.anexo.path, 60 * 60);
    if (!data) return { ok: false, erro: "O arquivo não subiu. Tente de novo." };
    arquivo = { url: data.signedUrl, nome: entrada.anexo.nome, tipo: entrada.anexo.tipo || "application/octet-stream" };
  }

  let status: "enviado" | "erro" = "erro";
  let detalhe = "";
  let chatUsado = entrada.chatId ?? `${telefone}@c.us`;
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({
        chatId: entrada.chatId ?? "",
        telefone,
        texto,
        tipo: !arquivo ? "texto" : arquivo.tipo.startsWith("image/") ? "imagem" : "arquivo",
        arquivo,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; detalhe?: string; status?: string; chatId?: string };
    status = r.ok && j.ok ? "enviado" : "erro";
    detalhe = j.status === "sem_whatsapp" ? "esse número não tem WhatsApp" : j.detalhe || (r.ok ? "" : `HTTP ${r.status}`);
    if (j.chatId) chatUsado = j.chatId;
  } catch (e) {
    detalhe = (e as Error).message;
  }

  await db.from("whatsapp_respostas").insert({
    chat_id: chatUsado, texto: texto || null, arquivo_nome: arquivo?.nome ?? null,
    status, detalhe: detalhe || null, enviado_por: user.email ?? null,
  });
  if (status !== "enviado") return { ok: false, erro: `Não foi enviado${detalhe ? ` (${detalhe.slice(0, 120)})` : ""}.` };

  // Continua na lista (só sai com "Resolvido"); fica marcada como respondida.
  const agora = new Date().toISOString();
  if (entrada.chatId) {
    const quem = (user.email ?? "equipe").split("@")[0];
    const { data: conv } = await db.from("whatsapp_conversas").select("contato, telefone, alertado_em, respondido_em").eq("chat_id", entrada.chatId).maybeSingle();
    await db.from("whatsapp_conversas").update({
      ultima_da_escola: true, msgs_sem_resposta: 0, atualizado_em: agora,
      ...(conv && !conv.respondido_em ? { respondido_por: quem, respondido_em: agora } : {}),
    }).eq("chat_id", entrada.chatId);
    // Se o grupo da direção tinha sido avisado, conta que já foi respondida (ninguém responde por cima).
    if (conv?.alertado_em && !conv.respondido_em) {
      const hora = new Date(agora).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });
      await avisarDirecao(`Já respondida por ${quem} às ${hora}: ${conv.contato || telLegivel(conv.telefone)}.`);
    }
  }
  revalidatePath("/admin/comunicacao/whatsapp");
  return { ok: true };
}
