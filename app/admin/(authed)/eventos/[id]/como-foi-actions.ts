"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ETIQUETA_TV } from "@/lib/tv";

/**
 * "Como foi" (29/09/2026): fotos e vídeos de um evento que já aconteceu, para
 * o Portal da Família. Ficam no bucket público "eventos" (pasta como-foi/) e
 * os endereços em eventos.imagens_galeria. Só aparecem no portal com
 * mostrar_como_foi ligado.
 */

type R = { ok: true } | { ok: false; erro: string };

async function logado() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return !!data.user;
}

function mudou(id: string) {
  revalidateTag(ETIQUETA_TV, { expire: 0 }); // o portal usa a mesma etiqueta da TV
  revalidatePath(`/admin/eventos/${id}`);
}

async function galeria(id: string) {
  const { data } = await createAdminClient().from("eventos").select("imagens_galeria").eq("id", id).maybeSingle();
  return ((data?.imagens_galeria as string[] | null) ?? []).filter(Boolean);
}

/** Prepara o envio direto do navegador para o armazenamento (vídeo não passa pelo servidor). */
export async function prepararMidia(eventoId: string, nome: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada. Entre de novo." };
  const ext = (nome.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `como-foi/${eventoId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = createAdminClient();
  const { data, error } = await db.storage.from("eventos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio." };
  return { ok: true as const, path, token: data.token, url: db.storage.from("eventos").getPublicUrl(path).data.publicUrl };
}

export async function adicionarMidias(eventoId: string, urls: string[]): Promise<R> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const atual = await galeria(eventoId);
  const { error } = await createAdminClient().from("eventos").update({ imagens_galeria: [...atual, ...urls.filter((u) => !atual.includes(u))] }).eq("id", eventoId);
  if (error) return { ok: false, erro: error.message };
  mudou(eventoId);
  return { ok: true };
}

export async function removerMidia(eventoId: string, url: string): Promise<R> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  const db = createAdminClient();
  const resto = (await galeria(eventoId)).filter((u) => u !== url);
  const { error } = await db.from("eventos").update({ imagens_galeria: resto, ...(resto.length ? {} : { mostrar_como_foi: false }) }).eq("id", eventoId);
  if (error) return { ok: false, erro: error.message };
  // apaga o arquivo só se foi enviado aqui (pasta como-foi/)
  const caminho = url.split("/storage/v1/object/public/eventos/")[1];
  if (caminho?.startsWith(`como-foi/${eventoId}/`)) await db.storage.from("eventos").remove([decodeURIComponent(caminho)]);
  mudou(eventoId);
  return { ok: true };
}

export async function mostrarComoFoi(eventoId: string, mostrar: boolean): Promise<R> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada. Entre de novo." };
  if (mostrar && !(await galeria(eventoId)).length) return { ok: false, erro: "Coloque pelo menos uma foto ou vídeo antes." };
  const { error } = await createAdminClient().from("eventos").update({ mostrar_como_foi: mostrar }).eq("id", eventoId);
  if (error) return { ok: false, erro: error.message };
  mudou(eventoId);
  return { ok: true };
}
