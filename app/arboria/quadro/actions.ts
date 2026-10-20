"use server";

import { randomBytes, randomInt } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_VERSOES, TURMAS, quadroSecreto, quadrosDaRodada, type Fase } from "@/lib/arboria-quadro";

/**
 * "Qual é o quadro?" (Arboria · Linguística, semana 3). A TV abre a sala e manda nas fases;
 * cada tablet entra com o código. A troca de descrições é automática: quem já escreveu e está
 * livre recebe a descrição mais antiga que ainda ninguém tentou (nunca a sua, nem a de uma
 * corrente que já tentou). Na rodada 2, se o colega erra, o autor reescreve e a nova versão
 * vai para outro colega.
 */

interface Desc { id: string; aluno: string; rodada: number; versao: number; quadro: string; texto: string; criado_em: string }
interface Palp { id: string; descricao: string; aluno: string; opcoes: string[]; escolha: string | null; acertou: boolean | null }
interface Sala { codigo: string; chave_prof: string; turma: string; fase: Fase; destaque: string | null; revelado: boolean }

const db = () => createAdminClient();
const limpar = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const rodadaDa = (f: Fase): 1 | 2 | null => (f === "r1" ? 1 : f === "r2" ? 2 : null);
const embaralhar = <T,>(v: T[]) => { const a = [...v]; for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };

async function sala(codigo: string): Promise<Sala | null> {
  const { data } = await db().from("arboria_quadro_salas").select("*").eq("codigo", limpar(codigo, 4)).maybeSingle();
  return (data as Sala) ?? null;
}
async function salaDoProfessor(codigo: string, chave: string) {
  const s = await sala(codigo);
  if (!s || s.chave_prof !== chave) throw new Error("Sala não encontrada.");
  return s;
}
async function tudo(codigo: string) {
  const c = db();
  const [a, d, p] = await Promise.all([
    c.from("arboria_quadro_alunos").select("id, nome, mostrar_nome, criado_em").eq("sala", codigo).order("criado_em"),
    c.from("arboria_quadro_descricoes").select("id, aluno, rodada, versao, quadro, texto, criado_em").eq("sala", codigo).order("criado_em"),
    c.from("arboria_quadro_palpites").select("id, descricao, aluno, opcoes, escolha, acertou").eq("sala", codigo),
  ]);
  return {
    alunos: (a.data ?? []) as { id: string; nome: string; mostrar_nome: boolean }[],
    descs: (d.data ?? []) as Desc[],
    palps: (p.data ?? []) as Palp[],
  };
}

// ---------- TV (professor) ----------

export async function criarSala(turma: string) {
  if (!TURMAS.includes(turma as (typeof TURMAS)[number])) return { ok: false as const, erro: "Escolha a turma." };
  const chave = randomBytes(12).toString("base64url");
  for (let i = 0; i < 8; i++) {
    const codigo = String(randomInt(1000, 10000));
    const { error } = await db().from("arboria_quadro_salas").insert({ codigo, chave_prof: chave, turma });
    if (!error) return { ok: true as const, codigo, chave };
  }
  return { ok: false as const, erro: "Não consegui abrir a sala. Tente de novo." };
}

export async function mudarFase(codigo: string, chave: string, fase: Fase) {
  await salaDoProfessor(codigo, chave);
  if (!["entrada", "r1", "r2", "final"].includes(fase)) return;
  await db().from("arboria_quadro_salas").update({ fase, destaque: null, revelado: false }).eq("codigo", codigo);
}

export async function destacar(codigo: string, chave: string, descricao: string | null, revelado = false) {
  await salaDoProfessor(codigo, chave);
  await db().from("arboria_quadro_salas").update({ destaque: descricao, revelado }).eq("codigo", codigo);
}

export interface Corrente {
  aluno: string;
  nome: string;
  mostrarNome: boolean;
  quadro: string;
  versoes: { id: string; versao: number; texto: string; acertou: boolean | null; escolha: string | null }[];
  resultado: "primeira" | "melhorou" | "nao" | "aberto";
}

