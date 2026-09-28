/**
 * Desenho do painel num <canvas> (só no navegador). O mesmo código faz a
 * prévia na tela e o arquivo da gráfica — só muda o tamanho do canvas e se as
 * peças vêm na versão leve ou em alta (hd).
 */

import { MARCA_30, PROPORCAO, arranjoPara, pecaUrl, type Composicao, type Fundo } from "@/lib/paineis";

export interface Textos {
  l1: string; // linha de cima (Scrib, minúscula)
  dest: string; // destaque (Ralton)
  l3: string; // linha de baixo (Scrib)
}

const cacheImg = new Map<string, Promise<HTMLImageElement>>();
export function imagem(src: string) {
  let p = cacheImg.get(src);
  if (!p) {
    p = new Promise((ok, erro) => {
      const i = new Image();
      i.decoding = "async";
      i.onload = () => ok(i);
      i.onerror = () => erro(new Error(`Não carregou ${src}`));
      i.src = src;
    });
    cacheImg.set(src, p);
  }
  return p;
}

let fontes: Promise<void> | null = null;
export function carregarFontes() {
  if (!fontes) {
    fontes = Promise.all([
      new FontFace("Ralton", "url(/fonts/marca/ralton-black.otf)").load(),
      new FontFace("Scrib", "url(/fonts/marca/scrib-sans.otf)").load(),
    ]).then((fs) => fs.forEach((f) => document.fonts.add(f)));
  }
  return fontes;
}

/** Todas as imagens que a composição usa, já carregadas (chave = nº da peça; -30 = selo dos 30 anos). */
export async function recursos(c: Composicao, hd = false) {
  const nums = new Set<number>([...c.largo.c, ...c.alto.c, ...c.quad.c].map((x) => x.a));
  if (c.grade) nums.add(21);
  if (c.placa) nums.add(c.placa);
  if (c.texto.logo) nums.add(c.texto.logo);
  const mapa = new Map<number, HTMLImageElement>();
  await Promise.all([
    ...[...nums].map(async (n) => mapa.set(n, await imagem(pecaUrl(n, hd)))),
    ...(c.marca30 ? [imagem(MARCA_30).then((i) => mapa.set(-30, i))] : []),
  ]);
  return mapa;
}

