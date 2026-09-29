"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Eye, EyeOff, Loader2, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { BlocoTv, ItemTv, TipoItem } from "@/lib/tv";
import { apagarItem, ativarItem, salvarBlocos, salvarItem, type ItemForm } from "./actions";

const VAZIO: ItemForm = { tipo: "aviso", titulo: "", texto: "", icone: "", data: "", inicio: "", fim: "" };

const dataBr = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");

function situacao(i: ItemTv, hoje: string): { txt: string; cor: string } {
  if (!i.ativo) return { txt: "desligado", cor: "bg-muted text-muted-foreground" };
  if (i.tipo === "comemoracao") return i.data?.slice(5) === hoje.slice(5) ? { txt: "hoje", cor: "bg-emerald-100 text-emerald-800" } : { txt: dataBr(i.data), cor: "bg-amadeus-blue-50 text-amadeus-blue" };
  if (i.tipo === "agenda") return { txt: dataBr(i.data), cor: i.data && i.data < hoje ? "bg-muted text-muted-foreground" : "bg-amadeus-blue-50 text-amadeus-blue" };
  if (i.fim && i.fim < hoje) return { txt: "já passou", cor: "bg-muted text-muted-foreground" };
  if (i.inicio && i.inicio > hoje) return { txt: `a partir de ${dataBr(i.inicio)}`, cor: "bg-amber-100 text-amber-800" };
  return { txt: i.fim ? `no ar até ${dataBr(i.fim)}` : "no ar", cor: "bg-emerald-100 text-emerald-800" };
}

