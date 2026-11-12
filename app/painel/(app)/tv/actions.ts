"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TV, type BlocoTv } from "@/lib/tv";
import { ehEquipeTv } from "./equipe";
import { FIXOS } from "./fixos";

/**
 * Ações do gerenciador novo (Pedro, 12/11/2026): a escola é livre para ligar, desligar, mudar a ordem e o tempo.
 * Só as telas fixas do Arboria (./fixos.ts) ficam no lugar e não se desligam, a não ser pela equipe Arboria.
 */

type Resultado = { ok: true } | { ok: false; erro: string };

function mudou() {
  revalidateTag(ETIQUETA_TV, { expire: 0 });
  revalidatePath("/painel/tv");
  revalidatePath("/admin/comunicacao/tv");
}

async function logado() {
  const { data } = await (await createClient()).auth.getUser();
  return !!data.user;
}

/** Liga ou desliga uma tela. */
export async function ligarBloco(id: string, ativo: boolean): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (FIXOS[id] && !(await ehEquipeTv())) return { ok: false, erro: "Esta tela é fixa do Arboria." };
  const { error } = await createAdminClient().from("tv_blocos").update({ ativo: !!ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

/** Ordem e tempo das telas. Para a escola, as fixas voltam para o lugar delas e mantêm o que já tinham. */
export async function ordenarBlocos(blocos: BlocoTv[]): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  let lista = blocos;
  if (!(await ehEquipeTv())) {
    const { data: atuais, error } = await db.from("tv_blocos").select("id, ativo, segundos");
    if (error) return { ok: false, erro: error.message };
    const antes = new Map((atuais ?? []).map((b) => [b.id as string, b]));
    lista = blocos.map((b) => (FIXOS[b.id] && antes.has(b.id) ? { ...b, ativo: !!antes.get(b.id)!.ativo, segundos: Number(antes.get(b.id)!.segundos) } : b));
    const livres = lista.filter((b) => !FIXOS[b.id]);
    const inicio = lista.filter((b) => FIXOS[b.id] === "inicio");
    const fim = lista.filter((b) => FIXOS[b.id] === "fim");
    lista = [...inicio, ...livres, ...fim];
  }
  const linhas = lista.map((b, i) => ({ id: b.id, ativo: !!b.ativo, ordem: i + 1, segundos: Math.max(4, Math.min(60, Math.round(b.segundos))) }));
  const { error } = await db.from("tv_blocos").upsert(linhas);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}
