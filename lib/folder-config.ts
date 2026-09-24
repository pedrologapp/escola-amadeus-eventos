/**
 * Conteúdo do folder digital (rota /folder).
 *
 * O folder é GERAL: não pede nome de aluno, porque também atende família nova.
 * A única personalização é a etapa, escolhida pelo próprio pai.
 *
 * Os textos dos programas e dos esportes são os mesmos dos cards que a escola
 * publicou no Instagram (docs/EventoRematricula/pogramas). As fotos saíram
 * desses cards, recortadas por scripts/recortar-fotos-folder.mjs para tirar o
 * texto gravado na imagem.
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
}

export const SEGMENTOS: Segmento[] = [
  {
    id: "infantil",
    nome: "Educação Infantil",
    curto: "Infantil",
    idade: "2 a 5 anos",
    series: null,
    video: null,
  },
  {
    id: "f1",
    nome: "Fundamental 1",
    curto: "Fund. 1",
    idade: "6 a 10 anos",
    series: "do 1º ao 5º ano",
    video: null,
  },
  {
    id: "f2",
    nome: "Fundamental 2",
    curto: "Fund. 2",
    idade: "11 a 14 anos",
    series: "do 6º ao 9º ano",
    video: null,
  },
];

export function acharSegmento(id: SegmentoId): Segmento {
  const s = SEGMENTOS.find((x) => x.id === id);
  if (!s) throw new Error(`Segmento desconhecido: ${id}`);
  return s;
}

export function indiceSegmento(id: SegmentoId): number {
  return SEGMENTOS.findIndex((s) => s.id === id);
}

/**
 * Peça do mosaico. `largo` e `alto` dão ao bloco o tamanho de duas colunas ou
 * de duas linhas, pra grade não ficar com todo mundo do mesmo tamanho.
 */
export interface Foto {
  src: string;
  /** Tamanho real do arquivo, pra foto abrir inteira sem cortar nada. */
  w: number;
  h: number;
}

export type IconeEspaco =
  | "auditorio"
  | "quadra"
  | "parquinho"
  | "sala"
  | "lanche"
  | "invertida";

export interface Peca {
  nome: string;
  resumo: string | null;
  nota?: string;
  foto?: Foto;
  icone?: IconeEspaco;
  largo?: boolean;
  alto?: boolean;
}

export const PROGRAMAS: Peca[] = [
  {
    nome: "Projeto Arbória",
    resumo:
      "Entender na individualidade de cada aluno seus potenciais e habilidades para que ele se descubra em sua própria luz.",
    nota: "Infantil, Fundamental 1 e 2",
    foto: { src: "/folder/programas/arboria.webp", w: 900, h: 681 },
    largo: true,
  },
  {
    nome: "Educação Socioemocional",
    resumo:
      "Desenvolver habilidades como empatia, autonomia, liderança e equilíbrio emocional.",
    nota: "Infantil, Fundamental 1 e 2",
    foto: { src: "/folder/programas/socioemocional.webp", w: 365, h: 720 },
    alto: true,
  },
  {
    nome: "Sala Maker e Robótica",
    resumo:
      "Tecnologia, lógica e criatividade aplicadas na prática, estimulando inovação e pensamento crítico.",
    nota: "Fundamental 1 e 2",
    foto: { src: "/folder/programas/robotica.webp", w: 640, h: 700 },
  },
  {
    nome: "Educação Financeira",
    resumo:
      "Compreender através da lógica, pensamento crítico e comportamental como realizar organização financeira para atingir seus próprios objetivos.",
    nota: "Infantil, Fundamental 1 e 2",
    foto: { src: "/folder/programas/financeira.webp", w: 510, h: 420 },
  },
  {
    nome: "Educação Bilíngue",
    resumo:
      "Aprendizado em duas línguas desde cedo, preparando para um mundo cada vez mais conectado.",
    nota: "Infantil, Fundamental 1 e 2",
    foto: { src: "/folder/programas/bilingue.webp", w: 600, h: 690 },
    largo: true,
  },
];

export const FRASE_ESPORTES =
  "Mais do que competição. Cada treino é uma oportunidade de aprender sobre respeito, superação e responsabilidade.";

export const ESPORTES: Peca[] = [
  {
    nome: "Karatê",
    resumo: null,
    foto: { src: "/folder/programas/esportes.webp", w: 490, h: 490 },
    largo: true,
    alto: true,
  },
  {
    nome: "Futsal",
    resumo: null,
    foto: { src: "/folder/programas/futsal.webp", w: 470, h: 530 },
  },
  {
    nome: "Vôlei",
    resumo: null,
    foto: { src: "/folder/programas/volei.webp", w: 500, h: 500 },
  },
];

