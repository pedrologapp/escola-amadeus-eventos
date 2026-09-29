import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import "../../admin/tv/fontes.css";

/**
 * "Veja como foi" do Portal da Família (29/09/2026): fotos e vídeos de um
 * evento que já aconteceu. Só abre se a equipe ligou "Mostrar no Portal da
 * Família" no admin do evento e colocou alguma mídia.
 */
export const dynamic = "force-dynamic";

const VIDEO = /\.(mp4|mov|webm|m4v)(\?|$)/i;

async function buscar(slug: string) {
  const { data } = await createAdminClient()
    .from("eventos")
    .select("nome, data_evento, local, imagens_galeria, mostrar_como_foi, status")
    .eq("slug", slug)
    .maybeSingle();
  const midias = ((data?.imagens_galeria as string[] | null) ?? []).filter(Boolean);
  if (!data || data.status !== "publicado" || !data.mostrar_como_foi || !midias.length) return null;
  return { nome: String(data.nome).replace(/\s+\d{4}$/, ""), data: String(data.data_evento), local: (data.local as string | null) ?? null, midias };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await buscar((await params).slug);
  return { title: e ? `Como foi: ${e.nome}` : "Como foi" };
}

export default async function ComoFoiPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await buscar((await params).slug);
  if (!e) notFound();
  const data = new Date(`${e.data}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="min-h-screen bg-[#FDFBF6] text-slate-800">
      <header className="bg-amadeus-blue text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm font-semibold text-white/85 hover:text-white"><ChevronLeft className="size-4" /> Portal</Link>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-amadeus-negativa.png" alt="Centro Educacional Amadeus" className="ml-auto h-9 w-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-12 pt-6">
        <p className="f-caveat text-3xl leading-none text-[#F29A0C]">Veja como foi</p>
        <h1 className="f-ralton mt-1 text-3xl leading-none text-amadeus-blue sm:text-4xl">{e.nome}</h1>
        <p className="mt-2 text-sm text-slate-500">{[data, e.local].filter(Boolean).join(" · ")}</p>
        <div className="mt-6 columns-2 gap-3 sm:columns-3 lg:columns-4">
          {e.midias.map((u) => (
            <div key={u} className="mb-3 break-inside-avoid overflow-hidden rounded-2xl bg-white shadow-[0_6px_16px_rgba(27,59,124,.12)]">
              {VIDEO.test(u) ? (
                <video src={u} controls playsInline preload="metadata" className="block w-full" />
              ) : (
                <a href={u} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt="" loading="lazy" className="block w-full" />
                </a>
              )}
            </div>
          ))}
        </div>
      </main>
      <footer className="bg-[#0B2260] px-4 py-6 text-center text-xs text-[#AFC0E4]">
        Centro Educacional Amadeus · 30 anos educando para a vida · São Gonçalo do Amarante · RN
      </footer>
    </div>
  );
}
