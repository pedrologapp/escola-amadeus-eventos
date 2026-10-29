import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Link assinado da imagem do comprovante da matrícula à vista (/api/cobrancas/comprovante). Tem nome de criança e valores: só abre com o
 * id da cobrança assinado, e vence em 7 dias (o tempo de o WhatsApp baixar a imagem). Os valores são lidos do banco na hora.
 */

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

function segredo() {
  const s = process.env.WEBHOOK_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Sem segredo para assinar o link do comprovante.");
  return s;
}

const assinar = (p: string) => createHmac("sha256", segredo()).update(`comprovante-avista:${p}`).digest("base64url");

export function linkDoComprovante(origem: string, cobrancaId: string): string {
  const p = Buffer.from(JSON.stringify({ id: cobrancaId, e: Date.now() + VALIDADE_MS })).toString("base64url");
  return `${origem}/api/cobrancas/comprovante?p=${p}&s=${assinar(p)}`;
}

export function lerLinkDoComprovante(p: string | null, s: string | null): string | null {
  if (!p || !s) return null;
  const esperado = Buffer.from(assinar(p));
  const recebido = Buffer.from(s);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString()) as { id: string; e: number };
    return d.e > Date.now() && /^[0-9a-f-]{36}$/i.test(d.id) ? d.id : null;
  } catch {
    return null;
  }
}
