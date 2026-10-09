"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { chaveDe, listarColaboradores, nomeBonito, semAcento, type Colaborador } from "@/lib/fotos-infancia";
import { DATAS, encerrado } from "@/lib/dia-professor";

/** Sugere nomes enquanto a pessoa digita (lista de colaboradores ativos do Activesoft). */
export async function buscarNome(termo: string): Promise<(Colaborador & { respondeu: boolean })[]> {
  const q = semAcento(String(termo ?? ""));
  if (q.length < 3) return [];
  const partes = q.split(" ");
  const todos = await listarColaboradores().catch(() => []);
  const achados = todos.filter((c) => partes.every((p) => semAcento(c.nome).includes(p))).slice(0, 8);
  if (!achados.length) return [];
  const { data } = await createAdminClient()
    .from("dia_professor_respostas")
    .select("chave")
    .in("chave", achados.map((c) => chaveDe(c.id, c.nome)));
  const ja = new Set((data ?? []).map((d) => d.chave));
  return achados.map((c) => ({ ...c, respondeu: ja.has(chaveDe(c.id, c.nome)) }));
}

/** Grava (ou troca) a resposta. */
export async function responder(e: {
  id: number | null; nome: string; participa: boolean; data: string | null; acompanhantes: number; quem: string;
}) {
  if (encerrado()) return { ok: false as const, erro: "O prazo para responder terminou no sábado, às 9h." };
  const limpo = nomeBonito(String(e.nome ?? "").replace(/\s+/g, " ").slice(0, 120));
  if (limpo.length < 5 || !limpo.includes(" ")) return { ok: false as const, erro: "Escolha seu nome na lista ou digite nome e sobrenome." };
  let p = { id: null as number | null, nome: limpo };
  if (e.id) {
    const c = (await listarColaboradores().catch(() => [])).find((x) => x.id === e.id);
    if (!c) return { ok: false as const, erro: "Não achei esse nome na lista. Tente de novo." };
    p = { id: c.id, nome: c.nome };
  }
  if (e.participa && !DATAS.some((d) => d.valor === e.data)) return { ok: false as const, erro: "Escolha uma das duas datas." };
  const acompanhantes = e.participa ? Math.max(0, Math.min(10, Math.round(Number(e.acompanhantes) || 0))) : 0;
  const chave = chaveDe(p.id, p.nome);
  const db = createAdminClient();
  const { data: antes } = await db.from("dia_professor_respostas").select("chave").eq("chave", chave).maybeSingle();
  const { error } = await db.from("dia_professor_respostas").upsert({
    chave,
    colaborador_id: p.id,
    nome: p.nome,
    participa: e.participa,
    data_preferida: e.participa ? e.data : null,
    acompanhantes,
    acompanhantes_quem: acompanhantes ? String(e.quem ?? "").trim().slice(0, 200) || null : null,
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  return { ok: true as const, nome: p.nome, trocou: !!antes };
}
