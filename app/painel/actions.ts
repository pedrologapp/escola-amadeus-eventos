"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type EstadoLogin = { erro?: string } | null;

/** Entrar no painel: cada pessoa com o seu e-mail e senha (as contas do Supabase da escola). */
export async function entrar(_antes: EstadoLogin, form: FormData): Promise<EstadoLogin> {
  const email = form.get("email")?.toString().trim();
  const senha = form.get("senha")?.toString();
  if (!email || !senha) return { erro: "Preencha o e-mail e a senha." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };
  redirect("/painel");
}

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/painel/login");
}
