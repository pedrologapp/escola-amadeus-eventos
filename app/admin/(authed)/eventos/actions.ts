"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { slugify } from "@/lib/utils";

const loteSchema = z.object({
  nome: z.string().min(1, "Nome do lote obrigatório"),
  preco: z.number().min(0, "Preço do lote não pode ser negativo"),
  valido_ate: z.string().nullable(),
});

const tipoIngressoSchema = z.object({
  nome: z.string().min(1, "Nome do ingresso obrigatório"),
  preco: z.number().min(0, "Preço não pode ser negativo"),
  descricao: z.string().optional().nullable(),
  lotes: z.array(loteSchema).optional().default([]),
});

const createEventoSchema = z.object({
  nome: z.string().min(3, "Nome muito curto"),
  descricao_curta: z.string().optional().nullable(),
  descricao_longa: z.string().optional().nullable(),
  data_evento: z.string().min(1, "Informe a data"),
  hora_evento: z.string().optional().nullable(),
  local: z.string().optional().nullable(),
  cor_tematica: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida"),
  series_permitidas: z.array(z.string()).nullable(),
  turmas_permitidas: z.array(z.string()).nullable(),
  metodos_pagamento: z
    .array(z.enum(["pix", "cartao"]))
    .min(1, "Selecione ao menos um método"),
  max_parcelas: z.number().min(1).max(12),
  prazo_inscricao: z.string().optional().nullable(),
  status: z.enum(["rascunho", "publicado"]),
  destinacao_valores: z.string().optional().nullable(),
  infos_importantes: z.array(z.string()),
  tipos_ingresso: z.array(tipoIngressoSchema).min(1, "Adicione ao menos um tipo de ingresso"),
});

export type CreateEventoState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | null;

export async function createEvento(
  _prev: CreateEventoState,
  formData: FormData,
): Promise<CreateEventoState> {
  const raw = {
    nome: formData.get("nome")?.toString() ?? "",
    descricao_curta: emptyToNull(formData.get("descricao_curta")?.toString()),
    descricao_longa: emptyToNull(formData.get("descricao_longa")?.toString()),
    data_evento: formData.get("data_evento")?.toString() ?? "",
    hora_evento: emptyToNull(formData.get("hora_evento")?.toString()),
    local: emptyToNull(formData.get("local")?.toString()),
    cor_tematica: formData.get("cor_tematica")?.toString() ?? "#1B3B7C",
    series_permitidas: parseArrayField(formData, "series_permitidas"),
    turmas_permitidas: parseArrayField(formData, "turmas_permitidas"),
    metodos_pagamento: parseArrayField(formData, "metodos_pagamento") ?? [],
    max_parcelas: Number(formData.get("max_parcelas") ?? 3),
    prazo_inscricao: emptyToNull(formData.get("prazo_inscricao")?.toString()),
    status: (formData.get("status")?.toString() ?? "rascunho") as
      | "rascunho"
      | "publicado",
    destinacao_valores: emptyToNull(
      formData.get("destinacao_valores")?.toString(),
    ),
    infos_importantes: parseInfosImportantes(
      formData.get("infos_importantes")?.toString(),
    ),
    tipos_ingresso: parseTiposIngresso(
      formData.get("tipos_ingresso")?.toString(),
    ),
  };

  const parsed = createEventoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Verifique os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sua sessão expirou. Faça login novamente." };
  }

  // Upload da imagem de capa (se houver)
  let imagemCapaUrl: string | null = null;
  const capaFile = formData.get("imagem_capa") as File | null;
  if (capaFile && capaFile.size > 0) {
    const admin = createAdminClient();
    const ext = capaFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${Date.now()}-${slugify(data.nome)}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from("eventos")
      .upload(fileName, capaFile, {
        contentType: capaFile.type,
        upsert: false,
      });
    if (uploadErr) {
      return { error: `Erro no upload da imagem: ${uploadErr.message}` };
    }
    const { data: publicData } = admin.storage
      .from("eventos")
      .getPublicUrl(fileName);
    imagemCapaUrl = publicData.publicUrl;
  }

  // Gerar slug único
  const baseSlug = slugify(data.nome);
  const slug = await ensureUniqueSlug(baseSlug);

  // Insert evento
  const { data: evento, error: insertErr } = await supabase
    .from("eventos")
    .insert({
      slug,
      nome: data.nome,
      descricao_curta: data.descricao_curta,
      descricao_longa: data.descricao_longa,
      data_evento: data.data_evento,
      hora_evento: data.hora_evento,
      local: data.local,
      imagem_capa_url: imagemCapaUrl,
      cor_tematica: data.cor_tematica,
      series_permitidas: data.series_permitidas,
      turmas_permitidas: data.turmas_permitidas,
      metodos_pagamento: data.metodos_pagamento,
      max_parcelas: data.max_parcelas,
      prazo_inscricao: data.prazo_inscricao,
      status: data.status,
      destinacao_valores: data.destinacao_valores,
      infos_importantes: data.infos_importantes,
    })
    .select("id")
    .single();

  if (insertErr || !evento) {
    return {
      error: `Erro ao salvar evento: ${insertErr?.message ?? "desconhecido"}`,
    };
  }

  // Insert tipos_ingresso
  const tiposToInsert = data.tipos_ingresso.map((tipo, ordem) => ({
    evento_id: evento.id,
    nome: tipo.nome,
    preco: tipo.preco,
    descricao: tipo.descricao,
    lotes: tipo.lotes ?? [],
    ordem,
    ativo: true,
  }));

  const { error: tiposErr } = await supabase
    .from("tipos_ingresso")
    .insert(tiposToInsert);

  if (tiposErr) {
    // Se falhou os tipos, apaga o evento pra não ficar órfão
    await supabase.from("eventos").delete().eq("id", evento.id);
    return { error: `Erro ao salvar tipos de ingresso: ${tiposErr.message}` };
  }

  revalidatePath("/admin/eventos");
  revalidatePath("/");
  redirect("/admin/eventos");
}

