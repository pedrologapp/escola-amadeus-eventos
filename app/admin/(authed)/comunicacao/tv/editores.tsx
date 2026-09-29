"use client";

import { useState, useTransition } from "react";
import { Check, ChevronLeft, ChevronRight, Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import type { ItemTv, TipoItem } from "@/lib/tv";
import { apagarItem, ativarItem, salvarItem, type ItemForm } from "./actions";
import "../../../tv/fontes.css";

/**
 * Editores "no formato de como aparece" (29/09/2026): avisos como os cartões
 * da TV, recados como a folha de caderno, agenda como a semana. Clica no que
 * quer mudar, muda ali mesmo; o "+" põe coisa nova no lugar certo.
 */

type Ok = { ok: boolean; erro?: string };
type Rodar = (fn: () => Promise<Ok>, depois?: () => void) => void;

const dataBr = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");
const somaDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const passou = (i: ItemTv, hoje: string) => !!i.fim && i.fim < hoje;
const btnIcone = "inline-flex size-7 items-center justify-center rounded-lg hover:bg-black/10";

function useAcao(onMudou: () => void) {
  const [pendente, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const rodar: Rodar = (fn, depois) =>
    comecar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
      depois?.();
      onMudou();
    });
  return { pendente, erro, rodar };
}

const form = (tipo: TipoItem, i?: ItemTv): ItemForm => ({
  id: i?.id,
  tipo,
  titulo: i?.titulo ?? "",
  texto: i?.texto ?? "",
  icone: i?.icone ?? "",
  data: i?.data ?? "",
  inicio: i?.inicio ?? "",
  fim: i?.fim ?? "",
});

