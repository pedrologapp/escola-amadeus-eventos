/**
 * Constantes da escola — usadas no admin e no site público.
 * No futuro pode virar uma tabela `config` no Supabase, mas por
 * enquanto é mais simples como hardcoded.
 */

export const SERIES_INFANTIL = [
  "Maternalzinho(2)",
  "Maternal(3)",
  "Grupo IV",
  "Grupo V",
] as const;

export const SERIES_FUNDAMENTAL_1 = [
  "1º Ano",
  "2º Ano",
  "3º Ano",
  "4º Ano",
  "5º Ano",
] as const;

export const SERIES_FUNDAMENTAL_2 = [
  "6º Ano",
  "7º Ano",
  "8º Ano",
  "9º Ano",
] as const;

export const SERIES_DISPONIVEIS = [
  ...SERIES_INFANTIL,
  ...SERIES_FUNDAMENTAL_1,
  ...SERIES_FUNDAMENTAL_2,
] as const;

export const SERIES_GRUPOS = [
  { label: "Educação Infantil", series: SERIES_INFANTIL },
  { label: "Fundamental I", series: SERIES_FUNDAMENTAL_1 },
  { label: "Fundamental II", series: SERIES_FUNDAMENTAL_2 },
] as const;

export const TURMAS_DISPONIVEIS = ["A", "B", "C", "D"] as const;

export const STATUS_LABELS = {
  rascunho: "Rascunho",
  publicado: "Publicado",
  encerrado: "Encerrado",
} as const;
