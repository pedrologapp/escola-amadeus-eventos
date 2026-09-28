import type { Metadata } from "next";
import Image from "next/image";
import { Caveat } from "next/font/google";
import { DesenhoInfancia } from "./desenho";
import { EnvioFoto } from "./envio-foto";

const letra = Caveat({ subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Como é bom ser criança",
  description: "Procure seu nome e envie uma foto sua de quando era criança.",
  robots: { index: false, follow: false },
  // Prévia do link no WhatsApp: o desenho da página (public/criancaamadeus, gerado por scripts/gerar-banner-criancaamadeus.cjs).
  openGraph: {
    title: "Como é bom ser criança...!",
    description: "Selecione o seu nome e envie uma foto sua de quando era criança.",
    images: [{ url: "https://eventos.escolaamadeus.com/criancaamadeus/og.png", width: 1200, height: 630 }],
    type: "website",
  },
};

/**
 * Página pública para a equipe mandar a foto de infância (28/09/2026).
 * Link: eventos.escolaamadeus.com/criancaamadeus. As fotos ficam num bucket
 * privado e só abrem no admin (Campanhas → Fotos de infância).
 */
export default function FotosInfanciaPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] px-4 pb-10 pt-6">
      <div className="mx-auto max-w-md">
        <Image src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" width={70} height={77} priority />
        <DesenhoInfancia className="mt-4 w-full" />
        <h1 className={`${letra.className} mt-2 text-center text-[44px] font-bold leading-none text-amadeus-blue`}>
          Como é bom ser criança...!
        </h1>
        <p className="mx-auto mt-4 max-w-sm text-center text-[15px] leading-relaxed text-[#5A6478]">
          Toda a equipe Amadeus já foi criança um dia. Selecione o seu nome e depois envie uma foto sua de quando era criança.
        </p>
        <EnvioFoto />
        <p className="mt-10 text-center text-xs text-[#9AA3B4]">
          A foto fica guardada só com a escola. Se mandar de novo, a nova substitui a anterior.
        </p>
      </div>
    </main>
  );
}
