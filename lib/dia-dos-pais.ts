import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dia dos Pais — vídeos dos alunos.
 *
 * Cada aluno tem um vídeo e um código curto. O card impresso (1/4 de
 * folha ofício) traz um QR apontando para /p/<codigo>.
 *
 * Os arquivos ficam num bucket PRIVADO: são vídeos de crianças, então
 * nada é servido por URL pública permanente. A página gera uma signed
 * URL de curta duração a cada visita.
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
  aluno_id: string | null;
  aluno_nome: string;
  serie: string | null;
  turma: string | null;
  video_path: string | null;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * URL temporária pra um arquivo do bucket privado.
 * Retorna null se o path for null ou o arquivo não existir — quem chama
 * decide o fallback (card sem foto, página "vídeo chegando").
 */
export async function assinarArquivo(
  path: string | null,
  segundos: number,
): Promise<string | null> {
  if (!path) return null;
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_DIA_DOS_PAIS)
    .createSignedUrl(path, segundos);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Assina vários arquivos de uma vez. A folha de impressão precisa de até
 * 70 fotos; uma chamada só evita 70 idas ao Storage.
 *
 * Devolve um mapa path → URL assinada (paths que falharem ficam de fora).
 */
export async function assinarVarios(
  paths: (string | null)[],
  segundos: number,
): Promise<Map<string, string>> {
  const limpos = [...new Set(paths.filter((p): p is string => !!p))];
  const mapa = new Map<string, string>();
  if (limpos.length === 0) return mapa;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET_DIA_DOS_PAIS)
    .createSignedUrls(limpos, segundos);
  if (error || !data) return mapa;

  for (const item of data) {
    if (item.signedUrl && item.path) mapa.set(item.path, item.signedUrl);
  }
  return mapa;
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
