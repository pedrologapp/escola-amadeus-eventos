"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Check, Copy, Download, FileDown, ImagePlus, Loader2, Move, RotateCcw, Trash2, X } from "lucide-react";
import { MEDIDAS } from "@/lib/paineis";
import { carregarFontes, imagem, pdfComJpeg, pixelsPorCm } from "@/lib/painel-desenho";
import {
  CORES,
  ICONES,
  ILUSTRACOES,
  LOGO_BANNER,
  desenharBanner,
  folgaImg,
  pedidoHiggsfield,
  type Adesivo,
  type CaixasBanner,
  type Contorno,
  type LadoTexto,
  type OpcoesBanner,
} from "@/lib/painel-banner";

/**
 * Painel "Banner colorido": a ilustração 3D (pronta ou enviada) cobre o
 * painel e a frase em letra 3D vai no lado vazio, com o logo embaixo. Na
 * prévia dá para clicar e arrastar o fundo, a frase e os ícones.
 */

interface Minha {
  id: string;
  nome: string;
  url: string;
}

type Alvo = { tipo: "fundo" } | { tipo: "texto" } | { tipo: "adesivo"; id: string };

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function pintar(ctx: CanvasRenderingContext2D, W: number, H: number, url: string, o: OpcoesBanner, hd: boolean) {
  await carregarFontes();
  const [img, logo, ...ics] = await Promise.all([
    imagem(url),
    imagem(LOGO_BANNER),
    ...o.adesivos.map((a) => imagem(hd ? a.hd : a.src).catch(() => imagem(a.src))),
  ]);
  const mapa = new Map<string, HTMLImageElement>();
  o.adesivos.forEach((a, i) => mapa.set(a.src, ics[i]));
  return desenharBanner(ctx, W, H, img, logo, mapa, o);
}

const dentro = (c: { x: number; y: number; w: number; h: number }, x: number, y: number) => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h;

