"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, ImageUp, RotateCcw, Send, Square, Check } from "lucide-react";
import { CORO, ESTROFES, MAX_VIDEO_MB, poemaEmTexto } from "@/lib/homenagem-9ano-texto";
import { extensaoDe } from "./subir";

export interface VideoPronto {
  blob: Blob;
  tipo: string;
  ext: string;
}

type Fase = "inicio" | "camera" | "contagem" | "gravando" | "revisao";

/** Formato que o navegador sabe gravar: mp4 no iPhone (e no Chrome novo), webm no resto. */
function formatoDeGravacao(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const t of ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return "";
}

/**
 * Copiar o poema ou mandar para outro celular (WhatsApp, por exemplo): quem prefere grava com um
 * celular e lê o texto no outro, sem tirar o olho da câmera.
 */
export function BotoesPoema() {
  const [copiado, setCopiado] = useState(false);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(poemaEmTexto());
    } catch {
      const t = document.createElement("textarea");
      t.value = poemaEmTexto();
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };
  const mandar = async () => {
    const texto = poemaEmTexto();
    if (navigator.share) {
      try { await navigator.share({ text: texto }); return; } catch { /* cancelou: tenta o WhatsApp */ }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };
  return (
    <div className="grid gap-3">
      <button type="button" onClick={copiar} className="hom-acao w-full">
        {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copiado ? "Copiado" : "Copiar o poema"}
      </button>
      <button type="button" onClick={mandar} className="hom-acao w-full">
        <Send className="h-4 w-4" /> Mandar para outro celular
      </button>
    </div>
  );
}

/** O poema inteiro de uma vez (para quem prefere ver tudo antes de gravar). */
export function PoemaInteiro() {
  return (
    <div className="space-y-4 text-center">
      {ESTROFES.map((e) => (
        <div key={e.titulo}>
          {e.versos.map((v) => <p key={v} className="font-hom-serif text-[19px] leading-snug text-[#F3EBDD]">{v}</p>)}
        </div>
      ))}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#D4B068]">No final, olhando para a câmera</p>
        {CORO.map((v) => <p key={v} className="font-hom-serif text-[20px] font-bold italic leading-snug text-[#EAD7A4]">{v}</p>)}
      </div>
    </div>
  );
}

