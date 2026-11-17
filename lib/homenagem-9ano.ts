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

export async function listarTurma(): Promise<AlunoNono[]> {
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

/** Acha o aluno pelo nome digitado (todas as palavras precisam estar no nome) + a data de nascimento. */
export async function acharAluno(nome: string, nascimento: string): Promise<AlunoNono | null> {
  const q = semAcento(String(nome ?? "")).split(" ").filter((p) => p.length >= 2);
  if (!q.length || !/^\d{4}-\d{2}-\d{2}$/.test(nascimento)) return null;
  const turma = await listarTurma();
  const achados = turma.filter((a) => a.nascimento === nascimento && q.every((p) => semAcento(a.nome).split(" ").some((w) => w.startsWith(p))));
  return achados.length === 1 ? achados[0] : null;
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
