import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_KIT, conferirLogin, novoCookie, opcoesCookie } from "@/lib/amigomagico-acesso";
import { DESTINOS, ehDestino } from "@/lib/amigomagico/paginas";

/** Recebe o formulário da tela de login do kit. Acertou: cookie de 30 dias e vai para o menu (ou para onde ia). */
export async function POST(req: NextRequest) {
  const f = await req.formData().catch(() => null);
  const para = String(f?.get("para") ?? "");
  const destino = ehDestino(para) ? DESTINOS[para] : "/amigomagico";
  let ok = false;
  try {
    ok = conferirLogin(String(f?.get("usuario") ?? ""), String(f?.get("senha") ?? ""));
  } catch {
    ok = false;
  }
  if (!ok) {
    await new Promise((r) => setTimeout(r, 600)); // segura um pouco quem tenta adivinhar
    const volta = new URL("/amigomagico", req.url);
    volta.searchParams.set("erro", "1");
    if (ehDestino(para)) volta.searchParams.set("para", para);
    return NextResponse.redirect(volta, 303);
  }
  const res = NextResponse.redirect(new URL(destino, req.url), 303);
  const c = novoCookie();
  res.cookies.set(COOKIE_KIT, c.valor, opcoesCookie(c.maxAge));
  return res;
}
