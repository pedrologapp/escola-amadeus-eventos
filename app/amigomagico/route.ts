import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KIT, cookieValido, novoCookie, opcoesCookie } from "@/lib/amigomagico-acesso";
import { cabecalhosKit, ehDestino, paginaDoKit, paginaLogin } from "@/lib/amigomagico/paginas";

/**
 * /amigomagico: a porta do kit da formatura do Grupo V. Quem já entrou vê o menu (os quatro quadros), e o acesso
 * se renova (não pede o login de novo); quem não entrou vê a tela de login (o usuário e a senha das professoras).
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (cookieValido(req.cookies.get(COOKIE_KIT)?.value)) {
    const res = new NextResponse(paginaDoKit("menu"), { headers: cabecalhosKit });
    const c = novoCookie();
    res.cookies.set(COOKIE_KIT, c.valor, opcoesCookie(c.maxAge));
    return res;
  }
  const q = req.nextUrl.searchParams;
  const para = q.get("para");
  return new NextResponse(
    paginaLogin({
      erro: q.get("erro") ? "Usuário ou senha não conferem. Tente de novo." : undefined,
      para: ehDestino(para) ? para : undefined,
    }),
    { headers: cabecalhosKit },
  );
}
