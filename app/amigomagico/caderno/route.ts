import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KIT, cookieValido, novoCookie, opcoesCookie } from "@/lib/amigomagico-acesso";
import { cabecalhosKit, paginaDoKit } from "@/lib/amigomagico/paginas";

/** O caderno da professora (16 telas), só para quem entrou no kit (e renova o acesso); senão, a tela de login (e volta para cá depois). */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (!cookieValido(req.cookies.get(COOKIE_KIT)?.value)) {
    return NextResponse.redirect(new URL("/amigomagico?para=caderno", req.url), 303);
  }
  const res = new NextResponse(paginaDoKit("caderno"), { headers: cabecalhosKit });
  const c = novoCookie();
  res.cookies.set(COOKIE_KIT, c.valor, opcoesCookie(c.maxAge));
  return res;
}
