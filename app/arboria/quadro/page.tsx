import type { Metadata } from "next";
import { Caveat, Gloock, IBM_Plex_Mono, Spectral } from "next/font/google";
import "./quadro.css";
import { Aluno } from "./aluno";

// gabinete de museu + caderno do Arboria: serifa de alto contraste nos títulos, serifa de leitura no texto, letra de máquina nas etiquetas e a mão do Arboria
const display = Gloock({ subsets: ["latin"], weight: "400", variable: "--f-display" });
const texto = Spectral({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--f-texto" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "600"], variable: "--f-mono" });
const mao = Caveat({ subsets: ["latin"], weight: "700", variable: "--f-mao" });

export const metadata: Metadata = { title: "Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/**
 * Arboria · Linguística, semana 3: o tablet do aluno. A TV (/arboria/quadro/tv) mostra o QR,
 * que abre esta página já com o código da sala (?s=1234).
 */
export default async function QuadroAlunoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return <div className={`qq ${display.variable} ${texto.variable} ${mono.variable} ${mao.variable}`}><Aluno codigoInicial={(q.s ?? "").replace(/\D/g, "").slice(0, 4)} /></div>;
}
