"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BlocoTv, TipoItem } from "@/lib/tv";

/** O que a equipe cadastra para a TV e a ordem/tempo dos blocos. */

type Resultado = { ok: true } | { ok: false; erro: string };

async function logado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

const TIPOS: TipoItem[] = ["aviso", "recado", "agenda", "frase", "curiosidade", "comemoracao"];
const data = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export interface ItemForm {
  id?: string;
  tipo: TipoItem;
  titulo: string;
  texto: string;
  icone: string;
  data: string;
  inicio: string;
  fim: string;
}

export async function salvarItem(f: ItemForm): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!TIPOS.includes(f.tipo)) return { ok: false, erro: "Tipo inválido." };
  const titulo = f.titulo.trim().slice(0, 200);
  if (!titulo) return { ok: false, erro: "Escreva o texto principal." };
  if ((f.tipo === "agenda" || f.tipo === "comemoracao") && !data(f.data)) return { ok: false, erro: "Escolha o dia." };
  if (data(f.inicio) && data(f.fim) && f.inicio > f.fim) return { ok: false, erro: "O “até” está antes do “a partir de”." };
  const linha = {
    tipo: f.tipo,
    titulo,
    texto: f.texto.trim().slice(0, 300),
    icone: f.icone.trim().slice(0, 16) || null,
    data: data(f.data),
    inicio: data(f.inicio),
    fim: data(f.fim),
  };
  const db = createAdminClient();
  const { error } = f.id ? await db.from("tv_itens").update(linha).eq("id", f.id) : await db.from("tv_itens").insert(linha);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin/comunicacao/tv");
  return { ok: true };
}

export async function ativarItem(id: string, ativo: boolean): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_itens").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin/comunicacao/tv");
  return { ok: true };
}

export async function apagarItem(id: string): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_itens").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin/comunicacao/tv");
  return { ok: true };
}

export async function salvarBlocos(blocos: BlocoTv[]): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linhas = blocos.map((b, i) => ({ id: b.id, ativo: !!b.ativo, ordem: i + 1, segundos: Math.max(4, Math.min(60, Math.round(b.segundos))) }));
  const { error } = await createAdminClient().from("tv_blocos").upsert(linhas);
  if (error) return { ok: false, erro: error.message };
  revalidatePath("/admin/comunicacao/tv");
  return { ok: true };
}
