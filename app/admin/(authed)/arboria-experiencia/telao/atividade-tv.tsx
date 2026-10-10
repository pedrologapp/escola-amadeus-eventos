"use client";

import { useCallback, useEffect, useState } from "react";
import { FORMAS, RODADAS } from "@/lib/arboria-atividade";

/**
 * A atividade das 15 palavras na TV. Cada passo tem uma ação (botão no canto ou → / PageDown);
 * as que abrem algo no celular dos pais chamam fase("r1" | "forma" | "r2"). ← volta um passo (sem mexer no banco).
 * Ninguém vê o resultado de ninguém: a TV mostra só quantos já responderam e quantos escolheram cada forma.
 */
type Sit = { r1: number; r2: number; formas: Record<string, number>; familias: number };
type Passo = { id: string; botao: string; acao?: "r1" | "forma" | "r2" | "liberar" };

const PASSOS: Passo[] = [
  { id: "convite", botao: "Mostrar as palavras" },
  { id: "palavras1", botao: "Esconder e responder", acao: "r1" },
  { id: "r1", botao: "Mostrar as 8 formas" },
  { id: "formas", botao: "Ver a primeira forma" },
  ...FORMAS.map((f, i) => ({ id: "forma-" + i, botao: i < FORMAS.length - 1 ? "Próxima forma" : "Ver as 8 juntas" })),
  { id: "resumo", botao: "Escolher a forma", acao: "forma" as const },
  { id: "escolha", botao: "Mostrar as novas palavras" },
  { id: "palavras2", botao: "Esconder e responder", acao: "r2" as const },
  { id: "r2", botao: "Ver as formas da sala" },
  { id: "resultado", botao: "Liberar as séries", acao: "liberar" as const },
];
const SEGUNDOS = 45;

export function AtividadeTV({ sit, fase, liberar, sair }: { sit: Sit; fase: (f: "r1" | "forma" | "r2") => Promise<boolean>; liberar: () => Promise<void>; sair: () => void }) {
  const [n, setN] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  const p = PASSOS[n];

  const avanca = useCallback(async () => {
    if (ocupado) return;
    if (p.acao === "liberar") { setOcupado(true); await liberar(); setOcupado(false); return; }
    if (p.acao) { setOcupado(true); const ok = await fase(p.acao); setOcupado(false); if (!ok) return; }
    setN((x) => Math.min(PASSOS.length - 1, x + 1));
  }, [ocupado, p, fase, liberar]);
  const volta = useCallback(() => { if (n === 0) sair(); else setN(n - 1); }, [n, sair]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); avanca(); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); volta(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [avanca, volta]);

  const forma = p.id.startsWith("forma-") ? FORMAS[+p.id.slice(6)] : null;
  const rodada = p.id === "palavras1" ? 0 : p.id === "palavras2" ? 1 : -1;

  return (
    <div className="absolute inset-0">
      <div className="fundo" />

      {p.id === "convite" && (
        <Centro rot="Prática · agora">
          <p className="serif entra2 text-[5.4vw] leading-[1.05]">Quero aproveitar esse momento<br />e fazer uma <span className="it">atividade</span> com vocês.</p>
          <p className="serif entra2 mt-[2vw] text-[4vw] text-[#8fa3a0]">Posso?</p>
        </Centro>
      )}

      {rodada >= 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-[6vw]">
          <p className="rot entra">{rodada === 0 ? "1ª parte · tente guardar o máximo que puder" : "2ª parte · agora, com a sua forma"}</p>
          <div className="mt-[2.4vw] grid w-full grid-cols-5 gap-[1.2vw]">
            {RODADAS[rodada].palavras.map((w, i) => (
              <div key={w} className="entra rounded-[1vw] border-2 border-[#2a3d3b] bg-[#14201f] py-[1.5vw] text-center font-semibold text-[2.6vw]" style={{ animationDelay: `${i * 0.06}s` }}>{w}</div>
            ))}
          </div>
          <Contagem key={p.id} />
        </div>
      )}

      {(p.id === "r1" || p.id === "r2") && (
        <Centro rot={p.id === "r1" ? "1ª parte" : "2ª parte"}>
          <p className="serif entra2 text-[5vw] leading-[1.05]">Agora, no celular:<br /><span className="it">toque nas palavras de que lembra.</span></p>
          <p className="entra2 mt-[2vw] text-[1.8vw] text-[#8fa3a0]">Ninguém vê as respostas de ninguém.</p>
          <p className="mt-[2.4vw] flex items-baseline justify-center gap-[1vw]">
            <b key={p.id === "r1" ? sit.r1 : sit.r2} className="serif text-[6vw] leading-none text-[#2dd4bf]" style={{ animation: "tlPulso .6s ease" }}>{p.id === "r1" ? sit.r1 : sit.r2}</b>
            <span className="text-[1.6vw] text-[#8fa3a0]">{(p.id === "r1" ? sit.r1 : sit.r2) === 1 ? "pai já respondeu" : "pais já responderam"}</span>
          </p>
        </Centro>
      )}

      {p.id === "formas" && (
        <Centro rot="Existem muitas formas de pensar">
          <p className="serif entra2 text-[5.4vw] leading-[1.05]">8 formas de <span className="it">guardar palavras.</span></p>
          <p className="entra2 mt-[2vw] text-[2vw] text-[#8fa3a0]">Veja qual combina mais com você.</p>
        </Centro>
      )}

      {forma && (
        <div key={p.id} className="absolute inset-0 flex items-center px-[8vw]">
          <div className="entra flex size-[16vw] shrink-0 items-center justify-center rounded-full text-[7vw] font-bold text-[#0b1112]" style={{ background: forma.cor }}>{FORMAS.indexOf(forma) + 1}</div>
          <div className="ml-[4vw] min-w-0">
            <p className="rot entra" style={{ color: forma.cor }}>Forma {FORMAS.indexOf(forma) + 1} de 8</p>
            <p className="serif entra2 mt-[.6vw] text-[5vw] leading-[1.02]">{forma.titulo}</p>
            <p className="entra2 mt-[1.4vw] text-[2.1vw] leading-snug text-[#eef3ef]/85">{forma.como}</p>
            <p className="entra2 mt-[1.6vw] border-l-4 pl-[1.4vw] text-[1.9vw] italic leading-snug text-[#8fa3a0]" style={{ borderColor: forma.cor }}>{forma.exemplo}</p>
          </div>
        </div>
      )}

      {p.id === "resumo" && (
        <div className="absolute inset-0 flex flex-col justify-center px-[6vw]">
          <p className="rot entra text-center">Qual você quer usar agora?</p>
          <div className="mt-[2.4vw] grid grid-cols-4 gap-[1.4vw]">
            {FORMAS.map((f, i) => (
              <div key={f.chave} className="entra rounded-[1.2vw] border-2 bg-[#14201f] p-[1.4vw]" style={{ borderColor: f.cor, animationDelay: `${i * 0.08}s` }}>
                <p className="font-mono text-[1.1vw]" style={{ color: f.cor }}>{i + 1}</p>
                <p className="serif mt-[.4vw] text-[2.3vw] leading-tight">{f.titulo}</p>
              </div>
            ))}
          </div>
          <p className="entra2 mt-[2.4vw] text-center text-[1.8vw] text-[#8fa3a0]">Escolha no celular a forma que mais combina com você.</p>
        </div>
      )}

      {(p.id === "escolha" || p.id === "resultado") && <Barras formas={sit.formas} final={p.id === "resultado"} />}

      <div className="marca">Arb</div>
      <div className="discreto"><button onClick={avanca} disabled={ocupado} className="botao">{ocupado ? "Um instante…" : p.botao}</button></div>
    </div>
  );
}

