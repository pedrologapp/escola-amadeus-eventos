import type { Metadata } from "next";
import { Caveat, Instrument_Serif, Inter_Tight } from "next/font/google";
import { Tv } from "./tv";

// as letras das aulas do Arboria: Instrument Serif, Inter Tight e Caveat
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--f-tight" });
const mao = Caveat({ subsets: ["latin"], weight: "700", variable: "--f-mao" });

export const metadata: Metadata = { title: "TV · Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/** Arboria · Linguística, semana 3: a TV da sala, aberta no computador do professor. Ela abre a sala e passa as fases. */
export default function QuadroTvPage() {
  return <div className={`${serif.variable} ${tight.variable} ${mao.variable}`}><Tv /></div>;
}
