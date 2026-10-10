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
  await createAdminClient().from("arboria_exp_reuniao").update({ iniciada_em: agora, liberada_em: null, atualizado_em: agora }).eq("id", 1);
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
  const { data: r } = await db.from("arboria_exp_reuniao").select("iniciada_em, liberada_em").eq("id", 1).single();
  let criancas = 0, familias = 0;
  if (r?.iniciada_em) {
    const { data: cs } = await db.from("arboria_exp_criancas").select("familia").gte("criado_em", r.iniciada_em);
    criancas = cs?.length ?? 0;
    familias = new Set((cs ?? []).map((c) => c.familia)).size;
  }
  return { iniciada: r?.iniciada_em ?? null, liberada: r?.liberada_em ?? null, criancas, familias };
}
