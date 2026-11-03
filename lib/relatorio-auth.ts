import "server-only";
import { cookies } from "next/headers";
import { iguais, segredoDosCookies } from "@/lib/senhas";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Sessão do relatório da pesquisa (pesquisa.escolaamadeus.com/relatorio).
 * Login próprio da coordenação (usuário + senha), independente do admin.
 */

const COOKIE = "relatorio_session";
const PAYLOAD = "relatorio-v1";
const MAX_AGE = 60 * 60 * 12; // 12h

const secret = segredoDosCookies;

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export async function criarSessaoRelatorio(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, sign(PAYLOAD), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function encerrarSessaoRelatorio(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, "", { path: "/", maxAge: 0 });
}

export async function relatorioAutenticado(): Promise<boolean> {
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

export function credenciaisValidas(user: string, senha: string): boolean {
  // sem RELATORIO_PASSWORD no servidor, ninguém entra (antes valia "admin123", escrito aqui)
  const u = process.env.RELATORIO_USER || "coordenacao";
  const s = process.env.RELATORIO_PASSWORD;
  if (!s) return false;
  return user.trim().toLowerCase() === u.toLowerCase() && iguais(senha, s);
}
