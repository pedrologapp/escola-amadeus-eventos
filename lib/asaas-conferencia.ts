import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Conferência com o Asaas (direção, 28/09/2026). SÓ LEITURA do Asaas:
 * - guarda tudo que entrou (inclusive o que foi criado fora do sistema, como
 *   os livros parcelados do fluxo antigo "EduHub - Amadeus - Financeiro");
 * - nas cobranças avulsas, soma quanto já entrou de fato (parceladas);
 * - nas pendentes, anota a situação no Asaas (vencida, removida...).
 * Nunca muda status_pagamento: quem marca "pago" e manda a confirmação no
 * WhatsApp continua sendo o fluxo do n8n.
 *
 * Conta: só a conta ATUAL do Asaas (ASAAS_API_KEY). A antiga foi bloqueada e
 * a escola trocou de conta em 08/09/2026; o que veio dela está guardado com
 * conta = "antiga" (migration 0038).
 */

const API = "https://www.asaas.com/api/v3";
const INICIO = "2026-01-01";
const RECEBIDO = ["RECEIVED", "CONFIRMED", "RECEIVED_IN_CASH"];

interface Pagamento {
  id: string;
  value: number;
  netValue?: number;
  status: string;
  billingType?: string;
  description?: string | null;
  externalReference?: string | null;
  paymentDate?: string | null;
  confirmedDate?: string | null;
  clientPaymentDate?: string | null;
  installmentNumber?: number | null;
  estimatedCreditDate?: string | null;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function asaas<T>(caminho: string): Promise<{ ok: boolean; status: number; json: T | null }> {
  const chave = process.env.ASAAS_API_KEY;
  if (!chave) throw new Error("ASAAS_API_KEY não configurada na Vercel.");
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    try {
      const r = await fetch(API + caminho, { headers: { access_token: chave, "User-Agent": "amadeus-admin" }, cache: "no-store" });
      if (r.status === 429) { await espera(2000 * (tentativa + 1)); continue; }
      const json = (await r.json().catch(() => null)) as T | null;
      return { ok: r.ok, status: r.status, json };
    } catch {
      await espera(1500 * (tentativa + 1));
    }
  }
  return { ok: false, status: 0, json: null };
}

async function listar(filtro: string): Promise<Pagamento[]> {
  const todos: Pagamento[] = [];
  for (let offset = 0; offset < 20000; offset += 100) {
    const r = await asaas<{ data: Pagamento[]; hasMore: boolean }>(`/payments?${filtro}&limit=100&offset=${offset}`);
    if (!r.ok || !r.json) throw new Error(`Asaas respondeu ${r.status} ao listar pagamentos.`);
    todos.push(...r.json.data);
    if (!r.json.hasMore) break;
  }
  return todos;
}

/** "Parcela 2 de 5. Livros - Fulano (3º Ano)" → "Livros". */
function categoriaExterna(p: Pagamento): string {
  const d = (p.description ?? "").replace(/^Parcela \d+ de \d+\.\s*/i, "").trim();
  const antes = d.split(" - ")[0]?.trim() ?? "";
  if (!antes) return "Outros";
  if (/^amadeus$/i.test(antes)) return "Eventos (sistema antigo)";
  if (/livro/i.test(antes)) return "Livros";
  if (/material/i.test(antes)) return "Material escolar";
  if (/^outros?$/i.test(antes)) return "Outros";
  return antes.length > 40 ? "Outros" : antes;
}

export interface ResultadoConferencia {
  ok: boolean;
  erro?: string;
  recebimentos?: number;
  pendentesConferidas?: number;
}

