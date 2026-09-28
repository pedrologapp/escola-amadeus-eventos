/**
 * Ícones desenhados à mão para os painéis "Caderno ilustrado" (29/09/2026).
 * Cada ícone é um desenho em traço de giz colorido (como o desenho da página
 * Criança Amadeus), com preenchimento suave. Desenha centrado em (0, 0),
 * dentro de um quadrado de lado `s`. `R` é o aleatório com semente, para o
 * traço tremido sair igual na prévia e no arquivo da gráfica.
 */

export type Rng = () => number;

export const COR = {
  azul: "#1D4FA0",
  marinho: "#083078",
  vermelho: "#E0524C",
  amarelo: "#FFB000",
  laranja: "#F28C28",
  verde: "#3FA66B",
  rosa: "#E86FA6",
  marrom: "#8A5A2B",
  ceu: "#7FB7E6",
  roxo: "#7B5EA7",
};
const CLARO = {
  amarelo: "#FFE08A",
  rosa: "#F9C6DC",
  azul: "#CFE3F7",
  verde: "#CDEBC8",
  vermelho: "#F7B9B3",
  laranja: "#FBD0A6",
  roxo: "#DCCEF0",
  creme: "#FFF6DD",
};

export function rng(seed: number): Rng {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Traço de giz: o caminho em 3 passadas levemente tremidas; antes, o preenchimento suave. */
function giz(ctx: CanvasRenderingContext2D, p: Path2D, cor: string, lw: number, R: Rng, fundo?: string) {
  if (fundo) {
    ctx.fillStyle = fundo;
    ctx.fill(p);
  }
  ctx.save();
  ctx.strokeStyle = cor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = i ? 0.35 : 0.95;
    ctx.lineWidth = lw * (i ? 0.6 : 1);
    ctx.save();
    ctx.translate((R() - 0.5) * lw * 0.5, (R() - 0.5) * lw * 0.5);
    ctx.stroke(p);
    ctx.restore();
  }
  ctx.restore();
}

