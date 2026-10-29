/**
 * Matrícula à vista (29/10/2026, pedido do Pedro): a família paga o ano inteiro direto à escola (Pix ou cartão da maquininha), sem passar
 * pelo Isaac/Asaas. Os valores são os do encarte à vista da rematrícula 2027 (lib/rematricula-2027: condicaoAVista): matrícula + 11
 * mensalidades pela mensalidade cheia, com 10% de desconto; o livro à vista também com 10%. A direção pode dar um desconto a mais (R$).
 * Fica gravado em cobrancas_avulsas (tipo 'matricula_avista', já pago) com este detalhe em `detalhes`; daí sai o comprovante.
 */

import { condicaoAVista, simular, type NomeSerie } from "@/lib/rematricula-2027";

export type CondicaoPrazo = "promo" | "depois"; // fechando até 28/10 ou depois
export type FormaAVista = "pix" | "cartao" | "misto"; // tudo no Pix, tudo no cartão, parte em cada

export interface EntradaAVista {
  serie2027: NomeSerie;
  base: number | null; // veterano no mesmo segmento: a mensalidade de hoje sem o livro (a cheia = base + reajuste); novato/troca: null
  prazo: CondicaoPrazo;
  livro: boolean;
  extra: number; // desconto a mais da direção, em R$ no total
}

export interface ValoresAVista {
  mensalidade: number; // a cheia de 2027
  ano: number; // 12 × cheia
  desconto: number; // 10% do ano
  anoAVista: number;
  livro12x: number;
  livro: number; // 0 sem o livro
  extra: number;
  total: number;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

export function valoresAVista(e: EntradaAVista): ValoresAVista {
  const sim = simular(e.serie2027, 0, false, e.base, 0);
  const v = condicaoAVista(e.prazo === "promo" ? sim.promo : sim.depois);
  const livro = e.livro ? v.livro : 0;
  const extra = Math.max(0, e.extra);
  return {
    mensalidade: v.mensalidade, ano: v.ano, desconto: v.desconto, anoAVista: v.semLivro,
    livro12x: e.livro ? v.livro12x : 0, livro, extra, total: centavos(Math.max(0, v.semLivro + livro - extra)),
  };
}

/** O que fica salvo em cobrancas_avulsas.detalhes (e o que o comprovante mostra). */
export interface DetalhesAVista extends ValoresAVista {
  serie2027: NomeSerie;
  novato: boolean;
  activesoftId: number | null;
  prazo: CondicaoPrazo;
  forma: FormaAVista;
  parcelas: number; // no cartão
  valorPix: number; // no misto: quanto foi no Pix (o resto no cartão)
  dataPagamento: string; // AAAA-MM-DD
  observacao?: string;
}

export const rotuloForma = (d: Pick<DetalhesAVista, "forma" | "parcelas" | "valorPix" | "total">, reais: (v: number) => string) =>
  d.forma === "pix"
    ? "Pix (valor total)"
    : d.forma === "cartao"
      ? `Cartão de crédito em ${d.parcelas}x`
      : `${reais(d.valorPix)} no Pix + ${reais(Math.max(0, d.total - d.valorPix))} no cartão em ${d.parcelas}x`;
