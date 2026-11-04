import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { COMANDO_HTML } from "@/lib/mundo/comando-html";

/** Arboria · Comando (04/11/2026): admin.escolaamadeus.com/arboria — a central do Mundo e a aula na Corte num app só, no computador e no celular.
 *  Usa as mesmas rotas da central e do painel da Corte (mundo-api/*). O proxy já exige o login do painel; aqui confere de novo. */
export async function GET(req: Request) {
  const supa = await createClient(); const { data } = await supa.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", req.url));
  return new NextResponse(COMANDO_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
