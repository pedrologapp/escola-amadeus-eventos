/**
 * Painéis "Caderno ilustrado" (29/09/2026): a linguagem do encarte Caderno
 * (folha pautada, margem vermelha, furos, título Fraunces com marca-texto
 * amarelo, etiqueta, fita adesiva, polaroid) + desenhos em traço de giz
 * (lib/painel-icones). O fundo pode ser a folha de caderno ou uma cor da
 * escola — aí os desenhos soltos viram adesivos brancos.
 *
 * Família NOVA: não altera os 6 painéis com as peças da marca (lib/paineis).
 */

import { COR, desenharIcone, rng, type Rng } from "@/lib/painel-icones";

export interface FundoCaderno {
  id: string;
  nome: string;
  papel?: boolean; // folha pautada
  cores?: [string, string]; // degradê de cima para baixo (diagonal)
  escuro?: boolean; // texto claro
  titulo: string;
  destaque: string; // cor da última linha do título
  marcador: string | null; // marca-texto atrás da última linha
  pre: string;
}

export const FUNDOS: FundoCaderno[] = [
  { id: "papel", nome: "Folha de caderno", papel: true, titulo: "#083078", destaque: "#083078", marcador: "#FFD860", pre: "#083078" },
  { id: "azul", nome: "Azul Amadeus", cores: ["#0D55B0", "#06306F"], escuro: true, titulo: "#FFFFFF", destaque: "#FFC93C", marcador: null, pre: "#CFE3F7" },
  { id: "ceu", nome: "Céu", cores: ["#2AA8E6", "#1373C4"], escuro: true, titulo: "#FFFFFF", destaque: "#FFE08A", marcador: null, pre: "#FFFFFF" },
  { id: "amarelo", nome: "Amarelo", cores: ["#FFD23F", "#F6A300"], titulo: "#083078", destaque: "#083078", marcador: "#FFF6DD", pre: "#083078" },
  { id: "rosa", nome: "Rosa", cores: ["#FBC4D6", "#EE8DB1"], titulo: "#5A1E3C", destaque: "#083078", marcador: "#FFF6DD", pre: "#5A1E3C" },
  { id: "verde", nome: "Verde", cores: ["#2E8B57", "#0F4D36"], escuro: true, titulo: "#FFFFFF", destaque: "#FFD860", marcador: null, pre: "#DDF3E4" },
  { id: "noite", nome: "Noite", cores: ["#1D2F63", "#0E1A3A"], escuro: true, titulo: "#FFFFFF", destaque: "#FFB000", marcador: null, pre: "#F4E6C8" },
  { id: "pessego", nome: "Pêssego", cores: ["#FFE3CF", "#FFC9A8"], titulo: "#083078", destaque: "#083078", marcador: "#FFD860", pre: "#B5462E" },
];

export interface ComposicaoCaderno {
  id: string;
  nome: string;
  uso: string;
  estilo: "caderno";
  icones: string[]; // os 2 primeiros vão nas polaroids
  fundo: string; // id em FUNDOS (padrão do tema)
  topo?: "bandeirinhas";
  texto: { l1: string; dest: string; l3: string };
}

