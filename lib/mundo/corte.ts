import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { Erro, avisar, canalAula, estadoMundo, CANAL_MUNDO } from "./servidor";
import { nomesCurtos } from "./nomes";

/**
 * A Corte de Arboria (26/10/2026, aula do 4º ano em 27/10). O estado da sessão de cada turma fica em mundo_corte (só o professor muda) e os
 * toques dos alunos (Quero ser, voto no tema, mão levantada) em mundo_corte_acoes (uma linha por toque, sem atropelar).
 * Os postos seguem a montagem da sala no jogo (Arboria/Mundo/jogo/src/corte.js e corte-dados.js): a quantidade de cada função sai do
 * tamanho da turma (distribuir), e os ids dos assentos são os mesmos do jogo.
 * Depois de cada ação do professor, o estado vai para os tablets pelo canal da aula da turma ("corte").
 */
const db = () => createAdminClient();
// ---------- o DEBATE (04/11/2026, Pedro: "enviar para a Corte, iniciar o debate, os controles do debate: tudo definido") ----------
// O professor conduz pelo painel: a rodada, quem está com a palavra (o aluno caminha até o púlpito-mirante no jogo), a ampulheta (cada tela
// conta pelo próprio relógio a partir do id), as palmas, o voto do júri (os imparciais votam no tablet; ações 'juri' com fase = 100000 + id
// da votação) e o veredito (a balança da sala pende para o lado vencedor). O mesmo de Arboria/Mundo no ar/servidor/corte-previa.mjs.
type Fala = { vez: number; aluno: string; lado: string; etapa?: string; texto: string; em: number };
type Debate = { x?: Record<string, any>; vez?: number; falas?: Fala[]; manchetes?: { aluno: string; texto: string; em: number }[]; camera?: string; id?: number; pontos?: Record<string, number>; estatisticas?: { palmas: [string, number][]; pontos: [string, number][]; faladodia?: string | null }; rodada: number; orador: { aluno: string; lado: string; assento: string; etapa?: string; alvo?: string; alvoAluno?: string } | null; tempo: { id: number; s: number } | null; palmas: number;
  juri: "fechado" | "aberto" | "revelado"; juriId: number; placar: { favor: number; contra: number } | null; veredito: "favor" | "contra" | "empate" | null };
