"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, X } from "lucide-react";
import { UNIVERSOS, bonecoPadrao, primeiroNome, universoDaSerie, type Mundo, type Universo } from "@/lib/arboria-historia";
import type { CriancaHistoria } from "./actions";

/**
 * A história de uma criança, como "stories" animados:
 * escola → base (Nave Vagalume / Central / Agência / pátio das Casas) → os 8 lugares → volta à escola.
 * A criança se move entre os lugares (no Infantil, de nave; no 1º e 2º, voando de herói; do 3º ao 9º, correndo),
 * os fundos são os animados, e a mochila nas costas cresce a cada lugar até ficar maior que ela.
 * As falas ficam em bilhetes de caderno, com letra de mão.
 */

type Cena =
  | { tipo: "escola" }
  | { tipo: "base" }
  | { tipo: "mundo"; mundo: Mundo; n: number }
  | { tipo: "volta" }
  | { tipo: "fim" };

const DURACAO: Record<Cena["tipo"], number> = { escola: 6500, base: 7000, mundo: 7600, volta: 7500, fim: 0 };
const SAIDA = 700;   // a criança sai da tela
const VIAGEM = 1500; // o trajeto até o próximo lugar

// arte do destino que aparece na viagem (Infantil: o planeta; heróis: o lugar)
const DESTINO: Record<string, string> = {
  "inf-linguistico": "mundo-linguistico", "inf-logico": "mundo-logico", "inf-espacial": "mundo-espacial", "inf-musical": "mundo-musical",
  "inf-corporal": "mundo-corporal", "inf-naturalista": "mundo-naturalista", "inf-interpessoal": "mundo-interpessoal", "inf-intrapessoal": "mundo-intrapessoal",
  "her-torre-do-eco": "torre-do-eco", "her-usina-do-porque": "usina-do-porque", "her-cidade-dobravel": "cidade-dobravel", "her-estacao-do-compasso": "estacao-do-compasso",
  "her-canteiro-dourado": "canteiro-dourado", "her-museu-das-mil-gavetas": "museu-mil-gavetas", "her-porto-dos-recados": "porto-dos-recados", "her-farol-de-dentro": "farol-de-dentro",
};

// tamanho da mochila: pequena na escola, cresce a cada lugar, enorme na volta
const tamanhoMochila = (c: Cena) => (c.tipo === "escola" || c.tipo === "base" ? 0.72 : c.tipo === "mundo" ? 0.85 + c.n * 0.19 : 2.35);

