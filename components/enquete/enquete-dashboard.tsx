"use client";

import { useMemo, useState } from "react";
import { Download, Heart, MessageSquare, Printer, QrCode } from "lucide-react";
import {
  comentariosDe,
  ESCALA,
  ehFavoravel,
  itensDoProfessor,
  NAO_SEI,
  scoreDe,
  todasClima,
  type EnqueteDef,
  type PerguntaClima,
  type ValorEscala,
} from "@/lib/enquete-config";
import { formatDateTimeBrt } from "@/lib/utils";

export interface RespostaRow {
  id: string;
  serie: string | null;
  turma: string | null;
  respostas: {
    perfil?: Record<string, string>;
    disc?: Record<string, Record<string, string>>;
    dificuldade?: string[];
    clima?: Record<string, string>;
    comentarios?: Record<string, string>;
    abertas?: Record<string, string>;
    ajuda?: { quer?: boolean; contato?: string };
  };
  meta: {
    suspeito?: boolean;
    duracao_seg?: number;
    tempos?: Record<string, number>;
    mediana_bloco_seg?: number | null;
    ip?: string;
  };
  created_at: string;
}

const CORES: Record<ValorEscala, string> = {
  sempre: "#16a34a",
  quase: "#86efac",
  poucas: "#fbbf24",
  nunca: "#ef4444",
};

// Só exibimos média/distribuição com pelo menos este nº de respostas —
// protege o anonimato de turmas pequenas e evita médias instáveis.
const N_MINIMO = 5;
// Nº mínimo de pontos (respostas × perguntas) pra entrar no ranking de temas.
const N_MINIMO_RANKING = 10;

