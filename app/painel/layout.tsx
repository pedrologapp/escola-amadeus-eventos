import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

/** Painel novo da escola (admin.escolaamadeus.com). Fundo creme e títulos em Fraunces, como o folder e os convites. */
const serifa = Fraunces({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-serifa" });

export const metadata: Metadata = { title: "Painel · Centro Educacional Amadeus", robots: { index: false } };

export default function PainelRaiz({ children }: { children: React.ReactNode }) {
  return <div className={`${serifa.variable} min-h-screen bg-[#FBF7EE] text-[#1A2240]`}>{children}</div>;
}
