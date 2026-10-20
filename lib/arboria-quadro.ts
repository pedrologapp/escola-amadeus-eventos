/**
 * Arboria · Fase Linguística, semana 3: "Qual é o quadro?" (19/10/2026).
 * Continua a aula "Descrever como um pintor" (semana 2: cor exata, cada coisa no lugar, o sentimento).
 * Rodada 1: 4 quadros bem diferentes. Rodada 2: 8 quadros muito parecidos (o atalho deixa de funcionar).
 * Todos de domínio público (Wikimedia Commons), em public/arboria/quadros.
 */

export interface Quadro {
  id: string;
  titulo: string;
  autor: string;
  w: number;
  h: number;
}

const q = (id: string, titulo: string, autor: string, w: number, h: number): Quadro => ({ id, titulo, autor, w, h });

export const RODADA1: Quadro[] = [
  q("f1", "A Noite Estrelada", "Vincent van Gogh, 1889", 900, 713),
  q("f2", "A Grande Onda de Kanagawa", "Katsushika Hokusai, c. 1831", 900, 605),
  q("f3", "Moça com Brinco de Pérola", "Johannes Vermeer, c. 1665", 760, 900),
  q("f4", "Caçadores na Neve", "Pieter Bruegel, 1565", 900, 641),
];

// 6º e 7º: oito montes de feno do Monet (mudam a luz, a estação, a hora e quantos montes há)
const MONET: Quadro[] = [
  q("m1", "Montes de feno, pôr do sol na neve", "Claude Monet, 1890–91", 900, 586),
  q("m2", "Monte de feno, neve em dia nublado", "Claude Monet, 1890–91", 900, 646),
  q("m3", "Monte de feno, degelo ao pôr do sol", "Claude Monet, 1890–91", 900, 624),
  q("m4", "Monte de feno, sol na névoa", "Claude Monet, 1891", 900, 538),
  q("m5", "Montes de feno ao sol forte", "Claude Monet, 1890", 900, 544),
  q("m7", "Montes de feno, geada branca", "Claude Monet, 1889", 900, 636),
  q("m8", "Monte de feno, neve pela manhã", "Claude Monet, 1891", 900, 635),
  q("m9", "Monte de feno ao sol da tarde", "Claude Monet, 1891", 900, 662),
];

// 8º e 9º: oito salas do Hammershøi (o mesmo silêncio, portas, janelas e uma mulher de costas)
const HAMMERSHOI: Quadro[] = [
  q("h1", "Interior, Strandgade 30", "Vilhelm Hammershøi, 1900", 771, 900),
  q("h2", "Interior com cadeira Windsor", "Vilhelm Hammershøi, 1913", 671, 900),
  q("h3", "Interior ensolarado", "Vilhelm Hammershøi", 675, 900),
  q("h4", "Interior, sol no chão", "Vilhelm Hammershøi, 1906", 766, 900),
  q("h5", "Interior com Ida ao piano", "Vilhelm Hammershøi", 720, 900),
  q("h6", "Interior com mulher de costas", "Vilhelm Hammershøi, 1903–04", 752, 900),
  q("h7", "Interior com Ida numa cadeira branca", "Vilhelm Hammershøi", 761, 900),
  q("h12", "Interior com o cavalete do artista", "Vilhelm Hammershøi", 731, 900),
];

export const TURMAS = ["6º", "7º", "8º", "9º"] as const;
export type Turma = (typeof TURMAS)[number];
export type Fase = "entrada" | "r1" | "r2" | "final";

export const quadrosDaRodada = (rodada: 1 | 2, turma: string): Quadro[] =>
  rodada === 1 ? RODADA1 : turma === "8º" || turma === "9º" ? HAMMERSHOI : MONET;

export const TODOS: Record<string, Quadro> = Object.fromEntries([...RODADA1, ...MONET, ...HAMMERSHOI].map((x) => [x.id, x]));
export const imagem = (id: string) => `/arboria/quadros/${id}.jpg`;

/** Versões por descrição na rodada 2 (a 1ª e mais duas reescritas). */
export const MAX_VERSOES = 3;

/** O quadro secreto de cada aluno na rodada: sorteio fixo pelo id (recarregar o tablet não troca). */
export function quadroSecreto(aluno: string, rodada: 1 | 2, turma: string): string {
  const lista = quadrosDaRodada(rodada, turma);
  let h = 2166136261;
  for (const c of `${aluno}:${rodada}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return lista[(h >>> 0) % lista.length].id;
}