function pintarFundo(ctx: CanvasRenderingContext2D, f: Fundo, W: number, H: number) {
  if (f.tipo === "liso") {
    ctx.fillStyle = f.cor;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  if (f.tipo === "linear") {
    // Mesma geometria do linear-gradient do CSS (0° = para cima).
    const a = (f.angulo * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const meio = (Math.abs(W * dx) + Math.abs(H * dy)) / 2;
    const g = ctx.createLinearGradient(W / 2 - dx * meio, H / 2 - dy * meio, W / 2 + dx * meio, H / 2 + dy * meio);
    f.cores.forEach(([cor, p]) => g.addColorStop(p, cor));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  // radial "ellipse farthest-corner": círculo unitário esticado.
  const cx = f.cx * W, cy = f.cy * H;
  const rx = Math.max(cx, W - cx) * Math.SQRT2, ry = Math.max(cy, H - cy) * Math.SQRT2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  f.cores.forEach(([cor, p]) => g.addColorStop(p, cor));
  ctx.fillStyle = g;
  ctx.fillRect(-cx / rx, -cy / ry, W / rx, H / ry);
  ctx.restore();
}

/** Quebra o destaque em linhas que caibam na largura. */
function linhas(ctx: CanvasRenderingContext2D, texto: string, larg: number) {
  const out: string[] = [];
  for (const par of texto.split("\n")) {
    let atual = "";
    for (const p of par.split(/\s+/).filter(Boolean)) {
      const t = atual ? `${atual} ${p}` : p;
      if (atual && ctx.measureText(t).width > larg) {
        out.push(atual);
        atual = p;
      } else atual = t;
    }
    if (atual) out.push(atual);
  }
  return out.length ? out : [""];
}

export function desenhar(ctx: CanvasRenderingContext2D, c: Composicao, W: number, H: number, t: Textos, img: Map<number, HTMLImageElement>, lCm: number, aCm: number) {
  const m = Math.min(W, H);
  const arr = arranjoPara(c, lCm, aCm);
  ctx.clearRect(0, 0, W, H);
  pintarFundo(ctx, c.fundo, W, H);

  if (c.grade && img.get(21)) {
    const g = img.get(21)!, gw = m * 0.5, gh = gw / PROPORCAO[21];
    ctx.save();
    ctx.globalAlpha = 0.18;
    for (let y = 0; y < H; y += gh) for (let x = 0; x < W; x += gw) ctx.drawImage(g, x, y, gw, gh);
    ctx.restore();
  }

  for (const k of arr.c) {
    const i = img.get(k.a);
    if (!i) continue;
    const w = k.s * m, h = w / (PROPORCAO[k.a] ?? i.width / i.height);
    ctx.save();
    ctx.globalAlpha = k.o ?? 1;
    ctx.translate(k.x * W, k.y * H);
    if (k.r) ctx.rotate((k.r * Math.PI) / 180);
    if (k.fx) ctx.scale(-1, 1);
    ctx.drawImage(i, -w / 2, -h / 2, w, h);
    ctx.restore();
  }

  const [zx, zy, zw, zh] = [arr.z[0] * W, arr.z[1] * H, arr.z[2] * W, arr.z[3] * H];
  if (c.placa && img.get(c.placa)) {
    const pw = zw * 1.08, ph = zh * 1.05;
    ctx.drawImage(img.get(c.placa)!, zx - pw * 0.04, zy - ph * 0.02, pw, ph);
  }

  // Bloco de texto: maior tamanho que cabe na zona (busca binária).
  const logo = c.marca30 ? img.get(-30) : c.texto.logo ? img.get(c.texto.logo) : undefined;
  const logoProp = logo ? logo.width / logo.height : 1;
  const l1 = t.l1.trim().toLowerCase(), l3 = t.l3.trim(), dest = t.dest.trim() || "Nome do evento";
  const esquerda = c.id === "patio" && arr === c.largo;
  const medir = (F: number) => {
    const logoW = logo ? (c.marca30 ? F * 2.2 : F * 4.6) : 0;
    const logoH = logo ? logoW / logoProp : 0;
    ctx.font = `${F}px Ralton`;
    const ls = linhas(ctx, dest, zw);
    const largDest = Math.max(...ls.map((x) => ctx.measureText(x).width));
    ctx.font = `${F * 0.42}px Scrib`;
    const larg1 = l1 ? ctx.measureText(l1).width : 0;
    ctx.font = `${F * 0.34}px Scrib`;
    const larg3 = l3 ? ctx.measureText(l3).width : 0;
    const alt = (logo ? logoH + F * 0.18 : 0) + (l1 ? F * 0.42 * 1.05 : 0) + F * 0.06 + ls.length * F * 0.95 + F * 0.1 + (l3 ? F * 0.34 * 1.1 : 0);
    const cabe = alt <= zh && Math.max(logoW, largDest, larg1, larg3) <= zw;
    return { cabe, ls, logoW, logoH, alt };
  };
  let lo = 2, hi = m * 0.6;
  for (let i = 0; i < 22; i++) {
    const F = (lo + hi) / 2;
    if (medir(F).cabe) lo = F;
    else hi = F;
  }
  const F = lo;
  const r = medir(F);
  let y = zy + (zh - r.alt) / 2;
  const xDe = (larg: number) => (esquerda ? zx : zx + (zw - larg) / 2);
  ctx.textBaseline = "alphabetic";
  if (logo) {
    ctx.drawImage(logo, xDe(r.logoW), y, r.logoW, r.logoH);
    y += r.logoH + F * 0.18;
  }
  const escrever = (txt: string, tam: number, fonte: string, cor: string, altura: number) => {
    ctx.font = `${tam}px ${fonte}`;
    ctx.fillStyle = cor;
    ctx.fillText(txt, xDe(ctx.measureText(txt).width), y + tam * 0.8);
    y += altura;
  };
  if (l1) escrever(l1, F * 0.42, "Scrib", c.texto.l1, F * 0.42 * 1.05);
  y += F * 0.06;
  for (const l of r.ls) escrever(l, F, "Ralton", c.texto.dest, F * 0.95);
  y += F * 0.1;
  if (l3) escrever(l3, F * 0.34, "Scrib", c.texto.l3, F * 0.34 * 1.1);
}

/** Resolução do arquivo final: até 100 dpi, limitada ao que o navegador aguenta num canvas. */
export function pixelsPorCm(lCm: number, aCm: number) {
  return Math.min(100 / 2.54, 14000 / Math.max(lCm, aCm), Math.sqrt(110e6 / (lCm * aCm)));
}

/** PDF de uma página no tamanho real (cm), com a imagem JPEG ocupando tudo. */
export async function pdfComJpeg(jpeg: Blob, lCm: number, aCm: number, wPx: number, hPx: number) {
  const dados = new Uint8Array(await jpeg.arrayBuffer());
  const pt = (cm: number) => ((cm / 2.54) * 72).toFixed(2);
  const W = pt(lCm), H = pt(aCm);
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const offsets: number[] = [];
  let tam = 0;
  const add = (p: Uint8Array | string) => {
    const b = typeof p === "string" ? enc.encode(p) : p;
    partes.push(b);
    tam += b.length;
  };
  const obj = (n: number, corpo: string) => {
    offsets[n] = tam;
    add(`${n} 0 obj\n${corpo}\nendobj\n`);
  };
  add("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
  offsets[4] = tam;
  add(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${wPx} /Height ${hPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${dados.length} >>\nstream\n`);
  add(dados);
  add("\nendstream\nendobj\n");
  const conteudo = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(5, `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`);
  const xref = tam;
  add(`xref\n0 6\n0000000000 65535 f \n${[1, 2, 3, 4, 5].map((n) => `${String(offsets[n]).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(partes as BlobPart[], { type: "application/pdf" });
}
