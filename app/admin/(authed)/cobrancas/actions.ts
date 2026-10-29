"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calcularTotal } from "@/lib/pricing";
import { validarCPF, telefoneValido } from "@/lib/validators";
import { SERIES, type NomeSerie } from "@/lib/rematricula-2027";
import { valoresAVista, type DetalhesAVista } from "@/lib/matricula-avista";
import { linkDoComprovante } from "@/lib/matricula-avista-link";
import { cancelarNoAsaas } from "@/lib/asaas-conferencia";

const cobrancaSchema = z
  .object({
    // Sem aluno cadastrado: aluno_id null + aluno_nome digitado à mão.
    aluno_id: z.string().uuid().nullable(),
    aluno_nome: z.string().trim().optional(),
    descricao: z.string().min(3, "Descreva o que está sendo cobrado."),
    valor: z.number().min(1, "Valor mínimo de R$ 1,00."),
    metodo_cobranca: z.enum(["aberto", "pix", "cartao"]),
    parcelas: z.number().int().min(1).max(12),
    repassar_juros: z.boolean(),
    responsavel_nome: z.string().min(2, "Nome muito curto"),
    cpf: z.string().refine((v) => validarCPF(v), "CPF inválido"),
    telefone: z.string().refine((v) => telefoneValido(v), "Telefone inválido"),
  })
  .refine((d) => d.aluno_id || (d.aluno_nome && d.aluno_nome.length >= 2), {
    message: "Escolha um aluno da lista ou digite o nome dele.",
  });

export type CobrancaAvulsaState =
  | { ok: true; cobrancaId: string; paymentUrl: string }
  | { ok: false; error: string };