export const ESPACOS: Peca[] = [
  { nome: "Auditório", resumo: null, icone: "auditorio", largo: true },
  { nome: "Quadra", resumo: null, icone: "quadra" },
  { nome: "Parquinho", resumo: null, icone: "parquinho" },
  {
    nome: "Salas climatizadas",
    resumo: null,
    nota: "com projetor ou TV",
    icone: "sala",
    largo: true,
  },
  {
    nome: "Espaço do lanchinho",
    resumo: null,
    nota: "Educação Infantil",
    icone: "lanche",
  },
  { nome: "Sala invertida", resumo: null, nota: "Fundamental 2", icone: "invertida" },
];

/**
 * Os cartões da aba "O Livro", que o pai arrasta pro lado. Cada um tem um
 * formato diferente de propósito: número grande, relatório, metades, chips.
 * A ideia é ele entender de olhada, sem parar pra ler.
 */
export type CartaoLivro =
  | { tipo: "metades"; etiqueta: string; impresso: string; digital: string }
  | {
      tipo: "relatorio";
      etiqueta: string;
      titulo: string;
      materias: { nome: string; valor: number; alerta?: boolean }[];
      frase: string;
    }
  | {
      tipo: "numero";
      etiqueta: string;
      numero: string;
      unidade: string;
      frase: string;
      nota?: string;
    }
  | {
      tipo: "chips";
      etiqueta: string;
      titulo: string;
      destaque: string;
      chips: string[];
    }
  | {
      tipo: "segmentos";
      etiqueta: string;
      titulo: string;
      linhas: { etapa: string; texto: string }[];
    };

export const CARTOES_LIVRO: CartaoLivro[] = [
  {
    tipo: "metades",
    etiqueta: "O que é",
    impresso: "O livro continua na mochila. É nele que ele escreve e resolve.",
    digital: "Uma plataforma que faz o que o papel sozinho não consegue.",
  },
  {
    tipo: "segmentos",
    etiqueta: "Não é igual para todo mundo",
    titulo: "Muda conforme a idade",
    linhas: [
      { etapa: "Infantil", texto: "Tudo impresso. Nessa idade não tem tela." },
      { etapa: "Fund. 1", texto: "O livro é a base. Quem usa a plataforma é o professor." },
      { etapa: "Fund. 2", texto: "Ele entra sozinho e tem plano de estudos toda semana." },
    ],
  },
  {
    tipo: "relatorio",
    /* O canal é e-mail, toda sexta. Conferido na central de ajuda da Geekie
       em 24/09/2026: o relatório chama Família Conectada e não vai por
       WhatsApp. Ver docs/EventoRematricula/Geekie_Pesquisa_Densa.md */
    etiqueta: "O que muda para você",
    titulo: "Toda sexta, no seu e-mail",
    materias: [
      { nome: "Matemática", valor: 88 },
      { nome: "Ciências", valor: 81 },
      { nome: "Português", valor: 54, alerta: true },
    ],
    frase:
      "É o Relatório Família Conectada. Chega sozinho, e dá pra cadastrar até quatro responsáveis.",
  },
  {
    tipo: "numero",
    etiqueta: "O que muda para o seu filho",
    numero: "150",
    unidade: "mil questões",
    frase: "Se ele travar num assunto, o material volta nesse ponto.",
  },
  {
    tipo: "chips",
    etiqueta: "Novidade em 2027",
    titulo: "Tablets na sala",
    destaque: "4º ao 9º",
    chips: ["Você não compra nada", "Ficam na escola", "Não é todo dia"],
  },
  {
    tipo: "numero",
    etiqueta: "Por que escolhemos esse",
    numero: "130",
    unidade: "mil famílias avaliaram",
    frase: "Entre todos os materiais do país, o Geekie foi o mais bem avaliado.",
    nota: "Diagnóstico Nacional da Educação, do Escolas Exponenciais. Noticiado pela Folha de S.Paulo em agosto de 2021.",
  },
];

/**
 * As três perguntas que os pais fizeram na reunião de 22/09. Ficam recolhidas
 * e abrem ao toque.
 *
 * A do tablet é respondida sem prometer que a plataforma roda nele, porque a
 * documentação da Geekie diz que o aplicativo não funciona em tablet e o
 * aparelho da escola ainda não foi confirmado. Ver Geekie_Pesquisa_Densa.md.
 */
