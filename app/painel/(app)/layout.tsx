import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "../actions";
import { Abas } from "./abas";

/** Barra do painel novo. Exige login (o proxy já barra; aqui é a segunda trava). */
export default async function PainelApp({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/painel/login");
  const quem = String(user.user_metadata?.nome ?? user.email ?? "").split("@")[0];

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#1B3B7C] text-white print:hidden">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-6 px-4 sm:px-8">
          <Link href="/painel" className="flex shrink-0 items-center gap-2.5">
            <Image src="/folder/marca-30-anos.png" alt="" width={30} height={33} className="rounded bg-white p-0.5" />
            <span className="hidden font-[family-name:var(--font-serifa)] text-lg font-bold sm:inline">Amadeus</span>
          </Link>
          <Abas />
          <form action={sair} className="ml-auto flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden opacity-80 md:inline">{quem}</span>
            <button type="submit" className="rounded-lg px-2 py-1 opacity-80 hover:bg-white/10 hover:opacity-100">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 pb-16 pt-6 sm:px-8 sm:pt-8">{children}</main>
    </>
  );
}
