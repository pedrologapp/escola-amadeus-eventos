"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { relatorioAutenticado } from "@/lib/relatorio-auth";
import { MODELOS, TAMANHOS, TIPOS } from "@/lib/fardamento-config";

const MODELOS_OK = new Set<string>(MODELOS.map((m) => m.valor));
const TAMANHOS_OK = new Set<string>(TAMANHOS);
const TIPOS_OK = new Set<string>(TIPOS.map((t) => t.valor));

// Permite gerenciar quem está logado no admin (Supabase) OU na coordenação.
async function podeGerenciar(): Promise<boolean> {
  if (await relatorioAutenticado()) return true;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return !!user;
  } catch {
    return false;
  }
}

export type GerenciarState = { ok: true } | { ok: false; error: string };

export async function atualizarFardamento(
  id: string,
  dados: {
    nome?: string;
    quer?: boolean;
    modelo?: string;
    tamanho?: string;
    tipo?: string;
    quantidade?: number;
  },
): Promise<GerenciarState> {
  if (!(await podeGerenciar())) {
    return { ok: false, error: "Sem permissão." };
  }

  const nome = (dados?.nome ?? "").toString().trim();
  if (nome.length < 2) return { ok: false, error: "Informe o nome." };

  const quer = !!dados?.quer;
  let modelo: string | null = null;
  let tamanho: string | null = null;
  let tipo: string | null = null;
  let quantidade = 1;

  if (quer) {
    modelo = (dados?.modelo ?? "").toString();
    tamanho = (dados?.tamanho ?? "").toString();
    tipo = (dados?.tipo ?? "").toString();
    quantidade = Math.min(50, Math.max(1, Math.round(Number(dados?.quantidade) || 1)));
    if (!MODELOS_OK.has(modelo)) return { ok: false, error: "Modelo inválido." };
    if (!TAMANHOS_OK.has(tamanho)) return { ok: false, error: "Tamanho inválido." };
    if (!TIPOS_OK.has(tipo)) return { ok: false, error: "Tipo inválido." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("fardamento_interesse")
    .update({ nome, quer, modelo, tamanho, tipo, quantidade: quer ? quantidade : 1 })
    .eq("id", id);

  if (error) return { ok: false, error: "Não foi possível salvar." };
  return { ok: true };
}

export async function excluirFardamento(id: string): Promise<GerenciarState> {
  if (!(await podeGerenciar())) {
    return { ok: false, error: "Sem permissão." };
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("fardamento_interesse")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir." };
  return { ok: true };
}
