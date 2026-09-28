"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Marca a conversa como resolvida ou ignorada (sai da lista). Não envia nada no WhatsApp. */
export async function marcarConversa(chatId: string, status: "resolvida" | "ignorada" | "aguardando") {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await createAdminClient()
    .from("whatsapp_conversas")
    .update({ status, resolvido_em: status === "aguardando" ? null : new Date().toISOString() })
    .eq("chat_id", chatId);
  revalidatePath("/admin/comunicacao/whatsapp");
  return { ok: true };
}
