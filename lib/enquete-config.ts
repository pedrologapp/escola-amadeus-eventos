// =============================================================
// Configuração das Enquetes (Clima / Satisfação)
// =============================================================
// Cada pesquisa é uma "EnqueteDef" — todo o conteúdo (séries, professores,
// perguntas, textos) vive numa definição. O formulário, o painel e o
// salvamento leem de uma def escolhida pelo `slug`. Assim dá pra ter várias
// pesquisas (alunos do Fund. 2, pais do Fund. 1, ...) reaproveitando o mesmo
// código. Para criar/editar uma pesquisa, mexa só neste arquivo.

// ---------------- Escala (compartilhada) ----------------

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

// ---------------- Tipos da definição ----------------

/** Critério fechado feito para cada professor. */
export interface ItemProfessor {
  id: string;
  /** Texto exibido no formulário (voz do respondente). */
  texto: string;
  /** Rótulo curto usado nas barras do painel. */
  tituloPainel: string;
}

/** Uma pessoa avaliada (professor, especialista, auxiliar...). */
export interface Professor {
  id: string;
  /** Título grande do card. */
  nome: string;
  /** Subtítulo do card (disciplina, papel...). */
  subtitulo: string;
  /** Critérios próprios (sobrescreve `itensProfessor` da def). */
  itens?: readonly ItemProfessor[];
}

export interface PerguntaClima {
  id: string;
  texto: string;
  invertida?: boolean;
  /** Se preenchido, forma um par de coerência com a pergunta de id citado. */
  coerenciaCom?: string;
  /** Se preenchido, vira um card de resumo no topo do painel. */
  resumoLabel?: string;
}

export interface SecaoClima {
  id: string;
  titulo: string;
  perguntas: PerguntaClima[];
}

export interface Aberta {
  id: string;
  texto: string;
}

export interface PassoDef {
  id: string;
  emoji: string;
  titulo: string;
  frase: string;
}

export interface EnqueteDef {
  slug: string;
  /** Quem responde — afeta rótulos ("aluno" x "família"). */
  publico: "aluno" | "responsavel";
  /** Título do painel/relatório. */
  tituloPainel: string;
  /** Rótulo singular do respondente (para "N aluno(s) pediram..."). */
  labelRespondente: string;

  series: readonly string[];
  turmas: readonly string[];
  /** Turmas específicas por série (sobrescreve `turmas` quando presente). */
  turmasPorSerie?: Record<string, readonly string[]>;

  /** Cabeçalho da etapa/seção de professores no painel. */
  tituloProfessores: string;
  professores: readonly Professor[];
  itensProfessor: readonly ItemProfessor[];
  /** Se as avaliações de professor são obrigatórias para avançar. */
  professoresObrigatorio: boolean;
  /** Pergunta de múltipla escolha "onde há mais dificuldade" (só alunos). */
  perguntaDificuldade: string | null;

  secoes: SecaoClima[];
  ancoras: PerguntaClima[];
  abertas: readonly Aberta[];

  /** Textos do primeiro passo. */
  introTexto: string;
  labelSerie: string;
  labelTurma: string;

  /** Passo opcional "quer conversar/contato". */
  ajuda: {
    titulo: string;
    subtitulo: string;
    naoLabel: string;
    simLabel: string;
    contatoLabel: string;
    contatoPlaceholder: string;
    /** Cabeçalho do bloco no painel. */
    painelTitulo: string;
  };

  avisoApoio: string;
  obrigadoTitulo: string;
  obrigadoTexto: string;

  passos: PassoDef[];

  /** URL para compartilhar (QR no painel). */
  shareUrlEnv?: string;
  shareUrlDefault: string;
}

// Helpers derivados de uma def -------------------------------

/** Todas as perguntas fechadas de clima (seções + âncoras), em ordem. */
export function todasClima(def: EnqueteDef): PerguntaClima[] {
  return [...def.secoes.flatMap((s) => s.perguntas), ...def.ancoras];
}

/** Turmas disponíveis para uma série (respeita `turmasPorSerie`). */
export function turmasDe(def: EnqueteDef, serie: string): readonly string[] {
  return def.turmasPorSerie?.[serie] ?? def.turmas;
}

/** Categorias com campo de comentário próprio (professores + seções). */
export function comentariosDe(def: EnqueteDef): { id: string; titulo: string }[] {
  return [
    { id: "professores", titulo: def.tituloProfessores },
    ...def.secoes.map((s) => ({ id: s.id, titulo: s.titulo })),
  ];
}

