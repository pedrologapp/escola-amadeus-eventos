/**
 * Painel "Banner colorido" (29/09/2026): o estilo dos painéis que a escola
 * já mandou para a gráfica (Dia do Estudante, Volta às Aulas, Dia dos Pais):
 * uma ilustração 3D ocupando o painel todo (gerada fora, no Higgsfield, sem
 * texto e com um lado vazio) e, por cima, a frase em letra Ralton com
 * contorno branco grosso — palavras em *asteriscos* saem grandes em amarelo
 * 3D, as outras menores em azul — e o logo da escola embaixo.
 */

export const ILUSTRACOES: { id: string; nome: string; arquivo: string }[] = [
  { id: "dia-das-criancas", nome: "Dia das Crianças", arquivo: "/paineis/ilustracoes/dia-das-criancas.jpg" },
];

export const LOGO_BANNER = "/logo-amadeus-negativa.png";

export type LadoTexto = "esq" | "centro" | "dir";
export type AjusteImg = "cima" | "meio" | "baixo";

export interface OpcoesBanner {
  frase: string; // uma linha por linha do painel; *palavra* = destaque amarelo
  data: string; // linha opcional embaixo da frase
  lado: LadoTexto;
  logo: boolean;
  espelhar: boolean;
  ajuste: AjusteImg;
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

const ESTILO = {
  dest: { topo: ["#FFE45C", "#FFB81C", "#FF9A12"], lado: "#D96A00", fundo: "#9C4700" },
  comum: { topo: ["#5FC0FF", "#2E8FF0", "#1F74DB"], lado: "#124DA6", fundo: "#0B2F72" },
};

const fonte = (px: number) => `${px}px "Ralton"`;

/**
 * Uma palavra/trecho em letra 3D: sombra, contorno branco grosso (que abraça
 * também a espessura), a espessura em camadas e a face com degradê.
 */
function letra3d(ctx: CanvasRenderingContext2D, t: string, x: number, base: number, px: number, dest: boolean) {
  const e = dest ? ESTILO.dest : ESTILO.comum;
  const prof = px * (dest ? 0.075 : 0.06);
  const passos = Math.max(3, Math.round(prof / Math.max(0.6, px * 0.008)));
  const contorno = px * (dest ? 0.2 : 0.22);
  ctx.save();
  ctx.font = fonte(px);
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  // sombra suave no fundo
  ctx.shadowColor = "rgba(5,20,60,.45)";
  ctx.shadowBlur = px * 0.18;
  ctx.shadowOffsetY = px * 0.06;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = contorno;
  ctx.strokeText(t, x, base + prof);
  ctx.shadowColor = "transparent";

  // contorno branco cobrindo toda a espessura
  for (let i = 0; i <= passos; i++) ctx.strokeText(t, x, base + (prof * i) / passos);

  // espessura
  ctx.fillStyle = e.fundo;
  ctx.fillText(t, x, base + prof);
  ctx.fillStyle = e.lado;
  for (let i = passos; i >= 1; i--) ctx.fillText(t, x, base + (prof * i) / passos);

  // face
  const g = ctx.createLinearGradient(0, base - px * 0.78, 0, base);
  g.addColorStop(0, e.topo[0]);
  g.addColorStop(0.55, e.topo[1]);
  g.addColorStop(1, e.topo[2]);
  ctx.fillStyle = g;
  ctx.fillText(t, x, base);
  // brilho fino na borda da face
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = px * 0.012;
  ctx.strokeText(t, x, base - px * 0.004);
  ctx.restore();
}

function larguraLinha(ctx: CanvasRenderingContext2D, l: Pedaco[], F: number) {
  let w = 0;
  l.forEach((p, i) => {
    const px = p.dest ? F : F * PEQ;
    ctx.font = fonte(px);
    w += ctx.measureText(p.t).width;
    if (i < l.length - 1) w += F * 0.2;
  });
  return w + F * 0.2; // folga do contorno
}

const altLinha = (l: Pedaco[], F: number) => (l.some((p) => p.dest) ? F * 0.92 : F * PEQ * 1.05);

export function desenharBanner(ctx: CanvasRenderingContext2D, W: number, H: number, img: HTMLImageElement | undefined, logo: HTMLImageElement | undefined, o: OpcoesBanner) {
  const m = Math.min(W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#12307A";
  ctx.fillRect(0, 0, W, H);

  // ilustração cobrindo o painel todo (corta as sobras em cima/embaixo ou nos lados)
  if (img) {
    const esc = Math.max(W / img.width, H / img.height);
    const w = img.width * esc, h = img.height * esc;
    const x = (W - w) / 2;
    const y = o.ajuste === "cima" ? 0 : o.ajuste === "baixo" ? H - h : (H - h) / 2;
    ctx.save();
    if (o.espelhar) {
      ctx.translate(W, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(img, x, y, w, h);
    ctx.restore();
  }

  // área do texto: o lado vazio da ilustração
  const pad = m * 0.08;
  const largo = W >= H * 1.35;
  // no painel deitado, a borda costuma ter brinquedos/objetos: a frase fica entre ela e o meio
  const zw = largo ? W * 0.44 : W - pad * 2;
  const borda = largo ? W * 0.11 : pad;
  const z = {
    x: o.lado === "esq" ? borda : o.lado === "dir" ? W - borda - zw : (W - zw) / 2,
    y: pad,
    w: zw,
    h: H - pad * 2,
  };
  const linhas = lerFrase(o.frase);
  const data = o.data.trim();
  const logoProp = logo ? logo.width / logo.height : 4;

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
    if (logo && o.logo) alt += logoW / logoProp + F * 0.3;
    return { larg: Math.max(larg, lw), alt, logoW };
  };
  let lo = 2, hi = H;
  for (let i = 0; i < 24; i++) {
    const F = (lo + hi) / 2;
    const r = medir(F);
    if (r.larg <= z.w && r.alt <= z.h) lo = F;
    else hi = F;
  }
  const F = lo, r = medir(F);
  const cx = z.x + z.w / 2;
  let y = z.y + (z.h - r.alt) / 2;

  for (const l of linhas) {
    const h = altLinha(l, F);
    const base = y + h * (l.some((p) => p.dest) ? 0.8 : 0.82);
    let x = cx - larguraLinha(ctx, l, F) / 2 + F * 0.1;
    l.forEach((p) => {
      const px = p.dest ? F : F * PEQ;
      letra3d(ctx, p.t, x, base, px, p.dest);
      ctx.font = fonte(px);
      x += ctx.measureText(p.t).width + F * 0.2;
    });
    y += h;
  }

  if (data) {
    // etiqueta branca arredondada com a data em azul
    const px = F * 0.36;
    ctx.save();
    ctx.font = fonte(px);
    const tw = ctx.measureText(data).width;
    const bw = tw + px * 1.2, bh = px * 1.45;
    const bx = cx - bw / 2, by = y + F * 0.12;
    ctx.shadowColor = "rgba(5,20,60,.35)";
    ctx.shadowBlur = px * 0.4;
    ctx.shadowOffsetY = px * 0.1;
    ctx.fillStyle = "#FFFFFF";
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

  if (logo && o.logo) {
    const lw = r.logoW, lh = lw / logoProp;
    const ly = y + F * 0.3;
    ctx.save();
    ctx.shadowColor = "rgba(5,20,60,.45)";
    ctx.shadowBlur = lh * 0.25;
    ctx.shadowOffsetY = lh * 0.06;
    ctx.drawImage(logo, cx - lw / 2, ly, lw, lh);
    ctx.restore();
  }
}

/** Pedido pronto para colar no Higgsfield: ilustração no estilo dos painéis, sem texto, com um lado vazio. */
export function pedidoHiggsfield(tema: string, lado: LadoTexto) {
  const vazio = lado === "esq" ? "LEFT half" : lado === "dir" ? "RIGHT half" : "CENTER";
  const pers = lado === "esq" ? "RIGHT third" : lado === "dir" ? "LEFT third" : "left and right edges";
  return `Wide horizontal school banner illustration for "${tema}", Pixar-style 3D render, glossy and cheerful. Deep navy blue background covered with a subtle pattern of thin light-blue line-art school doodles (books, pencils, rulers, globes, atoms, paper planes). Yellow-orange wavy blobs curving in from the corners. On the ${pers}: happy Brazilian kids (diverse skin tones and hair) wearing a light-blue school t-shirt with navy collar and navy track pants, acting out the theme. Around them, 3D objects related to the theme, floating, with confetti and small stars. The whole ${vazio} is left as clean empty navy space for a big headline to be added later. Absolutely NO text, no letters, no words, no logos anywhere. Soft studio lighting, vibrant yellow, orange and blue palette, high detail.`;
}
