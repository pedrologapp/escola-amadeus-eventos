/**
 * Painel "Banner colorido" (29/09/2026): o estilo dos painéis que a escola
 * já mandou para a gráfica (Dia do Estudante, Volta às Aulas, Dia dos Pais):
 * uma ilustração 3D ocupando o painel todo (gerada fora, no Higgsfield, sem
 * texto e com um lado vazio) e, por cima, a frase em letra Ralton 3D —
 * palavras em *asteriscos* saem grandes no destaque, as outras menores — e o
 * logo embaixo. Tudo pode ser arrastado à mão na prévia (fundo, frase e os
 * ícones que a pessoa colocar); o desenho devolve as caixas para isso.
 */

import { pecaUrl } from "@/lib/paineis";

export const ILUSTRACOES: { id: string; nome: string; arquivo: string }[] = [
  { id: "dia-das-criancas", nome: "Dia das Crianças", arquivo: "/paineis/ilustracoes/dia-das-criancas.jpg" },
];

export const LOGO_BANNER = "/logo-amadeus-negativa.png";

/** Ícones que dá para colocar e arrastar: peças da marca e os logos. */
export const ICONES: { id: string; nome: string; src: string; hd: string }[] = [
  { id: "logo", nome: "Logo (claro)", src: LOGO_BANNER, hd: LOGO_BANNER },
  ...([
    [8, "Logo (escuro)"], [6, "Globo"], [10, "Menina"], [22, "Mochila"], [23, "Lápis"], [27, "Caderno"], [25, "Transferidor"],
    [26, "Giz de cera"], [38, "Sol"], [11, "Flor"], [12, "Flor com haste"], [18, "Estrelinhas"], [15, "Onda"], [13, "Arcos"], [17, "Nuvem"], [19, "Círculos"],
  ] as [number, string][]).map(([n, nome]) => ({ id: `p${n}`, nome, src: pecaUrl(n), hd: pecaUrl(n, true) })),
];

export type LadoTexto = "esq" | "centro" | "dir";
export type Contorno = "branco" | "marinho" | "nenhum";

export interface Adesivo {
  id: string;
  src: string;
  hd: string;
  x: number; // centro, em fração da largura
  y: number; // centro, em fração da altura
  w: number; // largura, em fração da largura do painel
}

export interface OpcoesBanner {
  frase: string; // uma linha por linha do painel; *palavra* = destaque
  data: string; // linha opcional embaixo da frase
  lado: LadoTexto;
  logo: boolean;
  espelhar: boolean;
  corDest: string; // id em CORES
  corComum: string;
  contorno: Contorno;
  // ajuste à mão: zoom da ilustração (1 = cobre o painel) e deslocamentos em fração da largura/altura
  img: { zoom: number; dx: number; dy: number };
  texto: { escala: number; dx: number; dy: number };
  adesivos: Adesivo[];
}

/** Cores da letra: face em degradê (3 tons), lado e fundo da espessura. */
export const CORES: { id: string; nome: string; topo: [string, string, string]; lado: string; fundo: string }[] = [
  { id: "amarelo", nome: "Amarelo", topo: ["#FFE45C", "#FFB81C", "#FF9A12"], lado: "#D96A00", fundo: "#9C4700" },
  { id: "azul", nome: "Azul", topo: ["#5FC0FF", "#2E8FF0", "#1F74DB"], lado: "#124DA6", fundo: "#0B2F72" },
  { id: "branco", nome: "Branco", topo: ["#FFFFFF", "#F4F7FC", "#DDE6F4"], lado: "#9FB3D6", fundo: "#5E77A6" },
  { id: "marinho", nome: "Azul-marinho", topo: ["#2A57B8", "#1B3B8C", "#12307A"], lado: "#0A1E52", fundo: "#061334" },
  { id: "laranja", nome: "Laranja", topo: ["#FFB347", "#FF8A1C", "#F26B0F"], lado: "#B84A00", fundo: "#7A3000" },
  { id: "rosa", nome: "Rosa", topo: ["#FF9CC8", "#F2549A", "#E0357F"], lado: "#A81E5A", fundo: "#6E1039" },
  { id: "verde", nome: "Verde", topo: ["#9BE86A", "#4CC23A", "#2FA32B"], lado: "#1C7420", fundo: "#0F4A14" },
  { id: "vermelho", nome: "Vermelho", topo: ["#FF7A6B", "#F0442F", "#D42A1C"], lado: "#951A10", fundo: "#5E0E08" },
];

