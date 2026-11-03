"use server";

import { createClient } from "@/lib/supabase/server";
import { gravarLiberacao, senhaValoresValida } from "@/lib/valores-auth";
import { SENHA_NAO_CONFIGURADA, senhaAcaoConfigurada } from "@/lib/senhas";

/** Libera os valores (Cobranças e Eventos) por 8h, com a senha do admin. */
export async function liberarValores(senha: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada." };
  if (!senhaAcaoConfigurada()) return { ok: false, erro: SENHA_NAO_CONFIGURADA };
  if (!senhaValoresValida(senha)) return { ok: false, erro: "Senha incorreta." };
  await gravarLiberacao(true);
  return { ok: true };
}

export async function ocultarValores(): Promise<{ ok: boolean }> {
  await gravarLiberacao(false);
  return { ok: true };
}
