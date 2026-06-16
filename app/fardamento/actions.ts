"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { MODELOS, TAMANHOS, TIPOS } from "@/lib/fardamento-config";

const MODELOS_OK = new Set<string>(MODELOS.map((m) => m.valor));
const TAMANHOS_OK = new Set<string>(TAMANHOS);
const TIPOS_OK = new Set<string>(TIPOS.map((t) => t.valor));

type EnvioFardamento = {
  nome?: string;
  quer?: boolean;
  modelo?: string;
  tamanho?: string;
  tipo?: string;
  quantidade?: number;
};

export type EnvioState = { ok: true } | { ok: false; error: string };

export async function registrarFardamento(
  payload: EnvioFardamento,
): Promise<EnvioState> {
  const nome = (payload?.nome ?? "").toString().trim();
  if (nome.length < 2) return { ok: false, error: "Informe o seu nome." };

  const quer = !!payload?.quer;

  let modelo: string | null = null;
  let tamanho: string | null = null;
  let tipo: string | null = null;
  let quantidade = 1;

  if (quer) {
    modelo = (payload?.modelo ?? "").toString();
    tamanho = (payload?.tamanho ?? "").toString();
    tipo = (payload?.tipo ?? "").toString();
    quantidade = Math.min(50, Math.max(1, Math.round(Number(payload?.quantidade) || 1)));

    if (!MODELOS_OK.has(modelo)) return { ok: false, error: "Escolha o modelo." };
    if (!TAMANHOS_OK.has(tamanho)) return { ok: false, error: "Escolha o tamanho." };
    if (!TIPOS_OK.has(tipo)) return { ok: false, error: "Escolha o tipo." };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("fardamento_interesse").insert({
    nome,
    quer,
    modelo,
    tamanho,
    tipo,
    quantidade: quer ? quantidade : 1,
  });

  if (error) {
    return { ok: false, error: "Não foi possível enviar. Tente de novo." };
  }
  return { ok: true };
}
