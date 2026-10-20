import type { Metadata } from "next";
import { Caveat, Instrument_Serif, Inter_Tight } from "next/font/google";
import { Aluno } from "./aluno";

// as letras das aulas do Arboria: Instrument Serif, Inter Tight e Caveat
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--f-tight" });
const mao = Caveat({ subsets: ["latin"], weight: "700", variable: "--f-mao" });

export const metadata: Metadata = { title: "Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/**
 * Arboria · Linguística, semana 3: o tablet do aluno. A TV (/arboria/quadro/tv) mostra o QR,
 * que abre esta página já com o código da sala (?s=1234).
 */
export default async function QuadroAlunoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return <div className={`${serif.variable} ${tight.variable} ${mao.variable}`}><Aluno codigoInicial={(q.s ?? "").replace(/\D/g, "").slice(0, 4)} /></div>;
}