export async function criarCobrancaAvulsa(
  data: unknown,
): Promise<CobrancaAvulsaState> {
  const parsed = cobrancaSchema.safeParse(data);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos.",
    };
  }
  const d = parsed.data;

  // Auth — só admin logado cria cobrança
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
  }

  const admin = createAdminClient();

  let aluno: { nome_completo: string; serie: string; turma: string } | null =
    null;
  if (d.aluno_id) {
    const { data } = await admin
      .from("alunos")
      .select("nome_completo, serie, turma")
      .eq("id", d.aluno_id)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: "Aluno não encontrado." };
    }
    aluno = data;
  }
  const alunoNome = aluno?.nome_completo ?? d.aluno_nome?.trim() ?? "";

  // Total calculado NO SERVIDOR (ignora o que o cliente exibiu):
  // cartão com repasse = base + taxas (mesma regra dos eventos);
  // PIX, link aberto ou cartão sem repasse = valor base.
  const parcelas = d.metodo_cobranca === "cartao" ? d.parcelas : 1;
  const valorTotal =
    d.metodo_cobranca === "cartao" && d.repassar_juros
      ? Math.round(calcularTotal(d.valor, "cartao", parcelas).valorTotal * 100) /
        100
      : d.valor;

  // 1. Insere cobrança pendente
  const { data: cobranca, error: insertErr } = await admin
    .from("cobrancas_avulsas")
    .insert({
      aluno_id: d.aluno_id,
      aluno_nome: d.aluno_id ? null : alunoNome,
      descricao: d.descricao.trim(),
      valor: d.valor,
      metodo_cobranca: d.metodo_cobranca,
      parcelas,
      repassar_juros: d.repassar_juros,
      valor_total: valorTotal,
      responsavel_nome: d.responsavel_nome.trim(),
      cpf: d.cpf,
      telefone: d.telefone,
      status_pagamento: "pendente",
      registrado_por: user.email ?? "admin",
    })
    .select("id")
    .single();

  if (insertErr || !cobranca) {
    return {
      ok: false,
      error: `Erro ao registrar cobrança: ${insertErr?.message ?? "desconhecido"}`,
    };
  }

  // 2. Webhook n8n: cria cobrança no Asaas e envia o link no WhatsApp
  const webhookUrl = process.env.N8N_COBRANCA_AVULSA_URL;
  if (!webhookUrl) {
    await admin
      .from("cobrancas_avulsas")
      .update({ status_pagamento: "cancelado" })
      .eq("id", cobranca.id);
    return {
      ok: false,
      error:
        "Webhook de cobrança avulsa não configurado no servidor (N8N_COBRANCA_AVULSA_URL).",
    };
  }

  let webhookData: {
    success?: boolean;
    message?: string;
    paymentUrl?: string;
    asaasPaymentId?: string;
    asaasCustomerId?: string;
  };

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cobrancaId: cobranca.id,
        // Prefixo distingue da inscrição na notificação do Asaas
        externalReference: `avulsa_${cobranca.id}`,
        descricao: d.descricao.trim(),
        amount: d.valor,
        // O que o Asaas deve cobrar de fato (com juros, se repassados)
        valorTotal,
        // 'undefined' = link aberto (responsável escolhe PIX/cartão à vista)
        paymentMethod:
          d.metodo_cobranca === "pix"
            ? "pix"
            : d.metodo_cobranca === "cartao"
              ? "credit"
              : "undefined",
        installments: parcelas,
        // Aluno (sem cadastro: nome digitado à mão, série/turma vazias)
        studentName: alunoNome,
        studentGrade: aluno?.serie ?? "",
        studentClass: aluno?.turma ?? "",
        // Responsável
        parentName: d.responsavel_nome.trim(),
        cpf: d.cpf,
        phone: d.telefone,
        registradoPor: user.email ?? "admin",
        timestamp: new Date().toISOString(),
      }),
    });

    const corpoTexto = await resp.text();

    if (!resp.ok) {
      console.error(
        `[criarCobrancaAvulsa] Webhook n8n retornou ${resp.status}. Corpo: ${corpoTexto.slice(0, 500)}`,
      );
      await admin
        .from("cobrancas_avulsas")
        .update({ status_pagamento: "cancelado" })
        .eq("id", cobranca.id);
      return {
        ok: false,
        error: `Erro ao gerar o link de pagamento (HTTP ${resp.status}). Tente novamente.`,
      };
    }

    try {
      webhookData = JSON.parse(corpoTexto);
    } catch {
      console.error(
        `[criarCobrancaAvulsa] Webhook respondeu 200 mas não é JSON válido. Corpo: ${corpoTexto.slice(0, 500)}`,
      );
      await admin
        .from("cobrancas_avulsas")
        .update({ status_pagamento: "cancelado" })
        .eq("id", cobranca.id);
      return {
        ok: false,
        error:
          "O servidor de pagamento respondeu num formato inesperado. Verifique se o workflow do n8n termina com um node 'Respond to Webhook'.",
      };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(
      `[criarCobrancaAvulsa] Falha de conexão com webhook n8n. Erro: ${msg}`,
    );
    await admin
      .from("cobrancas_avulsas")
      .update({ status_pagamento: "cancelado" })
      .eq("id", cobranca.id);
    return {
      ok: false,
      error: `Não foi possível conectar ao servidor de pagamento (${msg}). Tente novamente.`,
    };
  }

  if (webhookData.success === false) {
    await admin
      .from("cobrancas_avulsas")
      .update({ status_pagamento: "cancelado" })
      .eq("id", cobranca.id);
    return {
      ok: false,
      error: webhookData.message ?? "O servidor recusou a cobrança.",
    };
  }

  const paymentUrl = webhookData.paymentUrl;
  if (!paymentUrl) {
    return {
      ok: false,
      error:
        "Link de pagamento não foi retornado pelo servidor. Verifique o workflow do n8n.",
    };
  }

  // 3. Atualiza cobrança com payment_url + ids do Asaas
  await admin
    .from("cobrancas_avulsas")
    .update({
      payment_url: paymentUrl,
      asaas_payment_id: webhookData.asaasPaymentId ?? null,
      asaas_customer_id: webhookData.asaasCustomerId ?? null,
    })
    .eq("id", cobranca.id);

  revalidatePath("/admin/cobrancas");
  return { ok: true, cobrancaId: cobranca.id, paymentUrl };
}

