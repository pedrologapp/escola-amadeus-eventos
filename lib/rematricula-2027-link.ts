import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ModoLivro, NomeSerie, TipoCarta } from "@/lib/rematricula-2027";

/**
 * Link assinado da imagem da carta (/api/rematricula/carta). A imagem tem
 * nome de criança e valores, então não pode abrir por URL adivinhável: os
 * dados vão no próprio link, assinados, e o link vence em 7 dias. É o tempo
 * de o WhatsApp baixar a imagem; depois disso ela já está no celular do pai.
 */

export interface DadosCarta {
  nome: string;
  serie: NomeSerie;
  veterano: boolean;
  desconto: number; // desconto da família mantido em 2027 (novato: 0)
  irmao: boolean;
  extra?: number; // desconto especial concedido pela direção (vale também para novato)
  base?: number | null; // mesmo segmento: mensalidade de hoje (a cheia = base + reajuste)
  serieAtual?: string | null; // para explicar a troca de segmento
  modo: ModoLivro;
  tipo?: TipoCarta; // "avista": o ano inteiro com 10% (sem os outros descontos); falta = mensal
  data: string; // "27 de setembro de 2026", como sai no rodapé
}

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

function segredo() {
  const s = process.env.WEBHOOK_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!s) throw new Error("Sem segredo para assinar o link da carta.");
  return s;
}

const assinar = (p: string) => createHmac("sha256", segredo()).update(`carta-2027:${p}`).digest("base64url");

export function linkDaCarta(origem: string, d: DadosCarta): string {
  const p = Buffer.from(JSON.stringify({ ...d, e: Date.now() + VALIDADE_MS })).toString("base64url");
  return `${origem}/api/rematricula/carta?p=${p}&s=${assinar(p)}`;
}

export function lerLinkDaCarta(p: string | null, s: string | null): DadosCarta | null {
  if (!p || !s) return null;
  const esperado = Buffer.from(assinar(p));
  const recebido = Buffer.from(s);
  if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) return null;
  try {
    const d = JSON.parse(Buffer.from(p, "base64url").toString()) as DadosCarta & { e: number };
    return d.e > Date.now() ? d : null;
  } catch {
    return null;
  }
}
