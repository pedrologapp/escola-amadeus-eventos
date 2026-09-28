import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { EditorCartaz, type FatosEvento } from "./editor";

/**
 * Criar cartaz do evento: formato, nível de detalhe, frase e foto → a IA lê
 * a foto e propõe 3 cartazes na identidade da escola → escolher, ajustar e
 * baixar o PNG. Aberto também logo depois de criar um evento.
 */
export const metadata = { title: "Cartaz do evento · Admin Amadeus" };
export const dynamic = "force-dynamic";

const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(":");
  return m && m !== "00" ? `${Number(h)}h${m}` : `${Number(h)}h`;
};

export default async function CartazPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ novo?: string }> }) {
  const { id } = await params;
  const { novo } = await searchParams;
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("eventos")
    .select("id, slug, nome, descricao_curta, descricao_longa, data_evento, hora_evento, hora_fim, local, imagem_capa_url, imagens_galeria, series_permitidas, infos_importantes, status, tipos_ingresso(nome, preco, ativo)")
    .eq("id", id)
    .maybeSingle();
  if (!ev) notFound();

  const data = new Date(`${ev.data_evento}T12:00:00`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
  const precos = ((ev.tipos_ingresso as { preco: number; ativo: boolean }[] | null) ?? []).filter((t) => t.ativo !== false).map((t) => Number(t.preco));
  const menor = precos.length ? Math.min(...precos) : null;
  const h1 = hora(ev.hora_evento);
  const h2 = hora(ev.hora_fim);

  const fatos: FatosEvento = {
    nome: ev.nome,
    data: data.charAt(0).toUpperCase() + data.slice(1),
    hora: h1 ? (h2 ? `${h1} às ${h2}` : h1) : null,
    local: ev.local,
    preco: menor === null ? null : menor === 0 ? "Gratuito" : precos.length > 1 && Math.max(...precos) !== menor ? `A partir de ${reais(menor)}` : reais(menor),
    link: `eventos.escolaamadeus.com/eventos/${ev.slug}`,
    fotos: [ev.imagem_capa_url, ...((ev.imagens_galeria as string[] | null) ?? [])].filter(Boolean) as string[],
    resumo: [
      `Nome: ${ev.nome}`,
      ev.descricao_curta ? `Descrição: ${ev.descricao_curta}` : null,
      ev.descricao_longa ? `Detalhes: ${String(ev.descricao_longa).slice(0, 800)}` : null,
      `Data: ${data}${h1 ? `, ${h1}${h2 ? ` às ${h2}` : ""}` : ""}`,
      ev.local ? `Local: ${ev.local}` : null,
      menor !== null ? `Valor: ${menor === 0 ? "gratuito" : `a partir de ${reais(menor)}`}` : null,
      (ev.series_permitidas as string[] | null)?.length ? `Público: ${(ev.series_permitidas as string[]).join(", ")}` : null,
      (ev.infos_importantes as string[] | null)?.length ? `Informações importantes: ${(ev.infos_importantes as string[]).join("; ")}` : null,
    ].filter(Boolean).join("\n"),
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href={`/admin/eventos/${ev.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ChevronLeft className="size-4" /> Voltar para o evento
      </Link>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-amadeus-blue">Cartaz do evento</h1>
      <p className="mt-1 text-muted-foreground">
        {novo ? "Evento criado! Que tal já fazer o cartaz? " : ""}
        {ev.nome} · escolha como quer o cartaz e a IA propõe opções na identidade da escola.
      </p>
      <EditorCartaz fatos={fatos} />
    </div>
  );
}
