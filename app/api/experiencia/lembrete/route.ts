import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIA_LEMBRETE, enviarLembrete, pausa, pendentesDoLembrete } from "@/lib/experiencia";

/**
 * Lembrete automático da Experiência Amadeus. Chamado pelo cron da Vercel (vercel.json) às 12h e 13h UTC
 * (9h e 10h em Natal). Só age no DIA_LEMBRETE, com o lembrete ligado no admin, e só para quem ainda não
 * recebeu: se a primeira rodada não terminar a tempo, a segunda completa.
 */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Fortaleza" });
  if (hoje !== DIA_LEMBRETE) return NextResponse.json({ ok: true, pulou: `hoje é ${hoje}` });

  const { data: cfg } = await createAdminClient().from("experiencia_config").select("lembrete_automatico").eq("id", 1).single();
  if (!cfg?.lembrete_automatico) return NextResponse.json({ ok: true, pulou: "lembrete desligado no admin" });

  const inicio = Date.now();
  const feitos: { telefone: string; status: string }[] = [];
  for (const [i, c] of (await pendentesDoLembrete()).entries()) {
    if (Date.now() - inicio > 240_000) break; // deixa o resto para a rodada seguinte
    if (i > 0) await pausa();
    const r = await enviarLembrete(c.telefone, c.crianca, "lembrete automático");
    feitos.push({ telefone: r.telefone.slice(-4), status: r.status });
  }
  return NextResponse.json({ ok: true, enviados: feitos });
}
