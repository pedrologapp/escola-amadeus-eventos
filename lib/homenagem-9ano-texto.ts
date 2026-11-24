/**
 * Homenagem do 9º ano (formatura 2026): textos que a página dos pais e o admin usam.
 * Sem "server-only": a página de gravação (client) mostra o poema como teleprompter.
 *
 * O poema é lido INTEIRO por todas as famílias. Na montagem, cada verso sai na voz de uma família
 * (32 alunos, 16 versos: cada verso tem duas famílias para escolher) e o coro final sai com todas juntas.
 * "Parabéns, turma do 9º ano!" não é falado: aparece escrito na tela depois do coro.
 */

export const BUCKET_HOMENAGEM = "homenagem-9ano";
export const URL_HOMENAGEM = "https://eventos.escolaamadeus.com/homenagem9ano";

/** Prazo para os pais enviarem, ex. "30 de novembro". Vazio = a página não fala de prazo. */
export const PRAZO_HOMENAGEM = "terça-feira, 24/11";

export const ESTROFES: { titulo: string; versos: string[] }[] = [
  {
    titulo: "A chegada",
    versos: [
      "Te vi entrar por esse portão",
      "com a mochila maior que o medo,",
      "segurando forte a minha mão,",
      "guardando o mundo num segredo.",
    ],
  },
  {
    titulo: "O crescimento",
    versos: [
      "Vi você cair e levantar,",
      "vi o choro virar coragem,",
      "vi o sonho aprender a voar,",
      "cada ano, uma nova viagem.",
    ],
  },
  {
    titulo: "A partida",
    versos: [
      "Hoje o portão se abre pra fora,",
      "e é você quem vai partir.",
      "Não tenha medo da demora:",
      "o melhor ainda está por vir.",
    ],
  },
  {
    titulo: "A promessa",
    versos: [
      "Por onde for, vou contigo,",
      "em cada passo, em cada chão.",
      "Você leva o mundo consigo",
      "e leva a gente no coração.",
    ],
  },
];

/** Dito por todas as famílias ao mesmo tempo, olhando para a câmera. */
export const CORO = ["Saiba que sempre estaremos com você.", "Nós te amamos!"];

/** O poema em texto corrido, para copiar ou mandar para outro celular e ler de lá enquanto grava. */
export function poemaEmTexto(): string {
  return [
    "Homenagem do 9º ano: o poema",
    "",
    ...ESTROFES.flatMap((e) => [...e.versos, ""]),
    ...CORO,
  ].join("\n");
}

export const QUEM_OPCOES = ["Mãe", "Pai", "Mãe e pai", "Outra pessoa da família"] as const;

export const MAX_FOTOS = 10;
export const MAX_VIDEO_MB = 300;

export type StatusParte = "pendente" | "aprovado" | "refazer";
