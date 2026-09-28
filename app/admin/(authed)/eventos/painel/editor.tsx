"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileDown, Loader2, Sparkles, X } from "lucide-react";
import { COMPOSICOES, MARCA_30, MEDIDAS, type Composicao } from "@/lib/paineis";
import { carregarFontes, desenhar, imagem, pdfComJpeg, pixelsPorCm, recursos, type Textos } from "@/lib/painel-desenho";
import { CADERNOS, FUNDOS, desenharCaderno, type Alinhamento, type ComposicaoCaderno, type PosicaoTexto } from "@/lib/painel-caderno";
import { ICONES } from "@/lib/painel-icones";
import { desenharComIa } from "./actions";

/**
 * Montagem do painel em etapas (29/09/2026): tema → fundo → frase → onde fica
 * a frase → desenhos (da biblioteca ou criados pela IA) → medida e baixar.
 * A prévia acompanha ao lado. Os 6 painéis com as peças da marca continuam
 * como opção, no fim da página.
 */

type Escolha =
  | { tipo: "pecas"; c: Composicao }
  | { tipo: "caderno"; c: ComposicaoCaderno; icones: string[]; fundo: string; posicao: PosicaoTexto; alinhar: Alinhamento };

interface DesenhoIa {
  id: string; // "ia:1"
  pedido: string;
  img: HTMLImageElement;
  url: string;
}

const MAX_ICONES = 6;

const nomeArquivo = (t: Textos, l: number, a: number) =>
  `painel-${(t.dest || "evento").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${l}x${a}cm`;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function pintar(ctx: CanvasRenderingContext2D, e: Escolha, W: number, H: number, t: Textos, l: number, a: number, hd: boolean, extras: Map<string, HTMLImageElement>) {
  await carregarFontes();
  if (e.tipo === "pecas") {
    const img = await recursos(e.c, hd);
    desenhar(ctx, e.c, W, H, t, img, l, a);
  } else {
    const logo = await imagem(MARCA_30);
    desenharCaderno(ctx, e.c, W, H, t, logo, e.icones, e.fundo, { posicao: e.posicao, alinhar: e.alinhar, extras });
  }
}