/** Critérios avaliados para uma pessoa (respeita override por função). */
export function itensDoProfessor(
  def: EnqueteDef,
  prof: Professor,
): readonly ItemProfessor[] {
  return prof.itens ?? def.itensProfessor;
}

// =============================================================
// Pesquisa 1 — Clima Escolar (alunos, Fundamental 2)
// =============================================================

export const ENQUETE_ALUNOS: EnqueteDef = {
  slug: "clima-2026",
  publico: "aluno",
  tituloPainel: "Enquete de Clima Escolar",
  labelRespondente: "aluno",

  series: ["6º ano", "7º ano", "8º ano", "9º ano"],
  turmas: ["A", "B"],

  tituloProfessores: "Aulas e professores",
  professores: [
    { id: "portugues", nome: "Português", subtitulo: "Profa. Julianneide" },
    { id: "matematica", nome: "Matemática", subtitulo: "Profa. Jéssica" },
    { id: "historia", nome: "História", subtitulo: "Prof. Francinildo" },
    { id: "geografia", nome: "Geografia", subtitulo: "Profa. Ângela" },
    { id: "ciencias", nome: "Ciências", subtitulo: "Prof. José Eduardo" },
    { id: "ingles", nome: "Inglês", subtitulo: "Prof. Helder" },
    { id: "socioemocional", nome: "Socioemocional", subtitulo: "Profa. Polyana" },
    { id: "edfinanceira", nome: "Ed. Financeira", subtitulo: "Profa. Zwinglia" },
    { id: "robotica", nome: "Robótica / Nave à Vela", subtitulo: "Prof. Jonathan" },
    { id: "artes", nome: "Artes", subtitulo: "Profa. Ceni" },
    { id: "edfisica", nome: "Educação Física", subtitulo: "Profa. Jany" },
    { id: "coreografia", nome: "Eventos", subtitulo: "Prof. Ailton" },
    { id: "arboria", nome: "Arboria", subtitulo: "Prof. Pedro" },
  ],
  itensProfessor: [
    {
      id: "clareza",
      texto: "O(A) professor(a) explica de um jeito que eu consigo entender.",
      tituloPainel: "Explica de um jeito que dá pra entender",
    },
    {
      id: "respeito",
      texto: "O(A) professor(a) me trata com respeito.",
      tituloPainel: "Trata os alunos com respeito",
    },
  ],
  professoresObrigatorio: true,
  perguntaDificuldade: "Em quais matérias você sente mais dificuldade?",

  secoes: [
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
  ],
  ancoras: [
    {
      id: "gosto_geral",
      texto: "De modo geral, eu gosto de estudar nesta escola.",
      resumoLabel: "Gostam de estudar aqui",
    },
    {
      id: "recomendaria",
      texto: "Eu recomendaria esta escola para um amigo ou amiga.",
      resumoLabel: "Recomendariam a escola",
    },
  ],
  abertas: [
    { id: "mais_gosta", texto: "O que você MAIS gosta na escola?" },
    { id: "mudaria", texto: "Se você pudesse mudar UMA coisa na escola, o que seria?" },
  ],

  introTexto:
    "Esta pesquisa é anônima — a gente não sabe quem respondeu. Responda com sinceridade: não tem certo nem errado. 💙",
  labelSerie: "Sua série / ano",
  labelTurma: "Turma",

  ajuda: {
    titulo: "Quer que alguém da escola converse com você sobre alguma coisa?",
    subtitulo: "Você não precisa responder isto. É só se você quiser.",
    naoLabel: "Não, está tudo bem",
    simLabel: "Sim, quero",
    contatoLabel: "Escreva seu nome e turma * (pra coordenação te procurar)",
    contatoPlaceholder: "Seu nome e turma",
    painelTitulo: "pediram para conversar",
  },

  avisoApoio:
    "Se você está passando por algo difícil, procure a coordenação ou a orientação da escola. Você também pode ligar 188 (CVV), de graça e em sigilo, a qualquer hora.",
  obrigadoTitulo: "Prontinho! 🎉",
  obrigadoTexto:
    "Muito obrigado por compartilhar a sua opinião. Cada resposta ajuda a deixar o Centro Educacional Amadeus melhor pra você. 💙",

  passos: [
    { id: "voce", emoji: "👋", titulo: "Vamos começar!", frase: "Primeiro, conta pra gente sua turma." },
    { id: "professores", emoji: "📚", titulo: "Suas aulas e professores", frase: "Como estão sendo as aulas? Avalie com respeito. 💬" },
    { id: "sentir", emoji: "💙", titulo: "Como você se sente aqui", frase: "Agora é sobre você. Pode ser sincero(a)!" },
    { id: "convivencia", emoji: "🤝", titulo: "Convivência e respeito", frase: "Sobre o clima entre todo mundo." },
    { id: "regras", emoji: "📣", titulo: "Regras, voz e motivação", frase: "Sua opinião conta de verdade." },
    { id: "estrutura", emoji: "🏫", titulo: "A escola por dentro", frase: "Espaço, limpeza, cantina e por aí vai." },
    { id: "fechar", emoji: "⭐", titulo: "Quase lá!", frase: "Só mais um pouquinho." },
    { id: "ajuda", emoji: "🤗", titulo: "Pra terminar", frase: "Se quiser, a gente te escuta." },
  ],

  shareUrlEnv: "NEXT_PUBLIC_ENQUETE_URL",
  shareUrlDefault: "https://pesquisa.escolaamadeus.com",
};

