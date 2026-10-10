"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { comecarReuniao, faseAtividade, liberarHistorias, situacaoTelao } from "../actions";
import { AtividadeTV } from "./atividade-tv";

/**
 * Telão: pronto → (Começar reunião) apresentação → QR do cadastro com contagem → (Abrir a atividade) a atividade das 15 palavras
 * (atividade-tv.tsx: convite, palavras, as 8 formas, escolha, 2ª rodada, as formas da sala) → (Liberar) estreia → (Encerrar) fim.
 * Na apresentação: → / PageDown avança um slide, ← / PageUp volta um slide, espaço dá play/pausa (os slides vêm de slides.json).
 * Fora dela: → / ← passam de tela sem apertar nada no banco (para ensaiar) · F tela cheia.
 * A apresentação (public/arboria/apresentacao/parte1.mp4) já vem com as falas da Arbória e a trilha; qr-fala.mp3 toca na tela do QR.
 */
type Etapa = "pronto" | "video" | "qr" | "atividade" | "estreia" | "fim";
const ORDEM: Etapa[] = ["pronto", "video", "qr", "atividade", "estreia", "fim"];

export function Telao({ qr }: { qr: string }) {
  const [etapa, setEtapa] = useState<Etapa>("pronto");
  const [ocupado, setOcupado] = useState(false);
  const [sit, setSit] = useState({ criancas: 0, familias: 0, iniciada: null as string | null, liberada: null as string | null, fase: null as string | null, r1: 0, r2: 0, formas: {} as Record<string, number> });
  const [erro, setErro] = useState<string | null>(null);
  const video = useRef<HTMLVideoElement>(null);
  const fala = useRef<HTMLAudioElement>(null);
  const [slides, setSlides] = useState<number[]>([0]);
  const [slide, setSlide] = useState(0);
  const [tocando, setTocando] = useState(false);
  const [controles, setControles] = useState(false);
  const esconde = useRef<ReturnType<typeof setTimeout> | null>(null);

  // onde começa cada slide dentro do vídeo
  useEffect(() => { fetch("/arboria/apresentacao/slides.json").then((r) => r.json()).then((j) => setSlides(j.slides)).catch(() => {}); }, []);
  const qualSlide = useCallback((t: number) => { let k = 0; slides.forEach((ini, i) => { if (t >= ini - 0.05) k = i; }); return k; }, [slides]);
  const proximo = useCallback(() => {
    const v = video.current; if (!v) return;
    const k = qualSlide(v.currentTime);
    if (k >= slides.length - 1) { setEtapa("qr"); return; }
    v.currentTime = slides[k + 1] + 0.01; setSlide(k + 1);
  }, [qualSlide, slides]);
  const anterior = useCallback(() => {
    const v = video.current; if (!v) return;
    const k = qualSlide(v.currentTime);
    // no meio do slide, volta para o começo dele; logo no começo, vai para o anterior
    const alvo = v.currentTime - slides[k] > 1.5 ? k : Math.max(0, k - 1);
    v.currentTime = slides[alvo] + 0.01; setSlide(alvo);
  }, [qualSlide, slides]);
  const playPausa = useCallback(() => { const v = video.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); }, []);
  const mostraControles = () => { setControles(true); if (esconde.current) clearTimeout(esconde.current); esconde.current = setTimeout(() => setControles(false), 2500); };

  const telaCheia = () => { document.documentElement.requestFullscreen?.().catch(() => {}); };

  // contagem ao vivo enquanto a reunião está acontecendo
  useEffect(() => {
    let vivo = true;
    const ver = () => situacaoTelao().then((s) => { if (vivo) setSit(s); }).catch(() => {});
    ver();
    const t = setInterval(ver, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  const acao = async (f: () => Promise<void>) => {
    setOcupado(true); setErro(null);
    try { await f(); return true; } catch { setErro("Não consegui falar com o sistema. Confira a internet e tente de novo."); return false; } finally { setOcupado(false); }
  };

  const comecar = async () => {
    telaCheia();
    const v = video.current; if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    setEtapa("video");
    if (await acao(comecarReuniao)) setSit((s) => ({ ...s, criancas: 0, familias: 0, r1: 0, r2: 0, formas: {} }));
    else { v?.pause(); setEtapa("pronto"); }
  };
  const liberar = async () => { if (await acao(liberarHistorias)) setEtapa("estreia"); };
  // abre uma etapa da atividade no celular dos pais
  const fase = (f: "r1" | "forma" | "r2") => acao(() => faseAtividade(f));

  const anda = useCallback((d: number) => setEtapa((e) => {
    const nova = ORDEM[Math.min(ORDEM.length - 1, Math.max(0, ORDEM.indexOf(e) + d))];
    // voltando do QR, a apresentação reabre no último slide
    if (e === "qr" && nova === "video") { const v = video.current; if (v) { v.currentTime = slides[slides.length - 1] + 0.01; setSlide(slides.length - 1); } }
    return nova;
  }), [slides]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      const frente = e.key === "ArrowRight" || e.key === "PageDown", tras = e.key === "ArrowLeft" || e.key === "PageUp";
      if (etapa === "video" && (frente || tras || e.key === " ")) {
        e.preventDefault(); mostraControles();
        if (frente) proximo(); else if (tras) anterior(); else playPausa();
        return;
      }
      if (etapa === "atividade" && (frente || tras)) return;
      if (frente) anda(1);
      else if (tras) anda(-1);
      else if (e.key === "f" || e.key === "F") telaCheia();
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [anda, etapa, proximo, anterior, playPausa]);

  useEffect(() => {
    if (etapa === "video") video.current?.play().catch(() => {}); else video.current?.pause();
    // na tela do QR, a Arbória pede para preencherem
    const a = fala.current; if (!a) return;
    if (etapa === "qr") { a.currentTime = 0; a.play().catch(() => {}); } else a.pause();
  }, [etapa]);

  return (
    <div className="telao fixed inset-0 z-[200] overflow-hidden bg-black text-[#eef3ef]" style={{ fontFamily: "var(--f-tight), sans-serif" }}>
      <style>{`
        .telao .fundo { position: absolute; inset: 0; background: radial-gradient(ellipse at 72% 0%, #12302c 0%, #0b1112 58%); }
        .telao .serif { font-family: var(--f-serif), serif; font-weight: 400; }
        .telao .it { font-style: italic; color: #2dd4bf; }
        .telao .rot { font: 600 1.35vw var(--f-mono), monospace; letter-spacing: .16em; text-transform: uppercase; color: #2dd4bf; }
        .telao .marca { position: absolute; left: 3.1vw; bottom: 2.3vw; font: 800 1.6vw var(--f-tight); letter-spacing: -.03em; color: #2dd4bf; }
        .telao .entra { animation: tlEntra 1.2s cubic-bezier(.2,.8,.2,1) both; }
        .telao .entra2 { animation: tlEntra 1.2s cubic-bezier(.2,.8,.2,1) .4s both; }
        @keyframes tlEntra { from { opacity: 0; transform: translateY(1.2vw); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
        .telao .botao { border: 2px solid #2dd4bf; color: #2dd4bf; border-radius: 999px; padding: .9vw 2.4vw; font: 700 1.25vw var(--f-tight); transition: background .2s, color .2s; }
        .telao .botao:hover, .telao .botao:focus-visible { background: #2dd4bf; color: #0b1112; outline: none; }
        .telao .botao:disabled { opacity: .4; }
        .telao .discreto { position: absolute; right: 3.1vw; bottom: 2.1vw; opacity: .35; transition: opacity .2s; }
        .telao .discreto:hover, .telao .discreto:focus-within { opacity: 1; }
        @keyframes tlPulso { 0%,100% { transform: scale(1); } 50% { transform: scale(1.08); } }
      `}</style>

      {/* a apresentação fica sempre carregada, para começar sem esperar */}
      <video ref={video} src="/arboria/apresentacao/parte1.mp4" preload="auto" playsInline onEnded={() => setEtapa("qr")}
        onPlay={() => setTocando(true)} onPause={() => setTocando(false)} onTimeUpdate={(e) => setSlide(qualSlide(e.currentTarget.currentTime))}
        className={`absolute inset-0 h-full w-full bg-black object-contain ${etapa === "video" ? "" : "invisible"}`} />

      {etapa === "video" && (
        <div className="absolute inset-0 z-10" onMouseMove={mostraControles} onClick={mostraControles}>
          <div className={`absolute bottom-[2vw] left-1/2 flex -translate-x-1/2 items-center gap-[1.2vw] rounded-full bg-black/70 px-[1.6vw] py-[.7vw] text-white transition-opacity duration-300 ${controles ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            <button onClick={(e) => { e.stopPropagation(); anterior(); mostraControles(); }} aria-label="Slide anterior" className="p-[.4vw] hover:text-[#2dd4bf]"><SkipBack className="size-[1.8vw]" /></button>
            <button onClick={(e) => { e.stopPropagation(); playPausa(); mostraControles(); }} aria-label={tocando ? "Pausar" : "Continuar"} className="p-[.4vw] hover:text-[#2dd4bf]">{tocando ? <Pause className="size-[2.2vw]" /> : <Play className="size-[2.2vw]" />}</button>
            <button onClick={(e) => { e.stopPropagation(); proximo(); mostraControles(); }} aria-label="Próximo slide" className="p-[.4vw] hover:text-[#2dd4bf]"><SkipForward className="size-[1.8vw]" /></button>
            <span className="min-w-[7vw] text-center font-mono text-[1vw] text-white/70">slide {slide + 1} de {slides.length}</span>
          </div>
        </div>
      )}

      <audio ref={fala} src="/arboria/apresentacao/qr-fala.mp3" preload="auto" />

      {etapa === "pronto" && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="fundo" />
          <div className="relative">
            <p className="rot entra">Experiência Amadeus · Arboria 2027</p>
            <h1 className="serif entra2 mt-[1.4vw] text-[6.4vw] leading-none">A jornada <span className="it">começa aqui.</span></h1>
            <div className="entra2 mt-[3.4vw]">
              <button onClick={comecar} disabled={ocupado} className="botao">{ocupado ? "Começando…" : "Começar reunião"}</button>
            </div>
            {sit.iniciada && <p className="mt-[1.4vw] text-[.9vw] text-[#8fa3a0]">Apertar de novo zera a contagem: só vale quem se cadastrar depois.</p>}
          </div>
          <div className="marca">Arb</div>
        </div>
      )}

      {etapa === "qr" && (
        <div className="absolute inset-0">
          <div className="fundo" />
          <div className="relative flex h-full items-center gap-[5vw] px-[8vw]">
            <div className="entra shrink-0 rounded-[1.6vw] bg-white p-[1.3vw]" style={{ boxShadow: "0.7vw 0.7vw 0 #0f3d39" }}>
              <div className="size-[29vw] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
              <p className="mt-[.5vw] text-center text-[1.1vw] font-bold text-[#0b1112]">eventos.escolaamadeus.com/arboria</p>
            </div>
            <div className="entra2 min-w-0">
              <p className="rot">Prática 1 · agora</p>
              <p className="serif mt-[.8vw] text-[4.8vw] leading-[1.02]">Preencham <span className="it">agora</span>.<br />Eu espero.</p>
              <p className="mt-[1.4vw] text-[1.5vw] text-[#8fa3a0]">Aponte a câmera do celular para o código e conte quem é o seu filho.</p>
              <div className="mt-[2.6vw] flex items-baseline gap-[1vw]">
                <b key={sit.criancas} className="serif text-[6vw] leading-none text-[#2dd4bf]" style={{ animation: "tlPulso .6s ease" }}>{sit.criancas}</b>
                <span className="text-[1.5vw] text-[#8fa3a0]">{sit.criancas === 1 ? "criança já cadastrada" : "crianças já cadastradas"}{sit.familias ? ` · ${sit.familias} ${sit.familias === 1 ? "família" : "famílias"}` : ""}</span>
              </div>
            </div>
          </div>
          <div className="marca">Arb</div>
          <div className="discreto"><button onClick={() => setEtapa("atividade")} className="botao">Abrir a atividade</button></div>
        </div>
      )}

      {etapa === "atividade" && <AtividadeTV sit={sit} fase={fase} liberar={liberar} sair={() => setEtapa("qr")} />}

      {etapa === "estreia" && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="fundo" />
          <div className="relative">
            <p className="rot entra">Estreia</p>
            <h1 className="serif entra2 mt-[1.4vw] text-[6vw] leading-[1.02]">As séries <span className="it">chegaram.</span></h1>
            <p className="entra2 mt-[1.8vw] text-[2vw] text-[#8fa3a0]">Olhem o celular de vocês. Com o som ligado.</p>
          </div>
          <div className="marca">Arb</div>
          <div className="discreto"><button onClick={() => setEtapa("fim")} className="botao">Encerrar</button></div>
        </div>
      )}

      {etapa === "fim" && (
        <div className="absolute inset-0 grid place-items-center text-center">
          <div className="fundo" />
          <div className="relative">
            <p className="rot entra">Arboria · 2027</p>
            <h1 className="serif entra2 mt-[1.4vw] text-[6vw] leading-[1.02]">Obrigado, <span className="it">famílias.</span></h1>
            <p className="entra2 mt-[1.8vw] text-[2vw] text-[#8fa3a0]">A jornada de cada um começa em 2027.</p>
          </div>
          <div className="marca">Arb</div>
        </div>
      )}

      {erro && <p className="absolute left-1/2 top-[2vw] -translate-x-1/2 rounded-full bg-red-500/20 px-[1.6vw] py-[.6vw] text-[1vw] text-red-200">{erro}</p>}
    </div>
  );
}
