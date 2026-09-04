import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERIES_DISPONIVEIS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import {
  casaPorNome,
  ordemCasa,
  corSuave,
  corTexto,
  corLegivel,
} from "@/lib/casas";
import { RelatorioControls } from "./relatorio-controls";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modo?: string; senhas?: string; agrupar?: string }>;
}

interface Item {
  nome?: string;
  qtd?: number;
}

interface Linha {
  nome: string;
  serie: string;
  turma: string;
  casa: string | null;
  senhas: string;
  totalSenhas: number;
}

interface Grupo {
  chave: string;
  /** Cabeçalho da seção: "6º Ano · Turma A" ou "Casa Interpessoal". */
  titulo: string;
  /** Só quando agrupado por casa — pinta a faixa com a cor dela. */
  casa: string | null;
  linhas: Linha[];
  totalSenhas: number;
}

function ordemSerie(serie: string): number {
  const i = SERIES_DISPONIVEIS.indexOf(serie as (typeof SERIES_DISPONIVEIS)[number]);
  return i === -1 ? 999 : i;
}

/**
 * Selo da casa: bolinha na cor exata da camisa + o nome.
 *
 * A bolinha é a cor cheia (é ela que a confecção confere); o fundo é a
 * versão clara, porque esta lista é impressa e faixa escura em toda linha
 * gasta tinta sem necessidade.
 */
function SeloCasa({ nome }: { nome: string | null }) {
  const casa = casaPorNome(nome);
  if (!casa) return <span className="text-muted-foreground">—</span>;
  const fundo = corSuave(casa.cor);
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-bold"
      style={{ backgroundColor: fundo, color: corLegivel(casa.cor, fundo) }}
    >
      <span
        aria-hidden
        className="inline-block size-2 shrink-0 rounded-full print:border print:border-black/30"
        style={{ backgroundColor: casa.cor }}
      />
      {casa.nome}
    </span>
  );
}

