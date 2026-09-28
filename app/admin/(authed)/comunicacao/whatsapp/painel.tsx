"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, EyeOff, Loader2, Paperclip, PenSquare, RefreshCw, RotateCcw, Search, Send, X } from "lucide-react";
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
  ultima_da_escola: boolean;
  status: string;
  urgente?: boolean;
  alertado_em?: string | null;
  respondido_por?: string | null;
  respondido_em?: string | null;
  vinculo?: string | null; // "Responsável de Maria (3º Ano)" — do Activesoft
  nome_cadastro?: string | null;
};

export type ContatoAgenda = { nome: string; telefone: string; vinculo: string };

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
/**
 * Sem resposta há muito tempo (direção, 28/09/2026): 5 horas ou mais, ou
 * chegou num dia e virou o dia sem resposta. Devolve o texto do selo.
 */
const DIA = (t: number) => new Date(t).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });
function atraso(c: { status: string; ultima_da_escola: boolean; aguardando_desde: string | null; ultima_msg_em: string | null }, agora: number) {
  if (c.status !== "aguardando" || c.ultima_da_escola) return null;
  const iso = c.aguardando_desde ?? c.ultima_msg_em;
  if (!iso) return null;
  const desde = Date.parse(iso);
  const h = Math.floor((agora - desde) / 3600000);
  if (h >= 24) return `sem resposta há ${Math.floor(h / 24)} dia${h >= 48 ? "s" : ""}`;
  if (h >= 5) return `sem resposta há ${h}h`;
  if (DIA(desde) !== DIA(agora)) return "sem resposta desde ontem";
  return null;
}

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

