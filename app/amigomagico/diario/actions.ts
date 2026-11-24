"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { professoraLogada } from "@/lib/amigomagico-acesso";
import { amigoDaCrianca, comNomeRevisado, type AmigoNoDiario } from "@/lib/amigomagico/amigos";
import { revisoesDe } from "@/lib/amigomagico/revisao";
import { alunoDoDiario as alunoDoGrupo, BUCKET_DIARIO, ehTurma, listarAlunos, mensagensDe, type MensagemDiario } from "@/lib/formatura-diario";

/** Toda ação confere no servidor o login do kit (o cookie das professoras): sem ele, nenhum aluno é achado. */
async function alunoDoDiario(id: string) {
  return (await professoraLogada()) ? alunoDoGrupo(id) : null;
}
const SEM_LOGIN = "Sua entrada expirou. Volte ao menu e entre de novo.";

/**
 * Ações do diário (/amigomagico/diario). Só para quem entrou no kit, e ainda:
 * - na lista sai o nome e o sobrenome; o nome inteiro só na conversa do aluno (19/11, Pedro); nunca o id do ERP;
 * - todo pedido confere que o aluno é do Grupo V;
 * - o arquivo não passa por aqui: a ação cria uma URL assinada e o navegador sobe a foto/o áudio direto no
 *   bucket privado; para ouvir/ver, URLs assinadas de 2 horas.
 */

const MAX_MENSAGENS = 300; // por aluno: trava contra abuso do link aberto
const MAX_TEXTO = 2000;

export interface AlunoQuadro {
  id: string;
  curto: string;
  registros: number;
  amigo: AmigoNoDiario | null; // o amigo mágico, quando já está pronto (lib/amigomagico/amigos.ts)
}

export async function alunosDaTurma(turma: string): Promise<{ ok: true; alunos: AlunoQuadro[] } | { ok: false; erro: string }> {
  if (!(await professoraLogada())) return { ok: false, erro: SEM_LOGIN };
  if (!ehTurma(turma)) return { ok: false, erro: "Turma inválida." };
  try {
    const alunos = await listarAlunos(turma);
    const { data } = await createAdminClient()
      .from("formatura_diario_mensagens")
      .select("aluno_id")
      .eq("turma", turma);
    const conta = new Map<string, number>();
    for (const m of data ?? []) conta.set(m.aluno_id, (conta.get(m.aluno_id) ?? 0) + 1);
    const rev = await revisoesDe(alunos.map((a) => a.id)); // o nome que a professora confirmou vale aqui
    return { ok: true, alunos: alunos.map((a) => ({ id: a.id, curto: a.curto, registros: conta.get(a.id) ?? 0, amigo: comNomeRevisado(amigoDaCrianca(a.nome), rev.get(a.id)?.nomeAmigo) })) };
  } catch {
    return { ok: false, erro: "Não consegui abrir a turma agora. Tente de novo." };
  }
}

type Publica = Omit<MensagemDiario, "baixar" | "arquivo">;
const publica = (m: MensagemDiario): Publica => ({ id: m.id, tipo: m.tipo, texto: m.texto, url: m.url, duracao: m.duracao, criadoEm: m.criadoEm });

export async function conversa(alunoId: string): Promise<{ ok: true; curto: string; nome: string; amigo: AmigoNoDiario | null; mensagens: Publica[] } | { ok: false; erro: string }> {
  const aluno = await alunoDoDiario(alunoId);
  if (!aluno) return { ok: false, erro: (await professoraLogada()) ? "Aluno não encontrado." : SEM_LOGIN };
  const m = await mensagensDe([aluno.id]);
  const rev = (await revisoesDe([aluno.id])).get(aluno.id);
  return { ok: true, curto: aluno.curto, nome: aluno.nome, amigo: comNomeRevisado(amigoDaCrianca(aluno.nome), rev?.nomeAmigo), mensagens: (m.get(aluno.id) ?? []).map(publica) };
}

