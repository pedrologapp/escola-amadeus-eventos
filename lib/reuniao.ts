/**
 * Preparação da Reunião de Rematrículas.
 *
 * O painel do admin e as server actions leem daqui, então a definição
 * dos status e das categorias vive num lugar só.
 */

export const SLUG_REUNIAO = "rematriculas-2027";

export const CATEGORIAS = ["cronograma", "material"] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const STATUS = ["falta", "fazendo", "pronto", "nao_temos"] as const;
export type Status = (typeof STATUS)[number];

export interface ItemReuniao {
  id: string;
  categoria: Categoria;
  titulo: string;
  detalhe: string | null;
  responsavel: string | null;
  horario: string | null;
  /** Onde o material está salvo: link do Drive, do site, ou caminho no repo. */
  link: string | null;
  status: Status;
  ordem: number;
}

/**
 * "Não temos" é diferente de "falta": marca o que a escola decidiu que
 * não vai existir, pra parar de cobrar. Por isso tem cor neutra, e não
 * de alerta.
 */
export const ROTULO_STATUS: Record<Status, string> = {
  falta: "Falta",
  fazendo: "Fazendo",
  pronto: "Pronto",
  nao_temos: "Não temos",
};

export const CLASSE_STATUS: Record<Status, string> = {
  falta: "bg-red-50 text-red-700 border-red-200",
  fazendo: "bg-amber-50 text-amber-800 border-amber-200",
  pronto: "bg-emerald-50 text-emerald-700 border-emerald-200",
  nao_temos: "bg-muted text-muted-foreground border-border",
};

/** Ordem em que os status aparecem no seletor. */
export const CICLO_STATUS: Status[] = ["falta", "fazendo", "pronto", "nao_temos"];
