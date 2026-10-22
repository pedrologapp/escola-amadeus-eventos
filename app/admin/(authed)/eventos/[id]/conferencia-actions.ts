"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { conferirPagamentosEventos } from "@/lib/asaas-conferencia";

/** Botão "Conferir agora": confere as pendentes deste evento com o Asaas. */
export async function conferirEventoAgora(eventoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const r = await conferirPagamentosEventos({ eventoId, origem: "manual" });
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath(`/admin/eventos/${eventoId}/relatorio`);
  return r.ok
    ? { ok: true as const, conferidas: r.conferidas, corrigidas: r.corrigidas.length }
    : { ok: false as const, erro: r.erro ?? "Não consegui falar com o Asaas." };
}