// =============================================================
// EXCLUSÃO DE COBRANÇA CANCELADA
// =============================================================

export type ExcluirCobrancaState =
  | { ok: true }
  | { ok: false; error: string };

export async function excluirCobrancaCancelada(
  cobrancaId: string,
): Promise<ExcluirCobrancaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
  }

  const { data: cobrancaExistente, error: fetchErr } = await supabase
    .from("cobrancas_avulsas")
    .select("id, status_pagamento")
    .eq("id", cobrancaId)
    .maybeSingle();

  if (fetchErr || !cobrancaExistente) {
    return { ok: false, error: "Cobrança não encontrada." };
  }
  if (cobrancaExistente.status_pagamento !== "cancelado") {
    return { ok: false, error: "Só é possível excluir cobrança cancelada." };
  }

  const { error: delErr } = await supabase
    .from("cobrancas_avulsas")
    .delete()
    .eq("id", cobrancaId);

  if (delErr) {
    return { ok: false, error: `Erro ao excluir: ${delErr.message}` };
  }

  revalidatePath("/admin/cobrancas");
  return { ok: true };
}

export type ExcluirCobrancasEmMassaState =
  | { ok: true; excluidas: number }
  | { ok: false; error: string };

export async function excluirCobrancasCanceladas(
  cobrancaIds: string[],
): Promise<ExcluirCobrancasEmMassaState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
  }
  if (cobrancaIds.length === 0) {
    return { ok: false, error: "Nenhuma cobrança selecionada." };
  }

  // Filtra no servidor: só as que realmente estão canceladas
  const { data: alvos, error: fetchErr } = await supabase
    .from("cobrancas_avulsas")
    .select("id")
    .in("id", cobrancaIds)
    .eq("status_pagamento", "cancelado");

  if (fetchErr) {
    return { ok: false, error: fetchErr.message };
  }
  if (!alvos || alvos.length === 0) {
    return {
      ok: false,
      error: "Nenhuma cobrança cancelada entre as selecionadas.",
    };
  }

  const { error: delErr } = await supabase
    .from("cobrancas_avulsas")
    .delete()
    .in(
      "id",
      alvos.map((a) => a.id),
    );

  if (delErr) {
    return { ok: false, error: `Erro ao excluir: ${delErr.message}` };
  }

  revalidatePath("/admin/cobrancas");
  return { ok: true, excluidas: alvos.length };
}

/** Botão "Conferir com o Asaas agora": só lê o Asaas e atualiza as nossas telas. */
export async function conferirAsaasAgora(): Promise<{ ok: boolean; erro?: string; recebimentos?: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sua sessão expirou. Faça login novamente." };
  const { conferirComAsaas } = await import("@/lib/asaas-conferencia");
  const r = await conferirComAsaas();
  revalidatePath("/admin/cobrancas");
  revalidatePath("/admin/cobrancas/asaas");
  return { ok: r.ok, erro: r.erro, recebimentos: r.recebimentos };
}

/** "Ciente" num alerta de reembolso: só tira o aviso da tela. */
export async function marcarAlertaVisto(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  await createAdminClient().from("asaas_alertas").update({ visto_em: new Date().toISOString(), visto_por: user.email ?? null }).eq("id", id);
  revalidatePath("/admin/cobrancas");
  revalidatePath("/admin/cobrancas/asaas");
  return { ok: true };
}

// =============================================================
// MATRÍCULA À VISTA (29/10/2026): pago direto à escola, sem Asaas
// =============================================================

