"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_PLACA, ID_PLACA, campoTextoValido, chavePlacaValida, type DadosPlaca } from "@/lib/formatura-placa";

const negado = { ok: false as const, erro: "Link inválido." };

async function lerDados(): Promise<DadosPlaca> {
  const { data } = await createAdminClient().from("formatura_placa").select("dados").eq("id", ID_PLACA).maybeSingle();
  return (data?.dados as DadosPlaca) ?? {};
}

async function gravarDados(novo: DadosPlaca) {
  const { error } = await createAdminClient().from("formatura_placa").upsert({ id: ID_PLACA, dados: novo, atualizado_em: new Date().toISOString() });
  return error ? { ok: false as const, erro: "Não consegui salvar. Tente de novo." } : { ok: true as const };
}

/** Oradora, juramentista, professoras e demais professores (vale para todas as placas). */
export async function salvarCampo(chave: string, campo: string, valor: string) {
  if (!chavePlacaValida(chave)) return negado;
  if (!campoTextoValido(campo)) return { ok: false as const, erro: "Campo inválido." };
  const limpo = String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  return gravarDados({ ...(await lerDados()), [campo]: limpo });
}

/** Endereço para o navegador subir a foto da turma direto no storage. */
export async function prepararFotoTurma(chave: string, turma: "a" | "b") {
  if (!chavePlacaValida(chave) || (turma !== "a" && turma !== "b")) return negado;
  const path = `${ID_PLACA}/turma-${turma}-${Date.now()}.jpg`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_PLACA).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

export async function salvarFotoTurma(chave: string, turma: "a" | "b", path: string) {
  if (!chavePlacaValida(chave) || (turma !== "a" && turma !== "b")) return negado;
  if (!new RegExp(`^${ID_PLACA}/turma-${turma}-\\d+\\.jpg$`).test(path)) return { ok: false as const, erro: "Arquivo inválido." };
  const db = createAdminClient();
  const [pasta, nome] = path.split("/");
  const { data: achou } = await db.storage.from(BUCKET_PLACA).list(pasta, { search: nome });
  if (!achou?.length) return { ok: false as const, erro: "A foto não chegou. Tente de novo." };
  const dados = await lerDados();
  const campo = turma === "a" ? "foto_turma_a" : "foto_turma_b";
  const antiga = dados[campo];
  const r = await gravarDados({ ...dados, [campo]: path });
  const sugestoes = (turma === "a" ? dados.sugestoes_turma_a : dados.sugestoes_turma_b) ?? [];
  if (r.ok && antiga && antiga !== path && !sugestoes.includes(antiga)) await db.storage.from(BUCKET_PLACA).remove([antiga]);
  if (!r.ok) return r;
  const { data: assinada } = await db.storage.from(BUCKET_PLACA).createSignedUrl(path, 60 * 60 * 8);
  return { ok: true as const, url: assinada?.signedUrl ?? null };
}

/** Usa uma das fotos de turma sugeridas pelo fotógrafo (sem apagar as outras sugestões). */
export async function escolherFotoTurma(chave: string, turma: "a" | "b", indice: number) {
  if (!chavePlacaValida(chave) || (turma !== "a" && turma !== "b")) return negado;
  const dados = await lerDados();
  const sugestoes = (turma === "a" ? dados.sugestoes_turma_a : dados.sugestoes_turma_b) ?? [];
  const path = sugestoes[indice];
  if (!path) return { ok: false as const, erro: "Opção inválida." };
  const db = createAdminClient();
  const campo = turma === "a" ? "foto_turma_a" : "foto_turma_b";
  const antiga = dados[campo];
  const r = await gravarDados({ ...dados, [campo]: path });
  if (!r.ok) return r;
  if (antiga && antiga !== path && !sugestoes.includes(antiga)) await db.storage.from(BUCKET_PLACA).remove([antiga]);
  return { ok: true as const };
}

/** Escolha entre as opções de foto que o fotógrafo deixou, e a aprovação da placa. */
export async function salvarEscolha(chave: string, nome: string, mudanca: { beca?: number; familia?: number; aprovada?: boolean }) {
  if (!chavePlacaValida(chave)) return negado;
  const db = createAdminClient();
  const { data: aluno } = await db.from("formatura_placa_aluno").select("fotos_beca, fotos_familia").eq("nome", nome).maybeSingle();
  if (!aluno) return { ok: false as const, erro: "Criança não encontrada." };
  const upd: Record<string, unknown> = { atualizado_em: new Date().toISOString() };
  const dentro = (i: unknown, lista: unknown) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < (Array.isArray(lista) ? lista.length : 0);
  if (mudanca.beca !== undefined) { if (!dentro(mudanca.beca, aluno.fotos_beca)) return { ok: false as const, erro: "Opção inválida." }; upd.escolha_beca = mudanca.beca; }
  if (mudanca.familia !== undefined) { if (!dentro(mudanca.familia, aluno.fotos_familia)) return { ok: false as const, erro: "Opção inválida." }; upd.escolha_familia = mudanca.familia; }
  if (mudanca.aprovada !== undefined) upd.aprovada = !!mudanca.aprovada;
  const { error } = await db.from("formatura_placa_aluno").update(upd).eq("nome", nome);
  return error ? { ok: false as const, erro: "Não consegui salvar. Tente de novo." } : { ok: true as const };
}