export function PainelTv({
  itens, blocos: blocosIniciais, nomes, tipos, hoje,
}: {
  itens: ItemTv[];
  blocos: BlocoTv[];
  nomes: Record<string, { nome: string; origem: string }>;
  tipos: { id: TipoItem; nome: string; dica: string }[];
  hoje: string;
}) {
  const [f, setF] = useState<ItemForm>(VAZIO);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [blocos, setBlocos] = useState(blocosIniciais);
  const [mudouBlocos, setMudouBlocos] = useState(false);
  const [abertos, setAbertos] = useState<Record<string, boolean>>({ aviso: true, recado: true, agenda: true });
  const [pendente, comecar] = useTransition();
  const previa = useRef<HTMLIFrameElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const tipo = tipos.find((t) => t.id === f.tipo)!;
  const muda = (p: Partial<ItemForm>) => setF({ ...f, ...p });
  const recarregar = () => { if (previa.current) previa.current.src = previa.current.src; };

  const salvar = () => {
    setErro(null);
    setOk(null);
    comecar(async () => {
      const r = await salvarItem(f);
      if (!r.ok) return setErro(r.erro);
      setOk(f.id ? "Alterado. Entra na próxima volta da TV." : "Colocado na TV. Entra na próxima volta.");
      setF({ ...VAZIO, tipo: f.tipo });
      recarregar();
    });
  };

  const editar = (i: ItemTv) => {
    setF({ id: i.id, tipo: i.tipo, titulo: i.titulo, texto: i.texto, icone: i.icone ?? "", data: i.data ?? "", inicio: i.inicio ?? "", fim: i.fim ?? "" });
    setOk(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const acao = (fn: () => Promise<{ ok: boolean; erro?: string }>) =>
    comecar(async () => {
      const r = await fn();
      if (!r.ok) setErro(r.erro ?? "Não deu certo.");
      else recarregar();
    });

  const mover = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= blocos.length) return;
    const n = [...blocos];
    [n[i], n[j]] = [n[j], n[i]];
    setBlocos(n);
    setMudouBlocos(true);
  };
  const mudaBloco = (id: string, p: Partial<BlocoTv>) => {
    setBlocos(blocos.map((b) => (b.id === id ? { ...b, ...p } : b)));
    setMudouBlocos(true);
  };

  const campo = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-amadeus-blue";
  const chip = (on: boolean) => `rounded-xl px-3 py-1.5 text-sm font-semibold ${on ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`;
  const btn = "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted";
  const totalSeg = blocos.filter((b) => b.ativo).reduce((s, b) => s + b.segundos, 0);

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      {/* esquerda: a TV rodando e os blocos */}
      <div className="space-y-4">
        <section className="rounded-2xl border border-border/60 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-extrabold text-amadeus-blue">A TV agora</h2>
            <span className="text-xs text-muted-foreground">roda sozinha; o que mudar aqui entra na próxima volta</span>
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={recarregar} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-sm font-semibold text-amadeus-blue hover:bg-amadeus-blue-50/60"><RefreshCw className="size-4" /> Recomeçar</button>
              <a href="/admin/tv" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-amadeus-blue px-3 py-1.5 text-sm font-bold text-white"><ExternalLink className="size-4" /> Abrir a TV</a>
            </div>
          </div>
          <div className="mt-3 aspect-video w-full overflow-hidden rounded-xl bg-black">
            <iframe ref={previa} src="/admin/tv?previa=1" title="Prévia da TV" className="h-full w-full border-0" />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Na TV da recepção: abra “Abrir a TV”, entre com um usuário do admin e clique na tela para ficar em tela cheia.</p>
        </section>

        <section className="rounded-2xl border border-border/60 bg-white p-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-extrabold text-amadeus-blue">Blocos do roteiro</h2>
            <span className="text-xs text-muted-foreground">uma volta ≈ {Math.floor(totalSeg / 60)}min{String(totalSeg % 60).padStart(2, "0")} (bloco sem conteúdo no dia é pulado)</span>
            {mudouBlocos && (
              <button type="button" disabled={pendente} onClick={() => acao(async () => { const r = await salvarBlocos(blocos); if (r.ok) setMudouBlocos(false); return r; })} className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-amadeus-blue px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50">
                {pendente ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Salvar ordem e tempos
              </button>
            )}
          </div>
          <ol className="mt-3 divide-y divide-border/60">
            {blocos.map((b, i) => (
              <li key={b.id} className={`flex items-center gap-3 py-2 ${b.ativo ? "" : "opacity-50"}`}>
                <span className="w-5 text-right text-xs font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-amadeus-blue">{nomes[b.id]?.nome ?? b.id}</p>
                  <p className="truncate text-xs text-muted-foreground">{nomes[b.id]?.origem}</p>
                </div>
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <input type="number" min={4} max={60} value={b.segundos} onChange={(e) => mudaBloco(b.id, { segundos: Number(e.target.value) || 4 })} className="w-14 rounded-lg border border-border px-2 py-1 text-right text-sm font-bold text-foreground" /> s
                </label>
                <button type="button" aria-label="Subir" onClick={() => mover(i, -1)} className={btn}><ArrowUp className="size-4" /></button>
                <button type="button" aria-label="Descer" onClick={() => mover(i, 1)} className={btn}><ArrowDown className="size-4" /></button>
                <button type="button" onClick={() => mudaBloco(b.id, { ativo: !b.ativo })} className={`${btn} w-24 justify-center ${b.ativo ? "text-emerald-700" : ""}`}>
                  {b.ativo ? <><Eye className="size-4" /> passa</> : <><EyeOff className="size-4" /> não passa</>}
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* direita: colocar coisas na TV */}
      <div className="space-y-4">
        <section ref={formRef} className="rounded-2xl border-2 border-amadeus-yellow bg-amadeus-yellow-50/60 p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-amadeus-blue">{f.id ? "Alterar" : "Colocar na TV"}</h2>
            {f.id && <button type="button" onClick={() => setF({ ...VAZIO, tipo: f.tipo })} className={`${btn} ml-auto`}><X className="size-4" /> cancelar alteração</button>}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tipos.map((t) => (
              <button key={t.id} type="button" disabled={!!f.id} onClick={() => muda({ tipo: t.id })} className={chip(f.tipo === t.id)}>{t.nome}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{tipo.dica}</p>
          <div className="mt-3 grid gap-2">
            <div className="flex gap-2">
              <input value={f.icone} onChange={(e) => muda({ icone: e.target.value })} placeholder="😀" title="Um emoji (opcional). No Windows: tecla Windows + ponto" className={`${campo} w-16 text-center text-lg`} />
              <input value={f.titulo} onChange={(e) => muda({ titulo: e.target.value })} placeholder={f.tipo === "aviso" ? "Título grande. Ex.: Arena Arbória" : f.tipo === "frase" ? "Ex.: Ler é *viajar* sem sair do *lugar*" : f.tipo === "curiosidade" ? "Ex.: O polvo tem *três corações*" : f.tipo === "agenda" ? "Ex.: Simulado do 9º ano" : f.tipo === "comemoracao" ? "Ex.: Dia do Professor" : "Ex.: Traga a garrafinha com nome"} className={`${campo} font-bold`} />
            </div>
            {f.tipo === "aviso" && <input value={f.texto} onChange={(e) => muda({ texto: e.target.value })} placeholder="Texto de baixo. Ex.: O resultado sai na quinta-feira, 01/10!" className={campo} />}
            {(f.tipo === "agenda" || f.tipo === "comemoracao") && (
              <label className="flex items-center gap-2 text-sm font-semibold text-amadeus-blue">
                {f.tipo === "agenda" ? "Dia" : "Dia do ano"} <input type="date" value={f.data} onChange={(e) => muda({ data: e.target.value })} className="rounded-lg border border-border px-2 py-1.5 text-sm" />
              </label>
            )}
            {f.tipo !== "agenda" && f.tipo !== "comemoracao" && (
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-amadeus-blue">
                <label className="flex items-center gap-2">Aparece a partir de <input type="date" value={f.inicio} onChange={(e) => muda({ inicio: e.target.value })} className="rounded-lg border border-border px-2 py-1.5 text-sm" /></label>
                <label className="flex items-center gap-2">até <input type="date" value={f.fim} onChange={(e) => muda({ fim: e.target.value })} className="rounded-lg border border-border px-2 py-1.5 text-sm" /></label>
                <span className="text-xs font-normal text-muted-foreground">(vazio = desde já / sem data para sair)</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={pendente} onClick={salvar} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {pendente ? <Loader2 className="size-4 animate-spin" /> : f.id ? <Save className="size-4" /> : <Plus className="size-4" />} {f.id ? "Salvar alteração" : "Colocar na TV"}
            </button>
            {ok && <span className="text-sm font-semibold text-emerald-700">{ok}</span>}
            {erro && <span className="text-sm font-semibold text-red-700">{erro}</span>}
          </div>
        </section>

        {tipos.map((t) => {
          const lista = itens.filter((i) => i.tipo === t.id).sort((a, b) => (t.id === "agenda" || t.id === "comemoracao" ? (a.data ?? "").slice(t.id === "comemoracao" ? 5 : 0).localeCompare((b.data ?? "").slice(t.id === "comemoracao" ? 5 : 0)) : 0));
          const aberto = abertos[t.id];
          return (
            <section key={t.id} className="rounded-2xl border border-border/60 bg-white p-4">
              <button type="button" onClick={() => setAbertos({ ...abertos, [t.id]: !aberto })} className="flex w-full items-center gap-2 text-left">
                <h2 className="text-sm font-extrabold text-amadeus-blue">{t.nome}</h2>
                <span className="rounded-full bg-amadeus-blue-50 px-2 text-xs font-bold text-amadeus-blue">{lista.length}</span>
                <span className="ml-auto text-xs text-muted-foreground">{aberto ? "esconder" : "mostrar"}</span>
              </button>
              {aberto && (
                <ul className="mt-2 divide-y divide-border/60">
                  {!lista.length && <li className="py-2 text-sm text-muted-foreground">Nada ainda.</li>}
                  {lista.map((i) => {
                    const s = situacao(i, hoje);
                    return (
                      <li key={i.id} className={`flex items-start gap-2 py-2 ${i.ativo ? "" : "opacity-60"}`}>
                        <span className="w-7 text-center text-lg leading-6">{i.icone ?? ""}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-foreground">{i.titulo.replace(/\*/g, "")}</p>
                          {i.texto && <p className="text-xs text-muted-foreground">{i.texto}</p>}
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cor}`}>{s.txt}</span>
                        <button type="button" onClick={() => editar(i)} className={btn} aria-label="Alterar"><Pencil className="size-3.5" /></button>
                        <button type="button" onClick={() => acao(() => ativarItem(i.id, !i.ativo))} className={btn} aria-label={i.ativo ? "Desligar" : "Ligar"}>{i.ativo ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}</button>
                        <button type="button" onClick={() => { if (window.confirm("Apagar da TV?")) acao(() => apagarItem(i.id)); }} className={`${btn} hover:text-red-700`} aria-label="Apagar"><Trash2 className="size-3.5" /></button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
