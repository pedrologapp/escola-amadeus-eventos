import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { filtrar } from "./chat-filtro.js";
import { nomesCurtos } from "./nomes";

/**
 * O servidor do Mundo de Arboria (26/10/2026). A mesma lógica da prévia do jogo (Arboria/Mundo/jogo/servidor/previa.mjs, testada),
 * agora com o banco da escola (tabelas mundo_*, migração 0072) e o tempo real do Supabase para avisar os tablets.
 *  - Entrar: o aluno procura o nome e digita a data de aniversário (ou o cartão com QR). O mundo só deixa entrar LIGADO; desligado,
 *    só quem tem aula aberta na turma (e vai direto para ela).
 *  - Personagem, apelido (o professor aprova), combinado aceito e progresso (inclusive onde estava) ficam aqui.
 *  - A aula é uma instância: o canal de tempo real "mundo-aula-<código>" em vez de "mundo-geral".
 *  - Os avisos do servidor (mundo fechou, recado, levar para a aula, pedido permitido, aula encerrada, chat) vão por broadcast.
 */

const db = () => createAdminClient();
type Linha = Record<string, unknown>;

export const CANAL_MUNDO = "mundo-geral";
export const canalAula = (codigo: string) => "mundo-aula-" + codigo;
const PROGRESSO = ["arboria-passaporte", "arboria-visitados", "arboria-lugares", "arboria-passos", "arboria-intel", "arboria-posicao"];

export class Erro extends Error { constructor(public status: number, msg: string, public extra: Linha = {}) { super(msg); } }

// ---------- tempo real: o servidor manda avisos aos tablets (broadcast pela API REST do Realtime) ----------
export async function avisar(topic: string, event: string, payload: Linha) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + "/realtime/v1/api/broadcast", chave = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  await fetch(url, { method: "POST", headers: { apikey: chave, Authorization: "Bearer " + chave, "Content-Type": "application/json" },
    body: JSON.stringify({ messages: [{ topic, event, payload, private: false }] }) }).catch(() => {});
}

// ---------- alunos ----------
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const rotulo = (nome: string) => { const p = nome.trim().split(/\s+/); return (p.length > 2 ? p.slice(0, 2).join(" ") : p[0]) + (p.length > 1 ? " " + p[p.length - 1][0] + "." : ""); };   // nunca o sobrenome inteiro

export async function procurarAlunos(busca: string) {
  const q = semAcento(busca || "").trim(); if (q.length < 2) return [];
  const { data } = await db().from("mundo_alunos").select("id, nome, turma_nome");
  return (data || []).filter((a) => semAcento(a.nome).split(/\s+/).some((w: string) => w.startsWith(q)) || semAcento(a.nome).startsWith(q))
    .map((a) => ({ id: a.id, rotulo: rotulo(a.nome), turma: a.turma_nome })).sort((x, y) => x.rotulo.localeCompare(y.rotulo, "pt")).slice(0, 8);
}
async function estado() { const { data } = await db().from("mundo_estado").select("ligado, desde").eq("id", 1).maybeSingle(); return { ligado: !!data?.ligado, desde: data?.desde || null }; }
export const estadoMundo = estado;
async function aulaDaTurma(turmaId: string) {
  const { data } = await db().from("mundo_aulas").select("codigo, destino, ate").eq("turma_id", turmaId).maybeSingle();
  return data && new Date(data.ate) > new Date() ? { codigo: data.codigo, destino: data.destino } : null;
}
async function alunoPorId(id: string) { const { data } = await db().from("mundo_alunos").select("*").eq("id", id).maybeSingle(); return data; }

