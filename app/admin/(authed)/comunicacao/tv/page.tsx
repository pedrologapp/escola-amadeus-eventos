import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { serifa } from "@/lib/fonte-serifa";
import { ConteudoTv } from "./conteudo";
import { ehEquipeTv } from "./equipe";

/**
 * Gerenciador da TV (Pedro, 12/11/2026), no mesmo endereço de sempre: admin.eventos.escolaamadeus.com/admin/comunicacao/tv.
 * Abre na aba "O que passa" (agenda, recados, avisos e o que gira sozinho, no formato em que aparecem na TV) e tem
 * "Telas e ordem" (a lista na ordem da TV) e "+ Nova tela" (formatos prontos). A TV em si fica em escolaamadeus.com/tv.
 * A escola preenche, liga/desliga, muda ordem e tempo; as telas fixas (./fixos.ts) só a equipe Arboria (./equipe.ts).
 */
export const metadata = { title: "TV Amadeus · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function TvAdminPage() {
  return (
    <div className={`${serifa.variable} min-h-full bg-[#FBF7EE] text-[#1A2240]`}>
      <div className="container mx-auto px-4 py-6">
        <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
          <ChevronLeft className="size-4" /> Comunicação
        </Link>
        <div className="mt-3"><ConteudoTv equipe={await ehEquipeTv()} /></div>
      </div>
    </div>
  );
}
