import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { Erro, avisar, canalAula } from "./servidor";

/**
 * A Corte de Arboria (26/10/2026, aula do 4º ano em 27/10). O estado da sessão de cada turma fica em mundo_corte (só o professor muda) e os
 * toques dos alunos (Quero ser, voto no tema, mão levantada) em mundo_corte_acoes (uma linha por toque, sem atropelar).
 * Os postos seguem a montagem da sala no jogo (Arboria/Mundo/jogo/src/corte.js e corte-dados.js): a quantidade de cada função sai do
 * tamanho da turma (distribuir), e os ids dos assentos são os mesmos do jogo.
 * Depois de cada ação do professor, o estado vai para os tablets pelo canal da aula da turma ("corte").
 */
const db = () => createAdminClient();
type Estado = {
  n: number; fase: "livre" | "tema" | "funcao"; faseId: number; temas: string[]; tema: string | null; funcao: string | null;
  postos: Record<string, string>; sorteio: { funcao: string; candidatos: string[]; vencedores: string[]; em: string } | null; v: number;
};

// a mesma regra do jogo (corte-dados.js: distribuir)
export function distribuir(n: number) {
  const resto = n - 7; let imp = Math.ceil(resto / 6); if (imp % 2 === 0) imp++; imp = Math.max(3, imp);
  let lados = resto - imp, sobra = 0; if (lados % 2) { sobra = 1; lados--; }
  return { presidencia: 3, guardiao: 1, cronistas: 3 + sobra, imparciais: imp, favor: lados / 2, contra: lados / 2 };
}
const seq = (p: string, k: number) => Array.from({ length: k }, (_, i) => p + "-" + (i + 1));
// as funções na ordem da aula, com os assentos de cada uma e o que a função faz (para o tablet e para a TV)
export function funcoes(n: number) {
  const q = distribuir(n);
  return [
    { id: "presidente", nome: "Presidente", assentos: ["presidente"], faz: "Abre e encerra a sessão, dá a palavra a quem levanta a mão e cuida para todos serem ouvidos." },
    { id: "vice", nome: "Vice-presidente", assentos: ["vice"], faz: "Ajuda o presidente, conta os votos e assume a sessão se o presidente precisar." },
    { id: "secretario", nome: "Secretário", assentos: ["secretario"], faz: "Anota no livro da Corte o tema, as ideias e as decisões." },
    { id: "guardiao", nome: "Guardião do Tempo", assentos: ["guardiao"], faz: "Cuida da ampulheta e avisa quando o tempo de fala de cada um acabou." },
    { id: "cronistas", nome: "Cronistas", assentos: seq("cronista", q.cronistas), faz: "Observam tudo e escrevem a notícia da sessão para a TV da praça." },
    { id: "favor", nome: "A favor", assentos: seq("favor", q.favor), faz: "Defendem o tema com bons argumentos." },
    { id: "contra", nome: "Contra", assentos: seq("contra", q.contra), faz: "Mostram o outro lado do tema, com respeito." },
    { id: "imparciais", nome: "Imparciais", assentos: seq("imparcial", q.imparciais), faz: "Ouvem os dois lados com atenção e votam no final." },
  ];
}

async function turmaDe(turmaId: string) {
  const { data } = await db().from("mundo_alunos").select("id, nome").eq("turma_id", turmaId).order("nome");
  return data || [];
}
async function ler(turmaId: string): Promise<Estado> {
  const { data } = await db().from("mundo_corte").select("estado").eq("turma_id", turmaId).maybeSingle();
  const e = (data?.estado || {}) as Partial<Estado>;
  const n = e.n || (await turmaDe(turmaId)).filter((a) => a.id !== "teste").length || 30;
  return { n, fase: e.fase || "livre", faseId: e.faseId || 1, temas: e.temas || [], tema: e.tema ?? null, funcao: e.funcao ?? null, postos: e.postos || {}, sorteio: e.sorteio ?? null, v: e.v || 0 };
}
async function gravar(turmaId: string, e: Estado) {
  e.v++; await db().from("mundo_corte").upsert({ turma_id: turmaId, estado: e, atualizado_em: new Date().toISOString() }, { onConflict: "turma_id" });
  const { data: au } = await db().from("mundo_aulas").select("codigo, ate").eq("turma_id", turmaId).maybeSingle();
  if (au && new Date(au.ate) > new Date()) await avisar(canalAula(au.codigo), "corte", { estado: publico(e) });
  return e;
}
const publico = (e: Estado) => ({ n: e.n, fase: e.fase, faseId: e.faseId, temas: e.temas, tema: e.tema, funcao: e.funcao, postos: e.postos, sorteio: e.sorteio, v: e.v,
  funcaoInfo: e.funcao ? funcoes(e.n).find((f) => f.id === e.funcao) || null : null });
