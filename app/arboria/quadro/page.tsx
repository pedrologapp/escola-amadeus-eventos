import type { Metadata } from "next";
import localFont from "next/font/local";
import "./quadro.css";
import { Aluno } from "./aluno";

// gabinete de museu + caderno do Arboria: serifa de alto contraste nos títulos, serifa de leitura no texto, letra de máquina nas etiquetas e a mão do Arboria
const display = localFont({ src: [{ path: "../../../lib/fontes/arquivos/gloock-400.woff2", weight: "400", style: "normal" }], variable: "--f-display" }); // Gloock, guardada aqui (antes vinha do Google na publicação)
const texto = localFont({ src: [{ path: "../../../lib/fontes/arquivos/spectral-400-italic.woff2", weight: "400", style: "italic" }, { path: "../../../lib/fontes/arquivos/spectral-500-italic.woff2", weight: "500", style: "italic" }, { path: "../../../lib/fontes/arquivos/spectral-400.woff2", weight: "400", style: "normal" }, { path: "../../../lib/fontes/arquivos/spectral-500.woff2", weight: "500", style: "normal" }], variable: "--f-texto" }); // Spectral, guardada aqui (antes vinha do Google na publicação)
const mono = localFont({ src: [{ path: "../../../lib/fontes/arquivos/ibm-plex-mono-500.woff2", weight: "500", style: "normal" }, { path: "../../../lib/fontes/arquivos/ibm-plex-mono-600.woff2", weight: "600", style: "normal" }], variable: "--f-mono" }); // IBM Plex Mono, guardada aqui (antes vinha do Google na publicação)
const mao = localFont({ src: [{ path: "../../../lib/fontes/arquivos/caveat-700.woff2", weight: "700", style: "normal" }], variable: "--f-mao" }); // Caveat, guardada aqui (antes vinha do Google na publicação)

export const metadata: Metadata = { title: "Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/**
 * Arboria · Linguística, semana 3: o tablet do aluno. A TV (/arboria/quadro/tv) mostra o QR,
 * que abre esta página já com o código da sala (?s=1234).
 */
export default async function QuadroAlunoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return <div className={`qq ${display.variable} ${texto.variable} ${mono.variable} ${mao.variable}`}><Aluno codigoInicial={(q.s ?? "").replace(/\D/g, "").slice(0, 4)} /></div>;
}