function Situacao({ i, hoje }: { i: ItemTv; hoje: string }) {
  const [t, c] = !i.ativo
    ? ["desligado", "bg-white/20 text-white/70"]
    : passou(i, hoje)
      ? ["já passou", "bg-white/20 text-white/70"]
      : i.inicio && i.inicio > hoje
        ? [`a partir de ${dataBr(i.inicio)}`, "bg-amber-300 text-amber-950"]
        : [i.fim ? `no ar até ${dataBr(i.fim)}` : "no ar", "bg-emerald-400 text-emerald-950"];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${c}`}>{t}</span>;
}

function Datas({ f, set, claro }: { f: ItemForm; set: (f: ItemForm) => void; claro?: boolean }) {
  const inp = "rounded-lg border border-border bg-white px-2 py-1 text-xs text-foreground";
  return (
    <div className={`flex flex-wrap items-center gap-2 text-xs font-semibold ${claro ? "text-white/85" : "text-muted-foreground"}`}>
      <label className="flex items-center gap-1">aparece de <input type="date" value={f.inicio} onChange={(e) => set({ ...f, inicio: e.target.value })} className={inp} /></label>
      <label className="flex items-center gap-1">até <input type="date" value={f.fim} onChange={(e) => set({ ...f, fim: e.target.value })} className={inp} /></label>
      <span className="font-normal opacity-80">(vazio = já / sem data para sair)</span>
    </div>
  );
}

/* ================= AVISOS: cartões como a tela da TV ================= */

function CartaoAviso({ i, hoje, onEditar, rodar }: { i: ItemTv; hoje: string; onEditar: () => void; rodar: Rodar }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-amadeus-blue p-5 text-center text-white shadow-md ${i.ativo ? "" : "opacity-60"}`}>
      <div className="pointer-events-none absolute -left-10 -top-10 size-28 rounded-full bg-amadeus-yellow" />
      <div className="pointer-events-none absolute -bottom-12 -right-10 size-32 rounded-full bg-amadeus-yellow" />
      <div className="relative">
        <p className="text-[10px] font-bold tracking-[.3em] text-[#FFE08A]">AVISO</p>
        {i.icone && <p className="mt-1 text-4xl">{i.icone}</p>}
        <button type="button" onClick={onEditar} className="f-ralton mt-1 text-3xl leading-none text-amadeus-yellow [-webkit-text-stroke:5px_white] [paint-order:stroke_fill] hover:opacity-90">{i.titulo.replace(/\*/g, "")}</button>
        {i.texto && <p className="f-ralton mx-auto mt-3 block w-fit rounded-2xl bg-white px-4 py-2 text-sm leading-snug text-amadeus-blue">{i.texto}</p>}
        <div className="mt-3 flex items-center justify-center gap-1">
          <Situacao i={i} hoje={hoje} />
          <button type="button" title="Alterar" onClick={onEditar} className={btnIcone}><Pencil className="size-4" /></button>
          <button type="button" title={i.ativo ? "Tirar da TV" : "Voltar para a TV"} onClick={() => rodar(() => ativarItem(i.id, !i.ativo))} className={btnIcone}>{i.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
          <button type="button" title="Apagar" onClick={() => { if (window.confirm("Apagar este aviso?")) rodar(() => apagarItem(i.id)); }} className={btnIcone}><Trash2 className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function EdicaoAviso({ inicial, pendente, onSalvar, onCancelar }: { inicial: ItemForm; pendente: boolean; onSalvar: (f: ItemForm) => void; onCancelar: () => void }) {
  const [f, setF] = useState(inicial);
  return (
    <div className="rounded-2xl bg-amadeus-blue p-4 text-white shadow-md ring-4 ring-amadeus-yellow">
      <p className="text-center text-[10px] font-bold tracking-[.3em] text-[#FFE08A]">{f.id ? "ALTERANDO AVISO" : "NOVO AVISO"}</p>
      <div className="mt-2 flex gap-2">
        <input value={f.icone} onChange={(e) => setF({ ...f, icone: e.target.value })} placeholder="🏆" title="Um emoji (Windows + ponto)" className="w-14 shrink-0 rounded-xl bg-white/15 px-2 py-2 text-center text-2xl outline-none placeholder:text-white/40" />
        <input autoFocus value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Título grande" className="f-ralton min-w-0 flex-1 rounded-xl bg-white/15 px-3 py-2 text-2xl text-amadeus-yellow outline-none placeholder:text-white/40" />
      </div>
      <input value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder="Texto de baixo (ex.: o resultado sai na quinta, 01/10!)" className="mt-2 w-full rounded-xl bg-white px-3 py-2 text-sm text-amadeus-blue outline-none" />
      <div className="mt-2"><Datas f={f} set={setF} claro /></div>
      <div className="mt-3 flex items-center gap-2">
        <button type="button" disabled={pendente || !f.titulo.trim()} onClick={() => onSalvar(f)} className="inline-flex items-center gap-1.5 rounded-xl bg-amadeus-yellow px-3 py-1.5 text-sm font-bold text-amadeus-blue disabled:opacity-50">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {f.id ? "Salvar" : "Colocar na TV"}
        </button>
        <button type="button" onClick={onCancelar} className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-semibold text-white/80 hover:bg-white/10"><X className="size-4" /> Cancelar</button>
      </div>
    </div>
  );
}

export function EditorAvisos({ itens, hoje, onMudou, abrirNovo }: { itens: ItemTv[]; hoje: string; onMudou: () => void; abrirNovo: number }) {
  const { pendente, erro, rodar } = useAcao(onMudou);
  const [editando, setEditando] = useState<ItemForm | null>(null);
  const [verAntigos, setVerAntigos] = useState(false);
  // o "colocar" da lista de blocos abre um aviso novo aqui
  const [pedidoVisto, setPedidoVisto] = useState(abrirNovo);
  if (abrirNovo !== pedidoVisto) {
    setPedidoVisto(abrirNovo);
    setEditando(form("aviso"));
  }
  const avisos = itens.filter((i) => i.tipo === "aviso");
  const atuais = avisos.filter((i) => !passou(i, hoje));
  const antigos = avisos.filter((i) => passou(i, hoje));
  const salvar = (f: ItemForm) => rodar(() => salvarItem(f), () => setEditando(null));
  const cartao = (i: ItemTv) =>
    editando?.id === i.id
      ? <EdicaoAviso key={i.id} inicial={editando} pendente={pendente} onSalvar={salvar} onCancelar={() => setEditando(null)} />
      : <CartaoAviso key={i.id} i={i} hoje={hoje} rodar={rodar} onEditar={() => setEditando(form("aviso", i))} />;

  return (
    <section id="ed-aviso" className="scroll-mt-4 rounded-2xl border border-border/60 bg-white p-4">
      <h3 className="text-sm font-extrabold text-amadeus-blue">Avisos em destaque</h3>
      <p className="text-xs text-muted-foreground">Cada aviso é uma tela inteira na TV e aparece nos lembretes do portal. Sai sozinho depois da data “até”.</p>
      {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {atuais.map(cartao)}
        {editando && !editando.id ? (
          <EdicaoAviso key={`novo-${pedidoVisto}`} inicial={editando} pendente={pendente} onSalvar={salvar} onCancelar={() => setEditando(null)} />
        ) : (
          <button type="button" onClick={() => setEditando(form("aviso"))} className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-amadeus-blue-100 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50/50">
            <Plus className="size-6" /> Novo aviso
          </button>
        )}
      </div>
      {antigos.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setVerAntigos(!verAntigos)} className="text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">{verAntigos ? "esconder" : "ver"} avisos que já passaram ({antigos.length})</button>
          {verAntigos && <div className="mt-2 grid gap-3 sm:grid-cols-2">{antigos.map(cartao)}</div>}
        </div>
      )}
    </section>
  );
}

