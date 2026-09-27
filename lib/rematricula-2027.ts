/**
 * Regras da rematrícula 2027 (valores combinados com a direção em 27/09/2026).
 *
 * Mensalidade cheia = teto de 2026 do segmento de 2027 + R$ 50 fechando até
 * 30/10, ou + R$ 60 depois (vale para veterano e novato). O veterano mantém o
 * desconto que já tem (teto − boleto − 20 da Fidelidade, mais o que o Isaac tira no pagamento
 * até o dia 05), e todos os descontos só valem pagando até o dia 05.
 * Regras fechadas com a direção em 27/09/2026 (casos Arthur Mafra e Pedro
 * Gregório).
 *
 * Livro 2027: fechando até 30/10 fica no preço de 2026; depois, preço de 2027
 * (sobe ~12% ao ano). Novato usa a tabela cheia do flyer.
 *
 * Fidelidade (= pontualidade): R$ 20 até o dia 05; do dia 06 ao 10, R$ 10.
 * Irmão: R$ 20 para cada irmão, só quando a direção marca. Matrícula = uma
 * mensalidade cheia, em até 5x.
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

/**
 * WhatsApp (admin → n8n "Rematrícula 2027 · Enviar carta" → WAHA da escola).
 * Vão duas mensagens: primeiro a apresentação da escola com o folder, depois
 * a imagem da carta. Os valores ficam só na imagem, não no texto.
 */
export const WEBHOOK_ENVIO = "https://n8n.escolaamadeus.com/webhook/rematricula-carta";

export const textoApresentacao = (primeiro: string) =>
  `Olá, família de *${primeiro}*! Aqui é o Centro Educacional Amadeus.

Há 30 anos, aqui cada aluno importa. Preparamos um folder digital para vocês conhecerem a escola por dentro: as etapas, o novo material, os projetos, os esportes e os espaços.

Conheça: ${URL_FOLDER}`;

export const legendaCarta = (primeiro: string) => `Os valores de 2027 para ${primeiro}.`;

/** Livro por parcela (12x). "promo2025" é o que ficou nos boletos de 2026 de quem fechou até 31/10/2025. */
export const LIVRO: Record<Segmento, { promo2025: number; l2026: number; l2027: number }> = {
  maternal: { promo2025: 66, l2026: 74, l2027: 83 },
  grupo: { promo2025: 72, l2026: 82, l2027: 92 },
  ef1: { promo2025: 127, l2026: 142, l2027: 159 },
  ef2: { promo2025: 145, l2026: 162, l2027: 181 },
};

/** Mensalidade cheia (sem livro) da tabela de 2026 — base para separar o livro do boleto. */
export const TABELA_2026: Record<Segmento, number> = { maternal: 520, grupo: 520, ef1: 490, ef2: 510 };

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

export const SEGMENTO_NOME: Record<Segmento, string> = {
  maternal: "Educação Infantil",
  grupo: "Educação Infantil",
  ef1: "Ensino Fundamental I",
  ef2: "Ensino Fundamental II",
};

export const segmentoDe =(serie: string): Segmento | null =>
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

/**
 * Uma condição de fechamento (até 30/10 ou depois). A carta mostra nesta
 * ordem: mensalidade cheia, os descontos, e a mensalidade real pagando até
 * o dia 05. Todos os descontos (Fidelidade, o da família, irmão) só valem
 * pagando até o dia 05; do dia 06 ao 10 é a cheia − 10; depois, a cheia.
 */
export interface Condicao {
  cheia: number; // teto do segmento de 2027 + reajuste
  fidelidade: number; // R$ 20
  desconto: number; // o que a família já tem hoje (no boleto + no pagamento)
  irmao: number; // R$ 20 se a direção marcar
  ate05: number; // mensalidade real pagando até o dia 05
  ate10: number;
  livro: number;
  totalAte05: number; // mensalidade real + livro
  totalCheio: number; // cheia + livro (depois do dia 10)
  matricula: number; // = mensalidade cheia
}

export interface Simulacao {
  serie2027: NomeSerie;
  segmento: Segmento;
  promo: Condicao;
  depois: Condicao;
}

export const DESCONTO_IRMAO = 20;
export const ACRESCIMO_DIA_06_A_10 = 10; // do dia 06 ao 10 paga a cheia − 10
export const PARCELAS_MATRICULA = 5;

