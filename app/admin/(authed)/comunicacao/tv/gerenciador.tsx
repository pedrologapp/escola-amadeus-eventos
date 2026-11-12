"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Copy, GripVertical, Loader2, Lock, Minus, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type { BlocoTv, ItemTv, TelaTv, TipoItem } from "@/lib/tv";
import { apagarItem, ativarItem, salvarItem, type ItemForm } from "@/app/admin/(authed)/comunicacao/tv/actions";
import { ligarBloco, ordenarBlocos } from "./telas-acoes";
import { FIXOS } from "./fixos";
import { AvisosDestaque } from "./avisos";
import { EditorTela, NovaTela, formatoTela, nomeTela, visualTela } from "./telas";
import { EditorAgenda, EditorRecados } from "@/app/admin/(authed)/comunicacao/tv/editores";

/**
 * O gerenciador da TV (Pedro, 12/11/2026). Três partes numa tela só:
 *  1. a TV ao vivo, igual à da recepção, com o link certo para copiar;
 *  2. o roteiro em cartões, na ordem em que passam (arrastar muda a ordem; liga/desliga e o tempo salvam sozinhos);
 *  3. o editor do cartão escolhido, do lado.
 */

type Nomes = Record<string, { nome: string; origem: string; equipe?: TipoItem }>;

/** O desenho de cada cartão: a cor do fundo da cena na TV e um ícone. */
const VISUAL: Record<string, { fundo: string; icone: string; claro?: boolean }> = {
  saudacao: { fundo: "linear-gradient(135deg,#12307A,#2E5BB8)", icone: "☀️" },
  aniversariantes: { fundo: "#FDFBF6", icone: "🎂", claro: true },
  avisos: { fundo: "linear-gradient(135deg,#12307A,#0B2260)", icone: "📣" },
  recados: { fundo: "#FDFBF6", icone: "📝", claro: true },
  evento: { fundo: "linear-gradient(135deg,#F29A0C,#FFC21C)", icone: "🎉" },
  promo: { fundo: "linear-gradient(135deg,#12307A,#1B4BB0)", icone: "🏷️" },
  agenda: { fundo: "#FDFBF6", icone: "📅", claro: true },
  sabia: { fundo: "linear-gradient(135deg,#7B5EA7,#2E8FF0)", icone: "💡" },
  frase: { fundo: "linear-gradient(135deg,#0B2260,#12307A)", icone: "💬" },
  qr: { fundo: "#FFFFFF", icone: "📱", claro: true },
  formatura: { fundo: "linear-gradient(180deg,#0B2260,#3A7BE0)", icone: "🎓" },
  fim: { fundo: "#FDFBF6", icone: "🌳", claro: true },
};

/** Cartões cujo conteúdo é uma lista simples (frases, curiosidades e datas comemorativas). */
const LISTA: Record<string, { tipo: TipoItem; titulo: string; dica: string; exemplo: string; comData?: boolean }> = {
  sabia: { tipo: "curiosidade", titulo: "Você sabia?", dica: "Passa uma por dia, girando sozinha. O trecho entre *asteriscos* sai em destaque.", exemplo: "O polvo tem *três corações*" },
  frase: { tipo: "frase", titulo: "Frase do dia", dica: "Passa uma por dia, girando sozinha. A palavra entre *asteriscos* sai em amarelo.", exemplo: "Ler é *viajar* sem sair do lugar" },
  saudacao: { tipo: "comemoracao", titulo: "Datas comemorativas", dica: "Aparecem na saudação naquele dia, todo ano. O resto da saudação (bom dia e a data) é automático.", exemplo: "Dia do Professor", comData: true },
};

/** O roteiro separado por função (o número no cartão continua sendo a ordem em que passa na TV). */
const GRUPOS: { nome: string; ids: string[] }[] = [
  { nome: "Recados da escola", ids: ["avisos", "recados", "agenda"] },
  { nome: "Conteúdo do dia", ids: ["saudacao", "sabia", "frase"] },
  { nome: "Automáticos", ids: ["aniversariantes", "evento", "promo", "qr", "formatura", "fim"] },
];

const LINK_TV ="https://www.escolaamadeus.com/tv";
const NA_RECEPCAO_NAO = "aniversariantes"; // a TV da recepção é aberta: sem nome de aluno