function Previa({ e, t, l, a, larg, alt, extras, onClick, ativo, rotulo }: { e: Escolha; t: Textos; l: number; a: number; larg: number; alt: number; extras: Map<string, HTMLImageElement>; onClick?: () => void; ativo?: boolean; rotulo?: { nome: string; uso: string } }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const esc = Math.min(larg / l, alt / a);
  const W = Math.max(1, Math.round(l * esc)), H = Math.max(1, Math.round(a * esc));
  const chave = JSON.stringify([e.c.id, e.tipo === "caderno" ? [e.icones, e.fundo, e.posicao, e.alinhar] : null, t, l, a, W, H, [...extras.keys()]]);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const cv = ref.current;
      if (!cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const off = document.createElement("canvas");
      off.width = W * dpr;
      off.height = H * dpr;
      const ctx = off.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      await pintar(ctx, e, W, H, t, l, a, false, extras);
      if (!vivo) return;
      cv.width = off.width;
      cv.height = off.height;
      cv.getContext("2d")!.drawImage(off, 0, 0);
    })().catch(() => null);
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  const canvas = <canvas ref={ref} style={{ width: W, height: H }} className="block max-w-full shadow-[0_14px_34px_rgba(0,0,0,.25)]" />;
  if (!onClick) return canvas;
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border-2 p-2 text-left transition ${ativo ? "border-amadeus-blue bg-amadeus-blue-50" : "border-transparent bg-white hover:border-amadeus-blue-100"}`}>
      <div className="flex h-[110px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:14px_14px]">{canvas}</div>
      <p className="mt-1.5 text-sm font-bold text-amadeus-blue">{rotulo?.nome ?? e.c.nome}</p>
      {rotulo?.uso && <p className="text-xs leading-snug text-muted-foreground">{rotulo.uso}</p>}
    </button>
  );
}

function Passo({ n, titulo, dica, children }: { n: number; titulo: string; dica?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex items-baseline gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-amadeus-blue text-xs font-extrabold text-white">{n}</span>
        <h2 className="text-sm font-extrabold text-amadeus-blue">{titulo}</h2>
      </div>
      {dica && <p className="ml-8 mt-0.5 text-xs text-muted-foreground">{dica}</p>}
      <div className="ml-8 mt-3">{children}</div>
    </section>
  );
}

export function EditorPainel({ inicial }: { inicial: Textos }) {
  const [t, setT] = useState<Textos>(inicial);
  const [l, setL] = useState(300);
  const [a, setA] = useState(100);
  const [lTxt, setLTxt] = useState("300");
  const [aTxt, setATxt] = useState("100");
  const inicialCad = CADERNOS[0];
  const [cad, setCad] = useState<Extract<Escolha, { tipo: "caderno" }>>({ tipo: "caderno", c: inicialCad, icones: inicialCad.icones, fundo: inicialCad.fundo, posicao: "meio", alinhar: "esq" });
  const [pecas, setPecas] = useState<Composicao | null>(null); // escolheu um dos 6 com peças da marca
  const [desenhosIa, setDesenhosIa] = useState<DesenhoIa[]>([]);
  const [pedido, setPedido] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);
  const [gerando, setGerando] = useState<"pdf" | "jpg" | "zap" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [largura, setLargura] = useState(700);
  const caixa = useRef<HTMLDivElement>(null);

  const escolha: Escolha = pecas ? { tipo: "pecas", c: pecas } : cad;
  const extras = new Map(desenhosIa.map((d) => [d.id, d.img]));

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const medida = (lv: string, av: string) => {
    setLTxt(lv);
    setATxt(av);
    const ln = Number(lv.replace(",", ".")), an = Number(av.replace(",", "."));
    if (ln >= 20 && an >= 20 && ln <= 500 && an <= 500) { setL(ln); setA(an); }
  };
  const mudar = (p: Partial<typeof cad>) => { setPecas(null); setCad({ ...cad, ...p }); };
  const alternarIcone = (id: string) => {
    const tem = cad.icones.includes(id);
    mudar({ icones: tem ? cad.icones.filter((x) => x !== id) : cad.icones.length >= MAX_ICONES ? cad.icones : [...cad.icones, id] });
  };

  const criarDesenho = async () => {
    setErroIa(null);
    setCriando(true);
    try {
      const r = await desenharComIa(pedido);
      if (!r.ok) throw new Error(r.erro);
      const url = URL.createObjectURL(new Blob([r.svg], { type: "image/svg+xml" }));
      const img = await imagem(url);
      const id = `ia:${Date.now()}`;
      setDesenhosIa((d) => [...d, { id, pedido, img, url }]);
      // entra direto como primeiro desenho (vai para a polaroid principal)
      mudar({ icones: [id, ...cad.icones.filter((x) => x !== id)].slice(0, MAX_ICONES) });
      setPedido("");
    } catch (e) {
      setErroIa((e as Error).message);
    } finally {
      setCriando(false);
    }
  };

  const gerar = async (tipo: "pdf" | "jpg" | "zap") => {
    setErro(null);
    setGerando(tipo);
    try {
      const hd = tipo !== "zap";
      const ppc = hd ? pixelsPorCm(l, a) : 1600 / Math.max(l, a);
      const W = Math.round(l * ppc), H = Math.round(a * ppc);
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("O navegador não conseguiu criar uma imagem desse tamanho.");
      await pintar(ctx, escolha, W, H, t, l, a, hd, extras);
      const jpeg = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", hd ? 0.92 : 0.85));
      if (!jpeg) throw new Error("O navegador não conseguiu gerar o arquivo. Tente uma medida menor.");
      const nome = nomeArquivo(t, l, a);
      if (tipo === "pdf") baixar(await pdfComJpeg(jpeg, l, a, W, H), `${nome}.pdf`);
      else baixar(jpeg, `${nome}${tipo === "zap" ? "-previa" : ""}.jpg`);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setGerando(null);
    }
  };

  const campo = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-amadeus-blue";
  const chip = (on: boolean) => `rounded-xl px-3 py-1.5 text-sm font-semibold ${on ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`;
  const dpi = Math.round(pixelsPorCm(l, a) * 2.54);
  const nomeDesenho = (id: string) => desenhosIa.find((d) => d.id === id)?.pedido ?? ICONES.find((i) => i.id === id)?.nome ?? id;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* etapas */}
      <div className="space-y-4">
        <Passo n={1} titulo="Comece por um tema" dica="Opcional: traz fundo e desenhos prontos, e você muda o que quiser depois.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CADERNOS.map((c) => (
              <button key={c.id} type="button" onClick={() => mudar({ c, icones: c.icones, fundo: c.fundo })} className={chip(!pecas && cad.c.id === c.id)}>
                {c.nome}
              </button>
            ))}
          </div>
        </Passo>

        <Passo n={2} titulo="Fundo">
          <div className="flex flex-wrap gap-2">
            {FUNDOS.map((f) => (
              <button key={f.id} type="button" onClick={() => mudar({ fundo: f.id })} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 text-xs font-semibold ${!pecas && cad.fundo === f.id ? "border-amadeus-blue" : "border-transparent bg-muted/40"}`}>
                <span className="size-5 rounded-md border border-black/10" style={{ background: f.papel ? "repeating-linear-gradient(#FDFBF6 0 4px,#DCE5F1 4px 5px)" : `linear-gradient(135deg,${f.cores![0]},${f.cores![1]})` }} />
                {f.nome}
              </button>
            ))}
          </div>
        </Passo>

        <Passo n={3} titulo="Frase" dica="Painel é decoração: quanto menos texto, mais bonito.">
          <div className="grid gap-2">
            <input value={t.l1} onChange={(e) => setT({ ...t, l1: e.target.value })} placeholder="Linha de cima (ex.: vem aí o)" className={campo} />
            <input value={t.dest} onChange={(e) => setT({ ...t, dest: e.target.value })} placeholder="Frase principal (nome do evento)" className={`${campo} font-bold`} />
            <input value={t.l3} onChange={(e) => setT({ ...t, l3: e.target.value })} placeholder="Etiqueta (ex.: 12 de outubro)" className={campo} />
          </div>
        </Passo>

        <Passo n={4} titulo="Onde fica a frase">
          <div className="flex flex-wrap gap-2">
            {([["cima", "Em cima"], ["meio", "No meio"], ["baixo", "Embaixo"]] as const).map(([v, r]) => (
              <button key={v} type="button" onClick={() => mudar({ posicao: v })} className={chip(!pecas && cad.posicao === v)}>{r}</button>
            ))}
            <span className="mx-1 w-px self-stretch bg-border" />
            {([["esq", "À esquerda"], ["centro", "Centralizada"]] as const).map(([v, r]) => (
              <button key={v} type="button" onClick={() => mudar({ alinhar: v })} className={chip(!pecas && cad.alinhar === v)}>{r}</button>
            ))}
          </div>
        </Passo>

        <Passo n={5} titulo={`Desenhos (${cad.icones.length} de ${MAX_ICONES})`} dica="Os dois primeiros vão nas fotos coladas; os outros ficam soltos. Toque para ligar ou desligar.">
          <div className="rounded-xl bg-amadeus-yellow-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amadeus-blue"><Sparkles className="size-4" /> Criar um desenho com IA</p>
            <p className="text-xs text-muted-foreground">Escreva do seu jeito o que quer ver. A IA desenha no mesmo estilo dos outros (leva uns 40 segundos).</p>
            <div className="mt-2 flex gap-2">
              <input value={pedido} onChange={(e) => setPedido(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pedido.trim().length >= 3 && !criando && criarDesenho()} placeholder="Ex.: crianças dançando quadrilha" className={campo} />
              <button type="button" disabled={criando || pedido.trim().length < 3} onClick={criarDesenho} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {criando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {criando ? "Desenhando…" : "Desenhar"}
              </button>
            </div>
            {erroIa && <p className="mt-2 text-xs text-red-700">{erroIa}</p>}
            {desenhosIa.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {desenhosIa.map((d) => {
                  const pos = cad.icones.indexOf(d.id);
                  return (
                    <div key={d.id} className={`relative flex items-center gap-2 rounded-xl border-2 bg-white p-1.5 pr-2 ${pos >= 0 ? "border-amadeus-blue" : "border-transparent"}`}>
                      <button type="button" onClick={() => alternarIcone(d.id)} className="flex items-center gap-2 text-left">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={d.url} alt="" className="size-12 rounded-lg bg-[#FDFBF6] object-contain" />
                        <span className="max-w-[140px] text-xs font-semibold leading-tight">{pos >= 0 ? `${pos + 1}. ` : ""}{d.pedido}</span>
                      </button>
                      <button type="button" aria-label="Apagar desenho" onClick={() => { setDesenhosIa((x) => x.filter((y) => y.id !== d.id)); mudar({ icones: cad.icones.filter((x) => x !== d.id) }); }} className="text-muted-foreground"><X className="size-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <p className="mb-1.5 mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Ou escolha da biblioteca</p>
          <div className="flex flex-wrap gap-1.5">
            {ICONES.map((i) => {
              const pos = cad.icones.indexOf(i.id);
              return (
                <button key={i.id} type="button" onClick={() => alternarIcone(i.id)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${pos >= 0 ? "bg-amadeus-blue text-white" : "bg-muted/60 text-foreground hover:bg-amadeus-blue-50"}`}>
                  {pos >= 0 ? `${pos + 1}. ` : ""}{i.nome}
                </button>
              );
            })}
          </div>
          {cad.icones.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Na ordem: {cad.icones.map(nomeDesenho).join(" · ")}</p>}
        </Passo>

        <Passo n={6} titulo="Medida">
          <div className="flex flex-wrap gap-2">
            {MEDIDAS.map((m) => (
              <button key={m.rotulo} type="button" onClick={() => medida(String(m.l).replace(".", ","), String(m.a).replace(".", ","))} className={chip(l === m.l && a === m.a)}>{m.rotulo}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">Largura <input value={lTxt} onChange={(e) => medida(e.target.value, aTxt)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
            <label className="flex items-center gap-2">Altura <input value={aTxt} onChange={(e) => medida(lTxt, e.target.value)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Qualquer medida de 20 cm a 5 m.</p>
        </Passo>

        <section className="rounded-2xl border border-dashed border-border p-4">
          <p className="text-sm font-bold text-amadeus-blue">Ou use um painel com as peças da marca</p>
          <p className="mb-2 text-xs text-muted-foreground">Os modelos no estilo da entrada e do pátio da escola (usam a frase e a medida acima).</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COMPOSICOES.map((c) => (
              <Previa key={c.id} e={{ tipo: "pecas", c }} t={t} l={l} a={a} larg={170} alt={90} extras={extras} onClick={() => setPecas(c)} ativo={pecas?.id === c.id} rotulo={{ nome: c.nome, uso: "" }} />
            ))}
          </div>
          {pecas && <button type="button" onClick={() => setPecas(null)} className="mt-2 text-xs font-semibold text-amadeus-blue underline">Voltar para o painel ilustrado</button>}
        </section>
      </div>

      {/* prévia fixa */}
      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">{pecas ? pecas.nome : `Painel ilustrado · ${cad.c.nome}`} · {String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm</p>
          <div ref={caixa} className="mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:18px_18px] p-3">
            <Previa e={escolha} t={t} l={l} a={a} larg={Math.max(200, largura - 24)} alt={560} extras={extras} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={!!gerando} onClick={() => gerar("pdf")} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {gerando === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} PDF para a gráfica
            </button>
            <button type="button" disabled={!!gerando} onClick={() => gerar("jpg")} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-amadeus-blue disabled:opacity-50">
              {gerando === "jpg" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Imagem em alta (JPG)
            </button>
            <button type="button" disabled={!!gerando} onClick={() => gerar("zap")} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50">
              {gerando === "zap" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Prévia para o WhatsApp
            </button>
          </div>
          {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
          <p className="mt-2 text-xs text-muted-foreground">O PDF sai no tamanho real ({String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm, {dpi} dpi). Os desenhos da IA ficam guardados só enquanto esta página estiver aberta.</p>
        </div>
      </div>
    </div>
  );
}
