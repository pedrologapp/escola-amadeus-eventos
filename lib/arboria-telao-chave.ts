import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Chave do link público do telão do Arboria (/arboria/telao/<chave>), para abrir
 * na TV de qualquer computador sem login no admin. O código é público no GitHub,
 * então a chave não fica escrita aqui: sai do segredo do servidor. Trocar o
 * WEBHOOK_CONFIRM_SECRET troca o link (o novo aparece no admin, aba Apresentações).
 */
export function chaveTelao(): string {
  const s = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!s) throw new Error("WEBHOOK_CONFIRM_SECRET não está configurada.");
  return createHmac("sha256", s).update("arboria-telao-publico").digest("base64url").slice(0, 16);
}

export function chaveTelaoValida(chave: string | null | undefined): boolean {
  if (!chave) return false;
  const a = Buffer.from(chaveTelao()), b = Buffer.from(chave);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const linkTelaoPublico = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com"}/arboria/telao/${chaveTelao()}`;