export const CADERNOS: ComposicaoCaderno[] = [
  { id: "cad-infantil", nome: "Infantil", uso: "Dia das Crianças, festas do Infantil e Fundamental 1.", estilo: "caderno", fundo: "papel", icones: ["sol", "arcoiris", "pipa", "casinha", "arvore", "estrela"], texto: { l1: "vem aí o", dest: "Dia das Crianças", l3: "12 de outubro" } },
  { id: "cad-junina", nome: "Festa Junina", uso: "Arraiá, quadrilha, quermesse.", estilo: "caderno", fundo: "noite", topo: "bandeirinhas", icones: ["fogueira", "balaojunino", "milho", "chapeu", "estrela"], texto: { l1: "vem aí o", dest: "Arraiá Amadeus", l3: "20 de junho" } },
  { id: "cad-ciencias", nome: "Ciências", uso: "Feira de conhecimento, mostra científica, robótica.", estilo: "caderno", fundo: "papel", icones: ["atomo", "foguete", "frasco", "planeta", "lampada", "lupa"], texto: { l1: "mostra", dest: "Feira de Ciências", l3: "14 de novembro" } },
  { id: "cad-esportes", nome: "Esportes", uso: "Olimpíadas, interclasse, festival esportivo.", estilo: "caderno", fundo: "azul", icones: ["medalha", "bola", "trofeu", "estrela", "coracao"], texto: { l1: "olimpíadas", dest: "Jogos Amadeus", l3: "de 3 a 7 de agosto" } },
  { id: "cad-natal", nome: "Natal", uso: "Cantata, confraternização, encerramento do ano.", estilo: "caderno", fundo: "verde", icones: ["arvorenatal", "presente", "sino", "estrela", "coracao"], texto: { l1: "", dest: "Feliz Natal", l3: "Centro Educacional Amadeus" } },
  { id: "cad-formatura", nome: "Formatura", uso: "Formatura do 9º ano e do Infantil.", estilo: "caderno", fundo: "papel", icones: ["capelo", "diploma", "livro", "estrela", "coracao"], texto: { l1: "turma 2026", dest: "Formatura 9º Ano", l3: "12 de dezembro" } },
  { id: "cad-familia", nome: "Família", uso: "Festa da família, Dia das Mães e dos Pais.", estilo: "caderno", fundo: "pessego", icones: ["familia", "coracao", "casinha", "flor", "sol"], texto: { l1: "festa do", dest: "Dia da Família", l3: "15 de maio" } },
  { id: "cad-artes", nome: "Artes e Música", uso: "Mostra de artes, sarau, primavera, cantata.", estilo: "caderno", fundo: "amarelo", icones: ["paleta", "nota", "flor", "borboleta", "lapis", "estrela"], texto: { l1: "mostra de", dest: "Artes e Música", l3: "23 de setembro" } },
];

export const fundoPorId = (id: string) => FUNDOS.find((f) => f.id === id) ?? FUNDOS[0];

export interface TextosCaderno {
  l1: string;
  dest: string;
  l3: string;
}

export type Zona = { x: number; y: number; w: number; h: number };

