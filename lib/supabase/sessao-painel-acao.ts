import { cookies } from "next/headers";
import { PAINEL_ATIVO } from "./sessao-painel";

/** Logo depois do login (ação do servidor): grava a marca de uso do painel (cookie de sessão; ver sessao-painel.ts). */
export async function marcarEntrada() {
  (await cookies()).set(PAINEL_ATIVO, String(Date.now()), { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
}