const avistaSchema = z.object({
  alunoNome: z.string().trim().min(2, "Escolha o aluno ou digite o nome."),
  activesoftId: z.number().int().nullable(),
  novato: z.boolean(),
  serie2027: z.enum(SERIES.map((s) => s.nome) as [NomeSerie, ...NomeSerie[]]),
  base: z.number().positive().nullable(),
  prazo: z.enum(["promo", "depois"]),
  livro: z.boolean(),
  extra: z.number().min(0),
  forma: z.enum(["pix", "cartao", "misto"]),
  parcelas: z.number().int().min(1).max(12),
  valorPix: z.number().min(0),
  dataPagamento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida."),
  responsavel: z.string().trim().min(2, "Nome do responsável muito curto."),
  telefone: z.string().refine((v) => telefoneValido(v), "Telefone inválido"),
  observacao: z.string().trim().max(300).optional(),
});

export async function registrarMatriculaAVista(data: unknown): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const parsed = avistaSchema.safeParse(data);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const d = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Faça login novamente." };

  // Os valores são calculados de novo AQUI (o que a tela mostrou não vale).
  const v = valoresAVista({ serie2027: d.serie2027, base: d.novato ? null : d.base, prazo: d.prazo, livro: d.livro, extra: d.extra });
  if (v.total <= 0) return { ok: false, error: "O total ficou zerado. Confira o desconto." };
  const parcelas = d.forma === "pix" ? 1 : d.parcelas;
  const valorPix = d.forma === "misto" ? Math.min(d.valorPix, v.total) : d.forma === "pix" ? v.total : 0;
  if (d.forma === "misto" && (valorPix <= 0 || valorPix >= v.total)) return { ok: false, error: "No Pix + cartão, o valor no Pix tem que ser menor que o total." };
  const detalhes: DetalhesAVista = {
    ...v, serie2027: d.serie2027, novato: d.novato, activesoftId: d.activesoftId, prazo: d.prazo, forma: d.forma, parcelas, valorPix,
    dataPagamento: d.dataPagamento, ...(d.observacao ? { observacao: d.observacao } : {}),
  };
  const { data: linha, error } = await createAdminClient()
    .from("cobrancas_avulsas")
    .insert({
      tipo: "matricula_avista",
      aluno_id: null,
      aluno_nome: d.alunoNome,
      descricao: `Matrícula 2027 à vista · ${d.serie2027}${d.livro ? " · com livros" : ""}`,
      valor: v.total,
      valor_total: v.total,
      metodo_cobranca: d.forma === "pix" ? "pix" : "cartao",
      parcelas,
      repassar_juros: false,
      responsavel_nome: d.responsavel,
      cpf: "",
      telefone: d.telefone.replace(/\D/g, ""),
      status_pagamento: "pago",
      registrado_por: user.email ?? "admin",
      detalhes,
    })
    .select("id")
    .single();
  if (error || !linha) return { ok: false, error: `Erro ao registrar: ${error?.message ?? "desconhecido"}` };
  revalidatePath("/admin/cobrancas");
  return { ok: true, id: linha.id };
}

const origemDoSite = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";

/** Link da imagem do comprovante (prévia e "baixar"). */
export async function linkComprovante(id: string): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sua sessão expirou." };
  return { ok: true, url: linkDoComprovante(origemDoSite(), id) };
}

/**
 * Envia o comprovante pelo WhatsApp da escola (WAHA) — SÓ quando alguém da equipe clica em enviar. Usa o mesmo caminho do n8n que a tela
 * de WhatsApp já usa para mandar imagem (webhook whatsapp-responder); não precisa de fluxo novo.
 */
