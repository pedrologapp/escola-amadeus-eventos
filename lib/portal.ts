import "server-only";

import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTATO } from "@/lib/folder-config";
import { ETIQUETA_TV, PRAZO_PROMO, diasDaSemana, hojeLocal, lerItensEBlocos, somaDias, valeHoje } from "@/lib/tv";

/** Evento que passou só aparece com fotos/vídeos ligados, até esses dias depois, no máximo estes tantos. */
const COMO_FOI_DIAS = 45;
const COMO_FOI_MAX = 2;

/**
 * Portal da Família (29/09/2026): a página que o www.escolaamadeus.com vai
 * abrir. Em cima a TV Amadeus (versão sem nomes de alunos) e embaixo o que o
 * pai precisa: passeios e eventos com inscrição, matrícula antecipada,
 * lembretes e agenda da semana. Lembretes e agenda são os MESMOS cadastros da
 * TV (admin → Comunicação → TV Amadeus): cadastra uma vez, sai nos dois.
 */

export interface EventoPortal {
  slug: string;
  nome: string;
  data: string;
  hora: string | null;
  local: string | null;
  capa: string | null;
  prazo: string | null; // prazo de inscrição (ISO)
  passou: boolean;
  midias: string[];
}

export interface PortalDados {
  hoje: string;
  eventos: EventoPortal[];
  promo: { prazo: string; link: string } | null;
  lembretes: { titulo: string; texto: string; icone: string | null; tipo: "aviso" | "recado" }[];
  agenda: { data: string; itens: string[] }[];
  whatsapp: string;
}

async function montar(hoje: string): Promise<PortalDados> {
  const db = createAdminClient();
  const [{ itens }, { data: futuros }, { data: passados }] = await Promise.all([
    lerItensEBlocos(),
    db.from("eventos")
      .select("slug, nome, data_evento, hora_evento, local, imagem_capa_url, prazo_inscricao")
      .eq("status", "publicado")
      .gte("data_evento", hoje)
      .order("data_evento")
      .limit(6),
    db.from("eventos")
      .select("slug, nome, data_evento, hora_evento, local, imagem_capa_url, prazo_inscricao, imagens_galeria")
      .eq("status", "publicado")
      .eq("mostrar_como_foi", true)
      .lt("data_evento", hoje)
      .gte("data_evento", somaDias(hoje, -COMO_FOI_DIAS))
      .order("data_evento", { ascending: false })
      .limit(6),
  ]);
  const ev = (e: Record<string, unknown>, passou: boolean): EventoPortal => ({
    slug: String(e.slug),
    nome: String(e.nome).replace(/\s+\d{4}$/, ""),
    data: String(e.data_evento),
    hora: (e.hora_evento as string | null)?.slice(0, 5) ?? null,
    local: (e.local as string | null) ?? null,
    capa: (e.imagem_capa_url as string | null) ?? null,
    prazo: (e.prazo_inscricao as string | null) ?? null,
    passou,
    midias: ((e.imagens_galeria as string[] | null) ?? []).filter(Boolean),
  });
  const valem = itens.filter((i) => valeHoje(i, hoje));
  const dias = diasDaSemana(hoje);
  const agendaItens = itens.filter((i) => i.tipo === "agenda" && i.ativo && i.data && dias.includes(i.data));
  return {
    hoje,
    eventos: [...(futuros ?? []).map((e) => ev(e, false)), ...(passados ?? []).map((e) => ev(e, true)).filter((e) => e.midias.length).slice(0, COMO_FOI_MAX)],
    promo: hoje <= PRAZO_PROMO ? { prazo: PRAZO_PROMO, link: "/conheca" } : null, // sem valores: público
    lembretes: [...valem.filter((i) => i.tipo === "aviso"), ...valem.filter((i) => i.tipo === "recado")].map((i) => ({
      titulo: i.titulo,
      texto: i.texto,
      icone: i.icone,
      tipo: i.tipo as "aviso" | "recado",
    })),
    agenda: agendaItens.length ? dias.map((d) => ({ data: d, itens: agendaItens.filter((i) => i.data === d).map((i) => i.titulo) })) : [],
    whatsapp: CONTATO.whatsapp,
  };
}

/** Guardado como o roteiro da TV: refeito quando o admin da TV muda algo, e a cada 10 min (eventos). */
export function dadosPortal(): Promise<PortalDados> {
  const hoje = hojeLocal();
  return unstable_cache(() => montar(hoje), ["portal", "v2", hoje], { tags: [ETIQUETA_TV], revalidate: 600 })();
}