/* ================= RECADOS: a folha de caderno da TV ================= */

function LinhaRecado({ i, hoje, onEditar, rodar }: { i: ItemTv; hoje: string; onEditar: () => void; rodar: Rodar }) {
  return (
    <li className={`group flex items-center gap-3 py-2 ${i.ativo ? "" : "opacity-50"}`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF1BF] text-xl">{i.icone || "📌"}</span>
      <button type="button" onClick={onEditar} title="Clique para mudar" className="min-w-0 flex-1 text-left text-[15px] leading-snug text-[#2A3A5C] hover:underline">{i.titulo}</button>
      <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">{!i.ativo ? "desligado" : i.inicio && i.inicio > hoje ? `a partir de ${dataBr(i.inicio)}` : i.fim ? `até ${dataBr(i.fim)}` : ""}</span>
      <div className="flex shrink-0 opacity-60 group-hover:opacity-100">
        <button type="button" title={i.ativo ? "Tirar da TV" : "Voltar para a TV"} onClick={() => rodar(() => ativarItem(i.id, !i.ativo))} className={btnIcone}>{i.ativo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
        <button type="button" title="Apagar" onClick={() => { if (window.confirm("Apagar este recado?")) rodar(() => apagarItem(i.id)); }} className={`${btnIcone} hover:text-red-700`}><Trash2 className="size-4" /></button>
      </div>
    </li>
  );
}

function CamposRecado({ inicial, pendente, rotulo, focar, onSalvar, onCancelar }: { inicial: ItemForm; pendente: boolean; rotulo: string; focar: boolean; onSalvar: (f: ItemForm, limpar: () => void) => void; onCancelar?: () => void }) {
  const [f, setF] = useState(inicial);
  const salvar = () => f.titulo.trim() && onSalvar(f, () => setF(inicial));
  return (
    <li className="py-2">
      <div className="flex gap-2">
        <input value={f.icone} onChange={(e) => setF({ ...f, icone: e.target.value })} placeholder="📌" className="w-12 shrink-0 rounded-xl border border-border bg-white px-1 py-2 text-center text-lg" />
        <input autoFocus={focar} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") onCancelar?.(); }} placeholder="Escreva o recado e aperte Enter. Ex.: Traga a garrafinha de água com nome" className="min-w-0 flex-1 rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-amadeus-blue" />
        <button type="button" disabled={pendente || !f.titulo.trim()} onClick={salvar} className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-amadeus-blue px-3 text-sm font-bold text-white disabled:opacity-40">
          {pendente ? <Loader2 className="size-4 animate-spin" /> : f.id ? <Check className="size-4" /> : <Plus className="size-4" />} {rotulo}
        </button>
        {onCancelar && <button type="button" onClick={onCancelar} className={btnIcone} title="Cancelar"><X className="size-4" /></button>}
      </div>
      <div className="mt-1.5 pl-14"><Datas f={f} set={setF} /></div>
    </li>
  );
}

export function EditorRecados({ itens, hoje, onMudou, abrirNovo }: { itens: ItemTv[]; hoje: string; onMudou: () => void; abrirNovo: number }) {
  const { pendente, erro, rodar } = useAcao(onMudou);
  const [editando, setEditando] = useState<string | null>(null);
  const [verAntigos, setVerAntigos] = useState(false);
  const recados = itens.filter((i) => i.tipo === "recado");
  const atuais = recados.filter((i) => !passou(i, hoje));
  const antigos = recados.filter((i) => passou(i, hoje));
  const linha = (i: ItemTv) =>
    editando === i.id ? (
      <CamposRecado key={i.id} inicial={form("recado", i)} pendente={pendente} rotulo="Salvar" focar onSalvar={(f) => rodar(() => salvarItem(f), () => setEditando(null))} onCancelar={() => setEditando(null)} />
    ) : (
      <LinhaRecado key={i.id} i={i} hoje={hoje} rodar={rodar} onEditar={() => setEditando(i.id)} />
    );

  return (
    <section id="ed-recado" className="scroll-mt-4 overflow-hidden rounded-2xl border border-border/60 bg-[#FDFBF6] p-4" style={{ backgroundImage: "repeating-linear-gradient(transparent 0 38px, #E3EAF4 38px 39px)" }}>
      <h3 className="f-caveat text-4xl leading-none text-[#1B3B7C]">Recados da <span className="text-[#F29A0C]">coordenação</span></h3>
      <p className="mt-1 text-xs text-muted-foreground">Clique num recado para mudar. Eles aparecem na TV e nos lembretes do portal.</p>
      {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
      <ul className="mt-2 divide-y divide-[#E3EAF4]">
        {atuais.map(linha)}
        {/* key muda quando o "colocar" dos blocos é clicado: o campo novo ganha o cursor */}
        <CamposRecado key={`novo-${abrirNovo}`} inicial={form("recado")} pendente={pendente} rotulo="Colocar" focar={abrirNovo > 0} onSalvar={(f, limpar) => rodar(() => salvarItem(f), limpar)} />
      </ul>
      {antigos.length > 0 && (
        <div className="mt-2">
          <button type="button" onClick={() => setVerAntigos(!verAntigos)} className="text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">{verAntigos ? "esconder" : "ver"} recados que já passaram ({antigos.length})</button>
          {verAntigos && <ul className="mt-1 divide-y divide-[#E3EAF4]">{antigos.map(linha)}</ul>}
        </div>
      )}
    </section>
  );
}

/* ================= AGENDA: a semana ================= */

const NOMES = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];
const CORES = ["#2E8FF0", "#F29A0C", "#4CC23A", "#E0357F", "#7B5EA7"];

function CampoAgenda({ inicial, pendente, onSalvar, onCancelar }: { inicial: string; pendente: boolean; onSalvar: (t: string) => void; onCancelar: () => void }) {
  const [t, setT] = useState(inicial);
  return (
    <div>
      <input autoFocus value={t} onChange={(e) => setT(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && t.trim()) onSalvar(t); if (e.key === "Escape") onCancelar(); }} placeholder="Ex.: Simulado · 9º ano" className="w-full rounded-lg border border-amadeus-blue px-2 py-1 text-xs outline-none" />
      <div className="mt-1 flex gap-1">
        <button type="button" disabled={pendente || !t.trim()} onClick={() => onSalvar(t)} className="inline-flex items-center gap-1 rounded-md bg-amadeus-blue px-2 py-0.5 text-[11px] font-bold text-white disabled:opacity-40">{pendente && <Loader2 className="size-3 animate-spin" />} Salvar</button>
        <button type="button" onClick={onCancelar} className="rounded-md px-2 py-0.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted">Cancelar</button>
      </div>
    </div>
  );
}

