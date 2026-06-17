"use client";

import { useMemo, useState } from "react";
import { Heart, MessageSquare, QrCode } from "lucide-react";
import {
  ABERTAS,
  ANCORAS,
  COMENTARIOS,
  DISCIPLINAS,
  ESCALA,
  SECOES_CLIMA,
  ehFavoravel,
  type PerguntaClima,
  type ValorEscala,
} from "@/lib/enquete-config";
import { formatDateTimeBrt } from "@/lib/utils";

export interface RespostaRow {
  id: string;
  serie: string | null;
  turma: string | null;
  respostas: {
    disc?: Record<
      string,
      { clareza?: string; respeito?: string; sugestao?: string }
    >;
    dificuldade?: string[];
    clima?: Record<string, string>;
    comentarios?: Record<string, string>;
    abertas?: { mais_gosta?: string; mudaria?: string };
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

function distribuir(valores: string[]) {
  const counts: Record<ValorEscala, number> = {
    sempre: 0,
    quase: 0,
    poucas: 0,
    nunca: 0,
  };
  let n = 0;
  for (const v of valores) {
    if (v === "sempre" || v === "quase" || v === "poucas" || v === "nunca") {
      counts[v]++;
      n++;
    }
  }
  return { counts, n };
}

function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

function etiqueta(serie: string | null, turma: string | null) {
  return `${serie ?? "Série ?"}${turma ? ` · Turma ${turma}` : ""}`;
}

export function EnqueteDashboard({
  respostas,
  shareUrl,
}: {
  respostas: RespostaRow[];
  shareUrl: string;
}) {
  const [filtroSerie, setFiltroSerie] = useState("");
  const [ocultarSuspeitas, setOcultarSuspeitas] = useState(true);

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
  function valoresDisc(discId: string, campo: "clareza" | "respeito") {
    return lista
      .map((r) => r.respostas?.disc?.[discId]?.[campo] ?? "")
      .filter(Boolean);
  }

  const favGeral = (() => {
    const v = valoresClima("gosto_geral");
    const { n } = distribuir(v);
    const fav = v.filter((x) => ehFavoravel(x as ValorEscala)).length;
    return { fav: pct(fav, n), n };
  })();
  const favRec = (() => {
    const v = valoresClima("recomendaria");
    const { n } = distribuir(v);
    const fav = v.filter((x) => ehFavoravel(x as ValorEscala)).length;
    return { fav: pct(fav, n), n };
  })();

  const pedidosAjuda = respostas.filter((r) => r.respostas?.ajuda?.quer);

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
            Enquete de Clima Escolar
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

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm">
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
        <span className="ml-auto text-sm font-semibold text-muted-foreground">
          Analisando {lista.length} resposta{lista.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Resumo */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ResumoCard titulo="Respostas analisadas" valor={`${lista.length}`} />
        <ResumoCard
          titulo="Gostam de estudar aqui"
          valor={`${favGeral.fav}%`}
          sub={`${favGeral.n} responderam`}
        />
        <ResumoCard
          titulo="Recomendariam a escola"
          valor={`${favRec.fav}%`}
          sub={`${favRec.n} responderam`}
        />
        <ResumoCard
          titulo="Tempo médio por bloco"
          valor={tempoMedioBloco !== null ? `${tempoMedioBloco}s` : "—"}
          sub="por professor/seção"
        />
      </div>

      {/* Pedidos de ajuda */}
      {pedidosAjuda.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-4">
          <div className="flex items-center gap-2 font-bold text-red-800">
            <Heart className="size-5" />
            {pedidosAjuda.length} aluno(s) pediram para conversar
          </div>
          <p className="mt-1 text-sm text-red-700">
            Designe alguém da coordenação/orientação para acolher cada um destes
            o quanto antes. Estes alunos escolheram se identificar.
          </p>
          <ul className="mt-3 space-y-2">
            {pedidosAjuda.map((r) => (
              <li
                key={r.id}
                className="rounded-xl bg-white px-3 py-2 text-sm shadow-sm"
              >
                <span className="font-semibold">
                  {r.respostas?.ajuda?.contato?.trim() || "(não deixou nome)"}
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

      {/* Disciplinas */}
      <SectionHeader>📚 Aulas e professores</SectionHeader>
      <div className="mb-8 space-y-4">
        {DISCIPLINAS.map((d) => {
          const sugestoes = lista
            .map((r) => r.respostas?.disc?.[d.id]?.sugestao?.trim())
            .filter((s): s is string => !!s && s.length > 0);
          return (
            <div
              key={d.id}
              className="rounded-2xl border border-border bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <h3 className="font-bold text-amadeus-blue">{d.nome}</h3>
                <span className="text-xs text-muted-foreground">
                  {d.professor}
                </span>
              </div>
              <BarraPergunta
                texto="Explica de um jeito que dá pra entender"
                valores={valoresDisc(d.id, "clareza")}
              />
              <BarraPergunta
                texto="Trata os alunos com respeito"
                valores={valoresDisc(d.id, "respeito")}
              />
              {sugestoes.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-amadeus-blue">
                    {sugestoes.length} sugestão
                    {sugestoes.length === 1 ? "" : "ões"}
                  </summary>
                  <ul className="mt-2 space-y-1.5">
                    {sugestoes.map((s, i) => (
                      <li
                        key={i}
                        className="rounded-lg bg-muted/40 px-3 py-2 text-sm"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {/* Dificuldade */}
      <SectionHeader>📉 Matérias com mais dificuldade</SectionHeader>
      <div className="mb-8 rounded-2xl border border-border bg-white p-4 shadow-sm">
        {DISCIPLINAS.map((d) => {
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

      {/* Clima */}
      {SECOES_CLIMA.map((sec) => (
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
        {ANCORAS.map((p: PerguntaClima) => (
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
        {COMENTARIOS.map((cat) => {
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
              <ul className="max-h-72 space-y-1.5 overflow-y-auto">
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
        {ABERTAS.map((a) => {
          const itens = lista
            .map((r) => ({
              texto:
                r.respostas?.abertas?.[
                  a.id as "mais_gosta" | "mudaria"
                ]?.trim() ?? "",
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
              <ul className="max-h-80 space-y-1.5 overflow-y-auto">
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

      {/* Respostas individuais (com IP) */}
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
  const { counts, n } = distribuir(valores);
  const fav = valores.filter((v) =>
    ehFavoravel(v as ValorEscala, invertida),
  ).length;

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
        <span className="shrink-0 text-sm font-bold text-amadeus-blue">
          {pct(fav, n)}% <span className="font-normal">favorável</span>
        </span>
      </div>
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
      <div className="mt-1 text-[11px] text-muted-foreground">
        {n} resposta{n === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function ShareCard({ shareUrl }: { shareUrl: string }) {
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
    shareUrl,
  )}`;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3 shadow-sm">
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