export async function enviarComprovante(id: string, telefone: string): Promise<{ ok: boolean; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sua sessão expirou." };
  const tel = telefone.replace(/\D/g, "");
  const numero = tel.length === 10 || tel.length === 11 ? `55${tel}` : tel;
  if (numero.length < 12) return { ok: false, erro: "Número inválido." };
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { ok: false, erro: "WEBHOOK_CONFIRM_SECRET não configurada no servidor." };
  const db = createAdminClient();
  const { data: c } = await db.from("cobrancas_avulsas").select("aluno_nome, tipo").eq("id", id).maybeSingle();
  if (!c || c.tipo !== "matricula_avista") return { ok: false, erro: "Comprovante não encontrado." };
  const primeiro = String(c.aluno_nome ?? "").trim().split(/\s+/)[0] ?? "";
  // (Pedro: "dá um espaço para baixo no 'segue o comprovante'")
  const texto = `Olá! Aqui é o Centro Educacional Amadeus.\n\nSegue o comprovante do pagamento à vista do ano de 2027${primeiro ? ` de *${primeiro}*` : ""}. Obrigado pela confiança!`;
  let ok = false;
  let detalhe = "";
  try {
    const r = await fetch("https://n8n.escolaamadeus.com/webhook/whatsapp-responder", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
      body: JSON.stringify({
        chatId: "", telefone: numero, texto, tipo: "imagem",
        arquivo: { url: linkDoComprovante(origemDoSite(), id), nome: `comprovante-${primeiro || "matricula"}.png`, tipo: "image/png" },
      }),
      signal: AbortSignal.timeout(60_000),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; detalhe?: string; status?: string };
    ok = r.ok && !!j.ok;
    detalhe = j.status === "sem_whatsapp" ? "esse número não tem WhatsApp" : j.detalhe || (r.ok ? "" : `HTTP ${r.status}`);
  } catch (e) {
    detalhe = (e as Error).message;
  }
  await db.from("whatsapp_respostas").insert({
    chat_id: `${numero}@c.us`, texto, arquivo_nome: "comprovante.png", status: ok ? "enviado" : "erro", detalhe: detalhe || null, enviado_por: user.email ?? null,
  });
  if (!ok) return { ok: false, erro: `Não foi enviado${detalhe ? ` (${detalhe.slice(0, 120)})` : ""}.` };
  await db.from("cobrancas_avulsas").update({ comprovante_enviado_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/cobrancas");
  return { ok: true };
}

/**
 * Excluir cobrança (29/10/2026, Pedro): só as pendentes, em aberto ou canceladas — paga NÃO. A pendente com link do Asaas é cancelada no
 * Asaas antes (o link para de aceitar pagamento). Senha conferida aqui no servidor.
 */
export async function excluirCobranca(cobrancaId: string, senha: string): Promise<ExcluirCobrancaState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Faça login novamente." };
  if (senha !== (process.env.ADMIN_ACTION_PASSWORD || "Admim123")) return { ok: false, error: "Senha incorreta." };
  const db = createAdminClient();
  const { data: c } = await db.from("cobrancas_avulsas").select("id, status_pagamento, asaas_payment_id, asaas_status, tipo").eq("id", cobrancaId).maybeSingle();
  if (!c) return { ok: false, error: "Cobrança não encontrada." };
  if (c.status_pagamento === "pago" || c.status_pagamento === "estornado" || c.tipo === "matricula_avista")
    return { ok: false, error: "Cobrança paga não pode ser excluída." };
  if (c.status_pagamento === "pendente" && ["RECEIVED", "CONFIRMED"].includes(c.asaas_status ?? ""))
    return { ok: false, error: "O Asaas diz que essa já foi paga: não dá para excluir." };
  if (c.asaas_payment_id && c.status_pagamento === "pendente") {
    const r = await cancelarNoAsaas(c.asaas_payment_id);
    if (!r.ok) return { ok: false, error: r.erro ?? "Não consegui cancelar no Asaas." };
  }
  const { error } = await db.from("cobrancas_avulsas").delete().eq("id", cobrancaId);
  if (error) return { ok: false, error: `Erro ao excluir: ${error.message}` };
  revalidatePath("/admin/cobrancas");
  return { ok: true };
}
