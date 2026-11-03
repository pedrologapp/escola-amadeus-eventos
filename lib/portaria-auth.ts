import "server-only";
import { cookies } from "next/headers";
import { segredoDosCookies, senhaAcaoValida } from "@/lib/senhas";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Sessão da Portaria — independente do login de admin (Supabase).
 *
 * O acesso é liberado por uma senha compartilhada (ADMIN_ACTION_PASSWORD).
 * Ao acertar a senha, gravamos um cookie httpOnly assinado por HMAC com um
 * segredo do servidor. Como o atacante não tem o segredo, não consegue forjar
 * o cookie; e por ser httpOnly o JavaScript do navegador não o lê.
 */

const COOKIE = "portaria_session";
const PAYLOAD = "portaria-v1";
const MAX_AGE = 60 * 60 * 12; // 12h

// WEBHOOK_CONFIRM_SECRET é um segredo já existente e estável no servidor (lib/senhas.ts).
const secret = segredoDosCookies;

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function criarSessaoPortaria(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(PAYLOAD), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function encerrarSessaoPortaria(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function portariaAutenticada(): Promise<boolean> {
  const store = await cookies();
  const valor = store.get(COOKIE)?.value;
  if (!valor) return false;
  const esperado = sign(PAYLOAD);
  try {
    const a = Buffer.from(valor);
    const b = Buffer.from(esperado);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** A mesma senha das ações sensíveis do admin; sem a variável no servidor, ninguém entra (lib/senhas.ts). */
export const senhaPortariaValida = senhaAcaoValida;