const DEBATE_VAZIO = (): Debate => ({ rodada: 0, orador: null, tempo: null, palmas: 0, juri: "fechado", juriId: 0, placar: null, veredito: null });
const FASE_JURI = 100000, FASE_PALMAS = 200000;
async function palmasPorFala(turmaId: string, debateId: number) {   // a maior conta de palmas de cada fala ('aluno|vez:aluno')
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, valor").eq("turma_id", turmaId).eq("tipo", "palmas").eq("fase", FASE_PALMAS).like("valor", (debateId || 0) + "|%");
  const por: Record<string, number> = {}; for (const a of data || []) { const [, k, n] = String(a.valor).split("|"); por[a.aluno_id + "|" + k] = Math.max(por[a.aluno_id + "|" + k] || 0, +n || 0); } return por;
}
function calcularPontos(e: Estado, votos: Record<string, string>, palmas: Record<string, number>, notas: Record<string, number> = {}, extra: { anot?: Record<string, number>; dia?: string | null } = {}) {   // (05/11) os pontos do debate, por aluno (total e de onde vieram)
  const r: Record<string, { total: number; por: Record<string, number> }> = {}, d = e.debate || DEBATE_VAZIO(), mais = (id: string, n: number, por: string) => { if (!id) return; const x = (r[id] ||= { total: 0, por: {} }); x.total += n; x.por[por] = (x.por[por] || 0) + n; };
  for (const f of d.falas || []) { if (f.texto === '(passou a vez)') continue; const g = String(f.etapa || '').startsWith('guardiao'); mais(f.aluno, g ? 2 : 3, g ? 'guardiao' : 'fala'); const np = palmas[f.aluno + '|' + f.vez + ':' + f.aluno] || 0; if (np >= 3) mais(f.aluno, Math.min(4, Math.floor(np / 3)), 'palmas'); }   // +1 a cada 3 palmas (até 4)
  const porCron: Record<string, number> = {}; for (const m of d.manchetes || []) if ((porCron[m.aluno] = (porCron[m.aluno] || 0) + 1) <= 3) mais(m.aluno, 2, 'manchete');
  for (const id of Object.keys(votos || {})) mais(id, 2, 'voto');
  for (const [id, n] of Object.entries(notas || {})) if (n >= 2.5) mais(id, 2, 'argumento');   // (05/11) bom argumento: o júri deu 2,5 ou mais
  if (d.veredito === 'favor' || d.veredito === 'contra') for (const [k, id] of Object.entries(e.postos || {})) if (k.startsWith(d.veredito)) mais(id as string, 2, 'vitoria');
  for (const [id, n] of Object.entries(extra.anot || {})) mais(id, Math.min(6, n), 'caderno');   // (05/11) o caderno do Secretário: +1 por anotação certa (até 6)
  for (const v of Object.values(((d as any).x || {}).destaques || {}) as { aluno: string }[]) mais(v.aluno, 2, 'destaque');   // a fala mais forte (Cronistas)
  if (extra.dia) mais(String(extra.dia).split(':')[1], 3, 'faladodia');   // a fala do dia (plateia)
  return r;
}
async function extrasDe(turmaId: string, debateId: number) {   // (05/11) as anotações certas do Secretário e a fala do dia (o voto da plateia)
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, tipo, valor").eq("turma_id", turmaId).in("tipo", ["anotacao", "falaDoDia"]).like("valor", (debateId || 0) + "|%");
  const uma: Record<string, number> = {}, voto: Record<string, string> = {};
  for (const r of data || []) { const p = String(r.valor).split("|"); if (r.tipo === "anotacao") uma[r.aluno_id + "|" + p[1]] = +p[2] || 0; else voto[r.aluno_id] = p[1]; }
  const anot: Record<string, number> = {}; for (const [k, n] of Object.entries(uma)) { const id = k.split("|")[0]; anot[id] = (anot[id] || 0) + n; }
  const cont: Record<string, number> = {}; for (const k of Object.values(voto)) cont[k] = (cont[k] || 0) + 1;
  const top = Object.entries(cont).sort((x, y) => y[1] - x[1])[0]; return { anot, dia: top ? top[0] : null, diaVotos: top ? top[1] : 0 };
}
async function notasDe(turmaId: string, debateId: number) {   // a média das notas do júri que cada aluno recebeu (uma nota por jurado e fala)
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, valor").eq("turma_id", turmaId).eq("tipo", "nota").eq("fase", FASE_PALMAS + 1).like("valor", (debateId || 0) + "|%");
  const uma: Record<string, number> = {}; for (const a of data || []) { const [, k, n] = String(a.valor).split("|"); uma[a.aluno_id + "|" + k] = +n || 0; }
  const soma: Record<string, [number, number]> = {}; for (const [kk, n] of Object.entries(uma)) { const quem = kk.split("|")[1].split(":")[1]; const x = (soma[quem] ||= [0, 0]); x[0] += n; x[1]++; }
  return Object.fromEntries(Object.entries(soma).map(([id, [s, c]]) => [id, Math.round((s / c) * 10) / 10]));
}
async function palmasDe(turmaId: string, debateId: number) {   // (05/11) as palmas que cada aluno recebeu neste debate (a maior conta de cada vez)
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, valor").eq("turma_id", turmaId).eq("tipo", "palmas").eq("fase", FASE_PALMAS).like("valor", (debateId || 0) + "|%");
  const por: Record<string, number> = {}; for (const a of data || []) { const [, k, n] = String(a.valor).split("|"); por[a.aluno_id + "|" + k] = Math.max(por[a.aluno_id + "|" + k] || 0, +n || 0); }
  const r: Record<string, number> = {}; for (const [k, n] of Object.entries(por)) { const id = k.split("|")[0]; r[id] = (r[id] || 0) + n; } return r;
}
// (05/11, Pedro: o debate com as cartas) quem tem a palavra escolhe uma carta de fala; vale uma por vez (o professor escolhe por quem travou)
function falar(d: Debate, texto: string) { texto = texto.trim().slice(0, 200); if (!d.orador || !texto) return false; d.falas ||= []; if (d.falas.some((f) => f.vez === d.vez)) return false; d.falas.push({ vez: d.vez || 0, aluno: d.orador.aluno, lado: d.orador.lado, etapa: d.orador.etapa || "", texto, em: Date.now() }); if (d.falas.length > 80) d.falas.shift(); return true; }
async function votosJuri(turmaId: string, juriId: number) {
  const { data } = await db().from("mundo_corte_acoes").select("aluno_id, valor, em").eq("turma_id", turmaId).eq("tipo", "juri").eq("fase", FASE_JURI + juriId).order("em");
  const v: Record<string, string> = {}; for (const a of data || []) v[a.aluno_id] = a.valor; return v;
}
type Estado = {
  n: number; fase: "livre" | "tema" | "funcao"; faseId: number; temas: string[]; tema: string | null; funcao: string | null;
  postos: Record<string, string>; sorteio: { funcao: string; candidatos: string[]; vencedores: string[]; em: string } | null; v: number;
  slide: number; levados: boolean; sorteando: unknown; extra: Record<string, number>; parte2?: boolean; cerimonia?: boolean; ajeitar?: number; destravar?: { aluno: string; id: number } | null;
  desistencias: { aluno: string; funcao: string; pedido: string; aprovado: boolean; em: string }[];
  log: { em: string; op: string; info: string }[];
  debate: Debate;   // (27/10, Pedro) o registro do que o professor fez (temas, postos, sorteio...); fica só no banco
};

