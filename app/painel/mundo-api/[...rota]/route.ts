import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import * as M from "@/lib/mundo/servidor";

/**
 * A API da central do Mundo de Arboria (26/10/2026): admin.escolaamadeus.com/mundo-api/<rota> (o proxy leva a /painel/mundo-api,
 * que já exige o login do painel). Aqui a sessão é conferida de novo antes de qualquer coisa.
 */
const json = (obj: unknown, status = 200) => NextResponse.json(obj, { status, headers: { "Cache-Control": "no-store" } });
type Ctx = { params: Promise<{ rota: string[] }> };

async function tratar(req: NextRequest, ctx: Ctx) {
  const supa = await createClient(); const { data } = await supa.auth.getUser();
  if (!data.user) return json({ erro: "Entre no painel." }, 401);
  const r = (await ctx.params).rota.join("/"), b = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  try {
    if (r === "central") return json(await M.central());
    if (r === "mundo") return json(await M.ligarMundo(!!b.ligado));
    if (r === "recado") return json(await M.recado(String(b.texto || "")));
    if (r === "levar") return json(await M.levarTurma(String(b.turmaId), String(b.destino || "arvore")));
    if (r === "encerrar") { await M.encerrarAula(String(b.turmaId)); return json({ ok: true }); }
    if (r === "pedido") return json(await M.responderPedido(String(b.id), !!b.permitir));
    if (r === "apelido") return json(await M.aprovarApelido(String(b.alunoId), !!b.aprovar));
    return json({ erro: "não encontrado" }, 404);
  } catch (e) {
    if (e instanceof M.Erro) return json({ erro: e.message }, e.status);
    console.error("central do mundo", e); return json({ erro: "Erro no servidor do mundo." }, 500);
  }
}
export async function GET(req: NextRequest, ctx: Ctx) { return tratar(req, ctx); }
export async function POST(req: NextRequest, ctx: Ctx) { return tratar(req, ctx); }
