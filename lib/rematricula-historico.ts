import type { Segmento } from "@/lib/rematricula-2027";

/**
 * Tabela de consulta da direção (aba "Tabela de valores" da rematrícula).
 * Não vai para o pai.
 *
 * A regra é a mesma todo ano: a rematrícula do ano letivo X acontece em X-1.
 * Quem fecha até o fim de outubro de X-1 leva o livro pelo preço de X-1
 * (o "ano presente"); depois disso, pelo preço de X. O livro sobe ~12% ao ano.
 *
 * De onde saiu cada número (conferido em 27/09/2026):
 * - 2026 e 2027: flyers da escola (docs/EventoRematricula).
 * - 2024 e 2025: boletos do Activesoft dos alunos ativos. Ex.: em 2025 o
 *   Fund. 1 aparece como 450 sem livro, 577 = 450 + 127 e 565,50 = 450 +
 *   115,50; o Fund. 2 como 470, 615 = 470 + 145 e 602 = 470 + 132. Em 2024
 *   o livro era cobrado à parte (1.386 = 12 × 115,50 no Fund. 1).
 */

/** Livro por parcela (12x), pelo preço de cada ano. */
export const PRECO_LIVRO: Record<number, Record<Segmento, number>> = {
  2024: { maternal: 60, grupo: 66, ef1: 115.5, ef2: 132 },
  2025: { maternal: 66, grupo: 72, ef1: 127, ef2: 145 },
  2026: { maternal: 74, grupo: 82, ef1: 142, ef2: 162 },
  2027: { maternal: 83, grupo: 92, ef1: 159, ef2: 181 },
};

export interface AnoLetivo {
  ano: number;
  /** Último dia da promoção do livro (rematrícula feita até esse dia). */
  prazo: string | null;
  prazoIso: string | null;
  /** Mensalidade de tabela sem o livro (para 2027, a do novato depois do prazo). */
  mensalidade: Record<Segmento, number>;
  /** 2027: novato fechando até o prazo. */
  mensalidadeNoPrazo?: Record<Segmento, number>;
  livroNaMensalidade: boolean;
  material?: Record<"infantil" | "ef1" | "ef2", number>;
  fidelidade?: number;
  fonte: string;
  observacoes: string[];
}

export const ANOS_LETIVOS: AnoLetivo[] = [
  {
    ano: 2027,
    prazo: "30/10/2026",
    prazoIso: "2026-10-30",
    mensalidade: { maternal: 580, grupo: 580, ef1: 550, ef2: 570 },
    mensalidadeNoPrazo: { maternal: 570, grupo: 570, ef1: 540, ef2: 560 },
    livroNaMensalidade: true,
    fidelidade: 20,
    fonte: "Flyer das matrículas 2027",
    observacoes: [
      "Veterano: o que paga hoje sem o livro + R$ 50 até 30/10, ou + R$ 60 depois. Os descontos que já tem continuam.",
      "Novato: a tabela acima (a primeira coluna é fechando até 30/10).",
      "Quem muda de segmento (Grupo V → 1º ano, 5º → 6º) tem o mesmo reajuste; só o livro muda para o da série nova.",
      "Mensalidade Fidelidade: R$ 20 a menos em cada mês pago até o dia 05.",
      "Livro à vista: 12 parcelas com 10% de desconto.",
    ],
  },
  {
    ano: 2026,
    prazo: "31/10/2025",
    prazoIso: "2025-10-31",
    mensalidade: { maternal: 520, grupo: 520, ef1: 490, ef2: 510 },
    livroNaMensalidade: true,
    material: { infantil: 320, ef1: 60, ef2: 50 },
    fonte: "Flyers de 2026 (antes e depois da promoção)",
    observacoes: [
      "A mensalidade de tabela foi a mesma antes e depois do prazo; a promoção era só no livro.",
      "Nos boletos, 632 no Fund. 1 = 490 + 142 (livro 2026) e 617 = 490 + 127 (livro 2025, promoção).",
    ],
  },
  {
    ano: 2025,
    prazo: "31/10/2024",
    prazoIso: "2024-10-31",
    mensalidade: { maternal: 480, grupo: 480, ef1: 450, ef2: 470 },
    livroNaMensalidade: true,
    fonte: "Boletos do Activesoft (deduzido)",
    observacoes: [
      "Nos boletos: Fund. 1 577 = 450 + 127 e 565,50 = 450 + 115,50; Fund. 2 615 = 470 + 145 e 602 = 470 + 132.",
      "Data da promoção não confirmada: usei 31/10/2024, como no ano seguinte.",
    ],
  },
  {
    ano: 2024,
    prazo: null,
    prazoIso: null,
    mensalidade: { maternal: 440, grupo: 440, ef1: 410, ef2: 430 },
    livroNaMensalidade: false,
    fonte: "Boletos do Activesoft (deduzido)",
    observacoes: [
      "Em 2024 o livro era cobrado à parte, não dentro da mensalidade (ex.: 12 × 115,50 = R$ 1.386 no Fund. 1).",
      "O preço do livro de 2023 (promoção de 2024) não aparece nos boletos.",
    ],
  },
];

export const NOME_SEGMENTO_CURTO: Record<Segmento, string> = {
  maternal: "Maternal II e III",
  grupo: "Grupo IV e V",
  ef1: "Fund. 1 (1º ao 5º)",
  ef2: "Fund. 2 (6º ao 9º)",
};

export const ORDEM_SEGMENTOS: Segmento[] = ["maternal", "grupo", "ef1", "ef2"];

export const anoLetivo = (ano: number) => ANOS_LETIVOS.find((a) => a.ano === ano) ?? null;