export function Historia({ crianca, fechar }: { crianca: CriancaHistoria; fechar?: () => void }) {
  const universo = universoDaSerie(crianca.serie);
  const info = UNIVERSOS[universo];
  const nome = primeiroNome(crianca.nome);
  const cenas = useMemo<Cena[]>(() => [
    { tipo: "escola" }, { tipo: "base" },
    ...info.mundos.map((mundo, n) => ({ tipo: "mundo" as const, mundo, n })),
    { tipo: "volta" }, { tipo: "fim" },
  ], [info]);
  const [i, setI] = useState(0);
  const [etapa, setEtapa] = useState<"cena" | "saida" | "viagem">("cena");
  const [pausado, setPausado] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cena = cenas[i];
  const marcadas = new Set(crianca.respostas.filter(Boolean));
  const boneco = crianca.boneco_url || bonecoPadrao(universo, crianca.genero, crianca.pele, crianca.cabelo);

  const limpar = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  // avançar: a criança sai da tela, vem a viagem, e ela chega no próximo lugar
  const avancar = useCallback(() => {
    if (etapa !== "cena" || i >= cenas.length - 1) return;
    limpar();
    if (cenas[i + 1].tipo === "fim") { setI(i + 1); return; }
    setEtapa("saida");
    timers.current.push(setTimeout(() => { setI(i + 1); setEtapa("viagem"); }, SAIDA));
    timers.current.push(setTimeout(() => setEtapa("cena"), SAIDA + VIAGEM));
  }, [etapa, i, cenas]);
  const voltar = () => { limpar(); setEtapa("cena"); setI((x) => Math.max(0, x - 1)); };
  useEffect(() => () => limpar(), []);

  useEffect(() => {
    if (pausado || etapa !== "cena") return;
    const d = DURACAO[cena.tipo];
    if (!d) return;
    const t = setTimeout(avancar, d);
    return () => clearTimeout(t);
  }, [i, pausado, etapa, cena.tipo, avancar]);

  const fala = cena.tipo === "escola" ? info.abertura : cena.tipo === "base" ? info.baseFala
    : cena.tipo === "mundo" ? (marcadas.has(cena.mundo.chave) ? cena.mundo.brilho : cena.mundo.fala)
    : cena.tipo === "volta" ? info.chegada : "";
  const lugar = cena.tipo === "mundo" ? cena.mundo.lugar : cena.tipo === "base" ? info.baseNome : "Centro Educacional Amadeus";
  const proxima = cenas[i + 1];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#071a47] text-white select-none">
      <style>{CSS}</style>

      {/* o lugar */}
      <div key={`f${i}`} className="absolute inset-0 hx-entra">
        <Fundo cena={cena} universo={universo} />
        <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/25" />
      </div>
      {/* deixa o vídeo do próximo lugar carregando */}
      {proxima?.tipo === "mundo" && proxima.mundo.fundo && <video src={`/arboria/vivos/${proxima.mundo.fundo}.mp4`} preload="auto" muted className="hidden" />}

      {/* barrinhas de progresso */}
      <div className="absolute left-3 right-3 top-3 z-30 flex gap-1">
        {cenas.slice(0, -1).map((c, k) => (
          <div key={k} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/30">
            <div className={`h-full bg-white ${k < i ? "w-full" : k === i && etapa === "cena" && !pausado ? "hx-barra" : "w-0"}`}
              style={k === i ? { animationDuration: `${DURACAO[c.tipo]}ms` } : undefined} />
          </div>
        ))}
      </div>
      {fechar && <button onClick={fechar} className="absolute right-3 top-6 z-40 rounded-full bg-black/30 p-2" aria-label="Fechar"><X className="size-5" /></button>}

      {cena.tipo === "fim" ? (
        <Fim nome={nome} boneco={boneco} reiniciar={() => { setI(0); setEtapa("cena"); }} />
      ) : (
        <>
          {/* nome do lugar, num bilhete amarelo */}
          {etapa === "cena" && (
            <div key={`l${i}`} className="hx-etiqueta caderno absolute left-4 top-8 z-20 px-4 pb-1 pt-1.5 text-[24px] leading-none text-[#3b2a06]">
              {cena.tipo === "mundo" && <span className="mr-1.5 inline-block size-3 rounded-full align-middle" style={{ background: cena.mundo.cor }} />}
              {lugar}
            </div>
          )}

          {/* a fala, num pedaço de caderno */}
          {etapa === "cena" && fala && (
            <div key={`b${i}`} className="hx-bilhete absolute left-4 right-4 top-[13%] z-20 mx-auto max-w-md">
              <div className="folha caderno relative px-5 pb-4 pl-10 pt-5 text-[25px] leading-[30px] text-[#23305e]">
                <span className="fita" />
                <Digitando texto={fala.replace("{nome}", nome)} />
              </div>
            </div>
          )}

          {/* a criança, com a mochila nas costas */}
          <div className={`absolute bottom-[3%] left-1/2 z-10 h-[47%] [transform:translateX(-50%)] ${etapa === "saida" ? `sai-${universo}` : etapa === "cena" ? `entra-${universo}` : "opacity-0"}`} key={`c${i}${etapa}`}>
            <Crianca boneco={boneco} nome={nome} mochila={tamanhoMochila(cena)} andando={etapa === "cena"} />
          </div>
        </>
      )}

      {/* a viagem até o próximo lugar */}
      {etapa === "viagem" && <Viagem universo={universo} cena={cena} boneco={boneco} mochila={tamanhoMochila(cena)} />}

      {/* toque: esquerda volta, direita avança; segurar pausa */}
      {cena.tipo !== "fim" && (
        <div className="absolute inset-0 z-[15] flex">
          <button aria-label="Voltar" className="h-full w-1/3" onClick={voltar} onPointerDown={() => setPausado(true)} onPointerUp={() => setPausado(false)} onPointerLeave={() => setPausado(false)} />
          <button aria-label="Avançar" className="h-full w-2/3" onClick={avancar} onPointerDown={() => setPausado(true)} onPointerUp={() => setPausado(false)} onPointerLeave={() => setPausado(false)} />
        </div>
      )}
    </div>
  );
}

