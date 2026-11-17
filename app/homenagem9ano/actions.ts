"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { alunoDoPasse, conferirAluno, listarTurma, passeDe, primeiroNome, sugerirAlunos } from "@/lib/homenagem-9ano";
import { BUCKET_HOMENAGEM, MAX_FOTOS, QUEM_OPCOES, type StatusParte } from "@/lib/homenagem-9ano-texto";

/**
 * Ações da página dos pais (/homenagem9ano). O arquivo NÃO passa por aqui: a ação cria uma URL
 * assinada e o navegador manda o vídeo direto para o Storage (server action tem limite de 4 MB).
 */

export interface EnvioFamilia {
  id: string;
  quem: string;
  parte1: boolean;
  parte2: boolean;
  status1: StatusParte;
  status2: StatusParte;
  observacao1: string | null;
  observacao2: string | null;
  fotos: number;
}

export type Entrada =
  | { ok: true; passe: string; nome: string; primeiro: string; envios: EnvioFamilia[] }
  | { ok: false; erro: string };

async function enviosDo(alunoId: number): Promise<EnvioFamilia[]> {
  const { data } = await createAdminClient()
    .from("homenagem_9ano_envios")
    .select("id, quem, parte1, parte2, status1, status2, observacao1, observacao2, fotos")
    .eq("aluno_id", alunoId)
    .order("criado_em");
  return (data ?? []).map((e) => ({
    id: e.id,
    quem: e.quem,
    parte1: !!e.parte1,
    parte2: !!e.parte2,
    status1: e.status1 as StatusParte,
    status2: e.status2 as StatusParte,
    observacao1: e.observacao1,
    observacao2: e.observacao2,
    fotos: Array.isArray(e.fotos) ? e.fotos.length : 0,
  }));
}

async function alunoPeloPasse(passe: string) {
  const id = alunoDoPasse(passe);
  if (!id) return null;
  const turma = await listarTurma().catch(() => []);
  return turma.find((a) => a.id === id) ?? null;
}

/** Nomes da turma enquanto o pai digita (a partir de 3 letras). */
export async function buscarAluno(termo: string) {
  return sugerirAlunos(termo).catch(() => []);
}

/** Aluno escolhido na lista + data de nascimento. */
export async function entrar(alunoId: number, nascimento: string): Promise<Entrada> {
  if (!alunoId) return { ok: false, erro: "Digite o nome e toque no seu filho ou na sua filha na lista." };
  let aluno;
  try {
    aluno = await conferirAluno(Number(alunoId), nascimento);
  } catch {
    return { ok: false, erro: "Não consegui consultar a lista da turma agora. Tente de novo em alguns minutos." };
  }
  if (!aluno) return { ok: false, erro: "A data de nascimento não confere. Confira e tente de novo." };
  return { ok: true, passe: passeDe(aluno.id), nome: aluno.nome, primeiro: primeiroNome(aluno.nome), envios: await enviosDo(aluno.id) };
}

/** Volta a entrar com o passe guardado no celular (sem digitar de novo). */
export async function retomar(passe: string): Promise<Entrada> {
  const aluno = await alunoPeloPasse(passe);
  if (!aluno) return { ok: false, erro: "" };
  return { ok: true, passe, nome: aluno.nome, primeiro: primeiroNome(aluno.nome), envios: await enviosDo(aluno.id) };
}

export async function criarEnvio(passe: string, quem: string, outro: string, nome: string) {
  const aluno = await alunoPeloPasse(passe);
  if (!aluno) return { ok: false as const, erro: "Sua entrada expirou. Entre de novo." };
  if (!(QUEM_OPCOES as readonly string[]).includes(quem)) return { ok: false as const, erro: "Escolha quem vai gravar." };
  const limpar = (s: string) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const quemGrava = limpar(nome);
  if (quemGrava.length < 2) return { ok: false as const, erro: "Escreva o seu nome." };
  const parentesco = quem === "Outra pessoa da família" ? limpar(outro) || "Família" : quem;
  const rotulo = `${parentesco} · ${quemGrava}`; // "Mãe · Ana Souza"
  const { data: envios } = await createAdminClient().from("homenagem_9ano_envios").select("id").eq("aluno_id", aluno.id);
  if ((envios?.length ?? 0) >= 6) return { ok: false as const, erro: "Esta família já tem muitos envios. Fale com a escola." };
  const { data, error } = await createAdminClient()
    .from("homenagem_9ano_envios")
    .insert({ aluno_id: aluno.id, aluno_nome: aluno.nome, quem: rotulo })
    .select("id")
    .single();
  if (error || !data) return { ok: false as const, erro: "Não consegui começar. Tente de novo." };
  return { ok: true as const, id: data.id as string };
}

