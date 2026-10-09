import type { Metadata } from "next";
import { Caveat, Fredoka } from "next/font/google";
import { SERIES } from "@/lib/arboria-historia";
import { AppArboria } from "./app";
import type { CriancaHistoria } from "./actions";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caderno" }); // letra de caderno das falas

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
 *   /arboria?demo=1º ano&nome=Maria&g=menina&p=morena&c=cacheado
 */
export default async function ArboriaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const demo: CriancaHistoria | null = q.demo && SERIES.includes(q.demo as (typeof SERIES)[number])
    ? {
        id: "demo", nome: q.nome || "Maria", serie: q.demo,
        genero: q.g === "menino" ? "menino" : "menina",
        pele: q.p === "clara" || q.p === "negra" ? q.p : "morena",
        cabelo: q.c === "liso" || q.c === "crespo" ? q.c : "cacheado",
        respostas: [], boneco_url: null,
      }
    : null;
  return <div className={`${fredoka.className} ${caveat.variable}`}><AppArboria demo={demo} /></div>;
}
