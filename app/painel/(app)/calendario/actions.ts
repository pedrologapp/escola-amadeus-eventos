"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TIPOS_CALENDARIO } from "@/lib/painel";

async function quem() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export type EstadoItem = { ok?: boolean; erro?: string } | null;

/** Novo item no calendário (qualquer pessoa logada). Guarda quem cadastrou. */
export async function adicionarItem(_antes: EstadoItem, form: FormData): Promise<EstadoItem> {
  const user = await quem();
  if (!user) return { erro: "Sessão expirada. Entre de novo." };
  const titulo = String(form.get("titulo") ?? "").trim().slice(0, 140);
  const data = String(form.get("data") ?? "");
  const ate = String(form.get("ate") ?? "") || null;
  const tipo = String(form.get("tipo") ?? "evento");
  if (titulo.length < 2) return { erro: "Escreva o que vai acontecer." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return { erro: "Escolha a data." };
  if (ate && (!/^\d{4}-\d{2}-\d{2}$/.test(ate) || ate < data)) return { erro: "O último dia tem que ser depois do primeiro." };
  if (!TIPOS_CALENDARIO.some((t) => t.valor === tipo)) return { erro: "Escolha o tipo." };
  const { error } = await createAdminClient().from("calendario_itens").insert({
    titulo, data, ate: ate && ate !== data ? ate : null, tipo,
    hora: String(form.get("hora") ?? "").trim().slice(0, 20) || null,
    responsavel: String(form.get("responsavel") ?? "").trim().slice(0, 80) || null,
    observacao: String(form.get("observacao") ?? "").trim().slice(0, 300) || null,
    criado_por: String(user.user_metadata?.nome ?? user.email ?? "").split("@")[0],
  });
  if (error) return { erro: "Não consegui salvar agora. Tente de novo." };
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
  return { ok: true };
}

export async function removerItem(id: string) {
  if (!(await quem())) return;
  await createAdminClient().from("calendario_itens").delete().eq("id", id);
  revalidatePath("/painel/calendario");
  revalidatePath("/painel");
}
