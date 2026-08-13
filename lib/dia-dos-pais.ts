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

export interface VideoPais {
  id: string;
  codigo: string;
  evento_id: string | null;
  aluno_id: string | null;
  aluno_nome: string;
  /** Irmãos que dividem este card e este vídeo. Vazio = um aluno só. */
  irmaos: string[];
  serie: string | null;
  turma: string | null;
  video_path: string | null;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Como o nome aparece no card e na página: "Maria e João" para dois,
 * "Maria, João e Ana" para três.
 *
 * O pai com dois filhos leva UM card só, então os dois nomes precisam
 * caber na mesma linha — por isso a lista usa "e" e não quebra.
 */
export function nomesDoCard(v: Pick<VideoPais, "aluno_nome" | "irmaos">) {
  const todos = [v.aluno_nome, ...(v.irmaos ?? [])].filter(Boolean);
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
