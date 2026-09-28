"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_FOTOS, chaveDe, listarColaboradores, nomeBonito, semAcento, type Colaborador } from "@/lib/fotos-infancia";

/** Sugere nomes enquanto a pessoa digita. Só a partir de 3 letras, até 8 nomes. */
export async function buscarNome(termo: string): Promise<(Colaborador & { enviou: boolean })[]> {
  const q = semAcento(String(termo ?? ""));
  if (q.length < 3) return [];
  const partes = q.split(" ");
  const todos = await listarColaboradores().catch(() => []);
  const achados = todos.filter((c) => partes.every((p) => semAcento(c.nome).includes(p))).slice(0, 8);
  if (!achados.length) return [];
  const { data } = await createAdminClient()
    .from("fotos_infancia")
    .select("chave")
    .in("chave", achados.map((c) => chaveDe(c.id, c.nome)));
  const ja = new Set((data ?? []).map((d) => d.chave));
  return achados.map((c) => ({ ...c, enviou: ja.has(chaveDe(c.id, c.nome)) }));
}

/** Confere o nome escolhido: se veio id, ele tem que existir na lista do Activesoft. */
async function pessoa(id: number | null, nome: string) {
  const limpo = nomeBonito(String(nome ?? "").replace(/\s+/g, " ").slice(0, 120));
  if (limpo.length < 5 || !limpo.includes(" ")) return null;
  if (!id) return { id: null, nome: limpo };
  const c = (await listarColaboradores().catch(() => [])).find((x) => x.id === id);
  return c ? { id: c.id, nome: c.nome } : null;
}

/** URL para o navegador subir a foto direto no Storage (sem passar pelo limite do servidor). */
export async function prepararFoto(id: number | null, nome: string) {
  const p = await pessoa(id, nome);
  if (!p) return { ok: false as const, erro: "Escolha seu nome na lista ou digite nome e sobrenome." };
  const path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.jpg`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_FOTOS).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

/** Registra a foto já enviada. Mandar de novo troca a anterior (e apaga o arquivo velho). */
export async function salvarFoto(entrada: { id: number | null; nome: string; path: string; idade?: string }) {
  const p = await pessoa(entrada.id, entrada.nome);
  if (!p) return { ok: false as const, erro: "Escolha seu nome na lista ou digite nome e sobrenome." };
  if (!/^\d{4}-\d{2}-\d{2}\/[\w-]+\.jpg$/.test(entrada.path)) return { ok: false as const, erro: "Arquivo inválido." };
  const db = createAdminClient();
  const { data: arquivo } = await db.storage.from(BUCKET_FOTOS).list(entrada.path.split("/")[0], { search: entrada.path.split("/")[1] });
  if (!arquivo?.length) return { ok: false as const, erro: "A foto não chegou. Tente de novo." };

  const chave = chaveDe(p.id, p.nome);
  const { data: antes } = await db.from("fotos_infancia").select("arquivo").eq("chave", chave).maybeSingle();
  const { error } = await db.from("fotos_infancia").upsert({
    chave,
    colaborador_id: p.id,
    nome: p.nome,
    arquivo: entrada.path,
    idade: entrada.idade?.trim().slice(0, 40) || null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  if (antes?.arquivo && antes.arquivo !== entrada.path) await db.storage.from(BUCKET_FOTOS).remove([antes.arquivo]);
  return { ok: true as const, nome: p.nome, trocou: !!antes };
}
