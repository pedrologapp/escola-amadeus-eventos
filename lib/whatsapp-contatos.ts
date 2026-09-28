import "server-only";

import { buscar, listarAlunos } from "@/lib/rematricula-2027-dados";

/**
 * Agenda para o painel do WhatsApp: responsáveis (com o aluno a que estão
 * ligados) e colaboradores do Activesoft. Serve para a busca "Nova mensagem"
 * e para mostrar de quem é cada número na conversa.
 */

export interface Contato {
  nome: string;
  telefone: string; // 55 + DDD + número, só dígitos
  vinculo: string; // "Responsável de Maria (3º Ano)" | "Colaborador"
}

type Json = Record<string, unknown>;
const lista = (x: unknown) => (Array.isArray(x) ? x : ((x as { results?: Json[] })?.results ?? [])) as Json[];

function comDdi(t: unknown): string | null {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  if (d.length < 10) return null;
  return `55${d}`;
}

/** Chave para casar números com e sem o 9: DDD + últimos 8 dígitos. */
export const chaveTelefone = (t: string | null | undefined) => {
  const d = String(t ?? "").replace(/\D/g, "").replace(/^55/, "");
  return d.length >= 10 ? `${d.slice(0, 2)}${d.slice(-8)}` : "";
};

export async function carregarContatos(): Promise<Contato[]> {
  const [cad, resp, colab, alunos] = await Promise.all([
    buscar("v1/lista_alunos/", 3600),
    buscar("v1/lista_responsaveis/", 3600),
    buscar("v1/lista_colaboradores/", 3600),
    listarAlunos(),
  ]);
  const ativos = new Map(alunos.map((a) => [a.id, a]));
  const alunosDoResp = new Map<number, string[]>();
  for (const c of lista(cad)) {
    const a = ativos.get(c.id as number);
    if (!a) continue;
    const primeiro = a.nome.split(/\s+/)[0];
    const rot = `${primeiro} (${a.serie ?? a.turma})`;
    const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...((c.responsaveis_adicionais_ids as number[]) ?? [])];
    for (const rid of new Set(ids.filter(Boolean) as number[])) alunosDoResp.set(rid, [...(alunosDoResp.get(rid) ?? []), rot]);
  }

  const porTel = new Map<string, Contato>();
  for (const r of lista(resp)) {
    const filhos = alunosDoResp.get(r.id as number);
    const tel = comDdi(r.celular);
    if (!filhos || !tel) continue; // só responsáveis de alunos ativos
    porTel.set(chaveTelefone(tel), { nome: String(r.nome ?? "").trim(), telefone: tel, vinculo: `Responsável de ${[...new Set(filhos)].join(", ")}` });
  }
  for (const c of lista(colab)) {
    if (c.ativo === false) continue;
    const tel = comDdi(c.celular);
    if (!tel || porTel.has(chaveTelefone(tel))) continue;
    porTel.set(chaveTelefone(tel), { nome: String(c.nome ?? "").trim(), telefone: tel, vinculo: "Colaborador" });
  }
  return [...porTel.values()].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
