import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Young_Serif } from "next/font/google";
import { Tv } from "./tv";

const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serie" });

export const metadata: Metadata = { title: "TV · Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/** Arboria · Linguística, semana 3: a TV da sala, aberta no computador do professor. Ela abre a sala e passa as fases. */
export default function QuadroTvPage() {
  return <div className={`${atkinson.className} ${youngSerif.variable}`}><Tv /></div>;
}