// a mesma regra do jogo (corte-dados.js: distribuir)
export function distribuir(n: number) {
  const resto = n - 7; let imp = Math.ceil(resto / 6); if (imp % 2 === 0) imp++; imp = Math.max(3, imp);
  let lados = resto - imp, sobra = 0; if (lados % 2) { sobra = 1; lados--; }
  return { presidencia: 3, guardiao: 1, cronistas: 3 + sobra, imparciais: imp, favor: lados / 2, contra: lados / 2 };
}
const seq = (p: string, k: number) => Array.from({ length: k }, (_, i) => p + "-" + (i + 1));
// as funções na ordem da aula, com os assentos de cada uma e o que a função faz (para o tablet e para a TV)
// extra: vagas a mais por função (o professor acrescenta no painel; as cadeiras a mais vêm depois)
// (Pedro, 26/10) os lugares são TODAS as cadeiras da sala (a sala é sempre para 30) mais as vagas a mais; a turma (n) só decide a COTA
// de cada função no "preencher o resto" (as cadeiras que sobram ficam livres para o professor usar à mão)
export function funcoes(n: number, extra: Record<string, number> = {}) {
  const q = distribuir(Math.max(30, n)), cota = distribuir(n), x = (id: string) => Number(extra[id]) || 0;
  return [
    { id: "presidente", nome: "Presidente", assentos: ["presidente"], faz: "Abre e encerra a sessão, dá a palavra a quem levanta a mão e cuida para todos serem ouvidos." },
    { id: "vice", nome: "Vice-presidente", assentos: ["vice"], faz: "Ajuda o presidente, conta os votos e assume a sessão se o presidente precisar." },
    { id: "secretario", nome: "Secretário", assentos: ["secretario"], faz: "Anota no livro da Corte o tema, as ideias e as decisões." },
    { id: "guardiao", nome: "Guardião do Tempo", assentos: ["guardiao"], faz: "Cuida da ampulheta e avisa quando o tempo de fala de cada um acabou." },
    { id: "cronistas", nome: "Cronistas", assentos: seq("cronista", Math.max(1, q.cronistas + x("cronistas"))), faz: "Observam tudo e escrevem a notícia da sessão para a TV da praça." },
    { id: "favor", nome: "A favor", assentos: seq("favor", Math.max(1, q.favor + x("favor"))), faz: "Defendem o tema com bons argumentos." },
    { id: "contra", nome: "Contra", assentos: seq("contra", Math.max(1, q.contra + x("contra"))), faz: "Mostram o outro lado do tema, com respeito." },
    { id: "imparciais", nome: "Imparciais", assentos: seq("imparcial", Math.max(1, q.imparciais + x("imparciais"))), faz: "Ouvem os dois lados com atenção e votam no final." },
  ].map((f) => ({ ...f, cota: Math.min(f.assentos.length, ({ cronistas: cota.cronistas, favor: cota.favor, contra: cota.contra, imparciais: cota.imparciais } as Record<string, number>)[f.id] + x(f.id) || f.assentos.length) }));
}

