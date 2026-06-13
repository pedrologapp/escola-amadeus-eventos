"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  criarSessaoPortaria,
  encerrarSessaoPortaria,
  portariaAutenticada,
  senhaPortariaValida,
} from "@/lib/portaria-auth";

// ============================================================
// Acesso
// ============================================================

export type EntrarState = { error?: string } | null;

export async function entrarPortaria(
  _prev: EntrarState,
  formData: FormData,
): Promise<EntrarState> {
  const senha = formData.get("senha")?.toString() ?? "";
  if (!senhaPortariaValida(senha)) {
    return { error: "Senha incorreta." };
  }
  await criarSessaoPortaria();
  redirect("/portaria");
}

export async function sairPortaria(): Promise<void> {
  await encerrarSessaoPortaria();
  redirect("/portaria");
}

// ============================================================
// Helpers internos
// ============================================================

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Extrai o token do conteúdo lido. Os QRs do fluxo normal contêm só o token
 * (ex: "AMZ-SAOJOAO-..."); os de reenvio/avulsa contêm "nome | tipo | token".
 * Em ambos, o token é o último segmento separado por "|".
 */
function extrairToken(raw: string): string {
  const txt = (raw || "").trim();
  if (!txt) return "";
  const partes = txt
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length ? partes[partes.length - 1] : txt;
}

async function progresso(
  admin: Admin,
  inscricaoId: string,
): Promise<{ usadas: number; total: number }> {
  const { data } = await admin
    .from("tickets")
    .select("status")
    .eq("inscricao_id", inscricaoId)
    .neq("status", "cancelado");
  const total = data?.length ?? 0;
  const usadas = (data ?? []).filter((t) => t.status === "usado").length;
  return { usadas, total };
}

// ============================================================
// Leitura / validação de QR
// ============================================================

export type ResultadoLeitura =
  | {
      status: "liberado";
      nome: string;
      tipo: string;
      usadas: number;
      total: number;
    }
  | {
      status: "ja_usado";
      nome: string;
      tipo: string;
      usadas: number;
      total: number;
      usadoEm: string | null;
    }
  | { status: "cancelado"; nome: string }
  | { status: "outro_evento"; eventoNome: string }
  | { status: "nao_encontrado"; codigo: string; nomeQr?: string }
  | { status: "erro"; mensagem: string };

/**
 * Alguns QRs trazem "nome | tipo | token". Quando o token não bate com o
 * banco, ainda dá pra mostrar o nome lido para conferência manual na lista.
 */
function nomeDoQr(raw: string): string | undefined {
  const partes = (raw || "")
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);
  return partes.length >= 2 ? partes[0] : undefined;
}

