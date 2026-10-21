import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_VERSOES, quadrosDaRodada, type Fase, type Rodada } from "@/lib/arboria-quadro";
import type { Fala } from "@/lib/arboria-guia";

/**
 * O relatório do professor de "Qual é o quadro?" (Pedro, 20/10/2026): como cada aluno foi em cada rodada,
 * quanto acertou adivinhando, e o material de quem não finalizou (as versões, o que o colega escolheu,
 * as perguntas do Arboria), para a análise da IA (actions.ts) explicar por que não deu certo.
 */

import { SITUACAO, type Situacao } from "./situacao";
export { SITUACAO, type Situacao };

export interface Versao { versao: number; texto: string; escolha: string | null; acertou: boolean | null; conversa: Fala[] }
export interface Nota { texto: string; observacao: string | null; aprovado: boolean }
export interface Linha {
  aluno: string;
  nome: string;
  rodada: Rodada;
  quadro: string | null;
  situacao: Situacao;
  versoes: Versao[];
  notas: Nota[];
  adivinhou: number;
  acertou: number;
  analise: string | null;
}

const ORDEM: Fase[] = ["entrada", "r1", "r1f", "r2", "r2f", "r3", "r3f", "final"];
const ultimaRodada = (f: Fase): number => (f === "final" ? 3 : f === "entrada" ? 0 : Number(f[1]));

export async function listarSalas() {
  const db = createAdminClient();
  const { data: salas } = await db.from("arboria_quadro_salas").select("codigo, turma, fase, criado_em").order("criado_em", { ascending: false }).limit(60);
  const { data: alunos } = await db.from("arboria_quadro_alunos").select("sala").in("sala", (salas ?? []).map((s) => s.codigo));
  const n = new Map<string, number>();
  for (const a of alunos ?? []) n.set(a.sala, (n.get(a.sala) ?? 0) + 1);
  // salas de teste (poucos alunos) ficam de fora
  return (salas ?? []).map((s) => ({ ...s, alunos: n.get(s.codigo) ?? 0 })).filter((s) => s.alunos >= 5);
}

export async function relatorio(codigo: string) {
  const db = createAdminClient();
  const { data: sala } = await db.from("arboria_quadro_salas").select("codigo, turma, fase, criado_em").eq("codigo", codigo).maybeSingle();
  if (!sala) return null;
  const [a, d, p, r, an, rf] = await Promise.all([
    db.from("arboria_quadro_alunos").select("id, nome").eq("sala", codigo).order("nome"),
    db.from("arboria_quadro_descricoes").select("id, aluno, rodada, versao, quadro, texto").eq("sala", codigo),
    db.from("arboria_quadro_palpites").select("descricao, aluno, escolha, acertou, conversa, extra").eq("sala", codigo),
    db.from("arboria_quadro_revisoes").select("aluno, rodada, versao, texto, observacao, aprovado, criado_em").eq("sala", codigo).order("criado_em"),
    db.from("arboria_quadro_analises").select("aluno, rodada, texto").eq("sala", codigo),
    db.from("arboria_quadro_reflexoes").select("aluno, descobri, quero").eq("sala", codigo),
  ]);
  const alunos = (a.data ?? []) as { id: string; nome: string }[];
  const descs = (d.data ?? []) as { id: string; aluno: string; rodada: number; versao: number; quadro: string; texto: string }[];
  const palps = (p.data ?? []) as { descricao: string; aluno: string; escolha: string | null; acertou: boolean | null; conversa: Fala[] | null; extra: boolean }[];
  const revs = (r.data ?? []) as (Nota & { aluno: string; rodada: number; versao: number })[];
  const analises = (an.data ?? []) as { aluno: string; rodada: number; texto: string }[];
  const rodadaDe = new Map(descs.map((x) => [x.id, x.rodada]));
  const encerradas = ultimaRodada(sala.fase as Fase);
  const rodadas = ([1, 2, 3] as Rodada[]).filter((n) => n <= encerradas);

  const linhas: Linha[] = [];
  for (const al of alunos) {
    for (const rodada of rodadas) {
      const vs = descs.filter((x) => x.aluno === al.id && x.rodada === rodada).sort((x, y) => x.versao - y.versao);
      const versoes: Versao[] = vs.map((v) => {
        const o = palps.find((q) => q.descricao === v.id && !q.extra);
        return { versao: v.versao, texto: v.texto, escolha: o?.escolha ?? null, acertou: o?.acertou ?? null, conversa: o?.conversa ?? [] };
      });
      const notas = revs.filter((x) => x.aluno === al.id && x.rodada === rodada).map(({ texto, observacao, aprovado }) => ({ texto, observacao, aprovado }));
      const minhas = palps.filter((q) => q.aluno === al.id && rodadaDe.get(q.descricao) === rodada && q.acertou !== null);
      const iAcerto = versoes.findIndex((v) => v.acertou === true);
      const ultima = versoes[versoes.length - 1];
      const situacao: Situacao = !ultima ? (notas.length ? "travou" : "nao_escreveu")
        : iAcerto === 0 ? "primeira" : iAcerto > 0 ? "melhorou"
        : ultima.acertou === null ? "sem_resposta"
        : rodada === 1 || ultima.versao >= MAX_VERSOES ? "nao" : "reescrever";
      linhas.push({
        aluno: al.id, nome: al.nome, rodada, quadro: vs[0]?.quadro ?? null, situacao, versoes, notas,
        adivinhou: minhas.length, acertou: minhas.filter((q) => q.acertou).length,
        analise: analises.find((x) => x.aluno === al.id && x.rodada === rodada)?.texto ?? null,
      });
    }
  }
  // o fechamento da Fase Linguística (21/10): o que cada aluno descobriu e o que quer descobrir
  const reflexoes = ((rf.data ?? []) as { aluno: string; descobri: string; quero: string }[])
    .map((x) => ({ ...x, nome: alunos.find((al) => al.id === x.aluno)?.nome ?? "" })).sort((x, y) => x.nome.localeCompare(y.nome));
  return { reflexoes, sala: { ...sala, ordemFase: ORDEM.indexOf(sala.fase as Fase) }, rodadas, alunos, linhas, quadros: rodadas.map((n) => quadrosDaRodada(n, sala.turma).map((q) => q.id)) };
}
