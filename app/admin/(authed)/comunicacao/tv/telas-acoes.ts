"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TV, type FormatoTela } from "@/lib/tv";
import { ehEquipeTv } from "./equipe";
import { FIXOS } from "./fixos";

/**
 * Ações do gerenciador novo (Pedro, 12/11/2026): a escola é livre para ligar, desligar, mudar a ordem e o tempo,
 * e para criar telas a partir dos formatos prontos. Só as telas fixas do Arboria (./fixos.ts) ficam no lugar e
 * não se desligam, a não ser pela equipe Arboria. Na lista, as telas criadas vêm como "tela:<id>".
 */

type Resultado = { ok: true } | { ok: false; erro: string };
const ehTela = (id: string) => id.startsWith("tela:");
const idTela = (id: string) => id.slice(5);

function mudou() {
  revalidateTag(ETIQUETA_TV, { expire: 0 });
  revalidatePath("/admin/comunicacao/tv");
}

async function logado() {
  const { data } = await (await createClient()).auth.getUser();
  return !!data.user;
}

/** Liga ou desliga uma tela (bloco ou tela criada). */
export async function ligarBloco(id: string, ativo: boolean): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (FIXOS[id] && !(await ehEquipeTv())) return { ok: false, erro: "Esta tela é fixa do Arboria." };
  const db = createAdminClient();
  const { error } = ehTela(id)
    ? await db.from("tv_telas").update({ ativo: !!ativo }).eq("id", idTela(id))
    : await db.from("tv_blocos").update({ ativo: !!ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

/** A ordem e o tempo de tudo. Para a escola, as fixas voltam para o lugar delas e mantêm o tempo que tinham. */
export async function ordenarBlocos(lista: { id: string; segundos: number }[]): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  let fila = lista;
  if (!(await ehEquipeTv())) {
    const { data: atuais, error } = await db.from("tv_blocos").select("id, segundos");
    if (error) return { ok: false, erro: error.message };
    const antes = new Map((atuais ?? []).map((b) => [b.id as string, Number(b.segundos)]));
    fila = lista.map((b) => (FIXOS[b.id] && antes.has(b.id) ? { ...b, segundos: antes.get(b.id)! } : b));
    fila = [...fila.filter((b) => FIXOS[b.id] === "inicio"), ...fila.filter((b) => !FIXOS[b.id]), ...fila.filter((b) => FIXOS[b.id] === "fim")];
  }
  const seg = (s: number) => Math.max(4, Math.min(60, Math.round(s)));
  const blocos = fila.map((b, i) => ({ ...b, ordem: i + 1 })).filter((b) => !ehTela(b.id));
  const telas = fila.map((b, i) => ({ ...b, ordem: i + 1 })).filter((b) => ehTela(b.id));
  for (const b of blocos) {
    const { error } = await db.from("tv_blocos").update({ ordem: b.ordem, segundos: seg(b.segundos) }).eq("id", b.id);
    if (error) return { ok: false, erro: error.message };
  }
  for (const t of telas) {
    const { error } = await db.from("tv_telas").update({ ordem: t.ordem, segundos: seg(t.segundos) }).eq("id", idTela(t.id));
    if (error) return { ok: false, erro: error.message };
  }
  mudou();
  return { ok: true };
}

export interface TelaForm {
  id?: string;
  formato: FormatoTela;
  campos: Record<string, unknown>;
  inicio: string;
  fim: string;
}

const txt = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
const data = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

/** Só guarda os campos de cada formato, com tamanho limitado. */
function limpar(formato: FormatoTela, c: Record<string, unknown>): Record<string, unknown> | string {
  if (formato === "aviso") {
    const titulo = txt(c.titulo, 80);
    if (!titulo) return "Escreva o título.";
    return { icone: txt(c.icone, 16), titulo, texto: txt(c.texto, 200) };
  }
  if (formato === "recado") {
    const linhas = (Array.isArray(c.linhas) ? c.linhas : [])
      .map((l) => ({ icone: txt((l as { icone?: unknown }).icone, 16), texto: txt((l as { texto?: unknown }).texto, 120) }))
      .filter((l) => l.texto)
      .slice(0, 4);
    if (!linhas.length) return "Escreva pelo menos um recado.";
    return { linhas };
  }
  if (formato === "frase" || formato === "sabia") {
    const texto = txt(c.texto, 160);
    if (!texto) return "Escreva o texto.";
    return { texto };
  }
  if (formato === "celebracao") {
    const titulo = txt(c.titulo, 40);
    if (!titulo) return "Escreva o título.";
    return { pre: txt(c.pre, 60), titulo, linha: txt(c.linha, 40) };
  }
  if (formato === "programacao") {
    const linhas = (Array.isArray(c.linhas) ? c.linhas : [])
      .map((l) => ({ hora: txt((l as { hora?: unknown }).hora, 12), texto: txt((l as { texto?: unknown }).texto, 80) }))
      .filter((l) => l.hora || l.texto)
      .slice(0, 6);
    if (!linhas.length) return "Escreva pelo menos um horário.";
    return { titulo: txt(c.titulo, 60), linhas };
  }
  return "Formato ainda não disponível.";
}

/** Cria ou altera uma tela. A nova entra antes do encerramento. */
export async function salvarTela(f: TelaForm): Promise<Resultado & { id?: string }> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const campos = limpar(f.formato, f.campos ?? {});
  if (typeof campos === "string") return { ok: false, erro: campos };
  if (data(f.inicio) && data(f.fim) && f.inicio > f.fim) return { ok: false, erro: "O “até” está antes do “a partir de”." };
  const db = createAdminClient();
  const linha = { formato: f.formato, campos, inicio: data(f.inicio), fim: data(f.fim) };
  if (f.id) {
    const { error } = await db.from("tv_telas").update(linha).eq("id", f.id);
    if (error) return { ok: false, erro: error.message };
    mudou();
    return { ok: true, id: f.id };
  }
  const { data: fim } = await db.from("tv_blocos").select("ordem").eq("id", "fim").maybeSingle();
  const ordem = Number(fim?.ordem ?? 99) - 0.5;
  const { data: nova, error } = await db.from("tv_telas").insert({ ...linha, ordem, segundos: 12 }).select("id").single();
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true, id: nova.id as string };
}

/** Uma cópia logo depois da original (ex.: a formatura do Grupo V vira a do 9º ano). */
export async function duplicarTela(id: string): Promise<Resultado & { id?: string }> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  const { data: t, error: e1 } = await db.from("tv_telas").select("formato, campos, ordem, segundos, inicio, fim").eq("id", id).single();
  if (e1 || !t) return { ok: false, erro: e1?.message ?? "Tela não encontrada." };
  const { data: nova, error } = await db.from("tv_telas").insert({ ...t, ordem: Number(t.ordem) + 0.1 }).select("id").single();
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true, id: nova.id as string };
}

export async function apagarTela(id: string): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_telas").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}