export const PERGUNTAS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "Vai deixar de ser no livro?",
    resposta:
      "Não. O livro continua sendo a base em todas as etapas. No Infantil é tudo impresso. No Fundamental 1 o impresso é o centro do estudo e quem usa a plataforma em aula é o professor. No Fundamental 2 cada matéria tem o seu livro.",
  },
  {
    pergunta: "Vou ter que deixar meu filho com o celular?",
    resposta:
      "Não. Do Infantil ao 5º ano o celular nem entra na conversa. A própria Geekie só libera o acesso por celular a partir do 6º ano, e mesmo lá a plataforma funciona no computador. Celular é opção da família, nunca exigência da escola.",
  },
  {
    pergunta: "Vai ser tudo no tablet?",
    resposta:
      "Não. O tablet entra em aulas escolhidas, com o professor junto, e fica na escola. Em casa e na maior parte das aulas, o estudo continua sendo no livro.",
  },
];

/** A aba Comunicação. O AgendaEdu NÃO trata de financeiro. */
export type IconeComunicacao = "agenda" | "evento" | "recado" | "direcao";

export const COMUNICACAO: { nome: string; icone: IconeComunicacao }[] = [
  { nome: "Agenda do dia", icone: "agenda" },
  { nome: "Eventos", icone: "evento" },
  { nome: "Recados da escola", icone: "recado" },
  { nome: "Direção e coordenação", icone: "direcao" },
];

/** Até quando vale a tabela promocional de 2027. */
export const PRAZO_PROMOCAO = "30 de outubro de 2026";
export const INICIO_TABELA_CHEIA = "2 de novembro";

export interface Faixa {
  cheio: string;
  ateODia5: string;
}

export interface Valores {
  promocional: Faixa;
  depois: Faixa;
  /** O material é comprado à parte. Nunca apresentar como incluso. */
  material: { rotulo: string; parcela: string; total: string }[];
}

/**
 * Tabela 2027, transcrita das fotos que o Pedro mandou em 22/09/2026
 * (docs/EventoRematricula/preçomensalidade.jpeg e preçolivros.jpeg).
 * O material aparece parcelado em até 12x, que é como a família pensa.
 *
 * Lembrar: esta página é pública, então o que está aqui o concorrente lê.
 */
export const VALORES: Record<SegmentoId, Valores | null> = {
  infantil: {
    promocional: { cheio: "R$ 570,00", ateODia5: "R$ 550,00" },
    depois: { cheio: "R$ 580,00", ateODia5: "R$ 560,00" },
    material: [
      { rotulo: "Grupo 2 e 3", parcela: "R$ 73,92", total: "R$ 887,00" },
      { rotulo: "Grupo 4 e 5", parcela: "R$ 91,84", total: "R$ 1.102,08" },
    ],
  },
  f1: {
    promocional: { cheio: "R$ 540,00", ateODia5: "R$ 520,00" },
    depois: { cheio: "R$ 550,00", ateODia5: "R$ 530,00" },
    material: [{ rotulo: "1º ao 5º ano", parcela: "R$ 159,04", total: "R$ 1.908,48" }],
  },
  f2: {
    promocional: { cheio: "R$ 560,00", ateODia5: "R$ 540,00" },
    depois: { cheio: "R$ 570,00", ateODia5: "R$ 550,00" },
    material: [{ rotulo: "6º ao 9º ano", parcela: "R$ 181,44", total: "R$ 2.177,28" }],
  },
};

export const CONTATO = {
  /**
   * O mesmo número que a página pública de eventos já mostra como
   * "Fale com a secretaria pelo WhatsApp": (84) 9 8145-0229.
   */
  whatsapp: "5584981450229",
  linkReuniao: "/matriculas2027",
  linkGeekie: "/geekie",
};

/** Mensagem que já vai escrita quando o pai abre o WhatsApp. */
export function mensagemWhatsapp(segmento: string | null): string {
  const base = "Olá! Vi o folder do Amadeus e quero saber mais sobre as matrículas 2027";
  return segmento ? `${base}, para ${segmento}.` : `${base}.`;
}

/** As bolhas da capa. `alvo` é o id da seção pra onde o toque leva. */
export interface Bolha {
  rotulo: string;
  alvo: string;
  segmento?: SegmentoId;
  /** Onde o nome quebra dentro do círculo. */
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

export const PERCURSO = [
  "segmento",
  "video",
  "livro",
  "comunicacao",
  "programas",
  "esportes",
  "espacos",
  "somos",
  "valores",
] as const;
