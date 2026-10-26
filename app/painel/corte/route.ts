import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { CORTE_PAINEL_HTML } from "@/lib/mundo/corte-painel-html";

/** O painel da Corte de Arboria (26/10/2026): admin.escolaamadeus.com/corte?turma=4A, para a TV da sala. O proxy já exige o login do painel; aqui confere de novo. */
export async function GET(req: Request) {
  const supa = await createClient(); const { data } = await supa.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", req.url));
  return new NextResponse(CORTE_PAINEL_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
