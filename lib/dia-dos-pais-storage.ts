import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_DIA_DOS_PAIS } from "@/lib/dia-dos-pais";

/**
 * Acesso ao bucket privado do Dia dos Pais.
 *
 * Fica separado de `lib/dia-dos-pais.ts` porque este módulo é
 * `server-only`: ele puxa o cliente com service role. O outro arquivo
 * guarda tipos e formatação de nome, que o painel do admin (client
 * component) também precisa — juntar os dois quebra o build.
 */

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
