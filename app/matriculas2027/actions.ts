"use server";

import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { buscarAlunos, type AlunoBusca } from "@/lib/buscar-alunos";
import { CAMPANHA_ATUAL, inscricoesAbertas } from "@/lib/matriculas-config";

/** Busca alunos no cadastro pra sugerir enquanto o pai digita. */
export async function buscarAlunosAction(termo: string): Promise<AlunoBusca[]> {
  const t = (termo ?? "").toString().trim();
  // Menos de 3 letras traria meia escola — não vale a viagem ao banco.
  if (t.length < 3) return [];

  const admin = createAdminClient();
  return buscarAlunos(admin, t);
}

export interface ConfirmacaoPayload {
  responsavelNome?: string;
  telefone?: string;
  alunoId?: string | null;
  alunoNome?: string;
  pessoas?: number;
}

export type ConfirmacaoState =
  | { ok: true; atualizou: boolean }
  | { ok: false; error: string };

/** Só dígitos — o telefone chega mascarado do formulário. */
function digitos(v: string): string {
  return v.replace(/\D/g, "");
}

export async function confirmarPresenca(
  payload: ConfirmacaoPayload,
): Promise<ConfirmacaoState> {
  const campanha = CAMPANHA_ATUAL;

  if (!inscricoesAbertas(campanha)) {
    return {
      ok: false,
      error: "As confirmações já foram encerradas. Fale com a secretaria.",
    };
  }

  const responsavelNome = (payload?.responsavelNome ?? "").toString().trim();
  if (responsavelNome.length < 3) {
    return { ok: false, error: "Digite seu nome completo." };
  }

  const telefone = digitos((payload?.telefone ?? "").toString());
  if (telefone.length < 10 || telefone.length > 11) {
    return { ok: false, error: "Digite um WhatsApp válido, com DDD." };
  }

  const alunoNomeDigitado = (payload?.alunoNome ?? "").toString().trim();
  if (alunoNomeDigitado.length < 3) {
    return { ok: false, error: "Digite o nome do seu filho ou filha." };
  }

  const pessoas = Number(payload?.pessoas);
  if (!Number.isInteger(pessoas) || pessoas < 1 || pessoas > campanha.maxPessoas) {
    return {
      ok: false,
      error: `Escolha de 1 a ${campanha.maxPessoas} pessoas.`,
    };
  }

  const admin = createAdminClient();

  // O id do aluno vem do cliente, então confirmamos no banco antes de
  // gravar — e é do banco que saem série, turma e família.
  let alunoId: string | null = null;
  let alunoNome = alunoNomeDigitado.slice(0, 160);
  let familiaId: string | null = null;
  let serie: string | null = null;
  let turma: string | null = null;

  const idCandidato = (payload?.alunoId ?? "").toString().trim();
  if (idCandidato) {
    const { data: aluno } = await admin
      .from("alunos")
      .select("id, nome_completo, serie, turma, familia_id")
      .eq("id", idCandidato)
      .maybeSingle();

    if (aluno) {
      alunoId = aluno.id;
      alunoNome = aluno.nome_completo;
      serie = aluno.serie ?? null;
      turma = aluno.turma ?? null;
      familiaId = aluno.familia_id ?? null;
    }
    // Se o id não existir mais, segue como inscrição sem vínculo —
    // a família não pode ficar de fora por causa disso.
  }

  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "";
  const meta = {
    ip,
    user_agent: (h.get("user-agent") ?? "").slice(0, 300),
    aluno_digitado: alunoNomeDigitado.slice(0, 160),
    vinculado: alunoId !== null,
  };

  const registro = {
    slug: campanha.slug,
    responsavel_nome: responsavelNome.slice(0, 160),
    telefone,
    aluno_id: alunoId,
    aluno_nome: alunoNome,
    familia_id: familiaId,
    serie,
    turma,
    pessoas,
    meta,
  };

  // Reenvio do mesmo aluno atualiza a inscrição em vez de duplicar.
  // (Índice parcial no banco também barra a duplicata em corrida.)
  if (alunoId) {
    const { data: existente } = await admin
      .from("matriculas_inscricoes")
      .select("id")
      .eq("slug", campanha.slug)
      .eq("aluno_id", alunoId)
      .maybeSingle();

    if (existente) {
      const { error } = await admin
        .from("matriculas_inscricoes")
        .update(registro)
        .eq("id", existente.id);

      if (error) {
        return { ok: false, error: "Não foi possível confirmar. Tente de novo." };
      }
      await marcarAparelho(campanha.slug);
      return { ok: true, atualizou: true };
    }
  }

  const { error } = await admin
    .from("matriculas_inscricoes")
    .insert(registro);

  if (error) {
    // 23505 = violação de índice único: alguém confirmou o mesmo aluno
    // entre a consulta acima e este insert. Não é erro pro pai.
    if (error.code === "23505") {
      await marcarAparelho(campanha.slug);
      return { ok: true, atualizou: true };
    }
    return { ok: false, error: "Não foi possível confirmar. Tente de novo." };
  }

  await marcarAparelho(campanha.slug);
  return { ok: true, atualizou: false };
}

/** Trava suave: lembra o aparelho que já confirmou (não impede de verdade). */
async function marcarAparelho(slug: string) {
  const store = await cookies();
  store.set(`matriculas_${slug}`, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
}