/* ---------------- peças ---------------- */

function Fundo({ cena, universo }: { cena: Cena; universo: Universo }) {
  if (cena.tipo === "mundo" && cena.mundo.fundo) {
    return (
      <video key={cena.mundo.fundo} src={`/arboria/vivos/${cena.mundo.fundo}.mp4`} poster={`/arboria/fundos/${cena.mundo.fundo}.webp`}
        autoPlay muted loop playsInline className="absolute inset-0 h-full w-full object-cover" />
    );
  }
  if (cena.tipo === "mundo") return <Torre cor={cena.mundo.cor} />;
  if (cena.tipo === "base") return <Base universo={universo} />;
  return <Escola tarde={cena.tipo === "volta"} />;
}

function Crianca({ boneco, nome, mochila, andando }: { boneco: string; nome: string; mochila: number; andando: boolean }) {
  const [sem, setSem] = useState(false);
  return (
    <div className={`relative h-full aspect-[2/3] ${andando ? "hx-anda" : ""}`}>
      {/* a mochila fica atrás da criança e vai crescendo para cima e para os lados */}
      <div className="hx-mochila absolute left-[66%] top-[22%] w-[62%] -translate-x-1/2" style={{ ["--m" as string]: mochila }}>
        <Mochila />
      </div>
      {sem ? <Silhueta /> : (
        <img src={boneco} alt={nome} onError={() => setSem(true)} className="relative h-full w-full object-contain drop-shadow-[0_14px_22px_rgba(0,0,0,.45)]" />
      )}
    </div>
  );
}

function Mochila() {
  return (
    <svg viewBox="0 0 100 110" className="w-full overflow-visible drop-shadow-[0_8px_10px_rgba(0,0,0,.35)]">
      <path d="M33 14 C33 2 67 2 67 14" fill="none" stroke="#FFC21A" strokeWidth="6" strokeLinecap="round" />
      <rect x="10" y="12" width="80" height="94" rx="26" fill="#1B3B7C" />
      <rect x="10" y="12" width="80" height="94" rx="26" fill="url(#brilho)" />
      <path d="M14 40 C30 30 70 30 86 40 L86 30 C86 18 74 12 62 12 H38 C26 12 14 18 14 30 Z" fill="#163066" />
      <rect x="24" y="58" width="52" height="38" rx="12" fill="#244a94" stroke="#FFC21A" strokeWidth="3" />
      <path d="M30 70 H70" stroke="#FFC21A" strokeWidth="3" strokeLinecap="round" />
      <circle cx="50" cy="83" r="7" fill="#FFC21A" />
      <path d="M47 86 L50 79 L53 86" stroke="#1B3B7C" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <path d="M18 24 V96 M82 24 V96" stroke="#FFC21A" strokeWidth="2" strokeDasharray="4 5" opacity=".7" />
      <defs><linearGradient id="brilho" x1="0" x2="1"><stop offset="0" stopColor="#fff" stopOpacity=".18" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
    </svg>
  );
}