export default async function RelatorioPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const {
    modo: modoRaw,
    senhas: senhasRaw,
    agrupar: agruparRaw,
  } = await searchParams;
  const modo: "lista" | "paginas" = modoRaw === "paginas" ? "paginas" : "lista";
  // "Versão professores": esconde a coluna de senhas e os totais,
  // pra lista circular sem expor quanto cada família comprou.
  const mostrarSenhas = senhasRaw !== "nao";
  const agruparPorCasa = agruparRaw === "casa";

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, data_evento")
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  // Tenta com alunos_incluidos (migration 0013); se a coluna ainda não
  // existe, cai pro select antigo sem irmãos.
  type InscricaoRel = {
    id: string;
    itens: unknown;
    aluno_id?: string;
    alunos_incluidos?: string[] | null;
    aluno: unknown;
  };

  const r1 = await supabase
    .from("inscricoes")
    .select(
      "id, itens, aluno_id, alunos_incluidos, aluno:alunos(nome_completo, serie, turma, casa)",
    )
    .eq("evento_id", id)
    .eq("status_pagamento", "pago");
  let inscricoes = r1.data as unknown as InscricaoRel[] | null;

  if (!inscricoes) {
    const r2 = await supabase
      .from("inscricoes")
      .select("id, itens, aluno_id, aluno:alunos(nome_completo, serie, turma, casa)")
      .eq("evento_id", id)
      .eq("status_pagamento", "pago");
    inscricoes = r2.data as unknown as InscricaoRel[] | null;
  }

  // Dados dos irmãos incluídos (pagamento familiar)
  const idsIrmaos = new Set<string>();
  for (const i of inscricoes ?? []) {
    const incluidos =
      ((i as { alunos_incluidos?: string[] | null }).alunos_incluidos ??
        []) as string[];
    for (const a of incluidos) {
      if (a !== (i as { aluno_id?: string }).aluno_id) idsIrmaos.add(a);
    }
  }
  const irmaosMap = new Map<
    string,
    { nome_completo: string; serie: string; turma: string; casa: string | null }
  >();
  if (idsIrmaos.size > 0) {
    const { data: irmaosData } = await supabase
      .from("alunos")
      .select("id, nome_completo, serie, turma, casa")
      .in("id", [...idsIrmaos]);
    for (const a of irmaosData ?? []) irmaosMap.set(a.id, a);
  }

  const linhas: Linha[] = [];
  const alunosComLinha = new Set<string>();

  for (const i of inscricoes ?? []) {
    const aluno = i.aluno as unknown as
      | { nome_completo: string; serie: string; turma: string; casa: string | null }
      | null;
    const itens = (i.itens as Item[] | null) ?? [];
    const comQtd = itens.filter((it) => (it.qtd ?? 0) > 0);
    const senhas = comQtd
      .map((it) => `${it.qtd}x ${(it.nome ?? "Senha").trim()}`)
      .join(", ");
    const totalSenhas = comQtd.reduce((s, it) => s + (it.qtd ?? 0), 0);
    linhas.push({
      nome: aluno?.nome_completo ?? "—",
      serie: aluno?.serie ?? "Sem série",
      turma: aluno?.turma ?? "Sem turma",
      casa: aluno?.casa ?? null,
      senhas: senhas || "—",
      totalSenhas,
    });
    const alunoId = (i as { aluno_id?: string }).aluno_id;
    if (alunoId) alunosComLinha.add(alunoId);
  }

  // Irmãos entram cada um na própria turma, sem duplicar a contagem
  // de senhas (que fica com o aluno principal da inscrição).
  for (const i of inscricoes ?? []) {
    const alunoId = (i as { aluno_id?: string }).aluno_id;
    const incluidos =
      ((i as { alunos_incluidos?: string[] | null }).alunos_incluidos ??
        []) as string[];
    const principal = (
      i.aluno as unknown as { nome_completo: string } | null
    )?.nome_completo;
    for (const a of incluidos) {
      if (a === alunoId) continue;
      if (alunosComLinha.has(a)) continue; // já tem inscrição própria
      const irmao = irmaosMap.get(a);
      if (!irmao) continue;
      alunosComLinha.add(a);
      linhas.push({
        nome: irmao.nome_completo,
        serie: irmao.serie ?? "Sem série",
        turma: irmao.turma ?? "Sem turma",
        casa: irmao.casa ?? null,
        senhas: `família — junto com ${principal ?? "irmão"}`,
        totalSenhas: 0,
      });
    }
  }

  // A casa só entra em cena se os alunos DESTE evento tiverem casa —
  // hoje só o Fundamental 2 tem. Nos demais eventos o relatório fica
  // exatamente como era.
  const temCasa = linhas.some((l) => l.casa);

  // Ordena: por casa (quando pedido) ou por série → turma → nome
  linhas.sort((a, b) => {
    if (agruparPorCasa && temCasa) {
      if (a.casa !== b.casa) return ordemCasa(a.casa) - ordemCasa(b.casa);
    }
    if (a.serie !== b.serie) return ordemSerie(a.serie) - ordemSerie(b.serie);
    if (a.turma !== b.turma) return a.turma.localeCompare(b.turma, "pt-BR");
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  const grupos: Grupo[] = [];
  for (const l of linhas) {
    const chave =
      agruparPorCasa && temCasa ? l.casa ?? "Sem casa" : `${l.serie}|${l.turma}`;
    let g = grupos.find((x) => x.chave === chave);
    if (!g) {
      g = {
        chave,
        titulo:
          agruparPorCasa && temCasa
            ? l.casa
              ? `Casa ${l.casa}`
              : "Sem casa definida"
            : `${l.serie} · Turma ${l.turma}`,
        casa: agruparPorCasa && temCasa ? l.casa : null,
        linhas: [],
        totalSenhas: 0,
      };
      grupos.push(g);
    }
    g.linhas.push(l);
    g.totalSenhas += l.totalSenhas;
  }

  const totalAlunos = linhas.length;
  const totalSenhas = linhas.reduce((s, l) => s + l.totalSenhas, 0);

  // Resumo por casa — é o que a confecção precisa para fechar as cores.
  const resumoCasas = temCasa
    ? [...new Set(linhas.map((l) => l.casa))]
        .sort((a, b) => ordemCasa(a) - ordemCasa(b))
        .map((casa) => ({
          casa,
          alunos: linhas.filter((l) => l.casa === casa).length,
          pecas: linhas
            .filter((l) => l.casa === casa)
            .reduce((s, l) => s + l.totalSenhas, 0),
        }))
    : [];

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <RelatorioControls
        eventoId={evento.id}
        modo={modo}
        mostrarSenhas={mostrarSenhas}
        agruparPorCasa={agruparPorCasa}
        temCasa={temCasa}
      />

      <div className="mt-8 print:mt-0">
        {/* Cabeçalho geral: na impressão por turma ele some — cada
            folha tem o próprio cabeçalho com os números DA turma. */}
        <header
          className={`border-b-2 border-amadeus-blue pb-4 ${
            modo === "paginas" ? "print:hidden" : ""
          }`}
        >
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            {evento.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relatório de pagantes · {formatDate(evento.data_evento)}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {totalAlunos} aluno(s)
            {mostrarSenhas ? ` · ${totalSenhas} senha(s) no total` : ""}
          </p>
        </header>

        {/* Quadro por casa — some na impressão "uma página por grupo",
            que já traz o total de cada folha. */}
        {resumoCasas.length > 0 && (
          <section
            className={`mt-5 ${modo === "paginas" ? "print:hidden" : ""}`}
          >
            <h2 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Por casa
            </h2>
            <div className="flex flex-wrap gap-2">
              {resumoCasas.map((r) => {
                const casa = casaPorNome(r.casa);
                return (
                  <div
                    key={r.casa ?? "sem"}
                    className="overflow-hidden rounded-xl border print:border-border"
                    style={{ borderColor: casa?.cor }}
                  >
                    {/* Faixa na cor cheia da camisa, com o hex à vista —
                        é o que a gráfica confere. */}
                    <div
                      className="flex items-baseline justify-between gap-3 px-3 py-1"
                      style={{
                        backgroundColor: casa?.cor,
                        color: casa ? corTexto(casa.cor) : undefined,
                      }}
                    >
                      <span className="text-xs font-bold">
                        {r.casa ?? "Sem casa"}
                      </span>
                      {casa && (
                        <span className="font-mono text-[10px] opacity-80">
                          {casa.cor}
                        </span>
                      )}
                    </div>
                    <div
                      className="px-3 py-1.5 text-sm font-extrabold tabular-nums"
                      style={{ backgroundColor: casa ? corSuave(casa.cor) : undefined }}
                    >
                      {r.alunos} aluno(s)
                      {mostrarSenhas ? ` · ${r.pecas} peça(s)` : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {totalAlunos === 0 ? (
          <p className="mt-8 text-center text-muted-foreground">
            Nenhum pagamento confirmado ainda.
          </p>
        ) : (
          <div
            className={
              modo === "paginas"
                ? "mt-6 space-y-6 print:space-y-0"
                : "mt-6 space-y-8"
            }
          >
            {grupos.map((g, idx) => {
              const casaDoGrupo = casaPorNome(g.casa);
              return (
                <section
                  key={g.chave}
                  className={[
                    modo === "paginas"
                      ? "rounded-2xl border-2 border-amadeus-blue/20 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none"
                      : "",
                    modo === "paginas" && idx < grupos.length - 1
                      ? "print:break-after-page"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  {modo === "paginas" && (
                    <div className="-mt-2 mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-amadeus-blue/60 print:hidden">
                      <span>
                        Página {idx + 1} de {grupos.length}
                      </span>
                      <span>
                        {agruparPorCasa && temCasa
                          ? "Uma casa por página"
                          : "Uma turma por página"}
                      </span>
                    </div>
                  )}
                  {modo === "paginas" && (
                    <div className="mb-3 hidden border-b-2 border-amadeus-blue pb-2 print:block">
                      <div className="text-lg font-extrabold text-amadeus-blue">
                        {evento.nome}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Relatório de pagantes · {formatDate(evento.data_evento)}{" "}
                        · Página {idx + 1} de {grupos.length}
                      </div>
                    </div>
                  )}
                  <h2
                    className="mb-2 text-base font-extrabold text-amadeus-blue"
                    style={{ color: casaDoGrupo?.cor }}
                  >
                    {g.titulo}
                    <span className="ml-2 text-sm font-medium text-muted-foreground">
                      ({g.linhas.length} aluno(s)
                      {mostrarSenhas ? ` · ${g.totalSenhas} senha(s)` : ""})
                    </span>
                  </h2>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b-2 border-border text-left">
                        <th className="py-2 pr-3 font-semibold">#</th>
                        <th className="py-2 pr-3 font-semibold">Aluno</th>
                        {temCasa && (
                          <th className="py-2 pr-3 font-semibold">Casa</th>
                        )}
                        <th className="py-2 pr-3 font-semibold">Série</th>
                        <th className="py-2 pr-3 font-semibold">Turma</th>
                        {mostrarSenhas && (
                          <th className="py-2 font-semibold">Senhas</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {g.linhas.map((l, i) => (
                        <tr
                          key={`${g.chave}-${i}`}
                          className="border-b border-border/60 break-inside-avoid"
                        >
                          <td className="py-2 pr-3 tabular-nums text-muted-foreground">
                            {i + 1}
                          </td>
                          <td className="py-2 pr-3 font-medium">{l.nome}</td>
                          {temCasa && (
                            <td className="py-2 pr-3">
                              <SeloCasa nome={l.casa} />
                            </td>
                          )}
                          <td className="py-2 pr-3">{l.serie}</td>
                          <td className="py-2 pr-3">{l.turma}</td>
                          {mostrarSenhas && <td className="py-2">{l.senhas}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
