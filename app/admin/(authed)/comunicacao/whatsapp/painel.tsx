"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, EyeOff, Loader2, Paperclip, RefreshCw, RotateCcw, Send, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { enviarResposta, marcarConversa, prepararAnexo } from "./actions";

export type Conversa = {
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
  ultimo_texto: string | null;
  status: string;
};

const PONTO = { alta: "bg-red-500", media: "bg-amber-400", baixa: "bg-slate-300" } as const;
const ROTULO = { alta: "Importante", media: "Normal", baixa: "Baixa" } as const;
const ORDEM = { alta: 0, media: 1, baixa: 2 } as const;
const PRONTAS = [
  "Olá! Recebemos sua mensagem e já vamos verificar.",
  "Olá! Segue em anexo.",
  "Obrigado pelo contato! Qualquer dúvida, estamos à disposição.",
];
const REFRESH_S = 60;

function tempo(iso: string | null, agora: number) {
  if (!iso) return "—";
  const min = Math.max(0, Math.round((agora - Date.parse(iso)) / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  return `${Math.round(h / 24)} d`;
}
/** "sábado, 27/09 · 14:32" — o dia da semana ajuda a ver o que chegou com a escola fechada. */
function quando(iso: string | null, curto = false) {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = { timeZone: "America/Fortaleza" } as const;
  const dia = d.toLocaleDateString("pt-BR", { ...tz, weekday: curto ? "short" : "long" }).replace(".", "");
  const data = d.toLocaleDateString("pt-BR", { ...tz, day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("pt-BR", { ...tz, hour: "2-digit", minute: "2-digit" });
  return curto ? `${dia} ${data} ${hora}` : `${dia}, ${data} · ${hora}`;
}

/** Sábado, domingo ou fora do horário (antes das 7h, depois das 18h). */
function foraDoHorario(iso: string | null) {
  if (!iso) return false;
  const d = new Date(iso);
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "America/Fortaleza", weekday: "short", hour: "numeric", hour12: false }).formatToParts(d);
  const dia = p.find((x) => x.type === "weekday")?.value;
  const h = Number(p.find((x) => x.type === "hour")?.value) % 24;
  return dia === "Sat" || dia === "Sun" || h < 7 || h >= 18;
}

const telLegivel = (t: string | null) => {
  const d = (t ?? "").replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t ?? "";
};

function Responder({ c, fechar, modo, responder }: { c: Conversa; fechar: () => void; modo: "ver" | "responder"; responder: () => void }) {
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async () => {
    if (!texto.trim() && !arquivo) return;
    if (arquivo && arquivo.size > 16 * 1024 * 1024) return setErro("Arquivo acima de 16 MB.");
    if (!window.confirm(`Enviar para ${c.contato || telLegivel(c.telefone)} pelo WhatsApp da escola?`)) return;
    setEnviando(true);
    setErro(null);
    try {
      let anexo: { path: string; nome: string; tipo: string } | null = null;
      if (arquivo) {
        const p = await prepararAnexo(arquivo.name);
        if (!p.ok) throw new Error(p.erro);
        const { error } = await createClient().storage.from("whatsapp-anexos").uploadToSignedUrl(p.path, p.token, arquivo, {
          contentType: arquivo.type || "application/octet-stream",
        });
        if (error) throw new Error(error.message);
        anexo = { path: p.path, nome: arquivo.name, tipo: arquivo.type };
      }
      const r = await enviarResposta({ chatId: c.chat_id, texto, anexo });
      if (!r.ok) throw new Error(r.erro);
      fechar();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const iniciais = (c.contato || "?").split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const baloes = (c.ultimo_texto ?? "").split("\n").map((t) => t.trim()).filter(Boolean);
  const hora = quando(c.ultima_msg_em);

  return (
    <div className="border-t border-border/60 p-3 sm:p-4">
      {/* Janela no estilo do WhatsApp: a conversa como o pai mandou, e a resposta embaixo. */}
      <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/60 shadow-sm">
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white">
          <span className="grid size-9 place-items-center rounded-full bg-white/20 text-sm font-bold">{iniciais}</span>
          <span className="min-w-0">
            <span className="block truncate font-semibold">{c.contato || telLegivel(c.telefone)}</span>
            <span className="block text-xs opacity-80">{telLegivel(c.telefone)}{c.assunto ? ` · ${c.assunto}` : ""}</span>
          </span>
          <button type="button" onClick={fechar} className="ml-auto rounded-full p-1.5 hover:bg-white/15" aria-label="Fechar"><X className="size-4" /></button>
        </div>

        <div className="max-h-72 space-y-1.5 overflow-y-auto bg-[#EFEAE2] px-4 py-4">
          {baloes.length ? (
            baloes.map((b, i) => (
              <div key={i} className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-1.5 text-[13.5px] text-slate-800 shadow-sm">
                {b}
                {i === baloes.length - 1 && <span className="ml-3 float-right mt-1.5 text-[10px] text-slate-400">{hora}</span>}
              </div>
            ))
          ) : (
            <p className="text-center text-xs text-slate-500">A mensagem não está mais guardada. Resumo: {c.resumo}</p>
          )}
          {c.precisa_acao && c.acao && (
            <p className="pt-2 text-center"><span className="rounded-md bg-[#FFF5C4] px-2 py-1 text-[11px] text-slate-700">Sugestão: {c.acao}</span></p>
          )}
        </div>

        {modo === "ver" && (
          <div className="flex justify-end bg-[#F0F2F5] px-3 py-2.5">
            <button type="button" onClick={responder} className="inline-flex items-center gap-1.5 rounded-full bg-[#00A884] px-4 py-2 text-xs font-bold text-white hover:bg-[#008F72]">
              <Send className="size-3.5" /> Responder
            </button>
          </div>
        )}
        {modo === "responder" && <div className="space-y-2 bg-[#F0F2F5] px-3 py-2.5">
          <div className="flex flex-wrap gap-1.5">
            {PRONTAS.map((p) => (
              <button key={p} type="button" onClick={() => setTexto(p)} className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-600 ring-1 ring-slate-200 hover:text-[#075E54]">
                {p}
              </button>
            ))}
          </div>
          {arquivo && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs text-slate-600 ring-1 ring-slate-200">
              <Paperclip className="size-3.5" /> {arquivo.name}
              <button type="button" onClick={() => setArquivo(null)} aria-label="Tirar arquivo"><X className="size-3.5" /></button>
            </span>
          )}
          <div className="flex items-end gap-2">
            <label className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-slate-500 hover:bg-white" title="Anexar arquivo">
              <Paperclip className="size-5" />
              <input type="file" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={1}
              placeholder="Digite a resposta"
              className="max-h-32 min-h-10 flex-1 resize-y rounded-2xl border-0 bg-white px-4 py-2.5 text-sm outline-none ring-1 ring-slate-200 focus:ring-[#25D366]"
            />
            <button
              type="button"
              disabled={enviando || (!texto.trim() && !arquivo)}
              onClick={enviar}
              title="Enviar pelo WhatsApp da escola"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#00A884] text-white hover:bg-[#008F72] disabled:opacity-40"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          {erro && <p className="text-xs text-red-700">{erro}</p>}
        </div>}
      </div>
    </div>
  );
}

type Modo = "ver" | "responder";

function Linha({ c, agora, aberta, abrir }: { c: Conversa; agora: number; aberta: Modo | null; abrir: (m: Modo | null) => void }) {
  const [pendente, iniciar] = useTransition();
  const imp = c.importancia ?? "media";
  const marcar = (s: "resolvida" | "ignorada" | "aguardando") => iniciar(async () => { await marcarConversa(c.chat_id, s); });
  const esperando = c.status === "aguardando";
  return (
    <li className={aberta ? "bg-amadeus-blue-50/30" : ""}>
      <div className="flex items-center gap-3 px-4 py-2 text-sm">
        <span className={`size-2.5 shrink-0 rounded-full ${PONTO[imp]}`} title={ROTULO[imp]} />
        <button type="button" onClick={() => abrir(aberta ? null : "ver")} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="w-40 shrink-0 truncate font-semibold" title={telLegivel(c.telefone)}>{c.contato || telLegivel(c.telefone)}</span>
          <span className="hidden w-32 shrink-0 truncate text-xs text-amadeus-blue sm:inline">{c.assunto}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.resumo}</span>
          {(() => {
            const iso = esperando ? c.aguardando_desde ?? c.ultima_msg_em : c.ultima_msg_em;
            const fechado = foraDoHorario(iso);
            return (
              <span
                className={`hidden w-44 shrink-0 text-right text-xs tabular-nums sm:inline ${fechado ? "text-amber-700" : "text-muted-foreground"}`}
                title={fechado ? "Chegou com a escola fechada (fim de semana ou fora do horário)" : undefined}
              >
                {fechado && "● "}{quando(iso, true)} · {tempo(iso, agora)}
              </span>
            );
          })()}
          <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground sm:hidden">
            {tempo(esperando ? c.aguardando_desde ?? c.ultima_msg_em : c.ultima_msg_em, agora)}
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberta ? "rotate-180" : ""}`} />
        </button>
        <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
          <button type="button" onClick={() => abrir(aberta === "ver" ? null : "ver")} className={`rounded-md px-2 py-1 ${aberta === "ver" ? "bg-amadeus-blue text-white" : "text-amadeus-blue hover:bg-amadeus-blue-50"}`}>
            Ver mensagem
          </button>
          <button type="button" onClick={() => abrir(aberta === "responder" ? null : "responder")} className={`rounded-md px-2 py-1 ${aberta === "responder" ? "bg-[#00A884] text-white" : "text-[#008F72] hover:bg-emerald-50"}`}>
            Responder
          </button>
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {pendente ? (
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          ) : esperando ? (
            <>
              <button type="button" onClick={() => marcar("resolvida")} title="Resolvido (não envia nada)" className="rounded-md p-1.5 text-emerald-700 hover:bg-emerald-50"><Check className="size-4" /></button>
              <button type="button" onClick={() => marcar("ignorada")} title="Ignorar (não envia nada)" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><EyeOff className="size-4" /></button>
            </>
          ) : (
            <button type="button" onClick={() => marcar("aguardando")} title="Reabrir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCcw className="size-4" /></button>
          )}
        </span>
      </div>
      {aberta && <Responder c={c} modo={aberta} fechar={() => abrir(null)} responder={() => abrir("responder")} />}
    </li>
  );
}

export function PainelWhatsApp({ aguardando, fechadas, assuntos, geradoEm }: {
  aguardando: Conversa[];
  fechadas: Conversa[];
  assuntos: [string, number][];
  geradoEm: number;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"importantes" | "todas" | "fechadas">("importantes");
  const [aberta, setAberta] = useState<{ id: string; modo: Modo } | null>(null);
  const [atualizando, iniciar] = useTransition();

  // Atualiza sozinho a cada minuto (a leitura do WhatsApp roda a cada 5), sem perder o que está sendo escrito.
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) iniciar(() => router.refresh()); }, REFRESH_S * 1000);
    return () => clearInterval(t);
  }, [router]);

  const ordenadas = [...aguardando].sort(
    (a, b) => ORDEM[a.importancia ?? "media"] - ORDEM[b.importancia ?? "media"] || Date.parse(a.aguardando_desde ?? "") - Date.parse(b.aguardando_desde ?? ""),
  );
  const importantes = ordenadas.filter((c) => c.importancia !== "baixa");
  const lista = aba === "importantes" ? importantes : aba === "todas" ? ordenadas : fechadas;
  const nAlta = aguardando.filter((c) => c.importancia === "alta").length;
  const hora = new Date(geradoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });

  const abas = [
    { id: "importantes", rotulo: "Precisam de resposta", n: importantes.length },
    { id: "todas", rotulo: "Todas aguardando", n: ordenadas.length },
    { id: "fechadas", rotulo: "Respondidas / resolvidas", n: fechadas.length },
  ] as const;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span><b className="text-red-700">{nAlta}</b> importante{nAlta === 1 ? "" : "s"}</span>
        <span><b className="text-amadeus-blue">{ordenadas.length}</b> aguardando</span>
        {assuntos.length > 0 && (
          <span className="text-muted-foreground">Semana: {assuntos.slice(0, 5).map(([a, n]) => `${a} ${n}`).join(" · ")}</span>
        )}
        <button type="button" onClick={() => iniciar(() => router.refresh())} className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">
          <RefreshCw className={`size-3.5 ${atualizando ? "animate-spin" : ""}`} /> Atualizado às {hora}
        </button>
      </div>

      <div className="mt-4 flex gap-1 border-b border-border/60">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold ${aba === a.id ? "border-amadeus-blue text-amadeus-blue" : "border-transparent text-muted-foreground hover:text-amadeus-blue"}`}
          >
            {a.rotulo} <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">{a.n}</span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Nada por aqui.</p>
      ) : (
        <ul className="divide-y divide-border/60 rounded-b-xl border border-t-0 border-border/60 bg-white">
          {lista.map((c) => (
            <Linha key={c.chat_id} c={c} agora={geradoEm} aberta={aberta?.id === c.chat_id ? aberta.modo : null} abrir={(m) => setAberta(m ? { id: c.chat_id, modo: m } : null)} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        “Ver mensagem” mostra o que a pessoa mandou; “Responder” abre a conversa para escrever. ✓ e ⊘ só organizam a lista: não enviam nada. <span className="text-amber-700">●</span> = chegou com a escola fechada (fim de semana ou fora do horário).
      </p>
    </div>
  );
}
