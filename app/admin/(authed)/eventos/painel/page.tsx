import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditorPainel } from "./editor";
import { EditorCena } from "./cena";
import { EditorBanner } from "./banner";

/**
 * Painel decorativo de evento (29/09/2026): diferente do encarte, que
 * informa, o painel decora o espaço do evento. Seis estilos montados com as
 * peças da identidade visual, em qualquer medida, com PDF no tamanho real
 * para a gráfica. ?evento=<id> já traz o nome e a data do evento.
 */
export const metadata = { title: "Criar painel · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ evento?: string; modo?: string }> }) {
  const { evento, modo: modoParam } = await searchParams;
  // "banner" = ilustração 3D + frase em letra 3D, o estilo dos painéis que a escola já usa (padrão);
  // "cena" = desenho em traço; "caderno" = fotos coladas + peças da marca
  const modo = modoParam === "caderno" ? "caderno" : modoParam === "cena" ? "cena" : "banner";
  let doEvento: { l1: string; dest: string; l3: string } | null = null;
  let inicial = { l1: "vem aí o", dest: "Dia das Crianças", l3: "12 de outubro" };
  let voltar = { href: "/admin/eventos", texto: "Voltar para eventos" };
  if (evento) {
    const supabase = await createClient();
    const { data: ev } = await supabase.from("eventos").select("id, nome, data_evento").eq("id", evento).maybeSingle();
    if (ev) {
      const data = ev.data_evento
        ? new Date(`${ev.data_evento}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long", timeZone: "UTC" })
        : "";
      inicial = { l1: "", dest: ev.nome, l3: data };
      doEvento = inicial;
      voltar = { href: `/admin/eventos/${ev.id}`, texto: "Voltar para o evento" };
    }
  }
  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={voltar.href} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ChevronLeft className="size-4" /> {voltar.texto}
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-amadeus-blue">Criar painel de decoração</h1>
      <p className="mt-1 max-w-3xl text-muted-foreground">
        Painel é a arte grande que decora o evento (entrada, palco, pátio). Escolha a medida em centímetros, o texto e o estilo. O PDF sai no tamanho real para a gráfica.
      </p>
      <nav className="mt-5 flex flex-wrap gap-2">
        {([["banner", "Banner colorido", "ilustração 3D + frase"], ["cena", "Cena ilustrada", "desenho em traço"], ["caderno", "Caderno com fotos e peças da marca", ""]] as const).map(([v, t, sub]) => (
          <Link
            key={v}
            href={`/admin/eventos/painel?modo=${v}${evento ? `&evento=${evento}` : ""}`}
            className={`rounded-xl px-4 py-2 text-sm font-bold ${modo === v ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}
          >
            {t}{sub && <span className="ml-1 font-normal opacity-80">· {sub}</span>}
          </Link>
        ))}
      </nav>
      {modo === "banner" ? (
        <EditorBanner inicial={doEvento ?? { l1: "", dest: "", l3: "" }} />
      ) : modo === "cena" ? (
        <EditorCena inicial={doEvento ?? { l1: "", dest: "", l3: "" }} />
      ) : (
        <EditorPainel inicial={inicial} />
      )}
    </div>
  );
}
