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
const telLegivel = (t: string | null) => {
  const d = (t ?? "").replace(/^55/, "");
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, -4)}-${d.slice(-4)}` : t ?? "";
};

function Responder({ c, fechar }: { c: Conversa; fechar: () => void }) {
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

  return (
    <div className="space-y-3 border-t border-border/60 bg-muted/20 px-4 py-3 text-sm">
      {c.ultimo_texto && (
        <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border/60 bg-white p-2.5 text-[13px]">
          {c.ultimo_texto}
        </div>
      )}
      {c.precisa_acao && c.acao && <p className="font-semibold text-amadeus-blue">→ {c.acao}</p>}
      <div className="flex flex-wrap gap-1.5">
        {PRONTAS.map((p) => (
          <button key={p} type="button" onClick={() => setTexto(p)} className="rounded-md bg-white px-2 py-1 text-xs text-muted-foreground ring-1 ring-border hover:text-amadeus-blue">
            {p}
          </button>
        ))}
      </div>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={3}
        placeholder="Escreva a resposta…"
        className="w-full rounded-lg border border-border bg-white px-3 py-2 outline-none focus:border-amadeus-blue"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold ring-1 ring-border hover:text-amadeus-blue">
          <Paperclip className="size-3.5" /> {arquivo ? "Trocar arquivo" : "Anexar arquivo"}
          <input type="file" className="hidden" onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} />
        </label>
        {arquivo && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            {arquivo.name}
            <button type="button" onClick={() => setArquivo(null)} aria-label="Tirar arquivo"><X className="size-3.5" /></button>
          </span>
        )}
        <span className="ml-auto flex items-center gap-2">
          {c.telefone && (
            <a href={`https://wa.me/${c.telefone}`} target="_blank" rel="noreferrer" className="text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">
              Abrir no WhatsApp
            </a>
          )}
          <button
            type="button"
            disabled={enviando || (!texto.trim() && !arquivo)}
            onClick={enviar}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            {enviando ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />} Enviar
          </button>
        </span>
      </div>
      {erro && <p className="text-xs text-red-700">{erro}</p>}
    </div>
  );
}

function Linha({ c, agora, aberta, alternar }: { c: Conversa; agora: number; aberta: boolean; alternar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const imp = c.importancia ?? "media";
  const marcar = (s: "resolvida" | "ignorada" | "aguardando") => iniciar(async () => { await marcarConversa(c.chat_id, s); });
  const esperando = c.status === "aguardando";
  return (
    <li className={aberta ? "bg-amadeus-blue-50/30" : ""}>
      <div className="flex items-center gap-3 px-4 py-2 text-sm">
        <span className={`size-2.5 shrink-0 rounded-full ${PONTO[imp]}`} title={ROTULO[imp]} />
        <button type="button" onClick={alternar} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="w-40 shrink-0 truncate font-semibold" title={telLegivel(c.telefone)}>{c.contato || telLegivel(c.telefone)}</span>
          <span className="hidden w-32 shrink-0 truncate text-xs text-amadeus-blue sm:inline">{c.assunto}</span>
          <span className="min-w-0 flex-1 truncate text-muted-foreground">{c.resumo}</span>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {tempo(esperando ? c.aguardando_desde ?? c.ultima_msg_em : c.ultima_msg_em, agora)}
          </span>
          <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${aberta ? "rotate-180" : ""}`} />
        </button>
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
      {aberta && <Responder c={c} fechar={alternar} />}
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
  const [aberta, setAberta] = useState<string | null>(null);
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
            <Linha key={c.chat_id} c={c} agora={geradoEm} aberta={aberta === c.chat_id} alternar={() => setAberta(aberta === c.chat_id ? null : c.chat_id)} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Clique na linha para ver a mensagem e responder. ✓ e ⊘ só organizam a lista: não enviam nada.
      </p>
    </div>
  );
}
