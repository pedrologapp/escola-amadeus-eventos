import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KIT, cookieValido } from "@/lib/amigomagico-acesso";
import { cabecalhosKit, ehDestino, paginaDoKit, paginaLogin } from "@/lib/amigomagico/paginas";

/**
 * /amigomagico: a porta do kit da formatura do Grupo V. Quem já entrou vê o menu (os quatro quadros);
 * quem não entrou vê a tela de login (o usuário e a senha das professoras).
 */
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (cookieValido(req.cookies.get(COOKIE_KIT)?.value)) {
    return new NextResponse(paginaDoKit("menu"), { headers: cabecalhosKit });
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