export async function dadosDoAluno(id: string) {
  const a = await alunoPorId(id); if (!a) throw new Erro(404, "Aluno não encontrado.");
  const [{ data: p }, { data: pr }, e] = await Promise.all([db().from("mundo_perfil").select("*").eq("aluno_id", id).maybeSingle(), db().from("mundo_progresso").select("dados").eq("aluno_id", id).maybeSingle(), estado()]);
  const { data: colegas } = await db().from("mundo_alunos").select("id, nome").eq("turma_id", a.turma_id);   // o nome curto sem repetir na turma
  const curto = nomesCurtos(colegas || [])[id] || a.nome.split(/\s+/)[0];
  return {
    aluno: { id, nome: a.nome, primeiroNome: a.nome.split(/\s+/)[0], curto, turma: a.turma_nome, turmaId: a.turma_id, casa: a.casa, pontosSemana: a.pontos_semana || 0 },
    perfil: { aparencia: p?.aparencia || null, apelido: p?.apelido || "", apelidoStatus: p?.apelido_status || "nenhum", trajes: p?.trajes || [], termo: p?.termo || null },
    progresso: pr?.dados || {},
    mundo: { ligado: e.ligado, aula: e.ligado ? null : await aulaDaTurma(a.turma_id) },
  };
}
async function podeEntrar(a: Linha) { const e = await estado(); return e.ligado || !!(await aulaDaTurma(String(a.turma_id))); }
async function novaSessao(alunoId: string) {
  const token = crypto.randomBytes(24).toString("hex");
  await db().from("mundo_sessoes").insert({ token, aluno_id: alunoId, ate: new Date(Date.now() + 10 * 3600e3).toISOString() });
  return token;
}
export async function entrar(alunoId: string, nascimento: string) {
  const a = await alunoPorId(alunoId); if (!a) throw new Erro(400, "Aluno não encontrado.");
  const desde = new Date(Date.now() - 300e3).toISOString();
  const { count } = await db().from("mundo_tentativas").select("*", { count: "exact", head: true }).eq("aluno_id", alunoId).gte("em", desde);
  if ((count || 0) >= 5) throw new Erro(429, "Muitas tentativas. Peça ajuda ao professor.");
  if (!a.nascimento || String(nascimento) !== String(a.nascimento)) { await db().from("mundo_tentativas").insert({ aluno_id: alunoId }); throw new Erro(401, "A data não confere. Tente de novo."); }
  await db().from("mundo_tentativas").delete().eq("aluno_id", alunoId);
  if (!(await podeEntrar(a))) throw new Erro(403, "O Mundo de Arboria está fechado agora.", { fechado: true });
  return { token: await novaSessao(alunoId), ...(await dadosDoAluno(alunoId)) };
}
export async function entrarQr(qr: string) {
  const { data: a } = await db().from("mundo_alunos").select("*").eq("qr", String(qr || "")).maybeSingle();
  if (!a || !qr) throw new Erro(401, "Cartão inválido. Peça um novo ao professor.");
  if (!(await podeEntrar(a))) throw new Erro(403, "O Mundo de Arboria está fechado agora.", { fechado: true });
  return { token: await novaSessao(a.id), ...(await dadosDoAluno(a.id)) };
}
export async function sessao(token: string | null) {
  if (!token) throw new Erro(401, "Sessão encerrada. Entre de novo.");
  const { data } = await db().from("mundo_sessoes").select("aluno_id, ate").eq("token", token).maybeSingle();
  if (!data || new Date(data.ate) < new Date()) throw new Erro(401, "Sessão encerrada. Entre de novo.");
  return data.aluno_id as string;
}
export async function sair(token: string) { await db().from("mundo_sessoes").delete().eq("token", token); }

