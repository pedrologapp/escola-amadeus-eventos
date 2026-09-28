import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditorPainel } from "./editor";

/**
 * Painel decorativo de evento (29/09/2026): diferente do encarte, que
 * informa, o painel decora o espaço do evento. Seis estilos montados com as
 * peças da identidade visual, em qualquer medida, com PDF no tamanho real
 * para a gráfica. ?evento=<id> já traz o nome e a data do evento.
 */
export const metadata = { title: "Criar painel · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function PainelPage({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const { evento } = await searchParams;
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
        Painel é a arte grande que decora o evento (entrada, palco, pátio). Escolha a medida em centímetros, o texto e o estilo. Tudo é montado com as peças da identidade visual da escola, e o PDF sai no tamanho real para a gráfica.
      </p>
      <EditorPainel inicial={inicial} />
    </div>
  );
}
