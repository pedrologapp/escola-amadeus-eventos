"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET_DIARIO } from "@/lib/formatura-diario";

async function exigirLogin() {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) throw new Error("Sessão expirada. Faça login novamente.");
}

/** Apaga um registro do diário (o envio errado de uma professora), com a foto ou o áudio dele. */
export async function apagarMensagem(id: string) {
  await exigirLogin();
  const db = createAdminClient();
  const { data } = await db.from("formatura_diario_mensagens").select("arquivo").eq("id", id).maybeSingle();
  if (!data) return { ok: false as const, erro: "Registro não encontrado." };
  const { error } = await db.from("formatura_diario_mensagens").delete().eq("id", id);
  if (error) return { ok: false as const, erro: error.message };
  if (data.arquivo) await db.storage.from(BUCKET_DIARIO).remove([data.arquivo]);
  revalidatePath("/admin/formatura-diario");
  return { ok: true as const };
}

/** Revisão das professoras: marca que a troca do nome (ou a observação) já foi feita na ilha 3D. */
export async function marcarAplicadoNaIlha(alunoId: string) {
  await exigirLogin();
  const { error } = await createAdminClient().from("formatura_amigos_revisao").update({ aplicado_na_ilha: true }).eq("aluno_id", alunoId);
  if (error) return { ok: false as const, erro: error.message };
  revalidatePath("/admin/formatura-diario");
  return { ok: true as const };
}