const caminho = (f: (p: Path2D) => void) => {
  const p = new Path2D();
  f(p);
  return p;
};
const circulo = (p: Path2D, x: number, y: number, r: number) => {
  p.moveTo(x + r, y);
  p.arc(x, y, r, 0, Math.PI * 2);
};
const coracao = (p: Path2D, x: number, y: number, s: number) => {
  p.moveTo(x, y + s * 0.45);
  p.bezierCurveTo(x - s * 0.75, y - s * 0.05, x - s * 0.4, y - s * 0.65, x, y - s * 0.25);
  p.bezierCurveTo(x + s * 0.4, y - s * 0.65, x + s * 0.75, y - s * 0.05, x, y + s * 0.45);
};
const estrela = (p: Path2D, x: number, y: number, r: number, pontas = 5) => {
  for (let i = 0; i < pontas * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / pontas, rr = i % 2 ? r * 0.45 : r;
    if (i) p.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else p.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  p.closePath();
};

type Desenho = (ctx: CanvasRenderingContext2D, u: number, lw: number, R: Rng) => void;

const D: Record<string, Desenho> = {
  sol: (c, u, lw, R) => {
    giz(c, caminho((p) => circulo(p, 0, 0, u * 0.45)), "#F29E1F", lw, R, CLARO.amarelo);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      giz(c, caminho((p) => { p.moveTo(Math.cos(a) * u * 0.62, Math.sin(a) * u * 0.62); p.lineTo(Math.cos(a) * u * 0.9, Math.sin(a) * u * 0.9); }), "#F29E1F", lw * 0.9, R);
    }
    giz(c, caminho((p) => { circulo(p, -u * 0.15, -u * 0.08, u * 0.035); circulo(p, u * 0.15, -u * 0.08, u * 0.035); p.moveTo(-u * 0.18, u * 0.1); p.quadraticCurveTo(0, u * 0.3, u * 0.18, u * 0.1); }), "#8A5A2B", lw * 0.7, R);
  },
  nuvem: (c, u, lw, R) => {
    const p = caminho((q) => { q.moveTo(-u * 0.8, u * 0.25); q.bezierCurveTo(-u * 1, -u * 0.1, -u * 0.55, -u * 0.35, -u * 0.35, -u * 0.15); q.bezierCurveTo(-u * 0.25, -u * 0.6, u * 0.35, -u * 0.6, u * 0.4, -u * 0.2); q.bezierCurveTo(u * 0.9, -u * 0.3, u * 1, u * 0.25, u * 0.7, u * 0.25); q.closePath(); });
    giz(c, p, COR.ceu, lw, R, "#FFFFFF");
  },
  arcoiris: (c, u, lw, R) => {
    [COR.vermelho, COR.amarelo, COR.verde, COR.azul].forEach((cor, i) => giz(c, caminho((p) => p.arc(0, u * 0.45, u * (0.9 - i * 0.17), Math.PI, 0)), cor, lw * 1.6, R));
  },
  pipa: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.85); p.lineTo(u * 0.55, -u * 0.1); p.lineTo(0, u * 0.55); p.lineTo(-u * 0.55, -u * 0.1); p.closePath(); }), "#B8336A", lw, R, CLARO.rosa);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.85); p.lineTo(0, u * 0.55); p.moveTo(-u * 0.55, -u * 0.1); p.lineTo(u * 0.55, -u * 0.1); }), "#B8336A", lw * 0.6, R);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.55); p.quadraticCurveTo(u * 0.3, u * 0.7, 0, u * 0.8); p.quadraticCurveTo(-u * 0.3, u * 0.9, u * 0.1, u * 1); }), COR.amarelo, lw * 0.8, R);
  },
  casinha: (c, u, lw, R) => {
    giz(c, caminho((p) => p.rect(-u * 0.55, -u * 0.1, u * 1.1, u * 0.85)), COR.marinho, lw, R, CLARO.creme);
    giz(c, caminho((p) => { p.moveTo(-u * 0.72, -u * 0.05); p.lineTo(0, -u * 0.72); p.lineTo(u * 0.72, -u * 0.05); }), COR.vermelho, lw * 1.2, R);
    giz(c, caminho((p) => p.rect(-u * 0.15, u * 0.3, u * 0.3, u * 0.45)), COR.amarelo, lw * 0.9, R, CLARO.amarelo);
    giz(c, caminho((p) => { p.rect(u * 0.22, u * 0.05, u * 0.22, u * 0.2); p.moveTo(u * 0.33, u * 0.05); p.lineTo(u * 0.33, u * 0.25); }), COR.azul, lw * 0.7, R, CLARO.azul);
  },
  arvore: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, u * 0.9); p.lineTo(0, u * 0.1); }), COR.marrom, lw * 1.4, R);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.2); p.bezierCurveTo(-u * 0.9, u * 0.25, -u * 0.8, -u * 0.55, -u * 0.3, -u * 0.55); p.bezierCurveTo(-u * 0.2, -u * 0.95, u * 0.45, -u * 0.95, u * 0.4, -u * 0.5); p.bezierCurveTo(u * 0.95, -u * 0.4, u * 0.85, u * 0.25, 0, u * 0.2); p.closePath(); }), COR.verde, lw, R, CLARO.verde);
  },
  crianca: (c, u, lw, R) => {
    giz(c, caminho((p) => circulo(p, 0, -u * 0.55, u * 0.22)), COR.marinho, lw, R, CLARO.creme);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.33); p.lineTo(0, u * 0.3); p.lineTo(-u * 0.3, u * 0.85); p.moveTo(0, u * 0.3); p.lineTo(u * 0.3, u * 0.85); p.moveTo(0, -u * 0.12); p.lineTo(-u * 0.45, -u * 0.4); p.moveTo(0, -u * 0.12); p.lineTo(u * 0.45, -u * 0.4); }), COR.marinho, lw, R);
    giz(c, caminho((p) => { circulo(p, -u * 0.08, -u * 0.58, u * 0.02); circulo(p, u * 0.08, -u * 0.58, u * 0.02); p.moveTo(-u * 0.09, -u * 0.47); p.quadraticCurveTo(0, -u * 0.4, u * 0.09, -u * 0.47); }), COR.marinho, lw * 0.6, R);
  },
  familia: (c, u, lw, R) => {
    const boneco = (x: number, h: number, cor: string, fundo: string) => {
      giz(c, caminho((p) => circulo(p, x, u * 0.5 - h, h * 0.2)), cor, lw * 0.9, R, fundo);
      giz(c, caminho((p) => { p.moveTo(x - h * 0.28, u * 0.8); p.lineTo(x, u * 0.5 - h * 0.78); p.lineTo(x + h * 0.28, u * 0.8); p.closePath(); }), cor, lw * 0.9, R, fundo);
    };
    boneco(-u * 0.55, u * 1.2, COR.azul, CLARO.azul);
    boneco(u * 0.55, u * 1.1, COR.rosa, CLARO.rosa);
    boneco(0, u * 0.75, COR.laranja, CLARO.laranja);
    giz(c, caminho((p) => coracao(p, 0, -u * 0.75, u * 0.3)), COR.vermelho, lw * 0.8, R, CLARO.vermelho);
  },
  estrela: (c, u, lw, R) => giz(c, caminho((p) => estrela(p, 0, 0, u * 0.85)), COR.laranja, lw, R, CLARO.amarelo),
  coracao: (c, u, lw, R) => giz(c, caminho((p) => coracao(p, 0, u * 0.05, u * 1.3)), COR.vermelho, lw, R, CLARO.rosa),
  flor: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, u * 0.1); p.quadraticCurveTo(u * 0.1, u * 0.55, 0, u * 0.95); }), COR.verde, lw, R);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.6); p.quadraticCurveTo(u * 0.45, u * 0.35, u * 0.5, u * 0.65); p.quadraticCurveTo(u * 0.2, u * 0.75, 0, u * 0.6); }), COR.verde, lw * 0.8, R, CLARO.verde);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      giz(c, caminho((p) => circulo(p, Math.cos(a) * u * 0.32, -u * 0.25 + Math.sin(a) * u * 0.32, u * 0.2)), COR.rosa, lw * 0.8, R, CLARO.rosa);
    }
    giz(c, caminho((p) => circulo(p, 0, -u * 0.25, u * 0.16)), COR.laranja, lw * 0.8, R, CLARO.amarelo);
  },
  borboleta: (c, u, lw, R) => {
    [[-1, COR.roxo, CLARO.roxo], [1, COR.azul, CLARO.azul]].forEach(([l, cor, f]) => {
      const k = l as number;
      giz(c, caminho((p) => { p.ellipse(k * u * 0.42, -u * 0.25, u * 0.4, u * 0.3, k * 0.5, 0, Math.PI * 2); }), cor as string, lw * 0.9, R, f as string);
      giz(c, caminho((p) => { p.ellipse(k * u * 0.32, u * 0.3, u * 0.28, u * 0.22, -k * 0.4, 0, Math.PI * 2); }), cor as string, lw * 0.9, R, f as string);
    });
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.5); p.lineTo(0, u * 0.55); p.moveTo(0, -u * 0.5); p.quadraticCurveTo(-u * 0.1, -u * 0.8, -u * 0.25, -u * 0.85); p.moveTo(0, -u * 0.5); p.quadraticCurveTo(u * 0.1, -u * 0.8, u * 0.25, -u * 0.85); }), COR.marinho, lw, R);
  },
  balao: (c, u, lw, R) => {
    giz(c, caminho((p) => p.ellipse(0, -u * 0.25, u * 0.5, u * 0.62, 0, 0, Math.PI * 2)), COR.vermelho, lw, R, CLARO.vermelho);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.37); p.quadraticCurveTo(u * 0.2, u * 0.6, 0, u * 0.75); p.quadraticCurveTo(-u * 0.2, u * 0.9, u * 0.05, u * 1); }), COR.marinho, lw * 0.6, R);
  },
  fogueira: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(-u * 0.75, u * 0.85); p.lineTo(u * 0.55, u * 0.45); p.moveTo(u * 0.75, u * 0.85); p.lineTo(-u * 0.55, u * 0.45); }), COR.marrom, lw * 1.8, R);
    giz(c, caminho((p) => { p.moveTo(-u * 0.45, u * 0.5); p.bezierCurveTo(-u * 0.6, -u * 0.1, -u * 0.1, -u * 0.2, 0, -u * 0.85); p.bezierCurveTo(u * 0.15, -u * 0.2, u * 0.6, -u * 0.1, u * 0.45, u * 0.5); p.closePath(); }), COR.vermelho, lw, R, CLARO.laranja);
    giz(c, caminho((p) => { p.moveTo(-u * 0.2, u * 0.5); p.bezierCurveTo(-u * 0.3, u * 0.15, -u * 0.05, u * 0.05, 0, -u * 0.3); p.bezierCurveTo(u * 0.05, u * 0.05, u * 0.3, u * 0.15, u * 0.2, u * 0.5); p.closePath(); }), COR.laranja, lw * 0.8, R, CLARO.amarelo);
  },
  balaojunino: (c, u, lw, R) => {
    const p = caminho((q) => { q.moveTo(0, -u * 0.9); q.bezierCurveTo(u * 0.8, -u * 0.8, u * 0.65, u * 0.3, u * 0.22, u * 0.6); q.lineTo(-u * 0.22, u * 0.6); q.bezierCurveTo(-u * 0.65, u * 0.3, -u * 0.8, -u * 0.8, 0, -u * 0.9); });
    giz(c, p, COR.vermelho, lw, R, CLARO.laranja);
    giz(c, caminho((q) => { q.moveTo(0, -u * 0.9); q.quadraticCurveTo(-u * 0.3, -u * 0.1, -u * 0.12, u * 0.6); q.moveTo(0, -u * 0.9); q.quadraticCurveTo(u * 0.3, -u * 0.1, u * 0.12, u * 0.6); }), COR.vermelho, lw * 0.6, R);
    giz(c, caminho((q) => q.ellipse(0, u * 0.72, u * 0.16, u * 0.09, 0, 0, Math.PI * 2)), COR.laranja, lw * 0.8, R, CLARO.amarelo);
  },
  milho: (c, u, lw, R) => {
    giz(c, caminho((p) => p.ellipse(0, -u * 0.1, u * 0.3, u * 0.72, 0, 0, Math.PI * 2)), "#D99A00", lw, R, CLARO.amarelo);
    giz(c, caminho((p) => { for (let i = -2; i <= 2; i++) { p.moveTo(-u * 0.25, -u * 0.1 + i * u * 0.22); p.lineTo(u * 0.25, -u * 0.1 + i * u * 0.22); } p.moveTo(0, -u * 0.8); p.lineTo(0, u * 0.6); }), "#D99A00", lw * 0.5, R);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.9); p.quadraticCurveTo(-u * 0.6, u * 0.4, -u * 0.35, -u * 0.3); p.quadraticCurveTo(-u * 0.25, u * 0.4, 0, u * 0.9); p.moveTo(0, u * 0.9); p.quadraticCurveTo(u * 0.6, u * 0.4, u * 0.35, -u * 0.3); p.quadraticCurveTo(u * 0.25, u * 0.4, 0, u * 0.9); }), COR.verde, lw * 0.9, R, CLARO.verde);
  },
  chapeu: (c, u, lw, R) => {
    giz(c, caminho((p) => p.ellipse(0, u * 0.3, u * 0.95, u * 0.28, 0, 0, Math.PI * 2)), "#B8860B", lw, R, "#F4D58D");
    giz(c, caminho((p) => { p.moveTo(-u * 0.45, u * 0.25); p.bezierCurveTo(-u * 0.45, -u * 0.6, u * 0.45, -u * 0.6, u * 0.45, u * 0.25); }), "#B8860B", lw, R, "#F4D58D");
    giz(c, caminho((p) => { p.moveTo(-u * 0.44, u * 0.1); p.quadraticCurveTo(0, u * 0.2, u * 0.44, u * 0.1); }), COR.vermelho, lw * 1.3, R);
  },
  livro: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.45); p.quadraticCurveTo(-u * 0.45, -u * 0.65, -u * 0.9, -u * 0.5); p.lineTo(-u * 0.9, u * 0.55); p.quadraticCurveTo(-u * 0.45, u * 0.4, 0, u * 0.6); p.closePath(); }), COR.azul, lw, R, "#FFFFFF");
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.45); p.quadraticCurveTo(u * 0.45, -u * 0.65, u * 0.9, -u * 0.5); p.lineTo(u * 0.9, u * 0.55); p.quadraticCurveTo(u * 0.45, u * 0.4, 0, u * 0.6); p.closePath(); }), COR.azul, lw, R, CLARO.azul);
    giz(c, caminho((p) => { for (const y of [-0.2, 0.02, 0.24]) { p.moveTo(-u * 0.7, u * y); p.lineTo(-u * 0.2, u * (y + 0.06)); } }), COR.ceu, lw * 0.5, R);
  },
  lapis: (c, u, lw, R) => {
    c.save();
    c.rotate(-0.7);
    giz(c, caminho((p) => p.rect(-u * 0.9, -u * 0.18, u * 1.35, u * 0.36)), COR.laranja, lw, R, CLARO.amarelo);
    giz(c, caminho((p) => { p.moveTo(u * 0.45, -u * 0.18); p.lineTo(u * 0.9, 0); p.lineTo(u * 0.45, u * 0.18); p.closePath(); }), COR.marrom, lw, R, "#F3D7B5");
    giz(c, caminho((p) => p.rect(-u * 1.05, -u * 0.18, u * 0.15, u * 0.36)), COR.rosa, lw, R, CLARO.rosa);
    c.restore();
  },
  atomo: (c, u, lw, R) => {
    for (const a of [0, 1.05, 2.1]) giz(c, caminho((p) => p.ellipse(0, 0, u * 0.9, u * 0.32, a, 0, Math.PI * 2)), COR.azul, lw * 0.9, R);
    giz(c, caminho((p) => circulo(p, 0, 0, u * 0.13)), COR.laranja, lw * 0.8, R, CLARO.amarelo);
  },
  frasco: (c, u, lw, R) => {
    const p = caminho((q) => { q.moveTo(-u * 0.18, -u * 0.85); q.lineTo(-u * 0.18, -u * 0.3); q.lineTo(-u * 0.65, u * 0.7); q.lineTo(u * 0.65, u * 0.7); q.lineTo(u * 0.18, -u * 0.3); q.lineTo(u * 0.18, -u * 0.85); });
    c.save();
    c.clip(caminho((q) => q.rect(-u, u * 0.1, u * 2, u)));
    c.fillStyle = CLARO.verde;
    c.fill(p);
    c.restore();
    giz(c, p, COR.marinho, lw, R);
    giz(c, caminho((q) => { q.moveTo(-u * 0.3, -u * 0.85); q.lineTo(u * 0.3, -u * 0.85); circulo(q, u * 0.05, -u * 0.05, u * 0.06); circulo(q, -u * 0.1, u * 0.3, u * 0.08); }), COR.marinho, lw * 0.7, R);
  },
  planeta: (c, u, lw, R) => {
    giz(c, caminho((p) => circulo(p, 0, 0, u * 0.5)), COR.roxo, lw, R, CLARO.roxo);
    giz(c, caminho((p) => p.ellipse(0, 0, u * 0.95, u * 0.28, -0.3, 0.2, Math.PI - 0.2, true)), COR.laranja, lw, R);
  },
  foguete: (c, u, lw, R) => {
    c.save();
    c.rotate(0.5);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.95); p.bezierCurveTo(u * 0.4, -u * 0.55, u * 0.35, u * 0.3, u * 0.25, u * 0.5); p.lineTo(-u * 0.25, u * 0.5); p.bezierCurveTo(-u * 0.35, u * 0.3, -u * 0.4, -u * 0.55, 0, -u * 0.95); }), COR.marinho, lw, R, "#FFFFFF");
    giz(c, caminho((p) => circulo(p, 0, -u * 0.3, u * 0.14)), COR.azul, lw * 0.8, R, CLARO.azul);
    giz(c, caminho((p) => { p.moveTo(u * 0.27, u * 0.15); p.lineTo(u * 0.5, u * 0.6); p.lineTo(u * 0.25, u * 0.5); p.moveTo(-u * 0.27, u * 0.15); p.lineTo(-u * 0.5, u * 0.6); p.lineTo(-u * 0.25, u * 0.5); }), COR.vermelho, lw, R, CLARO.vermelho);
    giz(c, caminho((p) => { p.moveTo(-u * 0.15, u * 0.55); p.quadraticCurveTo(0, u * 1.05, u * 0.15, u * 0.55); }), COR.laranja, lw, R, CLARO.amarelo);
    c.restore();
  },
  lampada: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(-u * 0.2, u * 0.35); p.bezierCurveTo(-u * 0.75, -u * 0.1, -u * 0.45, -u * 0.8, 0, -u * 0.8); p.bezierCurveTo(u * 0.45, -u * 0.8, u * 0.75, -u * 0.1, u * 0.2, u * 0.35); p.closePath(); }), COR.laranja, lw, R, CLARO.amarelo);
    giz(c, caminho((p) => { p.rect(-u * 0.2, u * 0.38, u * 0.4, u * 0.3); p.moveTo(-u * 0.2, u * 0.53); p.lineTo(u * 0.2, u * 0.53); }), COR.marinho, lw * 0.8, R, "#E4E8F0");
    for (const a of [-2.4, -1.57, -0.74]) giz(c, caminho((p) => { p.moveTo(Math.cos(a) * u * 0.9, -u * 0.25 + Math.sin(a) * u * 0.8); p.lineTo(Math.cos(a) * u * 1.05, -u * 0.25 + Math.sin(a) * u * 0.95); }), COR.laranja, lw * 0.8, R);
  },
  lupa: (c, u, lw, R) => {
    giz(c, caminho((p) => circulo(p, -u * 0.15, -u * 0.15, u * 0.5)), COR.marinho, lw * 1.2, R, CLARO.azul);
    giz(c, caminho((p) => { p.moveTo(u * 0.22, u * 0.22); p.lineTo(u * 0.8, u * 0.8); }), COR.marrom, lw * 2, R);
  },
  bola: (c, u, lw, R) => {
    giz(c, caminho((p) => circulo(p, 0, 0, u * 0.8)), COR.marinho, lw, R, "#FFFFFF");
    giz(c, caminho((p) => estrela(p, 0, 0, u * 0.3, 5)), COR.marinho, lw * 0.8, R, "#3B4A6B");
    giz(c, caminho((p) => { for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; p.moveTo(Math.cos(a) * u * 0.3, Math.sin(a) * u * 0.3); p.lineTo(Math.cos(a) * u * 0.8, Math.sin(a) * u * 0.8); } }), COR.marinho, lw * 0.7, R);
  },
  medalha: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(-u * 0.5, -u * 0.95); p.lineTo(-u * 0.05, -u * 0.2); p.moveTo(u * 0.5, -u * 0.95); p.lineTo(u * 0.05, -u * 0.2); }), COR.azul, lw * 2.2, R);
    giz(c, caminho((p) => circulo(p, 0, u * 0.3, u * 0.5)), "#C98A00", lw, R, CLARO.amarelo);
    giz(c, caminho((p) => estrela(p, 0, u * 0.3, u * 0.25)), "#C98A00", lw * 0.8, R, "#FFD166");
  },
  trofeu: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(-u * 0.5, -u * 0.75); p.lineTo(u * 0.5, -u * 0.75); p.bezierCurveTo(u * 0.5, u * 0.05, u * 0.15, u * 0.15, 0, u * 0.15); p.bezierCurveTo(-u * 0.15, u * 0.15, -u * 0.5, u * 0.05, -u * 0.5, -u * 0.75); }), "#C98A00", lw, R, CLARO.amarelo);
    giz(c, caminho((p) => { p.moveTo(-u * 0.5, -u * 0.6); p.bezierCurveTo(-u * 0.95, -u * 0.6, -u * 0.8, -u * 0.05, -u * 0.35, -u * 0.1); p.moveTo(u * 0.5, -u * 0.6); p.bezierCurveTo(u * 0.95, -u * 0.6, u * 0.8, -u * 0.05, u * 0.35, -u * 0.1); }), "#C98A00", lw, R);
    giz(c, caminho((p) => { p.moveTo(0, u * 0.15); p.lineTo(0, u * 0.5); p.rect(-u * 0.4, u * 0.5, u * 0.8, u * 0.3); }), COR.marrom, lw, R, "#F3D7B5");
  },
  presente: (c, u, lw, R) => {
    giz(c, caminho((p) => p.rect(-u * 0.65, -u * 0.25, u * 1.3, u * 1)), COR.vermelho, lw, R, CLARO.vermelho);
    giz(c, caminho((p) => p.rect(-u * 0.75, -u * 0.45, u * 1.5, u * 0.25)), COR.vermelho, lw, R, CLARO.rosa);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.45); p.lineTo(0, u * 0.75); }), COR.verde, lw * 1.8, R);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.45); p.bezierCurveTo(-u * 0.6, -u * 0.95, -u * 0.6, -u * 0.35, 0, -u * 0.45); p.bezierCurveTo(u * 0.6, -u * 0.95, u * 0.6, -u * 0.35, 0, -u * 0.45); }), COR.verde, lw, R, CLARO.verde);
  },
  arvorenatal: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.8); p.lineTo(u * 0.45, -u * 0.2); p.lineTo(u * 0.25, -u * 0.2); p.lineTo(u * 0.65, u * 0.45); p.lineTo(-u * 0.65, u * 0.45); p.lineTo(-u * 0.25, -u * 0.2); p.lineTo(-u * 0.45, -u * 0.2); p.closePath(); }), COR.verde, lw, R, CLARO.verde);
    giz(c, caminho((p) => p.rect(-u * 0.12, u * 0.45, u * 0.24, u * 0.35)), COR.marrom, lw, R, "#F3D7B5");
    giz(c, caminho((p) => estrela(p, 0, -u * 0.85, u * 0.2)), COR.laranja, lw * 0.8, R, CLARO.amarelo);
    giz(c, caminho((p) => { circulo(p, -u * 0.2, u * 0.1, u * 0.06); circulo(p, u * 0.25, u * 0.25, u * 0.06); circulo(p, u * 0.05, -u * 0.35, u * 0.05); }), COR.vermelho, lw * 0.7, R, CLARO.vermelho);
  },
  sino: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(-u * 0.65, u * 0.45); p.bezierCurveTo(-u * 0.45, u * 0.3, -u * 0.55, -u * 0.6, 0, -u * 0.6); p.bezierCurveTo(u * 0.55, -u * 0.6, u * 0.45, u * 0.3, u * 0.65, u * 0.45); p.closePath(); }), "#C98A00", lw, R, CLARO.amarelo);
    giz(c, caminho((p) => circulo(p, 0, u * 0.58, u * 0.12)), "#C98A00", lw * 0.8, R, "#FFD166");
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.6); p.bezierCurveTo(-u * 0.5, -u * 1, -u * 0.5, -u * 0.55, 0, -u * 0.62); p.bezierCurveTo(u * 0.5, -u * 1, u * 0.5, -u * 0.55, 0, -u * 0.62); }), COR.vermelho, lw * 0.9, R, CLARO.vermelho);
  },
  capelo: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.55); p.lineTo(u * 0.95, -u * 0.15); p.lineTo(0, u * 0.25); p.lineTo(-u * 0.95, -u * 0.15); p.closePath(); }), COR.marinho, lw, R, "#3B4A6B");
    giz(c, caminho((p) => { p.moveTo(-u * 0.5, u * 0.05); p.lineTo(-u * 0.5, u * 0.5); p.quadraticCurveTo(0, u * 0.75, u * 0.5, u * 0.5); p.lineTo(u * 0.5, u * 0.05); }), COR.marinho, lw, R, "#3B4A6B");
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.15); p.quadraticCurveTo(u * 0.7, -u * 0.05, u * 0.75, u * 0.6); }), COR.amarelo, lw * 0.9, R);
  },
  diploma: (c, u, lw, R) => {
    c.save();
    c.rotate(-0.35);
    giz(c, caminho((p) => p.rect(-u * 0.85, -u * 0.25, u * 1.7, u * 0.5)), "#B8860B", lw, R, CLARO.creme);
    giz(c, caminho((p) => { p.ellipse(-u * 0.85, 0, u * 0.1, u * 0.25, 0, 0, Math.PI * 2); p.ellipse(u * 0.85, 0, u * 0.1, u * 0.25, 0, 0, Math.PI * 2); }), "#B8860B", lw * 0.8, R, "#F4D58D");
    giz(c, caminho((p) => { p.moveTo(-u * 0.12, -u * 0.25); p.lineTo(-u * 0.12, u * 0.25); p.moveTo(u * 0.12, -u * 0.25); p.lineTo(u * 0.12, u * 0.25); p.moveTo(-u * 0.05, u * 0.25); p.lineTo(-u * 0.15, u * 0.6); p.moveTo(u * 0.05, u * 0.25); p.lineTo(u * 0.15, u * 0.6); }), COR.vermelho, lw * 1.1, R);
    c.restore();
  },
  paleta: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(u * 0.1, -u * 0.75); p.bezierCurveTo(u * 0.95, -u * 0.7, u * 0.95, u * 0.55, u * 0.15, u * 0.7); p.bezierCurveTo(-u * 0.55, u * 0.8, -u * 0.95, u * 0.3, -u * 0.85, -u * 0.15); p.bezierCurveTo(-u * 0.75, -u * 0.55, -u * 0.35, -u * 0.8, u * 0.1, -u * 0.75); }), COR.marrom, lw, R, "#F3D7B5");
    [[COR.vermelho, -0.45, -0.25], [COR.amarelo, -0.05, -0.45], [COR.azul, 0.4, -0.3], [COR.verde, 0.5, 0.15], [COR.rosa, 0.15, 0.45]].forEach(([cor, x, y]) => {
      c.fillStyle = cor as string;
      c.beginPath();
      c.arc((x as number) * u, (y as number) * u, u * 0.13, 0, Math.PI * 2);
      c.fill();
    });
    giz(c, caminho((p) => circulo(p, -u * 0.4, u * 0.3, u * 0.14)), COR.marrom, lw * 0.7, R, "#FDFBF6");
  },
  nota: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.ellipse(-u * 0.45, u * 0.55, u * 0.25, u * 0.18, -0.4, 0, Math.PI * 2); p.ellipse(u * 0.45, u * 0.35, u * 0.25, u * 0.18, -0.4, 0, Math.PI * 2); }), COR.roxo, lw, R, COR.roxo);
    giz(c, caminho((p) => { p.moveTo(-u * 0.22, u * 0.5); p.lineTo(-u * 0.22, -u * 0.6); p.lineTo(u * 0.68, -u * 0.8); p.lineTo(u * 0.68, u * 0.3); p.moveTo(-u * 0.22, -u * 0.35); p.lineTo(u * 0.68, -u * 0.55); }), COR.roxo, lw * 1.1, R);
  },
  maca: (c, u, lw, R) => {
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.4); p.bezierCurveTo(-u * 0.9, -u * 0.8, -u * 0.95, u * 0.6, -u * 0.25, u * 0.75); p.quadraticCurveTo(0, u * 0.65, u * 0.25, u * 0.75); p.bezierCurveTo(u * 0.95, u * 0.6, u * 0.9, -u * 0.8, 0, -u * 0.4); }), COR.vermelho, lw, R, CLARO.vermelho);
    giz(c, caminho((p) => { p.moveTo(0, -u * 0.4); p.quadraticCurveTo(u * 0.05, -u * 0.7, u * 0.15, -u * 0.8); }), COR.marrom, lw, R);
    giz(c, caminho((p) => { p.moveTo(u * 0.08, -u * 0.62); p.quadraticCurveTo(u * 0.5, -u * 0.9, u * 0.6, -u * 0.55); p.quadraticCurveTo(u * 0.3, -u * 0.45, u * 0.08, -u * 0.62); }), COR.verde, lw * 0.8, R, CLARO.verde);
  },
};

