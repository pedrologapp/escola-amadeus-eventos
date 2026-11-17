"use client";

import { useEffect, useRef } from "react";
import { Eye } from "lucide-react";
import { CORO, ESTROFES } from "@/lib/homenagem-9ano-texto";

/**
 * Teleprompter por cima da câmera (parte 2). O poema sobe sozinho na parte de cima da imagem, perto da
 * lente, para o olhar não fugir. Só aparece na tela: o vídeo gravado sai limpo (a gravação vem direto da
 * câmera, não da tela). Tocar no texto pausa/continua. Para recomeçar do início, o pai muda a `key`.
 */
export function Teleprompter({ tocando, velocidade, onToque }: { tocando: boolean; velocidade: number; onToque: () => void }) {
  const texto = useRef<HTMLDivElement>(null);
  const pos = useRef(0);

  useEffect(() => {
    if (!tocando) return;
    let ultimo = performance.now();
    let quadro = 0;
    const passo = (agora: number) => {
      const el = texto.current;
      if (el) {
        const max = Math.max(0, el.scrollHeight - (el.parentElement?.clientHeight ?? 0) * 0.55);
        pos.current = Math.min(max, pos.current + (velocidade * (agora - ultimo)) / 1000);
        el.style.transform = `translateY(${-pos.current}px)`;
      }
      ultimo = agora;
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [tocando, velocidade]);

  return (
    <button
      type="button"
      onClick={onToque}
      aria-label={tocando ? "Pausar o texto" : "Continuar o texto"}
      className="hom-prompter absolute inset-x-0 top-0 h-[64%] overflow-hidden text-center"
    >
      <div ref={texto} className="px-5 pb-[60%] pt-[22%] will-change-transform">
        {ESTROFES.map((e) => (
          <div key={e.titulo} className="mb-7">
            {e.versos.map((v) => (
              <p key={v} className="font-hom-serif text-[clamp(19px,5.5vw,30px)] font-bold leading-[1.28] text-white">{v}</p>
            ))}
          </div>
        ))}
        {/* sinal sem palavras (palavra aqui seria lida em voz alta): um olho dourado = hora de olhar para a câmera */}
        <div aria-hidden className="mb-2 flex items-center justify-center gap-3 text-[#EAD7A4]">
          <span className="h-px w-10 bg-[#D4B068]/70" />
          <Eye className="h-6 w-6" />
          <span className="h-px w-10 bg-[#D4B068]/70" />
        </div>
        {CORO.map((v) => (
          <p key={v} className="font-hom-serif text-[clamp(19px,5.3vw,32px)] font-bold leading-[1.25] text-[#F2DC9B]">{v}</p>
        ))}
      </div>
    </button>
  );
}
