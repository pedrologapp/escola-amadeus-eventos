"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TV, type BlocoTv } from "@/lib/tv";
import { ehEquipeTv } from "./equipe";

/** Ações do gerenciador novo: a escola liga/desliga; ordem e tempo só a equipe Arboria. */

type Resultado = { ok: true } | { ok: false; erro: string };

function mudou() {
  revalidateTag(ETIQUETA_TV, { expire: 0 });
  revalidatePath("/painel/tv");
  revalidatePath("/admin/comunicacao/tv");
}

/** Liga ou desliga uma tela (qualquer pessoa com login). */
export async function ligarBloco(id: string, ativo: boolean): Promise<Resultado> {
  const { data } = await (await createClient()).auth.getUser();
  if (!data.user) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_blocos").update({ ativo: !!ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

/** Ordem e tempo das telas (só a equipe Arboria). */
export async function ordenarBlocos(blocos: BlocoTv[]): Promise<Resultado> {
  if (!(await ehEquipeTv())) return { ok: false, erro: "A ordem e o tempo são ajustados pela equipe Arboria." };
  const linhas = blocos.map((b, i) => ({ id: b.id, ativo: !!b.ativo, ordem: i + 1, segundos: Math.max(4, Math.min(60, Math.round(b.segundos))) }));
  const { error } = await createAdminClient().from("tv_blocos").upsert(linhas);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}