/** A viagem entre um lugar e outro, do jeito de cada idade. */
function Viagem({ universo, cena, boneco, mochila }: { universo: Universo; cena: Cena; boneco: string; mochila: number }) {
  const destino = cena.tipo === "mundo" && cena.mundo.fundo ? DESTINO[cena.mundo.fundo] : cena.tipo === "base" ? UNIVERSOS[universo].base : null;
  const rotulo = cena.tipo === "mundo" ? cena.mundo.lugar : cena.tipo === "base" ? UNIVERSOS[universo].baseNome : "de volta pra escola";
  if (universo === "infantil") {
    // o espaço, a nave atravessa a tela e o planeta cresce
    return (
      <div className="absolute inset-0 z-40 overflow-hidden" style={{ background: "radial-gradient(circle at 50% 45%, #2a3f9e 0%, #0b1440 60%, #050a24 100%)" }}>
        <Estrelas />
        {destino && destino !== "nave-vagalume" && <img src={`/arboria/artes/${destino}.webp`} alt="" className="vg-planeta absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2" />}
        {cena.tipo !== "mundo" && <EscolinhaLonge />}
        <img src="/arboria/artes/nave-vagalume.webp" alt="" className="vg-nave absolute top-[52%] w-[46%]" />
        <p className="caderno vg-rotulo absolute bottom-[12%] left-0 right-0 text-center text-[30px] text-[#FFE38A]">rumo a: {rotulo}</p>
      </div>
    );
  }
  if (universo === "herois") {
    // o herói atravessa o céu voando, com linhas de velocidade
    return (
      <div className="absolute inset-0 z-40 overflow-hidden" style={{ background: "linear-gradient(#2f7de0, #8fd0ff)" }}>
        <div className="vg-linhas absolute inset-0" />
        {destino && <img src={`/arboria/artes/${destino}.webp`} alt="" className="vg-planeta absolute left-1/2 top-1/2 w-[66%] -translate-x-1/2 -translate-y-1/2" />}
        <div className="vg-heroi absolute top-[30%] h-[34%]"><Crianca boneco={boneco} nome="" mochila={mochila} andando={false} /></div>
        <p className="caderno vg-rotulo absolute bottom-[10%] left-0 right-0 text-center text-[30px] text-[#0A2F7A]">voando para: {rotulo}</p>
      </div>
    );
  }
  // 3º ao 9º ano: corre pelo mapa (Orbe) ou pelo pátio das Casas
  return (
    <div className="absolute inset-0 z-40 overflow-hidden bg-[#e9dcc0]">
      {universo === "talentos"
        ? <img src="/arboria/artes/mapa-orbe.webp" alt="" className="vg-mapa absolute top-0 h-full max-w-none" />
        : <Patio destaque={cena.tipo === "mundo" ? cena.mundo.cor : null} pequeno />}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none"><path className="vg-trilha" d="M-5 78 C25 60 45 92 70 70 S95 62 110 66" fill="none" stroke="#B3261E" strokeWidth=".8" strokeDasharray="2 2" pathLength={1} /></svg>
      <div className="vg-corre absolute bottom-[8%] h-[40%]"><Crianca boneco={boneco} nome="" mochila={mochila} andando /></div>
      <p className="caderno vg-rotulo absolute top-[12%] left-0 right-0 text-center text-[32px] text-[#3b2a06]">próximo destino: {rotulo}</p>
    </div>
  );
}

