import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Placa de formatura 2026 (Grupo V A e B). A direção abre um link secreto (/formatura-2026/<chave>),
 * completa oradora, juramentista e professoras, sobe a foto da turma e escolhe entre as opções de foto
 * que o fotógrafo especialista deixou. A chave sai do segredo do servidor (o código é público no GitHub).
 */
export const BUCKET_PLACA = "formatura-placas";
export const ID_PLACA = "g5-2026";
export const TURMAS = ["Grupo V · A", "Grupo V · B"] as const;
export type Turma = (typeof TURMAS)[number];

export function chavePlaca(): string {
  const s = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!s) throw new Error("WEBHOOK_CONFIRM_SECRET não está configurada.");
  return createHmac("sha256", s).update("formatura-placa-2026").digest("base64url").slice(0, 16);
}

export function chavePlacaValida(chave: string | null | undefined): boolean {
  if (!chave) return false;
  const a = Buffer.from(chavePlaca()), b = Buffer.from(chave);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** O que a direção preenche (uma vez, vale para todas as placas da turma). */
export interface DadosPlaca {
  oradora?: string;
  juramentista?: string;
  professora_a?: string;
  professora_b?: string;
  auxiliar_a?: string; // auxiliar de cada turma (vai embaixo da professora)
  auxiliar_b?: string;
  demais?: string;
  foto_turma_a?: string; // caminho no storage
  foto_turma_b?: string;
  sugestoes_turma_a?: string[]; // fotos de turma sugeridas pelo fotógrafo (caminhos no storage)
  sugestoes_turma_b?: string[];
  turma_a_aprovada?: boolean;
  turma_b_aprovada?: boolean;
  lista_turma_a?: string[]; // todos os alunos da turma (vão na lista da placa, mesmo quem não tem placa)
  lista_turma_b?: string[];
  // textos da placa que a direção pode reescrever (vazio = o texto padrão do molde)
  titulo_mensagem?: string;
  dedicatoria?: string;
  diretora?: string;
  coordenadora?: string;
  // ajustes feitos à mão (tamanho e posição de cada bloco de texto), sempre dentro da regra de não sair da placa
  ajustes?: Ajustes; // valem para todas as placas
  ajustes_aluno?: Record<string, Ajustes>; // só daquela criança (somam com os de todas)
  nomes_placa?: Record<string, string>; // nome da criança como aparece na placa, quando a direção reescreve
  // corte das fotos (aproximar e escolher a parte que aparece); volta ao normal quando a foto é trocada
  cortes_aluno?: Record<string, Partial<Record<"beca" | "familia", Corte>>>;
  cortes_turma?: Partial<Record<"a" | "b", Corte>>;
}

/** Corte de uma foto: z = passos de aproximação (10% cada, 0 a 20); x/y = deslocamento em % da moldura. */
export type Corte = { z: number; x: number; y: number };
export const FOTOS_CORTE = ["beca", "familia", "turma"] as const;
export type FotoCorte = (typeof FOTOS_CORTE)[number];
export const fotoCorteValida = (f: string): f is FotoCorte => (FOTOS_CORTE as readonly string[]).includes(f);
/** Quanto a foto pode andar sem aparecer a borda, para uma aproximação z. */
export const folgaCorte = (z: number) => { const s = 1 + 0.1 * z; return (50 * (s - 1)) / s; };

/** Blocos de texto da placa que podem ser ajustados. t = passos de tamanho (6% cada), x/y = deslocamento em px da placa (2400 de largura). */
export const BLOCOS_PLACA = ["mensagem", "equipe", "turma", "lista", "prof", "nome"] as const;
export type BlocoPlaca = (typeof BLOCOS_PLACA)[number];
export type Ajuste = { t: number; x: number; y: number };
export type Ajustes = Partial<Record<BlocoPlaca, Ajuste>>;
export const blocoValido = (b: string): b is BlocoPlaca => (BLOCOS_PLACA as readonly string[]).includes(b);

const CAMPOS_TEXTO = ["oradora", "juramentista", "professora_a", "professora_b", "auxiliar_a", "auxiliar_b", "demais", "titulo_mensagem", "dedicatoria", "diretora", "coordenadora"] as const;
export type CampoTexto = (typeof CAMPOS_TEXTO)[number];
export const campoTextoValido = (c: string): c is CampoTexto => (CAMPOS_TEXTO as readonly string[]).includes(c);