type Tipo = "parte1" | "parte2" | "foto";
const EXT = /^(mp4|mov|webm|m4v|3gp|jpg)$/;

async function envioDaFamilia(passe: string, envioId: string) {
  const aluno = await alunoPeloPasse(passe);
  if (!aluno) return null;
  const { data } = await createAdminClient()
    .from("homenagem_9ano_envios")
    .select("id, aluno_id, parte1, parte2, fotos")
    .eq("id", envioId)
    .maybeSingle();
  return data && data.aluno_id === aluno.id ? data : null;
}

/** URL para o navegador subir o arquivo direto no Storage. */
export async function prepararArquivo(passe: string, envioId: string, tipo: Tipo, ext: string) {
  const envio = await envioDaFamilia(passe, envioId);
  if (!envio) return { ok: false as const, erro: "Sua entrada expirou. Entre de novo." };
  const e = String(ext).toLowerCase();
  if (!EXT.test(e) || (tipo === "foto") !== (e === "jpg")) return { ok: false as const, erro: "Tipo de arquivo inválido." };
  if (tipo === "foto" && (envio.fotos as string[]).length >= MAX_FOTOS) return { ok: false as const, erro: `Dá para enviar até ${MAX_FOTOS} fotos.` };
  const path = `${envio.aluno_id}/${envio.id}/${tipo}-${crypto.randomUUID().slice(0, 8)}.${e}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_HOMENAGEM).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

/** Registra o arquivo que já subiu. Vídeo novo de uma parte troca o anterior e volta para "pendente". */
export async function salvarArquivo(passe: string, envioId: string, tipo: Tipo, path: string) {
  const envio = await envioDaFamilia(passe, envioId);
  if (!envio) return { ok: false as const, erro: "Sua entrada expirou. Entre de novo." };
  const prefixo = `${envio.aluno_id}/${envio.id}/`;
  const nome = path.slice(prefixo.length);
  if (!path.startsWith(prefixo) || !new RegExp(`^${tipo}-[0-9a-f]{8}\\.(mp4|mov|webm|m4v|3gp|jpg)$`).test(nome)) {
    return { ok: false as const, erro: "Arquivo inválido." };
  }
  const db = createAdminClient();
  const { data: achado } = await db.storage.from(BUCKET_HOMENAGEM).list(prefixo.slice(0, -1), { search: nome });
  if (!achado?.some((f) => f.name === nome)) return { ok: false as const, erro: "O arquivo não chegou. Tente de novo." };

  const agora = new Date().toISOString();
  if (tipo === "foto") {
    const fotos = [...(envio.fotos as string[]), path].slice(0, MAX_FOTOS);
    const { error } = await db.from("homenagem_9ano_envios").update({ fotos, atualizado_em: agora }).eq("id", envio.id);
    if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
    return { ok: true as const };
  }
  const n = tipo === "parte1" ? "1" : "2";
  const antes = envio[tipo] as string | null;
  const { error } = await db
    .from("homenagem_9ano_envios")
    .update({ [tipo]: path, [`status${n}`]: "pendente", [`observacao${n}`]: null, atualizado_em: agora })
    .eq("id", envio.id);
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  if (antes && antes !== path) await db.storage.from(BUCKET_HOMENAGEM).remove([antes]);
  return { ok: true as const };
}

export async function atualizar(passe: string) {
  const aluno = await alunoPeloPasse(passe);
  return aluno ? await enviosDo(aluno.id) : null;
}
