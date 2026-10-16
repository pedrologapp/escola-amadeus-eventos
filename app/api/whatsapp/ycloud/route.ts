import { NextResponse, after, type NextRequest } from "next/server";
import { assinaturaValida, lerEvento } from "@/lib/ycloud";
import { processarMensagem } from "@/lib/whatsapp-auto";

/**
 * Webhook da YCloud (WhatsApp oficial): evento whatsapp.inbound_message.received.
 * Confere a assinatura, responde 200 na hora e processa depois (ler o
 * Activesoft e mandar a carta leva alguns segundos).
 */
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const segredo = process.env.YCLOUD_WEBHOOK_SECRET;
  const corpo = await req.text();
  if (!segredo || !assinaturaValida(corpo, req.headers.get("ycloud-signature"), segredo)) {
    return NextResponse.json({ ok: false, erro: "assinatura inválida" }, { status: 401 });
  }
  let evento: unknown = null;
  try {
    evento = JSON.parse(corpo);
  } catch {
    return NextResponse.json({ ok: false, erro: "json inválido" }, { status: 400 });
  }
  const msg = lerEvento(evento);
  if (msg?.texto) {
    after(async () => {
      try {
        const r = await processarMensagem(msg);
        console.log("[whatsapp-auto]", r);
      } catch (e) {
        console.error("[whatsapp-auto] erro", (e as Error).message);
      }
    });
  }
  return NextResponse.json({ ok: true });
}
