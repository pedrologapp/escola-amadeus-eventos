"use server";

import { randomBytes, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_TROCAS, foraDaTarefa, limparFala, mensagensDoGuia, sistemaDoGuia, type Fala } from "@/lib/arboria-guia";
import { MAX_VERSOES, TODOS, TURMAS, corProibida, daTurma, imagem, quadroSecreto, quadrosDaRodada, type Fase, type Rodada } from "@/lib/arboria-quadro";

/**
 * "Qual é o quadro?" (Arboria · Linguística, semana 3). A TV abre a sala e manda nas fases;
 * cada tablet entra com o código e escolhe o próprio nome na lista da turma. A troca de descrições
 * é automática: quem já escreveu e está livre recebe a descrição mais antiga que ainda ninguém tentou
 * (nunca a sua, nem a de uma corrente que já tentou). Nas rodadas 2 e 3, se o colega erra, o autor
 * vê os dois quadros lado a lado, recebe uma pergunta da IA e reescreve; a nova versão vai para outro colega.
 */

interface Desc { id: string; aluno: string; rodada: number; versao: number; quadro: string; texto: string; criado_em: string }
interface Palp { id: string; descricao: string; aluno: string; opcoes: string[]; escolha: string | null; acertou: boolean | null; conversa: Fala[] }
interface Melhor { rodada: number; descricao: string; motivo: string }
interface Sala { codigo: string; chave_prof: string; turma: string; fase: Fase; melhores: Melhor[] | null }

const db = () => createAdminClient();
const limpar = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const rodadaDa = (f: Fase): Rodada | null => (f === "r1" ? 1 : f === "r2" ? 2 : f === "r3" ? 3 : null);
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";
/** "MARIA EDUARDA DOS SANTOS" → "Maria Eduarda" (primeiro e segundo nome, sem "de/da/dos"). */
const nomeCurto = (n: string) => n.toLowerCase().split(/\s+/).filter((p) => p && !["de", "da", "do", "das", "dos", "e"].includes(p)).slice(0, 2)
  .map((p) => p[0].toLocaleUpperCase("pt-BR") + p.slice(1)).join(" ");
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
    c.from("arboria_quadro_palpites").select("id, descricao, aluno, opcoes, escolha, acertou, conversa").eq("sala", codigo),
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
  if (!["entrada", "r1", "r1f", "r2", "r2f", "r3", "r3f", "final"].includes(fase)) return;
  await db().from("arboria_quadro_salas").update({ fase }).eq("codigo", codigo);
}


export interface Corrente {
  aluno: string;
  nome: string;
  mostrarNome: boolean;
  quadro: string;
  rodada: Rodada;
  versoes: { id: string; versao: number; texto: string; acertou: boolean | null; escolha: string | null }[];
  resultado: "primeira" | "melhorou" | "nao" | "aberto";
}

/** Uma corrente = as versões de um aluno numa rodada. */
function correntes(rodada: Rodada, x: Awaited<ReturnType<typeof tudo>>): Corrente[] {
  const out: Corrente[] = [];
  for (const al of x.alunos) {
    const vs = x.descs.filter((d) => d.aluno === al.id && d.rodada === rodada).sort((a, b) => a.versao - b.versao);
    if (!vs.length) continue;
    const versoes = vs.map((d) => { const p = x.palps.find((p) => p.descricao === d.id); return { id: d.id, versao: d.versao, texto: d.texto, acertou: p?.acertou ?? null, escolha: p?.escolha ?? null }; });
    const iAcerto = versoes.findIndex((v) => v.acertou === true);
    const ultima = versoes[versoes.length - 1];
    const resultado = iAcerto === 0 ? "primeira" : iAcerto > 0 ? "melhorou" : ultima.acertou === false && (rodada === 1 || ultima.versao >= MAX_VERSOES) ? "nao" : "aberto";
    out.push({ aluno: al.id, nome: al.nome, mostrarNome: al.mostrar_nome, quadro: vs[0].quadro, rodada, versoes, resultado });
  }
  return out;
}

