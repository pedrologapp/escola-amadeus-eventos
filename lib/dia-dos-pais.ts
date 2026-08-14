/**
 * Dia dos Pais — tipos, códigos e formatação de nome.
 *
 * Cada aluno tem um vídeo e um código curto. O card impresso (1/4 de
 * folha) traz um QR apontando para /p/<codigo>.
 *
 * Este módulo é neutro de propósito (nada de `server-only`): o painel do
 * admin roda no navegador e precisa de `nomesDoCard` e dos tipos. O que
 * toca o bucket privado com service role vive em
 * `lib/dia-dos-pais-storage.ts`.
 */

import { SERIES_DISPONIVEIS } from "@/lib/constants";

export const BUCKET_DIA_DOS_PAIS = "dia-dos-pais";

/**
 * Alfabeto sem caracteres ambíguos: sem O/0, sem I/1/L, sem U (vira V
 * em fonte serifada). Se alguém precisar digitar o código à mão porque
 * a câmera não leu o QR, não erra.
 */
const ALFABETO = "23456789abcdefghjkmnpqrstvwxyz";
const TAMANHO_CODIGO = 6;

/**
 * Gera um código curto aleatório. 30^6 ≈ 729 milhões de combinações —
 * colisão é improvável, mas quem grava confere no índice unique da
 * tabela e tenta de novo.
 */
export function gerarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(TAMANHO_CODIGO));
  let out = "";
  for (const b of bytes) out += ALFABETO[b % ALFABETO.length];
  return out;
}

/** Aceita só o formato que a gente gera — barra lixo antes de ir ao banco. */
export function codigoValido(codigo: string): boolean {
  return new RegExp(`^[${ALFABETO}]{${TAMANHO_CODIGO}}$`).test(codigo);
}

/**
 * Um irmão que divide o card. Tem foto e vídeo próprios: juntar dois
 * irmãos numa foto só obriga a cortar os dois, e cada criança gravou
 * o seu recado.
 */
export interface Irmao {
  nome: string;
  /** Preenchido quando o irmão também é aluno da escola. */
  aluno_id: string | null;
  foto_path: string | null;
  video_path: string | null;
}

export interface VideoPais {
  id: string;
  codigo: string;
  evento_id: string | null;
  aluno_id: string | null;
  aluno_nome: string;
  /** Irmãos que dividem este card. Vazio = card de um aluno só. */
  irmaos_dados: Irmao[];
  /** true = um vídeo só pelos irmãos todos; false = um por criança. */
  video_conjunto: boolean;
  serie: string | null;
  turma: string | null;
  video_path: string | null;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Todo mundo que aparece no card: o aluno principal e os irmãos, cada
 * um com sua foto e seu vídeo. Quem desenha o card e a página itera
 * sobre isso em vez de tratar o principal como caso especial.
 */
export function participantesDoCard(
  v: Pick<
    VideoPais,
    "aluno_nome" | "foto_path" | "video_path" | "irmaos_dados"
  >,
): Irmao[] {
  return [
    {
      nome: v.aluno_nome,
      aluno_id: null,
      foto_path: v.foto_path,
      video_path: v.video_path,
    },
    ...(v.irmaos_dados ?? []),
  ];
}

/**
 * Os vídeos que a página deve mostrar.
 *
 * Com `video_conjunto`, a família gravou um vídeo só com as crianças
 * juntas: aparece um player, sem nome em cima (os dois estão ali). Sem
 * ele, cada criança tem o seu e o nome identifica quem é quem.
 *
 * As FOTOS não seguem essa regra — são sempre uma por criança, porque
 * enquadrar dois irmãos num retrato só obriga a cortar os dois.
 */
export function videosDoCard(
  v: Pick<
    VideoPais,
    | "aluno_nome"
    | "foto_path"
    | "video_path"
    | "irmaos_dados"
    | "video_conjunto"
  >,
): { nome: string; video_path: string | null; foto_path: string | null }[] {
  const todos = participantesDoCard(v);
  if (v.video_conjunto) {
    return [
      { nome: nomesDoCard(v), video_path: v.video_path, foto_path: v.foto_path },
    ];
  }
  return todos;
}

/**
 * Ordena por série (na ordem pedagógica), depois turma, depois nome.
 *
 * Ordenar série como texto sai errado: alfabeticamente "1º Ano" vem antes
 * de "Maternalzinho(2)", e os cards seriam entregues fora da ordem das
 * turmas. A referência é SERIES_DISPONIVEIS, que já está na sequência
 * certa (Maternalzinho → Maternal → Grupo IV/V → 1º ao 9º).
 *
 * Série desconhecida vai pro fim em vez de virar a primeira.
 */
export function ordenarPorTurma<
  T extends { serie: string | null; turma: string | null; aluno_nome: string },
>(lista: T[]): T[] {
  const posicao = (serie: string | null) => {
    const i = SERIES_DISPONIVEIS.indexOf(
      serie as (typeof SERIES_DISPONIVEIS)[number],
    );
    return i === -1 ? SERIES_DISPONIVEIS.length : i;
  };

  return [...lista].sort(
    (a, b) =>
      posicao(a.serie) - posicao(b.serie) ||
      (a.turma ?? "").localeCompare(b.turma ?? "", "pt-BR") ||
      a.aluno_nome.localeCompare(b.aluno_nome, "pt-BR"),
  );
}

/**
 * Como o nome aparece no card e na página: "Maria e João" para dois,
 * "Maria, João e Ana" para três.
 *
 * O pai com dois filhos leva UM card só, então os dois nomes precisam
 * caber na mesma linha — por isso a lista usa "e" e não quebra.
 */
export function nomesDoCard(v: Pick<VideoPais, "aluno_nome" | "irmaos_dados">) {
  const todos = [
    v.aluno_nome,
    ...(v.irmaos_dados ?? []).map((i) => i.nome),
  ].filter(Boolean);
  if (todos.length === 1) return todos[0];
  return `${todos.slice(0, -1).join(", ")} e ${todos[todos.length - 1]}`;
}

/**
 * URL completa que vai dentro do QR code.
 *
 * Curta de propósito (/p/<codigo>): menos dado no QR = menos módulos =
 * leitura confiável mesmo impresso pequeno, em papel comum, com a câmera
 * tremendo. Cai pro domínio de produção quando NEXT_PUBLIC_SITE_URL não
 * estiver definida, porque um QR impresso com "localhost" é papel perdido.
 */
export function urlDoQr(codigo: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://escolaamadeus.com"
  ).replace(/\/$/, "");
  return `${base}/p/${codigo}`;
}
