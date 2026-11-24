import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** A revisão das professoras (formatura_amigos_revisao), por aluno. */
export interface Revisao {
  nomeAmigo: string | null;
  observacao: string | null;
  conferido: boolean;
  conferidoPor: string | null;
  conferidoEm: string | null;
  aplicadoNaIlha: boolean;
}

export async function revisoesDe(alunoIds: string[]): Promise<Map<string, Revisao>> {
  const m = new Map<string, Revisao>();
  if (!alunoIds.length) return m;
  const { data } = await createAdminClient()
    .from("formatura_amigos_revisao")
    .select("aluno_id, nome_amigo, observacao, conferido, conferido_por, conferido_em, aplicado_na_ilha")
    .in("aluno_id", alunoIds);
  for (const r of data ?? []) {
    m.set(r.aluno_id, {
      nomeAmigo: r.nome_amigo,
      observacao: r.observacao,
      conferido: r.conferido,
      conferidoPor: r.conferido_por,
      conferidoEm: r.conferido_em,
      aplicadoNaIlha: r.aplicado_na_ilha,
    });
  }
  return m;
}
