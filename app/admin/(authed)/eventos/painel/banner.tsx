"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, FileDown, ImagePlus, Loader2, X } from "lucide-react";
import { MEDIDAS } from "@/lib/paineis";
import { carregarFontes, imagem, pdfComJpeg, pixelsPorCm } from "@/lib/painel-desenho";
import { ILUSTRACOES, LOGO_BANNER, desenharBanner, pedidoHiggsfield, type AjusteImg, type LadoTexto, type OpcoesBanner } from "@/lib/painel-banner";

/**
 * Painel "Banner colorido": a ilustração 3D (pronta ou enviada) cobre o
 * painel e a frase em letra 3D vai no lado vazio, com o logo embaixo.
 */

interface Minha {
  id: string;
  nome: string;
  url: string;
  w: number;
  h: number;
}

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function pintar(ctx: CanvasRenderingContext2D, W: number, H: number, url: string, o: OpcoesBanner) {
  await carregarFontes();
  const [img, logo] = await Promise.all([imagem(url), imagem(LOGO_BANNER)]);
  desenharBanner(ctx, W, H, img, logo, o);
}

function Previa({ url, o, l, a, larg, alt }: { url: string; o: OpcoesBanner; l: number; a: number; larg: number; alt: number }) {
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
    ajuste: "meio",
  });
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

  const muda = (p: Partial<OpcoesBanner>) => setO({ ...o, ...p });
  const medida = (lv: string, av: string) => {
    setLTxt(lv);
    setATxt(av);
    const ln = Number(lv.replace(",", ".")), an = Number(av.replace(",", "."));
    if (ln >= 20 && an >= 20 && ln <= 800 && an <= 500) { setL(ln); setA(an); }
  };

  const enviar = async (f: File | undefined) => {
    if (!f) return;
    setErro(null);
    const u = URL.createObjectURL(f);
    try {
      const i = await imagem(u);
      setMinhas((x) => [...x, { id: `m:${Date.now()}`, nome: f.name.replace(/\.[^.]+$/, ""), url: u, w: i.naturalWidth, h: i.naturalHeight }]);
      setUrl(u);
    } catch {
      setErro("Não consegui abrir essa imagem. Envie um PNG ou JPG.");
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
      await pintar(ctx, W, H, url, o);
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
  // nitidez da ilustração no tamanho real (ela é esticada para cobrir o painel)
  const dpiImg = tamImg ? Math.round(2.54 / Math.max(l / tamImg.w, a / tamImg.h)) : null;

  return (
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-4">
        <Passo n={1} titulo="Escolha a ilustração" dica="Ilustração 3D sem texto, com um lado vazio para a frase. Use uma pronta ou envie a sua.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ILUSTRACOES.map((c) => (
              <button key={c.id} type="button" onClick={() => setUrl(c.arquivo)} className={`rounded-xl border-2 p-1.5 text-left ${url === c.arquivo ? "border-amadeus-blue" : "border-transparent hover:border-amadeus-blue-100"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.arquivo} alt="" className="aspect-[21/9] w-full rounded-lg object-cover" />
                <p className="mt-1 text-xs font-bold text-amadeus-blue">{c.nome}</p>
              </button>
            ))}
            {minhas.map((c) => (
              <div key={c.id} className={`relative rounded-xl border-2 p-1.5 ${url === c.url ? "border-amadeus-blue" : "border-transparent"}`}>
                <button type="button" onClick={() => setUrl(c.url)} className="w-full text-left">
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

        <Passo n={2} titulo="Frase" dica="Uma linha do painel por linha. Palavra entre *asteriscos* sai grande em amarelo; as outras saem menores em azul.">
          <textarea value={o.frase} onChange={(e) => muda({ frase: e.target.value })} rows={4} className={`${campo} font-bold`} />
          <input value={o.data} onChange={(e) => muda({ data: e.target.value })} placeholder="Data ou linha extra (opcional)" className={`${campo} mt-2`} />
        </Passo>

        <Passo n={3} titulo="Onde fica a frase" dica="Coloque no lado vazio da ilustração.">
          <div className="flex flex-wrap gap-2">
            {([["esq", "À esquerda"], ["centro", "No meio"], ["dir", "À direita"]] as [LadoTexto, string][]).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ lado: v })} className={chip(o.lado === v)}>{r}</button>
            ))}
            <span className="mx-1 w-px self-stretch bg-border" />
            <button type="button" onClick={() => muda({ espelhar: !o.espelhar })} className={chip(o.espelhar)}>Espelhar ilustração</button>
            <button type="button" onClick={() => muda({ logo: !o.logo })} className={chip(o.logo)}>Logo embaixo da frase</button>
          </div>
        </Passo>

        <Passo n={4} titulo="Medida">
          <div className="flex flex-wrap gap-2">
            {MEDIDAS.map((m) => (
              <button key={m.rotulo} type="button" onClick={() => medida(String(m.l).replace(".", ","), String(m.a).replace(".", ","))} className={chip(l === m.l && a === m.a)}>{m.rotulo}</button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">Largura <input value={lTxt} onChange={(e) => medida(e.target.value, aTxt)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
            <label className="flex items-center gap-2">Altura <input value={aTxt} onChange={(e) => medida(lTxt, e.target.value)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Quando a medida é mais comprida que a ilustração, ela é cortada em cima e embaixo. Escolha qual parte fica:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {([["cima", "Mostrar mais de cima"], ["meio", "O meio"], ["baixo", "Mostrar mais de baixo"]] as [AjusteImg, string][]).map(([v, r]) => (
              <button key={v} type="button" onClick={() => muda({ ajuste: v })} className={chip(o.ajuste === v)}>{r}</button>
            ))}
          </div>
        </Passo>
      </div>

      <div className="xl:sticky xl:top-4 xl:self-start">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Banner colorido · {String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm</p>
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
