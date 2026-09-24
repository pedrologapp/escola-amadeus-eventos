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
 *
 * DUAS EXCEÇÕES: socioemocional e financeira são do Pexels (licença livre para
 * uso comercial, sem exigir crédito), porque os cards cobriam as pessoas com
 * caixa de texto. Trocar assim que a escola tiver foto própria.
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
  /** Em que etapas o programa existe. Vazio = vale para todas. */
  etapas?: SegmentoId[];
  resumo: string | null;
  nota?: string;
  foto?: Foto;
  icone?: IconeEspaco;
  largo?: boolean;
  alto?: boolean;
}

export const PROGRAMAS: Peca[] = [
  {
    nome: "Projeto Arboria",
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
    foto: { src: "/folder/programas/socioemocional.webp", w: 600, h: 700 },
    alto: true,
  },
  {
    nome: "Sala Maker e Robótica",
    etapas: ["f1", "f2"],
    resumo:
      "Tecnologia, lógica e criatividade aplicadas na prática, estimulando inovação e pensamento crítico.",
    nota: "Fundamental 1 e 2",
    foto: { src: "/folder/programas/robotica.webp", w: 640, h: 700 },
  },
  {
    nome: "Educação Financeira",
    etapas: ["f1", "f2"],
    resumo:
      "Compreender através da lógica, pensamento crítico e comportamental como realizar organização financeira para atingir seus próprios objetivos.",
    nota: "Fundamental 1 e 2",
    foto: { src: "/folder/programas/financeira.webp", w: 900, h: 633 },
  },
  {
    nome: "Educação Bilíngue",
    resumo:
      "Aprendizado em duas línguas desde cedo, preparando para um mundo cada vez mais conectado.",
    nota: "Infantil, Fundamental 1 e 2",
    foto: { src: "/folder/programas/bilingue.webp", w: 580, h: 634 },
    largo: true,
  },
];

export const FRASE_ESPORTES =
  "Mais do que competição. Cada treino é uma oportunidade de aprender sobre respeito, superação e responsabilidade.";

