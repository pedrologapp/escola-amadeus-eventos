import Link from "next/link";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { valoresLiberados } from "@/lib/valores-auth";
import { conferirSeAntigo } from "@/lib/asaas-conferencia";
import { BotaoMostrarValores, ValorSensivel } from "@/components/admin/valores-sensiveis";
import { AlertasReembolso } from "../alertas-reembolso";
import { AbasCobrancas } from "../abas";
import { AvisoLimpeza } from "../aviso-limpeza";

/**
 * Cobranças dos EVENTOS num lugar só (direção, 28/09/2026): as inscrições de
 * todos os eventos em sequência, do mais recente para o mais antigo, como na
 * página de cada evento. Eventos ativos x concluídos, filtro por situação e
 * por evento, 30 por página.
 */
export const metadata = { title: "Cobranças de eventos · Admin Amadeus" };
export const dynamic = "force-dynamic";

type Filtro = "todas" | "pagas" | "pendentes" | "canceladas";
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: "todas", rotulo: "Todas" },
  { id: "pagas", rotulo: "Pagas" },
  { id: "pendentes", rotulo: "Pendentes" },
  { id: "canceladas", rotulo: "Canceladas" },
];
const FORMA: Record<string, string> = { pix: "PIX", cartao: "Cartão", dinheiro: "Dinheiro" };

function situacao(status: string, asaas: string | null) {
  if (status === "pendente" && asaas === "REMOVIDA") return { rotulo: "Cancelada no Asaas", cls: "bg-gray-100 text-gray-600 border-gray-300" };
  if (status === "pendente" && asaas === "OVERDUE") return { rotulo: "Vencida", cls: "bg-orange-100 text-orange-800 border-orange-300" };
  if (status === "pendente" && (asaas === "RECEIVED" || asaas === "CONFIRMED")) return { rotulo: "Paga no Asaas", cls: "bg-sky-100 text-sky-800 border-sky-300" };
  if (status === "pago") return { rotulo: "Pago", cls: "bg-green-100 text-green-800 border-green-300" };
  if (status === "pendente") return { rotulo: "Pendente", cls: "bg-amber-100 text-amber-800 border-amber-300" };
  if (status === "estornado") return { rotulo: "Estornado", cls: "bg-red-100 text-red-800 border-red-300" };
  return { rotulo: "Cancelado", cls: "bg-gray-100 text-gray-600 border-gray-300" };
}

type Periodo = "ativos" | "concluidos" | "todos";
const PERIODOS: { id: Periodo; rotulo: string }[] = [
  { id: "ativos", rotulo: "Eventos ativos" },
  { id: "concluidos", rotulo: "Concluídos" },
  { id: "todos", rotulo: "Todos" },
];
const POR_PAGINA = 30;
const NENHUM = "00000000-0000-0000-0000-000000000000";

