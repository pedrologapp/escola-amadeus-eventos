"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CAMINHO = "/admin/arboria-experiencia";

async function logado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login de novo.");
}

/** "Começar reunião": marca a hora. Só quem se cadastrar depois disso recebe a história. */
export async function comecarReuniao() {
  await logado();
  const agora = new Date().toISOString();
  await createAdminClient().from("arboria_exp_reuniao").update({ iniciada_em: agora, liberada_em: null, atividade_em: null, atividade_fase: null, atualizado_em: agora }).eq("id", 1);
  revalidatePath(CAMINHO);
}

/** "Liberar histórias": todos os celulares cadastrados depois do começo abrem a história. */
export async function liberarHistorias() {
  await logado();
  const agora = new Date().toISOString();
  await createAdminClient().from("arboria_exp_reuniao").update({ liberada_em: agora, atualizado_em: agora }).eq("id", 1);
  revalidatePath(CAMINHO);
}

/** Desfaz o "liberar" (se apertou antes da hora). */
export async function recolherHistorias() {
  await logado();
  await createAdminClient().from("arboria_exp_reuniao").update({ liberada_em: null, atualizado_em: new Date().toISOString() }).eq("id", 1);
  revalidatePath(CAMINHO);
}

/** Para o telão: em que pé está a reunião e quantas crianças já foram cadastradas depois do começo. */
export async function situacaoTelao() {
  await logado();
  const db = createAdminClient();
  const { data: r } = await db.from("arboria_exp_reuniao").select("iniciada_em, liberada_em, atividade_em, atividade_fase").eq("id", 1).single();
  let criancas = 0, familias = 0, r1 = 0, r2 = 0; const formas: Record<string, number> = {};
  if (r?.iniciada_em) {
    const { data: cs } = await db.from("arboria_exp_criancas").select("familia").gte("criado_em", r.iniciada_em);
    criancas = cs?.length ?? 0;
    familias = new Set((cs ?? []).map((c) => c.familia)).size;
  }
  if (r?.atividade_em) {
    // só contagens: quantos já fizeram cada rodada e quantos escolheram cada forma (nunca o resultado de ninguém)
    const { data: at } = await db.from("arboria_exp_atividade").select("r1, forma, r2").gte("criado_em", r.atividade_em);
    for (const x of at ?? []) { if (x.r1 !== null) r1++; if (x.r2 !== null) r2++; if (x.forma) formas[x.forma] = (formas[x.forma] ?? 0) + 1; }
  }
  return { iniciada: r?.iniciada_em ?? null, liberada: r?.liberada_em ?? null, fase: (r?.atividade_fase ?? null) as string | null, criancas, familias, r1, r2, formas };
}

/** Abre uma fase da atividade no celular dos pais: "r1" (1ª rodada), "forma" (escolher a forma), "r2" (2ª rodada), null (fecha). */
export async function faseAtividade(fase: "r1" | "forma" | "r2" | null) {
  await logado();
  const db = createAdminClient();
  const agora = new Date().toISOString();
  const { data: r } = await db.from("arboria_exp_reuniao").select("atividade_em").eq("id", 1).single();
  // a primeira fase marca o começo da atividade (respostas de ensaios antes disso não contam)
  await db.from("arboria_exp_reuniao").update({ atividade_fase: fase, ...(fase === "r1" || !r?.atividade_em ? { atividade_em: agora } : {}), atualizado_em: agora }).eq("id", 1);
}