const cor = (id: string) => CORES.find((c) => c.id === id) ?? CORES[0];

/** Quanto a ilustração pode andar para cada lado (em fração do painel) sem deixar buraco. */
export function folgaImg(W: number, H: number, iw: number, ih: number, zoom: number) {
  const esc = Math.max(W / iw, H / ih) * zoom;
  return { x: Math.max(0, (iw * esc - W) / 2 / W), y: Math.max(0, (ih * esc - H) / 2 / H) };
}

interface Pedaco {
  t: string;
  dest: boolean;
}

/** "Ser criança é *brincar!*" → pedaços com e sem destaque, linha a linha. */
export function lerFrase(frase: string): Pedaco[][] {
  return frase
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const out: Pedaco[] = [];
      l.split(/(\*[^*]+\*)/).forEach((p) => {
        if (!p) return;
        if (p.startsWith("*") && p.endsWith("*") && p.length > 2) out.push({ t: p.slice(1, -1).trim(), dest: true });
        else if (p.trim()) out.push({ t: p.trim(), dest: false });
      });
      return out;
    })
    .filter((l) => l.length);
}

const PEQ = 0.56; // tamanho da palavra comum em relação ao destaque

const fonte = (px: number) => `${px}px "Ralton"`;

/**
 * Uma palavra/trecho em letra 3D: sombra, contorno grosso (que abraça também
 * a espessura), a espessura em camadas e a face com degradê.
 */
function letra3d(ctx: CanvasRenderingContext2D, t: string, x: number, base: number, px: number, dest: boolean, o: OpcoesBanner) {
  const e = cor(dest ? o.corDest : o.corComum);
  const prof = px * (dest ? 0.075 : 0.06);
  const passos = Math.max(3, Math.round(prof / Math.max(0.6, px * 0.008)));
  const contorno = o.contorno === "nenhum" ? 0 : px * (dest ? 0.2 : 0.22);
  ctx.save();
  ctx.font = fonte(px);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  ctx.shadowColor = "rgba(5,20,60,.45)";
  ctx.shadowBlur = px * 0.18;
  ctx.shadowOffsetY = px * 0.06;
  if (contorno) {
    ctx.strokeStyle = o.contorno === "branco" ? "#FFFFFF" : "#0B2260";
    ctx.lineWidth = contorno;
    ctx.strokeText(t, x, base + prof);
    ctx.shadowColor = "transparent";
    for (let i = 0; i <= passos; i++) ctx.strokeText(t, x, base + (prof * i) / passos);
  } else {
    // sem contorno, a sombra sai da própria espessura
    ctx.fillStyle = e.fundo;
    ctx.fillText(t, x, base + prof);
    ctx.shadowColor = "transparent";
  }

  ctx.fillStyle = e.fundo;
  ctx.fillText(t, x, base + prof);
  ctx.fillStyle = e.lado;
  for (let i = passos; i >= 1; i--) ctx.fillText(t, x, base + (prof * i) / passos);

  const g = ctx.createLinearGradient(0, base - px * 0.78, 0, base);
  g.addColorStop(0, e.topo[0]);
  g.addColorStop(0.55, e.topo[1]);
  g.addColorStop(1, e.topo[2]);
  ctx.fillStyle = g;
  ctx.fillText(t, x, base);
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = px * 0.012;
  ctx.strokeText(t, x, base - px * 0.004);
  ctx.restore();
}