export async function estadoTv(codigo: string, chave: string) {
  const s = await salaDoProfessor(codigo, chave);
  const x = await tudo(s.codigo);
  const porRodada = ([1, 2, 3] as Rodada[]).map((r) => {
    const cs = correntes(r, x);
    const ps = x.palps.filter((p) => x.descs.find((d) => d.id === p.descricao)?.rodada === r && p.acertou !== null);
    // estatística por quadro (aparece na TV quando a rodada é encerrada): quantos descreveram cada um e como foi a 1ª versão
    const quadros = quadrosDaRodada(r, s.turma).map((q) => {
      const doQuadro = cs.filter((c) => c.quadro === q.id);
      return {
        id: q.id, descreveram: doQuadro.length,
        primeira: doQuadro.filter((c) => c.resultado === "primeira").length,
        depois: doQuadro.filter((c) => c.resultado === "melhorou").length,
        errou1: doQuadro.filter((c) => c.versoes[0].acertou === false).length,
        nunca: doQuadro.filter((c) => c.resultado === "nao").length,
      };
    });
    return {
      rodada: r, escreveram: cs.length, palpites: ps.length, acertos: ps.filter((p) => p.acertou).length,
      primeira: cs.filter((c) => c.resultado === "primeira").length, melhorou: cs.filter((c) => c.resultado === "melhorou").length, quadros,
    };
  });
  // a celebração: as 3 melhores de cada rodada, com o nome (se o aluno deixou)
  const todas = [1, 2, 3].flatMap((r) => correntes(r as Rodada, x));
  const melhores = (s.melhores ?? []).map((m) => {
    const c = todas.find((c) => c.versoes.some((v) => v.id === m.descricao));
    const v = c?.versoes.find((v) => v.id === m.descricao);
    return c && v ? { rodada: m.rodada, motivo: m.motivo, texto: v.texto, versao: v.versao, quadro: c.quadro, nome: c.mostrarNome ? c.nome : null } : null;
  }).filter((m) => m !== null);
  return {
    sala: { codigo: s.codigo, turma: s.turma, fase: s.fase, celebrado: !!s.melhores },
    alunos: x.alunos.map((a) => ({ id: a.id, nome: a.nome })),
    rodadas: porRodada, melhores,
  };
}

/**
 * A celebração do final (Pedro, 20/10): a IA lê as descrições que fizeram o colega acertar e escolhe as 3 melhores
 * de cada rodada, com uma frase curta dizendo o que cada uma fez bem. Fica guardada na sala (não escolhe de novo).
 */
export async function celebrar(codigo: string, chave: string) {
  const s = await salaDoProfessor(codigo, chave);
  if (s.melhores) return { ok: true as const };
  const x = await tudo(s.codigo);
  const escolhidos: Melhor[] = [];
  const cliente = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
  for (const r of [1, 2, 3] as Rodada[]) {
    const boas = correntes(r, x).map((c) => ({ c, v: c.versoes.find((v) => v.acertou) })).filter((b) => b.v);
    if (!boas.length) continue;
    let ids = boas.slice(0, 3).map((b) => ({ id: b.v!.id, motivo: "O colega achou o quadro só com essas palavras." }));
    if (cliente) {
      try {
        const lista = boas.map((b, i) => `[${i + 1}] (quadro: ${TODOS[b.c.quadro]?.titulo ?? b.c.quadro}; versão ${b.v!.versao}) ${b.v!.texto}`).join("\n");
        const resp = await cliente.messages.create({
          model: "claude-sonnet-5-5", max_tokens: 3000,
          system: "Você é o Arboria e celebra o trabalho de alunos de 11 a 15 anos numa aula de descrição de quadros. Escolha as 3 descrições que melhor usam a linguagem: palavra exata, comparação própria, ordem que guia o leitor, o sentimento do quadro. Não valorize texto longo por ser longo. Para cada uma, escreva um motivo de celebração em até 14 palavras, em português do Brasil, dizendo o que a descrição fez bem (sem nota, sem crítica, sem comparar alunos). Responda SÓ um JSON: [{\"n\": número, \"motivo\": \"...\"}].",
          messages: [{ role: "user", content: `Rodada ${r}. Descrições que fizeram o colega acertar:\n${lista}` }],
        });
        const bruto = resp.content.map((p) => (p.type === "text" ? p.text : "")).join("");
        const lidos = JSON.parse(bruto.slice(bruto.indexOf("["), bruto.lastIndexOf("]") + 1)) as { n: number; motivo: string }[];
        const validos = lidos.filter((l) => boas[l.n - 1]).slice(0, 3).map((l) => ({ id: boas[l.n - 1].v!.id, motivo: limpar(l.motivo, 140) }));
        if (validos.length) ids = validos;
      } catch { /* sem IA: ficam as primeiras que acertaram */ }
    }
    escolhidos.push(...ids.map((i) => ({ rodada: r, descricao: i.id, motivo: i.motivo })));
  }
  await db().from("arboria_quadro_salas").update({ melhores: escolhidos }).eq("codigo", s.codigo);
  return { ok: true as const };
}

