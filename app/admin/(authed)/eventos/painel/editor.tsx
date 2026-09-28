"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileDown, Loader2, Ruler } from "lucide-react";
import { COMPOSICOES, MEDIDAS, type Composicao } from "@/lib/paineis";
import { carregarFontes, desenhar, pdfComJpeg, pixelsPorCm, recursos, type Textos } from "@/lib/painel-desenho";

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

/** Desenha a composição num canvas que cabe na caixa (largura máx. em px). */
function Previa({ c, t, l, a, larg, alt, onClick, ativo }: { c: Composicao; t: Textos; l: number; a: number; larg: number; alt: number; onClick?: () => void; ativo?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const esc = Math.min(larg / l, alt / a);
  const W = Math.max(1, Math.round(l * esc)), H = Math.max(1, Math.round(a * esc));
  useEffect(() => {
    let vivo = true;
    (async () => {
      await carregarFontes();
      const img = await recursos(c);
      const cv = ref.current;
      if (!vivo || !cv) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = H * dpr;
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desenhar(ctx, c, W, H, t, img, l, a);
    })().catch(() => null);
    return () => { vivo = false; };
  }, [c, t, l, a, W, H]);
  const canvas = <canvas ref={ref} style={{ width: W, height: H }} className="block shadow-[0_14px_34px_rgba(0,0,0,.25)]" />;
  return onClick ? (
    <button type="button" onClick={onClick} className={`rounded-2xl border-2 p-2 text-left transition ${ativo ? "border-amadeus-blue bg-amadeus-blue-50" : "border-transparent bg-white hover:border-amadeus-blue-100"}`}>
      <div className="flex h-[150px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:14px_14px]">{canvas}</div>
      <p className="mt-2 text-sm font-bold text-amadeus-blue">{c.nome}</p>
      <p className="text-xs leading-snug text-muted-foreground">{c.uso}</p>
    </button>
  ) : (
    canvas
  );
}

export function EditorPainel({ inicial }: { inicial: Textos }) {
  const [t, setT] = useState<Textos>(inicial);
  const [l, setL] = useState(300);
  const [a, setA] = useState(100);
  const [lTxt, setLTxt] = useState("300");
  const [aTxt, setATxt] = useState("100");
  const [id, setId] = useState(COMPOSICOES[0].id);
  const [gerando, setGerando] = useState<"pdf" | "jpg" | "zap" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [largura, setLargura] = useState(800);
  const caixa = useRef<HTMLDivElement>(null);
  const comp = COMPOSICOES.find((c) => c.id === id)!;

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

  const gerar = async (tipo: "pdf" | "jpg" | "zap") => {
    setErro(null);
    setGerando(tipo);
    try {
      await carregarFontes();
      const hd = tipo !== "zap";
      const img = await recursos(comp, hd);
      // Gráfica: tamanho real (até 100 dpi). WhatsApp: prévia leve de 1600 px no lado maior.
      const ppc = hd ? pixelsPorCm(l, a) : 1600 / Math.max(l, a);
      const W = Math.round(l * ppc), H = Math.round(a * ppc);
      const cv = document.createElement("canvas");
      cv.width = W;
      cv.height = H;
      const ctx = cv.getContext("2d");
      if (!ctx) throw new Error("O navegador não conseguiu criar uma imagem desse tamanho.");
      desenhar(ctx, comp, W, H, t, img, l, a);
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
  const dpi = Math.round(pixelsPorCm(l, a) * 2.54);

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-white p-4 lg:grid-cols-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-amadeus-blue"><Ruler className="size-4" /> Medida do painel</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MEDIDAS.map((m) => (
              <button
                key={m.rotulo}
                type="button"
                onClick={() => medida(String(m.l).replace(".", ","), String(m.a).replace(".", ","))}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${l === m.l && a === m.a ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}
              >
                {m.rotulo}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">Largura <input value={lTxt} onChange={(e) => medida(e.target.value, aTxt)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
            <label className="flex items-center gap-2">Altura <input value={aTxt} onChange={(e) => medida(lTxt, e.target.value)} inputMode="decimal" className="w-20 rounded-lg border border-border px-2 py-1 text-right font-bold" /> cm</label>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Qualquer medida de 20 cm a 5 m. O painel se reorganiza sozinho para o formato (deitado, em pé ou quadrado).</p>
        </div>
        <div className="grid gap-2">
          <p className="text-sm font-bold text-amadeus-blue">Texto do painel</p>
          <input value={t.l1} onChange={(e) => setT({ ...t, l1: e.target.value })} placeholder="Linha de cima (ex.: vem aí o)" className={campo} />
          <input value={t.dest} onChange={(e) => setT({ ...t, dest: e.target.value })} placeholder="Destaque (nome do evento)" className={`${campo} font-bold`} />
          <input value={t.l3} onChange={(e) => setT({ ...t, l3: e.target.value })} placeholder="Linha de baixo (ex.: 12 de outubro)" className={campo} />
          <p className="text-xs text-muted-foreground">Painel é decoração: quanto menos texto, mais bonito. O destaque pode ter duas linhas.</p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-amadeus-blue">Escolha o estilo</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COMPOSICOES.map((c) => (
            <Previa key={c.id} c={c} t={t} l={l} a={a} larg={300} alt={140} onClick={() => setId(c.id)} ativo={c.id === id} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-bold text-amadeus-blue">{comp.nome} · {String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!!gerando} onClick={() => gerar("pdf")} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
              {gerando === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />} PDF para a gráfica
            </button>
            <button type="button" disabled={!!gerando} onClick={() => gerar("jpg")} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-amadeus-blue disabled:opacity-50">
              {gerando === "jpg" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Imagem em alta (JPG)
            </button>
            <button type="button" disabled={!!gerando} onClick={() => gerar("zap")} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-bold text-emerald-700 disabled:opacity-50">
              {gerando === "zap" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Prévia para aprovar no WhatsApp
            </button>
          </div>
        </div>
        {erro && <p className="mt-2 text-sm text-red-700">{erro}</p>}
        <div ref={caixa} className="mt-4 flex min-h-[260px] items-center justify-center overflow-hidden rounded-xl bg-[repeating-conic-gradient(#eef2fb_0_25%,transparent_0_50%)] bg-[length:18px_18px] p-4">
          <Previa c={comp} t={t} l={l} a={a} larg={Math.max(200, largura - 32)} alt={520} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O PDF sai no tamanho real ({String(l).replace(".", ",")} × {String(a).replace(".", ",")} cm, {dpi} dpi), com as peças em alta da identidade visual. Painel grande é visto de longe: {dpi} dpi imprime bem.
        </p>
      </div>
    </div>
  );
}