// ---------- helpers ----------

function emptyToNull(v: string | undefined): string | null {
  if (!v) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function parseArrayField(fd: FormData, key: string): string[] | null {
  const values = fd.getAll(key).map((v) => v.toString()).filter(Boolean);
  return values.length === 0 ? null : values;
}

function parseInfosImportantes(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function parseTiposIngresso(raw: string | undefined): unknown {
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function ensureUniqueSlug(base: string): Promise<string> {
  const supabase = await createClient();
  let slug = base;
  let n = 1;
  while (true) {
    const { data } = await supabase
      .from("eventos")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) return slug;
    n += 1;
    slug = `${base}-${n}`;
    if (n > 50) return `${base}-${Date.now()}`;
  }
}

// =============================================================
// UPDATE / DELETE / DUPLICATE
// =============================================================

export async function updateEvento(
  eventoId: string,
  _prev: CreateEventoState,
  formData: FormData,
): Promise<CreateEventoState> {
  const raw = {
    nome: formData.get("nome")?.toString() ?? "",
    descricao_curta: emptyToNull(formData.get("descricao_curta")?.toString()),
    descricao_longa: emptyToNull(formData.get("descricao_longa")?.toString()),
    data_evento: formData.get("data_evento")?.toString() ?? "",
    hora_evento: emptyToNull(formData.get("hora_evento")?.toString()),
    local: emptyToNull(formData.get("local")?.toString()),
    cor_tematica: formData.get("cor_tematica")?.toString() ?? "#1B3B7C",
    series_permitidas: parseArrayField(formData, "series_permitidas"),
    turmas_permitidas: parseArrayField(formData, "turmas_permitidas"),
    metodos_pagamento: parseArrayField(formData, "metodos_pagamento") ?? [],
    max_parcelas: Number(formData.get("max_parcelas") ?? 3),
    prazo_inscricao: emptyToNull(formData.get("prazo_inscricao")?.toString()),
    status: (formData.get("status")?.toString() ?? "rascunho") as
      | "rascunho"
      | "publicado",
    destinacao_valores: emptyToNull(
      formData.get("destinacao_valores")?.toString(),
    ),
    infos_importantes: parseInfosImportantes(
      formData.get("infos_importantes")?.toString(),
    ),
    tipos_ingresso: parseTiposIngresso(
      formData.get("tipos_ingresso")?.toString(),
    ),
  };

  const parsed = createEventoSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Verifique os campos destacados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Sua sessão expirou. Faça login novamente." };
  }

  // Imagem: upload novo / remover / manter
  const removerImagem = formData.get("remover_imagem")?.toString() === "1";
  const capaFile = formData.get("imagem_capa") as File | null;
  const imagemUpdate: { imagem_capa_url?: string | null } = {};

  if (capaFile && capaFile.size > 0) {
    const admin = createAdminClient();
    const ext = capaFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const fileName = `${Date.now()}-${slugify(data.nome)}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from("eventos")
      .upload(fileName, capaFile, {
        contentType: capaFile.type,
        upsert: false,
      });
    if (uploadErr) {
      return { error: `Erro no upload da imagem: ${uploadErr.message}` };
    }
    const { data: pub } = admin.storage
      .from("eventos")
      .getPublicUrl(fileName);
    imagemUpdate.imagem_capa_url = pub.publicUrl;
  } else if (removerImagem) {
    imagemUpdate.imagem_capa_url = null;
  }

  const { error: updateErr } = await supabase
    .from("eventos")
    .update({
      nome: data.nome,
      descricao_curta: data.descricao_curta,
      descricao_longa: data.descricao_longa,
      data_evento: data.data_evento,
      hora_evento: data.hora_evento,
      local: data.local,
      cor_tematica: data.cor_tematica,
      series_permitidas: data.series_permitidas,
      turmas_permitidas: data.turmas_permitidas,
      metodos_pagamento: data.metodos_pagamento,
      max_parcelas: data.max_parcelas,
      prazo_inscricao: data.prazo_inscricao,
      status: data.status,
      destinacao_valores: data.destinacao_valores,
      infos_importantes: data.infos_importantes,
      ...imagemUpdate,
    })
    .eq("id", eventoId);

  if (updateErr) {
    return { error: `Erro ao atualizar evento: ${updateErr.message}` };
  }

  // Substitui tipos_ingresso (delete-all + insert-all)
  await supabase.from("tipos_ingresso").delete().eq("evento_id", eventoId);

  const tiposToInsert = data.tipos_ingresso.map((tipo, ordem) => ({
    evento_id: eventoId,
    nome: tipo.nome,
    preco: tipo.preco,
    descricao: tipo.descricao,
    lotes: tipo.lotes ?? [],
    ordem,
    ativo: true,
  }));

  const { error: tiposErr } = await supabase
    .from("tipos_ingresso")
    .insert(tiposToInsert);

  if (tiposErr) {
    return { error: `Erro ao salvar tipos de ingresso: ${tiposErr.message}` };
  }

  revalidatePath("/admin/eventos");
  revalidatePath(`/admin/eventos/${eventoId}`);
  revalidatePath("/");
  redirect(`/admin/eventos/${eventoId}`);
}

export async function deleteEvento(
  eventoId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };

  // Não permite excluir se houver inscrições
  const { count } = await supabase
    .from("inscricoes")
    .select("id", { count: "exact", head: true })
    .eq("evento_id", eventoId);

  if (count && count > 0) {
    return {
      error: `Não dá pra excluir: já existem ${count} inscriçõe${count === 1 ? "" : "s"} neste evento. Cancele-as primeiro ou marque o evento como encerrado.`,
    };
  }

  const { error } = await supabase
    .from("eventos")
    .delete()
    .eq("id", eventoId);
  if (error) return { error: error.message };

  revalidatePath("/admin/eventos");
  revalidatePath("/");
  redirect("/admin/eventos");
}

export async function duplicateEvento(
  eventoId: string,
): Promise<{ error?: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sua sessão expirou." };

  const { data: source, error: fetchErr } = await supabase
    .from("eventos")
    .select(
      "slug, nome, descricao_curta, descricao_longa, data_evento, hora_evento, local, imagem_capa_url, cor_tematica, series_permitidas, turmas_permitidas, metodos_pagamento, max_parcelas, prazo_inscricao, destinacao_valores, infos_importantes, tipos_ingresso(nome, preco, descricao, icone, cor, ordem, ativo)",
    )
    .eq("id", eventoId)
    .maybeSingle();

  if (fetchErr || !source) {
    return { error: "Evento não encontrado." };
  }

  const newSlug = await ensureUniqueSlug(`${source.slug}-copia`);

  const { data: novo, error: insertErr } = await supabase
    .from("eventos")
    .insert({
      slug: newSlug,
      nome: `${source.nome} (cópia)`,
      descricao_curta: source.descricao_curta,
      descricao_longa: source.descricao_longa,
      data_evento: source.data_evento,
      hora_evento: source.hora_evento,
      local: source.local,
      imagem_capa_url: source.imagem_capa_url,
      cor_tematica: source.cor_tematica,
      series_permitidas: source.series_permitidas,
      turmas_permitidas: source.turmas_permitidas,
      metodos_pagamento: source.metodos_pagamento,
      max_parcelas: source.max_parcelas,
      prazo_inscricao: source.prazo_inscricao,
      status: "rascunho",
      destinacao_valores: source.destinacao_valores,
      infos_importantes: source.infos_importantes,
    })
    .select("id")
    .single();

  if (insertErr || !novo) {
    return { error: insertErr?.message ?? "Erro ao duplicar evento." };
  }

  // Clona tipos_ingresso
  const tipos = (source.tipos_ingresso ?? []) as Array<{
    nome: string;
    preco: number;
    descricao: string | null;
    icone: string | null;
    cor: string | null;
    ordem: number;
    ativo: boolean;
  }>;

  if (tipos.length > 0) {
    await supabase.from("tipos_ingresso").insert(
      tipos.map((t) => ({
        evento_id: novo.id,
        nome: t.nome,
        preco: t.preco,
        descricao: t.descricao,
        icone: t.icone,
        cor: t.cor,
        ordem: t.ordem,
        ativo: t.ativo,
      })),
    );
  }

  revalidatePath("/admin/eventos");
  redirect(`/admin/eventos/${novo.id}/editar`);
}