// ---------- tablet (aluno) ----------

/** A lista da turma da sala (tabela alunos), com quem já entrou marcado: o aluno toca no próprio nome. */
export async function listaDaTurma(codigo: string) {
  const s = await sala(codigo);
  if (!s) return { ok: false as const, erro: "Não achei essa sala. Confira o código na TV." };
  const { serie, turma } = daTurma(s.turma);
  const [{ data: lista }, { data: dentro }] = await Promise.all([
    db().from("alunos").select("id, nome_completo").eq("serie", serie).eq("turma", turma).order("nome_completo"),
    db().from("arboria_quadro_alunos").select("escola_aluno").eq("sala", s.codigo),
  ]);
  const ocupados = new Set((dentro ?? []).map((d) => d.escola_aluno));
  return {
    ok: true as const, codigo: s.codigo, turma: s.turma,
    alunos: (lista ?? []).map((a) => ({ id: a.id as string, nome: nomeCurto(a.nome_completo as string), dentro: ocupados.has(a.id) })),
  };
}

/** Entra com o aluno escolhido na lista. Se ele já tinha entrado (tablet trocado ou recarregado), volta para a mesma vaga. */
export async function entrar(codigo: string, escolaAluno: string, mostrarNome: boolean) {
  const s = await sala(codigo);
  if (!s) return { ok: false as const, erro: "Não achei essa sala. Confira o código na TV." };
  const { serie, turma } = daTurma(s.turma);
  const { data: a } = await db().from("alunos").select("id, nome_completo").eq("id", escolaAluno).eq("serie", serie).eq("turma", turma).maybeSingle();
  if (!a) return { ok: false as const, erro: "Toque no seu nome na lista." };
  const { data: ja } = await db().from("arboria_quadro_alunos").select("id").eq("sala", s.codigo).eq("escola_aluno", a.id).maybeSingle();
  if (ja) return { ok: true as const, aluno: ja.id as string, codigo: s.codigo };
  const { data, error } = await db().from("arboria_quadro_alunos")
    .insert({ sala: s.codigo, escola_aluno: a.id, nome: nomeCurto(a.nome_completo as string), mostrar_nome: !!mostrarNome }).select("id").single();
  if (error || !data) return { ok: false as const, erro: "Não consegui entrar. Tente de novo." };
  return { ok: true as const, aluno: data.id as string, codigo: s.codigo };
}

/** Para quem não está na lista da turma (aluno novo, cadastro atrasado): entra com o nome digitado.
 *  O mesmo nome na mesma sala volta para a mesma vaga (tablet trocado ou recarregado). */