export async function salvarPerfil(alunoId: string, b: Linha) {
  const { data: atual } = await db().from("mundo_perfil").select("*").eq("aluno_id", alunoId).maybeSingle();
  const novo: Linha = { aluno_id: alunoId, atualizado_em: new Date().toISOString() };
  if (b.aparencia && typeof b.aparencia === "object") novo.aparencia = b.aparencia;
  if (typeof b.apelido === "string" && b.apelido !== (atual?.apelido || "")) { novo.apelido = b.apelido.slice(0, 14); novo.apelido_status = novo.apelido ? "pendente" : "nenhum"; }
  if (Array.isArray(b.trajes)) novo.trajes = b.trajes.slice(0, 3);
  if (b.termo) novo.termo = { versao: Number(b.termo), em: new Date().toISOString() };
  await db().from("mundo_perfil").upsert(novo, { onConflict: "aluno_id" });
  return { apelidoStatus: (novo.apelido_status as string) || atual?.apelido_status || "nenhum" };
}
export async function salvarProgresso(alunoId: string, chaves: Linha) {
  const { data: atual } = await db().from("mundo_progresso").select("dados").eq("aluno_id", alunoId).maybeSingle();
  const dados = { ...(atual?.dados || {}) } as Linha; for (const k of PROGRESSO) if (k in (chaves || {})) dados[k] = chaves[k];
  await db().from("mundo_progresso").upsert({ aluno_id: alunoId, dados, atualizado_em: new Date().toISOString() }, { onConflict: "aluno_id" });
}
// o tablet avisa que está no jogo (de 20 em 20 s): a central mostra quem está on-line e onde
export async function presenca(alunoId: string, sala: string) {
  await db().from("mundo_online").upsert({ aluno_id: alunoId, sala: String(sala || "mundo").slice(0, 40), visto_em: new Date().toISOString() }, { onConflict: "aluno_id" });
}

// ---------- aulas ----------
export async function aulaValida(codigo: string, alunoId: string) {
  const { data: au } = await db().from("mundo_aulas").select("*").eq("codigo", String(codigo || "")).maybeSingle();
  if (!au || new Date(au.ate) < new Date()) throw new Erro(404, "Aula não encontrada. Confira o código na TV.");
  const a = await alunoPorId(alunoId); if (!a || a.turma_id !== au.turma_id) throw new Erro(403, "Esse código é de outra turma.");
  return { destino: au.destino, turma: a.turma_nome };
}
export async function aulasAbertas(alunoId: string) {
  const [{ data: aulas }, a, { data: turmas }] = await Promise.all([db().from("mundo_aulas").select("*"), alunoPorId(alunoId), db().from("mundo_alunos").select("turma_id, turma_nome")]);
  const nomeT = (id: string) => (turmas || []).find((t) => t.turma_id === id)?.turma_nome || id;
  return (aulas || []).filter((x) => new Date(x.ate) > new Date()).map((x) => ({ codigo: x.codigo, turma: nomeT(x.turma_id), destino: x.destino, minhaTurma: x.turma_id === a?.turma_id }));
}
export async function pedirAula(alunoId: string, codigo: string) {
  const { data: au } = await db().from("mundo_aulas").select("*").eq("codigo", String(codigo || "")).maybeSingle();
  if (!au || new Date(au.ate) < new Date()) throw new Erro(404, "Essa aula já terminou.");
  await db().from("mundo_pedidos").delete().eq("aluno_id", alunoId);   // um pedido por vez
  const id = crypto.randomBytes(6).toString("hex"); await db().from("mundo_pedidos").insert({ id, aluno_id: alunoId, codigo: au.codigo });
  return { pedido: id };
}

// ---------- chat: filtra de novo, registra tudo e entrega na sala ----------
export async function chat(alunoId: string, sala: string, txt: string, barradaNoTablet?: string) {
  const a = await alunoPorId(alunoId); if (!a) return { ok: false };
  const desde = new Date(Date.now() - 60e3).toISOString();
  const { count } = await db().from("mundo_chat").select("*", { count: "exact", head: true }).eq("aluno_id", alunoId).eq("ok", true).gte("em", desde);
  const f: { ok: boolean; motivo?: string; texto?: string } = barradaNoTablet ? { ok: false, motivo: barradaNoTablet } : filtrar(String(txt || ""));
  await db().from("mundo_chat").insert({ aluno_id: alunoId, nome: a.nome, turma: a.turma_nome, sala, texto: String(txt || "").slice(0, 200), ok: !!f.ok && (count || 0) < 8, motivo: f.ok ? ((count || 0) >= 8 ? "muitas mensagens" : null) : f.motivo || "barrada" });
  if (!f.ok || (count || 0) >= 8) return { ok: false };
  await avisar(sala === "mundo" ? CANAL_MUNDO : canalAula(sala.replace(/^aula:/, "")), "c", { id: alunoId, txt: f.texto });
  return { ok: true };
}

