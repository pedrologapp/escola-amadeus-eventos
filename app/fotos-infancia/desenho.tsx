/**
 * Desenho de criança que vai se desenhando sozinho: cada traço tem
 * pathLength=1 e anima o stroke-dashoffset de 1 a 0, um depois do outro.
 * O filtro "giz" treme a borda para parecer lápis de cor.
 * Quem pede menos movimento (prefers-reduced-motion) vê o desenho pronto.
 */

type Traco = { d: string; cor: string; w?: number; fill?: string };

const AZUL = "#1D4FA0";
const MARINHO = "#083078";
const AMARELO = "#FFB000";
const VERMELHO = "#E0524C";
const VERDE = "#3FA66B";
const ROSA = "#E86FA6";

const TRACOS: Traco[] = [
  // chão
  { d: "M20 330 C140 318 260 338 380 326 S620 318 700 330", cor: VERDE, w: 5 },
  // sol e raios
  { d: "M620 70 m-38 0 a38 38 0 1 0 76 0 a38 38 0 1 0 -76 0", cor: AMARELO, w: 6, fill: "#FFB00033" },
  { d: "M620 14v-10 M620 136v10 M564 70h-12 M676 70h12 M580 30l-8-8 M660 30l8-8 M580 110l-8 8 M660 110l8 8", cor: AMARELO, w: 5 },
  // arco-íris
  { d: "M40 250 C60 120 250 110 290 240", cor: VERMELHO, w: 7 },
  { d: "M60 252 C80 145 235 138 268 244", cor: AMARELO, w: 7 },
  { d: "M80 254 C100 170 218 165 246 248", cor: AZUL, w: 7 },
  // casinha
  { d: "M300 330 V240 H430 V330", cor: MARINHO, w: 5, fill: "#08307812" },
  { d: "M288 244 L365 180 L442 244", cor: VERMELHO, w: 6 },
  { d: "M350 330 V290 H380 V330", cor: AMARELO, w: 5 },
  { d: "M398 262 h20 v20 h-20 z M408 262 v20 M398 272 h20", cor: AZUL, w: 4 },
  // árvore
  { d: "M500 330 V262", cor: "#8A5A2B", w: 7 },
  { d: "M500 270 C455 272 452 215 482 208 C478 176 526 170 530 200 C566 196 568 262 500 270 Z", cor: VERDE, w: 5, fill: "#3FA66B26" },
  // criança de braços abertos
  { d: "M585 250 m-14 0 a14 14 0 1 0 28 0 a14 14 0 1 0 -28 0", cor: MARINHO, w: 5 },
  { d: "M585 264 V300 M585 300 L570 328 M585 300 L600 328 M585 276 L560 262 M585 276 L612 258", cor: MARINHO, w: 5 },
  { d: "M578 248 h0.1 M592 248 h0.1 M579 256 q6 5 12 0", cor: MARINHO, w: 4 },
  // pipa com rabinho, na mão da criança
  { d: "M660 150 L690 185 L660 230 L630 185 Z", cor: ROSA, w: 5, fill: "#E86FA630" },
  { d: "M630 185 H690 M660 150 V230", cor: ROSA, w: 3 },
  { d: "M612 258 C630 245 650 240 660 230", cor: MARINHO, w: 2.5 },
  { d: "M660 230 c10 12 -10 18 0 30 c10 12 -10 18 0 30", cor: AMARELO, w: 4 },
  // nuvem e passarinhos
  { d: "M150 70 c-20 0 -22 -26 -2 -28 c2 -22 36 -24 40 -4 c20 -6 30 20 12 32 z", cor: AZUL, w: 4, fill: "#1D4FA014" },
  { d: "M420 70 q10 -12 20 0 q10 -12 20 0 M470 100 q8 -10 16 0 q8 -10 16 0", cor: MARINHO, w: 4 },
  // estrelinhas
  { d: "M260 50 v18 M251 59 h18 M720 250 v16 M712 258 h16", cor: AMARELO, w: 4 },
];

export function DesenhoInfancia({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 720 350" className={className} role="img" aria-label="Desenho de criança: sol, arco-íris, casinha, árvore e uma criança soltando pipa">
      <defs>
        <filter id="giz" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
        </filter>
      </defs>
      <style>{`
        .traco { stroke-dasharray: 1; stroke-dashoffset: 1; animation: desenhar .9s ease-out forwards; }
        .preenche { fill-opacity: 0; animation: pintar .6s ease-out forwards; }
        @keyframes desenhar { to { stroke-dashoffset: 0; } }
        @keyframes pintar { to { fill-opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .traco, .preenche { animation: none; stroke-dashoffset: 0; fill-opacity: 1; }
        }
      `}</style>
      <g filter="url(#giz)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        {TRACOS.map((t, i) => (
          <path
            key={i}
            d={t.d}
            pathLength={1}
            stroke={t.cor}
            strokeWidth={t.w ?? 5}
            fill={t.fill ?? "none"}
            className={t.fill ? "traco preenche" : "traco"}
            style={{ animationDelay: t.fill ? `${i * 0.28}s, ${i * 0.28 + 0.7}s` : `${i * 0.28}s` }}
          />
        ))}
      </g>
    </svg>
  );
}