function larguraLinha(ctx: CanvasRenderingContext2D, l: Pedaco[], F: number) {
  let w = 0;
  l.forEach((p, i) => {
    ctx.font = fonte(p.dest ? F : F * PEQ);
    w += ctx.measureText(p.t).width;
    if (i < l.length - 1) w += F * 0.2;
  });
  return w + F * 0.2; // folga do contorno
}

const altLinha = (l: Pedaco[], F: number) => (l.some((p) => p.dest) ? F * 0.92 : F * PEQ * 1.05);

export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaixasBanner {
  texto: Caixa | null;
  adesivos: { id: string; caixa: Caixa }[];
}

/**
 * Desenha o banner. `imgs` traz a ilustração, o logo e os ícones já
 * carregados (chave = src). Devolve onde ficaram a frase e os ícones.
 */
export function desenharBanner(ctx: CanvasRenderingContext2D, W: number, H: number, ilustracao: HTMLImageElement | undefined, logo: HTMLImageElement | undefined, icones: Map<string, HTMLImageElement>, o: OpcoesBanner): CaixasBanner {
  const m = Math.min(W, H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#12307A";
  ctx.fillRect(0, 0, W, H);

  // ilustração cobrindo o painel todo; zoom e posição à mão, sempre sem deixar buraco
  if (ilustracao) {
    const img = ilustracao;
    const zoom = Math.max(1, o.img.zoom);
    const esc = Math.max(W / img.width, H / img.height) * zoom;
    const w = img.width * esc, h = img.height * esc;
    const f = folgaImg(W, H, img.width, img.height, zoom);
    const dx = Math.max(-f.x, Math.min(f.x, o.img.dx)), dy = Math.max(-f.y, Math.min(f.y, o.img.dy));
    const x = (W - w) / 2 + dx * W;
    const y = (H - h) / 2 + dy * H;
    ctx.save();
    if (o.espelhar) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    // espelhada, desenha na posição refletida para o arrasto continuar no sentido da mão
    ctx.drawImage(img, o.espelhar ? W - x - w : x, y, w, h);
    ctx.restore();
  }

  // área do texto: o lado vazio da ilustração; no painel deitado a borda costuma ter objetos
  const pad = m * 0.08;
  const largo = W >= H * 1.35;
  const zw = largo ? W * 0.44 : W - pad * 2;
  const borda = largo ? W * 0.11 : pad;
  const z = { x: o.lado === "esq" ? borda : o.lado === "dir" ? W - borda - zw : (W - zw) / 2, y: pad, w: zw, h: H - pad * 2 };
  const linhas = lerFrase(o.frase);
  const data = o.data.trim();
  const logoProp = logo ? logo.width / logo.height : 4;
  const comLogo = !!logo && o.logo;

  const medir = (F: number) => {
    const larg = Math.max(0, ...linhas.map((l) => larguraLinha(ctx, l, F)));
    let alt = linhas.reduce((s, l) => s + altLinha(l, F), 0);
    let lw = 0;
    if (data) {
      ctx.font = fonte(F * 0.36);
      lw = ctx.measureText(data).width + F * 0.5;
      alt += F * 0.62;
    }
    const logoW = Math.min(F * 3.4, z.w * 0.8);
    if (comLogo) alt += logoW / logoProp + F * 0.3;
    return { larg: Math.max(larg, lw, comLogo ? logoW : 0), alt, logoW };
  };
  let caixaTexto: Caixa | null = null;
  if (linhas.length || data || comLogo) {
    let lo = 2, hi = H;
    for (let i = 0; i < 24; i++) {
      const F = (lo + hi) / 2;
      const r = medir(F);
      if (r.larg <= z.w && r.alt <= z.h) lo = F;
      else hi = F;
    }
    // tamanho à mão por cima do encaixe automático (pode passar da área)
    const F = lo * Math.max(0.3, o.texto.escala), r = medir(F);
    const cx = z.x + z.w / 2 + o.texto.dx * W;
    const y0 = z.y + (z.h - r.alt) / 2 + o.texto.dy * H;
    let y = y0;
    caixaTexto = { x: cx - r.larg / 2, y: y0, w: r.larg, h: r.alt };

    for (const l of linhas) {
      const h = altLinha(l, F);
      const base = y + h * (l.some((p) => p.dest) ? 0.8 : 0.82);
      let x = cx - larguraLinha(ctx, l, F) / 2 + F * 0.1;
      l.forEach((p) => {
        const px = p.dest ? F : F * PEQ;
        letra3d(ctx, p.t, x, base, px, p.dest, o);
        ctx.font = fonte(px);
        x += ctx.measureText(p.t).width + F * 0.2;
      });
      y += h;
    }

    if (data) {
      // etiqueta arredondada com a data
      const px = F * 0.36;
      ctx.save();
      ctx.font = fonte(px);
      const tw = ctx.measureText(data).width;
      const bw = tw + px * 1.2, bh = px * 1.45;
      const bx = cx - bw / 2, by = y + F * 0.12;
      ctx.shadowColor = "rgba(5,20,60,.35)";
      ctx.shadowBlur = px * 0.4;
      ctx.shadowOffsetY = px * 0.1;
      ctx.fillStyle = o.corDest === "branco" ? "#FFB81C" : "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, bh / 2);
      ctx.fill();
      ctx.shadowColor = "transparent";
      ctx.fillStyle = "#12307A";
      ctx.textBaseline = "middle";
      ctx.fillText(data, cx - tw / 2, by + bh / 2 + px * 0.04);
      ctx.restore();
      y += F * 0.62;
    }

    if (comLogo) {
      const lw = r.logoW, lh = lw / logoProp;
      ctx.save();
      ctx.shadowColor = "rgba(5,20,60,.45)";
      ctx.shadowBlur = lh * 0.25;
      ctx.shadowOffsetY = lh * 0.06;
      ctx.drawImage(logo!, cx - lw / 2, y + F * 0.3, lw, lh);
      ctx.restore();
    }
  }

  // ícones por cima de tudo, na ordem em que foram colocados
  const adesivos: CaixasBanner["adesivos"] = [];
  for (const a of o.adesivos) {
    const im = icones.get(a.src);
    if (!im) continue;
    const w = a.w * W, h = w / (im.width / im.height);
    const caixa = { x: a.x * W - w / 2, y: a.y * H - h / 2, w, h };
    ctx.save();
    ctx.shadowColor = "rgba(5,20,60,.35)";
    ctx.shadowBlur = w * 0.04;
    ctx.shadowOffsetY = w * 0.015;
    ctx.drawImage(im, caixa.x, caixa.y, w, h);
    ctx.restore();
    adesivos.push({ id: a.id, caixa });
  }
  ctx.restore();

  return { texto: caixaTexto, adesivos };
}

/** Pedido pronto para colar no Higgsfield: ilustração no estilo dos painéis, sem texto, com um lado vazio. */
export function pedidoHiggsfield(tema: string, lado: LadoTexto) {
  const vazio = lado === "esq" ? "LEFT half" : lado === "dir" ? "RIGHT half" : "CENTER";
  const pers = lado === "esq" ? "RIGHT third" : lado === "dir" ? "LEFT third" : "left and right edges";
  return `Wide horizontal school banner illustration for "${tema}", Pixar-style 3D render, glossy and cheerful. Deep navy blue background covered with a subtle pattern of thin light-blue line-art school doodles (books, pencils, rulers, globes, atoms, paper planes). Yellow-orange wavy blobs curving in from the corners. On the ${pers}: happy Brazilian kids (diverse skin tones and hair) wearing a light-blue school t-shirt with navy collar and navy track pants, acting out the theme. Around them, 3D objects related to the theme, floating, with confetti and small stars. The whole ${vazio} is left as clean empty navy space for a big headline to be added later. Absolutely NO text, no letters, no words, no logos anywhere. Soft studio lighting, vibrant yellow, orange and blue palette, high detail.`;
}
