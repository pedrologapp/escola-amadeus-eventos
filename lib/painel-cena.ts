/**
 * Painel "Cena ilustrada" (29/09/2026): a ilustração É o painel, como o
 * desenho da página Criança Amadeus — uma cena em traço de giz ocupando a
 * largura toda, a frase grande em letra de mão em cima (ou embaixo) e o logo
 * onde a escola escolher. Cenas prontas em public/paineis/cenas (desenhadas
 * pela IA no estilo e escolhidas a dedo) ou uma cena nova pedida à IA.
 */

import { rng } from "@/lib/painel-icones";

export const CENAS: { id: string; nome: string; uso: string; arquivo: string }[] = [
  { id: "crianca-amadeus", nome: "Como é bom ser criança", uso: "O desenho da página Criança Amadeus", arquivo: "/paineis/cenas/crianca-amadeus.svg" },
  { id: "criancas", nome: "Crianças brincando", uso: "Dia das Crianças, recreio, boas-vindas", arquivo: "/paineis/cenas/criancas.svg" },
  { id: "junina", nome: "Festa junina", uso: "Arraiá, quadrilha", arquivo: "/paineis/cenas/junina.svg" },
  { id: "sala", nome: "Sala de aula", uso: "Volta às aulas, Dia do Professor", arquivo: "/paineis/cenas/sala.svg" },
  { id: "familia", nome: "Família na escola", uso: "Festa da família, Dia das Mães e dos Pais", arquivo: "/paineis/cenas/familia.svg" },
  { id: "formatura", nome: "Formatura", uso: "Formatura do Infantil e do 9º ano", arquivo: "/paineis/cenas/formatura.svg" },
  { id: "natal", nome: "Natal", uso: "Cantata, confraternização", arquivo: "/paineis/cenas/natal.svg" },
];

export interface FundoCena {
  id: string;
  nome: string;
  cores: [string, string];
  pauta?: boolean;
  aquarela?: boolean;
}

export const FUNDOS_CENA: FundoCena[] = [
  { id: "creme", nome: "Creme com aquarela", cores: ["#FDFBF6", "#FBF6EC"], aquarela: true },
  { id: "creme-liso", nome: "Creme liso", cores: ["#FDFBF6", "#FBF6EC"] },
  { id: "caderno", nome: "Folha de caderno", cores: ["#FDFBF6", "#FDFBF6"], pauta: true },
  { id: "ceu", nome: "Céu clarinho", cores: ["#DDEFFC", "#FDFBF6"] },
  { id: "pessego", nome: "Pêssego", cores: ["#FFE7D6", "#FFF6EE"] },
  { id: "amarelo", nome: "Amarelo clarinho", cores: ["#FFF1BF", "#FFFAEB"] },
  { id: "menta", nome: "Menta", cores: ["#DDF3E4", "#FAFDF9"] },
];

export type PosFrase = "cima" | "baixo";
export type PosLogo = "acima" | "sup-esq" | "sup-dir" | "inf-esq" | "inf-dir" | "nenhum";
export type LetraFrase = "mao" | "caderno";

export interface OpcoesCena {
  fundo: string;
  frase: PosFrase;
  alinhar: "centro" | "esq";
  logo: PosLogo;
  letra: LetraFrase;
  textos: { l1: string; dest: string; l3: string };
}

const TINTA = "#1B3B7C";
const OURO = "#B9862F";

function fundo(ctx: CanvasRenderingContext2D, f: FundoCena, W: number, H: number, m: number) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, f.cores[0]);
  g.addColorStop(1, f.cores[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  if (f.pauta) {
    const passo = m / 12;
    ctx.strokeStyle = "#DCE5F1";
    ctx.lineWidth = Math.max(1, passo * 0.04);
    for (let y = passo * 2; y < H; y += passo) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }
  if (f.aquarela) {
    // manchas de aquarela nos cantos, como na página Criança Amadeus
    ([["#FFD66B", 0.06, 0.12], ["#9FD3F5", 0.94, 0.85], ["#F7B3CF", 0.9, 0.1], ["#B6E3A8", 0.08, 0.9]] as const).forEach(([c, x, y]) => {
      const r = m * 0.7;
      const gg = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
      gg.addColorStop(0, `${c}66`);
      gg.addColorStop(1, `${c}00`);
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);
    });
  }
}

