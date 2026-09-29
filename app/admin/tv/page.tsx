import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { roteiroDoDia } from "@/lib/tv";
import { PlayerTv } from "./player";

/**
 * A tela da TV Amadeus (admin.escolaamadeus.com/tv). Fica fora do (authed)
 * de propósito: sem o menu do admin, só a TV em tela cheia. O login continua
 * valendo (proxy + checagem aqui), então a TV da recepção entra uma vez com
 * um usuário do admin. ?previa=1 é a versão pequena dentro do admin.
 */
export const metadata = { title: "TV Amadeus" };
export const dynamic = "force-dynamic";

export default async function TvPage({ searchParams }: { searchParams: Promise<{ previa?: string; cena?: string; t?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  const { previa, cena, t } = await searchParams;
  const roteiro = await roteiroDoDia();
  // ?cena=3&t=5 congela a cena 3 no segundo 5 (para conferir uma cena)
  const congelada = cena ? { cena: Math.max(0, Number(cena) - 1), t: Number(t ?? 6) } : null;
  return <PlayerTv roteiro={roteiro} previa={previa === "1"} congelada={congelada} />;
}
