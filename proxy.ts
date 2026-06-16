import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Proxy (Next.js 16) — sucessor do middleware.
 *
 * Responsabilidades:
 *  1. Roteamento por subdomínio (admin.* → /admin/*)
 *  2. Auth gate em /admin/* (redireciona não autenticados pra /admin/login)
 *  3. Bloqueia /admin/* no domínio principal em produção
 */
export async function proxy(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase();
  const pathname = request.nextUrl.pathname;
  const isDev = process.env.NODE_ENV !== "production";

  const isAdminSubdomain = host.startsWith("admin.");
  const isAdminPath = pathname.startsWith("/admin");

  // Subdomínio da pesquisa (pesquisa.escolaamadeus.com) → enquete pública.
  // Sem auth: a enquete é aberta. Mapeia a raiz e subcaminhos para /enquete.
  if (host.startsWith("pesquisa.")) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/enquete" : `/enquete${pathname}`;
    return NextResponse.rewrite(url);
  }

  // Em produção, /admin/* só via subdomínio
  if (!isAdminSubdomain && isAdminPath && !isDev) {
    return new NextResponse("Página não encontrada", { status: 404 });
  }

  // Não é área admin? Passa direto.
  if (!isAdminSubdomain && !isAdminPath) {
    return NextResponse.next();
  }

  // === Daqui pra baixo é área admin ===

  // Caminho "interno" (/admin/*) que esse request realmente atinge
  const internalPath = isAdminSubdomain
    ? `/admin${pathname === "/" ? "" : pathname}`
    : pathname;

  // Atualiza/valida sessão Supabase (lê e escreve cookies)
  const { response, user } = await updateSession(request);

  const isLoginPage = internalPath === "/admin/login";

  // Não autenticado → manda pro login (a não ser que já esteja lá)
  if (!user && !isLoginPage) {
    const loginUrl = isAdminSubdomain ? "/login" : "/admin/login";
    return withCookies(
      NextResponse.redirect(new URL(loginUrl, request.url)),
      response,
    );
  }

  // Autenticado tentando ver login → manda pro dashboard
  if (user && isLoginPage) {
    const dashUrl = isAdminSubdomain ? "/dashboard" : "/admin/dashboard";
    return withCookies(
      NextResponse.redirect(new URL(dashUrl, request.url)),
      response,
    );
  }

  // Rewrites por subdomínio (admin.x.com/dashboard → /admin/dashboard internamente)
  if (isAdminSubdomain && !isAdminPath) {
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/admin" : `/admin${pathname}`;
    return withCookies(NextResponse.rewrite(url), response);
  }

  return response;
}

/**
 * Copia cookies setadas pelo Supabase para uma nova response (redirect/rewrite).
 * Sem isso a sessão se perde entre o updateSession e o redirect.
 */
function withCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }
  return target;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\..*).*)",
  ],
};
