import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { nomeBonito } from "@/lib/fotos-infancia";

/**
 * Diário da formatura do Grupo V (18/12/2026). As professoras abrem /amigomagico/diario (sem senha, decisão do Pedro),
 * escolhem a turma e o aluno e registram numa conversa: texto, foto e áudio. A escola vê tudo no admin.
 * A turma sai da tabela `alunos` (serie "Grupo V", turma A ou B). Na página aberta só aparece o nome curto
 * (primeiro nome; o segundo só quando repete na turma). O nome completo fica no admin.
 */

export const BUCKET_DIARIO = "formatura-diario";
export const SERIE_DIARIO = "Grupo V";
export type Turma = "A" | "B";
export type TipoMensagem = "texto" | "foto" | "audio";
export const ehTurma = (t: unknown): t is Turma => t === "A" || t === "B";

export interface AlunoDiario {
  id: string;
  nome: string; // completo (só no servidor e no admin)
  curto: string; // o que aparece na página aberta
  turma: Turma;
}

const LIGA = new Set(["de", "da", "do", "das", "dos", "e"]);

/**
 * (19/11, Pedro: "sempre coloque o nome e o sobrenome") o nome e o último sobrenome ("Davi Alexandria"); se repetir na
 * turma (sem contar acento), entra o segundo nome também ("Arthur Gabriel Rufino"). O nome inteiro aparece na conversa.
 */
export function nomesCurtos(nomes: string[]): string[] {
  const igual = (x: string) => x.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const palavras = nomes.map((n) => nomeBonito(n).split(" ").filter((p) => p && !LIGA.has(p.toLowerCase())));
  const curto = palavras.map((p) => (p.length > 1 ? `${p[0]} ${p[p.length - 1]}` : p[0] ?? ""));
  return curto.map((c, i) => {
    const p = palavras[i];
    return curto.filter((x) => igual(x) === igual(c)).length > 1 && p.length > 2 ? `${p[0]} ${p[1]} ${p[p.length - 1]}` : c;
  });
}

/** Nome comparável: sem acento, minúsculo, espaços simples ("Benicio ... De Araújo" = "Benício ... de Araujo"). */
const chaveNome = (n: string) => String(n ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * (18/11, Pedro) o diário mostra SÓ quem vai para a formatura: os formandos são as linhas de formatura_placa_aluno
 * (regra do Pedro de 08/11: vai quem tem pasta de fotos no Drive; turma "Grupo V · A" ou "Grupo V · B"). Se alguém
 * entrar ou sair dessa tabela, o diário acompanha sozinho. Cruza com `alunos` pelo nome normalizado e pela turma.
 */
async function formandos(): Promise<Set<string>> {
  const { data, error } = await createAdminClient().from("formatura_placa_aluno").select("nome, turma");
  if (error) throw new Error(error.message);
  return new Set((data ?? []).map((f) => `${String(f.turma ?? "").slice(-1)}|${chaveNome(f.nome)}`));
}

export async function listarAlunos(turma?: Turma): Promise<AlunoDiario[]> {
  let q = createAdminClient().from("alunos").select("id, nome_completo, turma").eq("serie", SERIE_DIARIO);
  if (turma) q = q.eq("turma", turma);
  const [{ data, error }, vao] = await Promise.all([q, formandos()]);
  if (error) throw new Error(error.message);
  const porTurma = new Map<Turma, { id: string; nome: string }[]>();
  for (const a of data ?? []) {
    if (!ehTurma(a.turma)) continue;
    if (!vao.has(`${a.turma}|${chaveNome(String(a.nome_completo ?? ""))}`)) continue;
    const l = porTurma.get(a.turma) ?? [];
    l.push({ id: a.id as string, nome: nomeBonito(String(a.nome_completo ?? "")) });
    porTurma.set(a.turma, l);
  }
  const todos: AlunoDiario[] = [];
  for (const [t, l] of porTurma) {
    l.sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
    const curtos = nomesCurtos(l.map((a) => a.nome));
    l.forEach((a, i) => todos.push({ ...a, curto: curtos[i], turma: t }));
  }
  return todos.sort((x, y) => x.turma.localeCompare(y.turma) || x.nome.localeCompare(y.nome, "pt-BR"));
}

/** O aluno, se for mesmo um formando do Grupo V (toda ação do diário confere isso). */
export async function alunoDoDiario(id: string): Promise<AlunoDiario | null> {
  if (!/^[0-9a-f-]{36}$/i.test(String(id ?? ""))) return null;
  const { data } = await createAdminClient().from("alunos").select("id, turma, serie").eq("id", id).maybeSingle();
  if (!data || data.serie !== SERIE_DIARIO || !ehTurma(data.turma)) return null;
  return (await listarAlunos(data.turma)).find((a) => a.id === id) ?? null;
}

export interface MensagemDiario {
  id: string;
  tipo: TipoMensagem;
  texto: string | null;
  url: string | null; // URL assinada temporária (foto ou áudio)
  baixar: string | null; // URL assinada que baixa o arquivo (só no admin)
  arquivo: string | null;
  duracao: number | null;
  criadoEm: string;
}

/** As mensagens de um ou mais alunos, com URLs assinadas (o bucket é privado). */
export async function mensagensDe(alunoIds: string[], opcoes: { horas?: number; baixar?: boolean } = {}) {
  const porAluno = new Map<string, MensagemDiario[]>();
  if (!alunoIds.length) return porAluno;
  const db = createAdminClient();
  const { data } = await db
    .from("formatura_diario_mensagens")
    .select("id, aluno_id, tipo, texto, arquivo, duracao, criado_em")
    .in("aluno_id", alunoIds)
    .order("criado_em");
  const linhas = data ?? [];
  const caminhos = linhas.map((l) => l.arquivo).filter(Boolean) as string[];
  const ver = new Map<string, string>();
  const baixar = new Map<string, string>();
  if (caminhos.length) {
    const validade = 60 * 60 * (opcoes.horas ?? 2);
    const [a, b] = await Promise.all([
      db.storage.from(BUCKET_DIARIO).createSignedUrls(caminhos, validade),
      opcoes.baixar ? db.storage.from(BUCKET_DIARIO).createSignedUrls(caminhos, validade, { download: true }) : Promise.resolve({ data: [] }),
    ]);
    for (const s of a.data ?? []) if (s.path && s.signedUrl) ver.set(s.path, s.signedUrl);
    for (const s of b.data ?? []) if (s.path && s.signedUrl) baixar.set(s.path, s.signedUrl);
  }
  for (const l of linhas) {
    const lista = porAluno.get(l.aluno_id) ?? [];
    lista.push({
      id: l.id,
      tipo: l.tipo as TipoMensagem,
      texto: l.texto,
      url: l.arquivo ? ver.get(l.arquivo) ?? null : null,
      baixar: l.arquivo ? baixar.get(l.arquivo) ?? null : null,
      arquivo: l.arquivo,
      duracao: l.duracao === null ? null : Number(l.duracao),
      criadoEm: l.criado_em,
    });
    porAluno.set(l.aluno_id, lista);
  }
  return porAluno;
}