async function acoes(turmaId: string, fase: number) {
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, tipo, valor, em").eq("turma_id", turmaId).eq("fase", fase).order("em");
  const quero: string[] = [], votos: Record<string, number> = {}, maos: Record<string, string> = {};
  for (const a of data || []) {
    if (a.tipo === "quero" && !quero.includes(a.aluno_id)) quero.push(a.aluno_id);
    if (a.tipo === "desisto") { const i = quero.indexOf(a.aluno_id); if (i >= 0) quero.splice(i, 1); }
    if (a.tipo === "voto") votos[a.aluno_id] = Number(a.valor);
  }
  // as mãos valem em qualquer fase: a última de cada aluno (desde o começo do dia)
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const { data: m } = await db().from("mundo_corte_acoes").select("aluno_id, valor, em").eq("turma_id", turmaId).eq("tipo", "mao").gte("em", hoje.toISOString()).order("em");
  for (const a of m || []) { if (a.aluno_id === "*") { for (const k of Object.keys(maos)) delete maos[k]; } else if (a.valor === "1") maos[a.aluno_id] = a.em; else delete maos[a.aluno_id]; }   // "*": o professor baixou todas
  return { quero, votos, maos };
}

// ---------- o jogo (aluno com sessão) ----------
export async function corteDoAluno(alunoId: string) {
  const { data: a } = await db().from("mundo_alunos").select("turma_id").eq("id", alunoId).maybeSingle(); if (!a) throw new Erro(404, "Aluno não encontrado.");
  const [e, lista] = await Promise.all([ler(a.turma_id), turmaDe(a.turma_id)]), ac = await acoes(a.turma_id, e.faseId);
  // o lugar na plateia: a ordem do aluno na lista da turma (cada um tem o seu, sem combinar)
  return { estado: publico(e), eu: { candidato: ac.quero.includes(alunoId), voto: ac.votos[alunoId] ?? null, mao: !!ac.maos[alunoId], plateia: Math.max(0, lista.findIndex((x) => x.id === alunoId)) } };
}
export async function acaoDoAluno(alunoId: string, tipo: string, valor: string) {
  if (!["quero", "desisto", "voto", "mao"].includes(tipo)) throw new Erro(400, "Ação desconhecida.");
  const { data: a } = await db().from("mundo_alunos").select("turma_id").eq("id", alunoId).maybeSingle(); if (!a) throw new Erro(404, "Aluno não encontrado.");
  const e = await ler(a.turma_id);
  if ((tipo === "quero" || tipo === "desisto") && e.fase !== "funcao") throw new Erro(409, "Nenhuma função aberta agora.");
  if (tipo === "quero" && Object.values(e.postos).includes(alunoId)) throw new Erro(409, "Você já tem uma função.");
  if (tipo === "voto" && e.fase !== "tema") throw new Erro(409, "A votação do tema não está aberta.");
  await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: e.faseId, aluno_id: alunoId, tipo, valor: String(valor ?? "") });
  return { ok: true };
}

