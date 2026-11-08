import { notFound } from "next/navigation";
import { Cormorant_Garamond, Great_Vibes } from "next/font/google";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_PLACA, ID_PLACA, chavePlacaValida, type DadosPlaca } from "@/lib/formatura-placa";
import { PainelPlacas, type Crianca } from "./painel";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--f-serif" });
const script = Great_Vibes({ subsets: ["latin"], weight: "400", variable: "--f-script" });

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
        oradora: dados.oradora ?? "", juramentista: dados.juramentista ?? "",
        professora_a: dados.professora_a ?? "", professora_b: dados.professora_b ?? "", demais: dados.demais ?? "",
      }}
      fotoTurma={{ a: dados.foto_turma_a ? u(dados.foto_turma_a) : "", b: dados.foto_turma_b ? u(dados.foto_turma_b) : "" }}
      turmaAprovada={{ a: !!dados.turma_a_aprovada, b: !!dados.turma_b_aprovada }}
      sugestoes={{
        a: (dados.sugestoes_turma_a ?? []).map((p) => ({ url: u(p), atual: p === dados.foto_turma_a })),
        b: (dados.sugestoes_turma_b ?? []).map((p) => ({ url: u(p), atual: p === dados.foto_turma_b })),
      }}
    />
    </div>
  );
}
