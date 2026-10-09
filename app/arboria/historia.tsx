"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import { UNIVERSOS, bonecoPadrao, primeiroNome, universoDaSerie, type Mundo } from "@/lib/arboria-historia";
import type { CriancaHistoria } from "./actions";

/**
 * A história de uma criança, no formato de "stories": começa na escola com a bolsa vazia,
 * passa pelos 8 mundos do universo da idade dela (um balão de fala em cada um, e um item
 * entra na bolsa) e volta para a escola com a bolsa cheia. Toque à direita avança, à esquerda volta.
 */

type Cena = { tipo: "escola" } | { tipo: "mundo"; mundo: Mundo; n: number } | { tipo: "volta" } | { tipo: "bolsa" };
const DURACAO = { escola: 9000, mundo: 9500, volta: 7000, bolsa: 0 };

export function Historia({ crianca, fechar }: { crianca: CriancaHistoria; fechar?: () => void }) {
  const universo = universoDaSerie(crianca.serie);
  const info = UNIVERSOS[universo];
  const nome = primeiroNome(crianca.nome);
  const cenas = useMemo<Cena[]>(() => [{ tipo: "escola" }, ...info.mundos.map((mundo, n) => ({ tipo: "mundo" as const, mundo, n })), { tipo: "volta" }, { tipo: "bolsa" }], [info]);
  const [i, setI] = useState(0);
  const [pausado, setPausado] = useState(false);
  const cena = cenas[i];
  const marcadas = new Set(crianca.respostas.filter(Boolean));
  const boneco = crianca.boneco_url || bonecoPadrao(universo, crianca.genero, crianca.pele, crianca.cabelo);
  const [semBoneco, setSemBoneco] = useState(false);

  // avança sozinho (menos na bolsa aberta, que fica até o pai tocar)
  useEffect(() => {
    if (pausado) return;
    const d = DURACAO[cena.tipo];
    if (!d) return;
    const t = setTimeout(() => setI((x) => Math.min(x + 1, cenas.length - 1)), d);
    return () => clearTimeout(t);
  }, [i, pausado, cena.tipo, cenas.length]);

  const itens = info.mundos.slice(0, cena.tipo === "mundo" ? cena.n + 1 : cena.tipo === "escola" ? 0 : 8);
  const fala = cena.tipo === "escola" ? info.abertura.replace("{nome}", nome)
    : cena.tipo === "mundo" ? (marcadas.has(cena.mundo.chave) ? cena.mundo.brilho : cena.mundo.fala).replace("{nome}", nome)
    : cena.tipo === "volta" ? info.chegada.replace("{nome}", nome) : "";

  const ir = (d: number) => setI((x) => Math.max(0, Math.min(cenas.length - 1, x + d)));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#071a47] text-white select-none">
      <style>{CSS}</style>

      {/* fundo */}
      <div key={`f${i}`} className="absolute inset-0 hx-entra">
        {cena.tipo === "mundo" && cena.mundo.fundo ? (
          <img src={`/arboria/fundos/${cena.mundo.fundo}.webp`} alt="" className="hx-kb absolute inset-0 h-full w-full object-cover" />
        ) : cena.tipo === "mundo" ? (
          <Torre cor={cena.mundo.cor} item={cena.mundo.item} />
        ) : cena.tipo === "bolsa" ? (
          <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 50% 40%, #1D55D8 0%, #0A2F7A 45%, #061433 100%)" }} />
        ) : (
          <Escola noite={cena.tipo === "volta"} />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/50" />
      </div>

      {/* barrinhas de progresso, como nos stories */}
      <div className="absolute left-3 right-3 top-3 z-20 flex gap-1">
        {cenas.map((c, k) => (
          <div key={k} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
            <div className={`h-full bg-white ${k < i ? "w-full" : k === i && DURACAO[c.tipo] && !pausado ? "hx-barra" : k === i && !DURACAO[c.tipo] ? "w-full" : "w-0"}`}
              style={k === i ? { animationDuration: `${DURACAO[c.tipo]}ms` } : undefined} />
          </div>
        ))}
      </div>
      {fechar && (
        <button onClick={fechar} className="absolute right-3 top-6 z-30 rounded-full bg-black/30 p-2" aria-label="Fechar"><X className="size-5" /></button>
      )}

      {/* nome do lugar */}
      <div key={`l${i}`} className="hx-sobe absolute left-4 top-7 z-20 flex items-center gap-2 rounded-full bg-black/35 px-3 py-1.5 text-[13px] font-semibold backdrop-blur">
        {cena.tipo === "mundo" ? (<><span className="size-2.5 rounded-full" style={{ background: cena.mundo.cor, boxShadow: "0 0 0 2px #fff" }} />{cena.n + 1} de 8 · {cena.mundo.lugar}</>)
          : cena.tipo === "bolsa" ? <>A {info.bolsa} de {nome}</> : <>Centro Educacional Amadeus</>}
      </div>

      {cena.tipo !== "bolsa" ? (
        <>
          {/* balão de fala */}
          <div key={`b${i}`} className="hx-balao absolute left-4 right-4 top-[15%] z-20 mx-auto max-w-md">
            <div className="relative rounded-3xl bg-white px-5 py-4 text-[17px] font-semibold leading-snug text-[#0A2F7A] shadow-xl">
              <Digitando texto={fala} />
              <span className="absolute -bottom-3 left-1/2 size-6 -translate-x-1/2 rotate-45 rounded-sm bg-white" />
            </div>
          </div>

          {/* a criança */}
          <div key={`c${i}`} className="hx-pula absolute bottom-[4%] left-1/2 z-10 h-[46%] -translate-x-1/2">
            {semBoneco ? <Silhueta /> : (
              <img src={boneco} alt={nome} onError={() => setSemBoneco(true)} className="h-full w-auto max-w-none drop-shadow-[0_16px_24px_rgba(0,0,0,.45)]" />
            )}
          </div>
        </>
      ) : (
        <BolsaAberta nome={nome} info={info} chegada={info.chegada.replace("{nome}", nome)} reiniciar={() => setI(0)} />
      )}

      {/* a bolsa enchendo, no canto */}
      {cena.tipo !== "bolsa" && (
        <div className="absolute bottom-5 right-4 z-20 flex flex-col items-center">
          <div className="relative flex size-16 items-center justify-center rounded-2xl border-2 border-[#FFC21A] bg-[#0A2F7A]/85 text-3xl shadow-lg">
            🎒
            <span className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-[#FFC21A] text-xs font-extrabold text-[#0A2F7A]">{itens.length}</span>
          </div>
          <span className="mt-1 text-[11px] font-bold uppercase tracking-wider text-white/85">{info.bolsa}</span>
          {cena.tipo === "mundo" && <span key={`i${i}`} className="hx-voa pointer-events-none absolute text-4xl">{cena.mundo.item}</span>}
        </div>
      )}

      {/* toque: esquerda volta, direita avança; segurar pausa */}
      {cena.tipo !== "bolsa" && (
        <div className="absolute inset-0 z-[15] flex">
          <button aria-label="Voltar" className="h-full w-1/3" onClick={() => ir(-1)} onPointerDown={() => setPausado(true)} onPointerUp={() => setPausado(false)} onPointerLeave={() => setPausado(false)} />
          <button aria-label="Avançar" className="h-full w-2/3" onClick={() => ir(1)} onPointerDown={() => setPausado(true)} onPointerUp={() => setPausado(false)} onPointerLeave={() => setPausado(false)} />
        </div>
      )}
      {cena.tipo !== "bolsa" && (
        <div className="pointer-events-none absolute bottom-6 left-4 z-20 flex items-center gap-1 text-[11px] font-semibold text-white/70">
          <ChevronLeft className="size-3" /> toque para passar <ChevronRight className="size-3" />
        </div>
      )}
    </div>
  );
}

function Digitando({ texto }: { texto: string }) {
  const [n, setN] = useState(0);
  const ref = useRef(texto);
  useEffect(() => { ref.current = texto; setN(0); }, [texto]);
  useEffect(() => {
    if (n >= texto.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 22);
    return () => clearTimeout(t);
  }, [n, texto]);
  return (
    <span className="relative block">
      <span className="invisible">{texto}</span>
      <span className="absolute inset-0">{texto.slice(0, n)}</span>
    </span>
  );
}

function BolsaAberta({ nome, info, chegada, reiniciar }: { nome: string; info: (typeof UNIVERSOS)[keyof typeof UNIVERSOS]; chegada: string; reiniciar: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center overflow-y-auto px-5 pb-8 pt-20">
      <div className="hx-abre text-7xl">🎒</div>
      <p className="hx-sobe mt-3 max-w-sm text-center text-[19px] font-bold leading-snug">{chegada}</p>
      <div className="mt-6 grid w-full max-w-sm grid-cols-2 gap-3">
        {info.mundos.map((m, k) => (
          <div key={m.chave} className="hx-item flex items-center gap-3 rounded-2xl bg-white/95 p-3 text-[#0A2F7A] shadow" style={{ animationDelay: `${0.4 + k * 0.18}s`, borderLeft: `6px solid ${m.cor}` }}>
            <span className="text-3xl">{m.item}</span>
            <span className="text-[12px] font-semibold leading-tight">{m.itemNome}<span className="block text-[11px] font-normal text-[#4A5878]">{m.lugar}</span></span>
          </div>
        ))}
      </div>
      <p className="mt-7 text-center text-[13px] font-semibold uppercase tracking-[0.2em] text-[#FFC21A]">Arboria 2027 · a jornada de {nome}</p>
      <p className="mt-1 text-center text-[12px] text-white/70">Centro Educacional Amadeus</p>
      <button onClick={reiniciar} className="mt-6 flex items-center gap-2 rounded-full border-2 border-white/60 px-5 py-2.5 text-sm font-bold"><RotateCcw className="size-4" /> Ver de novo</button>
    </div>
  );
}

/** A escola em traço vivo: o desenho se faz sozinho. De dia na saída, entardecer na volta. */
function Escola({ noite }: { noite?: boolean }) {
  return (
    <div className="absolute inset-0" style={{ background: noite ? "linear-gradient(#1b2a6b 0%, #c2567a 55%, #ffb347 100%)" : "linear-gradient(#0A2F7A 0%, #1D55D8 55%, #8ec5ff 100%)" }}>
      <svg viewBox="0 0 300 300" className="absolute bottom-[8%] left-1/2 w-[110%] max-w-[560px] -translate-x-1/2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <g className="hx-traco">
          <path pathLength={1} d="M10 262 C80 255 220 268 290 258" />
          <path pathLength={1} d="M55 260 V150 H245 V260" />
          <path pathLength={1} d="M40 155 L150 92 L260 155" />
          <path pathLength={1} d="M130 260 V210 H170 V260" />
          <path pathLength={1} d="M75 175 h30 v26 h-30 z M195 175 h30 v26 h-30 z M75 222 h30 v22 h-30 z M195 222 h30 v22 h-30 z" />
          <path pathLength={1} d="M150 92 V45" />
          <path pathLength={1} d="M150 47 l34 9 l-34 11" stroke="#FFC21A" />
          <path pathLength={1} d="M150 112 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0" stroke="#FFC21A" />
          <path pathLength={1} d="M144 120 L150 104 L156 120 M146.5 115 h7" stroke="#FFC21A" />
          <path pathLength={1} d={noite ? "M258 52 a16 16 0 1 0 12 26 a13 13 0 0 1 -12 -26" : "M262 60 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 M262 34 v-8 M262 94 v8 M236 60 h-8 M288 60 h8"} stroke="#FFC21A" />
          <path pathLength={1} d="M25 260 c0 -22 6 -36 14 -40 c8 4 14 18 14 40 M39 240 v20 M268 260 c0 -18 5 -30 11 -33 c6 3 11 15 11 33" stroke="#9EE6B4" />
        </g>
      </svg>
    </div>
  );
}

/** As Casas do Fundamental 2 como grandes torres, na cor de cada uma (sem nada de mágico). */
function Torre({ cor, item }: { cor: string; item: string }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(#0d1530 0%, ${cor} 70%, #f4e9d8 100%)` }}>
      <svg viewBox="0 0 300 560" preserveAspectRatio="xMidYMax slice" className="hx-kb absolute inset-0 h-full w-full">
        <rect x="0" y="470" width="300" height="90" fill="#e8dcc6" />
        <path d="M0 470 H300" stroke="#cbbb9e" strokeWidth="3" />
        {/* prédios ao fundo */}
        <g fill="#000" opacity=".18"><rect x="10" y="330" width="55" height="140" /><rect x="235" y="300" width="60" height="170" /><rect x="70" y="380" width="30" height="90" /></g>
        {/* a torre */}
        <rect x="95" y="120" width="110" height="350" rx="6" fill="#f7f3ea" />
        <rect x="95" y="120" width="110" height="350" rx="6" fill={cor} opacity=".18" />
        <rect x="88" y="105" width="124" height="26" rx="5" fill={cor} />
        <rect x="140" y="55" width="4" height="52" fill="#3a3a3a" />
        <path d="M144 58 h46 l-10 12 l10 12 h-46 z" fill={cor} />
        {Array.from({ length: 6 }).map((_, r) => [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={110 + c * 30} y={150 + r * 45} width="20" height="28" rx="3" fill="#ffd77a" opacity={(r + c) % 3 ? 0.95 : 0.55} />
        )))}
        <rect x="132" y="418" width="36" height="52" rx="18" fill={cor} />
        <circle cx="150" cy="118" r="17" fill="#fff" stroke={cor} strokeWidth="4" />
        <text x="150" y="126" textAnchor="middle" fontSize="20">{item}</text>
      </svg>
    </div>
  );
}

function Silhueta() {
  return (
    <svg viewBox="0 0 120 220" className="h-full w-auto" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
      <circle cx="60" cy="42" r="28" /><path d="M60 72 v70 M60 92 l-30 26 M60 92 l30 26 M60 142 l-24 60 M60 142 l24 60" />
    </svg>
  );
}

const CSS = `
.hx-entra { animation: hxEntra .9s ease both; }
@keyframes hxEntra { from { opacity: 0; transform: scale(1.06); } to { opacity: 1; transform: none; } }
.hx-kb { animation: hxKb 12s ease-in-out both; }
@keyframes hxKb { from { transform: scale(1.0) translateY(0); } to { transform: scale(1.12) translateY(-2%); } }
.hx-barra { width: 0; animation: hxBarra linear forwards; }
@keyframes hxBarra { to { width: 100%; } }
.hx-sobe { animation: hxSobe .7s ease both .2s; }
@keyframes hxSobe { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.hx-balao { animation: hxBalao .6s cubic-bezier(.2,1.4,.4,1) both .9s; }
@keyframes hxBalao { from { opacity: 0; transform: scale(.7) translateY(20px); } to { opacity: 1; transform: none; } }
.hx-pula { animation: hxPula 1s cubic-bezier(.2,1.2,.4,1) both .3s, hxRespira 3s ease-in-out 1.4s infinite alternate; }
@keyframes hxPula { from { opacity: 0; transform: translate(20%, 40px) scale(.9); } to { opacity: 1; transform: none; } }
@keyframes hxRespira { from { transform: none; } to { transform: translateY(-8px); } }
.hx-voa { animation: hxVoa 1.4s cubic-bezier(.5,0,.3,1) both 4.5s; }
@keyframes hxVoa { 0% { opacity: 0; transform: translate(-40vw, -45vh) scale(2.2); } 25% { opacity: 1; } 85% { opacity: 1; } 100% { opacity: 0; transform: translate(0, 0) scale(.6); } }
.hx-traco path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hxTraco 2.4s ease forwards; }
.hx-traco path:nth-child(2) { animation-delay: .3s } .hx-traco path:nth-child(3) { animation-delay: .6s } .hx-traco path:nth-child(4) { animation-delay: .9s }
.hx-traco path:nth-child(5) { animation-delay: 1.1s } .hx-traco path:nth-child(6) { animation-delay: 1.3s } .hx-traco path:nth-child(7) { animation-delay: 1.5s }
.hx-traco path:nth-child(8) { animation-delay: 1.7s } .hx-traco path:nth-child(9) { animation-delay: 1.9s } .hx-traco path:nth-child(10) { animation-delay: 2.1s } .hx-traco path:nth-child(11) { animation-delay: 2.3s }
@keyframes hxTraco { to { stroke-dashoffset: 0; } }
.hx-abre { animation: hxAbre 1.2s cubic-bezier(.2,1.5,.4,1) both; }
@keyframes hxAbre { from { transform: scale(.3) rotate(-15deg); opacity: 0; } to { transform: none; opacity: 1; } }
.hx-item { animation: hxSobe .6s ease both; }
@media (prefers-reduced-motion: reduce) { .hx-kb, .hx-pula, .hx-voa { animation: none !important; } }
`;
