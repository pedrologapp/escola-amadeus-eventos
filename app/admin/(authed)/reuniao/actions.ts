"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CATEGORIAS,
  SLUG_REUNIAO,
  STATUS,
  type Categoria,
  type Status,
} from "@/lib/reuniao";

export type Resultado = { ok: true } | { ok: false; error: string };

const ROTA = "/admin/reuniao";

/** Muda só o status — é a ação mais usada do painel. */
export async function mudarStatus(
  id: string,
  status: Status,
): Promise<Resultado> {
  if (!STATUS.includes(status)) return { ok: false, error: "Status inválido." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("reuniao_itens")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(ROTA);
  return { ok: true };
}

export interface ItemEntrada {
  categoria?: string;
  titulo?: string;
  detalhe?: string;
  responsavel?: string;
  horario?: string;
  link?: string;
}

/** Limpa e valida o que veio do formulário. */
function normalizar(entrada: ItemEntrada) {
  const titulo = (entrada.titulo ?? "").trim();
  if (titulo.length < 2) return { erro: "Escreva o que precisa ser feito." };

  const categoria = (entrada.categoria ?? "material") as Categoria;
  if (!CATEGORIAS.includes(categoria)) return { erro: "Categoria inválida." };

  const texto = (v?: string) => {
    const t = (v ?? "").trim();
    return t ? t.slice(0, 400) : null;
  };

  return {
    dados: {
      categoria,
      titulo: titulo.slice(0, 200),
      detalhe: texto(entrada.detalhe),
      responsavel: texto(entrada.responsavel),
      horario: texto(entrada.horario),
      link: texto(entrada.link),
    },
  };
}

export async function criarItem(entrada: ItemEntrada): Promise<Resultado> {
  const { erro, dados } = normalizar(entrada);
  if (erro || !dados) return { ok: false, error: erro ?? "Dados inválidos." };

  const admin = createAdminClient();

  // Entra no fim da lista da própria categoria.
  const { data: ultimo } = await admin
    .from("reuniao_itens")
    .select("ordem")
    .eq("slug", SLUG_REUNIAO)
    .eq("categoria", dados.categoria)
    .order("ordem", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("reuniao_itens").insert({
    ...dados,
    slug: SLUG_REUNIAO,
    ordem: (ultimo?.ordem ?? 0) + 10,
  });

  if (error) return { ok: false, error: "Não foi possível adicionar." };
  revalidatePath(ROTA);
  return { ok: true };
}

export async function atualizarItem(
  id: string,
  entrada: ItemEntrada,
): Promise<Resultado> {
  const { erro, dados } = normalizar(entrada);
  if (erro || !dados) return { ok: false, error: erro ?? "Dados inválidos." };

  const admin = createAdminClient();
  const { error } = await admin
    .from("reuniao_itens")
    .update(dados)
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  revalidatePath(ROTA);
  return { ok: true };
}

export async function excluirItem(id: string): Promise<Resultado> {
  const admin = createAdminClient();
  const { error } = await admin.from("reuniao_itens").delete().eq("id", id);

  if (error) return { ok: false, error: "Não foi possível excluir." };
  revalidatePath(ROTA);
  return { ok: true };
}
