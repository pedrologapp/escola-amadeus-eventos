import type { Metadata } from "next";
import localFont from "next/font/local";
import "../quadro.css";
import { Tv } from "./tv";

// gabinete de museu + caderno do Arboria: serifa de alto contraste nos títulos, serifa de leitura no texto, letra de máquina nas etiquetas e a mão do Arboria
const display = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/gloock-400.woff2", weight: "400", style: "normal" }], variable: "--f-display" }); // Gloock, guardada aqui (antes vinha do Google na publicação)
const texto = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/spectral-400-italic.woff2", weight: "400", style: "italic" }, { path: "../../../../lib/fontes/arquivos/spectral-500-italic.woff2", weight: "500", style: "italic" }, { path: "../../../../lib/fontes/arquivos/spectral-400.woff2", weight: "400", style: "normal" }, { path: "../../../../lib/fontes/arquivos/spectral-500.woff2", weight: "500", style: "normal" }], variable: "--f-texto" }); // Spectral, guardada aqui (antes vinha do Google na publicação)
const mono = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/ibm-plex-mono-500.woff2", weight: "500", style: "normal" }, { path: "../../../../lib/fontes/arquivos/ibm-plex-mono-600.woff2", weight: "600", style: "normal" }], variable: "--f-mono" }); // IBM Plex Mono, guardada aqui (antes vinha do Google na publicação)
const mao = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/caveat-700.woff2", weight: "700", style: "normal" }], variable: "--f-mao" }); // Caveat, guardada aqui (antes vinha do Google na publicação)

export const metadata: Metadata = { title: "TV · Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/** Arboria · Linguística, semana 3: a TV da sala, aberta no computador do professor. Ela abre a sala e passa as fases. */
export default function QuadroTvPage() {
  return <div className={`qq ${display.variable} ${texto.variable} ${mono.variable} ${mao.variable}`}><Tv /></div>;
}
