"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_CULMINANCIA, ehChave, frentePorChave, limparOutdoors, type Outdoor } from "@/lib/culminancia";

/** O que já foi preenchido para a série/casa (a professora pode voltar e completar). */
export async function lerFrente(chave: string) {
  const f = frentePorChave(chave);
  if (!f) return null;
  const db = createAdminClient();
  const [{ data }, { count }] = await Promise.all([
    db.from("culminancia_frentes").select("inteligencia, professora, ideia_sala, ideia_outdoor, outdoors, enviado_em").eq("chave", chave).maybeSingle(),
    db.from("culminancia_imagens").select("id", { count: "exact", head: true }).eq("frente", chave).eq("tipo", "referencia"),
  ]);
  return {
    inteligencia: f.casa ?? (ehChave(data?.inteligencia) ? data.inteligencia : null),
    professora: data?.professora ?? "",
    ideia_sala: data?.ideia_sala ?? "",
    ideia_outdoor: data?.ideia_outdoor ?? "",
    outdoors: limparOutdoors(data?.outdoors),
    enviado_em: data?.enviado_em ?? null,
    imagens: count ?? 0,
  };
}

/** URL para o navegador subir a imagem direto no Storage (sem passar pelo limite do servidor). */
export async function prepararImagemProfessora(chave: string) {
  if (!frentePorChave(chave)) return { ok: false as const, erro: "Escolha a série ou a casa." };
  const path = `${chave}/prof-${crypto.randomUUID()}.jpg`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_CULMINANCIA).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

/** Documento (Word ou PDF) mandado pela professora, com a extensão original. */
export async function prepararDocumentoProfessora(chave: string, nome: string) {
  if (!frentePorChave(chave)) return { ok: false as const, erro: "Escolha a série ou a casa." };
  const ext = /\.(pdf|docx?)$/i.exec(String(nome ?? ""))?.[1]?.toLowerCase();
  if (!ext) return { ok: false as const, erro: "Só Word (.doc, .docx) ou PDF." };
  const path = `${chave}/doc-${crypto.randomUUID()}.${ext}`;
  const { data, error } = await createAdminClient().storage.from(BUCKET_CULMINANCIA).createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio. Tente de novo." };
  return { ok: true as const, path, token: data.token };
}

export async function enviarIdeias(entrada: {
  chave: string;
  inteligencia: string | null;
  professora: string;
  ideia_sala: string;
  ideia_outdoor: string;
  outdoors: Outdoor[];
  imagens: string[];
}) {
  const f = frentePorChave(entrada.chave);
  if (!f) return { ok: false as const, erro: "Escolha a série ou a casa." };
  const professora = String(entrada.professora ?? "").replace(/\s+/g, " ").trim().slice(0, 120);
  if (professora.length < 3) return { ok: false as const, erro: "Escreva o seu nome." };
  const ideia_sala = String(entrada.ideia_sala ?? "").trim().slice(0, 4000);
  const ideia_outdoor = String(entrada.ideia_outdoor ?? "").trim().slice(0, 4000);
  if (!ideia_outdoor && !ideia_sala) return { ok: false as const, erro: "Conte a ideia da sala ou do outdoor." };

  const db = createAdminClient();
  // só aceita imagens desta série que já chegaram no Storage
  const validas = (entrada.imagens ?? []).filter((p) => new RegExp(`^${f.chave}/(prof-[\\w-]+\\.jpg|doc-[\\w-]+\\.(pdf|docx?))$`).test(p)).slice(0, 30);
  if (validas.length) {
    const { data: arquivos } = await db.storage.from(BUCKET_CULMINANCIA).list(f.chave, { limit: 1000 });
    const existe = new Set((arquivos ?? []).map((a) => `${f.chave}/${a.name}`));
    const chegaram = validas.filter((p) => existe.has(p));
    if (chegaram.length) {
      await db.from("culminancia_imagens").insert(chegaram.map((arquivo) => ({ frente: f.chave, tipo: "referencia", arquivo, legenda: arquivo.includes("/doc-") ? `Documento enviado por ${professora}` : `Enviada por ${professora}` })));
    }
  }

  const { error } = await db.from("culminancia_frentes").upsert({
    chave: f.chave,
    ...(f.casa ? { inteligencia: f.casa } : ehChave(entrada.inteligencia) ? { inteligencia: entrada.inteligencia } : {}),
    professora, ideia_sala: ideia_sala || null, ideia_outdoor: ideia_outdoor || null,
    outdoors: limparOutdoors(entrada.outdoors),
    enviado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false as const, erro: "Não consegui salvar. Tente de novo." };
  revalidatePath("/admin/culminancia");
  revalidatePath(`/admin/culminancia/${f.chave}`);
  return { ok: true as const };
}
