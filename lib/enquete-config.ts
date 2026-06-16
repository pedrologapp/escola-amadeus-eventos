// =============================================================
// Configuração da Enquete de Clima Escolar
// =============================================================
// Tudo que define a enquete fica aqui — fácil de editar (trocar professor,
// adicionar disciplina, mudar texto). O formulário e o painel leem daqui.

export const ENQUETE_SLUG = "clima-2026";

/** Escala única (4 níveis) usada em todas as perguntas fechadas. */
export const ESCALA = [
  { valor: "sempre", label: "Sempre", emoji: "😄" },
  { valor: "quase", label: "Quase sempre", emoji: "🙂" },
  { valor: "poucas", label: "Poucas vezes", emoji: "😕" },
  { valor: "nunca", label: "Nunca", emoji: "😞" },
] as const;

export type ValorEscala = (typeof ESCALA)[number]["valor"];

/** Score 0–100 por nível (para média e % favorável). */
export const SCORE: Record<ValorEscala, number> = {
  sempre: 100,
  quase: 67,
  poucas: 33,
  nunca: 0,
};

/** "Favorável" = dois melhores níveis (top-2-box). */
export function ehFavoravel(valor: ValorEscala, invertida = false): boolean {
  const fav = valor === "sempre" || valor === "quase";
  return invertida ? !fav : fav;
}

/** Score considerando itens invertidos (onde "Sempre" é ruim). */
export function scoreDe(valor: ValorEscala, invertida = false): number {
  return invertida ? 100 - SCORE[valor] : SCORE[valor];
}

// ---------------- Parte 1 — Disciplinas ----------------

export const DISCIPLINAS = [
  { id: "portugues", nome: "Português", professor: "Profa. Julianneide" },
  { id: "matematica", nome: "Matemática", professor: "Profa. Jéssica" },
  { id: "historia", nome: "História", professor: "Prof. Francinildo" },
  { id: "robotica", nome: "Robótica / Nave à Vela", professor: "Prof. Jonathan" },
  { id: "ciencias", nome: "Ciências", professor: "Prof. José Eduardo" },
  { id: "artes", nome: "Artes", professor: "Profa. Ceni" },
  { id: "edfisica", nome: "Educação Física", professor: "Profa. Jany" },
  { id: "coreografia", nome: "Coreografia", professor: "Prof. Ailton" },
] as const;

/** Itens fechados feitos para cada disciplina. */
export const ITENS_DISCIPLINA = [
  { id: "clareza", texto: "O(A) professor(a) explica de um jeito que eu consigo entender." },
  { id: "respeito", texto: "O(A) professor(a) me trata com respeito." },
] as const;

// ---------------- Parte 2 — Clima ----------------

export interface PerguntaClima {
  id: string;
  texto: string;
  invertida?: boolean;
  /** Se preenchido, forma um par de coerência com a pergunta de id citado. */
  coerenciaCom?: string;
}

export interface SecaoClima {
  id: string;
  titulo: string;
  perguntas: PerguntaClima[];
}

export const SECOES_CLIMA: SecaoClima[] = [
  {
    id: "sentir",
    titulo: "Como eu me sinto na escola",
    perguntas: [
      { id: "ajuda_prof", texto: "Quando preciso de ajuda, os professores me ajudam." },
      { id: "seguro", texto: "Eu me sinto seguro(a) na escola." },
      { id: "acolhido", texto: "Eu me sinto bem e acolhido(a) nesta escola." },
      { id: "colegas", texto: "Eu tenho colegas com quem posso contar." },
      { id: "bem_estar", texto: "Na maioria dos dias, venho pra escola me sentindo bem." },
    ],
  },
  {
    id: "convivencia",
    titulo: "Convivência e respeito",
    perguntas: [
      {
        id: "bullying",
        texto: "Tem colegas que xingam, ameaçam, excluem ou batem em outros.",
        invertida: true,
      },
      { id: "adulto_ajuda", texto: "Se alguém me trata mal, sei que um adulto da escola vai me ajudar." },
      { id: "respeito_todos", texto: "Aqui todos são respeitados do jeito que são." },
      {
        // Par de coerência com "acolhido" (mesma ideia, sinal invertido).
        id: "sozinho",
        texto: "Na escola, eu me sinto sozinho(a) e por fora.",
        invertida: true,
        coerenciaCom: "acolhido",
      },
    ],
  },
  {
    id: "regras",
    titulo: "Regras, voz e motivação",
    perguntas: [
      { id: "regras_justas", texto: "As regras são claras e valem igual pra todos." },
      { id: "escuta", texto: "Quando dou uma ideia ou reclamo, a escola me escuta." },
      { id: "motivacao", texto: "As aulas me dão vontade de aprender." },
    ],
  },
  {
    id: "estrutura",
    titulo: "A escola (estrutura)",
    perguntas: [
      { id: "salas", texto: "As salas e a estrutura da escola são boas para estudar." },
      { id: "limpeza", texto: "A escola é limpa e os banheiros estão em boas condições." },
      { id: "cantina", texto: "A comida da cantina é boa." },
      { id: "coordenacao", texto: "A coordenação e a direção tratam os alunos com respeito e ajudam." },
      { id: "comunicacao", texto: "A escola comunica bem os avisos e informações." },
    ],
  },
];

/** Perguntas-âncora (satisfação geral), no fechamento. */
export const ANCORAS: PerguntaClima[] = [
  { id: "gosto_geral", texto: "De modo geral, eu gosto de estudar nesta escola." },
  { id: "recomendaria", texto: "Eu recomendaria esta escola para um amigo ou amiga." },
];

/** Perguntas abertas (opcionais). */
export const ABERTAS = [
  { id: "mais_gosta", texto: "O que você MAIS gosta na escola?" },
  { id: "mudaria", texto: "Se você pudesse mudar UMA coisa na escola, o que seria?" },
] as const;

/** Todas as perguntas fechadas de clima (seções + âncoras), em ordem. */
export const TODAS_CLIMA: PerguntaClima[] = [
  ...SECOES_CLIMA.flatMap((s) => s.perguntas),
  ...ANCORAS,
];

/** Mensagem de apoio exibida no fim. */
export const AVISO_APOIO =
  "Se você está passando por algo difícil, procure a coordenação ou a orientação da escola. Você também pode ligar 188 (CVV), de graça e em sigilo, a qualquer hora.";