export const ESPORTES: Peca[] = [
  {
    nome: "Karatê",
    resumo:
      "Disciplina e foco antes de qualquer medalha. O karatê ensina a criança a controlar o próprio corpo e a própria reação, e a respeitar quem está do outro lado.",
    foto: { src: "/folder/programas/esportes.webp", w: 490, h: 490 },
    largo: true,
    alto: true,
  },
  {
    nome: "Futsal",
    resumo:
      "Trabalho em equipe na prática. Aprender a passar, a esperar a vez e a perder sem desistir vale tanto quanto o gol.",
    foto: { src: "/folder/programas/futsal.webp", w: 470, h: 530 },
  },
  {
    nome: "Vôlei",
    resumo:
      "Ninguém faz ponto sozinho. É o esporte que mais cobra confiança no colega, porque a bola sempre passa por outra mão antes de cair.",
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
 * Os cartões da aba "O Livro".
 *
 * A ordem é de venda, não de explicação: primeiro a dor que o pai já sente,
 * depois o que a coisa é, depois como funciona, depois o que ELE ganha, e só
 * no fim a prova. Quem parar no meio já saiu entendendo.
 *
 * A palavra "impresso" não aparece em lugar nenhum: para quem nunca ouviu
 * falar de Geekie, ela sugere que existe uma versão que não é livro, e
 * confunde mais do que esclarece.
 */
export type CartaoLivro =
  | { tipo: "gancho"; etiqueta: string; pergunta: string; resposta: string }
  | { tipo: "oquee"; etiqueta: string; titulo: string; pontos: string[] }
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
      linhas: { etapa: string; idade: string; texto: string }[];
    };

export const CARTOES_LIVRO: CartaoLivro[] = [
  {
    tipo: "gancho",
    etiqueta: "Comece por aqui",
    pergunta: "Você sabe como seu filho foi essa semana na escola?",
    resposta:
      "Hoje a resposta chega no boletim. E quando ela chega, o bimestre já acabou.",
  },
  {
    tipo: "oquee",
    etiqueta: "O que é, sem enrolação",
    titulo: "Geekie é o material didático novo da escola",
    pontos: [
      "Um livro para cada matéria, que continua indo na mochila todo dia.",
      "Junto com o livro vem um sistema, que a escola usa em sala.",
      "É de uma empresa brasileira de educação, usada por escolas do país inteiro.",
    ],
  },
  {
    tipo: "numero",
    etiqueta: "O que muda para o seu filho",
    numero: "150",
    unidade: "mil questões",
    frase:
      "Ele responde, vê na hora se acertou, e quando erra muito num assunto o material volta nesse ponto em vez de empurrar ele pra frente.",
  },
  {
    tipo: "relatorio",
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
    tipo: "segmentos",
    etiqueta: "E na idade do seu filho?",
    titulo: "Cada etapa ganha uma coisa diferente",
    linhas: [
      {
        etapa: "Educação Infantil",
        idade: "2 a 5 anos",
        texto:
          "Um mês inteiro investigando uma pergunta só, com rotinas de pensamento criadas em Harvard. E você recebe fotos do que ela fez, não nota.",
      },
      {
        etapa: "Fundamental 1",
        idade: "1º ao 5º ano",
        texto:
          "O livro é o centro da aula. A professora usa o sistema para enxergar quem ficou para trás antes da prova, não depois.",
      },
      {
        etapa: "Fundamental 2",
        idade: "6º ao 9º ano",
        texto:
          "Ele entra sozinho e recebe toda semana um plano de estudos montado a partir dos próprios erros.",
      },
    ],
  },
  {
    tipo: "chips",
    etiqueta: "E tem mais uma novidade",
    titulo: "Tablets chegam à sala",
    destaque: "4º ao 9º",
    chips: ["Você não compra nada", "Ficam na escola", "Não é todo dia"],
  },
  {
    tipo: "numero",
    etiqueta: "Por que o Amadeus escolheu esse",
    numero: "130",
    unidade: "mil famílias avaliaram",
    frase:
      "Entre todos os materiais didáticos do país, o Geekie foi o mais bem avaliado pelas famílias. Foi por isso que a escola escolheu ele.",
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
      "Não. O livro continua sendo a base em todas as etapas. No Infantil é tudo no papel. No Fundamental 1 o livro é o centro da aula e quem usa o sistema é o professor. No Fundamental 2 cada matéria tem o seu livro.",
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

/** Prazo da matrícula antecipada, que também dá desconto no material. */
export const PRAZO_ANTECIPADA = "30 de outubro";

/**
 * A Mensalidade Fidelidade não é uma tabela à parte: é um desconto fixo de
 * R$ 20,00 para quem paga até o dia 05, valendo em qualquer condição.
 * Por isso o melhor cenário é a antecipada menos 20.
 */
export const DESCONTO_FIDELIDADE = "R$ 20,00";
export const DIA_FIDELIDADE = "05";

export interface Condicao {
  /** Valor de cada uma das 12 parcelas. */
  mensal: string;
}

export interface Economia {
  /** Quanto o pai deixa de pagar no ano inteiro. */
  total: string;
  /** De onde esse valor vem. */
  detalhe: string;
}

export interface Valores {
  /** Mensalidade 2027, sem nenhuma condição. */
  cheia: Condicao;
  /** Matriculando ou renovando até 30/10/2026. */
  antecipada: Condicao;
  /** Antecipada mais o desconto da fidelidade. É o melhor cenário possível. */
  melhor: Condicao;
  /** O que ele economiza matriculando até 30/10. */
  economia: Economia;
  /** O material é comprado à parte. Nunca apresentar como incluso. */
  material: {
    rotulo: string;
    /** Parcela no cartão, como a escola publicou. Não é conta minha. */
    parcela: string;
    aVista: string;
    total: string;
    /** Tabela promocional de quem matricula até 30/10. */
    promo?: { parcela: string; aVista: string; total: string };
  }[];
}

/**
 * Tabela 2027, transcrita da foto docs/EventoRematricula/valores.jpeg,
 * recebida em 24/09/2026. São 12 parcelas em todas as condições.
 *
 * Lembrar: esta página é pública, então o que está aqui o concorrente lê.
 */
export const VALORES: Record<SegmentoId, Valores | null> = {
  infantil: {
    cheia: { mensal: "R$ 580,00" },
    antecipada: { mensal: "R$ 570,00" },
    melhor: { mensal: "R$ 550,00" },
    economia: {
      total: "R$ 228,00 a R$ 240,00",
      detalhe:
        "R$ 120,00 na mensalidade do ano, mais R$ 108,00 ou R$ 120,00 no material, conforme o grupo.",
    },
    material: [
      {
        rotulo: "Maternal II e III",
        parcela: "R$ 83,00",
        aVista: "R$ 896,40",
        total: "R$ 996,00",
        promo: { parcela: "R$ 74,00", aVista: "R$ 799,20", total: "R$ 888,00" },
      },
      {
        rotulo: "Grupo IV e V",
        parcela: "R$ 92,00",
        aVista: "R$ 993,60",
        total: "R$ 1.104,00",
        promo: { parcela: "R$ 82,00", aVista: "R$ 885,60", total: "R$ 984,00" },
      },
    ],
  },
  f1: {
    cheia: { mensal: "R$ 550,00" },
    antecipada: { mensal: "R$ 540,00" },
    melhor: { mensal: "R$ 520,00" },
    economia: {
      total: "R$ 324,00",
      detalhe: "R$ 120,00 na mensalidade do ano e R$ 204,00 no material.",
    },
    material: [
      {
        rotulo: "1º ao 5º ano",
        parcela: "R$ 159,00",
        aVista: "R$ 1.717,20",
        total: "R$ 1.908,00",
        promo: { parcela: "R$ 142,00", aVista: "R$ 1.533,60", total: "R$ 1.704,00" },
      },
    ],
  },
  f2: {
    cheia: { mensal: "R$ 570,00" },
    antecipada: { mensal: "R$ 560,00" },
    melhor: { mensal: "R$ 540,00" },
    economia: {
      total: "R$ 120,00",
      detalhe: "na mensalidade do ano. O material também tem desconto até essa data.",
    },
    material: [
      {
        rotulo: "6º ao 9º ano",
        parcela: "R$ 181,00",
        aVista: "R$ 1.954,80",
        total: "R$ 2.172,00",
      },
    ],
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
  { rotulo: "Projeto Arboria", alvo: "programas", linhas: ["Projeto", "Arboria"] },
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
