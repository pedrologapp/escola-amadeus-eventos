"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { limparTelefone } from "@/lib/experiencia";
import { SERIES_2027 } from "./series";

/**
 * Inscrição pela página pública (post nas redes). Entra na lista da Experiência com origem 'site'
 * e presença confirmada. Se o número já estava na lista (recebeu o convite antes), só completa os dados
 * e marca a presença, sem trocar a origem.
 */
export async function inscrever(e: { nome: string; whatsapp: string; serie: string }) {
  const nome = String(e.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  const telefone = limparTelefone(String(e.whatsapp ?? ""));
  const serie = String(e.serie ?? "");
  if (nome.length < 2) return { ok: false as const, erro: "Escreva o seu nome." };
  if (!/^\d{10,11}$/.test(telefone)) return { ok: false as const, erro: "Confira o WhatsApp com DDD, por exemplo (84) 9 8888-7777." };
  if (!SERIES_2027.includes(serie)) return { ok: false as const, erro: "Escolha a série." };

  const db = createAdminClient();
  const agora = new Date().toISOString();
  const { data: antes } = await db.from("experiencia_contatos").select("telefone").eq("telefone", telefone).maybeSingle();
  const { error } = antes
    ? await db.from("experiencia_contatos").update({ responsavel: nome, serie: `${serie} (2027)`, vai_em: agora, vai_texto: "inscrição pelo site", atualizado_em: agora }).eq("telefone", telefone)
    : await db.from("experiencia_contatos").insert({ telefone, responsavel: nome, serie: `${serie} (2027)`, origem: "site", lembrar: true, vai_em: agora, vai_texto: "inscrição pelo site" });
  if (error) return { ok: false as const, erro: "Não consegui salvar agora. Tente de novo em instantes." };
  return { ok: true as const, nome: nome.split(" ")[0] };
}
