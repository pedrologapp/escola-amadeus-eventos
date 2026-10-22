import { NextRequest, NextResponse } from "next/server";
import { conferirPagamentosEventos } from "@/lib/asaas-conferencia";

// A conferência consulta o Asaas uma cobrança por vez: pode passar dos 10 s padrão.
export const maxDuration = 60;

/**
 * Conferência automática dos pagamentos dos eventos (22/10/2026). Chamada a cada
 * 30 minutos pelo pg_cron do Supabase (job "conferir-pagamentos"): as inscrições
 * pendentes que o Asaas diz recebidas viram "pago". Não manda mensagem a ninguém.
 *
 * Header: X-Webhook-Secret = WEBHOOK_CONFIRM_SECRET (o mesmo do n8n).
 */
export async function POST(req: NextRequest) {
  const esperado = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!esperado) return NextResponse.json({ error: "WEBHOOK_CONFIRM_SECRET não configurado no servidor" }, { status: 500 });
  if (req.headers.get("x-webhook-secret") !== esperado) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const r = await conferirPagamentosEventos({ origem: "automatica" });
  return NextResponse.json(r, { status: r.ok ? 200 : 500 });
}