function Centro({ rot, children }: { rot: string; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 grid place-items-center px-[8vw] text-center">
      <div><p className="rot entra mb-[1.6vw]">{rot}</p>{children}</div>
    </div>
  );
}

// quantos pais escolheram cada forma (só isso: nenhum resultado individual)
function Barras({ formas, final }: { formas: Record<string, number>; final: boolean }) {
  const max = Math.max(1, ...FORMAS.map((f) => formas[f.chave] ?? 0));
  const total = FORMAS.reduce((a, f) => a + (formas[f.chave] ?? 0), 0);
  const usadas = FORMAS.filter((f) => formas[f.chave]).length;
  return (
    <div className="absolute inset-0 flex flex-col px-[6vw] pb-[7vw] pt-[3vw]">
      <div className="entra text-center">
        <p className="rot">{final ? "Na mesma sala" : "As formas da sala"}</p>
        <p className="serif mt-[.6vw] text-[3.6vw] leading-tight">
          {final ? <>{usadas} {usadas === 1 ? "forma diferente" : "formas diferentes"} <span className="it">de guardar as mesmas palavras.</span></> : <>Qual forma <span className="it">cada um escolheu?</span></>}
        </p>
        {final && <p className="mt-[.6vw] text-[1.7vw] text-[#8fa3a0]">Nenhuma é a certa. Cada um aprende do seu jeito. Agora imagine o seu filho.</p>}
      </div>
      <div className="mt-[2vw] flex flex-1 items-end gap-[1.6vw]">
        {FORMAS.map((f) => {
          const v = formas[f.chave] ?? 0;
          return (
            <div key={f.chave} className="flex h-full flex-1 flex-col items-center justify-end">
              <b className="serif text-[3vw] leading-none" style={{ color: f.cor }}>{v}</b>
              <div className="mt-[.6vw] w-full rounded-t-[.8vw] transition-[height] duration-700" style={{ height: `${(v / max) * 72}%`, minHeight: "0.4vw", background: f.cor }} />
              <p className="mt-[.8vw] h-[4.6vw] text-center text-[1.25vw] leading-tight text-[#eef3ef]/85">{f.titulo}</p>
            </div>
          );
        })}
      </div>
      {!final && <p className="text-center text-[1.4vw] text-[#8fa3a0]">{total} {total === 1 ? "pai escolheu" : "pais escolheram"} até agora</p>}
    </div>
  );
}

// contagem regressiva enquanto as palavras estão na tela (recomeça a cada rodada)
function Contagem() {
  const [resta, setResta] = useState(SEGUNDOS);
  useEffect(() => { const t = setInterval(() => setResta((r) => Math.max(0, r - 1)), 1000); return () => clearInterval(t); }, []);
  return <p className={`mt-[2.6vw] font-mono text-[3vw] ${resta <= 10 ? "text-[#F87171]" : "text-[#2dd4bf]"}`}>{resta > 0 ? `0:${String(resta).padStart(2, "0")}` : "Tempo!"}</p>;
}
