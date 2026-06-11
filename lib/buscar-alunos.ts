import type { SupabaseClient } from "@supabase/supabase-js";

export interface AlunoBusca {
  id: string;
  nome_completo: string;
  serie: string;
  turma: string;
}

interface FiltrosBusca {
  series?: string[] | null;
  turmas?: string[] | null;
  signal?: AbortSignal;
}

/**
 * Busca alunos por nome com tolerância a digitação:
 * cada palavra vira um filtro independente ("ali melo" acha
 * "Alice Melo de Oliveira") e, com a migration 0012 aplicada,
 * a comparação também ignora acentos ("jose" acha "José").
 *
 * 1ª tentativa: RPC buscar_alunos (unaccent, no banco).
 * Fallback: AND de ilikes por palavra (caso a migration ainda
 * não tenha sido rodada).
 */
export async function buscarAlunos(
  supabase: SupabaseClient,
  termo: string,
  filtros: FiltrosBusca = {},
): Promise<AlunoBusca[]> {
  const tokens = termo.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  // RPC com unaccent (migration 0012)
  let rpc = supabase
    .rpc("buscar_alunos", { termo: termo.trim() })
    .select("id, nome_completo, serie, turma");
  if (filtros.series?.length) rpc = rpc.in("serie", filtros.series);
  if (filtros.turmas?.length) rpc = rpc.in("turma", filtros.turmas);
  rpc = rpc.order("nome_completo").limit(10);
  if (filtros.signal) rpc = rpc.abortSignal(filtros.signal);

  const { data: viaRpc, error: rpcErro } = await rpc;
  if (!rpcErro) return (viaRpc as AlunoBusca[]) ?? [];

  // Fallback sem a função no banco: uma ilike por palavra
  let q = supabase.from("alunos").select("id, nome_completo, serie, turma");
  for (const t of tokens) {
    q = q.ilike("nome_completo", `%${t}%`);
  }
  if (filtros.series?.length) q = q.in("serie", filtros.series);
  if (filtros.turmas?.length) q = q.in("turma", filtros.turmas);
  let final = q.order("nome_completo").limit(10);
  if (filtros.signal) final = final.abortSignal(filtros.signal);

  const { data } = await final;
  return (data as AlunoBusca[]) ?? [];
}
