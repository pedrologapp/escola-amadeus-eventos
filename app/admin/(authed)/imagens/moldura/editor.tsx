"use client";

import { useEffect, useRef, useState } from "react";
import { Download, ImagePlus, Loader2, X } from "lucide-react";
import { MARCA_30 } from "@/lib/paineis";
import { carregarFontes, imagem } from "@/lib/painel-desenho";
import { CADERNOS, FUNDOS } from "@/lib/painel-caderno";
import { ICONES } from "@/lib/painel-icones";
import { STORY, desenharMoldura } from "@/lib/moldura";

const MAX = 4;

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function EditorMoldura() {
  const [t, setT] = useState({ l1: "vem aí o", dest: "Dia das Crianças", l3: "12 de outubro" });
  const [fundo, setFundo] = useState(CADERNOS[0].fundo);
  const [icones, setIcones] = useState(CADERNOS[0].icones.slice(0, MAX));
  const [tema, setTema] = useState(CADERNOS[0].id);
  const [foto, setFoto] = useState<HTMLImageElement | null>(null);
  const [gerando, setGerando] = useState<"png" | "jpg" | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  // prévia (360 × 640)
  useEffect(() => {
    let vivo = true;
    (async () => {
      await carregarFontes();
      const logo = await imagem(MARCA_30);
      const cv = ref.current;
      if (!vivo || !cv) return;
      const W = 360, H = 640, dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = H * dpr;
      const ctx = cv.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      desenharMoldura(ctx, W, H, { textos: t, fundo, icones, logo, foto: foto ?? undefined });
    })().catch(() => null);
    return () => { vivo = false; };
  }, [t, fundo, icones, foto]);

  const escolherTema = (id: string) => {
    const c = CADERNOS.find((x) => x.id === id)!;
    setTema(id);
    setFundo(c.fundo);
    setIcones(c.icones.slice(0, MAX));
  };
  const alternar = (id: string) =>
    setIcones((a) => (a.includes(id) ? a.filter((x) => x !== id) : a.length >= MAX ? a : [...a, id]));

  const abrirFoto = (arq?: File) => {
    if (!arq) return;
    const url = URL.createObjectURL(arq);
    const i = new Image();
    i.onload = () => setFoto(i);
    i.src = url;
  };

  const gerar = async (tipo: "png" | "jpg") => {
    setGerando(tipo);
    try {
      await carregarFontes();
      const logo = await imagem(MARCA_30);
      const cv = document.createElement("canvas");
      cv.width = STORY.w;
      cv.height = STORY.h;
      desenharMoldura(cv.getContext("2d")!, STORY.w, STORY.h, { textos: t, fundo, icones, logo, foto: tipo === "jpg" ? foto ?? undefined : undefined });
      const blob = await new Promise<Blob | null>((ok) => (tipo === "png" ? cv.toBlob(ok, "image/png") : cv.toBlob(ok, "image/jpeg", 0.92)));
      if (blob) baixar(blob, tipo === "png" ? "moldura-story.png" : "story-com-foto.jpg");
    } finally {
      setGerando(null);
    }
  };

  const campo = "w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-amadeus-blue";

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <div className="grid gap-2 rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Texto</p>
          <input value={t.l1} onChange={(e) => setT({ ...t, l1: e.target.value })} placeholder="Linha de cima (ex.: vem aí o)" className={campo} />
          <input value={t.dest} onChange={(e) => setT({ ...t, dest: e.target.value })} placeholder="Título (nome do evento)" className={`${campo} font-bold`} />
          <input value={t.l3} onChange={(e) => setT({ ...t, l3: e.target.value })} placeholder="Etiqueta embaixo (ex.: 12 de outubro)" className={campo} />
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Tema</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {CADERNOS.map((c) => (
              <button key={c.id} type="button" onClick={() => escolherTema(c.id)} className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${tema === c.id ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}>
                {c.nome}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-amadeus-blue">Fundo</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {FUNDOS.map((f) => (
              <button key={f.id} type="button" onClick={() => setFundo(f.id)} className={`flex items-center gap-2 rounded-xl border-2 px-2 py-1 text-xs font-semibold ${fundo === f.id ? "border-amadeus-blue" : "border-transparent bg-muted/40"}`}>
                <span className="size-5 rounded-md border border-black/10" style={{ background: f.papel ? "repeating-linear-gradient(#FDFBF6 0 4px,#DCE5F1 4px 5px)" : `linear-gradient(135deg,${f.cores![0]},${f.cores![1]})` }} />
                {f.nome}
              </button>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-amadeus-blue">Desenhos ({icones.length} de {MAX})</p>
          <p className="text-xs text-muted-foreground">Os dois primeiros ficam como adesivos nos cantos da foto; os outros, embaixo.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ICONES.map((i) => {
              const pos = icones.indexOf(i.id);
              return (
                <button key={i.id} type="button" onClick={() => alternar(i.id)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${pos >= 0 ? "bg-amadeus-blue text-white" : "bg-muted/60 text-foreground hover:bg-amadeus-blue-50"}`}>
                  {pos >= 0 ? `${pos + 1}. ` : ""}{i.nome}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-sm font-bold text-amadeus-blue">Foto (opcional)</p>
          <p className="text-xs text-muted-foreground">Para ver como fica, ou para baixar o story já pronto com a foto.</p>
          <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => abrirFoto(e.target.files?.[0])} />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => entrada.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-amadeus-blue">
              <ImagePlus className="size-4" /> {foto ? "Trocar a foto" : "Escolher foto"}
            </button>
            {foto && (
              <button type="button" onClick={() => setFoto(null)} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-muted-foreground">
                <X className="size-4" /> Tirar a foto
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex justify-center rounded-2xl bg-[repeating-conic-gradient(#cfd8e6_0_25%,#f4f6fa_0_50%)] bg-[length:16px_16px] p-4">
          <canvas ref={ref} style={{ width: 360, height: 640 }} className="max-w-full rounded-lg shadow-[0_14px_34px_rgba(0,0,0,.25)]" />
        </div>
        <button type="button" disabled={!!gerando} onClick={() => gerar("png")} className="flex w-full items-center justify-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">
          {gerando === "png" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Baixar moldura (PNG, miolo transparente)
        </button>
        <button type="button" disabled={!!gerando || !foto} onClick={() => gerar("jpg")} className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-amadeus-blue disabled:opacity-40">
          {gerando === "jpg" ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Baixar story com a foto (JPG)
        </button>
        <p className="text-xs text-muted-foreground">Tamanho de story: 1080 × 1920. O quadriculado na prévia mostra onde a moldura é transparente.</p>
      </div>
    </div>
  );
}