/**
 * Veterano e novato partem do mesmo teto: o da tabela de 2026 do segmento
 * de 2027 (Grupo V → 1º ano parte de 490; 5º → 6º de 510) + 50 até 30/10 ou
 * + 60 depois. É igual à tabela do novato do flyer (570/580, 540/550, 560/570).
 * O desconto da família (novato: 0) entra só pagando até o dia 05.
 */
export function simular(serie2027: NomeSerie, desconto = 0, irmao = false): Simulacao {
  const segmento = segmentoDe(serie2027)!;
  const l = LIVRO[segmento];
  const cond = (reajuste: number, livro: number): Condicao => {
    const cheia = TABELA_2026[segmento] + reajuste;
    const d = Math.max(0, desconto);
    const i = irmao ? DESCONTO_IRMAO : 0;
    const ate05 = Math.max(0, cheia - FIDELIDADE - d - i);
    return {
      cheia, fidelidade: FIDELIDADE, desconto: d, irmao: i, ate05,
      ate10: cheia - (FIDELIDADE - ACRESCIMO_DIA_06_A_10),
      livro, totalAte05: ate05 + livro, totalCheio: cheia + livro, matricula: cheia,
    };
  };
  return { serie2027, segmento, promo: cond(REAJUSTE.promo, l.l2026), depois: cond(REAJUSTE.depois, l.l2027) };
}

const SEG_CURTO: Record<Segmento, string> = { maternal: "Infantil", grupo: "Infantil", ef1: "Fund. 1", ef2: "Fund. 2" };
const SEG_LONGO: Record<Segmento, string> = { maternal: "Educação Infantil", grupo: "Educação Infantil", ef1: "Ensino Fundamental I", ef2: "Ensino Fundamental II" };

/** Muda de segmento em 2027 (Grupo V → 1º ano, 5º → 6º)? Infantil conta como um segmento só. */
export function trocaDeSegmento(serieAtual: string | null | undefined, serie2027: NomeSerie): boolean {
  const a = serieAtual ? segmentoDe(serieAtual) : null;
  const b = segmentoDe(serie2027);
  if (!a || !b) return false;
  const grupo = (x: Segmento) => (x === "maternal" || x === "grupo" ? "inf" : x);
  return grupo(a) !== grupo(b);
}

/** Para a equipe: de onde sai a mensalidade cheia. */
export function origemDaCheia(serieAtual: string | null | undefined, serie2027: NomeSerie, reajuste: number): string {
  const seg = segmentoDe(serie2027)!;
  const base = `teto do ${SEG_CURTO[seg]} (${reais(TABELA_2026[seg])}) + ${reais(reajuste)}`;
  return trocaDeSegmento(serieAtual, serie2027)
    ? `Troca de segmento (${serieAtual} → ${serie2027}): parte do ${base}.`
    : `Mesmo segmento: ${base}.`;
}

/** Para a carta: frase curta, só quando troca de segmento. */
export const fraseTrocaSegmento = (serie2027: NomeSerie) =>
  `Tabela do novo segmento: ${SEG_LONGO[segmentoDe(serie2027)!]}`;

/** Livro à vista: as 12 parcelas com 10% de desconto (74 → R$ 799,20, 142 → R$ 1.533,60, como no flyer). */
export const livroAVista = (parcela: number) => Math.round(parcela * 12 * 0.9 * 100) / 100;

/**
 * A carta tem três partes: mensalidade (Fidelidade em destaque, a cheia
 * embaixo), livros e total da parcela. "sem" mostra só a primeira.
 */
export type ModoLivro = "com" | "sem";
export const MODOS_LIVRO: { valor: ModoLivro; rotulo: string }[] = [
  { valor: "com", rotulo: "Com o livro" },
  { valor: "sem", rotulo: "Sem o livro" },
];
export const modoLivroValido = (v: unknown): ModoLivro => (v === "sem" ? "sem" : "com");

/** Economia de 12 meses fechando no prazo (pagando até o dia 05), no que a carta mostra. */
export const economiaNoAno = (s: Simulacao, modo: ModoLivro) =>
  (modo === "sem" ? s.depois.ate05 - s.promo.ate05 : s.depois.totalAte05 - s.promo.totalAte05) * 12;

export const reais =(v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** "no 1º Ano", "no Grupo V", "no Maternal III" — todas pedem "no". */
export const naSerie = (serie: string) => `no ${serie}`;

/** Primeiro nome, para o texto corrido da carta. */
export const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
