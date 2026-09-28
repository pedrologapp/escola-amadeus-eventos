import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Senha para ver valores no admin (Cobranças e Eventos). Nem todo mundo que
 * entra no admin pode ver dinheiro (direção, 28/09/2026). Sem o cookie, as
 * páginas não mandam os valores para o navegador — mostram "R$ ••••".
 *
 * Mesma senha das ações sensíveis (ADMIN_ACTION_PASSWORD). Cookie httpOnly
 * assinado (HMAC), vale 8h.
 */

const COOKIE = "valores_liberados";
const PAYLOAD = "valores-v1";
const MAX_AGE = 60 * 60 * 8;

function segredo(): string {
  return process.env.WEBHOOK_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "amadeus-valores-fallback";
}
const assinar = () => createHmac("sha256", segredo()).update(PAYLOAD).digest("hex");

export async function valoresLiberados(): Promise<boolean> {
  const valor = (await cookies()).get(COOKIE)?.value;
  if (!valor) return false;
  const a = Buffer.from(valor);
  const b = Buffer.from(assinar());
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function gravarLiberacao(liberar: boolean): Promise<void> {
  const store = await cookies();
  if (!liberar) return void store.set(COOKIE, "", { path: "/", maxAge: 0 });
  store.set(COOKIE, assinar(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export const senhaValoresValida = (senha: string) => senha === (process.env.ADMIN_ACTION_PASSWORD || "Admim123");

/** Máscara usada no servidor quando os valores estão trancados. */
export const MASCARA = "R$ ••••";
