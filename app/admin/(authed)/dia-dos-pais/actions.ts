"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  BUCKET_DIA_DOS_PAIS,
  gerarCodigo,
  type VideoPais,
} from "@/lib/dia-dos-pais";

/**
 * Server actions do módulo Dia dos Pais.
 *
 * Upload: o arquivo NÃO passa por aqui. A action só cria uma signed
 * upload URL e o navegador manda o arquivo direto pro Storage. Server
 * action tem limite de 4MB de body (next.config.ts) — vídeo não cabe.
 */

async function exigirLogin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
  return user;
}

/**
 * Cria uma linha em videos_pais pra cada aluno das séries escolhidas
 * que ainda não tem card.
 *
 * Idempotente: rodar de novo não duplica ninguém (o índice unique em
 * aluno_id garante, e a gente filtra antes pra não gastar tentativa).
 */
export async function gerarCards(series: string[]) {
  await exigirLogin();
  if (series.length === 0) return { error: "Escolha ao menos uma série." };

  const admin = createAdminClient();

  const { data: alunos, error: erroAlunos } = await admin
    .from("alunos")
    .select("id, nome_completo, serie, turma")
    .in("serie", series)
    .order("serie")
    .order("turma")
    .order("nome_completo");

  if (erroAlunos) return { error: `Erro ao buscar alunos: ${erroAlunos.message}` };
  if (!alunos?.length) return { error: "Nenhum aluno nessas séries." };

  const { data: existentes } = await admin
    .from("videos_pais")
    .select("aluno_id");
  const jaTem = new Set((existentes ?? []).map((e) => e.aluno_id));

  const novos = alunos
    .filter((a) => !jaTem.has(a.id))
    .map((a) => ({
      codigo: gerarCodigo(),
      aluno_id: a.id,
      aluno_nome: a.nome_completo,
      serie: a.serie,
      turma: a.turma,
    }));

  if (novos.length === 0) {
    return { ok: true, criados: 0, mensagem: "Todos já tinham card." };
  }

  const { error } = await admin.from("videos_pais").insert(novos);
  if (error) return { error: `Erro ao criar cards: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true, criados: novos.length };
}

/**
 * Devolve uma URL assinada pro navegador subir o arquivo direto.
 * `upsert` ligado porque trocar a foto/vídeo de um aluno é comum
 * (saiu tremido, gravou de novo) e o path é fixo por código.
 */
export async function criarUploadUrl(
  id: string,
  tipo: "video" | "foto",
  extensao: string,
) {
  await exigirLogin();

  const admin = createAdminClient();
  const { data: linha, error: erroLinha } = await admin
    .from("videos_pais")
    .select("codigo")
    .eq("id", id)
    .single();

  if (erroLinha || !linha) return { error: "Card não encontrado." };

  const ext = extensao.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4);
  const pasta = tipo === "video" ? "videos" : "fotos";
  const path = `${pasta}/${linha.codigo}.${ext || (tipo === "video" ? "mp4" : "jpg")}`;

  const { data, error } = await admin.storage
    .from(BUCKET_DIA_DOS_PAIS)
    .createSignedUploadUrl(path, { upsert: true });

  if (error || !data) {
    return { error: `Erro ao preparar upload: ${error?.message ?? "?"}` };
  }
  return { ok: true, path, token: data.token };
}

/** Grava o path no banco depois que o navegador confirmou o upload. */
export async function confirmarUpload(
  id: string,
  tipo: "video" | "foto",
  path: string,
) {
  await exigirLogin();

  const admin = createAdminClient();
  const campo = tipo === "video" ? "video_path" : "foto_path";
  const { error } = await admin
    .from("videos_pais")
    .update({ [campo]: path, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { error: `Erro ao salvar: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}

/**
 * Remove o card e os arquivos do Storage.
 *
 * Cuidado: se o card já foi impresso e entregue, o QR do papel para de
 * funcionar. A tela avisa antes de chamar isso.
 */
export async function removerCard(id: string) {
  await exigirLogin();

  const admin = createAdminClient();
  const { data: linha } = await admin
    .from("videos_pais")
    .select("video_path, foto_path")
    .eq("id", id)
    .single<Pick<VideoPais, "video_path" | "foto_path">>();

  const paths = [linha?.video_path, linha?.foto_path].filter(
    (p): p is string => !!p,
  );
  if (paths.length) {
    await admin.storage.from(BUCKET_DIA_DOS_PAIS).remove(paths);
  }

  const { error } = await admin.from("videos_pais").delete().eq("id", id);
  if (error) return { error: `Erro ao remover: ${error.message}` };

  revalidatePath("/admin/dia-dos-pais");
  return { ok: true };
}
