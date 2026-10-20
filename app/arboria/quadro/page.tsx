import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Young_Serif } from "next/font/google";
import { Aluno } from "./aluno";

const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serie" });

export const metadata: Metadata = { title: "Qual é o quadro? · Arboria", robots: { index: false, follow: false } };

/**
 * Arboria · Linguística, semana 3: o tablet do aluno. A TV (/arboria/quadro/tv) mostra o QR,
 * que abre esta página já com o código da sala (?s=1234).
 */
export default async function QuadroAlunoPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  return <div className={`${atkinson.className} ${youngSerif.variable}`}><Aluno codigoInicial={(q.s ?? "").replace(/\D/g, "").slice(0, 4)} /></div>;
}
