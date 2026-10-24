import Link from "next/link";
import { TIPOS_CALENDARIO, diaCurto, hojeBR, itensDoCalendario, somaDias, type ItemCalendario } from "@/lib/painel";
import { NovoItem, Remover } from "./form";

/**
 * Calendário da escola (Pedro, 24/10/2026): o mês com feriados, eventos, gravações, demandas da Comunicação,
 * pedagógico e prazos, para todo mundo saber o que acontece e para ajudar a escolher datas.
 */
export const metadata = { title: "Calendário · Painel Amadeus" };
export const dynamic = "force-dynamic";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export default async function Calendario({ searchParams }: { searchParams: Promise<{ mes?: string; tipo?: string }> }) {
  const { mes, tipo } = await searchParams;
  const hoje = hojeBR();
  const [ano, m] = (mes && /^\d{4}-\d{2}$/.test(mes) ? mes : hoje.slice(0, 7)).split("-").map(Number);
  const primeiro = `${ano}-${String(m).padStart(2, "0")}-01`;
  const ultimo = new Date(Date.UTC(ano, m, 0)).toISOString().slice(0, 10);
  const inicioGrade = somaDias(primeiro, -new Date(primeiro + "T12:00:00Z").getUTCDay());
  const dias = Array.from({ length: Math.ceil((new Date(primeiro + "T12:00:00Z").getUTCDay() + Number(ultimo.slice(8))) / 7) * 7 }, (_, i) => somaDias(inicioGrade, i));
  const [itens, semana] = await Promise.all([
    itensDoCalendario(dias[0], dias[dias.length - 1]).catch(() => [] as ItemCalendario[]),
    itensDoCalendario(hoje, somaDias(hoje, 7)).catch(() => [] as ItemCalendario[]),
  ]);
  const noDia = (d: string) => itens.filter((i) => i.data <= d && (i.ate ?? i.data) >= d);
  const estilo = (t: string) => TIPOS_CALENDARIO.find((x) => x.valor === t) ?? TIPOS_CALENDARIO[1];
  const vizinho = (n: number) => { const d = new Date(Date.UTC(ano, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; };
  // Dias de semana deste mês sem nada marcado (ajuda a escolher data).
  const livres = dias.filter((d) => d.slice(0, 7) === primeiro.slice(0, 7) && d >= hoje && ![0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay()) && !noDia(d).length);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
      <section className="rounded-2xl border border-[#e8e1d0] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-serifa)] text-3xl font-bold text-[#1B3B7C] first-letter:uppercase">{MESES[m - 1]} {ano}</h1>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Link href={`/painel/calendario?mes=${vizinho(-1)}`} className="rounded-lg bg-[#eef2fa] px-3 py-1.5 text-[#1B3B7C]">‹ {MESES[(m + 10) % 12]}</Link>
            <Link href="/painel/calendario" className="rounded-lg px-2 py-1.5 text-[#5b6478]">hoje</Link>
            <Link href={`/painel/calendario?mes=${vizinho(1)}`} className="rounded-lg bg-[#eef2fa] px-3 py-1.5 text-[#1B3B7C]">{MESES[m % 12]} ›</Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {TIPOS_CALENDARIO.map((t) => (
            <span key={t.valor} className="flex items-center gap-1.5 rounded-full bg-[#f6f3ea] px-2.5 py-1 text-xs font-bold"><i className="inline-block size-2.5 rounded-full" style={{ background: t.cor }} />{t.rotulo}</span>
          ))}
        </div>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[700px]">
            <div className="grid grid-cols-7 pb-1.5 text-[11.5px] font-bold uppercase tracking-wider text-[#5b6478]">{SEMANA.map((s) => <span key={s} className="px-1.5">{s}</span>)}</div>
            <div className="grid grid-cols-7 border-l border-t border-[#e8e1d0]">
              {dias.map((d) => {
                const doMes = d.slice(0, 7) === primeiro.slice(0, 7);
                const fds = [0, 6].includes(new Date(d + "T12:00:00Z").getUTCDay());
                const lista = noDia(d);
                const feriado = lista.some((i) => i.tipo === "feriado");
                return (
                  <div key={d} className={`min-h-[104px] border-b border-r border-[#e8e1d0] p-1.5 text-xs ${feriado ? "bg-[#fdeceb]" : d === hoje ? "bg-[#fff8dc]" : fds ? "bg-[#fbf9f3]" : ""}`}>
                    <span className={`inline-grid size-6 place-items-center rounded-full text-[13px] font-bold ${d === hoje ? "bg-[#1B3B7C] text-white" : doMes ? "text-[#5b6478]" : "text-[#5b6478]/35"}`}>{Number(d.slice(8))}</span>
                    {lista.map((i) => {
                      const e = estilo(i.tipo);
                      return (
                        <span key={i.id} title={[i.titulo, i.hora, i.responsavel, i.observacao].filter(Boolean).join(" · ")} className="mt-1 block truncate rounded px-1.5 py-0.5 text-[11.5px] font-semibold" style={{ background: e.fundo, color: e.cor }}>
                          {i.hora ? `${i.hora} ` : ""}{i.titulo}
                        </span>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {livres.length > 0 && (
          <p className="mt-4 rounded-xl border border-[#cfe6d6] bg-[#eef6f0] px-4 py-3 text-sm">
            <b>Procurando uma data?</b> Dias de semana sem nada marcado em {MESES[m - 1]}: <b>{livres.map((d) => Number(d.slice(8))).join(", ")}</b>.
          </p>
        )}
      </section>

      <aside className="flex flex-col gap-5">
        <section className="rounded-2xl border border-[#e8e1d0] bg-white p-5">
          <h2 className="font-[family-name:var(--font-serifa)] text-[21px] font-bold text-[#1B3B7C]">Próximos 7 dias</h2>
          {semana.length ? (
            <ul className="mt-3 space-y-2.5">
              {semana.map((i) => (
                <li key={i.id} className="flex gap-3 text-sm">
                  <span className="w-1 shrink-0 rounded" style={{ background: estilo(i.tipo).cor }} />
                  <span className="flex-1">
                    <span className="text-xs font-bold uppercase text-[#5b6478]">{i.data <= hoje ? "hoje" : diaCurto(i.data)}{i.hora ? ` · ${i.hora}` : ""}</span>
                    <b className="block">{i.titulo}</b>
                    {(i.responsavel || i.observacao || i.criado_por) && (
                      <small className="block text-xs text-[#5b6478]">{[i.responsavel, i.observacao, i.criado_por && i.criado_por !== "sistema" ? `marcado por ${i.criado_por}` : null].filter(Boolean).join(" · ")}</small>
                    )}
                  </span>
                  <Remover id={i.id} />
                </li>
              ))}
            </ul>
          ) : <p className="mt-2 text-sm text-[#5b6478]">Nada marcado nos próximos 7 dias.</p>}
        </section>
        <section id="novo" className="rounded-2xl border border-[#e8e1d0] bg-white p-5">
          <h2 className="font-[family-name:var(--font-serifa)] text-[21px] font-bold text-[#1B3B7C]">Adicionar</h2>
          <p className="mb-3 mt-1 text-xs text-[#5b6478]">Gravação, pedido para a Comunicação, prova, evento, prazo… Fica visível para toda a equipe, com o seu nome.</p>
          <NovoItem tipos={TIPOS_CALENDARIO.map(({ valor, rotulo }) => ({ valor, rotulo }))} tipoInicial={TIPOS_CALENDARIO.some((t) => t.valor === tipo) ? tipo! : "evento"} dataInicial={hoje} />
        </section>
      </aside>
    </div>
  );
}