/** Uma corrente = as versões de um aluno numa rodada. */
function correntes(rodada: 1 | 2, x: Awaited<ReturnType<typeof tudo>>): Corrente[] {
  const out: Corrente[] = [];
  for (const al of x.alunos) {
    const vs = x.descs.filter((d) => d.aluno === al.id && d.rodada === rodada).sort((a, b) => a.versao - b.versao);
    if (!vs.length) continue;
    const versoes = vs.map((d) => { const p = x.palps.find((p) => p.descricao === d.id); return { id: d.id, versao: d.versao, texto: d.texto, acertou: p?.acertou ?? null, escolha: p?.escolha ?? null }; });
    const iAcerto = versoes.findIndex((v) => v.acertou === true);
    const ultima = versoes[versoes.length - 1];
    const resultado = iAcerto === 0 ? "primeira" : iAcerto > 0 ? "melhorou" : ultima.acertou === false && (rodada === 1 || ultima.versao >= MAX_VERSOES) ? "nao" : "aberto";
    out.push({ aluno: al.id, nome: al.nome, mostrarNome: al.mostrar_nome, quadro: vs[0].quadro, versoes, resultado });
  }
  return out;
}

export async function estadoTv(codigo: string, chave: string) {
  const s = await salaDoProfessor(codigo, chave);
  const x = await tudo(s.codigo);
  const r1 = correntes(1, x), r2 = correntes(2, x);
  const resumo = (cs: Corrente[], rodada: number) => {
    const ps = x.palps.filter((p) => x.descs.find((d) => d.id === p.descricao)?.rodada === rodada && p.acertou !== null);
    return { escreveram: cs.length, palpites: ps.length, acertos: ps.filter((p) => p.acertou).length, primeira: cs.filter((c) => c.resultado === "primeira").length, melhorou: cs.filter((c) => c.resultado === "melhorou").length };
  };
  const todas = [...r1, ...r2];
  const destaque = s.destaque ? todas.find((c) => c.versoes.some((v) => v.id === s.destaque)) ?? null : null;
  return {
    sala: { codigo: s.codigo, turma: s.turma, fase: s.fase, revelado: s.revelado, destaque: s.destaque },
    alunos: x.alunos.map((a) => ({ id: a.id, nome: a.nome })),
    r1: resumo(r1, 1), r2: resumo(r2, 2),
    correntes2: r2,
    destaque: destaque && { ...destaque, rodada: r2.includes(destaque) ? 2 : 1, opcoes: quadrosDaRodada(r2.includes(destaque) ? 2 : 1, s.turma).map((q) => q.id) },
  };
}

// ---------- tablet (aluno) ----------

export async function entrar(codigo: string, nome: string, mostrarNome: boolean) {
  const s = await sala(codigo);
  if (!s) return { ok: false as const, erro: "Não achei essa sala. Confira o código na TV." };
  const n = limpar(nome, 40);
  if (n.length < 2) return { ok: false as const, erro: "Escreva o seu nome." };
  const { data, error } = await db().from("arboria_quadro_alunos").insert({ sala: s.codigo, nome: n, mostrar_nome: !!mostrarNome }).select("id").single();
  if (error || !data) return { ok: false as const, erro: "Não consegui entrar. Tente de novo." };
  return { ok: true as const, aluno: data.id as string, codigo: s.codigo };
}

/** Pega para este aluno a descrição mais antiga que ainda ninguém tentou (se ele estiver livre). */
async function pegarTarefa(s: Sala, aluno: string, rodada: 1 | 2, x: Awaited<ReturnType<typeof tudo>>) {
  const minhas = new Set(x.palps.filter((p) => p.aluno === aluno).map((p) => p.descricao));
  // a reescrita vai para um colega novo; numa sala muito pequena (teste), pode voltar para o mesmo
  const jaTenteiDe = new Set(x.alunos.length < 4 ? [] : x.descs.filter((d) => minhas.has(d.id)).map((d) => `${d.aluno}:${d.rodada}`));
  const comPalpite = new Set(x.palps.map((p) => p.descricao));
  const ultimaDe = new Map<string, Desc>();
  for (const d of x.descs.filter((d) => d.rodada === rodada)) {
    const k = d.aluno; const u = ultimaDe.get(k);
    if (!u || d.versao > u.versao) ultimaDe.set(k, d);
  }
  const livres = [...ultimaDe.values()]
    .filter((d) => d.aluno !== aluno && !comPalpite.has(d.id) && !jaTenteiDe.has(`${d.aluno}:${d.rodada}`))
    .sort((a, b) => a.criado_em.localeCompare(b.criado_em));
  for (const d of livres.slice(0, 4)) {
    const opcoes = embaralhar(quadrosDaRodada(rodada, s.turma).map((q) => q.id));
    const { data, error } = await db().from("arboria_quadro_palpites").insert({ sala: s.codigo, descricao: d.id, aluno, opcoes }).select("id, descricao, aluno, opcoes, escolha, acertou").single();
    if (!error && data) return data as Palp;
  }
  return null;
}

