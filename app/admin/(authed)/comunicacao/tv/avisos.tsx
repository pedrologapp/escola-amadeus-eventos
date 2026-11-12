"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import type { ItemTv } from "@/lib/tv";
import { apagarItem, ativarItem, salvarItem, type ItemForm } from "@/app/admin/(authed)/comunicacao/tv/actions";
import { Previa } from "./telas";

/**
 * Avisos em destaque, do jeito fácil (Pedro, 12/11/2026): a lista dos avisos com a situação de cada um e um
 * "+ Novo aviso" que abre os campos com a tela do aviso pronta do lado (a mesma da TV). Usa a tabela de sempre
 * (tv_itens, tipo "aviso"), então funciona já, sem banco novo.
 */

const dataBr = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");
const campo = "w-full rounded-xl border border-[#D5DDEB] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]";
const rotulo = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#8A95AA]";

function situacao(i: ItemTv, hoje: string): { txt: string; no: boolean } {
  if (!i.ativo) return { txt: "desligado", no: false };
  if (i.fim && i.fim < hoje) return { txt: "já passou", no: false };
  if (i.inicio && i.inicio > hoje) return { txt: `a partir de ${dataBr(i.inicio)}`, no: false };
  return { txt: i.fim ? `na TV até ${dataBr(i.fim)}` : "na TV", no: true };
}

function Editor({ inicial, onPronto, onCancelar }: { inicial: ItemForm; onPronto: () => void; onCancelar: () => void }) {
  const [f, setF] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const salvar = () =>
    comecar(async () => {
      setErro(null);
      const r = await salvarItem(f);
      if (!r.ok) return setErro(r.erro);
      onPronto();
    });
  return (
    <div className="rounded-2xl bg-[#F4F7FC] p-4">
      <Previa formato="aviso" campos={{ icone: f.icone, titulo: f.titulo || "Título do aviso", texto: f.texto }} />
      <div className="mt-4 space-y-3">
        <div className="flex gap-2">
          <div className="w-16 shrink-0"><span className={rotulo}>Emoji</span><input value={f.icone} onChange={(e) => setF({ ...f, icone: e.target.value })} className={`${campo} text-center text-xl`} /></div>
          <div className="min-w-0 flex-1"><span className={rotulo}>Título grande</span><input autoFocus value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Feira de Ciências hoje!" className={`${campo} font-bold`} /></div>
        </div>
        <div><span className={rotulo}>Frase de baixo (se quiser)</span><input value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} placeholder="Ex.: Das 8h às 11h, venha ver os projetos!" className={campo} /></div>
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[#1B3B7C]">
          <label className="flex items-center gap-2">Aparece de <input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
          <label className="flex items-center gap-2">até <input type="date" value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
        </div>
        <p className="text-xs text-[#8A95AA]">Sem data: aparece desde já e não sai sozinho.</p>
        {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
        <div className="flex items-center gap-2">
          <button type="button" disabled={pendente || !f.titulo.trim()} onClick={salvar} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {f.id ? "Salvar" : "Colocar na TV"}
          </button>
          <button type="button" onClick={onCancelar} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5A6478] hover:bg-black/5">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

export function AvisosDestaque({ itens, hoje, onMudou }: { itens: ItemTv[]; hoje: string; onMudou: () => void }) {
  const [editando, setEditando] = useState<ItemForm | null>(null);
  const [verPassados, setVerPassados] = useState(false);
  const [pendente, comecar] = useTransition();
  const avisos = itens.filter((i) => i.tipo === "aviso");
  const valendo = avisos.filter((i) => !(i.fim && i.fim < hoje));
  const passados = avisos.filter((i) => i.fim && i.fim < hoje);
  const novo: ItemForm = { tipo: "aviso", titulo: "", texto: "", icone: "📣", data: "", inicio: "", fim: "" };
  const abrir = (i: ItemTv) => setEditando({ id: i.id, tipo: "aviso", titulo: i.titulo, texto: i.texto, icone: i.icone ?? "", data: "", inicio: i.inicio ?? "", fim: i.fim ?? "" });
  const acao = (fn: () => Promise<{ ok: boolean }>) => comecar(async () => { if ((await fn()).ok) onMudou(); });

  const linha = (i: ItemTv) => {
    const s = situacao(i, hoje);
    return (
      <li key={i.id} className={`group flex items-center gap-3 rounded-xl p-2 hover:bg-[#F4F7FC] ${s.no ? "" : "opacity-60"}`}>
        <button type="button" onClick={() => abrir(i)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#12307A] to-[#0B2260] text-lg">{i.icone || "📣"}</span>
          <span className="min-w-0">
            <span className="block truncate text-[15px] font-bold text-[#1A2240]">{i.titulo.replace(/\*/g, "")}</span>
            <span className={`text-xs font-semibold ${s.no ? "text-emerald-700" : "text-[#8A95AA]"}`}>{s.txt}</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100">
          <button type="button" aria-label="Mudar" onClick={() => abrir(i)} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-black/5"><Pencil className="size-4" /></button>
          <button type="button" role="switch" aria-checked={i.ativo} aria-label={i.ativo ? "Tirar da TV" : "Voltar para a TV"} disabled={pendente} onClick={() => acao(() => ativarItem(i.id, !i.ativo))} className={`mx-1 h-5 w-9 rounded-full p-0.5 ${i.ativo ? "bg-emerald-500" : "bg-[#CBD3E1]"}`}>
            <span className={`block size-4 rounded-full bg-white shadow transition ${i.ativo ? "translate-x-4" : ""}`} />
          </button>
          <button type="button" aria-label="Apagar" disabled={pendente} onClick={() => { if (window.confirm("Apagar este aviso?")) acao(() => apagarItem(i.id)); }} className="inline-flex size-8 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
        </div>
      </li>
    );
  };

  return (
    <section className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E8F2]">
      <h2 className="text-lg font-extrabold text-[#1B3B7C]">Avisos em destaque</h2>
      <p className="text-sm text-[#5A6478]">Cada aviso ocupa a TV inteira.</p>

      {editando ? (
        <div className="mt-4"><Editor key={editando.id ?? "novo"} inicial={editando} onPronto={() => { setEditando(null); onMudou(); }} onCancelar={() => setEditando(null)} /></div>
      ) : (
        <>
          {valendo.length > 0 && <ul className="mt-3 space-y-1">{valendo.map(linha)}</ul>}
          <button type="button" onClick={() => setEditando(novo)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9D3E4] py-4 text-[15px] font-bold text-[#1B3B7C] hover:border-[#1B3B7C] hover:bg-[#F4F7FC]">
            <Plus className="size-5" /> Novo aviso
          </button>
          {passados.length > 0 && (
            <div className="mt-3">
              <button type="button" onClick={() => setVerPassados(!verPassados)} className="inline-flex items-center gap-1 text-sm font-semibold text-[#8A95AA] hover:text-[#1B3B7C]">
                <ChevronDown className={`size-4 transition ${verPassados ? "rotate-180" : ""}`} /> avisos que já passaram ({passados.length})
              </button>
              {verPassados && <ul className="mt-2 space-y-1">{passados.map(linha)}</ul>}
            </div>
          )}
        </>
      )}
    </section>
  );
}