const mmss =(s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * Gravador da página da homenagem. Câmera da frente, contagem 3-2-1 e, no modo "poema", o texto embaixo
 * da câmera (perto da lente, para o olhar não fugir), uma estrofe por vez. Quem não consegue gravar no
 * site (câmera bloqueada, navegador antigo) escolhe um vídeo da galeria.
 */
export function Gravador({ modo, limite, onPronto }: { modo: "livre" | "poema"; limite: number; onPronto: (v: VideoPronto) => void }) {
  const [fase, setFase] = useState<Fase>("inicio");
  const [erro, setErro] = useState<string | null>(null);
  const [contagem, setContagem] = useState(3);
  const [segundos, setSegundos] = useState(0);
  const [estrofe, setEstrofe] = useState(0);
  const [inteiro, setInteiro] = useState(false);
  const [gravado, setGravado] = useState<VideoPronto | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const ao = useRef<HTMLVideoElement>(null);
  const fluxo = useRef<MediaStream | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const relogio = useRef<ReturnType<typeof setInterval> | null>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const caixa = useRef<HTMLDivElement>(null);

  /** Liga a câmera no <video> assim que ele aparece na tela (antes disso não há onde mostrar). */
  const prender = (el: HTMLVideoElement | null) => {
    ao.current = el;
    if (el && fluxo.current && el.srcObject !== fluxo.current) {
      el.srcObject = fluxo.current;
      el.play().catch(() => {});
    }
  };

  const desligar = () => {
    fluxo.current?.getTracks().forEach((t) => t.stop());
    fluxo.current = null;
    if (relogio.current) clearInterval(relogio.current);
  };
  useEffect(() => () => desligar(), []);
  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

  const ligar = async () => {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || !formatoDeGravacao()) {
      setErro("Este navegador não grava vídeo pelo site. Grave com a câmera do celular e escolha o vídeo da galeria.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      fluxo.current = s;
      setFase("camera");
      // a câmera e o texto ocupam a tela: rola até eles (as instruções ficam acima)
      setTimeout(() => caixa.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
    } catch {
      setErro("Não consegui abrir a câmera. Permita o acesso à câmera e ao microfone quando o celular perguntar, ou escolha um vídeo da galeria.");
    }
  };

  const parar = () => {
    if (relogio.current) clearInterval(relogio.current);
    if (gravador.current?.state === "recording") gravador.current.stop();
  };

  const gravar = () => {
    const s = fluxo.current;
    if (!s) return;
    const tipo = formatoDeGravacao();
    const partes: Blob[] = [];
    const g = new MediaRecorder(s, { mimeType: tipo, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 });
    g.ondataavailable = (e) => e.data.size && partes.push(e.data);
    g.onstop = () => {
      const t = (g.mimeType || tipo).split(";")[0];
      const blob = new Blob(partes, { type: t });
      setGravado({ blob, tipo: t, ext: extensaoDe(t) });
      setPrevia(URL.createObjectURL(blob));
      setFase("revisao");
      desligar();
    };
    g.start(1000);
    gravador.current = g;
    setSegundos(0);
    setFase("gravando");
    const inicio = Date.now();
    relogio.current = setInterval(() => {
      const seg = Math.floor((Date.now() - inicio) / 1000);
      setSegundos(seg);
      if (seg >= limite) parar();
    }, 250);
  };

  const comecar = () => {
    setEstrofe(0);
    setContagem(3);
    setFase("contagem");
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) return setContagem(n);
      clearInterval(t);
      gravar();
    }, 1000);
  };

  const deNovo = async () => {
    setGravado(null);
    setPrevia(null);
    await ligar();
  };

  const daGaleria = (file?: File) => {
    setErro(null);
    if (!file) return;
    if (!file.type.startsWith("video/") && !/\.(mp4|mov|webm|m4v|3gp)$/i.test(file.name)) {
      setErro("Escolha um arquivo de vídeo.");
      return;
    }
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setErro(`Esse vídeo passa de ${MAX_VIDEO_MB} MB. Grave de novo com a câmera em qualidade normal (não 4K).`);
      return;
    }
    desligar();
    const tipo = file.type || "video/mp4";
    setGravado({ blob: file, tipo, ext: extensaoDe(tipo, file.name) });
    setPrevia(URL.createObjectURL(file));
    setFase("revisao");
  };

  const aoVivo = fase === "camera" || fase === "contagem" || fase === "gravando";
  const poema = modo === "poema";
  const ultima = ESTROFES.length; // índice do coro

  return (
    <div ref={caixa} className="scroll-mt-3 space-y-4">
      {/* Câmera / vídeo gravado */}
      {(aoVivo || fase === "revisao") && (
        <div className={`relative mx-auto overflow-hidden rounded-[18px] border border-[#D4B068]/40 bg-black ${poema ? (fase === "revisao" ? "aspect-[3/4]" : "aspect-[16/10]") : "aspect-[3/4]"} w-full`}>
          {aoVivo && <video ref={prender} muted playsInline autoPlay className="h-full w-full -scale-x-100 object-cover" />}
          {fase === "revisao" && previa && <video src={previa} controls playsInline className="h-full w-full bg-black object-contain" />}
          {fase === "contagem" && (
            <div className="absolute inset-0 grid place-items-center bg-black/35">
              <span key={contagem} className="hom-conta font-hom-serif text-[110px] font-semibold text-[#F3EBDD]">{contagem}</span>
            </div>
          )}
          {fase === "gravando" && (
            <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1 text-sm font-bold text-white">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" /> {mmss(segundos)}
              <span className="font-normal opacity-70">/ {mmss(limite)}</span>
            </div>
          )}
        </div>
      )}

      {/* Teleprompter do poema: aparece já com a câmera aberta, para ensaiar */}
      {poema && aoVivo && (
        <div className="rounded-[18px] border border-[#D4B068]/30 bg-[#0E1E3D] px-5 py-5 text-center">
          {estrofe < ultima ? (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4B068]">
                {estrofe + 1} de {ESTROFES.length} · {ESTROFES[estrofe].titulo}
              </p>
              <div className="mt-3 space-y-1">
                {ESTROFES[estrofe].versos.map((v) => (
                  <p key={v} className="font-hom-serif text-[clamp(18px,5.6vw,26px)] font-semibold leading-snug text-[#F3EBDD]">{v}</p>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4B068]">Para terminar · olhe para a câmera e fale devagar</p>
              <div className="mt-3 space-y-1">
                {CORO.map((v) => (
                  <p key={v} className="font-hom-serif text-[clamp(18px,5.4vw,28px)] font-bold leading-snug text-[#EAD7A4]">{v}</p>
                ))}
              </div>
            </>
          )}
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setEstrofe((e) => Math.max(0, e - 1))}
              disabled={estrofe === 0}
              className="inline-flex items-center gap-1 rounded-full border border-[#D4B068]/40 min-h-[50px] px-5 text-[16px] font-bold text-[#EAD7A4] disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
            <div className="flex gap-1.5">
              {Array.from({ length: ultima + 1 }, (_, i) => (
                <span key={i} className={`h-1.5 w-1.5 rounded-full ${i === estrofe ? "bg-[#D4B068]" : "bg-white/20"}`} />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setEstrofe((e) => Math.min(ultima, e + 1))}
              disabled={estrofe === ultima}
              className="inline-flex items-center gap-1 rounded-full bg-[#D4B068] min-h-[50px] px-6 text-[17px] font-extrabold text-[#0A1630] disabled:opacity-30"
            >
              Próxima <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {erro && <p className="rounded-2xl bg-[#3A1D1D] p-3 text-[15px] text-[#F6D5CF]">{erro}</p>}

      {/* Botões */}
      {fase === "inicio" && (
        <button type="button" onClick={ligar} className="hom-botao w-full">
          <Camera className="h-5 w-5" /> Abrir a câmera
        </button>
      )}
      {fase === "camera" && (
        <button type="button" onClick={comecar} className="hom-botao w-full">
          <span className="h-3.5 w-3.5 rounded-full bg-red-600" /> Começar a gravar
        </button>
      )}
      {poema && fase === "camera" && (
        <div className="space-y-4 rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#D4B068]">Como gravar</p>
          <ol className="space-y-1.5 text-[14px] leading-snug text-[#D9D1C3]">
            <li>1. Leia o poema em voz alta uma vez, para ensaiar.</li>
            <li>2. Toque em <b className="text-[#F3EBDD]">Começar a gravar</b>: o poema volta para o início.</li>
            <li>3. Leia uma estrofe e toque em <b className="text-[#F3EBDD]">Próxima</b>.</li>
            <li>4. No final, <b className="text-[#F3EBDD]">olhe para a câmera</b> e diga o coro devagar.</li>
          </ol>
          <p className="text-[14px] leading-snug text-[#D9D1C3]">
            Prefere ler em outro celular enquanto grava com este? Copie ou mande o poema:
          </p>
          <BotoesPoema />
          <button type="button" onClick={() => setInteiro((v) => !v)} className="hom-acao w-full">
            {inteiro ? <>Esconder o poema inteiro <ChevronUp className="h-4 w-4" /></> : <>Ver o poema inteiro <ChevronDown className="h-4 w-4" /></>}
          </button>
          {inteiro && <div className="border-t border-[#D4B068]/20 pt-4"><PoemaInteiro /></div>}
        </div>
      )}
      {fase === "gravando" && (
        <button type="button" onClick={parar} className="hom-botao w-full !bg-[#F3EBDD]">
          <Square className="h-4 w-4 fill-current" /> Terminar
        </button>
      )}
      {fase === "revisao" && gravado && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => onPronto(gravado)} className="hom-botao w-full">
            <Check className="h-5 w-5" /> Ficou bom, enviar
          </button>
          <button type="button" onClick={deNovo} className="hom-botao-claro w-full">
            <RotateCcw className="h-4 w-4" /> Gravar de novo
          </button>
        </div>
      )}

      {(fase === "inicio" || fase === "camera" || fase === "revisao") && (
        <div>
          <button type="button" onClick={() => galeria.current?.click()} className="hom-acao w-full">
            <ImageUp className="h-4 w-4" /> Prefiro escolher um vídeo da galeria
          </button>
          <input ref={galeria} type="file" accept="video/*" className="hidden" onChange={(e) => { daGaleria(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
      )}
    </div>
  );
}