const mmss = (s: number) => `${Math.floor(s / 60)}min${String(s % 60).padStart(2, "0")}`;

export function Gerenciador({ itens, blocos: iniciais, telas, podeCriar, nomes, hoje, hojePassa, equipe }: {
  itens: ItemTv[]; blocos: BlocoTv[]; telas: TelaTv[]; podeCriar: boolean; nomes: Nomes; hoje: string; hojePassa: Record<string, number>; equipe: boolean;
}) {
  const router = useRouter();
  // a escola mexe em tudo, menos nas telas fixas do Arboria (./fixos.ts)
  const mexe = (id: string) => equipe || !FIXOS[id];
  const noLugar = (l: BlocoTv[]) => (equipe ? l : [...l.filter((b) => FIXOS[b.id] === "inicio"), ...l.filter((b) => !FIXOS[b.id]), ...l.filter((b) => FIXOS[b.id] === "fim")]);
  const [blocos, setBlocos] = useState(iniciais);
  // quando o servidor manda a lista de novo (depois de salvar, criar ou apagar), ela vale
  const [vindos, setVindos] = useState(iniciais);
  if (vindos !== iniciais) { setVindos(iniciais); setBlocos(iniciais); }
  const [criando, setCriando] = useState(false);
  // as telas criadas vêm na lista como "tela:<id>"
  const telaDe = (id: string) => (id.startsWith("tela:") ? telas.find((t) => t.id === id.slice(5)) : undefined);
  const vis = (id: string) => (id.startsWith("tela:") ? visualTela(telaDe(id)) : VISUAL[id] ?? { fundo: "#12307A", icone: "📺" });
  const nome = (id: string) => (id.startsWith("tela:") ? nomeTela(telaDe(id)) : nomes[id]?.nome ?? id);
  const [escolhido, setEscolhido] = useState<string>(iniciais.find((b) => nomes[b.id]?.equipe)?.id ?? iniciais[0]?.id);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [salvando, comecar] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; txt: string } | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aba, setAba] = useState<"conteudo" | "telas">("conteudo");
  const [giraAberto, setGiraAberto] = useState(false);
  const [gira, setGira] = useState<"sabia" | "frase" | "saudacao">("sabia");
  const tv = useRef<HTMLIFrameElement>(null);
  // no PC a TV é a deste servidor; no ar, o endereço público da TV
  const fonteTv = process.env.NODE_ENV === "production" ? LINK_TV : "/tv";

  const recarregarTv = () => { if (tv.current) tv.current.src = tv.current.src; };
  const mudou = () => { router.refresh(); recarregarTv(); };

  const rodar = (fn: () => Promise<{ ok: true } | { ok: false; erro: string }>) =>
    comecar(async () => {
      const r = await fn();
      setAviso(r.ok ? { ok: true, txt: "Salvo. Entra na próxima volta da TV." } : { ok: false, txt: r.erro });
      if (r.ok) mudou();
    });
  const ligar = (id: string, ativo: boolean) => {
    setBlocos(blocos.map((b) => (b.id === id ? { ...b, ativo } : b)));
    rodar(() => ligarBloco(id, ativo));
  };
  const gravar = (lista: BlocoTv[]) => {
    const novos = noLugar(lista);
    setBlocos(novos);
    comecar(async () => {
      const r = await ordenarBlocos(novos.map((b) => ({ id: b.id, segundos: b.segundos })));
      setAviso(r.ok ? { ok: true, txt: "Salvo. Entra na próxima volta da TV." } : { ok: false, txt: r.erro });
      if (r.ok) mudou();
    });
  };
  const muda = (id: string, p: Partial<BlocoTv>) => gravar(blocos.map((b) => (b.id === id ? { ...b, ...p } : b)));
  const soltarEm = (alvo: string) => {
    if (!arrastando || arrastando === alvo) return setArrastando(null);
    const n = blocos.filter((b) => b.id !== arrastando);
    n.splice(n.findIndex((b) => b.id === alvo), 0, blocos.find((b) => b.id === arrastando)!);
    setArrastando(null);
    gravar(n);
  };
  const mover = (id: string, d: -1 | 1) => {
    const i = blocos.findIndex((b) => b.id === id), j = i + d;
    if (j < 0 || j >= blocos.length) return;
    const n = [...blocos];
    [n[i], n[j]] = [n[j], n[i]];
    gravar(n);
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(LINK_TV); setCopiado(true); setTimeout(() => setCopiado(false), 2000); } catch { /* sem permissão */ }
  };

  const naTv = blocos.filter((b) => b.ativo && b.id !== NA_RECEPCAO_NAO);
  const volta = naTv.filter((b) => hojePassa[b.id]).reduce((s, b) => s + b.segundos * hojePassa[b.id], 0);
  const atual = blocos.find((b) => b.id === escolhido);

  const telaTv = (
    <section className="overflow-hidden rounded-3xl bg-[#0B1430] shadow-[0_20px_50px_rgba(18,48,122,.25)]">
      <div className="aspect-video w-full">
        <iframe ref={tv} src={fonteTv} title="A TV ao vivo" className="h-full w-full border-0" />
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm text-white/80">
        <span className="flex items-center gap-2 font-bold text-white"><span className="size-2.5 animate-pulse rounded-full bg-red-500" /> Ao vivo</span>
        <span className="truncate">{LINK_TV.replace("https://", "")}</span>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={copiar} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 font-bold text-[#1B3B7C]">
            {copiado ? <><Check className="size-4" /> Copiado</> : <><Copy className="size-4" /> Copiar o link</>}
          </button>
          <button type="button" onClick={recarregarTv} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-semibold hover:bg-white/10"><RefreshCw className="size-4" /> Recomeçar</button>
        </div>
      </div>
    </section>
  );

  return (
    <div>
      {criando && (
        <NovaTela
          onFechar={() => setCriando(false)}
          onCriada={(id) => { setCriando(false); setAba("telas"); if (id) setEscolhido(`tela:${id}`); mudou(); }}
        />
      )}
      {/* título */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-serifa)] text-3xl font-bold text-[#1B3B7C]">TV da recepção</h1>
          <p className="mt-1 text-[15px] text-[#5A6478]">{aba === "conteudo" ? "Escreva direto onde aparece. Entra na próxima volta da TV." : "Toque numa tela para ligar, desligar ou mudar a ordem."}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-2xl border border-dashed border-[#C9D3E4] px-4 py-2 text-sm text-[#8A95AA]" title="Vem no próximo passo">
          <span className="text-base">🎪</span> Modo evento <span className="text-xs">(em breve)</span>
        </div>
        {podeCriar && (
          <button type="button" onClick={() => setCriando(true)} className="inline-flex items-center gap-2 rounded-2xl bg-[#1B3B7C] px-5 py-2.5 text-[15px] font-bold text-white shadow-[0_8px_20px_rgba(27,59,124,.25)] hover:brightness-110">
            <Plus className="size-5" /> Nova tela
          </button>
        )}
      </div>

      <div className="mt-5 flex gap-1 border-b border-[#E3E8F2]">
        {([["conteudo", "O que passa"], ["telas", "Telas e ordem"]] as const).map(([id, rotulo]) => (
          <button key={id} type="button" onClick={() => setAba(id)} className={`-mb-px border-b-[3px] px-4 py-2 text-[15px] font-bold ${aba === id ? "border-[#FFC21C] text-[#1B3B7C]" : "border-transparent text-[#8A95AA] hover:text-[#1B3B7C]"}`}>
            {rotulo}
          </button>
        ))}
      </div>

      {aba === "conteudo" ? (
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          {/* o dia a dia: cada coisa no formato em que aparece na TV */}
          <div className="space-y-6">
            <EditorAgenda itens={itens} hoje={hoje} onMudou={mudou} />
            <div className="grid gap-6 lg:grid-cols-2">
              <EditorRecados itens={itens} hoje={hoje} onMudou={mudou} abrirNovo={0} />
              <AvisosDestaque itens={itens} hoje={hoje} onMudou={mudou} />
            </div>
            {podeCriar && (
              <section className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E8F2]">
                <h2 className="text-lg font-extrabold text-[#1B3B7C]">Telas criadas</h2>
                <p className="text-sm text-[#5A6478]">Avisos, formaturas, programações… Toque numa para mudar.</p>
                <ul className="mt-3 space-y-2">
                  {telas.map((t) => {
                    const v = visualTela(t);
                    const passa = !!hojePassa[`tela:${t.id}`];
                    return (
                      <li key={t.id}>
                        <button type="button" onClick={() => { setAba("telas"); setEscolhido(`tela:${t.id}`); }} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left hover:bg-[#F4F7FC]">
                          <span className={`flex h-9 w-14 shrink-0 items-center justify-center rounded-lg text-lg ring-1 ring-inset ring-black/10 ${passa ? "" : "opacity-40 grayscale"}`} style={{ background: v.fundo }}>{v.icone}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold text-[#1A2240]">{nomeTela(t)}</span>
                            <span className={`text-xs font-semibold ${passa ? "text-emerald-700" : "text-[#8A95AA]"}`}>{passa ? "passa hoje" : "não passa hoje"}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button type="button" onClick={() => setCriando(true)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#C9D3E4] py-4 text-[15px] font-bold text-[#1B3B7C] hover:border-[#1B3B7C] hover:bg-[#F4F7FC]">
                  <Plus className="size-5" /> Nova tela
                </button>
              </section>
            )}
            <section className="rounded-3xl bg-white p-5 ring-1 ring-[#E3E8F2]">
              <button type="button" onClick={() => setGiraAberto(!giraAberto)} aria-expanded={giraAberto} className="flex w-full items-center gap-2 text-left">
                <h2 className="text-lg font-extrabold text-[#1B3B7C]">Gira sozinho, um por dia</h2>
                <span className="text-sm text-[#8A95AA]">Você sabia?, frase do dia e datas comemorativas</span>
                <ChevronDown className={`ml-auto size-5 text-[#8A95AA] transition ${giraAberto ? "rotate-180" : ""}`} />
              </button>
              {giraAberto && (<>
              <div className="mt-3 flex flex-wrap gap-2">
                {(["sabia", "frase", "saudacao"] as const).map((id) => (
                  <button key={id} type="button" onClick={() => setGira(id)} className={`rounded-xl px-3 py-1.5 text-sm font-bold ${gira === id ? "bg-[#1B3B7C] text-white" : "bg-[#EEF2FA] text-[#1B3B7C]"}`}>
                    {LISTA[id].titulo}
                  </button>
                ))}
              </div>
              <div className="mt-4"><ListaSimples key={gira} conf={LISTA[gira]} itens={itens} hoje={hoje} origem="" onMudou={mudou} /></div>
              </>)}
            </section>
          </div>
          <aside className="space-y-3 xl:sticky xl:top-24 xl:self-start">
            {telaTv}
            <p className="px-1 text-sm text-[#5A6478]">Aniversariantes, próximo evento e QR codes entram sozinhos. O que vocês colocarem aqui entra na próxima volta da TV.</p>
          </aside>
        </div>
      ) : (
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* esquerda: a TV e o roteiro */}
        <div className="space-y-6">
          {telaTv}

          <section>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-lg font-extrabold text-[#1B3B7C]">O roteiro</h2>
              <span className="text-sm text-[#5A6478]">Uma volta: {mmss(volta)}.</span>
              <span className="ml-auto h-5 text-sm font-semibold">
                {salvando ? <span className="inline-flex items-center gap-1 text-[#5A6478]"><Loader2 className="size-4 animate-spin" /> salvando</span>
                  : aviso && <span className={aviso.ok ? "text-emerald-700" : "text-red-700"}>{aviso.txt}</span>}
              </span>
            </div>
            {/* as telas na ordem em que passam, uma embaixo da outra */}
            <p className="mt-1 text-sm text-[#8A95AA]">Arraste para mudar a ordem. As apagadas não passam hoje; as com cadeado são fixas.</p>
            <ol className="mt-3 space-y-2">
              {blocos.map((b, i) => {
                const v = vis(b.id);
                const fora = b.id === NA_RECEPCAO_NAO;
                const passa = b.ativo && !fora && !!hojePassa[b.id];
                const estado = !b.ativo ? "desligada" : fora ? "só na TV com login" : passa ? "passa hoje" : "vazia hoje";
                const funcao = telaDe(b.id) ? `Criada por vocês · ${formatoTela(telaDe(b.id))}` : GRUPOS.find((g) => g.ids.includes(b.id))?.nome ?? "";
                return (
                  <li
                    key={b.id}
                    draggable={mexe(b.id)}
                    onDragStart={() => setArrastando(b.id)}
                    onDragEnd={() => setArrastando(null)}
                    onDragOver={(e) => mexe(b.id) && e.preventDefault()}
                    onDrop={() => mexe(b.id) && soltarEm(b.id)}
                    onClick={() => setEscolhido(b.id)}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-2 pr-4 transition ${escolhido === b.id ? "ring-[3px] ring-[#FFC21C]" : "ring-1 ring-[#E3E8F2] hover:ring-[#B9C6DF]"} ${arrastando === b.id ? "opacity-40" : ""}`}
                  >
                    <span className="w-6 shrink-0 text-center text-sm font-extrabold tabular-nums text-[#8A95AA]">{i + 1}</span>
                    <span className={`flex h-11 w-[70px] shrink-0 items-center justify-center rounded-lg text-xl ring-1 ring-inset ring-black/10 ${passa ? "" : "opacity-40 grayscale"}`} style={{ background: v.fundo }}>{v.icone}</span>
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate text-[15px] font-bold ${passa ? "text-[#1A2240]" : "text-[#8A95AA]"}`}>{nome(b.id)}</span>
                      <span className="block truncate text-xs text-[#8A95AA]">{funcao}</span>
                    </span>
                    <span className={`hidden shrink-0 items-center gap-1.5 text-xs font-semibold sm:flex ${passa ? "text-emerald-700" : "text-[#8A95AA]"}`}>
                      <span className={`size-2 rounded-full ${passa ? "bg-emerald-500" : "bg-[#CBD3E1]"}`} /> {estado}
                    </span>
                    <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums text-[#5A6478]">{b.segundos}s</span>
                    {FIXOS[b.id] ? <Lock className="size-4 shrink-0 text-[#8A95AA]" /> : <GripVertical className={`size-4 shrink-0 ${mexe(b.id) ? "text-[#B9C6DF]" : "text-transparent"}`} />}
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* direita: o editor do cartão escolhido */}
        <aside className="xl:sticky xl:top-24 xl:self-start">
          {atual && (
            <div className="rounded-3xl bg-white p-5 shadow-[0_10px_30px_rgba(27,59,124,.1)] ring-1 ring-[#E3E8F2]">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-2xl text-2xl" style={{ background: vis(atual.id).fundo }}>{vis(atual.id).icone}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-[family-name:var(--font-serifa)] text-2xl font-bold text-[#1B3B7C]">{nome(atual.id)}</h2>
                  <p className="text-sm text-[#5A6478]">{telaDe(atual.id) ? `Criada por vocês · ${formatoTela(telaDe(atual.id))}` : nomes[atual.id]?.equipe || LISTA[atual.id] ? "Vocês colocam o conteúdo" : "Entra sozinho"}</p>
                </div>
                {mexe(atual.id) ? (
                  <label className="flex shrink-0 items-center gap-2 text-sm font-semibold text-[#1B3B7C]">
                    Na TV
                    <button
                      type="button"
                      role="switch"
                      aria-checked={atual.ativo}
                      onClick={() => ligar(atual.id, !atual.ativo)}
                      className={`h-6 w-11 rounded-full p-0.5 transition ${atual.ativo ? "bg-emerald-500" : "bg-[#CBD3E1]"}`}
                    >
                      <span className={`block size-5 rounded-full bg-white shadow transition ${atual.ativo ? "translate-x-5" : ""}`} />
                    </button>
                  </label>
                ) : (
                  <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#8A95AA]"><Lock className="size-4" /> Tela fixa</span>
                )}
              </div>

              {/* o conteúdo (o que a escola faz) */}
              <div className="mt-5">
                {telaDe(atual.id) ? (
                  <EditorTela
                    key={atual.id}
                    tela={telaDe(atual.id)}
                    formato={telaDe(atual.id)!.formato}
                    onPronto={(id) => { if (id) setEscolhido(`tela:${id}`); else setEscolhido(blocos[0]?.id); mudou(); }}
                  />
                ) : (
                  <Editor id={atual.id} itens={itens} hoje={hoje} origem={nomes[atual.id]?.origem ?? ""} onMudou={mudou} />
                )}
              </div>

              {/* ordem e tempo (as telas fixas, só a equipe Arboria) */}
              {mexe(atual.id) && (
                <div className="mt-5 border-t border-dashed border-[#D5DDEB] pt-4">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-[#8A95AA]">{FIXOS[atual.id] ? "Ajustes da equipe Arboria" : "Tempo e lugar"}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-[#1B3B7C]">
                    <span className="flex items-center gap-1">
                      Tempo
                      <button type="button" aria-label="Menos tempo" onClick={() => muda(atual.id, { segundos: Math.max(4, atual.segundos - 2) })} className="ml-1 inline-flex size-7 items-center justify-center rounded-lg bg-[#F4F7FC] hover:bg-[#E3E8F2]"><Minus className="size-3.5" /></button>
                      <span className="w-10 text-center tabular-nums text-[#1A2240]">{atual.segundos}s</span>
                      <button type="button" aria-label="Mais tempo" onClick={() => muda(atual.id, { segundos: Math.min(60, atual.segundos + 2) })} className="inline-flex size-7 items-center justify-center rounded-lg bg-[#F4F7FC] hover:bg-[#E3E8F2]"><Plus className="size-3.5" /></button>
                    </span>
                    <span className="flex items-center gap-1">
                      Lugar
                      <button type="button" aria-label="Passar antes" onClick={() => mover(atual.id, -1)} className="ml-1 inline-flex size-7 items-center justify-center rounded-lg bg-[#F4F7FC] hover:bg-[#E3E8F2]"><ChevronLeft className="size-4" /></button>
                      <span className="w-6 text-center tabular-nums text-[#1A2240]">{blocos.findIndex((b) => b.id === atual.id) + 1}</span>
                      <button type="button" aria-label="Passar depois" onClick={() => mover(atual.id, 1)} className="inline-flex size-7 items-center justify-center rounded-lg bg-[#F4F7FC] hover:bg-[#E3E8F2]"><ChevronRight className="size-4" /></button>
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>
      )}
    </div>
  );
}

function Editor({ id, itens, hoje, origem, onMudou }: { id: string; itens: ItemTv[]; hoje: string; origem: string; onMudou: () => void }) {
  if (id === "avisos") return <AvisosDestaque itens={itens} hoje={hoje} onMudou={onMudou} />;
  if (id === "recados") return <EditorRecados itens={itens} hoje={hoje} onMudou={onMudou} abrirNovo={0} />;
  if (id === "agenda") return <EditorAgenda itens={itens} hoje={hoje} onMudou={onMudou} />;
  if (LISTA[id]) return <ListaSimples key={id} conf={LISTA[id]} itens={itens} hoje={hoje} origem={id === "saudacao" ? origem : ""} onMudou={onMudou} />;
  const extra = id === NA_RECEPCAO_NAO
    ? "Na TV da recepção este cartão não aparece, porque o endereço é aberto e ele tem o nome dos alunos. Ele passa só na TV com login."
    : "";
  return (
    <div className="rounded-2xl bg-[#F4F7FC] p-4 text-[15px] leading-relaxed text-[#1A2240]">
      <p>{origem}.</p>
      {extra && <p className="mt-2 text-[#5A6478]">{extra}</p>}
      <p className="mt-2 text-sm text-[#5A6478]">Não precisa fazer nada: aqui só dá para ligar, desligar e mudar o tempo, no cartão.</p>
    </div>
  );
}

/** Frases, curiosidades e datas comemorativas: a lista com a de hoje em destaque, e o campo para pôr mais. */
function ListaSimples({ conf, itens, hoje, origem, onMudou }: {
  conf: (typeof LISTA)[string]; itens: ItemTv[]; hoje: string; origem: string; onMudou: () => void;
}) {
  const vazio: ItemForm = { tipo: conf.tipo, titulo: "", texto: "", icone: "", data: "", inicio: "", fim: "" };
  const [f, setF] = useState<ItemForm>(vazio);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const lista = itens
    .filter((i) => i.tipo === conf.tipo)
    .sort((a, b) => (conf.comData ? (a.data ?? "").slice(5).localeCompare((b.data ?? "").slice(5)) : 0));

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    comecar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
      depois?.();
      onMudou();
    });

  const campo = "w-full rounded-xl border border-[#D5DDEB] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]";
  const dia = (iso: string | null) => (iso ? `${iso.slice(8)}/${iso.slice(5, 7)}` : "");

  return (
    <div>
      {origem && <p className="mb-3 text-sm text-[#5A6478]">{origem}.</p>}
      <p className="text-sm text-[#5A6478]">{conf.dica}</p>

      {/* pôr mais ou alterar */}
      <div className={`mt-3 rounded-2xl p-3 ${f.id ? "bg-[#FFF6DA] ring-2 ring-[#FFC21C]" : "bg-[#F4F7FC]"}`}>
        <div className="flex gap-2">
          <input value={f.icone} onChange={(e) => setF({ ...f, icone: e.target.value })} placeholder="😀" title="Um emoji (opcional). No Windows: tecla Windows + ponto" className={`${campo.replace("w-full ", "")} w-14 shrink-0 text-center text-lg`} />
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} placeholder={`Ex.: ${conf.exemplo}`} className={`${campo} font-semibold`} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {conf.comData && (
            <label className="flex items-center gap-2 text-sm font-semibold text-[#1B3B7C]">
              Dia <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} className="rounded-lg border border-[#D5DDEB] bg-white px-2 py-1.5 text-sm" />
            </label>
          )}
          <div className="ml-auto flex gap-2">
            {f.id && <button type="button" onClick={() => setF(vazio)} className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-semibold text-[#5A6478] hover:bg-black/5"><X className="size-4" /> Cancelar</button>}
            <button
              type="button"
              disabled={pendente}
              onClick={() => rodar(() => salvarItem(f), () => setF(vazio))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pendente ? <Loader2 className="size-4 animate-spin" /> : f.id ? <Check className="size-4" /> : <Plus className="size-4" />} {f.id ? "Salvar" : "Colocar"}
            </button>
          </div>
        </div>
        {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
      </div>

      {/* a lista */}
      <ul className="mt-3 max-h-[52vh] space-y-1.5 overflow-y-auto pr-1">
        {!lista.length && <li className="rounded-xl bg-[#F4F7FC] p-3 text-sm text-[#5A6478]">Nada ainda.</li>}
        {lista.map((i) => {
          const hojeE = conf.comData && i.data?.slice(5) === hoje.slice(5);
          return (
            <li key={i.id} className={`group flex items-center gap-2 rounded-xl px-3 py-2 ${hojeE ? "bg-emerald-50 ring-1 ring-emerald-200" : "hover:bg-[#F4F7FC]"} ${i.ativo ? "" : "opacity-50"}`}>
              <span className="w-7 shrink-0 text-center text-lg">{i.icone ?? ""}</span>
              <p className="min-w-0 flex-1 text-[15px] text-[#1A2240]">
                {i.titulo.split(/(\*[^*]+\*)/).map((p, k) => (p.startsWith("*") ? <b key={k} className="text-[#C27A00]">{p.slice(1, -1)}</b> : <span key={k}>{p}</span>))}
              </p>
              {conf.comData && <span className={`shrink-0 text-xs font-bold ${hojeE ? "text-emerald-700" : "text-[#8A95AA]"}`}>{hojeE ? "hoje" : dia(i.data)}</span>}
              <div className="flex shrink-0 gap-0.5 opacity-60 group-hover:opacity-100">
                <button type="button" aria-label="Alterar" onClick={() => setF({ id: i.id, tipo: i.tipo, titulo: i.titulo, texto: i.texto, icone: i.icone ?? "", data: i.data ?? "", inicio: i.inicio ?? "", fim: i.fim ?? "" })} className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-black/5"><Pencil className="size-3.5" /></button>
                <button type="button" role="switch" aria-checked={i.ativo} aria-label={i.ativo ? "Tirar da TV" : "Voltar para a TV"} onClick={() => rodar(() => ativarItem(i.id, !i.ativo))} className={`mx-1 h-5 w-9 self-center rounded-full p-0.5 ${i.ativo ? "bg-emerald-500" : "bg-[#CBD3E1]"}`}>
                  <span className={`block size-4 rounded-full bg-white shadow transition ${i.ativo ? "translate-x-4" : ""}`} />
                </button>
                <button type="button" aria-label="Apagar" onClick={() => { if (window.confirm("Apagar da TV?")) rodar(() => apagarItem(i.id)); }} className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-red-50 hover:text-red-700"><Trash2 className="size-3.5" /></button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
