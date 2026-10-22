"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_CULMINANCIA, ehChave, frentePorChave, limparOutdoors, type Outdoor } from "@/lib/culminancia";

async function logado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

const atualizar = (chave: string) => {
  revalidatePath("/admin/culminancia");
  revalidatePath(`/admin/culminancia/${chave}`);
};

/** O que a professora mandou (corrigível aqui), a inteligência da sala e as nossas anotações. */
export async function salvarFrente(chave: string, dados: { inteligencia: string | null; professora: string; ideia_sala: string; ideia_outdoor: string; outdoors: Outdoor[]; anotacoes: string }) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const f = frentePorChave(chave);
  if (!f) return { ok: false as const, erro: "Série não encontrada." };
  const inteligencia = f.casa ?? (ehChave(dados.inteligencia) ? dados.inteligencia : null);
  const { error } = await createAdminClient().from("culminancia_frentes").upsert({
    chave, inteligencia, professora: dados.professora.trim() || null, ideia_sala: dados.ideia_sala.trim() || null, ideia_outdoor: dados.ideia_outdoor.trim() || null,
    outdoors: limparOutdoors(dados.outdoors), anotacoes: dados.anotacoes.trim() || null, atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false as const, erro: "Não consegui salvar." };
  atualizar(chave);
  return { ok: true as const };
}

/** URL para o navegador subir a imagem direto no Storage (sem o limite de tamanho do servidor). */
export async function prepararImagem(chave: string, nome: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  if (!frentePorChave(chave)) return { ok: false as const, erro: "Série não encontrada." };
  const limpo = nome.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w.-]+/g, "_").slice(-60);
  const path = `${chave}/${crypto.randomUUID()}-${limpo}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_CULMINANCIA).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio da imagem." };
  return { ok: true as const, path, token: data.token };
}

export async function registrarImagem(chave: string, tipo: "referencia" | "proposta", path: string, legenda: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  if (!frentePorChave(chave) || !path.startsWith(`${chave}/`)) return { ok: false as const, erro: "Imagem inválida." };
  const { error } = await createAdminClient().from("culminancia_imagens").insert({ frente: chave, tipo, arquivo: path, legenda: legenda.trim() || null });
  if (error) return { ok: false as const, erro: "A imagem subiu, mas não consegui registrar." };
  atualizar(chave);
  return { ok: true as const };
}

/** Aprovar uma proposta, pedir ajuste (com o que mudar) ou voltar para pendente. */
export async function avaliarProposta(id: string, status: "pendente" | "aprovada" | "ajustar", comentario: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  const { data, error } = await db.from("culminancia_imagens")
    .update({ status, comentario: status === "ajustar" ? comentario.trim() || null : null })
    .eq("id", id).eq("tipo", "proposta").select("frente").single();
  if (error || !data) return { ok: false as const, erro: "Não consegui salvar a avaliação." };
  atualizar(data.frente);
  return { ok: true as const };
}

export async function editarLegenda(id: string, legenda: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const { data, error } = await createAdminClient().from("culminancia_imagens").update({ legenda: legenda.trim() || null }).eq("id", id).select("frente").single();
  if (error || !data) return { ok: false as const, erro: "Não consegui salvar a legenda." };
  atualizar(data.frente);
  return { ok: true as const };
}

export async function apagarImagem(id: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  const { data } = await db.from("culminancia_imagens").select("frente, arquivo").eq("id", id).single();
  if (!data) return { ok: false as const, erro: "Imagem não encontrada." };
  await db.storage.from(BUCKET_CULMINANCIA).remove([data.arquivo]);
  await db.from("culminancia_imagens").delete().eq("id", id);
  atualizar(data.frente);
  return { ok: true as const };
}
