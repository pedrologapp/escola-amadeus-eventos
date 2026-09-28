import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { EditorCartaz } from "../[id]/cartaz/editor";

/**
 * Encarte avulso a partir de texto (aviso, comunicado, convite, campanha):
 * a escola escreve, a IA organiza no estilo caderno dos encartes da
 * Experiência Amadeus e a pessoa revisa e baixa o PNG (story, feed,
 * quadrado ou A4).
 */
export const metadata = { title: "Criar encarte · Admin Amadeus" };

export default function EncartePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/admin/eventos" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ChevronLeft className="size-4" /> Voltar para eventos
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-amadeus-blue">Criar encarte a partir de texto</h1>
      <p className="mt-1 text-muted-foreground">
        Escreva o aviso, comunicado ou convite. A IA organiza no estilo caderno da escola e você baixa a imagem para WhatsApp, Instagram ou impressão.
      </p>
      <p className="mt-2 text-sm">
        Precisa de uma arte grande para decorar o evento (entrada, palco, pátio)?{" "}
        <Link href="/admin/eventos/painel" className="font-bold text-amadeus-blue underline">Criar painel de decoração</Link>
      </p>
      <EditorCartaz modo="texto" fatos={{ nome: "", data: "", hora: null, local: null, preco: null, link: "", fotos: [], resumo: "" }} />
    </div>
  );
}