function Fim({ nome, boneco, reiniciar }: { nome: string; boneco: string; reiniciar: () => void }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-end pb-10" style={{ background: "linear-gradient(#1b2a6b 0%, #c2567a 60%, #ffb347 100%)" }}>
      <div className="folha caderno hx-bilhete absolute left-4 right-4 top-[10%] mx-auto max-w-md px-6 pb-5 pl-10 pt-6 text-center text-[#23305e]">
        <span className="fita" />
        <p className="text-[34px] leading-[36px]">A jornada de {nome}</p>
        <p className="mt-1 text-[24px] leading-[30px]">Arboria 2027 · Centro Educacional Amadeus</p>
      </div>
      <div className="relative h-[52%] hx-cansado"><Crianca boneco={boneco} nome={nome} mochila={2.6} andando={false} /></div>
      <button onClick={reiniciar} className="caderno relative z-30 mt-3 flex items-center gap-2 rounded-full bg-white/90 px-6 py-1.5 text-[24px] text-[#0A2F7A]"><RotateCcw className="size-5" /> ver de novo</button>
    </div>
  );
}

function Digitando({ texto }: { texto: string }) {
  const [n, setN] = useState(0);
  useEffect(() => { setN(0); }, [texto]);
  useEffect(() => {
    if (n >= texto.length) return;
    const t = setTimeout(() => setN((x) => x + 1), 26);
    return () => clearTimeout(t);
  }, [n, texto]);
  return (
    <span className="relative block">
      <span className="invisible">{texto}</span>
      <span className="absolute inset-0">{texto.slice(0, n)}</span>
    </span>
  );
}

function Base({ universo }: { universo: Universo }) {
  const arte = UNIVERSOS[universo].base;
  const ceu = universo === "infantil" ? "radial-gradient(circle at 50% 30%, #2a3f9e, #0b1440 70%)" : universo === "herois" ? "linear-gradient(#2f7de0, #a7dcff)" : universo === "talentos" ? "linear-gradient(#e7a65a, #f7e2b8)" : "linear-gradient(#0d1530, #3d4a7a 70%, #e8dcc6)";
  return (
    <div className="absolute inset-0" style={{ background: ceu }}>
      {universo === "infantil" && <Estrelas />}
      {arte ? <img src={`/arboria/artes/${arte}.webp`} alt="" className="hx-flutua absolute left-1/2 top-[24%] w-[72%] max-w-[440px] -translate-x-1/2" /> : <Patio />}
    </div>
  );
}

/** A escola em traço vivo: o desenho se faz sozinho. De manhã na saída, entardecer na volta. */
function Escola({ tarde }: { tarde?: boolean }) {
  return (
    <div className="absolute inset-0" style={{ background: tarde ? "linear-gradient(#1b2a6b 0%, #c2567a 55%, #ffb347 100%)" : "linear-gradient(#0A2F7A 0%, #1D55D8 55%, #8ec5ff 100%)" }}>
      <svg viewBox="0 0 300 300" className="absolute bottom-[14%] left-1/2 w-[112%] max-w-[560px] -translate-x-1/2" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
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
          <path pathLength={1} d={tarde ? "M258 52 a16 16 0 1 0 12 26 a13 13 0 0 1 -12 -26" : "M262 60 m-15 0 a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0 M262 34 v-8 M262 94 v8 M236 60 h-8 M288 60 h8"} stroke="#FFC21A" />
          <path pathLength={1} d="M25 260 c0 -22 6 -36 14 -40 c8 4 14 18 14 40 M39 240 v20 M268 260 c0 -18 5 -30 11 -33 c6 3 11 15 11 33" stroke="#9EE6B4" />
        </g>
      </svg>
      <p className="caderno absolute bottom-[7%] left-0 right-0 text-center text-[26px] text-white/90">Centro Educacional Amadeus</p>
    </div>
  );
}

function EscolinhaLonge() {
  return (
    <svg viewBox="0 0 100 80" className="vg-planeta absolute left-1/2 top-1/2 w-[46%] -translate-x-1/2 -translate-y-1/2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
      <path d="M15 75 V40 H85 V75 M8 42 L50 15 L92 42 M42 75 V58 H58 V75" /><path d="M50 15 V3 l12 4 l-12 4" stroke="#FFC21A" />
    </svg>
  );
}

