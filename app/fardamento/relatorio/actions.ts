"use server";

import {
  credenciaisValidas,
  criarSessaoRelatorio,
  encerrarSessaoRelatorio,
} from "@/lib/relatorio-auth";

export async function entrarRelatorio(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const user = formData.get("user")?.toString() ?? "";
  const senha = formData.get("senha")?.toString() ?? "";
  if (!credenciaisValidas(user, senha)) {
    return { ok: false, error: "Usuário ou senha incorretos." };
  }
  await criarSessaoRelatorio();
  return { ok: true };
}

export async function sairRelatorio(): Promise<void> {
  await encerrarSessaoRelatorio();
}
