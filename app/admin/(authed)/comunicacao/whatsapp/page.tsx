import Link from "next/link";
import { ArrowLeft, Clock, MessageCircleWarning, MessagesSquare, ShieldCheck } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { BotoesConversa } from "./botoes";

/**
 * Painel do monitoramento do WhatsApp da escola: quem está esperando
 * resposta, por importância, e os assuntos da semana. SÓ LEITURA — a
 * equipe responde pelo próprio WhatsApp. Dados vêm de lib/whatsapp-monitor.
 */
export const metadata = { title: "WhatsApp · Admin Amadeus" };
export const dynamic = "force-dynamic";

type Conversa = {
  chat_id: string;
  contato: string | null;
  telefone: string | null;
  ultima_msg_em: string | null;
  aguardando_desde: string | null;
  msgs_sem_resposta: number;
  assunto: string | null;
  importancia: "alta" | "media" | "baixa" | null;
  precisa_acao: boolean;
  acao: string | null;
  resumo: string | null;
  status: string;
};

const ORDEM = { alta: 0, media: 1, baixa: 2 } as const;
const SELO = {
  alta: "bg-red-50 text-red-700",
  media: "bg-amber-100 text-amber-800",
  baixa: "bg-muted text-muted-foreground",
} as const;
const ROTULO = { alta: "Importante", media: "Normal", baixa: "Baixa" } as const;

function tempo(iso: string | null) {
  if (!iso) return "—";
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} dia${d > 1 ? "s" : ""}`;
}
const telLegivel = (t: string | null) => {
  if (!t) return "";
  const d = t.replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t;
};

function Linha({ c }: { c: Conversa }) {
  const imp = c.importancia ?? "media";
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${SELO[imp]}`}>{ROTULO[imp]}</span>
          {c.assunto && <span className="rounded-md bg-amadeus-blue-50 px-2 py-0.5 text-xs font-semibold text-amadeus-blue">{c.assunto}</span>}
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" /> {tempo(c.aguardando_desde ?? c.ultima_msg_em)}</span>
          {c.msgs_sem_resposta > 1 && <span className="text-xs text-muted-foreground">· {c.msgs_sem_resposta} mensagens</span>}
        </div>
        <p className="mt-1.5 font-semibold">
          {c.contato || "Sem nome"} <span className="font-normal text-muted-foreground">· {telLegivel(c.telefone)}</span>
        </p>
        {c.resumo && <p className="mt-0.5 text-sm">{c.resumo}</p>}
        {c.precisa_acao && c.acao && <p className="mt-0.5 text-sm font-semibold text-amadeus-blue">→ {c.acao}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        {c.telefone && (
          <a href={`https://wa.me/${c.telefone}`} target="_blank" rel="noreferrer" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">
            Abrir conversa
          </a>
        )}
        <BotoesConversa chatId={c.chat_id} status={c.status} />
      </div>
    </li>
  );
}

export default async function WhatsAppPage({ searchParams }: { searchParams: Promise<{ ver?: string }> }) {
  const { ver } = await searchParams;
  const db = createAdminClient();
  const semana = new Date(Date.now() - 7 * 864e5).toISOString();
  const [{ data: aguardando }, { data: fechadas }, { data: eventos }] = await Promise.all([
    db.from("whatsapp_conversas").select("*").eq("status", "aguardando").eq("ultima_da_escola", false),
    db.from("whatsapp_conversas").select("*").in("status", ["resolvida", "ignorada", "respondida"]).gte("atualizado_em", semana).order("atualizado_em", { ascending: false }).limit(30),
    db.from("whatsapp_eventos").select("assunto, importancia").eq("da_escola", false).gte("em", semana),
  ]);
  const lista = ((aguardando ?? []) as Conversa[]).sort(
    (a, b) => ORDEM[a.importancia ?? "media"] - ORDEM[b.importancia ?? "media"] || Date.parse(a.aguardando_desde ?? "") - Date.parse(b.aguardando_desde ?? ""),
  );
  const importantes = lista.filter((c) => c.importancia === "alta");
  const mostradas = ver === "todas" ? lista : lista.filter((c) => c.importancia !== "baixa");
  const assuntos = new Map<string, number>();
  for (const e of eventos ?? []) if (e.assunto) assuntos.set(e.assunto, (assuntos.get(e.assunto) ?? 0) + 1);

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/comunicacao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Comunicação
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">WhatsApp da escola</h1>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
        <ShieldCheck className="size-4" /> Só leitura: o sistema organiza as mensagens, quem responde é a equipe.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-700"><MessageCircleWarning className="size-4" /> Importantes sem resposta</p>
          <p className="mt-2 text-3xl font-extrabold text-red-700">{importantes.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground"><MessagesSquare className="size-4" /> Aguardando resposta</p>
          <p className="mt-2 text-3xl font-extrabold text-amadeus-blue">{lista.length}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Assuntos da semana</p>
          <p className="mt-2 text-sm">
            {[...assuntos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, n]) => `${a} (${n})`).join(" · ") || "—"}
          </p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Esperando resposta da escola</h2>
        <Link href={ver === "todas" ? "?" : "?ver=todas"} className="text-sm font-semibold text-amadeus-blue">
          {ver === "todas" ? "Esconder as de baixa importância" : `Mostrar também as de baixa importância (${lista.length - mostradas.length})`}
        </Link>
      </div>
      {mostradas.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma conversa esperando resposta.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-white">
          {mostradas.map((c) => <Linha key={c.chat_id} c={c} />)}
        </ul>
      )}

      {(fechadas ?? []).length > 0 && (
        <>
          <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Respondidas ou resolvidas (7 dias)</h2>
          <ul className="mt-3 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-white opacity-80">
            {((fechadas ?? []) as Conversa[]).map((c) => (
              <li key={c.chat_id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <b>{c.contato || telLegivel(c.telefone)}</b>{c.resumo ? ` · ${c.resumo}` : ""}
                </span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="text-xs text-muted-foreground">{c.status === "respondida" ? "respondida" : c.status}</span>
                  <BotoesConversa chatId={c.chat_id} status={c.status} />
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