export function pintarFundo(ctx: CanvasRenderingContext2D, f: FundoCaderno, W: number, H: number, m: number, R: Rng) {
  if (f.papel) {
    ctx.fillStyle = "#FDFBF6";
    ctx.fillRect(0, 0, W, H);
    const passo = m / 12;
    ctx.strokeStyle = "#DCE5F1";
    ctx.lineWidth = Math.max(1, passo * 0.04);
    for (let y = passo * 2; y < H; y += passo) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    return;
  }
  const [c1, c2] = f.cores!;
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // confete de papel bem discreto
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = f.escuro ? "rgba(255,255,255,.10)" : "rgba(8,48,120,.07)";
    ctx.beginPath();
    ctx.arc(R() * W, R() * H, m * (0.004 + R() * 0.008), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Margem vermelha e furos do caderno (só na folha). */
export function margemEFuros(ctx: CanvasRenderingContext2D, W: number, H: number, m: number, margem: number) {
  ctx.strokeStyle = "#E8A9A9";
  ctx.lineWidth = Math.max(1.5, m * 0.004);
  ctx.beginPath();
  ctx.moveTo(margem, 0);
  ctx.lineTo(margem, H);
  ctx.stroke();
  const r = m * 0.022, passo = m * 0.3;
  for (let y = passo * 0.6; y < H; y += passo) {
    ctx.fillStyle = "#E9E3D5";
    ctx.beginPath();
    ctx.arc(margem * 0.42, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,.06)";
    ctx.beginPath();
    ctx.arc(margem * 0.42, y - r * 0.2, r * 0.8, Math.PI, 0);
    ctx.fill();
  }
}

/** Pedaço de fita adesiva (washi) centrado em (x, y). */
export function fita(ctx: CanvasRenderingContext2D, x: number, y: number, larg: number, giro: number, cor: string) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.fillStyle = cor;
  ctx.fillRect(-larg / 2, -larg * 0.15, larg, larg * 0.3);
  ctx.restore();
}

function bandeirinhas(ctx: CanvasRenderingContext2D, W: number, m: number, R: Rng) {
  const cores = [COR.vermelho, COR.amarelo, COR.verde, "#F4F1DE", COR.azul, COR.laranja];
  for (let r = 0; r < 2; r++) {
    const y0 = m * (0.02 + r * 0.07), flecha = m * (0.05 + r * 0.02), tam = m * (0.075 - r * 0.01), n = Math.ceil(W / (tam * 1.1));
    ctx.strokeStyle = "rgba(244,241,222,.8)";
    ctx.lineWidth = m * 0.003;
    ctx.beginPath();
    for (let i = 0; i <= 50; i++) {
      const t = i / 50;
      const y = y0 + flecha * 4 * t * (1 - t);
      if (i) ctx.lineTo(t * W, y);
      else ctx.moveTo(0, y);
    }
    ctx.stroke();
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = t * W, y = y0 + flecha * 4 * t * (1 - t);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((R() - 0.5) * 0.2);
      ctx.fillStyle = cores[(i + r * 3) % cores.length];
      ctx.beginPath();
      ctx.moveTo(-tam * 0.38, 0);
      ctx.lineTo(tam * 0.38, 0);
      ctx.lineTo(tam * 0.38, tam);
      ctx.lineTo(0, tam * 0.72);
      ctx.lineTo(-tam * 0.38, tam);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Título no estilo do encarte: rótulo pequeno, título Fraunces com marca-texto na última linha, etiqueta amarela. */
export function textoCaderno(ctx: CanvasRenderingContext2D, z: Zona, t: TextosCaderno, f: FundoCaderno, logo: HTMLImageElement | undefined, logoW: number, alinhar: "esq" | "centro" = "esq") {
  // x de um item de largura w, conforme o alinhamento escolhido
  const xDe = (w: number) => (alinhar === "centro" ? z.x + (z.w - w) / 2 : z.x);
  const pre = t.l1.trim().toUpperCase(), dest = t.dest.trim() || "Nome do evento", pos = t.l3.trim();
  const quebra = (F: number) => {
    ctx.font = `700 ${F}px "PainelFraunces"`;
    const ls: string[] = [];
    let at = "";
    for (const p of dest.split(/\s+/)) {
      const x = at ? `${at} ${p}` : p;
      if (at && ctx.measureText(x).width > z.w) {
        ls.push(at);
        at = p;
      } else at = x;
    }
    if (at) ls.push(at);
    return ls;
  };
  const logoH = logo ? logoW / (logo.width / logo.height) : 0;
  const medir = (F: number) => {
    const ls = quebra(F);
    ctx.font = `700 ${F}px "PainelFraunces"`;
    const ld = Math.max(...ls.map((l) => ctx.measureText(l).width));
    ctx.font = `800 ${F * 0.2}px "PainelDM"`;
    const lp = pre ? ctx.measureText(pre).width + pre.length * F * 0.2 * 0.18 + F * 0.8 : 0;
    ctx.font = `800 ${F * 0.26}px "PainelDM"`;
    const le = pos ? ctx.measureText(pos.toUpperCase()).width + pos.length * F * 0.26 * 0.12 + F * 0.5 : 0;
    const alt = (logo ? logoH + F * 0.3 : 0) + (pre ? F * 0.2 * 1.9 : 0) + ls.length * F * 1.02 + (pos ? F * 0.3 + F * 0.26 * 2.1 : 0);
    return { ls, alt, ok: alt <= z.h && Math.max(ld, lp, le, logo ? logoW : 0) <= z.w && ls.length <= 3 };
  };
  let lo = 4, hi = z.h;
  for (let i = 0; i < 22; i++) {
    const F = (lo + hi) / 2;
    if (medir(F).ok) lo = F;
    else hi = F;
  }
  const F = lo, r = medir(F);
  let y = z.y + (z.h - r.alt) / 2;
  ctx.save();
  ctx.textBaseline = "alphabetic";
  if (logo) {
    if (f.escuro) {
      // no fundo escuro o logo vai num cartão branco, como um adesivo
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(xDe(logoW) - logoW * 0.1, y - logoW * 0.08, logoW * 1.2, logoH + logoW * 0.16, logoW * 0.12);
      ctx.fill();
    }
    ctx.drawImage(logo, xDe(logoW), y, logoW, logoH);
    y += logoH + F * 0.3;
  }
  if (pre) {
    const tam = F * 0.2;
    ctx.font = `800 ${tam}px "PainelDM"`;
    ctx.letterSpacing = `${tam * 0.18}px`;
    const w = ctx.measureText(pre).width;
    // centralizado: tracinho dos dois lados; à esquerda: só depois
    const x0 = alinhar === "centro" ? xDe(w) : z.x;
    ctx.fillStyle = f.pre;
    ctx.fillText(pre, x0, y + tam);
    ctx.fillStyle = "#FFB000";
    ctx.beginPath();
    ctx.roundRect(x0 + w + tam * 0.8, y + tam * 0.45, tam * 3, tam * 0.28, tam * 0.14);
    if (alinhar === "centro") ctx.roundRect(x0 - tam * 3.8, y + tam * 0.45, tam * 3, tam * 0.28, tam * 0.14);
    ctx.fill();
    ctx.letterSpacing = "0px";
    y += tam * 1.9;
  }
  ctx.font = `700 ${F}px "PainelFraunces"`;
  r.ls.forEach((l, i) => {
    const ultima = i === r.ls.length - 1 && r.ls.length > 1;
    const w = ctx.measureText(l).width;
    if ((ultima || r.ls.length === 1) && f.marcador) {
      ctx.fillStyle = f.marcador;
      ctx.fillRect(xDe(w) - F * 0.06, y + F * 0.5, w + F * 0.12, F * 0.42);
    }
    ctx.fillStyle = ultima ? f.destaque : f.titulo;
    ctx.fillText(l, xDe(w), y + F * 0.82);
    y += F * 1.02;
  });
  if (pos) {
    y += F * 0.3;
    const tam = F * 0.26;
    ctx.font = `800 ${tam}px "PainelDM"`;
    ctx.letterSpacing = `${tam * 0.12}px`;
    const txt = pos.toUpperCase(), w = ctx.measureText(txt).width;
    ctx.save();
    ctx.translate(xDe(w + tam * 1.4) + (w + tam * 1.4) / 2, y + tam * 1.05);
    ctx.rotate(-0.035);
    ctx.fillStyle = "#FFB000";
    ctx.beginPath();
    ctx.roundRect(-(w + tam * 1.4) / 2, -tam * 1.05, w + tam * 1.4, tam * 2.1, tam * 0.3);
    ctx.fill();
    ctx.fillStyle = "#083078";
    ctx.fillText(txt, -(w + tam * 1.4) / 2 + tam * 0.7, tam * 0.36);
    ctx.restore();
    ctx.letterSpacing = "0px";
  }
  ctx.restore();
}

/**
 * Desenha um elemento: ícone da biblioteca ou desenho criado pela IA
 * ("ia:<n>", imagem SVG em `extras`). O desenho da IA ganha o mesmo tremido
 * de giz dos ícones: duas passadas leves deslocadas por baixo da principal.
 */
export function desenharElemento(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, s: number, R: Rng, giro: number, extras?: Map<string, HTMLImageElement>) {
  if (!id.startsWith("ia:")) return desenharIcone(ctx, id, x, y, s, R, giro);
  const img = extras?.get(id);
  if (!img) return;
  const prop = img.width && img.height ? img.width / img.height : 1;
  const w = prop >= 1 ? s : s * prop, h = prop >= 1 ? s / prop : s;
  ctx.save();
  ctx.translate(x, y);
  if (giro) ctx.rotate(giro);
  for (let i = 0; i < 2; i++) {
    ctx.globalAlpha = 0.25;
    ctx.drawImage(img, -w / 2 + (R() - 0.5) * s * 0.012, -h / 2 + (R() - 0.5) * s * 0.012, w, h);
  }
  ctx.globalAlpha = 1;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** Polaroid branca com fita e um desenho grande. */
function polaroid(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, giro: number, icone: string, R: Rng, fitaCor: string, fundoFoto: string, extras?: Map<string, HTMLImageElement>) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(giro);
  ctx.shadowColor = "rgba(8,48,120,.18)";
  ctx.shadowBlur = s * 0.06;
  ctx.shadowOffsetY = s * 0.02;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(-s / 2, -s / 2, s, s * 1.14);
  ctx.shadowColor = "transparent";
  ctx.fillStyle = fundoFoto;
  ctx.fillRect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.88);
  desenharElemento(ctx, icone, 0, 0, s * (icone.startsWith("ia:") ? 0.82 : 0.7), R, 0, extras);
  fita(ctx, 0, -s / 2, s * 0.42, (R() - 0.5) * 0.3, fitaCor);
  ctx.restore();
}

/** Desenho solto na folha (ou num adesivo branco, se o fundo for colorido). */
export function solto(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, icone: string, R: Rng, adesivo: boolean, extras?: Map<string, HTMLImageElement>) {
  if (adesivo) {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.18)";
    ctx.shadowBlur = s * 0.08;
    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.arc(x, y, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  desenharElemento(ctx, icone, x, y, s * (adesivo ? 0.78 : 1), R, (R() - 0.5) * 0.4, extras);
}

const FOTOS = ["#FFF3C4", "#DCEBFA", "#FCE1EC", "#DFF3DA"];
const FITAS = ["rgba(255,192,64,.88)", "rgba(127,178,230,.88)", "rgba(232,111,166,.75)", "rgba(63,166,107,.7)"];

export type PosicaoTexto = "cima" | "meio" | "baixo";
export type Alinhamento = "esq" | "centro";

export interface OpcoesCaderno {
  posicao?: PosicaoTexto;
  alinhar?: Alinhamento;
  extras?: Map<string, HTMLImageElement>; // desenhos da IA
}

/**
 * Distribui polaroids e desenhos soltos numa zona. Zona larga: fotos lado a
 * lado; zona alta ou quadrada: fotos em diagonal.
 */
function ilustrar(ctx: CanvasRenderingContext2D, zi: Zona, cards: string[], soltos: string[], R: Rng, adesivo: boolean, semente: number, extras?: Map<string, HTMLImageElement>) {
  const k = Math.min(zi.w, zi.h);
  const razao = zi.w / zi.h;
  const slots =
    razao > 2.6
      ? { cards: [[0.3, 0.5, 0.78, -0.06], [0.62, 0.52, 0.72, 0.05]], soltos: [[0.08, 0.3, 0.3], [0.9, 0.3, 0.3], [0.9, 0.78, 0.26], [0.08, 0.8, 0.26]] }
      : razao > 1.7
        ? { cards: [[0.28, 0.46, 0.62, -0.07], [0.68, 0.54, 0.56, 0.06]], soltos: [[0.92, 0.16, 0.22], [0.08, 0.1, 0.2], [0.94, 0.86, 0.2], [0.48, 0.1, 0.16]] }
        : razao < 0.6
          ? { cards: [[0.5, 0.3, 0.7, -0.06], [0.5, 0.7, 0.66, 0.05]], soltos: [[0.18, 0.08, 0.3], [0.84, 0.5, 0.26], [0.2, 0.94, 0.26], [0.86, 0.95, 0.2]] }
          : { cards: [[0.33, 0.4, 0.56, -0.07], [0.7, 0.62, 0.5, 0.06]], soltos: [[0.84, 0.14, 0.24], [0.12, 0.86, 0.22], [0.92, 0.94, 0.16], [0.5, 0.95, 0.15]] };
  const usar = cards.length === 1 ? [[0.5, 0.5, Math.min(0.8, slots.cards[0][2] * 1.15), -0.04]] : slots.cards;
  cards.slice(0, usar.length).forEach((ic, i) => {
    const [x, y, s, g] = usar[i];
    polaroid(ctx, zi.x + x * zi.w, zi.y + y * zi.h, s * k, g, ic, R, FITAS[i % FITAS.length], FOTOS[(i + semente) % FOTOS.length], extras);
  });
  soltos.slice(0, slots.soltos.length).forEach((ic, i) => {
    const [x, y, s] = slots.soltos[i];
    solto(ctx, zi.x + x * zi.w, zi.y + y * zi.h, s * k, ic, R, adesivo, extras);
  });
}

export function desenharCaderno(ctx: CanvasRenderingContext2D, c: ComposicaoCaderno, W: number, H: number, t: TextosCaderno, logo: HTMLImageElement | undefined, icones: string[], fundoId: string, op: OpcoesCaderno = {}) {
  const f = fundoPorId(fundoId);
  const m = Math.min(W, H);
  const R = rng(c.id.length * 97 + 13);
  const forma = W >= H * 1.35 ? "largo" : H >= W * 1.35 ? "alto" : "quad";
  const posicao = op.posicao ?? (forma === "largo" ? "meio" : "cima");
  const alinhar = op.alinhar ?? "esq";
  ctx.clearRect(0, 0, W, H);
  pintarFundo(ctx, f, W, H, m, R);
  const margem = f.papel ? (forma === "alto" ? W * 0.14 : Math.min(W * 0.08, m * 0.3)) : m * 0.06;
  if (f.papel) margemEFuros(ctx, W, H, m, margem);
  if (c.topo === "bandeirinhas") bandeirinhas(ctx, W, m, R);
  const topo = c.topo ? m * 0.2 : 0;

  // área útil (dentro da margem e abaixo das bandeirinhas)
  const pad = m * 0.07;
  const U: Zona = { x: margem + pad * 0.6, y: topo + pad * 0.6, w: W - margem - pad * 1.2, h: H - topo - pad * 1.2 };
  let zt: Zona;
  let zis: Zona[];
  if (posicao === "meio") {
    if (forma === "largo" && alinhar === "esq") {
      // o layout clássico: texto à esquerda, desenhos à direita
      zt = { x: U.x + pad * 0.4, y: U.y + pad * 0.4, w: U.w * 0.55, h: U.h - pad * 0.8 };
      zis = [{ x: U.x + U.w * 0.6, y: U.y, w: U.w * 0.4, h: U.h }];
    } else if (forma === "largo") {
      // centralizado: texto no meio, desenhos dos dois lados
      zt = { x: U.x + U.w * 0.27, y: U.y + pad * 0.4, w: U.w * 0.46, h: U.h - pad * 0.8 };
      zis = [{ x: U.x, y: U.y, w: U.w * 0.25, h: U.h }, { x: U.x + U.w * 0.75, y: U.y, w: U.w * 0.25, h: U.h }];
    } else {
      // em pé ou quadrado: faixa de desenhos em cima e embaixo, texto no meio
      zt = { x: U.x + pad * 0.3, y: U.y + U.h * 0.3, w: U.w - pad * 0.6, h: U.h * 0.4 };
      zis = [{ x: U.x, y: U.y, w: U.w, h: U.h * 0.28 }, { x: U.x, y: U.y + U.h * 0.72, w: U.w, h: U.h * 0.28 }];
    }
  } else {
    // em cima ou embaixo: faixa de texto e faixa de desenhos
    const frac = forma === "largo" ? 0.5 : forma === "alto" ? 0.44 : 0.5;
    const faixaTexto = U.h * frac, faixaDes = U.h - faixaTexto;
    const yT = posicao === "cima" ? U.y : U.y + faixaDes;
    const yD = posicao === "cima" ? U.y + faixaTexto : U.y;
    zt = { x: U.x + pad * 0.3, y: yT + pad * 0.2, w: U.w - pad * 0.6, h: faixaTexto - pad * 0.4 };
    zis = [{ x: U.x, y: yD, w: U.w, h: faixaDes }];
  }

  // desenhos: os 2 primeiros em polaroid; o resto solto, repartido entre as zonas
  const sel = icones.length ? icones : c.icones;
  const [a, b, ...resto] = sel;
  if (zis.length === 1) ilustrar(ctx, zis[0], [a, b].filter(Boolean), resto, R, !f.papel, c.id.length, op.extras);
  else {
    const meio = Math.ceil(resto.length / 2);
    ilustrar(ctx, zis[0], [a].filter(Boolean), resto.slice(0, meio), R, !f.papel, c.id.length, op.extras);
    ilustrar(ctx, zis[1], [b].filter(Boolean), resto.slice(meio), R, !f.papel, c.id.length + 1, op.extras);
  }

  // Deitado com a frase em cima/embaixo: faixa baixa, então o logo vai ao lado da frase (empilhado, ela ficaria miúda).
  if (forma === "largo" && posicao !== "meio" && logo) {
    const lw = Math.min(zt.h * 0.85 * (logo.width / logo.height), W * 0.12), lh = lw / (logo.width / logo.height);
    const lx = zt.x, ly = zt.y + (zt.h - lh) / 2;
    if (f.escuro) {
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(lx - lw * 0.1, ly - lw * 0.08, lw * 1.2, lh + lw * 0.16, lw * 0.12);
      ctx.fill();
    }
    ctx.drawImage(logo, lx, ly, lw, lh);
    const desloc = lw + m * 0.08;
    const zt2 = alinhar === "centro" ? { ...zt, x: zt.x + desloc, w: zt.w - desloc * 2 } : { ...zt, x: zt.x + desloc, w: zt.w - desloc };
    textoCaderno(ctx, zt2, t, f, undefined, 0, alinhar);
    return;
  }
  textoCaderno(ctx, zt, t, f, logo, m * (forma === "alto" ? 0.3 : 0.22), alinhar);
}
