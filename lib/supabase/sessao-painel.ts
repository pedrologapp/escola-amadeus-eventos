import type { NextRequest, NextResponse } from "next/server";

/**
 * Sessão do painel (admin.escolaamadeus.com), Pedro 28/10/2026: "aquela tela inicial não pode ficar aberta".
 * O login do Supabase fica guardado no navegador por muito tempo; por cima dele, o painel exige uma marca de uso:
 *  - o cookie PAINEL_ATIVO, sem data de validade (some quando o navegador fecha), com a hora do último uso;
 *  - sem a marca, ou com mais de 2 horas sem uso, a pessoa sai e volta para o login.
 * Conta como uso abrir uma página ou mandar algo (POST); as consultas automáticas (GET de fundo, como a central do
 * Mundo que se atualiza sozinha) não renovam a marca, para uma aba esquecida aberta não manter o login para sempre.
 */
export const PAINEL_ATIVO = "painel_ativo";
export const LIMITE_PARADO_MS = 2 * 60 * 60 * 1000;

const opcoes = { httpOnly: true, secure: true, sameSite: "lax" as const, path: "/" };

/** Grava a marca de uso (cookie de sessão: sem maxAge nem expires). */
export function marcarUso(res: NextResponse) {
  res.cookies.set(PAINEL_ATIVO, String(Date.now()), opcoes);
}

/** A marca ainda vale? */
export function marcaValida(request: NextRequest) {
  const v = Number(request.cookies.get(PAINEL_ATIVO)?.value);
  return Number.isFinite(v) && v > 0 && Date.now() - v < LIMITE_PARADO_MS;
}

/** É uso de verdade (página aberta ou algo enviado), e não uma consulta automática? */
export function ehUso(request: NextRequest) {
  if (request.method !== "GET") return true;
  const destino = request.headers.get("sec-fetch-dest");   // navegadores antigos não mandam: aí vale "pediu uma página (HTML)"
  return destino ? destino === "document" : (request.headers.get("accept") || "").includes("text/html");
}

/** Tira o login deste navegador: apaga os cookies do Supabase (sb-*) e a marca. */
export function encerrar(request: NextRequest, res: NextResponse) {
  for (const c of request.cookies.getAll()) if (c.name.startsWith("sb-")) res.cookies.set(c.name, "", { ...opcoes, maxAge: 0 });
  res.cookies.set(PAINEL_ATIVO, "", { ...opcoes, maxAge: 0 });
  return res;
}
