import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * API oficial do WhatsApp pela YCloud (número comercial +55 84 8145-0229,
 * conectado em 15/10/2026 por coexistência). Fora do n8n.
 *
 * Variáveis na Vercel:
 *  - YCLOUD_API_KEY: chave da API (YCloud → Developers → API Keys)
 *  - YCLOUD_WEBHOOK_SECRET: segredo do webhook (whsec_...), para conferir a assinatura
 *  - YCLOUD_NUMERO: número da escola, ex. +558481450229
 */

const API = "https://api.ycloud.com/v2";

/** Confere o cabeçalho YCloud-Signature (t=...,s=...): HMAC-SHA256 de "t.corpo cru", em hex. */
export function assinaturaValida(corpo: string, cabecalho: string | null, segredo: string, tolerancia = 300): boolean {
  if (!cabecalho) return false;
  const pares = cabecalho.split(",").map((p) => p.trim().split("="));
  const t = pares.find(([k]) => k === "t")?.[1];
  const assinaturas = pares.filter(([k]) => k === "s").map(([, v]) => v ?? "");
  if (!t || !/^\d+$/.test(t) || Math.abs(Date.now() / 1000 - Number(t)) > tolerancia) return false;
  const esperado = createHmac("sha256", segredo).update(`${t}.${corpo}`).digest();
  return assinaturas.some((h) => /^[0-9a-f]{64}$/i.test(h) && timingSafeEqual(esperado, Buffer.from(h, "hex")));
}

type Envio = { type: "text"; text: { body: string } } | { type: "image"; image: { link: string; caption?: string } };

/** Envia na hora (sendDirectly). Só serve dentro das 24 h depois da última mensagem do pai. */
async function enviar(para: string, msg: Envio): Promise<{ ok: boolean; detalhe?: string }> {
  const chave = process.env.YCLOUD_API_KEY;
  const de = process.env.YCLOUD_NUMERO;
  if (!chave || !de) return { ok: false, detalhe: "YCLOUD_API_KEY ou YCLOUD_NUMERO não configurada" };
  try {
    const r = await fetch(`${API}/whatsapp/messages/sendDirectly`, {
      method: "POST",
      headers: { "X-API-Key": chave, "Content-Type": "application/json" },
      body: JSON.stringify({ from: de, to: para, ...msg }),
      signal: AbortSignal.timeout(30_000),
    });
    const j = (await r.json().catch(() => ({}))) as { status?: string; errorMessage?: string; error?: { message?: string } };
    if (!r.ok || j.status === "failed") return { ok: false, detalhe: j.errorMessage ?? j.error?.message ?? `HTTP ${r.status}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, detalhe: (e as Error).message };
  }
}

export const enviarTexto = (para: string, texto: string) => enviar(para, { type: "text", text: { body: texto } });
export const enviarImagem = (para: string, link: string, legenda?: string) =>
  enviar(para, { type: "image", image: { link, ...(legenda ? { caption: legenda } : {}) } });

/** O que interessa do evento whatsapp.inbound_message.received. */
export interface MensagemRecebida {
  id: string;
  de: string; // +55...
  nome: string | null;
  tipo: string;
  texto: string; // corpo do texto ou o rótulo do botão tocado
}

export function lerEvento(j: unknown): MensagemRecebida | null {
  const e = j as { type?: string; whatsappInboundMessage?: Record<string, unknown> };
  if (e?.type !== "whatsapp.inbound_message.received" || !e.whatsappInboundMessage) return null;
  const m = e.whatsappInboundMessage as {
    id?: string; wamid?: string; from?: string; type?: string;
    customerProfile?: { name?: string };
    text?: { body?: string };
    button?: { text?: string; payload?: string };
    interactive?: { button_reply?: { title?: string } };
  };
  const de = m.from;
  const id = m.wamid ?? m.id;
  if (!de || !id) return null;
  const texto = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? "";
  return { id, de, nome: m.customerProfile?.name ?? null, tipo: m.type ?? "", texto };
}
