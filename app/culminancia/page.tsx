import type { Metadata } from "next";
import Image from "next/image";
import { FormularioCulminancia } from "./formulario";

export const metadata: Metadata = {
  title: "Projeto de culminância · Arboria",
  description: "Conte a ideia da sua sala e do outdoor para o Projeto de culminância do Arboria.",
  robots: { index: false, follow: false },
};

/**
 * Página pública para as professoras (22/10/2026): cada uma escolhe a série ou a casa
 * e conta a ideia da sala, a ideia do outdoor, os tamanhos e as imagens que já tem.
 * Tudo cai no admin (Campanhas → Projeto de culminância), onde aparece quem falta.
 */
export default function CulminanciaPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] px-4 pb-12 pt-6">
      <div className="mx-auto max-w-lg">
        <Image src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" width={70} height={77} priority />
        <p className="mt-6 text-sm font-bold uppercase tracking-wider text-[#5A6478]">Projeto Arboria</p>
        <h1 className="mt-1 text-[32px] font-extrabold leading-tight text-amadeus-blue">Projeto de culminância</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#5A6478]">
          Conte para a gente como vai ficar a sua sala e a ideia do outdoor. Com isso montamos as artes dos painéis,
          com a identidade do Arboria, e mostramos para você antes de imprimir.
        </p>
        <FormularioCulminancia />
        <p className="mt-10 text-center text-xs text-[#9AA3B4]">
          Dá para voltar aqui e completar depois: escolha a mesma série e o que já foi enviado aparece de novo.
        </p>
      </div>
    </main>
  );
}
