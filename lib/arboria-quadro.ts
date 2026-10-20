/**
 * Arboria · Fase Linguística, semana 3: "Qual é o quadro?" (19/10/2026).
 * Continua a aula "Descrever como um pintor" (semana 2: cor exata, cada coisa no lugar, o sentimento).
 * Rodada 1: 4 quadros bem diferentes. Rodada 2: 8 quadros muito parecidos (o atalho deixa de funcionar).
 * Rodada 3: 8 retratos da mesma moça, só a expressão muda, e não vale falar de cor: é preciso dizer o que o rosto diz.
 * Rodadas 1 e 2: domínio público (Wikimedia Commons). Rodada 3: retratos feitos para a aula (IA, 20/10/2026).
 * Tudo em public/arboria/quadros.
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

// rodada 3: a mesma moça, a mesma luz e as mesmas cores; muda só o que o rosto diz
const RETRATOS: Quadro[] = [
  q("r0", "Retrato: calma, olhando para nós", "Retrato feito para a aula", 678, 900),
  q("r1", "Retrato: um sorriso quase escondido", "Retrato feito para a aula", 678, 900),
  q("r2", "Retrato: olhar de lado, desconfiado", "Retrato feito para a aula", 678, 900),
  q("r3", "Retrato: uma sobrancelha erguida, duvidando", "Retrato feito para a aula", 678, 900),
  q("r4", "Retrato: segurando o choro", "Retrato feito para a aula", 678, 900),
  q("r5", "Retrato: prestes a dizer alguma coisa", "Retrato feito para a aula", 678, 900),
  q("r6", "Retrato: olhando para baixo, pensativa", "Retrato feito para a aula", 678, 900),
  q("r7", "Retrato: testa franzida, decidida", "Retrato feito para a aula", 678, 900),
];

/** Turmas do F2 como estão no cadastro (tabela alunos: serie + turma). */
export const TURMAS = ["6º A", "6º B", "7º A", "7º B", "8º A", "9º A"] as const;
export type Turma = (typeof TURMAS)[number];
export type Fase = "entrada" | "r1" | "r1f" | "r2" | "r2f" | "r3" | "r3f" | "final"; // rNf = rodada N encerrada (a TV mostra as estatísticas)
export type Rodada = 1 | 2 | 3;
/** "6º A" → { serie: "6º Ano", turma: "A" } */
export const daTurma = (t: string) => ({ serie: `${t.split(" ")[0]} Ano`, turma: t.split(" ")[1] ?? "A" });

export const quadrosDaRodada = (rodada: Rodada, turma: string): Quadro[] =>
  rodada === 1 ? RODADA1 : rodada === 3 ? RETRATOS : turma.startsWith("8") || turma.startsWith("9") ? HAMMERSHOI : MONET;

export const TODOS: Record<string, Quadro> = Object.fromEntries([...RODADA1, ...MONET, ...HAMMERSHOI, ...RETRATOS].map((x) => [x.id, x]));
export const imagem = (id: string) => `/arboria/quadros/${id}.jpg`;

/** Versões por descrição nas rodadas 2 e 3: a 1ª e uma reescrita (Pedro, 20/10: só até a 2ª tentativa). */
export const MAX_VERSOES = 2;

/** Rodada 3: as cores são iguais nos 8 retratos, então não valem (obriga a descrever a expressão). */
const CORES = /(^|[^a-zà-ú])(amarel|azul|azuis|verde|vermelh|roxo|roxa|rosa|laranja|marrom|marrons|pret[oa]|branc|cinza|bege|dourad|lil[aá]s|castanh|escur|clar[oa])/i;
export const corProibida = (texto: string) => texto.match(CORES)?.[2] ?? null;

/** O quadro secreto de cada aluno na rodada: sorteio fixo pelo id (recarregar o tablet não troca). */
export function quadroSecreto(aluno: string, rodada: Rodada, turma: string): string {
  const lista = quadrosDaRodada(rodada, turma);
  let h = 2166136261;
  for (const c of `${aluno}:${rodada}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return lista[(h >>> 0) % lista.length].id;
}
