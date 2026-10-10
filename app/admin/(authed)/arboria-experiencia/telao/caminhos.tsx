"use client";

import { RAMOS } from "@/lib/arboria-atividade";

/**
 * A atividade dos pais na TV: os 8 ramos em volta e, para cada pai, um fio que passa pelas 3 respostas dele.
 * Cada fio novo se desenha na hora; os ramos crescem conforme recebem respostas.
 */
const W = 1920, H = 1080, CX = 960, CY = 590, RX = 640, RY = 330;
const POS = RAMOS.map((_, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / RAMOS.length; return [CX + RX * Math.cos(a), CY + RY * Math.sin(a)] as const; });
const idx = (k: string) => RAMOS.findIndex((r) => r.chave === k);

// um número "aleatório" fixo por fio, para cada um ter a sua curva
const sorte = (n: number, s: number) => { const x = Math.sin(n * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };

function fio(caminho: string[], n: number) {
  const pts = caminho.map((k) => POS[Math.max(0, idx(k))]);
  let d = `M${pts[0][0].toFixed(0)} ${pts[0][1].toFixed(0)}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    // a curva passa perto do centro, com um desvio próprio de cada pai
    const mx = (x0 + x1) / 2 * 0.45 + CX * 0.55 + (sorte(n, i) - 0.5) * 360;
    const my = (y0 + y1) / 2 * 0.45 + CY * 0.55 + (sorte(n, i + 7) - 0.5) * 260;
    if (x0 === x1 && y0 === y1) d += ` C${(x0 + (sorte(n, i + 3) - 0.5) * 240).toFixed(0)} ${(y0 - 160).toFixed(0)} ${(x0 + (sorte(n, i + 5) - 0.5) * 240).toFixed(0)} ${(y0 + 160).toFixed(0)} ${x1.toFixed(0)} ${y1.toFixed(0)}`;
    else d += ` Q${mx.toFixed(0)} ${my.toFixed(0)} ${x1.toFixed(0)} ${y1.toFixed(0)}`;
  }
  return d;
}

export function Caminhos({ caminhos, apagado = false }: { caminhos: string[][]; apagado?: boolean }) {
  const conta = RAMOS.map((r) => caminhos.reduce((a, c) => a + c.filter((k) => k === r.chave).length, 0));
  const max = Math.max(1, ...conta);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" style={{ opacity: apagado ? 0.35 : 1, transition: "opacity 1.2s" }}>
      <style>{`
        .cm-fio { fill: none; stroke-width: 3.2; stroke-linecap: round; stroke-dasharray: 1; stroke-dashoffset: 1; opacity: .75; animation: cmFio 2.4s cubic-bezier(.5,0,.3,1) forwards; mix-blend-mode: screen; }
        @keyframes cmFio { to { stroke-dashoffset: 0; } }
        .cm-no { transition: r .8s cubic-bezier(.2,1.5,.4,1); }
      `}</style>
      <defs>
        {caminhos.map((c, n) => (
          <linearGradient key={n} id={`cmg${n}`} gradientUnits="userSpaceOnUse" x1={POS[Math.max(0, idx(c[0]))][0]} y1={POS[Math.max(0, idx(c[0]))][1]} x2={POS[Math.max(0, idx(c[c.length - 1]))][0]} y2={POS[Math.max(0, idx(c[c.length - 1]))][1]}>
            {c.map((k, i) => <stop key={i} offset={i / Math.max(1, c.length - 1)} stopColor={RAMOS[Math.max(0, idx(k))].cor} />)}
          </linearGradient>
        ))}
      </defs>
      {caminhos.map((c, n) => <path key={n} className="cm-fio" d={fio(c, n)} pathLength={1} stroke={`url(#cmg${n})`} />)}
      {RAMOS.map((r, i) => {
        const [x, y] = POS[i], raio = 22 + 34 * (conta[i] / max), em = y < CY ? -1 : 1;
        return (
          <g key={r.chave}>
            <circle className="cm-no" cx={x} cy={y} r={raio + 14} fill={r.cor} opacity={0.15} />
            <circle className="cm-no" cx={x} cy={y} r={raio} fill={r.cor} />
            <text x={x} y={y + em * (raio + 40) + (em < 0 ? 0 : 14)} textAnchor="middle" fill="#eef3ef" style={{ font: "500 30px var(--f-tight), sans-serif" }}>{r.nome}</text>
          </g>
        );
      })}
    </svg>
  );
}
