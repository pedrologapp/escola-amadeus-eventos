import Link from "next/link";
import { ArrowLeft, Cake, CalendarClock, CheckCircle2, TriangleAlert } from "lucide-react";
import { carregarPainel, type Aniversariante, type StatusEnvio } from "@/lib/aniversarios";

/**
 * Aniversariantes de hoje e dos próximos 30 dias, e a situação do cartão de
 * cada um no WhatsApp. Quem envia é o fluxo do n8n "Aniversários · Alunos e
 * Colaboradores", todo dia às 7h; esta página só mostra.
 */
export const metadata = { title: "Aniversários · Admin Amadeus" };
export const dynamic = "force-dynamic";

type Filtro = "todos" | "aluno" | "colaborador";

const FORMATO_DIA = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" });
const diaLegivel = (iso: string) => FORMATO_DIA.format(new Date(iso + "T12:00:00Z"));
const telLegivel = (t: string) => `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}`;
const diasAte = (de: string, ate: string) => Math.round((Date.parse(ate + "T12:00:00Z") - Date.parse(de + "T12:00:00Z")) / 864e5);

const SELO: Record<StatusEnvio, { texto: string; classe: string }> = {
  enviado: { texto: "Enviado", classe: "bg-emerald-50 text-emerald-700" },
  sem_whatsapp: { texto: "Sem WhatsApp", classe: "bg-amber-100 text-amber-800" },
  erro: { texto: "Erro no envio", classe: "bg-red-50 text-red-700" },
  aguardando: { texto: "Aguardando 7h", classe: "bg-amadeus-blue-50 text-amadeus-blue" },
  nao_enviado: { texto: "Não enviado", classe: "bg-red-50 text-red-700" },
};

function Indicador({ icone: Icone, rotulo, valor, detalhe, alerta = false }: {
  icone: typeof Cake; rotulo: string; valor: number | string; detalhe?: string; alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-white p-5">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${alerta ? "text-amber-700" : "text-muted-foreground"}`}>
        <Icone className="size-4" /> {rotulo}
      </div>
      <p className={`mt-2 text-3xl font-extrabold ${alerta ? "text-amber-700" : "text-amadeus-blue"}`}>{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>}
    </div>
  );
}