export default async function CobrancasEventosPage({ searchParams }: { searchParams: Promise<{ f?: string; evento?: string; periodo?: string; p?: string }> }) {
  after(conferirSeAntigo);
  const sp = await searchParams;
  const filtro: Filtro = FILTROS.some((x) => x.id === sp.f) ? (sp.f as Filtro) : "todas";
  const eventoId = sp.evento && /^[0-9a-f-]{36}$/i.test(sp.evento) ? sp.evento : null;
  const periodo: Periodo = PERIODOS.some((x) => x.id === sp.periodo) ? (sp.periodo as Periodo) : "ativos";
  const pagina = Math.max(1, Number(sp.p) || 1);
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Fortaleza" });
  const liberado = await valoresLiberados();
  const supabase = await createClient();

  // Ativo = o evento ainda vai acontecer (ou é hoje); concluído = já passou.
  let qe = supabase.from("eventos").select("id, nome, data_evento").order("data_evento", { ascending: periodo === "ativos" }).limit(80);
  if (periodo === "ativos") qe = qe.gte("data_evento", hoje);
  if (periodo === "concluidos") qe = qe.lt("data_evento", hoje);
  const { data: eventos } = await qe;
  const idsPeriodo = (eventos ?? []).map((e) => e.id as string);
  let q = supabase
    .from("inscricoes")
    .select("id, created_at, responsavel_nome, telefone, valor_total, status_pagamento, metodo_pagamento, parcelas, asaas_status, confirmacao_enviada_em, evento:eventos(id, nome), aluno:alunos(nome_completo, serie, turma)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
  if (eventoId) q = q.eq("evento_id", eventoId);
  else if (periodo !== "todos") q = q.in("evento_id", idsPeriodo.length ? idsPeriodo : [NENHUM]);
  if (filtro === "pagas") q = q.eq("status_pagamento", "pago");
  if (filtro === "pendentes") q = q.eq("status_pagamento", "pendente");
  if (filtro === "canceladas") q = q.in("status_pagamento", ["cancelado", "estornado"]);
  const { data: lista, error, count } = await q;
  const total = count ?? 0;
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  // Total pago do recorte todo (não só da página), para o resumo do topo.
  let qp = supabase.from("inscricoes").select("valor_total").eq("status_pagamento", "pago").limit(5000);
  if (eventoId) qp = qp.eq("evento_id", eventoId);
  else if (periodo !== "todos") qp = qp.in("evento_id", idsPeriodo.length ? idsPeriodo : [NENHUM]);
  const { data: pagasTodas } = await qp;
  const nPagas = (pagasTodas ?? []).length;
  const totalPago = (pagasTodas ?? []).reduce((s, i) => s + Number(i.valor_total ?? 0), 0);
  const link = (o: { f?: Filtro; ev?: string | null; periodo?: Periodo; p?: number }) => {
    const f = o.f ?? filtro;
    const ev = o.ev === undefined ? eventoId : o.ev;
    const per = o.periodo ?? periodo;
    const p = o.p ?? 1;
    return `/admin/cobrancas/eventos?${new URLSearchParams({ ...(f !== "todas" ? { f } : {}), ...(ev ? { evento: ev } : {}), ...(per !== "ativos" ? { periodo: per } : {}), ...(p > 1 ? { p: String(p) } : {}) })}`;
  };

  return (
    <div className="container mx-auto px-4 py-10">
      <AbasCobrancas atual="eventos" />
      <AlertasReembolso liberado={liberado} />
      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">Cobranças de eventos</h1>
          <p className="mt-1 text-muted-foreground">
            {total} inscrição(ões) · {nPagas} paga(s) · <ValorSensivel valor={liberado ? formatCurrency(totalPago) : null} /> pago
          </p>
        </div>
        <BotaoMostrarValores />
      </header>
      <AvisoLimpeza />

      <div className="mt-5 flex flex-wrap gap-1.5">
        {PERIODOS.map((x) => (
          <Link key={x.id} href={link({ periodo: x.id, ev: null })} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${periodo === x.id && !eventoId ? "bg-slate-800 text-white" : "border border-border bg-white text-slate-700 hover:bg-muted"}`}>
            {x.rotulo}
          </Link>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {FILTROS.map((x) => (
          <Link key={x.id} href={link({ f: x.id })} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${filtro === x.id ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}>
            {x.rotulo}
          </Link>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-border sm:inline-block" />
        <div className="flex flex-wrap gap-1.5">
          <Link href={link({ ev: null })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${!eventoId ? "bg-slate-700 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`}>{periodo === "ativos" ? "Todos os ativos" : periodo === "concluidos" ? "Todos os concluídos" : "Todos os eventos"}</Link>
          {(eventos ?? []).slice(0, 15).map((e) => (
            <Link key={e.id} href={link({ ev: e.id })} className={`max-w-[220px] truncate rounded-lg px-2.5 py-1 text-xs font-semibold ${eventoId === e.id ? "bg-slate-700 text-white" : "border border-border text-muted-foreground hover:bg-muted"}`} title={e.nome}>
              {e.nome}
            </Link>
          ))}
        </div>
      </div>

      {error ? (
        <p className="mt-6 text-sm text-red-700">Erro ao carregar: {error.message}</p>
      ) : (
        <div className="mt-4 max-h-[70vh] overflow-auto rounded-2xl border border-border/60 bg-white">
          <table className="w-full min-w-[860px] text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border/60 bg-white text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Evento</th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Responsável</th>
                <th className="px-4 py-3 text-right">Valor</th>
                <th className="px-4 py-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {(lista ?? []).map((i) => {
                const ev = i.evento as unknown as { id: string; nome: string } | null;
                const al = i.aluno as unknown as { nome_completo: string; serie: string; turma: string } | null;
                const s = situacao(i.status_pagamento as string, (i.asaas_status as string | null) ?? null);
                return (
                  <tr key={i.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">
                      {new Date(i.created_at as string).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-2.5">
                      {ev ? <Link href={`/admin/eventos/${ev.id}`} className="font-semibold text-amadeus-blue hover:underline" title={ev.nome}>{ev.nome}</Link> : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      {al ? (
                        <>
                          <div className="font-semibold">{al.nome_completo}</div>
                          <div className="text-xs text-muted-foreground">{al.serie} {al.turma}</div>
                        </>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <div>{i.responsavel_nome}</div>
                      <div className="text-xs text-muted-foreground">{i.telefone}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums">
                      <ValorSensivel valor={liberado ? formatCurrency(Number(i.valor_total ?? 0)) : null} />
                      <div className="text-xs font-normal text-muted-foreground">
                        {FORMA[i.metodo_pagamento as string] ?? i.metodo_pagamento}
                        {i.metodo_pagamento === "cartao" && (i.parcelas ?? 1) > 1 ? ` ${i.parcelas}x` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>{s.rotulo}</span>
                      {i.status_pagamento === "pago" && i.confirmacao_enviada_em && <div className="mt-1 text-xs text-green-700">✓ Confirmação enviada</div>}
                    </td>
                  </tr>
                );
              })}
              {(lista ?? []).length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nenhuma inscrição aqui.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {total > POR_PAGINA && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">
            {(pagina - 1) * POR_PAGINA + 1}–{Math.min(pagina * POR_PAGINA, total)} de {total}
          </span>
          <span className="flex gap-2">
            {pagina > 1 && <Link href={link({ p: pagina - 1 })} className="rounded-lg border border-border bg-white px-3 py-1.5 font-semibold text-amadeus-blue hover:bg-amadeus-blue-50">← 30 anteriores</Link>}
            {pagina < paginas && <Link href={link({ p: pagina + 1 })} className="rounded-lg bg-amadeus-blue px-3 py-1.5 font-semibold text-white hover:opacity-90">Próximas 30 →</Link>}
          </span>
        </div>
      )}
    </div>
  );
}
