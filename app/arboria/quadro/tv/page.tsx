import type { Metadata } from "next";
import { Caveat, Gloock, IBM_Plex_Mono, Spectral } from "next/font/google";
import "../quadro.css";
import { Tv } from "./tv";

// gabinete de museu + caderno do Arboria: serifa de alto contraste nos títulos, serifa de leitura no texto, letra de máquina nas etiquetas e a mão do Arboria
const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--f-display" });
const texto = Spectral({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--f-texto" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--f-mono" });
const mao = Caveat({ subsets: ["latin"], weight: "700", variable: "--f-mao" });

export const metadata: Metadata = { title: "TV · Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/** Arboria · Linguística, semana 3: a TV da sala, aberta no computador do professor. Ela abre a sala e passa as fases. */
export default function QuadroTvPage() {
  return <div className={`qq ${display.variable} ${texto.variable} ${mono.variable} ${mao.variable}`}><Tv /></div>;
}