export const ICONES: { id: string; nome: string }[] = [
  { id: "sol", nome: "Sol" }, { id: "nuvem", nome: "Nuvem" }, { id: "arcoiris", nome: "Arco-íris" }, { id: "pipa", nome: "Pipa" },
  { id: "casinha", nome: "Casinha" }, { id: "arvore", nome: "Árvore" }, { id: "crianca", nome: "Criança" }, { id: "familia", nome: "Família" },
  { id: "estrela", nome: "Estrela" }, { id: "coracao", nome: "Coração" }, { id: "flor", nome: "Flor" }, { id: "borboleta", nome: "Borboleta" },
  { id: "balao", nome: "Balão de festa" }, { id: "fogueira", nome: "Fogueira" }, { id: "balaojunino", nome: "Balão junino" }, { id: "milho", nome: "Milho" },
  { id: "chapeu", nome: "Chapéu de palha" }, { id: "livro", nome: "Livro" }, { id: "lapis", nome: "Lápis" }, { id: "maca", nome: "Maçã" },
  { id: "atomo", nome: "Átomo" }, { id: "frasco", nome: "Frasco" }, { id: "planeta", nome: "Planeta" }, { id: "foguete", nome: "Foguete" },
  { id: "lampada", nome: "Lâmpada" }, { id: "lupa", nome: "Lupa" }, { id: "bola", nome: "Bola" }, { id: "medalha", nome: "Medalha" },
  { id: "trofeu", nome: "Troféu" }, { id: "presente", nome: "Presente" }, { id: "arvorenatal", nome: "Árvore de Natal" }, { id: "sino", nome: "Sino" },
  { id: "capelo", nome: "Capelo" }, { id: "diploma", nome: "Diploma" }, { id: "paleta", nome: "Paleta" }, { id: "nota", nome: "Nota musical" },
];

/** Desenha o ícone `id` centrado em (x, y), num quadrado de lado s. */
export function desenharIcone(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, R: Rng, giro = 0) {
  const d = D[id];
  if (!d) return;
  ctx.save();
  ctx.translate(x, y);
  if (giro) ctx.rotate(giro);
  d(ctx, s / 2, Math.max(1, s * 0.045), R);
  ctx.restore();
}
