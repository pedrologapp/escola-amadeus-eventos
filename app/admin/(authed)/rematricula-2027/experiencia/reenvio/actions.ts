"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { enviarConvite2410 } from "@/lib/experiencia-2410";

const CAMINHO = "/admin/rematricula-2027/experiencia/reenvio";

async function logado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

/** Recebe (true), não recebe (false) ou ainda sem decisão (null). */
export async function marcarEnvio(telefones: string[], enviar: boolean | null) {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo no admin." };
  const { error } = await createAdminClient().from("experiencia_contatos").update({ enviar_2410: enviar }).in("telefone", telefones);
  revalidatePath(CAMINHO);
  return error ? { ok: false, erro: error.message } : { ok: true };
}

export interface ResultadoReenvio { telefone: string; ok: boolean; detalhe?: string }

/** Envia o modelo da YCloud para os marcados que ainda não receberam. O painel chama em lotes de 15 (cada chamada termina rápido). */
export async function enviarReenvio(telefones: string[]): Promise<{ ok: boolean; erro?: string; resultados: ResultadoReenvio[] }> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo no admin.", resultados: [] };
  const db = createAdminClient();
  const { data } = await db.from("experiencia_contatos").select("telefone").in("telefone", telefones).eq("enviar_2410", true).is("convite_2410_em", null);
  const resultados: ResultadoReenvio[] = [];
  for (const [i, c] of (data ?? []).entries()) {
    if (i > 0) await new Promise((r) => setTimeout(r, 700)); // API oficial: sem risco de bloqueio, só um respiro entre envios
    const r = await enviarConvite2410(c.telefone as string);
    await db.from("experiencia_contatos").update({ convite_2410_status: r.ok ? "enviado" : `erro: ${r.detalhe ?? ""}`, ...(r.ok ? { convite_2410_em: new Date().toISOString() } : {}) }).eq("telefone", c.telefone);
    resultados.push({ telefone: c.telefone as string, ...r });
  }
  revalidatePath(CAMINHO);
  return { ok: true, resultados };
}
