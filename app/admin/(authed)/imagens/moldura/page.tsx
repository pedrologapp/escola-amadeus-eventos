import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditorMoldura } from "./editor";

/**
 * Moldura para stories (29/09/2026): no estilo Caderno ilustrado, com a
 * janela da foto transparente (PNG) ou já com a foto aplicada (JPG).
 */
export const metadata = { title: "Moldura para stories · Admin Amadeus" };

export default function MolduraPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/imagens" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ChevronLeft className="size-4" /> Voltar para o Gerador de Imagens
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-amadeus-blue">Moldura para stories</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Monte a moldura do evento no estilo caderno, com desenhos. Baixe em PNG com o meio transparente para usar por cima das fotos, ou escolha uma foto e baixe o story pronto.
      </p>
      <EditorMoldura />
    </div>
  );
}
