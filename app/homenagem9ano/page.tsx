import type { Metadata, Viewport } from "next";
import Image from "next/image";
import localFont from "next/font/local";
import { Homenagem } from "./homenagem";
import "./homenagem.css";

const serif = localFont({ src: "../../lib/fontes/arquivos/cormorant-garamond-500-700.woff2", weight: "500 700", variable: "--font-hom-serif", display: "swap" });
const script = localFont({ src: "../../lib/fontes/arquivos/great-vibes-400.woff2", weight: "400", variable: "--font-hom-script", display: "swap" });

export const metadata: Metadata = {
  title: "Homenagem do 9º ano",
  description: "Grave uma mensagem para o seu filho ou a sua filha. É surpresa para o último dia de aula.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#0A1630" };

/**
 * Homenagem do 9º ano (formatura 2026). Link: eventos.escolaamadeus.com/homenagem9ano.
 * Os pais entram com o nome do filho + a data de nascimento, gravam a mensagem livre (parte 1) e o
 * poema em comum (parte 2), e mandam fotos se quiserem. A escola confere em Campanhas → Homenagem do 9º ano.
 * Os vídeos ficam num bucket privado (homenagem-9ano).
 */
export default function HomenagemPage() {
  return (
    <main className={`${serif.variable} ${script.variable} hom-fundo min-h-screen overflow-x-hidden px-4 pb-14 pt-7 text-[#F3EBDD]`}>
      <div className="mx-auto mb-6 flex max-w-md justify-center">
        <Image src="/formatura-placa/logo-900.png" alt="Centro Educacional Amadeus" width={58} height={58} priority className="opacity-95" />
      </div>
      <Homenagem />
      <p className="mx-auto mt-12 max-w-xs text-center text-xs leading-relaxed text-[#8E8778]">
        Os vídeos e as fotos ficam guardados só com a escola e são usados apenas no vídeo da homenagem.
      </p>
    </main>
  );
}
