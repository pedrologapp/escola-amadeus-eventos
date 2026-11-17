"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function exigirLogin() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
}

/** Aprovar ou pedir para gravar de novo uma parte. O motivo aparece para a família na página dela. */
export async function avaliarParte(envioId: string, parte: 1 | 2, status: "aprovado" | "refazer" | "pendente", motivo?: string) {
  await exigirLogin();
  if (parte !== 1 && parte !== 2) return { ok: false as const, erro: "Parte inválida." };
  const obs = status === "refazer" ? String(motivo ?? "").trim().slice(0, 300) || null : null;
  const { error } = await createAdminClient()
    .from("homenagem_9ano_envios")
    .update({ [`status${parte}`]: status, [`observacao${parte}`]: obs })
    .eq("id", envioId);
  if (error) return { ok: false as const, erro: error.message };
  revalidatePath("/admin/homenagem-9ano");
  return { ok: true as const };
}
