"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { professoraLogada } from "@/lib/amigomagico-acesso";
import { amigoDaCrianca, type AmigoNoDiario } from "@/lib/amigomagico/amigos";
import { alunoDoDiario, ehTurma, listarAlunos } from "@/lib/formatura-diario";
import { revisoesDe, type Revisao } from "@/lib/amigomagico/revisao";

/**
 * "Revisar amigos" (24/11/2026, Pedro: "seria bom a professora revisar... uma lista de todos os alunos, o personagem e o
 * nome do amigo mágico, para ela editar e dar um ok"). Só para quem entrou no kit. O nome confirmado passa a valer no
 * Diário; na ilha 3D a troca é aplicada à mão (o admin lista o que mudou).
 */

const SEM_LOGIN = "Sua entrada expirou. Volte ao menu e entre de novo.";

export interface CriancaRevisao {
  alunoId: string;
  nome: string; // completo (as professoras conhecem a turma)
  amigo: AmigoNoDiario | null; // o original (lista do kit); null = ainda não tem amigo mágico
  revisao: Revisao | null;
}

export async function listaRevisao(turma: string): Promise<{ ok: true; criancas: CriancaRevisao[] } | { ok: false; erro: string }> {
  if (!(await professoraLogada())) return { ok: false, erro: SEM_LOGIN };
  if (!ehTurma(turma)) return { ok: false, erro: "Turma inválida." };
  try {
    const alunos = await listarAlunos(turma);
    const rev = await revisoesDe(alunos.map((a) => a.id));
    return { ok: true, criancas: alunos.map((a) => ({ alunoId: a.id, nome: a.nome, amigo: amigoDaCrianca(a.nome), revisao: rev.get(a.id) ?? null })) };
  } catch {
    return { ok: false, erro: "Não consegui abrir a turma agora. Tente de novo." };
  }
}

/** "Está certo": grava o nome (corrigido ou o mesmo), a observação e quem conferiu. */
export async function confirmar(alunoId: string, nomeAmigo: string, observacao: string, quem: string) {
  if (!(await professoraLogada())) return { ok: false as const, erro: SEM_LOGIN };
  const aluno = await alunoDoDiario(alunoId);
  if (!aluno) return { ok: false as const, erro: "Aluno não encontrado." };
  const original = amigoDaCrianca(aluno.nome);
  if (!original) return { ok: false as const, erro: "Esta criança ainda não tem amigo mágico." };
  const limpa = (s: string, n: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const nome = limpa(nomeAmigo, 40);
  const quemConferiu = limpa(quem, 40);
  if (!quemConferiu) return { ok: false as const, erro: "Escreva o seu nome lá em cima antes de conferir." };
  const { data: antes } = await createAdminClient().from("formatura_amigos_revisao").select("nome_amigo, aplicado_na_ilha").eq("aluno_id", aluno.id).maybeSingle();
  const nomeFinal = nome && nome !== (original.amigo ?? "") ? nome : null; // igual ao original: não é troca
  const mudouNome = (antes?.nome_amigo ?? null) !== nomeFinal;
  const agora = new Date().toISOString();
  const { error } = await createAdminClient().from("formatura_amigos_revisao").upsert({
    aluno_id: aluno.id,
    nome_amigo: nomeFinal,
    observacao: limpa(observacao, 400) || null,
    conferido: true,
    conferido_por: quemConferiu,
    conferido_em: agora,
    aplicado_na_ilha: mudouNome ? false : antes?.aplicado_na_ilha ?? false,
    atualizado_em: agora,
  });
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  return { ok: true as const, revisao: { nomeAmigo: nomeFinal, observacao: limpa(observacao, 400) || null, conferido: true, conferidoPor: quemConferiu, conferidoEm: agora, aplicadoNaIlha: mudouNome ? false : antes?.aplicado_na_ilha ?? false } };
}
