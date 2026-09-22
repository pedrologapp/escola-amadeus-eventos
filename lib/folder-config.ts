/**
 * Conteúdo do folder digital (rota /folder).
 *
 * O folder é GERAL: não pede nome de aluno, porque também atende família nova.
 * A única personalização é a etapa, escolhida pelo próprio pai.
 *
 * Tudo que ainda não temos fica como `null` e a tela mostra um espaço
 * reservado. Nada de texto inventado aqui: o que falta, falta à vista.
 */

export type SegmentoId = "infantil" | "f1" | "f2";

export interface Segmento {
  id: SegmentoId;
  nome: string;
  curto: string;
  idade: string;
  series: string | null;
  /** URL do vídeo do segmento. Null enquanto não estiver gravado. */
  video: string | null;
  duracao: string | null;
}

export const SEGMENTOS: Segmento[] = [
  {
    id: "infantil",
    nome: "Educação Infantil",
    curto: "Infantil",
    idade: "2 a 5 anos",
    series: null,
    video: null,
    duracao: null,
  },
  {
    id: "f1",
    nome: "Fundamental 1",
    curto: "Fund. 1",
    idade: "6 a 10 anos",
    series: "do 1º ao 5º ano",
    video: null,
    duracao: null,
  },
  {
    id: "f2",
    nome: "Fundamental 2",
    curto: "Fund. 2",
    idade: "11 a 14 anos",
    series: "do 6º ao 9º ano",
    video: null,
    duracao: null,
  },
];

export function acharSegmento(id: SegmentoId): Segmento {
  const s = SEGMENTOS.find((x) => x.id === id);
  if (!s) throw new Error(`Segmento desconhecido: ${id}`);
  return s;
}

/** Item que abre ao toque. `resumo` null = ainda esperando o texto do Pedro. */
export interface Item {
  nome: string;
  resumo: string | null;
  /** Etapa a que se destina, quando não for da escola toda. */
  nota?: string;
}

export const PROGRAMAS: Item[] = [
  { nome: "Projeto Arbória", resumo: null },
  { nome: "Socioemocional", resumo: null },
  { nome: "Robótica", resumo: null },
  { nome: "Educação Financeira", resumo: null },
  { nome: "Bilíngue", resumo: null },
  { nome: "Inglês", resumo: null },
];

export const ESPORTES: Item[] = [
  { nome: "Karatê", resumo: null },
  { nome: "Futsal", resumo: null },
  { nome: "Vôlei", resumo: null },
];

/** O auditório abre a seção, com mais peso que os outros. */
export const ESPACOS: Item[] = [
  { nome: "Auditório", resumo: null },
  { nome: "Quadra", resumo: null },
  { nome: "Parquinho", resumo: null },
  { nome: "Espaço do lanchinho", resumo: null, nota: "Educação Infantil" },
  { nome: "Sala invertida", resumo: null, nota: "Fundamental 2" },
];

/**
 * Os cartões da aba "O Livro", que o pai arrasta pro lado.
 * O conteúdo é o mesmo da página /geekie, trazido pra cá pra ele não
 * precisar sair do folder.
 */
export interface CartaoLivro {
  etiqueta: string;
  titulo: string;
  pontos: string[];
  nota?: string;
}

export const CARTOES_LIVRO: CartaoLivro[] = [
  {
    etiqueta: "O que é",
    titulo: "Metade impressa, metade digital",
    pontos: [
      "O livro continua na mochila. É nele que ele escreve, resolve e registra o que aprendeu.",
      "E uma plataforma que conversa com o livro e faz o que o papel sozinho não consegue.",
    ],
  },
  {
    etiqueta: "O que muda para o seu filho",
    titulo: "Se ele travar, o material percebe",
    pontos: [
      "Travou num assunto? O material volta nesse ponto, em vez de empurrar ele pra frente.",
      "Cada capítulo vem com vídeo e exercício. São 150 mil questões no total.",
      "Do 6º ao 9º, a coleção é nova em folha: projetos, projeto de vida e olimpíada de matemática.",
    ],
  },
  {
    etiqueta: "O que muda para você",
    titulo: "Você não vai mais ser o último a saber",
    pontos: [
      "Toda semana chega um resumo: como ele foi em cada matéria e onde a barra baixou.",
      "Vem pelo WhatsApp. Não tem aplicativo para baixar, nem senha para decorar.",
      "Se português cair em março, você sabe em março. Não em maio.",
    ],
  },
  {
    etiqueta: "E tem mais uma novidade",
    titulo: "Os tablets chegam à sala de aula",
    pontos: [
      "Do 4º ao 9º ano, algumas aulas passam a acontecer com eles.",
      "Os tablets são da escola. Você não precisa comprar tablet nenhum.",
      "Ficam na escola, usados dentro da aula, com o professor junto.",
      "Não é todo dia. O livro continua sendo a base do estudo.",
    ],
  },
  {
    etiqueta: "Por que escolhemos esse",
    titulo: "130 mil famílias avaliaram",
    pontos: [
      "Entre todos os materiais didáticos do país, o Geekie foi o mais bem avaliado pelas famílias.",
    ],
    nota: "Diagnóstico Nacional da Educação, do Escolas Exponenciais, com 130 mil famílias, 14 mil professores e 400 instituições. Noticiado pela Folha de S.Paulo em agosto de 2021.",
  },
];