function SeloTipo({ tipo }: { tipo: Aniversariante["tipo"] }) {
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide ${
      tipo === "aluno" ? "bg-amadeus-blue-50 text-amadeus-blue" : "bg-amadeus-yellow/30 text-amber-900"
    }`}>
      {tipo === "aluno" ? "Aluno" : "Colaborador"}
    </span>
  );
}

export default async function AniversariosPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const filtro: Filtro = tipo === "aluno" || tipo === "colaborador" ? tipo : "todos";
  const painel = await carregarPainel(30);
  const lista = painel.lista.filter((a) => filtro === "todos" || a.tipo === filtro);
  const deHoje = lista.filter((a) => a.data === painel.hoje);
  const proximos = lista.filter((a) => a.data !== painel.hoje);
  const semana = proximos.filter((a) => diasAte(painel.hoje, a.data) <= 7).length;
  const contatosHoje = deHoje.flatMap((a) => a.contatos);
  const enviados = contatosHoje.filter((c) => c.status === "enviado").length;
  const problemas = contatosHoje.filter((c) => c.status === "sem_whatsapp" || c.status === "erro" || c.status === "nao_enviado").length;

  const porDia = new Map<string, Aniversariante[]>();
  for (const a of proximos) porDia.set(a.data, [...(porDia.get(a.data) ?? []), a]);

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Comunicação
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">Aniversários</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O cartão sai sozinho pelo WhatsApp todo dia às 7h: para todos os responsáveis do aluno e no privado do colaborador.
      </p>

      {painel.erro && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {painel.erro}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {(["todos", "aluno", "colaborador"] as const).map((f) => (
          <Link
            key={f}
            href={f === "todos" ? "?" : `?tipo=${f}`}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
              filtro === f ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"
            }`}
          >
            {f === "todos" ? "Todos" : f === "aluno" ? "Alunos" : "Colaboradores"}
          </Link>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador icone={Cake} rotulo="Hoje" valor={deHoje.length} detalhe={diaLegivel(painel.hoje)} />
        <Indicador icone={CalendarClock} rotulo="Próximos 7 dias" valor={semana} />
        <Indicador icone={CheckCircle2} rotulo="Enviados hoje" valor={`${enviados}/${contatosHoje.length}`} detalhe="mensagens entregues ao WhatsApp" />
        <Indicador icone={TriangleAlert} rotulo="Sem envio" valor={problemas} detalhe="sem WhatsApp, erro ou não enviado" alerta={problemas > 0} />
      </div>

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Hoje</h2>
      {deHoje.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Ninguém faz aniversário hoje.
        </p>
      ) : (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {deHoje.map((a) => (
            <div key={a.ref} className="rounded-2xl border border-border/60 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <SeloTipo tipo={a.tipo} />
                {a.turma && <span className="text-xs text-muted-foreground">{a.turma}</span>}
              </div>
              <p className="mt-2 text-lg font-extrabold text-amadeus-blue">{a.nome}</p>
              <p className="text-sm text-muted-foreground">Faz {a.idade} {a.idade === 1 ? "ano" : "anos"}</p>
              <ul className="mt-4 divide-y divide-border/60 border-t border-border/60">
                {a.contatos.length === 0 && (
                  <li className="py-2.5 text-sm text-amber-800">Sem celular cadastrado no Activesoft.</li>
                )}
                {a.contatos.map((c) => (
                  <li key={c.telefone} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{c.nome}</span>
                      <span className="text-muted-foreground">{telLegivel(c.telefone)}</span>
                    </span>
                    <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold ${SELO[c.status].classe}`}>
                      {SELO[c.status].texto}{c.quando ? ` · ${c.quando}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Próximos 30 dias</h2>
      {porDia.size === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum aniversário nos próximos 30 dias.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-white">
          {[...porDia.entries()].map(([data, pessoas]) => (
            <div key={data} className="border-b border-border/60 last:border-b-0">
              <div className="flex items-baseline justify-between bg-muted/40 px-4 py-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <span>{diaLegivel(data)}</span>
                <span>{diasAte(painel.hoje, data) === 1 ? "amanhã" : `em ${diasAte(painel.hoje, data)} dias`}</span>
              </div>
              <ul className="divide-y divide-border/60">
                {pessoas.map((a) => (
                  <li key={a.ref} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
                    <SeloTipo tipo={a.tipo} />
                    <span className="font-semibold">{a.nome}</span>
                    {a.turma && <span className="text-muted-foreground">{a.turma}</span>}
                    <span className="ml-auto text-muted-foreground">
                      faz {a.idade}
                      {a.semTelefone && <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">sem celular</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Envios dos últimos 7 dias</h2>
      {painel.recentes.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum envio registrado ainda.
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/60 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Data</th><th className="px-4 py-3">Para</th><th className="px-4 py-3">Telefone</th><th className="px-4 py-3">Situação</th></tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {painel.recentes.map((e, i) => {
                const s = SELO[(e.status as StatusEnvio)] ?? SELO.erro;
                return (
                  <tr key={i}>
                    <td className="px-4 py-3 whitespace-nowrap">{e.data.split("-").reverse().join("/")} · {e.quando}</td>
                    <td className="px-4 py-3">{e.nome} <span className="text-xs text-muted-foreground">({e.tipo})</span></td>
                    <td className="px-4 py-3 whitespace-nowrap">{telLegivel(e.telefone)}</td>
                    <td className="px-4 py-3"><span className={`rounded-md px-2 py-1 text-xs font-bold ${s.classe}`}>{s.texto}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