export async function validarTicket(
  eventoId: string,
  codigoRaw: string,
): Promise<ResultadoLeitura> {
  if (!(await portariaAutenticada())) {
    return { status: "erro", mensagem: "Sessão expirada. Entre novamente." };
  }

  const token = extrairToken(codigoRaw);
  if (!token) return { status: "nao_encontrado", codigo: codigoRaw };

  const admin = createAdminClient();
  const { data: ticket, error } = await admin
    .from("tickets")
    .select("id, evento_id, inscricao_id, aluno_nome, nome_tipo, status, usado_em")
    .eq("token", token)
    .maybeSingle();

  if (error) {
    return { status: "erro", mensagem: "Erro ao consultar. Tente de novo." };
  }
  if (!ticket) {
    return { status: "nao_encontrado", codigo: token, nomeQr: nomeDoQr(codigoRaw) };
  }

  const nome = await resolverNome(admin, ticket.aluno_nome, ticket.inscricao_id);

  if (ticket.evento_id !== eventoId) {
    const { data: ev } = await admin
      .from("eventos")
      .select("nome")
      .eq("id", ticket.evento_id)
      .maybeSingle();
    return { status: "outro_evento", eventoNome: ev?.nome ?? "outro evento" };
  }

  if (ticket.status === "cancelado") {
    return { status: "cancelado", nome };
  }

  if (ticket.status === "usado") {
    const prog = await progresso(admin, ticket.inscricao_id);
    return {
      status: "ja_usado",
      nome,
      tipo: ticket.nome_tipo,
      usadoEm: ticket.usado_em,
      ...prog,
    };
  }

  // status 'ativo' → marca como usado de forma atômica.
  // O `.eq("status", "ativo")` garante que apenas uma leitura concorrente vence.
  const { data: upd } = await admin
    .from("tickets")
    .update({ status: "usado", usado_em: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status", "ativo")
    .select("id")
    .maybeSingle();

  const prog = await progresso(admin, ticket.inscricao_id);

  if (!upd) {
    // Outra leitura marcou primeiro (entre o SELECT e o UPDATE).
    return {
      status: "ja_usado",
      nome,
      tipo: ticket.nome_tipo,
      usadoEm: new Date().toISOString(),
      ...prog,
    };
  }

  return { status: "liberado", nome, tipo: ticket.nome_tipo, ...prog };
}

async function resolverNome(
  admin: Admin,
  alunoNome: string | null,
  inscricaoId: string,
): Promise<string> {
  if (alunoNome && alunoNome.trim()) return alunoNome.trim();
  const { data } = await admin
    .from("inscricoes")
    .select("responsavel_nome")
    .eq("id", inscricaoId)
    .maybeSingle();
  return data?.responsavel_nome?.trim() || "Participante";
}

// ============================================================
// Confirmação manual (QR perdido / com problema)
// ============================================================

export type ConfirmacaoManual = {
  ok: boolean;
  usadas?: number;
  total?: number;
  error?: string;
};

export async function confirmarManual(
  eventoId: string,
  inscricaoId: string,
): Promise<ConfirmacaoManual> {
  if (!(await portariaAutenticada())) {
    return { ok: false, error: "Sessão expirada. Entre novamente." };
  }

  const admin = createAdminClient();

  // Próxima senha ativa (menor ordem) dessa inscrição neste evento
  const { data: ticket } = await admin
    .from("tickets")
    .select("id")
    .eq("inscricao_id", inscricaoId)
    .eq("evento_id", eventoId)
    .eq("status", "ativo")
    .order("ordem", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ticket) {
    const prog = await progresso(admin, inscricaoId);
    return { ok: false, error: "Todas as senhas já foram validadas.", ...prog };
  }

  const { data: upd } = await admin
    .from("tickets")
    .update({ status: "usado", usado_em: new Date().toISOString() })
    .eq("id", ticket.id)
    .eq("status", "ativo")
    .select("id")
    .maybeSingle();

  const prog = await progresso(admin, inscricaoId);
  if (!upd) {
    return { ok: false, error: "Outra leitura já validou essa senha.", ...prog };
  }
  return { ok: true, ...prog };
}

// ============================================================
// Lista de participantes
// ============================================================

export type Participante = {
  inscricaoId: string;
  nome: string;
  usadas: number;
  total: number;
};

export async function listarParticipantes(
  eventoId: string,
): Promise<Participante[]> {
  if (!(await portariaAutenticada())) return [];

  const admin = createAdminClient();

  const { data: tickets } = await admin
    .from("tickets")
    .select("inscricao_id, aluno_nome, status")
    .eq("evento_id", eventoId)
    .neq("status", "cancelado");

  if (!tickets || tickets.length === 0) return [];

  // Mapa de nome do responsável (fallback quando o ticket não tem aluno_nome)
  const { data: inscricoes } = await admin
    .from("inscricoes")
    .select("id, responsavel_nome")
    .eq("evento_id", eventoId);
  const respMap = new Map<string, string>();
  for (const i of inscricoes ?? []) {
    respMap.set(i.id, i.responsavel_nome ?? "");
  }

  const grupos = new Map<string, Participante>();
  for (const t of tickets) {
    let g = grupos.get(t.inscricao_id);
    if (!g) {
      const nome =
        (t.aluno_nome && t.aluno_nome.trim()) ||
        respMap.get(t.inscricao_id)?.trim() ||
        "Participante";
      g = { inscricaoId: t.inscricao_id, nome, usadas: 0, total: 0 };
      grupos.set(t.inscricao_id, g);
    }
    g.total += 1;
    if (t.status === "usado") g.usadas += 1;
  }

  return Array.from(grupos.values()).sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );
}