export async function entrarSemLista(codigo: string, nomeDigitado: string, mostrarNome: boolean) {
  const s = await sala(codigo);
  if (!s) return { ok: false as const, erro: "Não achei essa sala. Confira o código na TV." };
  const nome = nomeCurto(nomeDigitado.replace(/[^\p{L}\s'-]/gu, " ").trim().slice(0, 60));
  if (nome.replace(/\s/g, "").length < 2) return { ok: false as const, erro: "Escreva seu nome e sobrenome." };
  const { data: ja } = await db().from("arboria_quadro_alunos").select("id").eq("sala", s.codigo).is("escola_aluno", null).ilike("nome", nome).maybeSingle();
  if (ja) return { ok: true as const, aluno: ja.id as string, codigo: s.codigo };
  const { data, error } = await db().from("arboria_quadro_alunos")
    .insert({ sala: s.codigo, escola_aluno: null, nome, mostrar_nome: !!mostrarNome }).select("id").single();
  if (error || !data) return { ok: false as const, erro: "Não consegui entrar. Tente de novo." };
  return { ok: true as const, aluno: data.id as string, codigo: s.codigo };
}

/** Pega para este aluno a descrição mais antiga que ainda ninguém tentou (se ele estiver livre). */
async function pegarTarefa(s: Sala, aluno: string, rodada: Rodada, x: Awaited<ReturnType<typeof tudo>>) {
  const comPalpite = new Set(x.palps.map((p) => p.descricao));
  const ultimaDe = new Map<string, Desc>();
  for (const d of x.descs.filter((d) => d.rodada === rodada)) {
    const u = ultimaDe.get(d.aluno);
    if (!u || d.versao > u.versao) ultimaDe.set(d.aluno, d);
  }
  // o que este aluno pode receber: nunca a própria; a reescrita vai para um colega novo
  // (numa sala muito pequena, de teste, pode voltar para o mesmo)
  const livresPara = (a: string) => {
    const minhas = new Set(x.palps.filter((p) => p.aluno === a).map((p) => p.descricao));
    const jaTenteiDe = new Set(x.alunos.length < 4 ? [] : x.descs.filter((d) => minhas.has(d.id)).map((d) => `${d.aluno}:${d.rodada}`));
    return [...ultimaDe.values()]
      .filter((d) => d.aluno !== a && !comPalpite.has(d.id) && !jaTenteiDe.has(`${d.aluno}:${d.rodada}`))
      .sort((p, q) => p.criado_em.localeCompare(q.criado_em));
  };
  const livres = livresPara(aluno);
  if (!livres.length) return null;
  // justiça: cada descrição vai para uma pessoa só. Quem já adivinhou mais não pega a próxima enquanto
  // houver colega esperando que adivinhou menos e que poderia recebê-la (senão os rápidos levam tudo).
  const daRodada = new Set(x.descs.filter((d) => d.rodada === rodada).map((d) => d.id));
  const nPalps = (a: string) => x.palps.filter((p) => p.aluno === a && daRodada.has(p.descricao)).length;
  const comAberta = new Set(x.palps.filter((p) => p.escolha === null && daRodada.has(p.descricao)).map((p) => p.aluno));
  const meus = nPalps(aluno);
  const naFrente = [...new Set(x.descs.filter((d) => d.rodada === rodada).map((d) => d.aluno))]
    .filter((a) => a !== aluno && !comAberta.has(a) && nPalps(a) < meus && livresPara(a).length > 0).length;
  if (livres.length <= naFrente) return null;
  for (const d of livres.slice(0, 4)) {
    const opcoes = embaralhar(quadrosDaRodada(rodada, s.turma).map((q) => q.id));
    const { data, error } = await db().from("arboria_quadro_palpites").insert({ sala: s.codigo, descricao: d.id, aluno, opcoes }).select("id, descricao, aluno, opcoes, escolha, acertou, conversa").single();
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
    .map((d) => { const p = x.palps.find((p) => p.descricao === d.id); return { versao: d.versao, texto: d.texto, escolha: p?.escolha ?? null, acertou: p?.acertou ?? null, comColega: !!p, conversa: (p?.conversa ?? []) as Fala[] }; });
  const ultima = versoes[versoes.length - 1];
  const reescrever = rodada >= 2 && !!ultima && ultima.acertou === false && ultima.versao < MAX_VERSOES;

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
  const cor = rodada === 3 ? corProibida(t) : null;
  if (cor) return { ok: false as const, erro: `"${cor}…": nesta rodada não vale falar de cor. Nos 8 retratos o cabelo, a roupa, o fundo e as cores são iguais, então isso não ajuda o colega. O que muda é o rosto: o que ele está dizendo?` };
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
  const sl = await sala(codigo);
  if (!sl || !rodadaDa(sl.fase)) return { ok: false as const }; // rodada encerrada pelo professor
  const { data: d } = await c.from("arboria_quadro_descricoes").select("quadro, texto, rodada, versao").eq("id", p.descricao).single();
  const acertou = d?.quadro === escolha;
  await c.from("arboria_quadro_palpites").update({ escolha, acertou, respondido_em: new Date().toISOString() }).eq("id", palpite).is("escolha", null);
  return { ok: true as const, acertou, certo: d?.quadro as string };
}

/** A imagem para a IA: o arquivo do próprio projeto (rodando local) ou, se não der, o endereço público. */
async function fonteDaImagem(id: string) {
  try {
    const dados = await readFile(path.join(process.cwd(), "public", imagem(id)));
    return { type: "base64" as const, media_type: "image/jpeg" as const, data: dados.toString("base64") };
  } catch {
    return { type: "url" as const, url: SITE + imagem(id) };
  }
}

/**
 * A conversa com o Arboria para quem vai reescrever (lib/arboria-guia.ts): sem resposta, abre a conversa
 * (uma vez só); com resposta, guarda a fala do aluno e traz a próxima pergunta. Até MAX_TROCAS perguntas.
 * O guia só vê o quadro do próprio aluno e o texto dele: não sabe qual o colega escolheu.
 */
export async function conversar(codigo: string, aluno: string, resposta?: string) {
  const s = await sala(codigo);
  const rodada = s && rodadaDa(s.fase);
  if (!s || !rodada || rodada < 2) return { ok: false as const };
  const c = db();
  const { data: d } = await c.from("arboria_quadro_descricoes").select("id, versao, quadro, texto").eq("aluno", aluno).eq("rodada", rodada).order("versao", { ascending: false }).limit(1).maybeSingle();
  if (!d) return { ok: false as const };
  const { data: p } = await c.from("arboria_quadro_palpites").select("id, acertou, conversa").eq("descricao", d.id).maybeSingle();
  if (!p || p.acertou !== false) return { ok: false as const };
  let conversa = (p.conversa ?? []) as Fala[];
  const r = limpar(resposta, 300);
  if (!r && conversa.length) return { ok: true as const, conversa };                         // já aberta
  if (r && conversa[conversa.length - 1]?.de !== "arboria") return { ok: true as const, conversa }; // fora de ordem
  if (conversa.filter((f) => f.de === "arboria").length >= MAX_TROCAS) return { ok: true as const, conversa };
  if (r) conversa = [...conversa, { de: "aluno", texto: r }];
  const chave = process.env.ANTHROPIC_API_KEY;
  let fala = "Releia a sua descrição como se você fosse o colega. O que você precisaria ler para ter certeza?";
  if (chave) {
    try {
      const resp = await new Anthropic({ apiKey: chave }).messages.create({
        model: "claude-sonnet-5-5", max_tokens: 1500, system: sistemaDoGuia(rodada), // folga para o modelo pensar antes da pergunta
        messages: mensagensDoGuia(await fonteDaImagem(d.quadro), d.texto, d.versao, conversa) as Anthropic.MessageParam[],
      });
      const bruto = resp.content.map((x) => (x.type === "text" ? x.text : "")).join("");
      if (r && foraDaTarefa(bruto)) conversa[conversa.length - 1] = { ...conversa[conversa.length - 1], fora: true };
      fala = limparFala(bruto) || fala;
    } catch { /* sem IA: fica a pergunta padrão */ }
  }
  conversa = [...conversa, { de: "arboria", texto: fala }];
  await c.from("arboria_quadro_palpites").update({ conversa }).eq("id", p.id);
  return { ok: true as const, conversa };
}