async function turmaDe(turmaId: string) {
  const { data } = await db().from("mundo_alunos").select("id, nome").eq("turma_id", turmaId).order("nome");
  return data || [];
}
async function ler(turmaId: string): Promise<Estado> {
  const { data } = await db().from("mundo_corte").select("estado").eq("turma_id", turmaId).maybeSingle();
  const e = (data?.estado || {}) as Partial<Estado>;
  const n = e.n || (await turmaDe(turmaId)).filter((a) => a.id !== "teste").length || 30;
  return { n: Math.max(20, Math.min(35, n)), fase: e.fase || "livre", faseId: e.faseId || 1, temas: e.temas || [], tema: e.tema ?? null, funcao: e.funcao ?? null, postos: e.postos || {}, sorteio: e.sorteio ?? null, v: e.v || 0, slide: e.slide || 0, levados: !!e.levados, sorteando: e.sorteando ?? null, extra: e.extra || {}, desistencias: e.desistencias || [], log: e.log || [], debate: (e.debate as Debate) || DEBATE_VAZIO(), parte2: !!e.parte2, cerimonia: !!e.cerimonia, ajeitar: e.ajeitar || 0, destravar: e.destravar || null };   // (05/11) sem isto, cada clique seguinte apagava o "debate iniciado"
}
async function gravar(turmaId: string, e: Estado) {
  e.v++; await db().from("mundo_corte").upsert({ turma_id: turmaId, estado: e, atualizado_em: new Date().toISOString() }, { onConflict: "turma_id" });
  const { data: au } = await db().from("mundo_aulas").select("codigo, ate").eq("turma_id", turmaId).maybeSingle();
  if (au && new Date(au.ate) > new Date()) await avisar(canalAula(au.codigo), "corte", { turmaId, estado: publico(e) });
  await avisar(CANAL_MUNDO, "corte", { turmaId, estado: publico(e) });   // quem ainda está no mundo (os slides: "Olhe para a TV")
  return e;
}
const publico = (e: Estado) => ({ destravar: e.destravar || null, ajeitar: e.ajeitar || 0, cerimonia: !!e.cerimonia, parte2: !!e.parte2, n: e.n, fase: e.fase, faseId: e.faseId, temas: e.temas, tema: e.tema, funcao: e.funcao, postos: e.postos, sorteio: e.sorteio, v: e.v, slide: e.slide, levados: e.levados, sorteando: e.sorteando, extra: e.extra, desistencias: e.desistencias.slice(-30), debate: e.debate,
  funcaoInfo: e.funcao ? funcoes(e.n, e.extra).find((f) => f.id === e.funcao) || null : null });
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
  // os pedidos de desistência (com o termo assinado): o último de cada aluno no dia
  const { data: d } = await db().from("mundo_corte_acoes").select("aluno_id, valor, em").eq("turma_id", turmaId).eq("tipo", "desistir").gte("em", hoje.toISOString()).order("em");
  const desistir: Record<string, { assento: string; em: string }> = {}; for (const a of d || []) desistir[a.aluno_id] = { assento: a.valor, em: a.em };
  return { quero, votos, maos, desistir };
}

