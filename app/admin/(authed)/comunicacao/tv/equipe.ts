import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Quem é da equipe Arboria na TV (Pedro, 12/11/2026): a ordem e o tempo das telas são decisão nossa;
 * a escola só preenche o conteúdo, liga/desliga e cria telas. A lista vem de TV_EQUIPE_EMAILS
 * (e-mails separados por vírgula, na Vercel). No PC, sem a lista, todo mundo conta como equipe para testar.
 */
export async function ehEquipeTv(): Promise<boolean> {
  const { data } = await (await createClient()).auth.getUser();
  const email = data.user?.email?.toLowerCase();
  const lista = (process.env.TV_EQUIPE_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!lista.length) return process.env.NODE_ENV !== "production";
  return !!email && lista.includes(email);
}