export async function conferirComAsaas(): Promise<ResultadoConferencia> {
  const db = createAdminClient();
  try {
    // 1) Tudo que entrou. Na 1ª vez desde o início do ano; depois, os últimos 60 dias.
    const { count } = await db.from("asaas_recebimentos").select("id", { count: "exact", head: true });
    const desde = count ? new Date(Date.now() - 60 * 864e5).toISOString().slice(0, 10) : INICIO;
    const recebidos = [
      ...(await listar(`status=RECEIVED&paymentDate[ge]=${desde}`)),
      // Cartão confirmado ainda sem crédito e recebido em dinheiro são poucos: sem filtro de data.
      ...(await listar("status=CONFIRMED")),
      ...(await listar("status=RECEIVED_IN_CASH")),
    ];
    const { data: insc } = await db.from("inscricoes").select("id");
    const ids = new Set((insc ?? []).map((i) => i.id as string));
    const linhas = recebidos.map((p) => {
      const ref = p.externalReference ?? "";
      const origem = ref.startsWith("avulsa_") ? "avulsa" : ids.has(ref) ? "evento" : "externo";
      return {
        id: p.id,
        valor: p.value,
        valor_liquido: p.netValue ?? null,
        // Entrou na conta só quando RECEIVED; cartão CONFIRMED ainda vai cair (previsto_em).
        recebido_em: p.status === "CONFIRMED" ? null : (p.paymentDate ?? p.clientPaymentDate ?? null)?.slice(0, 10) ?? null,
        previsto_em: p.status === "CONFIRMED" ? (p.estimatedCreditDate ?? p.confirmedDate ?? null)?.slice(0, 10) ?? null : null,
        forma: p.billingType ?? null,
        status: p.status,
        descricao: p.description?.slice(0, 300) ?? null,
        referencia: ref || null,
        origem,
        categoria: origem === "avulsa" ? "Cobrança avulsa" : origem === "evento" ? "Eventos" : categoriaExterna(p),
        parcela: p.installmentNumber ?? null,
        conta: "atual", // a antiga (bloqueada, até 08/09) ficou só no histórico
        atualizado_em: new Date().toISOString(),
      };
    });
    for (let i = 0; i < linhas.length; i += 500) {
      const { error } = await db.from("asaas_recebimentos").upsert(linhas.slice(i, i + 500));
      if (error) throw new Error(error.message);
    }
    // Estornados saem da lista de recebidos.
    const estornados = await listar(`status=REFUNDED&dateCreated[ge]=${INICIO}`).catch(() => [] as Pagamento[]);
    if (estornados.length) await db.from("asaas_recebimentos").delete().in("id", estornados.map((p) => p.id));

    // 2) Cobranças avulsas: quanto já entrou (soma das parcelas) e situação das que não foram pagas.
    let conferidas = 0;
    const { data: cobs } = await db.from("cobrancas_avulsas").select("id, status_pagamento, asaas_payment_id, parcelas, metodo_cobranca").not("asaas_payment_id", "is", null);
    for (const c of cobs ?? []) {
      const { data: parts } = await db.from("asaas_recebimentos").select("valor, status").eq("referencia", `avulsa_${c.id}`);
      const creditadas = (parts ?? []).filter((p) => p.status !== "CONFIRMED");
      const recebido = creditadas.reduce((s, p) => s + Number(p.valor), 0);
      const confirmado = (parts ?? []).reduce((s, p) => s + Number(p.valor), 0);
      const upd: Record<string, unknown> = {
        asaas_recebido: Math.round(recebido * 100) / 100,
        asaas_confirmado: Math.round(confirmado * 100) / 100,
        asaas_parcelas_pagas: creditadas.length,
        asaas_parcelas_total: c.metodo_cobranca === "cartao" && c.parcelas ? c.parcelas : Math.max(1, parts?.length ?? 1),
        asaas_conferido_em: new Date().toISOString(),
      };
      if (c.status_pagamento !== "pago") {
        const r = await asaas<{ status: string; deleted?: boolean }>(`/payments/${c.asaas_payment_id}`);
        upd.asaas_status = r.status === 404 || r.json?.deleted ? "REMOVIDA" : r.json?.status ?? null;
        conferidas++;
        await espera(120);
      } else {
        upd.asaas_status = "RECEIVED";
      }
      await db.from("cobrancas_avulsas").update(upd).eq("id", c.id);
    }

    // 3) Inscrições pendentes: situação no Asaas (a maioria venceu sem pagamento).
    const { data: pend } = await db
      .from("inscricoes")
      .select("id, asaas_payment_id, asaas_status")
      .eq("status_pagamento", "pendente")
      .not("asaas_payment_id", "is", null);
    for (const i of pend ?? []) {
      if (i.asaas_status === "REMOVIDA") continue;
      const r = await asaas<{ status: string; deleted?: boolean }>(`/payments/${i.asaas_payment_id}`);
      const st = r.status === 404 || r.json?.deleted ? "REMOVIDA" : r.json?.status ?? null;
      await db.from("inscricoes").update({ asaas_status: st, asaas_conferido_em: new Date().toISOString() }).eq("id", i.id);
      conferidas++;
      await espera(120);
    }

    await db.from("asaas_conferencias").insert({ recebimentos: linhas.length, pendentes_conferidas: conferidas });
    return { ok: true, recebimentos: linhas.length, pendentesConferidas: conferidas };
  } catch (e) {
    const erro = (e as Error).message.slice(0, 300);
    await db.from("asaas_conferencias").insert({ erro });
    return { ok: false, erro };
  }
}

/** Roda sozinha no máximo 1x a cada 12 horas (chamada ao abrir Cobranças). */
export async function conferirSeAntigo() {
  if (!process.env.ASAAS_API_KEY) return;
  const db = createAdminClient();
  const { data } = await db.from("asaas_conferencias").select("em").order("em", { ascending: false }).limit(1).maybeSingle();
  if (data && Date.now() - Date.parse(data.em as string) < 12 * 3600e3) return;
  // Marca antes para duas abas abertas não rodarem juntas.
  await db.from("asaas_conferencias").insert({ erro: "em andamento" });
  await conferirComAsaas();
}

export async function ultimaConferencia() {
  const db = createAdminClient();
  const { data } = await db.from("asaas_conferencias").select("em, erro, recebimentos").is("erro", null).order("em", { ascending: false }).limit(1).maybeSingle();
  return data as { em: string; erro: string | null; recebimentos: number | null } | null;
}

export const RECEBIDO_STATUS = RECEBIDO;
