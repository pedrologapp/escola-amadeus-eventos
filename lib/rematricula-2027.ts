/**
 * Regras da rematrícula 2027 (valores combinados com a direção em 27/09/2026).
 *
 * Veterano: parte do que a família paga HOJE sem o livro (com os descontos
 * que já tem) e soma o reajuste: R$ 50 fechando até 30/10, R$ 60 depois.
 * Mudar de segmento não muda o reajuste; só o livro, que é o da série nova.
 *
 * Livro 2027: fechando até 30/10 fica no preço de 2026; depois, preço de 2027
 * (sobe ~12% ao ano). Novato usa a tabela cheia do flyer.
 *
 * Fidelidade: R$ 20 a menos no mês pagando até o dia 05, em qualquer caso.
 *
 * Para 2028: copiar as tabelas, trocar os valores e as datas.
 */

export type Segmento = "maternal" | "grupo" | "ef1" | "ef2";

export const PRAZO_PROMOCAO = "30 de outubro";
export const PRAZO_PROMOCAO_CURTO = "30/10";
export const DEPOIS_DO_PRAZO = "31 de outubro";
export const REAJUSTE = { promo: 50, depois: 60 };
export const FIDELIDADE = 20;
export const URL_FOLDER = "https://eventos.escolaamadeus.com/folder";

/** Livro por parcela (12x). "promo2025" é o que ficou nos boletos de 2026 de quem fechou até 31/10/2025. */
export const LIVRO: Record<Segmento, { promo2025: number; l2026: number; l2027: number }> = {
  maternal: { promo2025: 66, l2026: 74, l2027: 83 },
  grupo: { promo2025: 72, l2026: 82, l2027: 92 },
  ef1: { promo2025: 127, l2026: 142, l2027: 159 },
  ef2: { promo2025: 145, l2026: 162, l2027: 181 },
};

/** Mensalidade cheia (sem livro) da tabela de 2026 — base para separar o livro do boleto. */
export const TABELA_2026: Record<Segmento, number> = { maternal: 520, grupo: 520, ef1: 490, ef2: 510 };

/** Novato 2027 (flyer das matrículas), sem livro. */
export const NOVATO_2027: Record<Segmento, { promo: number; depois: number }> = {
  maternal: { promo: 570, depois: 580 },
  grupo: { promo: 570, depois: 580 },
  ef1: { promo: 540, depois: 550 },
  ef2: { promo: 560, depois: 570 },
};

/** Séries na ordem pedagógica, com o nome que vai no papel. */
export const SERIES = [
  { nome: "Maternal II", segmento: "maternal" },
  { nome: "Maternal III", segmento: "maternal" },
  { nome: "Grupo IV", segmento: "grupo" },
  { nome: "Grupo V", segmento: "grupo" },
  { nome: "1º Ano", segmento: "ef1" },
  { nome: "2º Ano", segmento: "ef1" },
  { nome: "3º Ano", segmento: "ef1" },
  { nome: "4º Ano", segmento: "ef1" },
  { nome: "5º Ano", segmento: "ef1" },
  { nome: "6º Ano", segmento: "ef2" },
  { nome: "7º Ano", segmento: "ef2" },
  { nome: "8º Ano", segmento: "ef2" },
  { nome: "9º Ano", segmento: "ef2" },
] as const satisfies readonly { nome: string; segmento: Segmento }[];

export type NomeSerie = (typeof SERIES)[number]["nome"];

export const segmentoDe = (serie: string): Segmento | null =>
  SERIES.find((s) => s.nome === serie)?.segmento ?? null;

/** "Maternalzinho(2)", "Mensalidade EI Maternalzinho II", "EF 6º Ano"... → nome canônico. */
export function serieCanonica(texto: string): NomeSerie | null {
  const t = texto.toLowerCase();
  if (/maternalzinho|maternal\s*\(?2|maternal ii\b/.test(t)) return "Maternal II";
  if (/maternal/.test(t)) return "Maternal III";
  if (/grupo\s*(iv|4)\b/.test(t)) return "Grupo IV";
  if (/grupo\s*(v|5)\b/.test(t)) return "Grupo V";
  const m = t.match(/([1-9])º\s*ano/);
  return m ? (`${m[1]}º Ano` as NomeSerie) : null;
}

/** Série de 2027; null para quem sai do 9º ano. */
export function proximaSerie(serie: NomeSerie): NomeSerie | null {
  const i = SERIES.findIndex((s) => s.nome === serie);
  return i >= 0 && i < SERIES.length - 1 ? SERIES[i + 1].nome : null;
}

export interface Condicao {
  mensalidade: number;
  livro: number;
  total: number;
  fidelidade: number; // total pagando até o dia 05
}

export interface Simulacao {
  serie2027: NomeSerie;
  segmento: Segmento;
  promo: Condicao;
  depois: Condicao;
  economiaAno: number; // quanto a família deixa de pagar em 12 meses fechando no prazo
}

/** base = mensalidade de hoje sem o livro (veterano); null = novato. */
export function simular(serie2027: NomeSerie, base: number | null): Simulacao {
  const segmento = segmentoDe(serie2027)!;
  const l = LIVRO[segmento];
  const cond = (mensalidade: number, livro: number): Condicao => ({
    mensalidade,
    livro,
    total: mensalidade + livro,
    fidelidade: mensalidade + livro - FIDELIDADE,
  });
  const promo =
    base === null
      ? cond(NOVATO_2027[segmento].promo, l.l2026)
      : cond(base + REAJUSTE.promo, l.l2026);
  const depois =
    base === null
      ? cond(NOVATO_2027[segmento].depois, l.l2027)
      : cond(base + REAJUSTE.depois, l.l2027);
  return { serie2027, segmento, promo, depois, economiaAno: (depois.total - promo.total) * 12 };
}

export const reais = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "no 1º Ano", "no Grupo V", "no Maternal III" — todas pedem "no". */
export const naSerie = (serie: string) => `no ${serie}`;

/** Primeiro nome, para o texto corrido da carta. */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
