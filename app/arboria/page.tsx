import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Young_Serif } from "next/font/google";
import { SERIES } from "@/lib/arboria-historia";
import { AppArboria } from "./app";
import type { CriancaHistoria } from "./actions";

// as mesmas letras do trailer: Atkinson no texto, Young Serif nos títulos
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serie" });

export const metadata: Metadata = {
  title: "Arboria · a jornada do seu filho",
  description: "Experiência Amadeus: a jornada do seu filho em 2027.",
  robots: { index: false },
};

/**
 * Experiência Amadeus (10/10/2026): o QR da sala abre esta página.
 * O pai cadastra o(s) filho(s), faz a atividade e espera a história ser liberada
 * (admin → Campanhas → História do Arboria).
 *
 * Prévia de uma história, sem cadastro:
 *   /arboria?demo=1º ano&nome=Maria&g=menina&k=mus,log
 */
export default async function ArboriaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const demo: CriancaHistoria | null = q.demo && SERIES.includes(q.demo as (typeof SERIES)[number])
    ? {
        id: "demo", nome: q.nome || "Maria", serie: q.demo,
        genero: q.g === "menino" ? "menino" : "menina",
        pele: null, cabelo: null,
        respostas: (q.k || "").split(",").filter(Boolean) as CriancaHistoria["respostas"], boneco_url: null,
      }
    : null;
  return <div className={`${atkinson.className} ${youngSerif.variable}`}><AppArboria demo={demo} /></div>;
}
