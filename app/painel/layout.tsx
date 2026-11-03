import type { Metadata } from "next";
import { serifa } from "@/lib/fonte-serifa";

/** Painel novo da escola (admin.escolaamadeus.com). Fundo creme e títulos em Fraunces, como o folder e os convites. */
export const metadata: Metadata = { title: "Painel · Centro Educacional Amadeus", robots: { index: false } };

export default function PainelRaiz({ children }: { children: React.ReactNode }) {
  return <div className={`${serifa.variable} min-h-screen bg-[#FBF7EE] text-[#1A2240]`}>{children}</div>;
}
