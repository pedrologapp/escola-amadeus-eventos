import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BLOCOS, TIPOS, hojeLocal, lerItensEBlocos } from "@/lib/tv";
import { PainelTv } from "./painel";

/**
 * Roteiro da TV Amadeus (29/09/2026): o que passa na TV da recepção. O que é
 * automático já entra sozinho; aqui a equipe põe avisos, recados, agenda,
 * frases e curiosidades, liga/desliga blocos e muda a ordem e o tempo.
 */
export const metadata = { title: "TV Amadeus · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function TvAdminPage() {
  const { itens, blocos } = await lerItensEBlocos();
  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ChevronLeft className="size-4" /> Comunicação
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">TV Amadeus</h1>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        O que passa na TV da recepção. Ela monta o roteiro de novo a cada volta: aniversariantes do dia, próximo evento e prazo da
        rematrícula entram sozinhos; o que vocês colocarem aqui aparece na volta seguinte e sai sozinho quando passar a data.
      </p>
      <PainelTv itens={itens} blocos={blocos} nomes={BLOCOS} tipos={TIPOS} hoje={hojeLocal()} />
    </div>
  );
}