function Previa({
  url, o, setO, l, a, larg, alt, tamImg, sel, setSel,
}: {
  url: string;
  o: OpcoesBanner;
  setO: (o: OpcoesBanner) => void;
  l: number;
  a: number;
  larg: number;
  alt: number;
  tamImg: { w: number; h: number } | null;
  sel: Alvo | null;
  setSel: (s: Alvo | null) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [caixas, setCaixas] = useState<CaixasBanner>({ texto: null, adesivos: [] });
  const arrasto = useRef<{ alvo: Alvo; x: number; y: number; o: OpcoesBanner } | null>(null);
  const esc = Math.min(larg / l, alt / a);
  const W = Math.max(1, Math.round(l * esc)), H = Math.max(1, Math.round(a * esc));
  const chave = JSON.stringify([url, o, l, a, W, H]);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const off = document.createElement("canvas");
      off.width = W * dpr;
      off.height = H * dpr;
      const ctx = off.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cx = await pintar(ctx, W, H, url, o, false);
      const cv = ref.current;
      if (!vivo || !cv) return;
      cv.width = off.width;
      cv.height = off.height;
      cv.getContext("2d")!.drawImage(off, 0, 0);
      setCaixas(cx);
    })().catch(() => null);
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

  const ponto = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height, r };
  };

  const onDown = (e: React.PointerEvent) => {
    const p = ponto(e);
    let alvo: Alvo = { tipo: "fundo" };
    const ad = [...caixas.adesivos].reverse().find((c) => dentro(c.caixa, p.x, p.y));
    if (ad) alvo = { tipo: "adesivo", id: ad.id };
    else if (caixas.texto && dentro(caixas.texto, p.x, p.y)) alvo = { tipo: "texto" };
    setSel(alvo);
    arrasto.current = { alvo, x: e.clientX, y: e.clientY, o };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    const d = arrasto.current;
    if (!d) return;
    const r = ref.current!.getBoundingClientRect();
    const fx = (e.clientX - d.x) / r.width, fy = (e.clientY - d.y) / r.height;
    const s = d.o;
    if (d.alvo.tipo === "fundo") {
      const f = tamImg ? folgaImg(W, H, tamImg.w, tamImg.h, s.img.zoom) : { x: 0, y: 0 };
      const lim = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      setO({ ...s, img: { ...s.img, dx: lim(s.img.dx + fx, f.x), dy: lim(s.img.dy + fy, f.y) } });
    } else if (d.alvo.tipo === "texto") {
      setO({ ...s, texto: { ...s.texto, dx: s.texto.dx + fx, dy: s.texto.dy + fy } });
    } else {
      const id = d.alvo.id;
      setO({ ...s, adesivos: s.adesivos.map((x) => (x.id === id ? { ...x, x: x.x + fx, y: x.y + fy } : x)) });
    }
  };

  const fim = () => { arrasto.current = null; };

  const marca = sel?.tipo === "texto" ? caixas.texto : sel?.tipo === "adesivo" ? caixas.adesivos.find((c) => c.id === sel.id)?.caixa : sel?.tipo === "fundo" ? { x: 0, y: 0, w: W, h: H } : null;

  return (
    <div className="relative inline-block max-w-full" style={{ width: W }}>
      <canvas
        ref={ref}
        style={{ width: W, height: H, touchAction: "none" }}
        className="block max-w-full cursor-grab shadow-[0_14px_34px_rgba(0,0,0,.2)] active:cursor-grabbing"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={fim}
        onPointerCancel={fim}
      />
      {marca && (
        <div
          className="pointer-events-none absolute border-2 border-dashed border-amadeus-yellow"
          style={{ left: `${(marca.x / W) * 100}%`, top: `${(marca.y / H) * 100}%`, width: `${(marca.w / W) * 100}%`, height: `${(marca.h / H) * 100}%` }}
        />
      )}
    </div>
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

function Regua({ rotulo, valor, min, max, passo = 1, muda }: { rotulo: string; valor: number; min: number; max: number; passo?: number; muda: (v: number) => void }) {
  return (
    <label className="flex min-w-[220px] flex-1 items-center gap-3 text-sm font-semibold text-amadeus-blue">
      {rotulo}
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={(e) => muda(Number(e.target.value))} className="flex-1 accent-[#1B3B7C]" />
      <span className="w-12 text-right tabular-nums text-muted-foreground">{Math.round(valor)}%</span>
    </label>
  );
}

const NOVO_AJUSTE = { img: { zoom: 1, dx: 0, dy: 0 }, texto: { escala: 1, dx: 0, dy: 0 } };

export function EditorBanner({ inicial }: { inicial: { l1: string; dest: string; l3: string } }) {
  const [url, setUrl] = useState(ILUSTRACOES[0].arquivo);
  const [tamImg, setTamImg] = useState<{ w: number; h: number } | null>(null);
  const [minhas, setMinhas] = useState<Minha[]>([]);
  const [o, setO] = useState<OpcoesBanner>({
    frase: inicial.dest ? `*${inicial.dest}*` : "Ser criança é\n*brincar,*\nsonhar e\n*descobrir!*",
    data: inicial.dest ? inicial.l3 : "12 de outubro",
    lado: "esq",
    logo: true,
    espelhar: false,
    corDest: "amarelo",
    corComum: "azul",
    contorno: "branco",
    ...NOVO_AJUSTE,
    adesivos: [],
  });
  const [sel, setSel] = useState<Alvo | null>(null);
  const [l, setL] = useState(300);
  const [a, setA] = useState(100);
  const [lTxt, setLTxt] = useState("300");
  const [aTxt, setATxt] = useState("100");
  const [tema, setTema] = useState(inicial.dest || "Dia das Crianças");
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState<"pdf" | "jpg" | "zap" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [largura, setLargura] = useState(700);
  const caixa = useRef<HTMLDivElement>(null);
  const arquivo = useRef<HTMLInputElement>(null);
  const arquivoIcone = useRef<HTMLInputElement>(null);
  const contador = useRef(0);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let vivo = true;
    imagem(url).then((i) => vivo && setTamImg({ w: i.naturalWidth, h: i.naturalHeight })).catch(() => null);
    return () => { vivo = false; };
  }, [url]);

  const muda = (p: Partial<OpcoesBanner>) => setO((x) => ({ ...x, ...p }));
  const medida = (lv: string, av: string) => {
    setLTxt(lv);
    setATxt(av);
    const ln = Number(lv.replace(",", ".")), an = Number(av.replace(",", "."));
    if (ln >= 20 && an >= 20 && ln <= 800 && an <= 500) { setL(ln); setA(an); }
  };

  const adesivoSel = sel?.tipo === "adesivo" ? o.adesivos.find((x) => x.id === sel.id) : undefined;
  const mudaAdesivo = (id: string, p: Partial<Adesivo>) => muda({ adesivos: o.adesivos.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const tirarAdesivo = (id: string) => {
    muda({ adesivos: o.adesivos.filter((x) => x.id !== id) });
    setSel(null);
  };

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea")) return;
      if ((e.key === "Delete" || e.key === "Backspace") && sel?.tipo === "adesivo") tirarAdesivo(sel.id);
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const colocar = (src: string, hd: string, w = 0.1) => {
    const id = `a${++contador.current}`;
    // cada ícone novo entra um pouco deslocado para não cair em cima do anterior
    const n = o.adesivos.length % 5;
    muda({ adesivos: [...o.adesivos, { id, src, hd, x: 0.5 + n * 0.03, y: 0.5 + n * 0.05, w }] });
    setSel({ tipo: "adesivo", id });
  };

  const enviar = async (f: File | undefined) => {
    if (!f) return;
    setErro(null);
    const u = URL.createObjectURL(f);
    try {
      await imagem(u);
      setMinhas((x) => [...x, { id: `m:${Date.now()}`, nome: f.name.replace(/\.[^.]+$/, ""), url: u }]);
      setUrl(u);
      muda({ img: NOVO_AJUSTE.img });
    } catch {
      setErro("Não consegui abrir essa imagem. Envie um PNG ou JPG.");
    }
  };

  const enviarIcone = async (f: File | undefined) => {
    if (!f) return;
    setErro(null);
    const u = URL.createObjectURL(f);
    try {
      await imagem(u);
      colocar(u, u, 0.12);
    } catch {
      setErro("Não consegui abrir esse ícone. Envie um PNG (de preferência sem fundo).");
    }
  };

  const copiarPedido = async () => {
    await navigator.clipboard.writeText(pedidoHiggsfield(tema.trim() || "school event", o.lado));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
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
      ctx.imageSmoothingQuality = "high";
      await pintar(ctx, W, H, url, o, hd);
      const jpeg = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", hd ? 0.92 : 0.85));
      if (!jpeg) throw new Error("O navegador não conseguiu gerar o arquivo. Tente uma medida menor.");
      const nome = `painel-${semAcento(o.frase.replace(/\*/g, "").split("\n").join(" ").slice(0, 40)) || "banner"}-${l}x${a}cm`;
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
  const botao = "inline-flex items-center gap-1.5 rounded-xl border border-border bg-white px-3 py-1.5 text-sm font-semibold text-amadeus-blue hover:bg-amadeus-blue-50/60";
  const bolinha = (id: string) => {
    const c = CORES.find((x) => x.id === id)!;
    return `linear-gradient(180deg,${c.topo[0]},${c.topo[2]})`;
  };
  // nitidez da ilustração no tamanho real (ela é esticada para cobrir o painel)
  const dpiImg = tamImg ? Math.round(2.54 / (Math.max(l / tamImg.w, a / tamImg.h) / o.img.zoom)) : null;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <Passo n={1} titulo="Escolha a ilustração" dica="Ilustração 3D sem texto, com um lado vazio para a frase. Use uma pronta ou envie a sua.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ILUSTRACOES.map((c) => (
              <button key={c.id} type="button" onClick={() => { setUrl(c.arquivo); muda({ img: NOVO_AJUSTE.img }); }} className={`rounded-xl border-2 p-1.5 text-left ${url === c.arquivo ? "border-amadeus-blue" : "border-transparent hover:border-amadeus-blue-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.arquivo} alt="" className="aspect-[21/9] w-full rounded-lg object-cover" />
                <p className="mt-1 text-xs font-bold text-amadeus-blue">{c.nome}</p>
              </button>
            ))}
            {minhas.map((c) => (
              <div key={c.id} className={`relative rounded-xl border-2 p-1.5 ${url === c.url ? "border-amadeus-blue" : "border-transparent"}`}>
                <button type="button" onClick={() => { setUrl(c.url); muda({ img: NOVO_AJUSTE.img }); }} className="w-full text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt="" className="aspect-[21/9] w-full rounded-lg object-cover" />
                  <p className="mt-1 truncate text-xs font-bold text-amadeus-blue">{c.nome}</p>
                </button>
                <button type="button" aria-label="Tirar ilustração" onClick={() => { setMinhas((x) => x.filter((y) => y.id !== c.id)); if (url === c.url) setUrl(ILUSTRACOES[0].arquivo); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-muted-foreground"><X className="size-3.5" /></button>
              </div>
            ))}
            <button type="button" onClick={() => arquivo.current?.click()} className="flex aspect-[21/9] flex-col items-center justify-center gap-1 self-start rounded-xl border-2 border-dashed border-amadeus-blue-100 text-xs font-bold text-amadeus-blue hover:bg-amadeus-blue-50/50">
              <ImagePlus className="size-5" /> Usar uma ilustração minha
            </button>
            <input ref={arquivo} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { enviar(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <div className="mt-3 rounded-xl bg-amadeus-yellow-50 p-3">
            <p className="text-sm font-bold text-amadeus-blue">Criar uma ilustração nova no Higgsfield</p>
            <p className="text-xs text-muted-foreground">Escreva o tema, copie o pedido e cole no Higgsfield (formato 21:9). Depois envie a imagem aqui em “Usar uma ilustração minha”.</p>
            <div className="mt-2 flex gap-2">
              <input value={tema} onChange={(e) => setTema(e.target.value)} placeholder="Tema: Dia do Professor, Festa Junina…" className={campo} />
              <button type="button" onClick={copiarPedido} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white">
                {copiado ? <Check className="size-4" /> : <Copy className="size-4" />} {copiado ? "Copiado" : "Copiar pedido"}
              </button>
            </div>
          </div>
        </Passo>

        <Passo n={2} titulo="Frase" dica="Uma linha do painel por linha. Palavra entre *asteriscos* sai grande, na cor do destaque; as outras saem menores.">
          <textarea value={o.frase} onChange={(e) => muda({ frase: e.target.value })} rows={4} className={`${campo} font-bold`} />
          <input value={o.data} onChange={(e) => muda({ data: e.target.value })} placeholder="Data ou linha extra (opcional)" className={`${campo} mt-2`} />
          <div className="mt-3 space-y-2">
            {([["corDest", "Cor do destaque"], ["corComum", "Cor das outras palavras"]] as const).map(([k, r]) => (
              <div key={k} className="flex flex-wrap items-center gap-1.5">
                <span className="w-44 text-xs font-bold text-amadeus-blue">{r}</span>
                {CORES.map((c) => (
                  <button key={c.id} type="button" title={c.nome} aria-label={c.nome} onClick={() => muda({ [k]: c.id })} className={`size-7 rounded-full border-2 ${o[k] === c.id ? "border-amadeus-blue ring-2 ring-amadeus-blue/30" : "border-black/10"}`} style={{ background: bolinha(c.id) }} />
                ))}
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-44 text-xs font-bold text-amadeus-blue">Contorno das letras</span>
              {([["branco", "Branco"], ["marinho", "Azul-marinho"], ["nenhum", "Sem contorno"]] as [Contorno, string][]).map(([v, r]) => (
                <button key={v} type="button" onClick={() => muda({ contorno: v })} className={chip(o.contorno === v)}>{r}</button>
              ))}
            </div>
            <Regua rotulo="Tamanho da frase" valor={o.texto.escala * 100} min={40} max={200} muda={(v) => muda({ texto: { ...o.texto, escala: v / 100 } })} />
          </div>
        </Passo>

        <Passo n={3} titulo="Onde fica a frase" dica="Comece pelo lado vazio da ilustração; depois ajuste arrastando a frase na prévia.">
          <div className="flex flex-wrap gap-2">
            {([["esq", "À esquerda"], ["centro", "No meio"], ["dir", "À direita"]] as [LadoTexto, string][]).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ lado: v, texto: { ...o.texto, dx: 0, dy: 0 } })} className={chip(o.lado === v)}>{r}</button>
            ))}
            <span className="mx-1 w-px self-stretch bg-border" />
            <button type="button" onClick={() => muda({ espelhar: !o.espelhar })} className={chip(o.espelhar)}>Espelhar ilustração</button>
            <button type="button" onClick={() => muda({ logo: !o.logo })} className={chip(o.logo)}>Logo embaixo da frase</button>
          </div>
        </Passo>

        <Passo n={4} titulo="Ícones e enfeites" dica="Clique para colocar no painel e arraste na prévia até onde quiser.">
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8">
            {ICONES.map((c) => (
              <button key={c.id} type="button" title={c.nome} onClick={() => colocar(c.src, c.hd, c.id === "logo" || c.id === "p8" ? 0.2 : 0.1)} className="flex aspect-square items-center justify-center rounded-lg bg-[#12307A] p-1.5 hover:ring-2 hover:ring-amadeus-yellow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.src} alt={c.nome} className="max-h-full max-w-full object-contain" />
              </button>
            ))}
            <button type="button" title="Enviar um ícone meu" onClick={() => arquivoIcone.current?.click()} className="flex aspect-square flex-col items-center justify-center rounded-lg border-2 border-dashed border-amadeus-blue-100 text-[10px] font-bold leading-tight text-amadeus-blue">
              <ImagePlus className="size-4" /> Meu ícone
            </button>
            <input ref={arquivoIcone} type="file" accept="image/png,image/webp,image/jpeg" className="hidden" onChange={(e) => { enviarIcone(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Seu ícone fica melhor em PNG sem fundo (no Higgsfield dá para gerar um objeto 3D e tirar o fundo).</p>
        </Passo>

        <Passo n={5} titulo="Medida">
          <div className="flex flex-wrap gap-2">
            {MEDIDAS.map((m) => (
              <button key={m.rotulo} type="button" onClick={() => medida(String(m.l).replace(".", ","), String(m.a).replace(".", ","))} className={chip(l === m.l && a === m.a)}>{m.rotulo}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">Largura <input value={lTxt} onChange={(e) => medida(e.target.value, aTxt)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
            <label className="flex items-center gap-2">Altura <input value={aTxt} onChange={(e) => medida(lTxt, e.target.value)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">A ilustração sempre cobre o painel todo; depois de mudar a medida, arraste o fundo e use o zoom para escolher a parte que aparece.</p>
        </Passo>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Banner colorido · {String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm</p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Move className="size-3.5" /> Clique e arraste a frase, os ícones ou o fundo.</p>
          <div ref={caixa} className="mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:18px_18px] p-3">
            <Previa url={url} o={o} setO={setO} l={l} a={a} larg={Math.max(200, largura - 24)} alt={560} tamImg={tamImg} sel={sel} setSel={setSel} />
          </div>

          {/* ajustes do que está selecionado */}
          <div className="mt-3 min-h-[44px] rounded-xl bg-amadeus-blue-50/50 px-3 py-2">
            {!sel && <p className="py-1.5 text-xs text-muted-foreground">Clique em algo na prévia para ajustar.</p>}
            {sel?.tipo === "fundo" && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase text-amadeus-blue">Fundo</span>
                <Regua rotulo="Zoom" valor={o.img.zoom * 100} min={100} max={250} muda={(v) => muda({ img: { ...o.img, zoom: v / 100 } })} />
                <button type="button" onClick={() => muda({ img: NOVO_AJUSTE.img })} className={botao}><RotateCcw className="size-3.5" /> Centralizar</button>
              </div>
            )}
            {sel?.tipo === "texto" && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase text-amadeus-blue">Frase</span>
                <Regua rotulo="Tamanho" valor={o.texto.escala * 100} min={40} max={200} muda={(v) => muda({ texto: { ...o.texto, escala: v / 100 } })} />
                <button type="button" onClick={() => muda({ texto: NOVO_AJUSTE.texto })} className={botao}><RotateCcw className="size-3.5" /> Voltar ao lugar</button>
              </div>
            )}
            {adesivoSel && (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase text-amadeus-blue">Ícone</span>
                <Regua rotulo="Tamanho" valor={adesivoSel.w * 100} min={2} max={60} muda={(v) => mudaAdesivo(adesivoSel.id, { w: v / 100 })} />
                <button type="button" onClick={() => muda({ adesivos: [...o.adesivos.filter((x) => x.id !== adesivoSel.id), adesivoSel] })} className={botao}><ArrowUp className="size-3.5" /> Para a frente</button>
                <button type="button" onClick={() => tirarAdesivo(adesivoSel.id)} className={`${botao} text-red-700`}><Trash2 className="size-3.5" /> Apagar</button>
              </div>
            )}
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
          {dpiImg !== null && (
            <p className={`mt-2 text-xs ${dpiImg < 40 ? "font-semibold text-amber-700" : "text-muted-foreground"}`}>
              A frase e o logo saem nítidos em qualquer tamanho. A ilustração ({tamImg!.w} × {tamImg!.h} px) fica com uns {dpiImg} dpi no tamanho real
              {dpiImg < 40 ? ": pode ficar borrada de perto. Gere a ilustração em 4K ou amplie antes de mandar para a gráfica." : ", bom para ver de longe."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