/** Cartão do perfil: nome, número (com copiar) e de quem é no cadastro. */
function Perfil({ c, fechar }: { c: Pick<Conversa, "contato" | "telefone" | "vinculo" | "nome_cadastro">; fechar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  const tel = telLegivel(c.telefone);
  return (
    <div className="absolute left-3 top-14 z-30 w-72 rounded-xl border border-border bg-white p-4 text-sm text-slate-800 shadow-xl">
      <button type="button" onClick={fechar} className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground hover:bg-muted" aria-label="Fechar"><X className="size-4" /></button>
      <p className="pr-6 text-base font-bold">{c.nome_cadastro || c.contato || "Sem nome"}</p>
      {c.nome_cadastro && c.contato && c.contato !== c.nome_cadastro && <p className="text-xs text-muted-foreground">No WhatsApp: {c.contato}</p>}
      <p className="mt-2 flex items-center gap-2 font-semibold tabular-nums">
        {tel}
        <button
          type="button"
          onClick={async () => { await navigator.clipboard.writeText(tel); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          title="Copiar número"
        >
          {copiado ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
        </button>
      </p>
      <p className="mt-2 text-xs text-muted-foreground">{c.vinculo || "Número não encontrado no cadastro do Activesoft."}</p>
    </div>
  );
}

function Responder({ c, fechar, modo, responder }: { c: Conversa; fechar: () => void; modo: "ver" | "responder"; responder: () => void }) {
  const [perfil, setPerfil] = useState(false);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmarEnvio, setConfirmarEnvio] = useState(false);

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
      const r = await enviarResposta(c.chat_id ? { chatId: c.chat_id, texto, anexo } : { telefone: c.telefone, nome: c.contato, texto, anexo });
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
      <div className="relative mx-auto max-w-2xl overflow-hidden rounded-2xl border border-border/60 shadow-sm">
        {perfil && <Perfil c={c} fechar={() => setPerfil(false)} />}
        <div className="flex items-center gap-3 bg-[#075E54] px-4 py-2.5 text-white">
          <button type="button" onClick={() => setPerfil(!perfil)} className="grid size-9 shrink-0 place-items-center rounded-full bg-white/20 text-sm font-bold hover:bg-white/30" title="Ver perfil">{iniciais}</button>
          <button type="button" onClick={() => setPerfil(!perfil)} className="min-w-0 text-left" title="Ver perfil">
            <span className="block truncate font-semibold">{c.contato || telLegivel(c.telefone)}</span>
            <span className="block truncate text-xs opacity-80">{c.vinculo || telLegivel(c.telefone)}{c.assunto ? ` · ${c.assunto}` : ""}</span>
          </button>
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
            c.chat_id ? <p className="text-center text-xs text-slate-500">A mensagem aparece na próxima leitura do WhatsApp (até 5 min). Resumo: {c.resumo}</p> : <p className="text-center text-xs text-slate-500">Nova conversa. Escreva a mensagem abaixo.</p>
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
        {c.ultima_da_escola && c.chat_id && (
          <p className="bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-900">
            Já respondida{c.respondido_por ? ` por ${c.respondido_por}` : ""}{c.respondido_em ? ` (${quando(c.respondido_em)})` : ""}. Confira antes de responder de novo.
          </p>
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
              onClick={() => setConfirmarEnvio(true)}
              title="Enviar pelo WhatsApp da escola"
              className="grid size-10 shrink-0 place-items-center rounded-full bg-[#00A884] text-white hover:bg-[#008F72] disabled:opacity-40"
            >
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
          {erro && <p className="text-xs text-red-700">{erro}</p>}
          {confirmarEnvio && (
            <Confirmar titulo="Enviar esta resposta?" botao="Sim, enviar" cor="verde" ok={() => { setConfirmarEnvio(false); enviar(); }} cancelar={() => setConfirmarEnvio(false)}>
              <p>Vai sair agora pelo WhatsApp da escola para <b className="text-foreground">{c.nome_cadastro || c.contato || telLegivel(c.telefone)}</b> ({telLegivel(c.telefone)}).</p>
              {texto.trim() && <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-[#D9FDD3] px-3 py-2 text-[13px] text-foreground">{texto.trim()}</p>}
              {arquivo && <p className="flex items-center gap-1.5 text-foreground"><Paperclip className="size-3.5" /> {arquivo.name}</p>}
              <p>Depois de enviada, a mensagem não pode ser desfeita por aqui.</p>
            </Confirmar>
          )}
        </div>}
      </div>
    </div>
  );
}

type Modo = "ver" | "responder";

/** Pop-up de confirmação: todo botão que envia ou muda a lista pergunta antes (direção, 28/09/2026). */
function Confirmar({ titulo, children, botao, cor = "azul", ok, cancelar }: {
  titulo: string;
  children: React.ReactNode;
  botao: string;
  cor?: "azul" | "verde" | "cinza";
  ok: () => void;
  cancelar: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && cancelar();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [cancelar]);
  const fundo = cor === "verde" ? "bg-[#00A884] hover:bg-[#008F72]" : cor === "cinza" ? "bg-slate-600 hover:bg-slate-700" : "bg-amadeus-blue hover:opacity-90";
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/40 p-4" onClick={cancelar}>
      <div role="dialog" aria-modal="true" className="w-full max-w-sm rounded-2xl bg-white p-5 text-left shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-amadeus-blue">{titulo}</p>
        <div className="mt-2 space-y-2 text-sm text-muted-foreground">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={cancelar} className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
          <button type="button" autoFocus onClick={ok} className={`rounded-lg px-4 py-2 text-sm font-bold text-white ${fundo}`}>{botao}</button>
        </div>
      </div>
    </div>
  );
}

function Linha({ c, agora, aberta, abrir }: { c: Conversa; agora: number; aberta: Modo | null; abrir: (m: Modo | null) => void }) {
  const [pendente, iniciar] = useTransition();
  const imp = c.importancia ?? "media";
  const [pergunta, setPergunta] = useState<"resolvida" | "ignorada" | "aguardando" | null>(null);
  const marcar = (s: "resolvida" | "ignorada" | "aguardando") => { setPergunta(null); iniciar(async () => { await marcarConversa(c.chat_id, s); }); };
  const nome = c.nome_cadastro || c.contato || telLegivel(c.telefone);
  const esperando = c.status === "aguardando";
  const iso = esperando ? c.aguardando_desde ?? c.ultima_msg_em : c.ultima_msg_em;
  const fechado = foraDoHorario(iso);
  const atrasada = atraso(c, agora);
  // No computador tudo numa linha; no celular quebra em nome/hora, resumo e botões (nada fica por cima).
  return (
    <li className={`${aberta ? "bg-amadeus-blue-50/30" : esperando && c.ultima_da_escola ? "bg-emerald-50/50" : ""} ${esperando && c.ultima_da_escola ? "border-l-4 border-l-emerald-500" : ""}`}>
      <div className="flex flex-col gap-1.5 px-4 py-2.5 text-sm lg:flex-row lg:items-center lg:gap-3 lg:py-2">
        <button type="button" onClick={() => abrir(aberta ? null : "ver")} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left lg:flex-row lg:items-center lg:gap-3">
          <span className="flex min-w-0 items-center gap-2 lg:w-56 lg:shrink-0">
            <span className={`size-2.5 shrink-0 rounded-full ${PONTO[imp]}`} title={ROTULO[imp]} />
            <span className="min-w-0 flex-1 truncate font-semibold" title={[telLegivel(c.telefone), c.vinculo].filter(Boolean).join(" · ")}>{c.nome_cadastro || c.contato || telLegivel(c.telefone)}</span>
            {atrasada && (
              <span className="shrink-0 rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" title={`Chegou ${quando(c.aguardando_desde ?? c.ultima_msg_em)}`}>{atrasada}</span>
            )}
            {c.urgente && (
              <span className="shrink-0 rounded-md bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" title={c.alertado_em ? "Avisado no grupo Amadeus - Direção" : undefined}>urgente</span>
            )}
            {c.status === "aguardando" && c.ultima_da_escola && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white" title={`Respondida${c.respondido_por ? ` por ${c.respondido_por}` : ""}${c.respondido_em ? ` · ${quando(c.respondido_em, true)}` : ""}`}>
                <Check className="size-3" /> respondida{c.respondido_em ? ` ${new Date(c.respondido_em).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" })}` : ""}
              </span>
            )}
            <span className={`shrink-0 text-xs tabular-nums lg:hidden ${fechado ? "text-amber-700" : "text-muted-foreground"}`}>
              {fechado && "● "}{quando(iso, true)}
            </span>
          </span>
          <span className="truncate pl-4.5 text-xs text-amadeus-blue lg:w-32 lg:shrink-0 lg:pl-0">{c.assunto}</span>
          <span className="line-clamp-2 pl-4.5 text-muted-foreground lg:line-clamp-1 lg:min-w-0 lg:flex-1 lg:pl-0">{c.resumo}</span>
          <span
            className={`hidden shrink-0 text-right text-xs tabular-nums lg:inline lg:w-44 ${fechado ? "text-amber-700" : "text-muted-foreground"}`}
            title={fechado ? "Chegou com a escola fechada (fim de semana ou fora do horário)" : undefined}
          >
            {fechado && "● "}{quando(iso, true)} · {tempo(iso, agora)}
          </span>
        </button>
        <span className="flex shrink-0 items-center gap-1 pl-4.5 text-xs font-semibold lg:pl-0">
          <button type="button" onClick={() => abrir(aberta === "ver" ? null : "ver")} className={`rounded-md px-2 py-1 ${aberta === "ver" ? "bg-amadeus-blue text-white" : "text-amadeus-blue hover:bg-amadeus-blue-50"}`}>
            Ver mensagem
          </button>
          <button type="button" onClick={() => abrir(aberta === "responder" ? null : "responder")} className={`rounded-md px-2 py-1 ${aberta === "responder" ? "bg-[#00A884] text-white" : "text-[#008F72] hover:bg-emerald-50"}`}>
            Responder
          </button>
          <span className="ml-auto flex items-center gap-1 lg:ml-1">
            {pendente ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : esperando ? (
              <>
                <button type="button" onClick={() => setPergunta("resolvida")} title="Tira da lista (não envia nada)" className="inline-flex items-center gap-1 whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"><Check className="size-3.5" /> Marcar como concluída</button>
                <button type="button" onClick={() => setPergunta("ignorada")} title="Ignorar: para mensagens que não precisam de resposta (não envia nada)" className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted"><EyeOff className="size-3.5" /> Ignorar</button>
              </>
            ) : (
              <button type="button" onClick={() => setPergunta("aguardando")} title="Reabrir" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><RotateCcw className="size-4" /></button>
            )}
          </span>
        </span>
      </div>
      {aberta && <Responder c={c} modo={aberta} fechar={() => abrir(null)} responder={() => abrir("responder")} />}
      {pergunta === "resolvida" && (
        <Confirmar titulo="Marcar como concluída?" botao="Sim, concluir" cor="verde" ok={() => marcar("resolvida")} cancelar={() => setPergunta(null)}>
          <p>A conversa com <b className="text-foreground">{nome}</b> sai da lista e vai para “Concluídas”.</p>
          <p>Nada é enviado para a pessoa. Se ela mandar mensagem nova, a conversa volta.</p>
        </Confirmar>
      )}
      {pergunta === "ignorada" && (
        <Confirmar titulo="Ignorar esta conversa?" botao="Sim, ignorar" cor="cinza" ok={() => marcar("ignorada")} cancelar={() => setPergunta(null)}>
          <p>Use para mensagens que não precisam de resposta (propaganda, “ok”, “obrigado”).</p>
          <p>A conversa com <b className="text-foreground">{nome}</b> sai da lista e nada é enviado. Se ela mandar mensagem nova, a conversa volta.</p>
        </Confirmar>
      )}
      {pergunta === "aguardando" && (
        <Confirmar titulo="Reabrir a conversa?" botao="Sim, reabrir" ok={() => marcar("aguardando")} cancelar={() => setPergunta(null)}>
          <p>A conversa com <b className="text-foreground">{nome}</b> volta para a lista de aguardando resposta.</p>
        </Confirmar>
      )}
    </li>
  );
}

/** "Nova mensagem": busca na agenda (responsáveis e colaboradores) e abre a janela para escrever. */
function NovaMensagem({ contatos, fechar }: { contatos: ContatoAgenda[]; fechar: () => void }) {
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<ContatoAgenda | null>(null);
  const sem = (x: string) => x.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const q = sem(busca.trim());
  const digitos = busca.replace(/\D/g, "");
  const achados = q.length < 2 ? [] : contatos.filter((c) => sem(c.nome).includes(q) || sem(c.vinculo).includes(q) || (digitos.length >= 4 && c.telefone.includes(digitos))).slice(0, 8);
  if (escolhido) {
    const c: Conversa = {
      chat_id: "", contato: escolhido.nome, telefone: escolhido.telefone, ultima_msg_em: null, aguardando_desde: null, msgs_sem_resposta: 0,
      assunto: null, importancia: null, precisa_acao: false, acao: null, resumo: null, ultimo_texto: null, ultima_da_escola: true,
      status: "respondida", vinculo: escolhido.vinculo, nome_cadastro: escolhido.nome,
    };
    return <Responder c={c} modo="responder" fechar={fechar} responder={() => {}} />;
  }
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome do responsável, do aluno ou número" className="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-amadeus-blue" />
        </div>
        <button type="button" onClick={fechar} className="rounded-md p-2 text-muted-foreground hover:bg-muted" aria-label="Fechar"><X className="size-4" /></button>
      </div>
      {achados.length > 0 && (
        <ul className="mt-2 divide-y divide-border/60">
          {achados.map((c) => (
            <li key={c.telefone}>
              <button type="button" onClick={() => setEscolhido(c)} className="flex w-full flex-col px-2 py-2 text-left text-sm hover:bg-amadeus-blue-50 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <span className="font-semibold">{c.nome}</span>
                <span className="text-xs text-muted-foreground">{c.vinculo} · {telLegivel(c.telefone)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {q.length >= 2 && achados.length === 0 && <p className="mt-2 text-sm text-muted-foreground">Ninguém encontrado na agenda.</p>}
    </div>
  );
}

export function PainelWhatsApp({ aguardando, fechadas, contatos, assuntos, geradoEm }: {
  aguardando: Conversa[];
  fechadas: Conversa[];
  contatos: ContatoAgenda[];
  assuntos: [string, number][];
  geradoEm: number;
}) {
  const router = useRouter();
  const [aba, setAba] = useState<"importantes" | "respondidas" | "todas" | "fechadas">("importantes");
  const [aberta, setAberta] = useState<{ id: string; modo: Modo } | null>(null);
  const [atualizando, iniciar] = useTransition();
  const [nova, setNova] = useState(false);
  const [confirmarTodas, setConfirmarTodas] = useState(false);

  // Atualiza sozinho a cada minuto (a leitura do WhatsApp roda a cada 5), sem perder o que está sendo escrito.
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) iniciar(() => router.refresh()); }, REFRESH_S * 1000);
    return () => clearInterval(t);
  }, [router]);

  const ordenadas = [...aguardando].sort(
    (a, b) => Number(!!b.urgente) - Number(!!a.urgente) || Number(!!atraso(b, geradoEm)) - Number(!!atraso(a, geradoEm)) || ORDEM[a.importancia ?? "media"] - ORDEM[b.importancia ?? "media"] || Date.parse(a.aguardando_desde ?? "") - Date.parse(b.aguardando_desde ?? ""),
  );
  // Quem já foi respondido (pelo painel ou pelo celular da escola) sai de "Precisam de resposta"
  // e espera em "Já respondidas" até alguém marcar como concluída.
  const importantes = ordenadas.filter((c) => c.importancia !== "baixa" && !c.ultima_da_escola);
  const respondidas = ordenadas.filter((c) => c.ultima_da_escola);
  const semResposta = aguardando.filter((c) => !c.ultima_da_escola).length;
  const lista = aba === "importantes" ? importantes : aba === "respondidas" ? respondidas : aba === "todas" ? ordenadas : fechadas;
  const concluirRespondidas = () =>
    iniciar(async () => {
      for (const c of respondidas) await marcarConversa(c.chat_id, "resolvida");
      router.refresh();
    });
  const nAlta = aguardando.filter((c) => c.importancia === "alta" && !c.ultima_da_escola).length;
  const nAtrasadas = aguardando.filter((c) => atraso(c, geradoEm)).length;
  const hora = new Date(geradoEm).toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" });

  const abas = [
    { id: "importantes", rotulo: "Precisam de resposta", n: importantes.length },
    { id: "respondidas", rotulo: "Já respondidas", n: respondidas.length },
    { id: "todas", rotulo: "Todas aguardando", n: ordenadas.length },
    { id: "fechadas", rotulo: "Concluídas", n: fechadas.length },
  ] as const;

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span><b className="text-red-700">{nAlta}</b> importante{nAlta === 1 ? "" : "s"}</span>
        <span><b className="text-amadeus-blue">{semResposta}</b> sem resposta</span>
        {nAtrasadas > 0 && (
          <span className="rounded-md bg-orange-100 px-2 py-0.5 text-orange-800"><b>{nAtrasadas}</b> há 5h ou mais (ou desde ontem)</span>
        )}
        {assuntos.length > 0 && (
          <span className="text-muted-foreground">Semana: {assuntos.slice(0, 5).map(([a, n]) => `${a} ${n}`).join(" · ")}</span>
        )}
        <button type="button" onClick={() => setNova(!nova)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-[#00A884] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#008F72]">
          <PenSquare className="size-3.5" /> Nova mensagem
        </button>
        <button type="button" onClick={() => iniciar(() => router.refresh())} className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">
          <RefreshCw className={`size-3.5 ${atualizando ? "animate-spin" : ""}`} /> Atualizado às {hora}
        </button>
      </div>

      {nova && <NovaMensagem contatos={contatos} fechar={() => setNova(false)} />}

      <div className="mt-4 flex gap-1 overflow-x-auto border-b border-border/60">
        {abas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAba(a.id)}
            className={`-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${aba === a.id ? "border-amadeus-blue text-amadeus-blue" : "border-transparent text-muted-foreground hover:text-amadeus-blue"}`}
          >
            {a.rotulo} <span className="ml-1 rounded-full bg-muted px-1.5 text-xs">{a.n}</span>
          </button>
        ))}
      </div>

      {aba === "respondidas" && respondidas.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-x border-border/60 bg-emerald-50/60 px-4 py-2 text-xs text-emerald-900">
          <span>Já receberam resposta (pelo painel ou pelo celular da escola). Confira e marque como concluída para tirar da lista.</span>
          <button type="button" disabled={atualizando} onClick={() => setConfirmarTodas(true)} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
            <Check className="size-3.5" /> Concluir todas ({respondidas.length})
          </button>
          {confirmarTodas && (
            <Confirmar titulo={`Concluir as ${respondidas.length} conversas já respondidas?`} botao="Sim, concluir todas" cor="verde" ok={() => { setConfirmarTodas(false); concluirRespondidas(); }} cancelar={() => setConfirmarTodas(false)}>
              <p>Todas saem da lista e vão para “Concluídas”. Nada é enviado para ninguém.</p>
            </Confirmar>
          )}
        </div>
      )}

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
        “Ver mensagem” mostra o que a pessoa mandou; “Responder” abre a conversa para escrever. “Marcar como concluída” e ⊘ só organizam a lista: não enviam nada. <span className="text-amber-700">●</span> = chegou com a escola fechada (fim de semana ou fora do horário).
      </p>
    </div>
  );
}
