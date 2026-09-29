"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  enviarEncarte,
  enviarLembrete,
  escolhaValida,
  guardarContato,
  limparTelefone,
  pausa,
  pendentesDoLembrete,
  type StatusEnvio,
} from "@/lib/experiencia";

const CAMINHO = "/admin/rematricula-2027/experiencia";

async function quem() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export interface ResultadoExp { telefone: string; status: StatusEnvio; detalhe?: string }

/** Manda o encarte da Experiência para cada número (com pausa entre um e outro) e guarda todos na lista. */
export async function enviarExperiencia(entrada: {
  destinos: { telefone: string; nome: string | null }[];
  crianca?: string | null;
  serie?: string | null;
  escolha: string;
  origem?: "novato" | "simulador" | "avulso" | "manual";
}): Promise<{ ok: boolean; erro?: string; resultados: ResultadoExp[] }> {
  const user = await quem();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin.", resultados: [] };
  const destinos = entrada.destinos
    .map((d) => ({ ...d, telefone: limparTelefone(d.telefone) }))
    .filter((d, i, arr) => d.telefone.length >= 10 && arr.findIndex((x) => x.telefone === d.telefone) === i);
  if (!destinos.length) return { ok: false, erro: "Nenhum número válido (DDD + número).", resultados: [] };

  const escolha = escolhaValida(entrada.escolha);
  const resultados: ResultadoExp[] = [];
  for (const [i, d] of destinos.entries()) {
    if (i > 0) await pausa();
    resultados.push(
      await enviarEncarte({ telefone: d.telefone, responsavel: d.nome, crianca: entrada.crianca, serie: entrada.serie, origem: entrada.origem ?? "avulso" }, escolha, user.email ?? null),
    );
  }
  revalidatePath(CAMINHO);
  return { ok: true, resultados };
}

/** Coloca números na lista sem enviar nada (ex.: novatos que receberam só a carta). */
export async function incluirContatos(lista: { telefone: string; responsavel?: string | null; crianca?: string | null; serie?: string | null; origem?: "novato" | "manual" }[]) {
  if (!(await quem())) return { ok: false, erro: "Sessão expirada." };
  let n = 0;
  for (const c of lista) {
    if (limparTelefone(c.telefone).length < 10) continue;
    await guardarContato({ ...c, origem: c.origem ?? "manual" });
    n++;
  }
  revalidatePath(CAMINHO);
  return { ok: true, incluidos: n };
}

/** Marcar/desmarcar alguém tira a confirmação dele: a lista precisa ser confirmada de novo. */
export async function marcarLembrar(telefone: string, lembrar: boolean) {
  if (!(await quem())) return;
  await createAdminClient()
    .from("experiencia_contatos")
    .update({ lembrar, lembrete_confirmado: false, atualizado_em: new Date().toISOString() })
    .eq("telefone", limparTelefone(telefone));
  revalidatePath(CAMINHO);
}

/** "Confirmar lista": quem está marcado agora é quem recebe o lembrete da véspera. */
export async function confirmarLembrete() {
  if (!(await quem())) return;
  const admin = createAdminClient();
  await admin.from("experiencia_contatos").update({ lembrete_confirmado: true }).eq("lembrar", true);
  await admin.from("experiencia_contatos").update({ lembrete_confirmado: false }).eq("lembrar", false);
  revalidatePath(CAMINHO);
}

export async function removerContato(telefone: string) {
  if (!(await quem())) return;
  await createAdminClient().from("experiencia_contatos").delete().eq("telefone", limparTelefone(telefone));
  revalidatePath(CAMINHO);
}

export async function mudarAutomatico(ligado: boolean) {
  if (!(await quem())) return;
  await createAdminClient().from("experiencia_config").update({ lembrete_automatico: ligado }).eq("id", 1);
  revalidatePath(CAMINHO);
}

/** Botão de reserva: manda agora o lembrete para quem ainda não recebeu. */
export async function lembreteAgora(): Promise<{ ok: boolean; erro?: string; resultados: ResultadoExp[] }> {
  const user = await quem();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin.", resultados: [] };
  const resultados: ResultadoExp[] = [];
  for (const [i, c] of (await pendentesDoLembrete()).entries()) {
    if (i > 0) await pausa();
    resultados.push(await enviarLembrete(c.telefone, c.crianca, user.email ?? null));
  }
  revalidatePath(CAMINHO);
  return { ok: true, resultados };
}
