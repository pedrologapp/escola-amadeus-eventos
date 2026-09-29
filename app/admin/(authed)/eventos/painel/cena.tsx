"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileDown, Loader2, Sparkles, X } from "lucide-react";
import { MARCA_30, MEDIDAS } from "@/lib/paineis";
import { carregarFontes, imagem, pdfComJpeg, pixelsPorCm } from "@/lib/painel-desenho";
import { CENAS, FUNDOS_CENA, desenharCena, type LetraFrase, type OpcoesCena, type PosFrase, type PosLogo } from "@/lib/painel-cena";
import { desenharCenaIa } from "./actions";

/**
 * Painel "Cena ilustrada": escolhe a cena (pronta ou pedida à IA), a frase e
 * onde ela fica, onde vai o logo, o fundo e a medida. A prévia acompanha.
 */

interface CenaIa {
  id: string;
  pedido: string;
  url: string;
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const nomeArquivo = (dest: string, l: number, a: number) =>
  `painel-${(dest || "evento").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${l}x${a}cm`;

async function pintar(ctx: CanvasRenderingContext2D, W: number, H: number, urlCena: string, o: OpcoesCena) {
  await carregarFontes();
  const [img, logo] = await Promise.all([imagem(urlCena), imagem(MARCA_30)]);
  desenharCena(ctx, W, H, img, logo, o);
}

function Previa({ url, o, l, a, larg, alt }: { url: string; o: OpcoesCena; l: number; a: number; larg: number; alt: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
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
      await pintar(ctx, W, H, url, o);
      const cv = ref.current;
      if (!vivo || !cv) return;
      cv.width = off.width;
      cv.height = off.height;
      cv.getContext("2d")!.drawImage(off, 0, 0);
    })().catch(() => null);
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);
  return <canvas ref={ref} style={{ width: W, height: H }} className="block max-w-full shadow-[0_14px_34px_rgba(0,0,0,.2)]" />;
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

