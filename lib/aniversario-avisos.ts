import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Avisos internos de aniversário (Pedro, 24/10/2026). Os cartões para o aniversariante continuam
 * saindo pelo fluxo do n8n às 7h; aqui saem, logo depois, os avisos para a equipe:
 *  - aluno do Infantil ou do F1 faz aniversário → a professora da série recebe (o F2 fica de fora);
 *  - colaborador faz aniversário → as duas coordenações recebem.
 * O envio passa pelo webhook "whatsapp-responder" do n8n (WhatsApp da escola). Cada (dia, número)
 * fica em aniversario_avisos, então rodar de novo no mesmo dia não repete o aviso.
 */

const HOST = "https://siga01.activesoft.com.br/api";
const FUSO = "America/Sao_Paulo"; // horário de Brasília
const WEBHOOK = "https://n8n.escolaamadeus.com/webhook/whatsapp-responder";

export const COORDENACOES = [
  { nome: "Coordenação F1/F2", telefone: "84987595861" },
  { nome: "Coordenação do Infantil", telefone: "84994004023" },
];

/** Professora de cada série (id do colaborador no Activesoft), passado pelo Pedro em 24/10. */
function professoraDa(serie: string, turma: string): number | null {
  const s = serie.toLowerCase();
  if (s.startsWith("maternalzinho")) return 108; // Luana
  if (s.startsWith("maternal")) return 4; // Andréa Leite
  if (s.startsWith("grupo iv")) return 23; // Jaqueline
  if (s.startsWith("grupo v")) return 11; // Auriete
  if (s.startsWith("1º ano")) return 8; // Andréa Leonice
  if (s.startsWith("2º ano")) return 41; // Josesclea
  if (s.startsWith("3º ano")) return 63; // Suziane
  if (s.startsWith("4º ano")) return 10; // Isabelle
  if (s.startsWith("5º ano")) return /\bC\s*$/i.test(turma) ? 138 : 72; // Lais (5º C) | Rita
  return null;
}

type Json = Record<string, unknown>;

