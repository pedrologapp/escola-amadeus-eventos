import "server-only";

import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Acesso das professoras ao kit da formatura do Grupo V (/amigomagico): um login único e compartilhado, escolhido pelo
 * Pedro (18/11/2026). O usuário não diferencia maiúsculas; a senha NÃO está no código: só o hash scrypt em
 * AMIGOMAGICO_SENHA_HASH ("scrypt:<sal hex>:<hash hex>"; dois-pontos e não cifrão, que o .env do Next expande). Quem acerta recebe um cookie httpOnly assinado com
 * AMIGOMAGICO_SEGREDO, que vale 30 dias. As rotas do kit (menu, caderno, diário e as ações do diário) conferem no servidor.
 */

export const USUARIO_KIT = "grupov";
export const COOKIE_KIT = "amigomagico";
const DIAS = 30;

function segredo() {
  const s = process.env.AMIGOMAGICO_SEGREDO;
  if (!s || s.length < 32) throw new Error("AMIGOMAGICO_SEGREDO não está configurada.");
  return s;
}

const assinar = (validade: number) => createHmac("sha256", segredo()).update(`amigomagico:${validade}`).digest("base64url");

/** Confere usuário e senha (o usuário sem diferença de maiúsculas). */
export function conferirLogin(usuario: string, senha: string): boolean {
  const okUsuario = String(usuario ?? "").trim().toLowerCase() === USUARIO_KIT;
  const [alg, salHex, hashHex] = String(process.env.AMIGOMAGICO_SENHA_HASH ?? "").split(":");
  if (alg !== "scrypt" || !salHex || !hashHex) throw new Error("AMIGOMAGICO_SENHA_HASH não está configurada.");
  const esperado = Buffer.from(hashHex, "hex");
  const obtido = scryptSync(String(senha ?? ""), Buffer.from(salHex, "hex"), esperado.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(esperado, obtido) && okUsuario;
}

/** Valor do cookie para quem acabou de entrar: "<validade em ms>.<assinatura>". */
export function novoCookie() {
  const validade = Date.now() + DIAS * 864e5;
  return { valor: `${validade}.${assinar(validade)}`, maxAge: DIAS * 86400 };
}

export function cookieValido(valor: string | undefined | null): boolean {
  const [vTxt, sig] = String(valor ?? "").split(".");
  const validade = Number(vTxt);
  if (!validade || !sig || validade < Date.now()) return false;
  try {
    const a = Buffer.from(assinar(validade)), b = Buffer.from(sig);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Para server components e server actions. */
export async function professoraLogada(): Promise<boolean> {
  return cookieValido((await cookies()).get(COOKIE_KIT)?.value);
}

export const opcoesCookie = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/amigomagico",
  maxAge,
});