async function cabeMais(alunoId: string) {
  const { count } = await createAdminClient()
    .from("formatura_diario_mensagens")
    .select("id", { count: "exact", head: true })
    .eq("aluno_id", alunoId);
  return (count ?? 0) < MAX_MENSAGENS;
}

export async function mandarTexto(alunoId: string, texto: string) {
  const aluno = await alunoDoDiario(alunoId);
  if (!aluno) return { ok: false as const, erro: (await professoraLogada()) ? "Aluno não encontrado." : SEM_LOGIN };
  const t = String(texto ?? "").replace(/\r\n/g, "\n").trim().slice(0, MAX_TEXTO);
  if (!t) return { ok: false as const, erro: "Escreva alguma coisa." };
  if (!(await cabeMais(aluno.id))) return { ok: false as const, erro: "Este aluno já tem muitos registros." };
  const { data, error } = await createAdminClient()
    .from("formatura_diario_mensagens")
    .insert({ aluno_id: aluno.id, turma: aluno.turma, tipo: "texto", texto: t })
    .select("id, criado_em")
    .single();
  if (error || !data) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  return { ok: true as const, mensagem: { id: data.id, tipo: "texto", texto: t, url: null, duracao: null, criadoEm: data.criado_em } as Publica };
}

type TipoArquivo = "foto" | "audio";
const EXT: Record<TipoArquivo, RegExp> = { foto: /^jpg$/, audio: /^(webm|m4a|mp4|ogg|aac)$/ };

/** URL para o navegador subir a foto ou o áudio direto no bucket privado. */
export async function prepararArquivo(alunoId: string, tipo: TipoArquivo, ext: string) {
  const aluno = await alunoDoDiario(alunoId);
  if (!aluno) return { ok: false as const, erro: (await professoraLogada()) ? "Aluno não encontrado." : SEM_LOGIN };
  const e = String(ext ?? "").toLowerCase();
  if (!(tipo in EXT) || !EXT[tipo].test(e)) return { ok: false as const, erro: "Tipo de arquivo inválido." };
  if (!(await cabeMais(aluno.id))) return { ok: false as const, erro: "Este aluno já tem muitos registros." };
  const path = `${aluno.turma}/${aluno.id}/${tipo}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${e}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_DIARIO).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

/** Registra a foto/o áudio que já subiu e devolve o balão pronto. */
export async function salvarArquivo(alunoId: string, tipo: TipoArquivo, path: string, duracao?: number | null) {
  const aluno = await alunoDoDiario(alunoId);
  if (!aluno) return { ok: false as const, erro: (await professoraLogada()) ? "Aluno não encontrado." : SEM_LOGIN };
  const prefixo = `${aluno.turma}/${aluno.id}/`;
  const nome = String(path ?? "").slice(prefixo.length);
  if (!String(path).startsWith(prefixo) || !new RegExp(`^${tipo}-\\d{13}-[0-9a-f]{8}\\.(jpg|webm|m4a|mp4|ogg|aac)$`).test(nome)) {
    return { ok: false as const, erro: "Arquivo inválido." };
  }
  const db = createAdminClient();
  const { data: achado } = await db.storage.from(BUCKET_DIARIO).list(prefixo.slice(0, -1), { search: nome });
  if (!achado?.some((f) => f.name === nome)) return { ok: false as const, erro: "O arquivo não chegou. Tente de novo." };
  const seg = Number(duracao);
  const { data, error } = await db
    .from("formatura_diario_mensagens")
    .insert({ aluno_id: aluno.id, turma: aluno.turma, tipo, arquivo: path, duracao: Number.isFinite(seg) && seg > 0 ? Math.round(seg * 10) / 10 : null })
    .select("id, criado_em, duracao")
    .single();
  if (error || !data) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  const { data: u } = await db.storage.from(BUCKET_DIARIO).createSignedUrl(path, 60 * 60 * 2);
  return {
    ok: true as const,
    mensagem: { id: data.id, tipo, texto: null, url: u?.signedUrl ?? null, duracao: data.duracao === null ? null : Number(data.duracao), criadoEm: data.criado_em } as Publica,
  };
}
