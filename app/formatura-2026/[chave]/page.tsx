import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_PLACA, ID_PLACA, chavePlacaValida, type DadosPlaca } from "@/lib/formatura-placa";
import { PainelPlacas, type Crianca } from "./painel";

const serif = localFont({ src: [{ path: "../../../lib/fontes/arquivos/cormorant-garamond-500-700.woff2", weight: "500 700", style: "normal" }], variable: "--f-serif" }); // Cormorant Garamond, guardada aqui (antes vinha do Google na publicação)
const script = localFont({ src: [{ path: "../../../lib/fontes/arquivos/great-vibes-400.woff2", weight: "400", style: "normal" }], variable: "--f-script" }); // Great Vibes, guardada aqui (antes vinha do Google na publicação)

export const metadata = { title: "Placas da formatura 2026", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Link secreto da direção para fechar as placas de formatura do Grupo V (lib/formatura-placa.ts).
 * Mostra a placa de cada criança já com as fotos escolhidas pelo fotógrafo; a direção completa
 * os nomes, sobe a foto da turma e escolhe nas crianças em que ficou mais de uma opção.
 */
export default async function PlacasFormatura({ params, searchParams }: { params: Promise<{ chave: string }>; searchParams: Promise<{ aluno?: string }> }) {
  const { chave } = await params;
  const { aluno } = await searchParams;
  if (!chavePlacaValida(chave)) notFound();
  const db = createAdminClient();
  const [{ data: conf }, { data: linhas }] = await Promise.all([
    db.from("formatura_placa").select("dados").eq("id", ID_PLACA).maybeSingle(),
    db.from("formatura_placa_aluno").select("nome, turma, fotos_beca, fotos_familia, escolha_beca, escolha_familia, aprovada, observacao").order("nome"),
  ]);
  const dados = (conf?.dados as DadosPlaca) ?? {};
  const lista = linhas ?? [];
  const caminhos = [
    ...lista.flatMap((l) => [...((l.fotos_beca as string[]) ?? []), ...((l.fotos_familia as string[]) ?? [])]),
    ...[dados.foto_turma_a, dados.foto_turma_b, ...(dados.sugestoes_turma_a ?? []), ...(dados.sugestoes_turma_b ?? [])].filter((p): p is string => !!p),
  ];
  const assinadas = caminhos.length ? (await db.storage.from(BUCKET_PLACA).createSignedUrls(caminhos, 60 * 60 * 8)).data ?? [] : [];
  const url = new Map(assinadas.map((s) => [s.path, s.signedUrl]));
  const u = (p: string) => url.get(p) ?? "";

  const criancas: Crianca[] = lista.map((l) => ({
    nome: l.nome,
    turma: l.turma,
    beca: ((l.fotos_beca as string[]) ?? []).map(u),
    familia: ((l.fotos_familia as string[]) ?? []).map(u),
    escolhaBeca: l.escolha_beca,
    escolhaFamilia: l.escolha_familia,
    aprovada: l.aprovada,
    observacao: l.observacao,
  }));

  return (
    <div className={`${serif.variable} ${script.variable}`}>
    <PainelPlacas
      chave={chave}
      foco={typeof aluno === "string" ? aluno : null}
      criancas={criancas}
      textos={{
        oradora_a: dados.oradora_a ?? dados.oradora ?? "", oradora_b: dados.oradora_b ?? "", juramentista_a: dados.juramentista_a ?? dados.juramentista ?? "", juramentista_b: dados.juramentista_b ?? "",
        professora_a: dados.professora_a ?? "", professora_b: dados.professora_b ?? "", auxiliar_a: dados.auxiliar_a ?? "", auxiliar_b: dados.auxiliar_b ?? "", demais: dados.demais ?? "",
        titulo_mensagem: dados.titulo_mensagem ?? "", dedicatoria: dados.dedicatoria ?? "", diretora: dados.diretora ?? "", coordenadora: dados.coordenadora ?? "",
      }}
      ajustes={{ todas: dados.ajustes ?? {}, porCrianca: dados.ajustes_aluno ?? {}, nomes: dados.nomes_placa ?? {} }}
      cortes={{ porCrianca: dados.cortes_aluno ?? {}, turma: dados.cortes_turma ?? {} }}
      fotoTurma={{ a: dados.foto_turma_a ? u(dados.foto_turma_a) : "", b: dados.foto_turma_b ? u(dados.foto_turma_b) : "" }}
      listas={{ a: dados.lista_turma_a ?? [], b: dados.lista_turma_b ?? [] }}
      turmaAprovada={{ a: !!dados.turma_a_aprovada, b: !!dados.turma_b_aprovada }}
      sugestoes={{
        a: (dados.sugestoes_turma_a ?? []).map((p) => ({ url: u(p), atual: p === dados.foto_turma_a })),
        b: (dados.sugestoes_turma_b ?? []).map((p) => ({ url: u(p), atual: p === dados.foto_turma_b })),
      }}
    />
    </div>
  );
}