// ---------- o painel do professor ----------
export async function painel(turmaId: string) {
  const [e, alunos, { data: on }] = await Promise.all([ler(turmaId), turmaDe(turmaId), db().from("mundo_online").select("aluno_id, sala").gte("visto_em", new Date(Date.now() - 60e3).toISOString())]);
  const online = new Map((on || []).map((o) => [o.aluno_id, o.sala]));
  const ac = await acoes(turmaId, e.faseId);
  return { estado: publico(e), funcoes: funcoes(e.n), alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, online: online.get(a.id) || null })), ...ac };
}
export async function acaoDoProfessor(turmaId: string, b: Record<string, unknown>) {
  const e = await ler(turmaId), F = funcoes(e.n), op = String(b.op || "");
  const livres = (f: (typeof F)[number]) => f.assentos.filter((s) => !e.postos[s]);
  const tirar = (id: string) => { for (const [s, x] of Object.entries(e.postos)) if (x === id) delete e.postos[s]; };
  if (op === "tamanho") { e.n = Math.max(20, Math.min(35, Number(b.n) || e.n)); for (const s of Object.keys(e.postos)) if (!funcoes(e.n).some((f) => f.assentos.includes(s))) delete e.postos[s]; }
  else if (op === "temas") { e.temas = (Array.isArray(b.temas) ? b.temas : []).map((t) => String(t).slice(0, 120)).filter(Boolean).slice(0, 6); e.fase = "tema"; e.faseId++; e.funcao = null; }
  else if (op === "tema") { e.tema = b.tema == null ? null : String(b.tema).slice(0, 160); e.fase = "livre"; }
  else if (op === "abrir") { if (!F.some((f) => f.id === b.funcao)) throw new Erro(400, "Função desconhecida."); e.funcao = String(b.funcao); e.fase = "funcao"; e.faseId++; e.sorteio = null; }
  else if (op === "fechar") { e.fase = "livre"; e.funcao = null; }
  else if (op === "eleger") {   // os vencedores (escolhidos ou sorteados no painel) vão para os assentos livres da função aberta
    const f = F.find((x) => x.id === (b.funcao || e.funcao)); if (!f) throw new Erro(400, "Nenhuma função aberta.");
    const ids = (Array.isArray(b.alunos) ? b.alunos : []).map(String), vagas = livres(f);
    ids.slice(0, vagas.length).forEach((id, i) => { tirar(id); e.postos[vagas[i]] = id; });
    if (Array.isArray(b.candidatos)) e.sorteio = { funcao: f.id, candidatos: (b.candidatos as unknown[]).map(String), vencedores: ids, em: new Date().toISOString() };
    if (!livres(f).length) { e.fase = "livre"; e.funcao = null; }
  }
  else if (op === "atribuir") { const s = String(b.assento || ""); if (!F.some((f) => f.assentos.includes(s))) throw new Erro(400, "Assento desconhecido."); if (b.aluno) { tirar(String(b.aluno)); e.postos[s] = String(b.aluno); } else delete e.postos[s]; }
  else if (op === "preencher") {   // quem ainda está sem função vai, sorteado, para as vagas que sobraram (imparciais por último)
    const alunos = (await turmaDe(turmaId)).map((a) => a.id).filter((id) => id !== "teste");
    const somenteOn = b.somenteOnline !== false; let lista = alunos.filter((id) => !Object.values(e.postos).includes(id));
    if (somenteOn) { const { data: on } = await db().from("mundo_online").select("aluno_id").gte("visto_em", new Date(Date.now() - 60e3).toISOString()); const s = new Set((on || []).map((o) => o.aluno_id)); lista = lista.filter((id) => s.has(id)); }
    for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
    for (const f of F) for (const s of livres(f)) { const id = lista.shift(); if (!id) break; e.postos[s] = id; }
    e.fase = "livre"; e.funcao = null;
  }
  else if (op === "maos") { await db().from("mundo_corte_acoes").insert({ turma_id: turmaId, fase: e.faseId, aluno_id: "*", tipo: "mao", valor: "0" }); }
  else if (op === "limpar") { e.postos = {}; e.temas = []; e.tema = null; e.fase = "livre"; e.funcao = null; e.sorteio = null; e.faseId++; }
  else throw new Erro(400, "Ação desconhecida.");
  await gravar(turmaId, e);
  return painel(turmaId);
}
