/**
 * Moldura para stories (29/09/2026), no estilo Caderno ilustrado: fundo (folha
 * ou cor), logo e título no alto, uma janela no meio para a foto (transparente
 * na moldura, ou já com a foto da pessoa), adesivos com desenhos nos cantos e
 * a data numa etiqueta embaixo. Tamanho do story: 1080 × 1920.
 */

import { rng } from "@/lib/painel-icones";
import { fita, fundoPorId, margemEFuros, pintarFundo, solto, textoCaderno, type TextosCaderno } from "@/lib/painel-caderno";

export const STORY = { w: 1080, h: 1920 };

export interface OpcoesMoldura {
  textos: TextosCaderno; // l1 = linha de cima, dest = título, l3 = etiqueta embaixo
  fundo: string;
  icones: string[];
  logo?: HTMLImageElement;
  foto?: HTMLImageElement; // sem foto, a janela fica transparente
}

/** Janela da foto (em px do story). */
export const JANELA = { x: 110, y: 520, w: 860, h: 1000 };

export function desenharMoldura(ctx: CanvasRenderingContext2D, W: number, H: number, o: OpcoesMoldura) {
  const k = W / STORY.w; // escala (prévia menor)
  const f = fundoPorId(o.fundo);
  const R = rng(o.icones.join("").length * 31 + 7);
  const m = W;
  ctx.clearRect(0, 0, W, H);
  pintarFundo(ctx, f, W, H, m, R);
  const margem = f.papel ? 70 * k : 0;
  if (f.papel) margemEFuros(ctx, W, H, m * 0.55, margem);

  // título no alto
  textoCaderno(ctx, { x: margem + 70 * k, y: 60 * k, w: W - margem - 140 * k, h: 350 * k }, { ...o.textos, l3: "" }, f, o.logo, 170 * k);

  // moldura branca da foto (polaroid) com sombra e fitas
  const j = { x: JANELA.x * k, y: JANELA.y * k, w: JANELA.w * k, h: JANELA.h * k };
  const borda = 26 * k;
  ctx.save();
  ctx.shadowColor = "rgba(8,48,120,.22)";
  ctx.shadowBlur = 30 * k;
  ctx.shadowOffsetY = 10 * k;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(j.x - borda, j.y - borda, j.w + borda * 2, j.h + borda * 2 + 70 * k);
  ctx.restore();

  if (o.foto) {
    // foto preenchendo a janela (corta o que sobrar)
    const esc = Math.max(j.w / o.foto.width, j.h / o.foto.height);
    const fw = o.foto.width * esc, fh = o.foto.height * esc;
    ctx.save();
    ctx.beginPath();
    ctx.rect(j.x, j.y, j.w, j.h);
    ctx.clip();
    ctx.drawImage(o.foto, j.x + (j.w - fw) / 2, j.y + (j.h - fh) / 2, fw, fh);
    ctx.restore();
  } else {
    // miolo transparente: é aqui que a foto entra
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillRect(j.x, j.y, j.w, j.h);
    ctx.restore();
  }
  fita(ctx, j.x + 30 * k, j.y - borda + 6 * k, 150 * k, -0.35, "rgba(255,192,64,.9)");
  fita(ctx, j.x + j.w - 30 * k, j.y - borda + 6 * k, 150 * k, 0.35, "rgba(127,178,230,.9)");

  // adesivos com desenhos: dois grandes nos cantos da foto, os outros embaixo
  const [a, b, ...resto] = o.icones;
  if (a) solto(ctx, j.x + j.w - 10 * k, j.y + j.h * 0.2, 190 * k, a, R, true);
  if (b) solto(ctx, j.x + 20 * k, j.y + j.h - 30 * k, 170 * k, b, R, true);

  // etiqueta com a data embaixo, à esquerda
  const etiqueta = o.textos.l3.trim().toUpperCase();
  const yBase = j.y + j.h + borda + 70 * k + 90 * k;
  if (etiqueta) {
    const tam = 46 * k;
    ctx.save();
    ctx.font = `800 ${tam}px "PainelDM"`;
    ctx.letterSpacing = `${tam * 0.12}px`;
    let txt = etiqueta;
    while (ctx.measureText(txt).width > W * 0.62 && txt.length > 4) txt = txt.slice(0, -2);
    const w = ctx.measureText(txt).width + tam * 1.4;
    ctx.translate(margem + 90 * k + w / 2, yBase);
    ctx.rotate(-0.04);
    ctx.fillStyle = "#FFB000";
    ctx.beginPath();
    ctx.roundRect(-w / 2, -tam * 1.05, w, tam * 2.1, tam * 0.3);
    ctx.fill();
    ctx.fillStyle = "#083078";
    ctx.fillText(txt, -w / 2 + tam * 0.7, tam * 0.36);
    ctx.restore();
  }
  resto.slice(0, 2).forEach((ic, i) => solto(ctx, W - (170 + i * 190) * k, yBase + (i % 2 ? 30 : -10) * k, 130 * k, ic, R, !f.papel));
}
