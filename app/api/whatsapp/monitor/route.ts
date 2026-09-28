import { NextResponse, type NextRequest } from "next/server";
import { processarLote, type MensagemVista } from "@/lib/whatsapp-monitor";

/**
 * Recebe do n8n a última mensagem de cada conversa do WhatsApp da escola
 * (só leitura) e classifica. Protegido pela mesma chave dos outros
 * webhooks (x-amadeus-chave = WEBHOOK_CONFIRM_SECRET).
 */
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave || req.headers.get("x-amadeus-chave") !== chave) {
    return NextResponse.json({ ok: false, erro: "chave inválida" }, { status: 401 });
  }
  const corpo = (await req.json().catch(() => null)) as { mensagens?: MensagemVista[] } | null;
  const msgs = (corpo?.mensagens ?? []).slice(0, 200);
  const r = await processarLote(msgs);
  return NextResponse.json({ ok: true, ...r });
}