/** Desenha a cena (SVG já carregado como imagem) dentro da zona, encostada no chão da zona. */
function cena(ctx: CanvasRenderingContext2D, img: HTMLImageElement, z: { x: number; y: number; w: number; h: number }, ancora: "baixo" | "cima", seed: number) {
  const prop = img.width / img.height;
  let w = z.w, h = w / prop;
  if (h > z.h) {
    h = z.h;
    w = h * prop;
  }
  const x = z.x + (z.w - w) / 2, y = ancora === "baixo" ? z.y + z.h - h : z.y;
  const R = rng(seed);
  // tremido de giz: duas passadas leves por baixo da principal
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = 0.22;
    ctx.drawImage(img, x + (R() - 0.5) * w * 0.003, y + (R() - 0.5) * w * 0.003, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(img, x, y, w, h);
}

/** Frase: rótulo pequeno, frase grande (letra de mão ou do caderno) e linha de baixo. */
function frase(ctx: CanvasRenderingContext2D, z: { x: number; y: number; w: number; h: number }, o: OpcoesCena, logo: HTMLImageElement | undefined, logoW: number) {
  const pre = o.textos.l1.trim(), dest = o.textos.dest.trim() || "Nome do evento", pos = o.textos.l3.trim();
  const fonteDest = o.letra === "mao" ? `700 {F}px "PainelCaveat"` : `700 {F}px "PainelFraunces"`;
  const entrelinha = o.letra === "mao" ? 0.95 : 1.05;
  const fonte = (F: number) => fonteDest.replace("{F}", String(F));
  const quebra = (F: number) => {
    ctx.font = fonte(F);
    const ls: string[] = [];
    let at = "";
    for (const p of dest.split(/\s+/)) {
      const t = at ? `${at} ${p}` : p;
      if (at && ctx.measureText(t).width > z.w) {
        ls.push(at);
        at = p;
      } else at = t;
    }
    if (at) ls.push(at);
    return ls;
  };
  const logoH = logo ? logoW / (logo.width / logo.height) : 0;
  const medir = (F: number) => {
    const ls = quebra(F);
    ctx.font = fonte(F);
    const ld = Math.max(...ls.map((l) => ctx.measureText(l).width));
    ctx.font = `800 ${F * 0.2}px "PainelDM"`;
    const lp = pre ? ctx.measureText(pre.toUpperCase()).width * 1.18 : 0;
    ctx.font = `700 ${F * 0.28}px "PainelDM"`;
    const l3 = pos ? ctx.measureText(pos).width : 0;
    const alt = (logo ? logoH + F * 0.25 : 0) + (pre ? F * 0.2 * 1.8 : 0) + ls.length * F * entrelinha + (pos ? F * 0.28 * 1.7 : 0);
    return { ls, alt, ok: alt <= z.h && Math.max(ld, lp, l3, logo ? logoW : 0) <= z.w && ls.length <= 2 };
  };
  let lo = 4, hi = z.h * 1.2;
  for (let i = 0; i < 22; i++) {
    const F = (lo + hi) / 2;
    if (medir(F).ok) lo = F;
    else hi = F;
  }
  const F = lo, r = medir(F);
  const xDe = (w: number) => (o.alinhar === "centro" ? z.x + (z.w - w) / 2 : z.x);
  let y = z.y + (z.h - r.alt) / 2;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  if (logo) {
    ctx.drawImage(logo, xDe(logoW), y, logoW, logoH);
    y += logoH + F * 0.25;
  }
  if (pre) {
    const tam = F * 0.2;
    ctx.font = `800 ${tam}px "PainelDM"`;
    ctx.letterSpacing = `${tam * 0.18}px`;
    ctx.fillStyle = OURO;
    const t = pre.toUpperCase();
    ctx.fillText(t, xDe(ctx.measureText(t).width), y + tam);
    ctx.letterSpacing = "0px";
    y += tam * 1.8;
  }
  ctx.font = fonte(F);
  ctx.fillStyle = TINTA;
  for (const l of r.ls) {
    ctx.fillText(l, xDe(ctx.measureText(l).width), y + F * (o.letra === "mao" ? 0.78 : 0.82));
    y += F * entrelinha;
  }
  if (pos) {
    const tam = F * 0.28;
    ctx.font = `700 ${tam}px "PainelDM"`;
    ctx.fillStyle = "#5A6478";
    ctx.fillText(pos, xDe(ctx.measureText(pos).width), y + tam * 1.1);
  }
  ctx.restore();
}

export function desenharCena(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement | undefined, logo: HTMLImageElement | undefined, o: OpcoesCena, seed = 7) {
  const f = FUNDOS_CENA.find((x) => x.id === o.fundo) ?? FUNDOS_CENA[0];
  const m = Math.min(W, H);
  const forma = W >= H * 1.35 ? "largo" : H >= W * 1.35 ? "alto" : "quad";
  ctx.clearRect(0, 0, W, H);
  fundo(ctx, f, W, H, m);

  const pad = m * (forma === "largo" ? 0.07 : 0.06);
  // quanto da altura vai para a frase
  const fatia = forma === "largo" ? 0.3 : forma === "alto" ? 0.3 : 0.32;
  const zFrase = { x: pad * 1.4, y: 0, w: W - pad * 2.8, h: H * fatia - pad * 0.6 };
  const zCena = { x: pad * 0.5, y: 0, w: W - pad, h: H * (1 - fatia) - pad * 0.4 };
  if (o.frase === "cima") {
    zFrase.y = pad;
    zCena.y = H * fatia + pad * 0.1;
  } else {
    zCena.y = pad * 0.6;
    zFrase.y = H - H * fatia + pad * 0.1;
  }

  // logo num canto: reserva espaço para a frase não passar por cima
  const cantoW = m * (forma === "largo" ? 0.2 : 0.22);
  if (logo && o.logo !== "acima" && o.logo !== "nenhum") {
    const lh = cantoW / (logo.width / logo.height);
    const x = o.logo.endsWith("esq") ? pad : W - pad - cantoW;
    const y = o.logo.startsWith("sup") ? pad * 0.8 : H - pad * 0.8 - lh;
    ctx.drawImage(logo, x, y, cantoW, lh);
    const mesmaFaixa = (o.frase === "cima") === o.logo.startsWith("sup");
    if (mesmaFaixa) {
      // tira a largura do logo dos dois lados (centralizado) ou só do lado dele
      const tira = cantoW + pad * 0.6;
      if (o.alinhar === "centro") {
        zFrase.x += tira;
        zFrase.w -= tira * 2;
      } else if (o.logo.endsWith("esq")) {
        zFrase.x += tira;
        zFrase.w -= tira;
      } else zFrase.w -= tira;
    } else {
      // o logo fica na faixa da cena: encolhe a cena daquele lado para não encostar
      const alt = lh + pad * 0.4;
      if (o.logo.startsWith("sup")) {
        zCena.y += alt * 0.5;
        zCena.h -= alt * 0.5;
      } else zCena.h -= alt * 0.5;
    }
  }

  if (img) cena(ctx, img, zCena, o.frase === "cima" ? "baixo" : "cima", seed);
  frase(ctx, zFrase, o, o.logo === "acima" ? logo : undefined, m * (forma === "largo" ? 0.14 : 0.2));
}
