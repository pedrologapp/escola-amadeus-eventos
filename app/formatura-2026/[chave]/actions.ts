"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_PLACA, ID_PLACA, blocoValido, campoTextoValido, chavePlacaValida, type Ajuste, type Ajustes, type DadosPlaca } from "@/lib/formatura-placa";

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

/** A direção aprova (ou desfaz a aprovação) da foto da turma que está na placa. */
export async function aprovarFotoTurma(chave: string, turma: "a" | "b", aprovada: boolean) {
  if (!chavePlacaValida(chave) || (turma !== "a" && turma !== "b")) return negado;
  return gravarDados({ ...(await lerDados()), [turma === "a" ? "turma_a_aprovada" : "turma_b_aprovada"]: !!aprovada });
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

async function criancaExiste(nome: string) {
  const { data } = await createAdminClient().from("formatura_placa_aluno").select("nome").eq("nome", nome).maybeSingle();
  return !!data;
}
const desaprovar = (nome: string) =>
  createAdminClient().from("formatura_placa_aluno").update({ aprovada: false, atualizado_em: new Date().toISOString() }).eq("nome", nome);

/** Tamanho e posição de um bloco de texto: em todas as placas (nome = null) ou só na placa de uma criança. */
export async function salvarAjuste(chave: string, nome: string | null, bloco: string, ajuste: Ajuste) {
  if (!chavePlacaValida(chave) || !blocoValido(bloco)) return negado;
  const inteiro = (v: unknown, lim: number) => Number.isInteger(v) && Math.abs(v as number) <= lim;
  if (!inteiro(ajuste?.t, 12) || !inteiro(ajuste?.x, 600) || !inteiro(ajuste?.y, 600)) return { ok: false as const, erro: "Ajuste inválido." };
  const a: Ajuste = { t: ajuste.t, x: ajuste.x, y: ajuste.y };
  const vazio = !a.t && !a.x && !a.y;
  const dados = await lerDados();
  if (nome === null) {
    const g: Ajustes = { ...(dados.ajustes ?? {}) };
    if (vazio) delete g[bloco]; else g[bloco] = a;
    return gravarDados({ ...dados, ajustes: g });
  }
  if (!(await criancaExiste(nome))) return { ok: false as const, erro: "Criança não encontrada." };
  const todos = { ...(dados.ajustes_aluno ?? {}) };
  const meu: Ajustes = { ...(todos[nome] ?? {}) };
  if (vazio) delete meu[bloco]; else meu[bloco] = a;
  todos[nome] = meu;
  const r = await gravarDados({ ...dados, ajustes_aluno: todos });
  if (r.ok) await desaprovar(nome); // a placa mudou: volta a esperar aprovação
  return r;
}

/** Nome da criança como aparece na placa (vazio = o nome do cadastro). */
export async function salvarNomePlaca(chave: string, nome: string, valor: string) {
  if (!chavePlacaValida(chave)) return negado;
  if (!(await criancaExiste(nome))) return { ok: false as const, erro: "Criança não encontrada." };
  const limpo = String(valor ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const dados = await lerDados();
  const nomes = { ...(dados.nomes_placa ?? {}) };
  if (!limpo || limpo === nome) delete nomes[nome]; else nomes[nome] = limpo;
  const r = await gravarDados({ ...dados, nomes_placa: nomes });
  if (r.ok) await desaprovar(nome);
  return r;
}

type TipoFoto = "beca" | "familia";
const tipoValido = (t: string): t is TipoFoto => t === "beca" || t === "familia";

/** Endereço para a direção subir uma foto própria da criança (beca ou família), mesmo onde o fotógrafo já escolheu. */
export async function prepararFotoCrianca(chave: string, nome: string, tipo: string) {
  if (!chavePlacaValida(chave) || !tipoValido(tipo)) return negado;
  const { data: aluno } = await createAdminClient().from("formatura_placa_aluno").select("nome").eq("nome", nome).maybeSingle();
  if (!aluno) return { ok: false as const, erro: "Criança não encontrada." };
  const path = `${ID_PLACA}/enviadas/${tipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_PLACA).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

/** A foto enviada entra como mais uma opção e já vai para a placa (a placa volta a esperar aprovação). */
export async function salvarFotoCrianca(chave: string, nome: string, tipo: string, path: string) {
  if (!chavePlacaValida(chave) || !tipoValido(tipo)) return negado;
  if (!new RegExp(`^${ID_PLACA}/enviadas/${tipo}-\\d+-[a-z0-9]+\\.jpg$`).test(path)) return { ok: false as const, erro: "Arquivo inválido." };
  const db = createAdminClient();
  const [pasta, arquivo] = [path.slice(0, path.lastIndexOf("/")), path.slice(path.lastIndexOf("/") + 1)];
  const { data: achou } = await db.storage.from(BUCKET_PLACA).list(pasta, { search: arquivo });
  if (!achou?.length) return { ok: false as const, erro: "A foto não chegou. Tente de novo." };
  const campo = tipo === "beca" ? "fotos_beca" : "fotos_familia";
  const { data: aluno } = await db.from("formatura_placa_aluno").select("fotos_beca, fotos_familia").eq("nome", nome).maybeSingle();
  if (!aluno) return { ok: false as const, erro: "Criança não encontrada." };
  const lista = [...(((aluno as Record<string, unknown>)[campo] as string[]) ?? []), path];
  const { error } = await db.from("formatura_placa_aluno").update({
    [campo]: lista, [tipo === "beca" ? "escolha_beca" : "escolha_familia"]: lista.length - 1, aprovada: false, atualizado_em: new Date().toISOString(),
    ...(tipo === "familia" && { observacao: null }),
  }).eq("nome", nome);
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  const { data: assinada } = await db.storage.from(BUCKET_PLACA).createSignedUrl(path, 60 * 60 * 8);
  return { ok: true as const, url: assinada?.signedUrl ?? "", indice: lista.length - 1 };
}
