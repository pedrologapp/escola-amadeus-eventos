import { NextRequest, NextResponse } from "next/server";
import * as M from "@/lib/mundo/servidor";
import * as C from "@/lib/mundo/corte";

/**
 * A API do Mundo de Arboria para o jogo (26/10/2026): /api/mundo/<rota>. As mesmas rotas e respostas do servidor da prévia
 * (Arboria/Mundo/jogo/servidor/previa.mjs), para o jogo não mudar. O aluno se identifica com o token da sessão (Authorization: Bearer).
 * CORS aberto só para os endereços do jogo (o jogo também abre por arboria.escolaamadeus.com/mundo).
 */
const ORIGENS = ["https://arboria.escolaamadeus.com", "https://eventos.escolaamadeus.com", "https://www.escolaamadeus.com", "https://escolaamadeus.com"];
function cors(req: NextRequest): Record<string, string> {
  const o = req.headers.get("origin") || ""; const ok = ORIGENS.includes(o) || /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$/.test(o);
  return ok ? { "Access-Control-Allow-Origin": o, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS", Vary: "Origin" } : {};
}
const json = (req: NextRequest, obj: unknown, status = 200) => NextResponse.json(obj, { status, headers: { ...cors(req), "Cache-Control": "no-store" } });
const corpo = async (req: NextRequest) => { try { return await req.json(); } catch { return {}; } };
const token = (req: NextRequest) => (req.headers.get("authorization") || "").replace(/^Bearer /, "") || null;

export async function OPTIONS(req: NextRequest) { return new NextResponse(null, { status: 204, headers: cors(req) }); }

async function tratar(req: NextRequest, rota: string[]) {
  const r = rota.join("/"), metodo = req.method;
  try {
    if (r === "mundo" && metodo === "GET") return json(req, { ligado: (await M.estadoMundo()).ligado });
    if (r === "alunos" && metodo === "GET") return json(req, await M.procurarAlunos(req.nextUrl.searchParams.get("busca") || ""));
    if (r === "entrar" && metodo === "POST") { const b = await corpo(req); return json(req, await M.entrar(String(b.alunoId || ""), String(b.nascimento || ""))); }
    if (r === "entrar-qr" && metodo === "POST") { const b = await corpo(req); return json(req, await M.entrarQr(String(b.qr || ""))); }
    // com sessão
    const t = token(req), aluno = await M.sessao(t);
    if (r === "eu") return json(req, await M.dadosDoAluno(aluno));
    // o endereço e a chave pública do tempo real (a mesma chave que já vai no site da escola), só para quem entrou
    if (r === "rt") return json(req, { url: process.env.NEXT_PUBLIC_SUPABASE_URL, chave: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY });
    if (r === "sair" && metodo === "POST") { await M.sair(t!); return json(req, { ok: true }); }
    const b = metodo === "GET" ? {} : await corpo(req);
    if (r === "perfil" && metodo === "PUT") return json(req, await M.salvarPerfil(aluno, b));
    if (r === "progresso" && metodo === "PUT") { await M.salvarProgresso(aluno, b.chaves || {}); return json(req, { ok: true }); }
    if (r === "ping" && metodo === "POST") { await M.presenca(aluno, String(b.sala || "mundo")); return json(req, { ok: true }); }
    if (r === "chat" && metodo === "POST") return json(req, await M.chat(aluno, String(b.sala || "mundo"), String(b.txt || ""), b.barrada ? String(b.motivo || "barrada no tablet") : undefined));
    if (r === "aulas" && metodo === "GET") return json(req, await M.aulasAbertas(aluno));
    if (r === "aula" && metodo === "POST") return json(req, await M.aulaValida(String(b.codigo || ""), aluno));
    // a Corte: o estado da turma (postos, função aberta, temas) e os toques do aluno (Quero ser, voto, mão)
    if (r === "corte" && metodo === "GET") return json(req, await C.corteDoAluno(aluno));
    if (r === "corte/acao" && metodo === "POST") return json(req, await C.acaoDoAluno(aluno, String(b.tipo || ""), String(b.valor ?? "")));
    if (r === "aula/pedir" && metodo === "POST") return json(req, await M.pedirAula(aluno, String(b.codigo || "")));
    return json(req, { erro: "não encontrado" }, 404);
  } catch (e) {
    if (e instanceof M.Erro) return json(req, { erro: e.message, ...e.extra }, e.status);
    console.error("mundo", e); return json(req, { erro: "Erro no servidor do mundo." }, 500);
  }
}
type Ctx = { params: Promise<{ rota: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) { return tratar(req, (await ctx.params).rota); }
export async function POST(req: NextRequest, ctx: Ctx) { return tratar(req, (await ctx.params).rota); }
export async function PUT(req: NextRequest, ctx: Ctx) { return tratar(req, (await ctx.params).rota); }