// ---------- a central (só com o login do painel) ----------
export async function central() {
  const desde = new Date(Date.now() - 60e3).toISOString();
  const [e, { data: on }, { data: alunos }, { data: aulas }, { data: pedidos }, { data: chatLog }, { data: perfis }] = await Promise.all([
    estado(), db().from("mundo_online").select("aluno_id, sala").gte("visto_em", desde), db().from("mundo_alunos").select("*").order("nome"),
    db().from("mundo_aulas").select("*"), db().from("mundo_pedidos").select("*").order("em"), db().from("mundo_chat").select("*").order("em", { ascending: false }).limit(60),
    db().from("mundo_perfil").select("aluno_id, apelido, apelido_status")]);
  const porId = new Map((alunos || []).map((a) => [a.id, a]));
  const online = { mundo: 0, aulas: {} as Record<string, number>, porTurma: {} as Record<string, { mundo: number; aula: number }>, alunos: {} as Record<string, string> };
  for (const o of on || []) { const a = porId.get(o.aluno_id); if (!a) continue; const naAula = o.sala !== "mundo"; if (naAula) online.aulas[o.sala.replace(/^aula:/, "")] = (online.aulas[o.sala.replace(/^aula:/, "")] || 0) + 1; else online.mundo++;
    const t = (online.porTurma[a.turma_id] ||= { mundo: 0, aula: 0 }); t[naAula ? "aula" : "mundo"]++; online.alunos[o.aluno_id] = naAula ? "aula" : "mundo"; }
  const pf = new Map((perfis || []).map((p) => [p.aluno_id, p]));
  const aulasVivas = (aulas || []).filter((x) => new Date(x.ate) > new Date());
  const turmas: Linha[] = [];
  for (const a of alunos || []) { let t = turmas.find((x) => x.id === a.turma_id) as Linha | undefined; if (!t) { t = { id: a.turma_id, nome: a.turma_nome, alunos: [] as Linha[], aula: null }; const au = aulasVivas.find((x) => x.turma_id === a.turma_id); if (au) t.aula = { codigo: au.codigo, destino: au.destino }; turmas.push(t); }
    (t.alunos as Linha[]).push({ id: a.id, nome: a.nome, casa: a.casa, nascimento: a.nascimento, qr: a.qr, apelido: pf.get(a.id)?.apelido || "", apelidoStatus: pf.get(a.id)?.apelido_status || "nenhum" }); }
  turmas.sort((x, y) => (x.id === "teste" ? 1 : y.id === "teste" ? -1 : String(x.nome).localeCompare(String(y.nome), "pt")));
  return { ligado: e.ligado, desde: e.desde, online, turmas,
    pedidos: (pedidos || []).map((p) => { const a = porId.get(p.aluno_id), au = aulasVivas.find((x) => x.codigo === p.codigo); return { id: p.id, nome: a?.nome, turma: a?.turma_nome, aula: au ? porId.size && (alunos || []).find((x) => x.turma_id === au.turma_id)?.turma_nome : "?", destino: au?.destino || "", em: p.em }; }),
    chat: (chatLog || []).map((m) => ({ em: m.em, nome: m.nome, turma: m.turma, sala: m.sala, texto: m.texto, ok: m.ok, motivo: m.motivo })) };
}
export async function ligarMundo(ligado: boolean) {
  await db().from("mundo_estado").upsert({ id: 1, ligado, desde: new Date().toISOString() });
  if (!ligado) await avisar(CANAL_MUNDO, "fechado", {});   // quem está no mundo aberto recebe o aviso e sai (as aulas continuam)
  return { ligado };
}
export async function recado(texto: string) {
  const txt = String(texto || "").trim().slice(0, 140); if (!txt) throw new Erro(400, "Recado vazio.");
  const { data: aulas } = await db().from("mundo_aulas").select("codigo");
  await Promise.all([avisar(CANAL_MUNDO, "recado", { txt }), ...(aulas || []).map((a) => avisar(canalAula(a.codigo), "recado", { txt }))]);
  const desde = new Date(Date.now() - 60e3).toISOString(); const { count } = await db().from("mundo_online").select("*", { count: "exact", head: true }).gte("visto_em", desde);
  return { enviados: count || 0 };
}
async function novoCodigo() { for (;;) { const c = String(crypto.randomInt(1000, 10000)); const { data } = await db().from("mundo_aulas").select("codigo").eq("codigo", c).maybeSingle(); if (!data) return c; } }
export async function encerrarAula(turmaId: string) {
  const { data: au } = await db().from("mundo_aulas").select("codigo").eq("turma_id", turmaId).maybeSingle(); if (!au) return;
  await db().from("mundo_aulas").delete().eq("turma_id", turmaId); await db().from("mundo_pedidos").delete().eq("codigo", au.codigo);
  await avisar(canalAula(au.codigo), "fimAula", {});   // todos voltam ao mundo (desligado: o jogo mostra o aviso de saída)
}
export async function abrirAula(turmaId: string, destino: string) {   // abre (ou troca o destino): a anterior da turma termina
  const { data: au } = await db().from("mundo_aulas").select("*").eq("turma_id", turmaId).maybeSingle();
  if (au && new Date(au.ate) > new Date() && au.destino === destino) return { codigo: au.codigo, destino };
  if (au) await encerrarAula(turmaId);
  const codigo = await novoCodigo(); await db().from("mundo_aulas").insert({ codigo, turma_id: turmaId, destino, ate: new Date(Date.now() + 2 * 3600e3).toISOString() });
  return { codigo, destino };
}
export async function levarTurma(turmaId: string, destino: string) {   // todos da turma que estão no mundo vão para a aula, sem código
  const au = await abrirAula(turmaId, destino);
  await avisar(CANAL_MUNDO, "irAula", { turmaId, codigo: au.codigo, destino: au.destino });
  const desde = new Date(Date.now() - 60e3).toISOString();
  const { data: on } = await db().from("mundo_online").select("aluno_id, mundo_alunos!inner(turma_id)").eq("sala", "mundo").eq("mundo_alunos.turma_id", turmaId).gte("visto_em", desde);
  return { ...au, levados: (on || []).length };
}
export async function responderPedido(id: string, permitir: boolean) {
  const { data: pd } = await db().from("mundo_pedidos").select("*").eq("id", id).maybeSingle(); if (!pd) throw new Erro(404, "Pedido não encontrado.");
  await db().from("mundo_pedidos").delete().eq("id", id);
  const { data: au } = await db().from("mundo_aulas").select("*").eq("codigo", pd.codigo).maybeSingle();
  if (permitir && au && new Date(au.ate) > new Date()) await avisar(CANAL_MUNDO, "irAula", { alunoId: pd.aluno_id, codigo: au.codigo, destino: au.destino });
  else await avisar(CANAL_MUNDO, "pedidoNegado", { alunoId: pd.aluno_id });
  return { ok: true };
}
export async function aprovarApelido(alunoId: string, aprovar: boolean) {
  await db().from("mundo_perfil").update({ apelido_status: aprovar ? "aprovado" : "recusado" }).eq("aluno_id", alunoId);
  return { ok: true };
}