function distribuir(valores: string[]) {
  const counts: Record<ValorEscala, number> = {
    sempre: 0,
    quase: 0,
    poucas: 0,
    nunca: 0,
  };
  let n = 0;
  let naoSei = 0;
  for (const v of valores) {
    if (v === "sempre" || v === "quase" || v === "poucas" || v === "nunca") {
      counts[v]++;
      n++;
    } else if (v === NAO_SEI) {
      naoSei++;
    }
  }
  return { counts, n, naoSei };
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Média na escala 1–4 a partir de scores 0–100 (sempre=4 ... nunca=1). */
function media4(pontos: number[]): number | null {
  if (pontos.length === 0) return null;
  const m = pontos.reduce((a, b) => a + b, 0) / pontos.length;
  return 1 + (m / 100) * 3;
}

function etiqueta(serie: string | null, turma: string | null) {
  return `${serie ?? "Série ?"}${turma ? ` · Turma ${turma}` : ""}`;
}

/** Escapa um valor para célula de CSV (separador ";", Excel pt-BR). */
function celulaCsv(v: unknown): string {
  return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
}

export function EnqueteDashboard({
  def,
  respostas,
  shareUrl,
}: {
  def: EnqueteDef;
  respostas: RespostaRow[];
  shareUrl: string;
}) {
  const [filtroSerie, setFiltroSerie] = useState("");
  const [ocultarSuspeitas, setOcultarSuspeitas] = useState(true);

  const comentarios = comentariosDe(def);

  const series = useMemo(
    () =>
      Array.from(
        new Set(respostas.map((r) => (r.serie ?? "").trim()).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
    [respostas],
  );

  const totalSuspeitas = respostas.filter((r) => r.meta?.suspeito).length;

  const lista = useMemo(
    () =>
      respostas.filter((r) => {
        if (ocultarSuspeitas && r.meta?.suspeito) return false;
        if (filtroSerie && (r.serie ?? "").trim() !== filtroSerie) return false;
        return true;
      }),
    [respostas, filtroSerie, ocultarSuspeitas],
  );

  function valoresClima(id: string) {
    return lista.map((r) => r.respostas?.clima?.[id] ?? "").filter(Boolean);
  }
  function valoresDisc(profId: string, itemId: string) {
    return lista
      .map((r) => r.respostas?.disc?.[profId]?.[itemId] ?? "")
      .filter(Boolean);
  }

  // Cards de resumo: um por âncora que tenha resumoLabel.
  const cardsAncora = def.ancoras
    .filter((a) => a.resumoLabel)
    .map((a) => {
      const v = valoresClima(a.id);
      const { n } = distribuir(v);
      const fav = v.filter((x) => ehFavoravel(x as ValorEscala)).length;
      return { label: a.resumoLabel as string, fav: pct(fav, n), n };
    });

  const pedidosAjuda = respostas.filter((r) => r.respostas?.ajuda?.quer);

  // Exporta as respostas em análise (respeita os filtros) como planilha CSV.
  function baixarCsv() {
    const rotulo: Record<string, string> = { [NAO_SEI]: "Não sei avaliar" };
    for (const e of ESCALA) rotulo[e.valor] = e.label;
    const rot = (v?: string) => (v ? (rotulo[v] ?? v) : "");

    const perguntas = todasClima(def);
    const cabecalho = [
      "Data/hora",
      "Série",
      "Turma",
      ...(def.perguntasPerfil ?? []).map((p) => p.label),
      ...perguntas.map((p) => p.texto),
      ...def.professores.flatMap((d) =>
        itensDoProfessor(def, d).map(
          (it) => `${d.nome} (${d.subtitulo}) — ${it.tituloPainel}`,
        ),
      ),
      ...(def.perguntaDificuldade ? [def.perguntaDificuldade] : []),
      ...comentarios.map((c) => `Comentário — ${c.titulo}`),
      ...def.abertas.map((a) => a.texto),
      "Pediu contato",
      "Contato",
      "Status",
      "IP",
    ];
    const linhas = lista.map((r) => [
      formatDateTimeBrt(r.created_at),
      r.serie ?? "",
      r.turma ?? "",
      ...(def.perguntasPerfil ?? []).map(
        (p) => r.respostas?.perfil?.[p.id] ?? "",
      ),
      ...perguntas.map((p) => rot(r.respostas?.clima?.[p.id])),
      ...def.professores.flatMap((d) =>
        itensDoProfessor(def, d).map((it) =>
          rot(r.respostas?.disc?.[d.id]?.[it.id]),
        ),
      ),
      ...(def.perguntaDificuldade
        ? [
            (r.respostas?.dificuldade ?? [])
              .map(
                (id) => def.professores.find((d) => d.id === id)?.nome ?? id,
              )
              .join(", "),
          ]
        : []),
      ...comentarios.map((c) => r.respostas?.comentarios?.[c.id] ?? ""),
      ...def.abertas.map((a) => r.respostas?.abertas?.[a.id] ?? ""),
      r.respostas?.ajuda?.quer ? "Sim" : "Não",
      r.respostas?.ajuda?.contato ?? "",
      r.meta?.suspeito ? "duvidosa" : "ok",
      r.meta?.ip ?? "",
    ]);
    // BOM faz o Excel abrir o arquivo como UTF-8 (acentos corretos).
    const csv =
      "﻿" +
      [cabecalho, ...linhas]
        .map((l) => l.map(celulaCsv).join(";"))
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${def.slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Ranking por tema: "Professores" (agregado dos cards) + uma linha por seção.
  // "Não sei avaliar" fica fora da média; temas com poucos pontos não exibem média.
  const VALIDOS = new Set<string>(ESCALA.map((e) => e.valor));
  const rankingTemas = (() => {
    const temas: { id: string; titulo: string; pontos: number[] }[] = [];
    const pontosProf: number[] = [];
    for (const d of def.professores) {
      for (const it of itensDoProfessor(def, d)) {
        for (const v of valoresDisc(d.id, it.id)) {
          if (VALIDOS.has(v)) pontosProf.push(scoreDe(v as ValorEscala));
        }
      }
    }
    temas.push({ id: "professores", titulo: "Professores", pontos: pontosProf });
    for (const sec of def.secoes) {
      const pontos: number[] = [];
      for (const p of sec.perguntas) {
        for (const v of valoresClima(p.id)) {
          if (VALIDOS.has(v)) pontos.push(scoreDe(v as ValorEscala, p.invertida));
        }
      }
      temas.push({ id: sec.id, titulo: sec.titulo, pontos });
    }
    return temas
      .map((t) => {
        const suficiente = t.pontos.length >= N_MINIMO_RANKING;
        return {
          ...t,
          media: suficiente ? media4(t.pontos) : null,
          n: t.pontos.length,
        };
      })
      .sort((a, b) => (b.media ?? 0) - (a.media ?? 0));
  })();

  // Tempo médio por bloco (mediana de cada resposta, média entre as respostas).
  const medianas = lista
    .map((r) => r.meta?.mediana_bloco_seg)
    .filter((n): n is number => typeof n === "number");
  const tempoMedioBloco = medianas.length
    ? Math.round(medianas.reduce((a, b) => a + b, 0) / medianas.length)
    : null;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            {def.tituloPainel}
          </h1>
          <p className="text-sm text-muted-foreground">
            {respostas.length} resposta{respostas.length === 1 ? "" : "s"} no
            total · {totalSuspeitas} marcada
            {totalSuspeitas === 1 ? "" : "s"} como duvidosa
            {totalSuspeitas === 1 ? "" : "s"}
          </p>
        </div>
        <ShareCard shareUrl={shareUrl} />
      </div>

      {/* Filtros e exportação */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm print:hidden">
        <select
          value={filtroSerie}
          onChange={(e) => setFiltroSerie(e.target.value)}
          className="h-10 rounded-xl border border-input bg-white px-3 text-sm"
        >
          <option value="">Todas as séries</option>
          {series.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ocultarSuspeitas}
            onChange={(e) => setOcultarSuspeitas(e.target.checked)}
            className="size-4"
          />
          Ocultar respostas duvidosas
        </label>
        <button
          type="button"
          onClick={baixarCsv}
          className="flex items-center gap-1.5 rounded-xl border border-amadeus-blue/30 bg-amadeus-blue-50 px-3 py-2 text-sm font-semibold text-amadeus-blue transition-colors hover:bg-amadeus-blue/10"
        >
          <Download className="size-4" />
          Baixar CSV
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold transition-colors hover:bg-muted/50"
        >
          <Printer className="size-4" />
          Imprimir / PDF
        </button>
        <span className="ml-auto text-sm font-semibold text-muted-foreground">
          Analisando {lista.length} resposta{lista.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Resumo */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumoCard titulo="Respostas analisadas" valor={`${lista.length}`} />
        {cardsAncora.map((c) => (
          <ResumoCard
            key={c.label}
            titulo={c.label}
            valor={`${c.fav}%`}
            sub={`${c.n} responderam`}
          />
        ))}
        <ResumoCard
          titulo="Tempo médio por bloco"
          valor={tempoMedioBloco !== null ? `${tempoMedioBloco}s` : "—"}
          sub="por professor/seção"
        />
      </div>

      {/* Médias por tema (escala 1–4) */}
      <SectionHeader>🏆 Médias por tema (1 a 4)</SectionHeader>
      <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-sm">
        {rankingTemas.map((t) => (
          <div key={t.id} className="mb-3 last:mb-0">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span>{t.titulo}</span>
              <span className="font-semibold tabular-nums">
                {t.media !== null ? t.media.toFixed(2).replace(".", ",") : "—"}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  {t.media !== null
                    ? `(n=${t.n})`
                    : `(${t.n} de ${N_MINIMO_RANKING} respostas mínimas)`}
                </span>
              </span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-amadeus-blue"
                style={{
                  width: `${t.media !== null ? ((t.media - 1) / 3) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Perfil dos respondentes */}
      {(def.perguntasPerfil ?? []).length > 0 && (
        <>
          <SectionHeader>👪 Perfil dos respondentes</SectionHeader>
          <div className="mb-8 grid gap-4 md:grid-cols-2">
            {(def.perguntasPerfil ?? []).map((p) => {
              const porOpcao = p.opcoes.map((op) => ({
                op,
                c: lista.filter((r) => r.respostas?.perfil?.[p.id] === op)
                  .length,
              }));
              const total = porOpcao.reduce((a, b) => a + b.c, 0);
              return (
                <div
                  key={p.id}
                  className="rounded-2xl border border-border bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 text-sm font-semibold text-amadeus-blue">
                    {p.label}
                  </div>
                  {porOpcao.map(({ op, c }) => (
                    <div key={op} className="mb-2 last:mb-0">
                      <div className="flex items-center justify-between text-sm">
                        <span>{op}</span>
                        <span className="font-semibold tabular-nums">
                          {c} ({pct(c, total)}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-amadeus-blue/70"
                          style={{ width: `${pct(c, total)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Pedidos de contato/ajuda */}
      {pedidosAjuda.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 font-bold text-red-800">
            <Heart className="size-5" />
            {pedidosAjuda.length} {def.labelRespondente}
            {pedidosAjuda.length === 1 ? "" : "s"} {def.ajuda.painelTitulo}
          </div>
          <p className="mt-1 text-sm text-red-700">
            Designe alguém da coordenação/orientação para retornar cada um
            destes o quanto antes. Estes se identificaram por vontade própria.
          </p>
          <ul className="mt-3 space-y-2">
            {pedidosAjuda.map((r) => (
              <li
                key={r.id}
                className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
              >
                <span className="font-semibold">
                  {r.respostas?.ajuda?.contato?.trim() || "(não deixou contato)"}
                </span>
                <span className="text-muted-foreground">
                  {" "}
                  · {r.serie ?? "?"}
                  {r.turma ? ` / ${r.turma}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Professores */}
      <SectionHeader>📚 {def.tituloProfessores}</SectionHeader>
      <div className="mb-8 space-y-4">
        {def.professores.map((d) => (
          <div
            key={d.id}
            className="rounded-2xl border border-border bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h3 className="font-bold text-amadeus-blue">{d.nome}</h3>
              <span className="text-xs text-muted-foreground">{d.subtitulo}</span>
            </div>
            {itensDoProfessor(def, d).map((it) => (
              <BarraPergunta
                key={it.id}
                texto={it.tituloPainel}
                valores={valoresDisc(d.id, it.id)}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Dificuldade (só quando a pesquisa tem essa pergunta) */}
      {def.perguntaDificuldade && (
        <>
          <SectionHeader>📉 Matérias com mais dificuldade</SectionHeader>
          <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-sm">
            {def.professores.map((d) => {
              const c = lista.filter((r) =>
                r.respostas?.dificuldade?.includes(d.id),
              ).length;
              return (
                <div key={d.id} className="mb-2 last:mb-0">
                  <div className="flex items-center justify-between text-sm">
                    <span>{d.nome}</span>
                    <span className="font-semibold tabular-nums">
                      {c} ({pct(c, lista.length)}%)
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${pct(c, lista.length)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Clima / seções */}
      {def.secoes.map((sec) => (
        <div key={sec.id} className="mb-8">
          <SectionHeader>{sec.titulo}</SectionHeader>
          <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
            {sec.perguntas.map((p) => (
              <BarraPergunta
                key={p.id}
                texto={p.texto}
                valores={valoresClima(p.id)}
                invertida={p.invertida}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Âncoras */}
      <SectionHeader>Satisfação geral</SectionHeader>
      <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-sm">
        {def.ancoras.map((p: PerguntaClima) => (
          <BarraPergunta
            key={p.id}
            texto={p.texto}
            valores={valoresClima(p.id)}
          />
        ))}
      </div>

      {/* Comentários por categoria */}
      <SectionHeader>🗒️ Comentários por categoria</SectionHeader>
      <div className="mb-10 space-y-4">
        {comentarios.map((cat) => {
          const itens = lista
            .map((r) => ({
              texto: r.respostas?.comentarios?.[cat.id]?.trim() ?? "",
              serie: r.serie,
              turma: r.turma,
            }))
            .filter((x) => x.texto.length > 0);
          if (itens.length === 0) return null;
          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="mb-2 font-semibold text-amadeus-blue">
                {cat.titulo}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  ({itens.length})
                </span>
              </div>
              <ul className="max-h-72 space-y-1.5 overflow-y-auto print:max-h-none print:overflow-visible">
                {itens.map((it, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="mb-0.5 block text-xs font-semibold text-amadeus-blue">
                      {etiqueta(it.serie, it.turma)}
                    </span>
                    {it.texto}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Abertas */}
      <SectionHeader>💬 Respostas abertas</SectionHeader>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {def.abertas.map((a) => {
          const itens = lista
            .map((r) => ({
              texto: r.respostas?.abertas?.[a.id]?.trim() ?? "",
              serie: r.serie,
              turma: r.turma,
            }))
            .filter((x) => x.texto.length > 0);
          return (
            <div
              key={a.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center gap-2 font-semibold text-amadeus-blue">
                <MessageSquare className="size-4" />
                {a.texto}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {itens.length} resposta{itens.length === 1 ? "" : "s"}
              </p>
              <ul className="max-h-80 space-y-1.5 overflow-y-auto print:max-h-none print:overflow-visible">
                {itens.map((it, i) => (
                  <li
                    key={i}
                    className="rounded-lg bg-muted/40 px-3 py-2 text-sm"
                  >
                    <span className="mb-0.5 block text-xs font-semibold text-amadeus-blue">
                      {etiqueta(it.serie, it.turma)}
                    </span>
                    {it.texto}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Respostas individuais (com IP) — fora da impressão (dado sensível) */}
      <div className="print:hidden">
      <SectionHeader>🌐 Respostas individuais (IP)</SectionHeader>
      <details className="mb-10 rounded-2xl border border-border bg-white p-4 shadow-sm">
        <summary className="cursor-pointer text-sm font-semibold text-amadeus-blue">
          Ver {lista.length} resposta{lista.length === 1 ? "" : "s"} com data,
          série/turma e IP
        </summary>
        <div className="mt-3 max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">Data/hora</th>
                <th className="py-2 pr-3 font-semibold">Série/Turma</th>
                <th className="py-2 pr-3 font-semibold">IP</th>
                <th className="py-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="py-2 pr-3 text-muted-foreground">
                    {formatDateTimeBrt(r.created_at)}
                  </td>
                  <td className="py-2 pr-3">
                    {r.serie ?? "?"}
                    {r.turma ? ` / ${r.turma}` : ""}
                  </td>
                  <td className="py-2 pr-3 font-mono text-xs">
                    {r.meta?.ip || "—"}
                  </td>
                  <td className="py-2">
                    {r.meta?.suspeito ? (
                      <span className="text-amber-600">duvidosa</span>
                    ) : (
                      <span className="text-green-700">ok</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          O IP indica de qual conexão a resposta veio (mesmo IP = mesma
          casa/rede). Use só como referência.
        </p>
      </details>
      </div>
    </div>
  );
}

function ResumoCard({
  titulo,
  valor,
  sub,
}: {
  titulo: string;
  valor: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      <div className="mt-1 text-3xl font-extrabold text-amadeus-blue">
        {valor}
      </div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 text-lg font-extrabold">{children}</h2>;
}

function BarraPergunta({
  texto,
  valores,
  invertida,
}: {
  texto: string;
  valores: string[];
  invertida?: boolean;
}) {
  const { counts, n, naoSei } = distribuir(valores);
  const fav = valores.filter((v) =>
    ehFavoravel(v as ValorEscala, invertida),
  ).length;
  const suficiente = n >= N_MINIMO;

  return (
    <div className="border-b border-border/50 py-2.5 last:border-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm">
          {texto}
          {invertida && (
            <span className="ml-1 text-xs text-muted-foreground">
              (quanto menos, melhor)
            </span>
          )}
        </span>
        {suficiente && (
          <span className="shrink-0 text-sm font-bold text-amadeus-blue">
            {pct(fav, n)}% <span className="font-normal">favorável</span>
          </span>
        )}
      </div>
      {suficiente ? (
        <div className="flex h-3 overflow-hidden rounded-full bg-muted">
          {ESCALA.map((op) => {
            const w = pct(counts[op.valor], n);
            if (w === 0) return null;
            return (
              <div
                key={op.valor}
                style={{ width: `${w}%`, background: CORES[op.valor] }}
                title={`${op.label}: ${counts[op.valor]} (${w}%)`}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">
          {n === 0
            ? "Sem respostas ainda."
            : `${n} de ${N_MINIMO} respostas mínimas — resultado oculto pra proteger o anonimato.`}
        </div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground">
        n={n}
        {naoSei > 0 &&
          ` · ${naoSei} não soube${naoSei === 1 ? "" : "ram"} avaliar`}
      </div>
    </div>
  );
}

function ShareCard({ shareUrl }: { shareUrl: string }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    shareUrl,
  )}`;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm print:hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={qr}
        alt="QR Code da pesquisa"
        width={72}
        height={72}
        className="rounded-lg"
      />
      <div className="text-sm">
        <div className="flex items-center gap-1.5 font-semibold text-amadeus-blue">
          <QrCode className="size-4" />
          Link da pesquisa
        </div>
        <a
          href={shareUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline"
        >
          {shareUrl.replace(/^https?:\/\//, "")}
        </a>
      </div>
    </div>
  );
}