export async function estadoAluno(codigo: string, aluno: string) {
  const s = await sala(codigo);
  if (!s) return { ok: false as const };
  const x = await tudo(s.codigo);
  const eu = x.alunos.find((a) => a.id === aluno);
  if (!eu) return { ok: false as const };
  const rodada = rodadaDa(s.fase);
  if (!rodada) return { ok: true as const, fase: s.fase, nome: eu.nome };

  const quadro = quadroSecreto(aluno, rodada, s.turma);
  const versoes = x.descs.filter((d) => d.aluno === aluno && d.rodada === rodada).sort((a, b) => a.versao - b.versao)
    .map((d) => { const p = x.palps.find((p) => p.descricao === d.id); return { versao: d.versao, texto: d.texto, escolha: p?.escolha ?? null, acertou: p?.acertou ?? null, comColega: !!p }; });
  const ultima = versoes[versoes.length - 1];
  const reescrever = rodada === 2 && !!ultima && ultima.acertou === false && ultima.versao < MAX_VERSOES;

  // tarefa de adivinhar: a que já está aberta para mim, ou uma nova (só depois de escrever a minha)
  let tarefa = x.palps.find((p) => p.aluno === aluno && p.escolha === null && x.descs.find((d) => d.id === p.descricao)?.rodada === rodada) ?? null;
  if (!tarefa && versoes.length) tarefa = await pegarTarefa(s, aluno, rodada, x);
  const descTarefa = tarefa ? x.descs.find((d) => d.id === tarefa!.descricao) : null;
  const feitas = x.palps.filter((p) => p.aluno === aluno && p.acertou !== null && x.descs.find((d) => d.id === p.descricao)?.rodada === rodada);

  return {
    ok: true as const, fase: s.fase, nome: eu.nome, rodada, quadro, versoes, reescrever,
    tarefa: tarefa && descTarefa ? { id: tarefa.id, texto: descTarefa.texto, versao: descTarefa.versao, opcoes: tarefa.opcoes } : null,
    adivinhei: { feitas: feitas.length, acertos: feitas.filter((p) => p.acertou).length },
  };
}

export async function enviarDescricao(codigo: string, aluno: string, texto: string) {
  const s = await sala(codigo);
  const rodada = s && rodadaDa(s.fase);
  if (!s || !rodada) return { ok: false as const, erro: "Espere o professor começar a rodada." };
  const t = String(texto ?? "").trim().slice(0, 700);
  if (t.length < 15) return { ok: false as const, erro: "Escreva um pouco mais: o colega só vai ter as suas palavras." };
  const { data: vs } = await db().from("arboria_quadro_descricoes").select("id, versao").eq("aluno", aluno).eq("rodada", rodada).order("versao");
  const lista = (vs ?? []) as { id: string; versao: number }[];
  const ultima = lista[lista.length - 1];
  if (ultima) {
    if (rodada === 1) return { ok: false as const, erro: "Você já mandou a sua descrição." };
    const { data: p } = await db().from("arboria_quadro_palpites").select("acertou").eq("descricao", ultima.id).maybeSingle();
    if (p?.acertou !== false || ultima.versao >= MAX_VERSOES) return { ok: false as const, erro: "Espere o colega responder." };
  }
  const { error } = await db().from("arboria_quadro_descricoes").insert({
    sala: s.codigo, aluno, rodada, versao: (ultima?.versao ?? 0) + 1, quadro: quadroSecreto(aluno, rodada, s.turma), texto: t,
  });
  if (error) return { ok: false as const, erro: "Não consegui mandar. Tente de novo." };
  return { ok: true as const };
}

export async function responder(codigo: string, aluno: string, palpite: string, escolha: string) {
  const c = db();
  const { data: p } = await c.from("arboria_quadro_palpites").select("id, descricao, aluno, escolha, opcoes, sala").eq("id", palpite).maybeSingle();
  if (!p || p.aluno !== aluno || p.sala !== limpar(codigo, 4) || p.escolha) return { ok: false as const };
  if (!(p.opcoes as string[]).includes(escolha)) return { ok: false as const };
  const { data: d } = await c.from("arboria_quadro_descricoes").select("quadro").eq("id", p.descricao).single();
  const acertou = d?.quadro === escolha;
  await c.from("arboria_quadro_palpites").update({ escolha, acertou, respondido_em: new Date().toISOString() }).eq("id", palpite).is("escolha", null);
  return { ok: true as const, acertou, certo: d?.quadro as string };
}