// ---------- o jogo (aluno com sessão) ----------
export async function corteDoAluno(alunoId: string) {
  const { data: a } = await db().from("mundo_alunos").select("turma_id").eq("id", alunoId).maybeSingle(); if (!a) throw new Erro(404, "Aluno não encontrado.");
  const [e, lista] = await Promise.all([ler(a.turma_id), turmaDe(a.turma_id)]), ac = await acoes(a.turma_id, e.faseId);
  // o lugar na plateia: a ordem do aluno na lista da turma (cada um tem o seu, sem combinar)
  const meuJuri = (await votosJuri(a.turma_id, e.debate.juriId))[alunoId] || null;
  return { estado: publico(e), maos: Object.keys(ac.maos), eu: { juri: meuJuri, candidato: ac.quero.includes(alunoId), voto: ac.votos[alunoId] ?? null, mao: !!ac.maos[alunoId], desistindo: !!ac.desistir[alunoId] && !e.desistencias.some((x) => x.aluno === alunoId && x.pedido === ac.desistir[alunoId].em), plateia: Math.max(0, lista.findIndex((x) => x.id === alunoId)) } };
}
export async function acaoDoAluno(alunoId: string, tipo: string, valor: string) {
  if (!["quero", "desisto", "voto", "mao", "desistir", "juri", "fala", "manchete", "camera", "palmas", "nota", "martelo", "tempoExtra", "responder", "aprovar", "explicar", "destaque", "anotacao", "falaDoDia"].includes(tipo)) throw new Erro(400, "Ação desconhecida.");
  const { data: a } = await db().from("mundo_alunos").select("turma_id").eq("id", alunoId).maybeSingle(); if (!a) throw new Erro(404, "Aluno não encontrado.");
  const e = await ler(a.turma_id);
  if ((tipo === "quero" || tipo === "desisto") && e.fase !== "funcao") throw new Erro(409, "Nenhuma função aberta agora.");
  if (tipo === "quero" && Object.values(e.postos).includes(alunoId)) throw new Erro(409, "Você já tem uma função.");
  if (tipo === "voto" && e.fase !== "tema") throw new Erro(409, "A votação do tema não está aberta.");
  if (tipo === "fala") { const d = e.debate; if (!d.orador || d.orador.aluno !== alunoId) throw new Erro(409, "Agora não é a sua vez."); if (!falar(d, String(valor || ""))) throw new Erro(409, "Você já falou nesta vez."); await gravar(a.turma_id, e); return { ok: true }; }
  if (["martelo", "tempoExtra", "responder", "aprovar", "explicar", "destaque"].includes(tipo)) {   // (05/11) as ferramentas que mudam a tela de todos (no estado, em debate.x)
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || "", d = e.debate, x = (d.x ||= {}), agora = Date.now();
    if (tipo === "martelo") { if (s !== "presidente") throw new Erro(409, "Só o Presidente tem o martelo."); if ((x.martelos || 0) >= 3) throw new Erro(409, "O martelo já foi usado 3 vezes."); if (x.martelo && agora - x.martelo < 30000) throw new Erro(409, "Espere um pouco para bater de novo."); x.martelos = (x.martelos || 0) + 1; x.martelo = agora; }
    else if (tipo === "tempoExtra") { if (s !== "presidente") throw new Erro(409, "Só o Presidente dá tempo extra."); if (x.tempoExtra) throw new Erro(409, "O tempo extra já foi usado."); if (!d.orador) throw new Erro(409, "Ninguém está falando agora."); x.tempoExtra = { vez: d.vez || 0, em: agora }; }
    else if (tipo === "responder") { const lado = s.startsWith("favor") ? "favor" : s.startsWith("contra") ? "contra" : ""; if (!lado) throw new Erro(409, "Só os lados pedem para responder."); x.pedidos ||= {}; if (x.pedidos[lado]) throw new Erro(409, "O seu time já pediu para responder."); x.pedidos[lado] = true; x.pedido = { aluno: alunoId, lado, em: agora }; }
    else if (tipo === "aprovar") { if (s !== "presidente") throw new Erro(409, "Só o Presidente aprova."); if (!x.pedido || x.pedido.resp) throw new Erro(409, "Nenhum pedido agora."); x.pedido.resp = true; x.pedido.aprovado = String(valor) === "sim"; }
    else if (tipo === "explicar") { if (!s.startsWith("imparcial")) throw new Erro(409, "Só o júri pede explicação."); x.explicou ||= {}; if (x.explicou[alunoId]) throw new Erro(409, "Você já pediu uma explicação."); x.explicou[alunoId] = true; x.explica = { aluno: alunoId, alvo: String(valor || "").slice(0, 60), em: agora }; }
    else if (tipo === "destaque") { if (!s.startsWith("cronista")) throw new Erro(409, "Só os Cronistas marcam o destaque."); const m = /^(\d+):([\w-]+)$/.exec(String(valor || "")), f = m && (d.falas || []).find((y) => y.vez === +m[1] && y.aluno === m[2]);
      if (!m || !f || (f.lado !== "favor" && f.lado !== "contra")) throw new Erro(400, "Fala inválida."); x.destaques ||= {}; if (x.destaques[f.lado]) throw new Erro(409, "Esse lado já tem a fala mais forte."); x.destaques[f.lado] = { aluno: f.aluno, k: m[0], por: alunoId, em: agora }; }
    await gravar(a.turma_id, e); return { ok: true };
  }
  if (tipo === "anotacao" || tipo === "falaDoDia") {   // o caderno do Secretário (acertou ou não) e o voto da plateia na fala do dia (nas ações)
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || ""; if (tipo === "anotacao" && s !== "secretario") throw new Erro(409, "Só o Secretário tem o caderno."); if (tipo === "falaDoDia" && s) throw new Erro(409, "Só a plateia vota na fala do dia.");
    const v = String(valor || "").slice(0, 60); if (!/^\d+:[\w-]+(\|[01])?$/.test(v)) throw new Erro(400, "Inválido.");
    await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: tipo === "anotacao" ? FASE_PALMAS + 2 : FASE_PALMAS + 3, aluno_id: alunoId, tipo, valor: (e.debate.id || 0) + "|" + v }); return { ok: true };
  }
  if (tipo === "nota") {   // (05/11) a lupa do jurado: nota de 1 a 3 numa fala ('vez:aluno|n'), uma por fala
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || ""; if (!s.startsWith("imparcial")) throw new Erro(409, "Só o júri dá nota.");
    const m = /^(\d+:[\w-]+)\|([123])$/.exec(String(valor || "")); if (!m) throw new Erro(400, "Nota inválida.");
    await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: FASE_PALMAS + 1, aluno_id: alunoId, tipo: "nota", valor: (e.debate.id || 0) + "|" + m[1] + "|" + m[2] }); return { ok: true };
  }
  if (tipo === "palmas") {   // (05/11) o tablet de quem falou conta as palmas que recebeu (fica nas ações; não mexe no estado)
    const m = /^(\d+:[\w-]+)\|(\d+)$/.exec(String(valor || "")); if (!m) throw new Erro(400, "Palmas inválidas.");
    await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: FASE_PALMAS, aluno_id: alunoId, tipo: "palmas", valor: (e.debate.id || 0) + "|" + m[1] + "|" + Math.min(99, +m[2]) }); return { ok: true };
  }
  if (tipo === "camera") {   // (05/11) o Cronista troca a câmera da TV: a sala ou a cabine dos Cronistas
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || ""; if (!s.startsWith("cronista")) throw new Erro(409, "Só os Cronistas trocam a câmera.");
    e.debate.camera = String(valor) === "cabine" ? "cabine" : "sala"; await gravar(a.turma_id, e); return { ok: true };
  }
  if (tipo === "manchete") {   // (05/11) o Cronista, repórter da Corte: a manchete vai para a tarja da TV
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || ""; if (!s.startsWith("cronista")) throw new Erro(409, "Só os Cronistas mandam manchetes.");
    const t = String(valor || "").trim().slice(0, 160); if (!t) throw new Erro(400, "Manchete vazia."); const d = e.debate; d.manchetes ||= []; d.manchetes.push({ aluno: alunoId, texto: t, em: Date.now() }); if (d.manchetes.length > 30) d.manchetes.shift();
    await gravar(a.turma_id, e); return { ok: true };
  }
  if (tipo === "juri") {   // só os imparciais, com a votação do júri aberta; o placar é avisado ao painel e à TV
    const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId) || ""; if (!s.startsWith("imparcial")) throw new Erro(409, "Só o júri vota agora.");
    if (e.debate.juri !== "aberto") throw new Erro(409, "A votação do júri não está aberta."); if (!["favor", "contra"].includes(String(valor))) throw new Erro(400, "Voto inválido.");
    await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: FASE_JURI + e.debate.juriId, aluno_id: alunoId, tipo: "juri", valor: String(valor) });
    await gravar(a.turma_id, e); return { ok: true };
  }
  if (tipo === "desistir") { const s = Object.keys(e.postos).find((k) => e.postos[k] === alunoId); if (!s) throw new Erro(409, "Você não tem uma função."); valor = s; }
  await db().from("mundo_corte_acoes").insert({ turma_id: a.turma_id, fase: e.faseId, aluno_id: alunoId, tipo, valor: String(valor ?? "") });
  return { ok: true };
}