/** As Casas do Fundamental 2 como grandes torres, na cor de cada uma (sem nada de mágico). */
function Torre({ cor }: { cor: string }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(#0d1530 0%, ${cor} 72%, #f4e9d8 100%)` }}>
      <svg viewBox="0 0 300 560" preserveAspectRatio="xMidYMax meet" className="hx-kb absolute inset-0 h-full w-full">
        <rect x="-200" y="470" width="700" height="90" fill="#e8dcc6" />
        <g fill="#000" opacity=".18"><rect x="-10" y="330" width="70" height="140" /><rect x="240" y="300" width="70" height="170" /><rect x="62" y="380" width="30" height="90" /></g>
        <rect x="90" y="110" width="120" height="360" rx="6" fill="#f7f3ea" />
        <rect x="90" y="110" width="120" height="360" rx="6" fill={cor} opacity=".2" />
        <rect x="82" y="94" width="136" height="26" rx="5" fill={cor} />
        <rect x="148" y="40" width="4" height="56" fill="#3a3a3a" />
        <path d="M152 44 h48 l-10 12 l10 12 h-48 z" fill={cor} />
        {Array.from({ length: 6 }).map((_, r) => [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={107 + c * 32} y={140 + r * 46} width="22" height="30" rx="3" fill="#ffd77a" opacity={(r + c) % 3 ? 0.95 : 0.55} />
        )))}
        <rect x="132" y="416" width="36" height="54" rx="18" fill={cor} />
      </svg>
    </div>
  );
}

const CORES_CASAS = ["#1E3A8A", "#047857", "#7C3AED", "#7F1D1D", "#B8860B", "#78350F", "#0891B2", "#EA580C"];
/** O pátio das Casas: as oito torres lado a lado. */
function Patio({ destaque, pequeno }: { destaque?: string | null; pequeno?: boolean }) {
  return (
    <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMax slice" className={`absolute inset-x-0 bottom-0 w-full ${pequeno ? "h-[70%]" : "h-[78%]"}`}>
      <rect x="0" y="250" width="300" height="50" fill="#e8dcc6" />
      {CORES_CASAS.map((c, k) => {
        const x = 8 + k * 36, h = 120 + ((k * 37) % 5) * 18, y = 250 - h;
        const on = !destaque || destaque === c;
        return (
          <g key={c} opacity={on ? 1 : 0.35}>
            <rect x={x} y={y} width="30" height={h} rx="3" fill="#f7f3ea" />
            <rect x={x - 2} y={y - 8} width="34" height="10" rx="2" fill={c} />
            <rect x={x + 14} y={y - 26} width="2" height="20" fill="#444" />
            <path d={`M${x + 16} ${y - 25} h14 l-4 5 l4 5 h-14 z`} fill={c} />
            {[0, 1, 2, 3].map((r) => <rect key={r} x={x + 6} y={y + 12 + r * 24} width="18" height="12" rx="2" fill="#ffd77a" />)}
          </g>
        );
      })}
    </svg>
  );
}

function Estrelas() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 40 }).map((_, k) => (
        <span key={k} className="hx-estrela absolute rounded-full bg-white" style={{ left: `${(k * 37) % 100}%`, top: `${(k * 53) % 100}%`, width: k % 5 ? 2 : 3, height: k % 5 ? 2 : 3, animationDelay: `${(k % 7) * 0.3}s` }} />
      ))}
    </div>
  );
}

function Silhueta() {
  return (
    <svg viewBox="0 0 120 220" className="relative h-full w-full" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round">
      <circle cx="60" cy="42" r="28" /><path d="M60 72 v70 M60 92 l-30 26 M60 92 l30 26 M60 142 l-24 60 M60 142 l24 60" />
    </svg>
  );
}

