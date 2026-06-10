"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validarCPF, telefoneValido } from "@/lib/validators";

const cobrancaSchema = z.object({
  aluno_id: z.string().uuid(),
  descricao: z.string().min(3, "Descreva o que está sendo cobrado."),
  valor: z.number().min(1, "Valor mínimo de R$ 1,00."),
  responsavel_nome: z.string().min(2, "Nome muito curto"),
  cpf: z.string().refine((v) => validarCPF(v), "CPF inválido"),
  telefone: z.string().refine((v) => telefoneValido(v), "Telefone inválido"),
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

  const { data: aluno } = await admin
    .from("alunos")
    .select("nome_completo, serie, turma")
    .eq("id", d.aluno_id)
    .maybeSingle();

  if (!aluno) {
    return { ok: false, error: "Aluno não encontrado." };
  }

  // 1. Insere cobrança pendente
  const { data: cobranca, error: insertErr } = await admin
    .from("cobrancas_avulsas")
    .insert({
      aluno_id: d.aluno_id,
      descricao: d.descricao.trim(),
      valor: d.valor,
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
        // Aluno
        studentName: aluno.nome_completo,
        studentGrade: aluno.serie,
        studentClass: aluno.turma,
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
