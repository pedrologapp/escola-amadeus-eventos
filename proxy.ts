import { NextRequest, NextResponse } from "next/server";

/**
 * Roteamento por subdomínio (Next.js 16 Proxy):
 * - admin.escolaamadeus.com → painel administrativo (rewrite para /admin/*)
 * - escolaamadeus.com       → site público (rotas em app/(public)/*)
 *
 * Em dev, acessar diretamente /admin/* no localhost:3000 também funciona
 * (sem precisar configurar admin.localhost).
 */
export function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const pathname = request.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== "production";

  const isAdminSubdomain = host.startsWith("admin.");

  if (isAdminSubdomain) {
    // Raiz do subdomínio admin → vai pro dashboard (via /admin)
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    // Qualquer outro caminho que ainda não tem /admin → rewrite para /admin/<path>
    if (!pathname.startsWith("/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = `/admin${pathname}`;
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Domínio principal: em produção, bloqueia /admin/* (só via subdomínio)
  if (pathname.startsWith("/admin") && !isDev) {
    return new NextResponse("Página não encontrada", { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Ignora:
     *  - _next/static, _next/image (assets do Next)
     *  - favicon.ico, robots.txt, sitemap.xml
     *  - arquivos com extensão (.svg, .png, .jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
