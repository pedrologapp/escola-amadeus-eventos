import type { Metadata } from "next";
import Image from "next/image";
import { Caveat } from "next/font/google";
import { DesenhoParque } from "./desenho";
import { Resposta } from "./resposta";
import { encerrado } from "@/lib/dia-professor";

const letra = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Dia dos Professores · Escola Amadeus",
  description: "Bate e volta ao West Aquapark: diga se vai, qual data prefere e se leva acompanhante.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Um dia especial para quem faz a Amadeus acontecer",
    description: "Bate e volta ao West Aquapark. Escolha a data: 16 ou 29 de outubro.",
    type: "website",
  },
};
export const dynamic = "force-dynamic";

/**
 * Dia dos Professores 2026 (06/10): página pública para toda a equipe responder sobre o
 * passeio ao West Aquapark. Link: eventos.escolaamadeus.com/diadoprofessor. Respostas no
 * admin (Campanhas → Dia dos Professores).
 */
export default function DiaDoProfessorPage() {
  const fechado = encerrado();
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] px-4 pb-12 pt-6">
      <div className="mx-auto max-w-md">
        <Image src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" width={70} height={77} priority />
        <p className="mt-6 text-center text-xs font-bold uppercase tracking-[0.2em] text-[#F2A20C]">Dia dos Professores</p>
        <h1 className={`${letra.className} mt-1 text-center text-[42px] font-bold leading-[1.05] text-amadeus-blue`}>
          Um dia especial para quem faz a Amadeus acontecer
        </h1>
        <DesenhoParque className="mx-auto mt-4 w-full max-w-sm" />

        {/* folha de caderno com as informações */}
        <section
          className="mt-6 rounded-3xl bg-white px-6 py-6 text-[15px] leading-[30px] text-[#3E4A61] shadow-sm"
          style={{ backgroundImage: "repeating-linear-gradient(transparent 0 29px, #E7EDF7 29px 30px)" }}
        >
          <p>
            Professores, auxiliares, equipe administrativa, ASGs e todos que cuidam da escola: depois de tanta dedicação,
            chegou a hora de a equipe também se divertir.
          </p>
          <p className="mt-[30px]">
            Estamos organizando um <b className="text-amadeus-blue">bate e volta ao West Aquapark</b>, perto de Martins/RN.
            A saída é de madrugada e a volta, depois de aproveitarmos o dia no parque.
          </p>
          <div className="mt-[30px] grid gap-0">
            <p><b className="text-amadeus-blue">Passeio:</b> R$ 250 (ônibus + entrada no parque)</p>
            <p><b className="text-amadeus-blue">A escola paga:</b> R$ 150 de cada colaborador</p>
            <p><b className="text-amadeus-blue">Você paga:</b> R$ 100, em até 2x de R$ 50</p>
            <p><b className="text-amadeus-blue">Acompanhantes:</b> R$ 250 por pessoa, em até 3x</p>
          </div>
          <p className={`${letra.className} mt-[30px] text-[26px] leading-[30px] text-[#C25F00]`}>
            A data com mais votos da equipe será a do passeio. Responda até sexta, às 7h da manhã.
          </p>
        </section>

        {fechado ? (
          <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
            <p className="text-lg font-extrabold text-amadeus-blue">As respostas encerraram</p>
            <p className="mt-2 text-sm text-[#5A6478]">O prazo terminou na sexta, às 7h. Fale com a coordenação se precisar.</p>
          </div>
        ) : (
          <Resposta />
        )}

        <p className={`${letra.className} mt-10 text-center text-[28px] text-amadeus-blue`}>
          Quem trabalha junto, também merece celebrar junto!
        </p>
        <p className="mt-2 text-center text-xs text-[#9AA3B4]">Se responder de novo, a nova resposta substitui a anterior.</p>
      </div>
    </main>
  );
}
