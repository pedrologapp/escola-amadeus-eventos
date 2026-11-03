"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { buscarAlunos, type AlunoBusca } from "@/lib/buscar-alunos";

/**
 * A lista de alunos não é mais legível sem login (03/11/2026, RLS fechado na migração 0075). O formulário público
 * de inscrição busca aqui, no servidor: só alunos das séries/turmas do evento, só de evento publicado, no máximo 10
 * por vez e com pelo menos 2 letras — o mesmo que a tela já mostrava, sem abrir a tabela inteira.
 */

async function filtrosDoEvento(eventoId: string) {
  const { data } = await createAdminClient()
    .from("eventos")
    .select("series_permitidas, turmas_permitidas")
    .eq("id", eventoId)
    .eq("status", "publicado")
    .maybeSingle();
  return data as { series_permitidas: string[] | null; turmas_permitidas: string[] | null } | null;
}

export async function buscarAlunosDoEvento(eventoId: string, termo: string): Promise<AlunoBusca[]> {
  const t = (termo ?? "").toString().trim();
  if (t.length < 2 || t.length > 80) return [];
  const ev = await filtrosDoEvento(eventoId);
  if (!ev) return [];
  return buscarAlunos(createAdminClient(), t, { series: ev.series_permitidas, turmas: ev.turmas_permitidas });
}

/** Irmãos do aluno escolhido, para o pagamento familiar (só em evento publicado com essa opção). */
export async function irmaosDoAluno(eventoId: string, alunoId: string): Promise<AlunoBusca[]> {
  const db = createAdminClient();
  const { data: ev } = await db.from("eventos").select("pagamento_familiar").eq("id", eventoId).eq("status", "publicado").maybeSingle();
  if (!ev?.pagamento_familiar) return [];
  const { data: eu } = await db.from("alunos").select("familia_id").eq("id", alunoId).maybeSingle();
  if (!eu?.familia_id) return [];
  const { data } = await db
    .from("alunos")
    .select("id, nome_completo, serie, turma")
    .eq("familia_id", eu.familia_id)
    .neq("id", alunoId)
    .order("nome_completo");
  return (data as AlunoBusca[]) ?? [];
}
