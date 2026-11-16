"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TV, type BlocoTv, type TipoItem } from "@/lib/tv";

/** O que a equipe cadastra para a TV e a ordem/tempo dos blocos. */

/** Refaz o roteiro guardado do dia (a TV pega na próxima volta) e a tela do admin. */
function mudou() {
  revalidateTag(ETIQUETA_TV, { expire: 0 });
  revalidatePath("/admin/comunicacao/tv");
}

type Resultado = { ok: true } | { ok: false; erro: string };

async function logado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

const TIPOS: TipoItem[] = ["aviso", "recado", "agenda", "frase", "curiosidade", "comemoracao", "rodape", "foto", "conquista", "pessoa"];
const COM_FOTO: TipoItem[] = ["foto", "conquista", "pessoa"];
const data = (v: string | null | undefined) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);

export interface ItemForm {
  id?: string;
  tipo: TipoItem;
  titulo: string;
  texto: string;
  icone: string;
  data: string;
  inicio: string;
  fim: string;
  /** fotos, conquistas e equipe (16/11/2026) */
  imagem?: string;
}

/** Prepara o envio da foto direto do navegador para o balde público "eventos" (pasta tv/). */
export async function prepararFotoTv(nome: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const ext = (nome.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `tv/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = createAdminClient();
  const { data: d, error } = await db.storage.from("eventos").createSignedUploadUrl(path);
  if (error || !d) return { ok: false as const, erro: "Não consegui preparar o envio da foto." };
  return { ok: true as const, path, token: d.token, url: db.storage.from("eventos").getPublicUrl(path).data.publicUrl };
}

export async function salvarItem(f: ItemForm): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (!TIPOS.includes(f.tipo)) return { ok: false, erro: "Tipo inválido." };
  const titulo = f.titulo.trim().slice(0, 200);
  if (!titulo) return { ok: false, erro: "Escreva o texto principal." };
  if ((f.tipo === "agenda" || f.tipo === "comemoracao") && !data(f.data)) return { ok: false, erro: "Escolha o dia." };
  const imagem = COM_FOTO.includes(f.tipo) && f.imagem && /^https:\/\//.test(f.imagem) ? f.imagem.slice(0, 500) : null;
  if ((f.tipo === "foto" || f.tipo === "pessoa") && !imagem) return { ok: false, erro: "Coloque a foto." };
  if (data(f.inicio) && data(f.fim) && f.inicio > f.fim) return { ok: false, erro: "O “até” está antes do “a partir de”." };
  const linha = {
    tipo: f.tipo,
    titulo,
    texto: f.texto.trim().slice(0, 300),
    icone: f.icone.trim().slice(0, 16) || null,
    data: data(f.data),
    inicio: data(f.inicio),
    fim: data(f.fim),
    // só manda a coluna da foto quando é item com foto (assim os outros salvam mesmo antes da migração 0081)
    ...(COM_FOTO.includes(f.tipo) ? { imagem } : {}),
  };
  const db = createAdminClient();
  const { error } = f.id ? await db.from("tv_itens").update(linha).eq("id", f.id) : await db.from("tv_itens").insert(linha);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

/**
 * Álbum de evento (Pedro, 16/11/2026): várias fotos de uma vez com o mesmo nome (o nome do evento). Cada foto vira um
 * item "foto"; na TV, as do mesmo nome passam juntas numa tela só.
 */
export async function salvarAlbum(nome: string, urls: string[], inicio: string, fim: string): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const titulo = nome.trim().slice(0, 80);
  if (!titulo) return { ok: false, erro: "Escreva o nome do evento." };
  const fotos = urls.filter((u) => /^https:\/\//.test(u)).slice(0, 60);
  if (!fotos.length) return { ok: false, erro: "Escolha as fotos." };
  if (data(inicio) && data(fim) && inicio > fim) return { ok: false, erro: "O “até” está antes do “a partir de”." };
  const { error } = await createAdminClient().from("tv_itens").insert(
    fotos.map((imagem) => ({ tipo: "foto", titulo, texto: "", imagem, inicio: data(inicio), fim: data(fim) })),
  );
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

/** Liga, desliga, muda as datas ou apaga um álbum inteiro (todas as fotos com aquele nome). */
export async function mudarAlbum(nome: string, mudanca: { ativo?: boolean; inicio?: string; fim?: string; apagar?: boolean }): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  const alvo = () => db.from("tv_itens");
  const { error } = mudanca.apagar
    ? await alvo().delete().eq("tipo", "foto").eq("titulo", nome)
    : await alvo().update({
      ...(mudanca.ativo !== undefined ? { ativo: mudanca.ativo } : {}),
      ...(mudanca.inicio !== undefined ? { inicio: data(mudanca.inicio) } : {}),
      ...(mudanca.fim !== undefined ? { fim: data(mudanca.fim) } : {}),
    }).eq("tipo", "foto").eq("titulo", nome);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

export async function ativarItem(id: string, ativo: boolean): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_itens").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

export async function apagarItem(id: string): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const { error } = await createAdminClient().from("tv_itens").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}

export async function salvarBlocos(blocos: BlocoTv[]): Promise<Resultado> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const linhas = blocos.map((b, i) => ({ id: b.id, ativo: !!b.ativo, ordem: i + 1, segundos: Math.max(4, Math.min(60, Math.round(b.segundos))) }));
  const { error } = await createAdminClient().from("tv_blocos").upsert(linhas);
  if (error) return { ok: false, erro: error.message };
  mudou();
  return { ok: true };
}
