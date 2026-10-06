import type { Metadata } from "next";
import Image from "next/image";
import { Caveat, Fraunces } from "next/font/google";
import { BookOpen, MapPin, MessageCircle } from "lucide-react";
import { CONTATO } from "@/lib/folder-config";
import { Inscricao } from "./inscricao";

const letra = Caveat({ subsets: ["latin"], weight: ["600", "700"] });
const serifa = Fraunces({ subsets: ["latin"], weight: ["600", "700"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Experiência Amadeus · sábado, 10 de outubro, 14h",
  description: "Venha viver um dia dentro da nossa escola junto com seu filho ou sua filha. Gratuito. Inscreva-se.",
  openGraph: {
    title: "Experiência Amadeus · sábado, 10/10, às 14h",
    description: "Venha viver um dia dentro da nossa escola junto com seu filho ou sua filha. É gratuito: inscreva-se.",
    images: [{ url: "https://eventos.escolaamadeus.com/materiais/experiencia-convite.png", width: 1100, height: 1556 }],
    type: "website",
  },
};

/**
 * Experiência Amadeus (06/10/2026): página de inscrição divulgada no post das redes sociais.
 * Link: eventos.escolaamadeus.com/experiencia. As inscrições caem na lista da Experiência
 * (admin → Rematrícula 2027 → Experiência Amadeus), com origem "inscrição pelo site".
 */
export default function ExperienciaPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#FAF7F0] px-4 pb-12 pt-5">
      <div className="mx-auto max-w-md">
        {/* em cima, já à vista: quem é, quando, e o formulário (06/10: o Pedro quer o lugar de preencher logo ao abrir) */}
        <div className="flex items-center gap-3">
          <Image src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" width={52} height={57} priority />
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-[#B07A12]">VOCÊ ESTÁ CONVIDADO</p>
            <h1 className={`${serifa.className} text-[26px] font-bold leading-tight text-[#1B3B7C]`}>Experiência <i>Amadeus</i></h1>
          </div>
        </div>
        <p className={`${letra.className} mt-2 text-[24px] font-bold leading-tight text-[#1B3B7C]`}>
          Sábado, <span className="bg-[linear-gradient(transparent_55%,#FFD66B_55%)]">10 de outubro, às 14h</span> · gratuito
        </p>

        <Inscricao />

        <p className="mt-8 text-[15px] leading-relaxed text-[#3E4A61]">
          Venha viver um dia dentro da nossa escola, <b className="text-[#1B3B7C]">junto com seu filho ou sua filha</b>, e sentir na prática um pouco do que ele vai viver aqui.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Educação Infantil", "Fundamental 1", "Fundamental 2"].map((s) => (
            <span key={s} className="rounded-full border-2 border-[#1B3B7C] px-3 py-1 text-xs font-bold text-[#1B3B7C]">{s}</span>
          ))}
        </div>

        {/* o folder da escola, sem os valores (/conheca) */}
        <a href="/conheca" target="_blank" className="mt-6 flex items-center gap-4 rounded-3xl bg-[#1B3B7C] p-5 text-white shadow-sm">
          <BookOpen className="size-8 shrink-0 text-[#FFC21C]" />
          <span>
            <b className="block text-lg">Conheça a escola por dentro</b>
            <span className="text-sm text-white/80">As etapas, o material, os projetos, os esportes e os espaços.</span>
          </span>
        </a>

        <a href="/comochegar" target="_blank" className="mt-6 flex items-center gap-3 rounded-3xl border-2 border-dashed border-[#1B3B7C]/40 p-5">
          <MapPin className="size-6 shrink-0 text-[#1B3B7C]" />
          <span className="text-sm text-[#3E4A61]">
            <b className="block text-[#1B3B7C]">Centro Educacional Amadeus</b>
            Av. Benedito Santana, 09 · Amarante, São Gonçalo do Amarante
            <span className="mt-1 block font-bold text-[#1B3B7C] underline">Como chegar</span>
          </span>
        </a>
        <a
          href={`https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent("Olá! Vi o convite da Experiência Amadeus e tenho uma dúvida.")}`}
          target="_blank"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-4 text-base font-bold text-white shadow-sm"
        >
          <MessageCircle className="size-5" /> Falar com a escola pelo WhatsApp
        </a>
      </div>
    </main>
  );
}