export function EditorAgenda({ itens, hoje, onMudou }: { itens: ItemTv[]; hoje: string; onMudou: () => void }) {
  const { pendente, erro, rodar } = useAcao(onMudou);
  const [semana, setSemana] = useState(0);
  const [editando, setEditando] = useState<string | null>(null); // id do item ou "novo:AAAA-MM-DD"

  const dow = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const segunda = somaDias(hoje, (dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow) + semana * 7);
  const dias = [0, 1, 2, 3, 4].map((n) => somaDias(segunda, n));
  const doDia = (d: string) => itens.filter((i) => i.tipo === "agenda" && i.data === d);

  return (
    <section id="ed-agenda" className="scroll-mt-4 rounded-2xl border border-border/60 bg-[#FDFBF6] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="f-caveat text-4xl leading-none text-[#1B3B7C]">Agenda da <span className="text-[#2E8FF0]">semana</span></h3>
        <div className="ml-auto flex items-center gap-1 text-sm font-semibold text-amadeus-blue">
          <button type="button" onClick={() => setSemana(semana - 1)} className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-amadeus-blue-50"><ChevronLeft className="size-4" /> anterior</button>
          <button type="button" onClick={() => setSemana(0)} className={`rounded-lg px-2 py-1 ${semana === 0 ? "bg-amadeus-blue text-white" : "hover:bg-amadeus-blue-50"}`}>esta semana</button>
          <button type="button" onClick={() => setSemana(semana + 1)} className="inline-flex items-center rounded-lg px-2 py-1 hover:bg-amadeus-blue-50">próxima <ChevronRight className="size-4" /></button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Clique em “marcar” no dia para pôr algo; clique no que já está marcado para mudar. A TV e o portal mostram a semana atual.</p>
      {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
      <div className="mt-3 grid gap-2 sm:grid-cols-5">
        {dias.map((d, n) => {
          const eHoje = d === hoje;
          return (
            <div key={d} className={`flex min-h-44 flex-col overflow-hidden rounded-2xl border-2 bg-white ${eHoje ? "border-amadeus-yellow" : "border-[#EAF0FA]"}`}>
              <div className={`px-3 py-2 text-sm font-bold ${eHoje ? "bg-amadeus-yellow text-amadeus-blue" : "bg-amadeus-blue text-white"}`}>
                {NOMES[n]} <span className="font-normal opacity-80">{dataBr(d)}{eHoje ? " · hoje" : ""}</span>
              </div>
              <ul className="flex flex-1 flex-col gap-1.5 p-2">
                {doDia(d).map((i, j) => (
                  <li key={i.id}>
                    {editando === i.id ? (
                      <CampoAgenda inicial={i.titulo} pendente={pendente} onCancelar={() => setEditando(null)} onSalvar={(t) => rodar(() => salvarItem({ ...form("agenda", i), titulo: t }), () => setEditando(null))} />
                    ) : (
                      <div className="group flex items-start gap-1 border-l-[3px] pl-2 text-xs leading-snug" style={{ borderColor: CORES[(n + j) % CORES.length] }}>
                        <button type="button" onClick={() => setEditando(i.id)} className="flex-1 text-left text-[#2A3A5C] hover:underline">{i.titulo}</button>
                        <button type="button" title="Apagar" onClick={() => rodar(() => apagarItem(i.id))} className="opacity-30 transition group-hover:opacity-100 hover:text-red-700"><X className="size-3.5" /></button>
                      </div>
                    )}
                  </li>
                ))}
                <li className="mt-auto">
                  {editando === `novo:${d}` ? (
                    <CampoAgenda inicial="" pendente={pendente} onCancelar={() => setEditando(null)} onSalvar={(t) => rodar(() => salvarItem({ ...form("agenda"), titulo: t, data: d }), () => setEditando(null))} />
                  ) : (
                    <button type="button" onClick={() => setEditando(`novo:${d}`)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-amadeus-blue-100 py-1 text-xs font-semibold text-amadeus-blue hover:bg-amadeus-blue-50/60">
                      <Plus className="size-3.5" /> marcar
                    </button>
                  )}
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