const CSS = `
.caderno { font-family: var(--font-caderno), "Caveat", cursive; font-weight: 700; }
.folha { background: #fffdf6 repeating-linear-gradient(transparent 0 29px, #c9d8ef 29px 30px); background-position: 0 14px; border-radius: 4px;
  box-shadow: 0 10px 24px rgba(0,0,0,.35); transform: rotate(-1.2deg); }
.folha::before { content: ""; position: absolute; top: 0; bottom: 0; left: 26px; width: 2px; background: #f2a6a6; }
.fita { position: absolute; top: -12px; left: 50%; width: 92px; height: 24px; transform: translateX(-50%) rotate(-3deg); background: rgba(255,214,107,.85); box-shadow: 0 1px 2px rgba(0,0,0,.15); }
.hx-etiqueta { background: #FFE38A; transform: rotate(-2deg); box-shadow: 0 4px 10px rgba(0,0,0,.3); animation: hxCai .6s cubic-bezier(.2,1.4,.4,1) both .2s; }
@keyframes hxCai { from { opacity: 0; transform: translateY(-20px) rotate(-8deg); } to { opacity: 1; transform: rotate(-2deg); } }
.hx-bilhete { animation: hxBilhete .7s cubic-bezier(.2,1.3,.4,1) both 1s; }
@keyframes hxBilhete { from { opacity: 0; transform: translateY(24px) scale(.85) rotate(3deg); } to { opacity: 1; transform: none; } }
.hx-entra { animation: hxEntra .8s ease both; }
@keyframes hxEntra { from { opacity: 0; } to { opacity: 1; } }
.hx-kb { animation: hxKb 12s ease-in-out both; }
@keyframes hxKb { from { transform: scale(1); } to { transform: scale(1.06); } }
.hx-barra { width: 0; animation: hxBarra linear forwards; }
@keyframes hxBarra { to { width: 100%; } }
.hx-flutua { animation: hxFlutua 3.2s ease-in-out infinite alternate; }
@keyframes hxFlutua { from { translate: -50% 0; } to { translate: -50% -14px; } }
.hx-estrela { opacity: .7; animation: hxPisca 1.8s ease-in-out infinite alternate; }
@keyframes hxPisca { to { opacity: .15; } }

/* a criança andando no lugar: balança e dá passinhos */
.hx-anda { animation: hxAnda .9s ease-in-out infinite alternate; transform-origin: 50% 100%; }
@keyframes hxAnda { 0% { transform: translateY(0) rotate(-2.5deg); } 50% { transform: translateY(-10px) rotate(0deg); } 100% { transform: translateY(0) rotate(2.5deg); } }
.hx-cansado { animation: hxCansado 1.6s ease-in-out infinite alternate; transform-origin: 50% 100%; }
@keyframes hxCansado { from { transform: rotate(-5deg) translateX(-6px); } to { transform: rotate(4deg) translateX(6px); } }

/* a mochila: cresce com um "boing" quando chega no lugar */
.hx-mochila { transform-origin: 50% 85%; scale: var(--m); transition: scale 1.1s cubic-bezier(.3,1.8,.5,1) .5s; animation: hxMochila 2.4s ease-in-out infinite alternate; }
@keyframes hxMochila { from { rotate: -3deg; } to { rotate: 3deg; } }

/* entradas e saídas, do jeito de cada idade */
.entra-infantil { animation: entraInf 1s cubic-bezier(.2,1.3,.4,1) both; }
@keyframes entraInf { from { opacity: 0; transform: translate(-50%, -70vh) scale(.4); } to { opacity: 1; transform: translate(-50%, 0); } }
.sai-infantil { animation: saiInf .7s ease-in both; }
@keyframes saiInf { to { opacity: 0; transform: translate(-50%, -60vh) scale(.3) rotate(10deg); } }
.entra-herois { animation: entraHer .9s cubic-bezier(.2,1.2,.4,1) both; }
@keyframes entraHer { 0% { opacity: 0; transform: translate(-150%, -60vh) rotate(-25deg); } 70% { opacity: 1; transform: translate(-50%, 8px) scaleY(.88); } 100% { transform: translate(-50%, 0); } }
.sai-herois { animation: saiHer .7s ease-in both; }
@keyframes saiHer { 0% { transform: translate(-50%, 0); } 25% { transform: translate(-50%, 12px) scaleY(.85); } 100% { opacity: 0; transform: translate(80%, -80vh) rotate(25deg); } }
.entra-talentos, .entra-casas { animation: entraCorre .9s cubic-bezier(.2,1,.4,1) both; }
@keyframes entraCorre { 0% { transform: translate(-160vw, 0); } 60% { transform: translate(-45%, -12px); } 100% { transform: translate(-50%, 0); } }
.sai-talentos, .sai-casas { animation: saiCorre .7s ease-in both; }
@keyframes saiCorre { 0% { transform: translate(-50%, 0); } 20% { transform: translate(-56%, 0) rotate(-4deg); } 100% { transform: translate(120vw, -10px) rotate(6deg); } }

/* viagens */
.vg-nave { animation: vgNave 1.5s cubic-bezier(.45,.05,.55,.95) both; }
@keyframes vgNave { 0% { left: -50%; transform: translateY(40px) rotate(-8deg) scale(.8); } 50% { transform: translateY(-30px) rotate(4deg) scale(1); } 100% { left: 110%; transform: translateY(10px) rotate(-6deg) scale(.7); } }
.vg-planeta { animation: vgPlaneta 1.5s ease-in both; }
@keyframes vgPlaneta { 0% { opacity: 0; scale: .15; } 40% { opacity: 1; } 100% { opacity: 1; scale: 1.25; } }
.vg-rotulo { animation: hxCai .5s ease both .3s; }
.vg-linhas { background: repeating-linear-gradient(-20deg, transparent 0 40px, rgba(255,255,255,.45) 40px 43px); animation: vgLinhas .4s linear infinite; }
@keyframes vgLinhas { to { background-position: -120px 40px; } }
.vg-heroi { animation: vgHeroi 1.5s cubic-bezier(.45,.05,.55,.95) both; }
@keyframes vgHeroi { 0% { left: -40%; transform: rotate(-30deg) translateY(30px); } 100% { left: 110%; transform: rotate(-20deg) translateY(-60px); } }
.vg-mapa { animation: vgMapa 1.5s linear both; }
@keyframes vgMapa { from { left: 0; } to { left: -60%; } }
.vg-trilha { stroke-dasharray: 1; stroke-dashoffset: 1; animation: vgTrilha 1.3s ease forwards; }
@keyframes vgTrilha { to { stroke-dashoffset: 0; } }
.vg-corre { animation: vgCorre 1.5s linear both; }
@keyframes vgCorre { from { left: -35%; } to { left: 105%; } }

.hx-traco path { stroke-dasharray: 1; stroke-dashoffset: 1; animation: hxTraco 2.4s ease forwards; }
.hx-traco path:nth-child(2) { animation-delay: .3s } .hx-traco path:nth-child(3) { animation-delay: .6s } .hx-traco path:nth-child(4) { animation-delay: .9s }
.hx-traco path:nth-child(5) { animation-delay: 1.1s } .hx-traco path:nth-child(6) { animation-delay: 1.3s } .hx-traco path:nth-child(7) { animation-delay: 1.5s }
.hx-traco path:nth-child(8) { animation-delay: 1.7s } .hx-traco path:nth-child(9) { animation-delay: 1.9s } .hx-traco path:nth-child(10) { animation-delay: 2.1s } .hx-traco path:nth-child(11) { animation-delay: 2.3s }
@keyframes hxTraco { to { stroke-dashoffset: 0; } }
@media (prefers-reduced-motion: reduce) { .hx-anda, .hx-mochila, .vg-linhas { animation: none !important; } }
`;
