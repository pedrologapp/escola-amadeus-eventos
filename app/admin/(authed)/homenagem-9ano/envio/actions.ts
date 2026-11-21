"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Marca a conversa de um pai como resolvida (ou reabre). Não envia nada; vale também no painel do WhatsApp. */
export async function marcarResolvida(chatId: string, resolvida: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !/^\d+@c\.us$/.test(chatId)) return { ok: false };
  await createAdminClient()
    .from("whatsapp_conversas")
    .update({ status: resolvida ? "resolvida" : "aguardando", resolvido_em: resolvida ? new Date().toISOString() : null, ...(resolvida ? { ultimo_texto: null } : {}) })
    .eq("chat_id", chatId);
  revalidatePath("/admin/homenagem-9ano/envio");
  revalidatePath("/admin/comunicacao/whatsapp");
  return { ok: true };
}
