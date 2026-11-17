import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { nomeBonito, semAcento } from "@/lib/fotos-infancia";

/**
 * Homenagem do 9º ano (formatura 2026). A turma sai do Activesoft (alunos ativos do 9º ano, com a data
 * de nascimento). O pai entra com o nome do filho + a data de nascimento; o servidor devolve um passe
 * assinado (`<id>.<assinatura>`) que acompanha cada envio. O código é público no GitHub, então a
 * assinatura sai do segredo do servidor.
 */

export interface AlunoNono {
  id: number;
  nome: string;
  nascimento: string; // AAAA-MM-DD
}

/** Aluno de mentira para a escola testar a página (entra como qualquer família; não conta na turma do admin). */
export const ALUNO_TESTE: AlunoNono = { id: 999999, nome: "Aluno Teste", nascimento: "2011-01-01" };

export async function listarTurma(): Promise<AlunoNono[]> {
  return [...(await listarTurmaReal()), ALUNO_TESTE];
}

async function listarTurmaReal(): Promise<AlunoNono[]> {
  const token = process.env.ACTIVESOFT_TOKEN;
  if (!token) throw new Error("ACTIVESOFT_TOKEN não configurada");
  const pedir = () =>
    fetch("https://siga01.activesoft.com.br/api/v0/acesso/alunos/", {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      next: { revalidate: 900 },
    });
  let r = await pedir();
  if (r.status >= 500) r = await pedir(); // o Activesoft devolve 502 de vez em quando
  if (!r.ok) throw new Error(`Activesoft respondeu ${r.status}`);
  const j = (await r.json()) as unknown;
  const lista = (Array.isArray(j) ? j : ((j as { results?: unknown[] }).results ?? [])) as Record<string, unknown>[];
  const porId = new Map<number, AlunoNono>();
  for (const a of lista) {
    if (!/^9/.test(String(a.nome_serie ?? ""))) continue;
    const id = Number(a.id_aluno);
    if (!id || porId.has(id)) continue;
    porId.set(id, { id, nome: nomeBonito(String(a.nome ?? "")), nascimento: String(a.data_nascimento ?? "").slice(0, 10) });
  }
  return [...porId.values()].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}

/** Sugestões enquanto o pai digita: alunos da turma cujo nome tem todas as palavras digitadas (começo de palavra). */
export async function sugerirAlunos(termo: string): Promise<{ id: number; nome: string }[]> {
  const q = semAcento(String(termo ?? "")).split(" ").filter(Boolean);
  if (q.join("").length < 3) return [];
  const turma = await listarTurma();
  return turma
    .filter((a) => q.every((p) => semAcento(a.nome).split(" ").some((w) => w.startsWith(p))))
    .slice(0, 6)
    .map((a) => ({ id: a.id, nome: a.nome }));
}

/** Confere o aluno escolhido na lista + a data de nascimento. */
export async function conferirAluno(id: number, nascimento: string): Promise<AlunoNono | null> {
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return null;
  const a = (await listarTurma()).find((x) => x.id === id);
  return a && a.nascimento === nascimento ? a : null;
}

function segredo() {
  const s = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!s) throw new Error("WEBHOOK_CONFIRM_SECRET não está configurada.");
  return s;
}

const assinatura = (id: number) => createHmac("sha256", segredo()).update(`homenagem-9ano:${id}`).digest("base64url").slice(0, 22);

export const passeDe = (id: number) => `${id}.${assinatura(id)}`;

/** Confere o passe e devolve o id do aluno (ou null). */
export function alunoDoPasse(passe: string | null | undefined): number | null {
  const [idTxt, sig] = String(passe ?? "").split(".");
  const id = Number(idTxt);
  if (!id || !sig) return null;
  const a = Buffer.from(assinatura(id)), b = Buffer.from(sig);
  return a.length === b.length && timingSafeEqual(a, b) ? id : null;
}

export const primeiroNome = (nome: string) => nome.split(" ")[0] ?? nome;
