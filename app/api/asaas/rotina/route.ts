import { NextRequest, NextResponse } from "next/server";
import { conferirComAsaas, limparPendentesAntigas } from "@/lib/asaas-conferencia";

/**
 * Rotina diária do Asaas, chamada por um agendamento no n8n (fluxo separado do
 * de pagamentos). Confere recebimentos, busca alertas de reembolso e limpa
 * cobranças de inscrição não pagas há 3 dias (ou só simula, ver LIMPEZA_ATIVA).
 * Header: X-Webhook-Secret = WEBHOOK_CONFIRM_SECRET.
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const esperado = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!esperado || req.headers.get("x-webhook-secret") !== esperado) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const conferencia = await conferirComAsaas();
  const limpeza = await limparPendentesAntigas().catch((e: Error) => ({ erro: e.message }));
  return NextResponse.json({ conferencia, limpeza });
}