// =============================================================
// Pesquisa 2 — Satisfação (pais/responsáveis, Fundamental 1)
// =============================================================

// Critérios por função (as funções não-docentes ganham critérios próprios).
const ITENS_AUXILIAR: readonly ItemProfessor[] = [
  {
    id: "cuidado",
    texto: "É atencioso(a) e cuidadoso(a) com os alunos e com o bem-estar deles.",
    tituloPainel: "Atenção e cuidado",
  },
  {
    id: "ajuda",
    texto: "Ajuda e acompanha bem os alunos no dia a dia.",
    tituloPainel: "Ajuda no dia a dia",
  },
];
const ITENS_ATENDIMENTO: readonly ItemProfessor[] = [
  {
    id: "atendimento",
    texto: "Atende as famílias e os alunos com cordialidade e eficiência.",
    tituloPainel: "Atendimento e cordialidade",
  },
];

export const ENQUETE_PAIS: EnqueteDef = {
  slug: "clima-pais-2026",
  publico: "responsavel",
  tituloPainel: "Pesquisa de Satisfação — Fundamental 1 (Famílias)",
  labelRespondente: "família",

  series: ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano"],
  turmas: ["A", "B"],
  turmasPorSerie: { "5º ano": ["A", "B", "C"] },

  tituloProfessores: "Professores e equipe",
  // "Todos da lista": regentes + programas/extras + auxiliares + recepção.
  professores: [
    { id: "reg_andrea", nome: "Andrea", subtitulo: "Professora regente" },
    { id: "reg_josesclea", nome: "Josesclea", subtitulo: "Professora regente" },
    { id: "reg_suziane", nome: "Suziane", subtitulo: "Professora regente" },
    { id: "reg_isabelle", nome: "Isabelle", subtitulo: "Professora regente" },
    { id: "reg_cassia", nome: "Cássia", subtitulo: "Professora regente" },
    { id: "reg_alexsandra", nome: "Alexsandra", subtitulo: "Professora regente" },
    { id: "zwinglia", nome: "Zwinglia", subtitulo: "Ed. Financeira" },
    { id: "helder", nome: "Helder", subtitulo: "Bilíngue" },
    { id: "thalita", nome: "Thalita", subtitulo: "Bilíngue" },
    { id: "thaise", nome: "Thaíse", subtitulo: "Inglês" },
    { id: "jany", nome: "Jany", subtitulo: "Educação Física" },
    { id: "roberto", nome: "Roberto", subtitulo: "Artes" },
    { id: "jonathan", nome: "Jonathan", subtitulo: "Robótica" },
    { id: "ailton", nome: "Ailton", subtitulo: "Coreografia" },
    { id: "polyana", nome: "Polyana", subtitulo: "Psicóloga" },
    { id: "aux_vanessa", nome: "Vanessa", subtitulo: "Auxiliar de sala", itens: ITENS_AUXILIAR },
    { id: "aux_clara", nome: "Clara", subtitulo: "Auxiliar de sala", itens: ITENS_AUXILIAR },
    { id: "aux_delys", nome: "Delys", subtitulo: "Auxiliar de sala", itens: ITENS_AUXILIAR },
    { id: "sec_bruna", nome: "Bruna", subtitulo: "Secretaria / Portaria", itens: ITENS_ATENDIMENTO },
    { id: "sec_ligivania", nome: "Ligivânia", subtitulo: "Secretaria / Portaria", itens: ITENS_ATENDIMENTO },
  ],
  itensProfessor: [
    {
      id: "clareza",
      texto: "Ensina e orienta de um jeito claro, que ajuda no aprendizado do meu filho(a).",
      tituloPainel: "Clareza no ensino",
    },
    {
      id: "cuidado",
      texto: "É atencioso(a) e cuidadoso(a) com os alunos e com o bem-estar deles.",
      tituloPainel: "Atenção e cuidado",
    },
    {
      id: "comunicacao",
      texto: "Mantém a família informada sobre o desenvolvimento do meu filho(a) quando necessário.",
      tituloPainel: "Comunicação com a família",
    },
  ],
  professoresObrigatorio: false, // avalie só quem você acompanha
  perguntaDificuldade: null,

  secoes: [
    {
      id: "filho",
      titulo: "Meu filho na escola",
      perguntas: [
        { id: "seguro", texto: "Meu filho(a) se sente seguro(a) e bem cuidado(a) na escola." },
        { id: "gosta", texto: "Meu filho(a) gosta de ir para a escola." },
        { id: "acolhido", texto: "A escola acolhe bem meu filho(a) e a nossa família." },
      ],
    },
    {
      id: "estrutura",
      titulo: "Estrutura e ambiente",
      perguntas: [
        { id: "limpeza", texto: "As salas, o pátio e os banheiros estão limpos e bem cuidados." },
        { id: "atendimento", texto: "O atendimento da secretaria, portaria e coordenação é eficiente e cordial." },
      ],
    },
    {
      id: "cantina",
      titulo: "Cantina e alimentação",
      perguntas: [
        { id: "cantina_qual", texto: "A cantina oferece bom atendimento e boas opções." },
        { id: "cantina_saud", texto: "A escola incentiva e oferece lanches saudáveis e nutritivos." },
      ],
    },
  ],
  ancoras: [
    {
      id: "satisfacao_geral",
      texto: "De modo geral, estou satisfeito(a) com a escola.",
      resumoLabel: "Satisfeitos com a escola",
    },
    {
      id: "recomendaria",
      texto: "Eu recomendaria a Escola Amadeus para outras famílias.",
      resumoLabel: "Recomendariam a escola",
    },
  ],
  abertas: [
    {
      id: "aberto",
      texto:
        "Sugestões, elogios ou críticas que gostaria de compartilhar para melhorarmos ainda mais.",
    },
  ],

  introTexto:
    "Esta pesquisa é anônima e leva poucos minutos. Sua opinião sincera nos ajuda a oferecer o melhor para o seu filho(a). 💙",
  labelSerie: "Ano do seu filho(a)",
  labelTurma: "Turma",

  ajuda: {
    titulo: "Quer que a coordenação entre em contato com você?",
    subtitulo:
      "Só se você quiser. Se houver algo específico sobre seu filho(a) ou a escola, deixe seu nome e telefone que retornamos.",
    naoLabel: "Não, obrigado(a)",
    simLabel: "Sim, quero",
    contatoLabel: "Seu nome e telefone (WhatsApp) *",
    contatoPlaceholder: "Nome e telefone",
    painelTitulo: "pediram contato",
  },

  avisoApoio:
    "Obrigado pela parceria! Se precisar falar com a escola, procure a coordenação pelos canais oficiais. 💙",
  obrigadoTitulo: "Recebido! 🎉",
  obrigadoTexto:
    "Muito obrigado por compartilhar a sua opinião. Cada resposta ajuda a deixar o Centro Educacional Amadeus ainda melhor para o seu filho(a). 💙",

  passos: [
    { id: "voce", emoji: "👋", titulo: "Vamos começar!", frase: "Primeiro, conte de qual ano é o seu filho(a)." },
    { id: "professores", emoji: "📚", titulo: "Professores e equipe", frase: "Avalie quem você acompanha. Pode pular quem não conhece. 💬" },
    { id: "filho", emoji: "💙", titulo: "Meu filho na escola", frase: "Sobre o bem-estar e o acolhimento." },
    { id: "estrutura", emoji: "🏫", titulo: "Estrutura e ambiente", frase: "Limpeza, organização e atendimento." },
    { id: "cantina", emoji: "🍎", titulo: "Cantina e alimentação", frase: "Sobre a alimentação na escola." },
    { id: "fechar", emoji: "⭐", titulo: "Satisfação geral", frase: "Quase lá!" },
    { id: "ajuda", emoji: "🤝", titulo: "Pra terminar", frase: "Se quiser, deixe um recado." },
  ],

  shareUrlEnv: "NEXT_PUBLIC_ENQUETE_PAIS_URL",
  shareUrlDefault: "https://pesquisa.escolaamadeus.com/fundamental1",
};

// ---------------- Registro ----------------

export const ENQUETES: Record<string, EnqueteDef> = {
  [ENQUETE_ALUNOS.slug]: ENQUETE_ALUNOS,
  [ENQUETE_PAIS.slug]: ENQUETE_PAIS,
};

export function getEnquete(slug: string): EnqueteDef | null {
  return ENQUETES[slug] ?? null;
}
