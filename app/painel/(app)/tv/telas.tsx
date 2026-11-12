"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Loader2, Plus, Trash2, X } from "lucide-react";
import type { FormatoTela, TelaTv } from "@/lib/tv";
import { PlayerTv } from "@/app/admin/tv/player";
import { apagarTela, duplicarTela, salvarTela, type TelaForm } from "./actions";

/**
 * Telas criadas pela escola (Pedro, 12/11/2026): "+ Nova tela" abre a galeria de formatos; escolhido o formato,
 * a pessoa escreve vendo a tela pronta do lado (a mesma da TV, parada no fim da animação).
 */

export const FORMATOS: { id: FormatoTela; nome: string; dica: string; icone: string; fundo: string; novo: Record<string, unknown> }[] = [
  {
    id: "aviso", nome: "Aviso", dica: "Título grande e uma frase", icone: "📣", fundo: "linear-gradient(135deg,#12307A,#0B2260)",
    novo: { icone: "📣", titulo: "", texto: "" },
  },
  {
    id: "celebracao", nome: "Celebração", dica: "Formaturas e grandes momentos, com o aviãozinho", icone: "🎓", fundo: "linear-gradient(180deg,#0B2260,#3A7BE0)",
    novo: { pre: "o voo mais bonito do ano", titulo: "Formatura", linha: "" },
  },
  {
    id: "programacao", nome: "Programação", dica: "Horários e atividades de um dia", icone: "🕘", fundo: "#FDFBF6",
    novo: { titulo: "Programação", linhas: [{ hora: "", texto: "" }] },
  },
];

export const visualTela = (t: TelaTv | undefined) => {
  const f = FORMATOS.find((x) => x.id === t?.formato);
  return { fundo: f?.fundo ?? "#12307A", icone: f?.icone ?? "📺", claro: t?.formato === "programacao" };
};

export const nomeTela = (t: TelaTv | undefined) => {
  if (!t) return "Tela";
  const c = t.campos as Record<string, string>;
  const nome = [c.titulo, c.linha].filter(Boolean).join(" ").replace(/\*/g, "");
  return nome || FORMATOS.find((x) => x.id === t.formato)?.nome || "Tela";
};

export const formatoTela = (t: TelaTv | undefined) => FORMATOS.find((x) => x.id === t?.formato)?.nome ?? "";

/** A tela como fica na TV, parada no fim da animação. */
function Previa({ formato, campos }: { formato: FormatoTela; campos: Record<string, unknown> }) {
  const roteiro = { hoje: "", atualizado: "previa", cenas: [{ id: "tela", chave: "previa", segundos: 999, dados: { formato, ...campos } }] };
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#0B1430] shadow-[0_14px_34px_rgba(18,48,122,.2)]">
      <PlayerTv roteiro={roteiro} previa congelada={{ cena: 0, t: 8 }} />
    </div>
  );
}

const campo = "w-full rounded-xl border border-[#D5DDEB] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]";
const rotulo = "mb-1 block text-xs font-bold uppercase tracking-wider text-[#8A95AA]";

/** Os campos de cada formato. */
function Campos({ formato, c, set }: { formato: FormatoTela; c: Record<string, unknown>; set: (c: Record<string, unknown>) => void }) {
  const s = (k: string) => String(c[k] ?? "");
  if (formato === "aviso") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="w-16 shrink-0"><span className={rotulo}>Emoji</span><input value={s("icone")} onChange={(e) => set({ ...c, icone: e.target.value })} className={`${campo} text-center text-xl`} /></div>
          <div className="flex-1"><span className={rotulo}>Título grande</span><input autoFocus value={s("titulo")} onChange={(e) => set({ ...c, titulo: e.target.value })} placeholder="Ex.: Feira de Ciências hoje!" className={`${campo} font-bold`} /></div>
        </div>
        <div><span className={rotulo}>Frase de baixo</span><input value={s("texto")} onChange={(e) => set({ ...c, texto: e.target.value })} placeholder="Ex.: Das 8h às 11h, venha ver os projetos!" className={campo} /></div>
      </div>
    );
  }
  if (formato === "celebracao") {
    return (
      <div className="space-y-3">
        <div><span className={rotulo}>Frase pequena, em cima</span><input value={s("pre")} onChange={(e) => set({ ...c, pre: e.target.value })} placeholder="Ex.: o voo mais bonito do ano" className={campo} /></div>
        <div><span className={rotulo}>Título</span><input value={s("titulo")} onChange={(e) => set({ ...c, titulo: e.target.value })} placeholder="Ex.: Formatura" className={`${campo} font-bold`} /></div>
        <div><span className={rotulo}>Linha azul</span><input autoFocus value={s("linha")} onChange={(e) => set({ ...c, linha: e.target.value })} placeholder="Ex.: Grupo V 2026" className={`${campo} font-bold`} /></div>
      </div>
    );
  }
  const linhas = (Array.isArray(c.linhas) ? c.linhas : []) as { hora: string; texto: string }[];
  const mudaLinha = (i: number, p: Partial<{ hora: string; texto: string }>) => set({ ...c, linhas: linhas.map((l, j) => (j === i ? { ...l, ...p } : l)) });
  return (
    <div className="space-y-3">
      <div><span className={rotulo}>Título</span><input value={s("titulo")} onChange={(e) => set({ ...c, titulo: e.target.value })} placeholder="Ex.: Programação da *Feira de Ciências*" className={`${campo} font-bold`} /></div>
      <div>
        <span className={rotulo}>Horários (até 6)</span>
        <div className="space-y-2">
          {linhas.map((l, i) => (
            <div key={i} className="flex gap-2">
              <input value={l.hora} onChange={(e) => mudaLinha(i, { hora: e.target.value })} placeholder="8h" className={`${campo} w-24 shrink-0 text-center font-bold`} />
              <input autoFocus={i === linhas.length - 1 && i > 0} value={l.texto} onChange={(e) => mudaLinha(i, { texto: e.target.value })} placeholder="Ex.: Abertura no pátio" className={campo} />
              <button type="button" aria-label="Tirar esta linha" onClick={() => set({ ...c, linhas: linhas.filter((_, j) => j !== i) })} className="shrink-0 rounded-xl px-2 text-[#8A95AA] hover:bg-red-50 hover:text-red-700"><X className="size-4" /></button>
            </div>
          ))}
        </div>
        {linhas.length < 6 && (
          <button type="button" onClick={() => set({ ...c, linhas: [...linhas, { hora: "", texto: "" }] })} className="mt-2 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold text-[#1B3B7C] hover:bg-[#EEF2FA]">
            <Plus className="size-4" /> mais um horário
          </button>
        )}
      </div>
    </div>
  );
}

