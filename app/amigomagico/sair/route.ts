import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KIT, opcoesCookie } from "@/lib/amigomagico-acesso";

/** "Sair" do menu do kit: apaga o cookie e volta para a tela de login. */
export function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/amigomagico", req.url), 303);
  res.cookies.set(COOKIE_KIT, "", opcoesCookie(0));
  return res;
}