async function buscar(caminho: string, token: string): Promise<Json[]> {
  const r = await fetch(`${HOST}/${caminho}`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }, cache: "no-store" });
  if (!r.ok) throw new Error(`Activesoft ${caminho}: ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : ((j?.results as Json[]) ?? []);
}

const CONECTORES = new Set(["de", "da", "do", "das", "dos", "e"]);
const cap = (p: string) => p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR");
/** Dois primeiros nomes, pulando "de", "da"... (o mesmo do cartão). */
export function doisNomes(bruto: string) {
  const partes = bruto.trim().split(/\s+/).filter(Boolean);
  const nomes = partes.slice(0, 1).map(cap);
  for (const p of partes.slice(1)) if (!CONECTORES.has(p.toLowerCase())) { nomes.push(cap(p)); break; }
  return nomes.join(" ");
}
const primeiroNome = (s: string) => cap(s.trim().split(/\s+/)[0] ?? "");
const turmaLegivel = (t: string) => t.replace(/\s+-\s+/, " ").replace(/\b(ANO|GRUPO|MATERNAL)\b/g, (m) => cap(m)).replace(/ºano/i, "º ano");
const telefone = (t: unknown) => {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d.length >= 10 ? d : null;
};

export interface Aviso { para: string; telefone: string; texto: string }

/**
 * Dias que o aviso de hoje cobre. Só sai de segunda a sexta (Pedro, 24/10): no sábado e no domingo não sai
 * nada, e a segunda também avisa quem fez aniversário no fim de semana.
 */
export function diasCobertos(dia: string): { data: string; quando: "hoje" | "sábado" | "domingo" }[] {
  const d = new Date(dia + "T12:00:00Z");
  const semana = d.getUTCDay();
  if (semana === 0 || semana === 6) return [];
  const menos = (n: number) => new Date(d.getTime() - n * 864e5).toISOString().slice(0, 10);
  return semana === 1
    ? [{ data: menos(2), quando: "sábado" }, { data: menos(1), quando: "domingo" }, { data: dia, quando: "hoje" }]
    : [{ data: dia, quando: "hoje" }];
}

/** Monta os avisos do dia (AAAA-MM-DD), sem enviar. */
export async function avisosDoDia(dia: string, token: string): Promise<Aviso[]> {
  const dias = diasCobertos(dia);
  if (!dias.length) return [];
  const [alunos, colaboradores] = await Promise.all([buscar("v0/acesso/alunos/", token), buscar("v1/lista_colaboradores/", token)]);
  const anoDe = (n: unknown) => +String(n).slice(0, 4);
  const bissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
  /** Em qual dos dias cobertos a pessoa faz aniversário (ou undefined). */
  const quando = (n: unknown) => {
    const s = String(n ?? "");
    if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return undefined;
    const m = s.slice(5, 10);
    return dias.find((x) => m === x.data.slice(5, 10) || (m === "02-29" && x.data.slice(5, 10) === "02-28" && !bissexto(+x.data.slice(0, 4))));
  };
  const fazHoje = (n: unknown) => !!quando(n);
  const colabPorId = new Map(colaboradores.map((c) => [c.id as number, c]));

  // Alunos do Infantil e do F1, agrupados por professora.
  const porProfessora = new Map<number, string[]>();
  const vistos = new Set<number>();
  for (const a of alunos) {
    const curso = String(a.nome_curso ?? "");
    if (curso !== "Educação Infantil" && curso !== "Ensino Fundamental I") continue;
    const id = a.id_aluno as number;
    if (!id || vistos.has(id) || !fazHoje(a.data_nascimento)) continue;
    vistos.add(id);
    const prof = professoraDa(String(a.nome_serie ?? ""), String(a.nome_turma ?? ""));
    if (!prof) continue;
    const q = quando(a.data_nascimento)!;
    const idade = +q.data.slice(0, 4) - anoDe(a.data_nascimento);
    const nome = `*${doisNomes(String(a.nome ?? ""))}*, do ${turmaLegivel(String(a.nome_turma ?? ""))}`;
    const linha = q.quando === "hoje" ? `${nome}, que está fazendo ${idade} anos hoje` : `${nome}, que fez ${idade} anos no ${q.quando}`;
    porProfessora.set(prof, [...(porProfessora.get(prof) ?? []), linha]);
  }

  const avisos: Aviso[] = [];
  for (const [prof, linhas] of porProfessora) {
    const c = colabPorId.get(prof);
    const t = telefone(c?.celular);
    if (!c || !t) continue;
    const corpo = linhas.length === 1
      ? `Tem aniversariante na turma: ${linhas[0]}.`
      : `Tem aniversariantes na turma:\n${linhas.map((l) => `- ${l}`).join("\n")}`;
    avisos.push({ para: String(c.nome), telefone: t, texto: `Bom dia, prof. ${primeiroNome(String(c.nome))}!\n\n${corpo}\n\nFica o lembrete para a turma dar os parabéns.\n\nCentro Educacional Amadeus` });
  }

  // Colaboradores: as duas coordenações recebem.
  const aniversariantes = colaboradores.filter((c) => c.ativo !== false && fazHoje(c.data_nascimento));
  if (aniversariantes.length) {
    const nomes = aniversariantes.map((c) => {
      const q = quando(c.data_nascimento)!;
      return `*${doisNomes(String(c.nome ?? ""))}*${q.quando === "hoje" ? " (hoje)" : ` (no ${q.quando})`}`;
    });
    const so = (s: string) => (dias.length === 1 ? s.replace(" (hoje)", "") : s);
    const corpo = nomes.length === 1
      ? `${dias.length === 1 ? "Hoje é" : "Tem"} aniversário de ${so(nomes[0])}, da nossa equipe.`
      : `${dias.length === 1 ? "Hoje é" : "Tem"} aniversário de ${nomes.slice(0, -1).map(so).join(", ")} e ${so(nomes.at(-1)!)}, da nossa equipe.`;
    for (const co of COORDENACOES) {
      // Quem faz aniversário não recebe o aviso do próprio aniversário.
      if (aniversariantes.some((c) => telefone(c.celular) === co.telefone)) continue;
      avisos.push({ para: co.nome, telefone: co.telefone, texto: `Bom dia, coordenação!\n\n${corpo}\n\nFica o lembrete para dar os parabéns.\n\nCentro Educacional Amadeus` });
    }
  }
  return avisos;
}

/** Envia pelo n8n (WhatsApp da escola). */
export async function enviarAviso(a: Aviso): Promise<{ status: "enviado" | "sem_whatsapp" | "erro"; detalhe: string }> {
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { status: "erro", detalhe: "WEBHOOK_CONFIRM_SECRET não configurada" };
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({ chatId: "", telefone: `55${a.telefone}`, texto: a.texto, tipo: "texto", arquivo: null }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; detalhe?: string; status?: string };
    if (j.status === "sem_whatsapp") return { status: "sem_whatsapp", detalhe: "esse número não tem WhatsApp" };
    return r.ok && j.ok ? { status: "enviado", detalhe: "" } : { status: "erro", detalhe: j.detalhe || `HTTP ${r.status}` };
  } catch (e) {
    return { status: "erro", detalhe: (e as Error).message };
  }
}

/** Rodada do dia: monta, pula quem já recebeu hoje e envia. */
export async function rodarAvisos(token: string) {
  const dia = new Date().toLocaleDateString("en-CA", { timeZone: FUSO });
  const db = createAdminClient();
  const { data: feitos } = await db.from("aniversario_avisos").select("telefone").eq("data", dia).eq("status", "enviado");
  const ja = new Set((feitos ?? []).map((f) => f.telefone));
  const resultado: { para: string; status: string }[] = [];
  for (const a of await avisosDoDia(dia, token)) {
    if (ja.has(a.telefone)) continue;
    const r = await enviarAviso(a);
    await db.from("aniversario_avisos").upsert({ data: dia, para: a.para, telefone: a.telefone, texto: a.texto, status: r.status, detalhe: r.detalhe || null }, { onConflict: "data,telefone" });
    resultado.push({ para: a.para, status: r.status });
    await new Promise((ok) => setTimeout(ok, 3000));
  }
  return { dia, resultado };
}
