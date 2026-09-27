import type { Segmento } from "@/lib/rematricula-2027";

/**
 * Tabela de consulta da direção (aba "Tabela de valores" da rematrícula).
 * Não vai para o pai.
 *
 * A regra é a mesma todo ano: a rematrícula do ano letivo X acontece em X-1.
 * Quem fecha até o fim de outubro de X-1 leva o livro pelo preço que valia
 * no ano letivo X-1; depois disso, pelo preço de X. O livro sobe ~12% ao ano.
 *
 * Como a direção fala (27/09/2026): "é sempre um ano para frente". Na
 * rematrícula feita em 2026, o livro até o prazo é o "valor de 2025" e depois
 * o "valor de 2027". Por isso a tela rotula o preço da promoção como ano
 * letivo − 2 e o de depois como o próprio ano letivo. As chaves de PRECO_LIVRO
 * abaixo são o ano letivo em que aquele preço é o cheio.
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
    fonte: "Flyer das matrículas 2027 e regras da direção (27/09/2026)",
    observacoes: [
      "Mensalidade cheia (veterano e novato) = teto de 2026 do segmento de 2027 + R$ 50 até 30/10, ou + R$ 60 depois. É a tabela acima.",
      "Troca de segmento: parte do teto do segmento novo (Grupo V → 1º ano: 490; 5º → 6º: 510).",
      "Veterano mantém o desconto que tem hoje: teto − boleto − R$ 20 (a diferença já inclui a Fidelidade), mais o que o Isaac tira no pagamento até o dia 05 além da Fidelidade.",
      "Todos os descontos valem só pagando até o dia 05: Fidelidade − R$ 20, o da família e irmão − R$ 20 (cada irmão). Do dia 06 ao 10: cheia − R$ 10. Depois do dia 10: cheia.",
      "Matrícula: uma mensalidade cheia, sem desconto, em até 5x.",
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