// ---------- o painel do professor ----------
export async function painel(turmaId: string) {
  const [e, alunos, { data: on }, mundo] = await Promise.all([ler(turmaId), turmaDe(turmaId), db().from("mundo_online").select("aluno_id, sala").gte("visto_em", new Date(Date.now() - 60e3).toISOString()), estadoMundo()]);
  const curtos = nomesCurtos(alunos);
  const online = new Map((on || []).map((o) => [o.aluno_id, o.sala]));
  const ac = await acoes(turmaId, e.faseId);
  const pendentes = Object.entries(ac.desistir).filter(([id, p]) => !e.desistencias.some((x) => x.aluno === id && x.pedido === p.em)).map(([id, p]) => ({ aluno: id, assento: p.assento, em: p.em }));
  return { estado: publico(e), funcoes: funcoes(e.n, e.extra), mundo: mundo.ligado, desistir: pendentes, alunos: alunos.map((a) => ({ id: a.id, nome: a.nome, curto: curtos[a.id], online: online.get(a.id) || null })), palmas: await palmasDe(turmaId, e.debate.id || 0), notas: await notasDe(turmaId, e.debate.id || 0), pontos: calcularPontos(e, await votosJuri(turmaId, e.debate.juriId), await palmasPorFala(turmaId, e.debate.id || 0), await notasDe(turmaId, e.debate.id || 0), await extrasDe(turmaId, e.debate.id || 0)), extras: await extrasDe(turmaId, e.debate.id || 0), juri: await votosJuri(turmaId, e.debate.juriId), quero: ac.quero, votos: ac.votos, maos: ac.maos };
}
export async function acaoDoProfessor(turmaId: string, b: Record<string, unknown>) {
  const e = await ler(turmaId), F = funcoes(e.n, e.extra), op = String(b.op || "");
  const livres = (f: (typeof F)[number]) => f.assentos.filter((s) => !e.postos[s]);
  const tirar = (id: string) => { for (const [s, x] of Object.entries(e.postos)) if (x === id) delete e.postos[s]; };
  // a apresentação (slide, levados para a Corte) e o sorteio animado (o PC conduz; a TV segue)
  if (op === "slide") { e.slide = Math.max(0, Math.min(20, Number(b.slide) || 0)); if (b.levados !== undefined) e.levados = !!b.levados; }
  else if (op === "destravar") e.destravar = { aluno: String(b.aluno || ""), id: Date.now() };   // (05/11) o aluno travado vai para a chegada da praça (ou para o seu lugar na Corte)
  else if (op === "ajeitar") e.ajeitar = (e.ajeitar || 0) + 1;   // (05/11) todos direto para os lugares (quem travou no caminho)
  else if (op === "cerimonia") e.cerimonia = b.ligar !== false;   // (05/11) começar a cerimônia: todos saem do passeio e sentam na plateia
  else if (op === "parte2") { e.parte2 = b.ligar !== false; if (e.parte2) e.cerimonia = true; }   // (05/11) a parte 2: quem tem posto sai da plateia e vai até ele
  else if (op === "sorteando") e.sorteando = b.sorteando ?? null;
  else if (op === "desistencia") {   // o professor autoriza (sai do posto e volta à plateia) ou não (continua)
    const id = String(b.aluno || ""), ac = await acoes(turmaId, e.faseId), p = ac.desistir[id]; if (!p) throw new Erro(404, "Pedido não encontrado.");
    const s = Object.keys(e.postos).find((k) => e.postos[k] === id), f = F.find((x) => x.assentos.includes(s || ""));
    if (b.aprovar && s) delete e.postos[s];
    e.desistencias = [...e.desistencias, { aluno: id, funcao: f ? f.nome : "", pedido: p.em, aprovado: !!b.aprovar, em: new Date().toISOString() }];
  }
  else if (op === "vaga") { const f = String(b.funcao || ""); if (!["cronistas", "favor", "contra", "imparciais"].includes(f)) throw new Erro(400, "Essa função tem um lugar só."); const base = (distribuir(Math.max(30, e.n)) as Record<string, number>)[f];   // (27/10, Pedro) também diminuir abaixo do padrão da sala (mínimo 1 vaga)
    const MAX: Record<string, number> = { cronistas: 5, imparciais: 9, favor: 12, contra: 12 }, novo = Math.max(1 - base, (e.extra[f] || 0) + (Number(b.delta) || 0));   // (05/11) a sala tem espaço: um limite por função
    if (base + novo > MAX[f]) throw new Erro(409, "Não cabe mais na sala: no máximo " + MAX[f] + " nesta função.");
    e.extra = { ...e.extra, [f]: novo };
    const ok = new Set(funcoes(e.n, e.extra).flatMap((x) => x.assentos)); for (const s of Object.keys(e.postos)) if (!ok.has(s)) delete e.postos[s]; }   // quem estava na vaga que saiu volta à plateia
  else if (op === "tamanho") { e.n = Math.max(20, Math.min(35, Number(b.n) || e.n)); for (const s of Object.keys(e.postos)) if (!funcoes(e.n).some((f) => f.assentos.includes(s))) delete e.postos[s]; }
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
    const alunos = (await turmaDe(turmaId)).map((a) => a.id);   // (o Aluno Teste fica só na turma Teste)
    const somenteOn = b.somenteOnline !== false; let lista = alunos.filter((id) => !Object.values(e.postos).includes(id));
    if (somenteOn) { const { data: on } = await db().from("mundo_online").select("aluno_id").gte("visto_em", new Date(Date.now() - 60e3).toISOString()); const s = new Set((on || []).map((o) => o.aluno_id)); lista = lista.filter((id) => s.has(id)); }
    for (let i = lista.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lista[i], lista[j]] = [lista[j], lista[i]]; }
    for (const f of F) { const falta = Math.max(0, f.cota - f.assentos.filter((s) => e.postos[s]).length); for (const s of livres(f).slice(0, falta)) { const id = lista.shift(); if (!id) break; e.postos[s] = id; } }
    for (const f of F) for (const s of livres(f)) { const id = lista.shift(); if (!id) break; e.postos[s] = id; }   // sobrou gente (turma maior que as cotas): as cadeiras livres
    e.fase = "livre"; e.funcao = null;
  }
  else if (op === "maos") { await db().from("mundo_corte_acoes").insert({ turma_id: turmaId, fase: e.faseId, aluno_id: "*", tipo: "mao", valor: "0" }); }
  else if (op === "debate") {
    const d = e.debate, a = String(b.acao || ""), postoDe = (id: string) => Object.keys(e.postos).find((k) => e.postos[k] === id) || "";
    if (a === "rodada") { d.rodada = Math.max(0, Math.min(3, Number(b.n) || 0)); d.orador = null; d.tempo = null; }
    else if (a === "tribuna") { d.vez = (d.vez || 0) + 1; const id = String(b.aluno || ""), s = postoDe(id); d.orador = id ? { aluno: id, lado: s.startsWith("favor") ? "favor" : s.startsWith("contra") ? "contra" : "outro", assento: s, etapa: String(b.etapa || "").slice(0, 30), alvo: String(b.alvo || "").slice(0, 220), alvoAluno: String(b.alvoAluno || "").slice(0, 40) } : null; d.tempo = null; if (!d.rodada) d.rodada = 1; }
    else if (a === "sair") { d.orador = null; d.tempo = null; }
    else if (a === "tempo") d.tempo = { id: Date.now(), s: Math.max(5, Math.min(180, Number(b.s) || 30)) };
    else if (a === "parar") d.tempo = null;
    else if (a === "palmas") d.palmas = (d.palmas || 0) + 1;
    else if (a === "juri-abrir") { d.juri = "aberto"; d.juriId = (d.juriId || 0) + 1; d.placar = null; d.veredito = null; d.orador = null; d.tempo = null; }
    else if (a === "juri-revelar") { const v = Object.values(await votosJuri(turmaId, d.juriId)); d.placar = { favor: v.filter((x) => x === "favor").length, contra: v.filter((x) => x === "contra").length }; d.juri = "revelado"; }
    else if (a === "veredito") { d.veredito = ["favor", "contra", "empate"].includes(String(b.lado)) ? (String(b.lado) as Debate["veredito"]) : null;
      if (d.veredito) { const p = calcularPontos(e, await votosJuri(turmaId, d.juriId), await palmasPorFala(turmaId, d.id || 0), await notasDe(turmaId, d.id || 0), await extrasDe(turmaId, d.id || 0)); d.pontos = Object.fromEntries(Object.entries(p).map(([id, x]) => [id, x.total]));
        const top = (o: Record<string, number>) => Object.entries(o).sort((x, y) => y[1] - x[1]).slice(0, 3); d.estatisticas = { palmas: top(await palmasDe(turmaId, d.id || 0)), pontos: top(d.pontos), faladodia: (await extrasDe(turmaId, d.id || 0)).dia } as Debate["estatisticas"]; } }   // (05/11) o top 3 das palmas e dos pontos   // (05/11) os pontos de cada um, para o tablet mostrar
    else if (a === "fala") falar(d, String(b.texto || ""));   // (05/11) o professor escolhe a fala por quem travou
    else if (a === "zerar" || a === "recomecar") { e.debate = { ...DEBATE_VAZIO(), vez: d.vez || 0, juriId: d.juriId || 0, id: Date.now() };   // (05/11) as vezes e o júri seguem contando; o id novo zera os tablets e a TV
      if (a === "recomecar") { e.debate.rodada = 1; e.parte2 = true; e.cerimonia = true; e.ajeitar = (e.ajeitar || 0) + 1; } }   // mantém tema e cargos; todos aos postos
    else throw new Erro(400, "Ação do debate desconhecida.");
  }
  else if (op === "limpar") { e.parte2 = false; e.cerimonia = false; e.postos = {}; e.temas = []; e.tema = null; e.fase = "livre"; e.funcao = null; e.sorteio = null; e.faseId++; e.debate = DEBATE_VAZIO(); }
  else throw new Erro(400, "Ação desconhecida.");
  if (op !== "slide" && op !== "sorteando" && !(op === "debate" && ["tempo", "parar", "palmas"].includes(String(b.acao)))) { const resto = { ...b }; delete resto.op; e.log = [...e.log, { em: new Date().toISOString(), op, info: JSON.stringify(resto).slice(0, 300) }].slice(-500); }
  await gravar(turmaId, e);
  return painel(turmaId);
}
