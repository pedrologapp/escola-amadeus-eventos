import { NextResponse, type NextRequest } from "next/server";
import { rodarAvisos } from "@/lib/aniversario-avisos";

/**
 * Avisos internos de aniversário (professora do aluno do Infantil/F1 e coordenações para colaborador).
 * Chamado pelo cron da Vercel (vercel.json) às 10h20 UTC (7h20 no horário de Brasília), depois dos cartões do n8n.
 */
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo || request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = process.env.ACTIVESOFT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, erro: "ACTIVESOFT_TOKEN não configurada" }, { status: 500 });
  return NextResponse.json({ ok: true, ...(await rodarAvisos(token)) });
}