/**
 * A aba Comunicação. CONFIRMAR COM A ESCOLA quais módulos do AgendaEdu
 * entram de fato antes da reunião.
 */
export const COMUNICACAO: Item[] = [
  { nome: "Comunicados", resumo: null },
  { nome: "Agenda do dia", resumo: null },
  { nome: "Financeiro", resumo: null },
  { nome: "Autorizações", resumo: null },
];

/** Até quando vale a tabela promocional de 2027. */
export const PRAZO_PROMOCAO = "30 de outubro de 2026";
export const INICIO_TABELA_CHEIA = "2 de novembro";

export interface Faixa {
  /** Valor da mensalidade. */
  cheio: string;
  /** Valor pagando até o dia 5. */
  ateODia5: string;
}

export interface Valores {
  promocional: Faixa;
  depois: Faixa;
  /** O material é comprado à parte. Nunca apresentar como incluso. */
  material: { rotulo: string; valor: string }[];
}

/**
 * Tabela 2027, transcrita das fotos que o Pedro mandou em 22/09/2026
 * (docs/EventoRematricula/preçomensalidade.jpeg e preçolivros.jpeg).
 *
 * Lembrar: esta página é pública, então o que está aqui o concorrente lê.
 */
export const VALORES: Record<SegmentoId, Valores | null> = {
  infantil: {
    promocional: { cheio: "R$ 570,00", ateODia5: "R$ 550,00" },
    depois: { cheio: "R$ 580,00", ateODia5: "R$ 560,00" },
    material: [
      { rotulo: "Grupo 2 e 3", valor: "R$ 887,00" },
      { rotulo: "Grupo 4 e 5", valor: "R$ 1.102,08" },
    ],
  },
  f1: {
    promocional: { cheio: "R$ 540,00", ateODia5: "R$ 520,00" },
    depois: { cheio: "R$ 550,00", ateODia5: "R$ 530,00" },
    material: [{ rotulo: "1º ao 5º ano", valor: "R$ 1.908,48" }],
  },
  f2: {
    promocional: { cheio: "R$ 560,00", ateODia5: "R$ 540,00" },
    depois: { cheio: "R$ 570,00", ateODia5: "R$ 550,00" },
    material: [{ rotulo: "6º ao 9º ano", valor: "R$ 2.177,28" }],
  },
};

export const CONTATO = {
  /** TODO: trocar pelo número real da secretaria. */
  whatsapp: null as string | null,
  linkReuniao: "/matriculas2027",
  linkGeekie: "/geekie",
};

/** As bolhas da capa. `alvo` é o id da seção pra onde o toque leva. */
export interface Bolha {
  rotulo: string;
  alvo: string;
  /** Preenchida quando a bolha também escolhe a etapa. */
  segmento?: SegmentoId;
  /**
   * Onde o nome deve quebrar dentro do círculo. Sem isso o navegador parte no
   * meio da palavra e sai "AgendaE / du".
   */
  linhas?: string[];
}

export const BOLHAS_DENTRO: Bolha[] = [
  { rotulo: "Infantil", alvo: "video", segmento: "infantil" },
  { rotulo: "Fund. 1", alvo: "video", segmento: "f1" },
  { rotulo: "Fund. 2", alvo: "video", segmento: "f2" },
];

export const BOLHAS_FORA: Bolha[] = [
  { rotulo: "Geekie", alvo: "livro" },
  { rotulo: "Tablets", alvo: "livro" },
  { rotulo: "AgendaEdu", alvo: "comunicacao", linhas: ["Agenda", "Edu"] },
  { rotulo: "Projeto Arbória", alvo: "programas", linhas: ["Projeto", "Arbória"] },
  { rotulo: "Socioemocional", alvo: "programas", linhas: ["Socio", "emocional"] },
  { rotulo: "Robótica", alvo: "programas" },
  { rotulo: "Ed. Financeira", alvo: "programas", linhas: ["Ed.", "Financeira"] },
  { rotulo: "Bilíngue", alvo: "programas" },
  { rotulo: "Inglês", alvo: "programas" },
  { rotulo: "Karatê", alvo: "esportes" },
  { rotulo: "Futsal", alvo: "esportes" },
  { rotulo: "Vôlei", alvo: "esportes" },
  { rotulo: "Auditório", alvo: "espacos" },
];

/** As etapas do percurso, na ordem, pra barra de progresso. */
export const PERCURSO = [
  "segmento",
  "video",
  "livro",
  "comunicacao",
  "programas",
  "esportes",
  "espacos",
  "valores",
  "proximo",
] as const;