export function EditorCena({ inicial }: { inicial: { l1: string; dest: string; l3: string } }) {
  const [url, setUrl] = useState(CENAS[0].arquivo);
  const [o, setO] = useState<OpcoesCena>({
    fundo: "creme",
    frase: "cima",
    alinhar: "centro",
    logo: "sup-esq",
    letra: "mao",
    textos: inicial.dest ? inicial : { l1: "", dest: "Como é bom ser criança...!", l3: "12 de outubro" },
  });
  const [l, setL] = useState(300);
  const [a, setA] = useState(100);
  const [lTxt, setLTxt] = useState("300");
  const [aTxt, setATxt] = useState("100");
  const [cenasIa, setCenasIa] = useState<CenaIa[]>([]);
  const [pedido, setPedido] = useState("");
  const [criando, setCriando] = useState(false);
  const [erroIa, setErroIa] = useState<string | null>(null);
  const [gerando, setGerando] = useState<"pdf" | "jpg" | "zap" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [largura, setLargura] = useState(700);
  const caixa = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const muda = (p: Partial<OpcoesCena>) => setO({ ...o, ...p });
  const medida = (lv: string, av: string) => {
    setLTxt(lv);
    setATxt(av);
    const ln = Number(lv.replace(",", ".")), an = Number(av.replace(",", "."));
    if (ln >= 20 && an >= 20 && ln <= 500 && an <= 500) { setL(ln); setA(an); }
  };
  const formato = l >= a * 1.35 ? "largo" : a >= l * 1.35 ? "alto" : "quad";

  const criarCena = async () => {
    setErroIa(null);
    setCriando(true);
    try {
      const r = await desenharCenaIa(pedido, formato);
      if (!r.ok) throw new Error(r.erro);
      const u = URL.createObjectURL(new Blob([r.svg], { type: "image/svg+xml" }));
      await imagem(u);
      setCenasIa((c) => [...c, { id: `ia:${Date.now()}`, pedido, url: u }]);
      setUrl(u);
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
      await pintar(ctx, W, H, url, o);
      const jpeg = await new Promise<Blob | null>((ok) => cv.toBlob(ok, "image/jpeg", hd ? 0.92 : 0.85));
      if (!jpeg) throw new Error("O navegador não conseguiu gerar o arquivo. Tente uma medida menor.");
      const nome = nomeArquivo(o.textos.dest, l, a);
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
  const logos: [PosLogo, string][] = [["sup-esq", "Em cima, à esquerda"], ["sup-dir", "Em cima, à direita"], ["acima", "Junto da frase"], ["inf-esq", "Embaixo, à esquerda"], ["inf-dir", "Embaixo, à direita"], ["nenhum", "Sem logo"]];

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <Passo n={1} titulo="Escolha a cena" dica="Desenhos prontos no estilo da escola, ou peça uma cena nova para a IA.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {CENAS.map((c) => (
              <button key={c.id} type="button" onClick={() => setUrl(c.arquivo)} className={`rounded-xl border-2 bg-[#FDFBF6] p-1.5 text-left ${url === c.arquivo ? "border-amadeus-blue" : "border-transparent hover:border-amadeus-blue-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.arquivo} alt="" className="aspect-[3/1] w-full object-contain" />
                <p className="mt-1 text-xs font-bold text-amadeus-blue">{c.nome}</p>
                <p className="text-[11px] leading-tight text-muted-foreground">{c.uso}</p>
              </button>
            ))}
            {cenasIa.map((c) => (
              <div key={c.id} className={`relative rounded-xl border-2 bg-[#FDFBF6] p-1.5 ${url === c.url ? "border-amadeus-blue" : "border-transparent"}`}>
                <button type="button" onClick={() => setUrl(c.url)} className="w-full text-left">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.url} alt="" className="aspect-[3/1] w-full object-contain" />
                  <p className="mt-1 text-xs font-bold text-amadeus-blue">{c.pedido}</p>
                </button>
                <button type="button" aria-label="Apagar cena" onClick={() => { setCenasIa((x) => x.filter((y) => y.id !== c.id)); if (url === c.url) setUrl(CENAS[0].arquivo); }} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-muted-foreground"><X className="size-3.5" /></button>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-amadeus-yellow-50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-amadeus-blue"><Sparkles className="size-4" /> Pedir uma cena nova para a IA</p>
            <p className="text-xs text-muted-foreground">Descreva do seu jeito: “crianças plantando árvores no pátio”, “festa das mães com flores”. Leva cerca de 1 minuto.</p>
            <div className="mt-2 flex gap-2">
              <input value={pedido} onChange={(e) => setPedido(e.target.value)} onKeyDown={(e) => e.key === "Enter" && pedido.trim().length >= 3 && !criando && criarCena()} placeholder="Descreva a cena" className={campo} />
              <button type="button" disabled={criando || pedido.trim().length < 3} onClick={criarCena} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-50">
                {criando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {criando ? "Desenhando…" : "Desenhar"}
              </button>
            </div>
            {erroIa && <p className="mt-2 text-xs text-red-700">{erroIa}</p>}
          </div>
        </Passo>

        <Passo n={2} titulo="Frase">
          <div className="grid gap-2">
            <input value={o.textos.l1} onChange={(e) => muda({ textos: { ...o.textos, l1: e.target.value } })} placeholder="Linha pequena de cima (opcional)" className={campo} />
            <input value={o.textos.dest} onChange={(e) => muda({ textos: { ...o.textos, dest: e.target.value } })} placeholder="Frase principal" className={`${campo} font-bold`} />
            <input value={o.textos.l3} onChange={(e) => muda({ textos: { ...o.textos, l3: e.target.value } })} placeholder="Linha de baixo (opcional)" className={campo} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {([["mao", "Letra de mão"], ["caderno", "Letra do caderno"]] as [LetraFrase, string][]).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ letra: v })} className={chip(o.letra === v)}>{r}</button>
            ))}
          </div>
        </Passo>

        <Passo n={3} titulo="Onde fica a frase">
          <div className="flex flex-wrap gap-2">
            {([["cima", "Em cima"], ["baixo", "Embaixo"]] as [PosFrase, string][]).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ frase: v })} className={chip(o.frase === v)}>{r}</button>
            ))}
            <span className="mx-1 w-px self-stretch bg-border" />
            {([["centro", "Centralizada"], ["esq", "À esquerda"]] as const).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ alinhar: v })} className={chip(o.alinhar === v)}>{r}</button>
            ))}
          </div>
        </Passo>

        <Passo n={4} titulo="Onde fica o logo da escola">
          <div className="flex flex-wrap gap-2">
            {logos.map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ logo: v })} className={chip(o.logo === v)}>{r}</button>
            ))}
          </div>
        </Passo>

        <Passo n={5} titulo="Fundo">
          <div className="flex flex-wrap gap-2">
            {FUNDOS_CENA.map((f) => (
              <button key={f.id} type="button" onClick={() => muda({ fundo: f.id })} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 text-xs font-semibold ${o.fundo === f.id ? "border-amadeus-blue" : "border-transparent bg-muted/40"}`}>
                <span className="size-5 rounded-md border border-black/10" style={{ background: f.pauta ? "repeating-linear-gradient(#FDFBF6 0 4px,#DCE5F1 4px 5px)" : `linear-gradient(180deg,${f.cores[0]},${f.cores[1]})` }} />
                {f.nome}
              </button>
            ))}
          </div>
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
          <p className="mt-1 text-xs text-muted-foreground">As cenas prontas são deitadas; para painel em pé, a IA consegue desenhar uma cena no formato certo.</p>
        </Passo>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Cena ilustrada · {String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm</p>
          <div ref={caixa} className="mt-3 flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:18px_18px] p-3">
            <Previa url={url} o={o} l={l} a={a} larg={Math.max(200, largura - 24)} alt={560} />
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
          <p className="mt-2 text-xs text-muted-foreground">O PDF sai no tamanho real ({String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm, {dpi} dpi). A cena é desenho em vetor: fica nítida em qualquer tamanho.</p>
        </div>
      </div>
    </div>
  );
}
