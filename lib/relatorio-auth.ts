import "server-only";
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Sessão do relatório da pesquisa (pesquisa.escolaamadeus.com/relatorio).
 * Login próprio da coordenação (usuário + senha), independente do admin.
 */

const COOKIE = "relatorio_session";
const PAYLOAD = "relatorio-v1";
const MAX_AGE = 60 * 60 * 12; // 12h

function secret(): string {
  return (
    process.env.WEBHOOK_CONFIRM_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "amadeus-relatorio-fallback"
  );
}

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
  const u = process.env.RELATORIO_USER || "coordenacao";
  const s = process.env.RELATORIO_PASSWORD || "admin123";
  return user.trim().toLowerCase() === u.toLowerCase() && senha === s;
}