/** Escrever uma tela (nova ou já criada), com a prévia do lado. */
export function EditorTela({ tela, formato, onPronto, onCancelar }: {
  tela?: TelaTv; formato: FormatoTela; onPronto: (id?: string) => void; onCancelar?: () => void;
}) {
  const inicial = tela?.campos ?? FORMATOS.find((f) => f.id === formato)!.novo;
  const [c, setC] = useState<Record<string, unknown>>(inicial);
  const [inicio, setInicio] = useState(tela?.inicio ?? "");
  const [fim, setFim] = useState(tela?.fim ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string; id?: string }>) =>
    comecar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
      onPronto(r.id);
    });
  const form: TelaForm = { id: tela?.id, formato, campos: c, inicio, fim };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <div className="space-y-4">
        <Campos formato={formato} c={c} set={setC} />
        <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-[#1B3B7C]">
          <label className="flex items-center gap-2">Aparece de <input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
          <label className="flex items-center gap-2">até <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" /></label>
        </div>
        <p className="text-xs text-[#8A95AA]">Sem data: aparece desde já e não sai sozinha. Palavra entre *asteriscos* sai em destaque.</p>
        {erro && <p className="text-sm font-semibold text-red-700">{erro}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={pendente} onClick={() => rodar(() => salvarTela(form))} className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            {pendente ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} {tela ? "Salvar" : "Colocar na TV"}
          </button>
          {onCancelar && <button type="button" onClick={onCancelar} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5A6478] hover:bg-black/5">Cancelar</button>}
          {tela && (
            <>
              <button type="button" disabled={pendente} onClick={() => rodar(() => duplicarTela(tela.id))} className="ml-auto inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#1B3B7C] hover:bg-[#EEF2FA]"><Copy className="size-4" /> Duplicar</button>
              <button type="button" disabled={pendente} onClick={() => { if (window.confirm("Apagar esta tela da TV?")) rodar(() => apagarTela(tela.id)); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5A6478] hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /> Apagar</button>
            </>
          )}
        </div>
      </div>
      <Previa formato={formato} campos={c} />
    </div>
  );
}

/** "+ Nova tela": escolhe o formato e escreve. */
export function NovaTela({ onFechar, onCriada }: { onFechar: () => void; onCriada: (id?: string) => void }) {
  const [formato, setFormato] = useState<FormatoTela | null>(null);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#0B1430]/50 p-4 sm:p-8" onClick={onFechar}>
      <div className="w-full max-w-5xl rounded-3xl bg-[#FBF7EE] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <h2 className="font-[family-name:var(--font-serifa)] text-2xl font-bold text-[#1B3B7C]">{formato ? `Nova tela: ${FORMATOS.find((f) => f.id === formato)!.nome}` : "Nova tela"}</h2>
          {formato && <button type="button" onClick={() => setFormato(null)} className="text-sm font-semibold text-[#5A6478] hover:text-[#1B3B7C]">trocar o formato</button>}
          <button type="button" aria-label="Fechar" onClick={onFechar} className="ml-auto rounded-xl p-2 text-[#5A6478] hover:bg-black/5"><X className="size-5" /></button>
        </div>
        {!formato ? (
          <>
            <p className="mt-1 text-[15px] text-[#5A6478]">Escolha o formato.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {FORMATOS.map((f) => (
                <button key={f.id} type="button" onClick={() => setFormato(f.id)} className="group rounded-2xl bg-white p-2 text-left ring-1 ring-[#E3E8F2] transition hover:-translate-y-0.5 hover:ring-[3px] hover:ring-[#FFC21C]">
                  <div className="pointer-events-none"><Previa formato={f.id} campos={EXEMPLO[f.id]} /></div>
                  <p className="mt-3 px-2 text-lg font-bold text-[#1A2240]">{f.nome}</p>
                  <p className="px-2 pb-2 text-sm text-[#5A6478]">{f.dica}</p>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5"><EditorTela formato={formato} onPronto={onCriada} onCancelar={() => setFormato(null)} /></div>
        )}
      </div>
    </div>
  );
}

/** Os exemplos da galeria. */
const EXEMPLO: Record<string, Record<string, unknown>> = {
  aviso: { icone: "🔬", titulo: "Feira de Ciências!", texto: "Sexta, das 8h às 11h. Venha ver os projetos." },
  celebracao: { pre: "o voo mais bonito do ano", titulo: "Formatura", linha: "Grupo V 2026" },
  programacao: { titulo: "Programação da *Feira*", linhas: [{ hora: "8h", texto: "Abertura no pátio" }, { hora: "9h", texto: "Visita às salas" }, { hora: "10h30", texto: "Apresentações" }] },
};
