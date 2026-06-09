import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SERIES_DISPONIVEIS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { RelatorioControls } from "./relatorio-controls";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ modo?: string }>;
}

interface Item {
  nome?: string;
  qtd?: number;
}

interface Linha {
  nome: string;
  serie: string;
  turma: string;
  senhas: string;
  totalSenhas: number;
}

interface Grupo {
  chave: string;
  turma: string;
  serie: string;
  linhas: Linha[];
  totalSenhas: number;
}

function ordemSerie(serie: string): number {
  const i = SERIES_DISPONIVEIS.indexOf(serie as (typeof SERIES_DISPONIVEIS)[number]);
  return i === -1 ? 999 : i;
}

export default async function RelatorioPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { modo: modoRaw } = await searchParams;
  const modo: "lista" | "paginas" = modoRaw === "paginas" ? "paginas" : "lista";

  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select("id, nome, data_evento")
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  const { data: inscricoes } = await supabase
    .from("inscricoes")
    .select("id, itens, aluno:alunos(nome_completo, serie, turma)")
    .eq("evento_id", id)
    .eq("status_pagamento", "pago");

  const linhas: Linha[] = (inscricoes ?? []).map((i) => {
    const aluno = i.aluno as unknown as
      | { nome_completo: string; serie: string; turma: string }
      | null;
    const itens = (i.itens as Item[] | null) ?? [];
    const comQtd = itens.filter((it) => (it.qtd ?? 0) > 0);
    const senhas = comQtd
      .map((it) => `${it.qtd}x ${(it.nome ?? "Senha").trim()}`)
      .join(", ");
    const totalSenhas = comQtd.reduce((s, it) => s + (it.qtd ?? 0), 0);
    return {
      nome: aluno?.nome_completo ?? "—",
      serie: aluno?.serie ?? "Sem série",
      turma: aluno?.turma ?? "Sem turma",
      senhas: senhas || "—",
      totalSenhas,
    };
  });

  // Ordena por série (Maternal II → ... → 9º Ano) → turma (A, B, C...) → nome
  linhas.sort((a, b) => {
    if (a.serie !== b.serie) return ordemSerie(a.serie) - ordemSerie(b.serie);
    if (a.turma !== b.turma) return a.turma.localeCompare(b.turma, "pt-BR");
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  // Agrupa por série + turma (chave série-primeiro pra preservar a ordem)
  const grupos: Grupo[] = [];
  for (const l of linhas) {
    const chave = `${l.serie}|${l.turma}`;
    let g = grupos.find((x) => x.chave === chave);
    if (!g) {
      g = { chave, turma: l.turma, serie: l.serie, linhas: [], totalSenhas: 0 };
      grupos.push(g);
    }
    g.linhas.push(l);
    g.totalSenhas += l.totalSenhas;
  }

  const totalAlunos = linhas.length;
  const totalSenhas = linhas.reduce((s, l) => s + l.totalSenhas, 0);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 print:max-w-none print:px-0 print:py-0">
      <RelatorioControls eventoId={evento.id} modo={modo} />

      <div className="mt-8 print:mt-0">
        {/* Cabeçalho do relatório */}
        <header className="border-b-2 border-amadeus-blue pb-4">
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            {evento.nome}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Relatório de pagantes · {formatDate(evento.data_evento)}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {totalAlunos} aluno(s) · {totalSenhas} senha(s) no total
          </p>
        </header>

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
            {grupos.map((g, idx) => (
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
                    <span>Página {idx + 1} de {grupos.length}</span>
                    <span>Uma turma por página</span>
                  </div>
                )}
                <h2 className="mb-2 text-base font-extrabold text-amadeus-blue">
                  {g.serie} · Turma {g.turma}
                  <span className="ml-2 text-sm font-medium text-muted-foreground">
                    ({g.linhas.length} aluno(s) · {g.totalSenhas} senha(s))
                  </span>
                </h2>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-border text-left">
                      <th className="py-2 pr-3 font-semibold">#</th>
                      <th className="py-2 pr-3 font-semibold">Aluno</th>
                      <th className="py-2 pr-3 font-semibold">Série</th>
                      <th className="py-2 pr-3 font-semibold">Turma</th>
                      <th className="py-2 font-semibold">Senhas</th>
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
                        <td className="py-2 pr-3">{l.serie}</td>
                        <td className="py-2 pr-3">{l.turma}</td>
                        <td className="py-2">{l.senhas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
