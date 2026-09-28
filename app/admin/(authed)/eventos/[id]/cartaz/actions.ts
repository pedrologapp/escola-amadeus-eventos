"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ESTILOS, LAYOUTS, type Detalhe, type Formato, type Proposta } from "@/lib/cartaz";

/**
 * Cartaz do evento: a IA lê a foto e os dados do evento e propõe 3 cartazes
 * (texto e composição). Datas, local e valores vêm do cadastro — a IA não
 * inventa esses fatos.
 */

const MODELO = "claude-sonnet-4-6";

async function logado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return !!user;
}

async function fotoParaIa(url: string): Promise<{ media_type: "image/jpeg"; data: string } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const sharp = (await import("sharp")).default;
    const jpg = await sharp(Buffer.from(await r.arrayBuffer())).rotate().resize({ width: 1024, withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
    return { media_type: "image/jpeg", data: jpg.toString("base64") };
  } catch {
    return null;
  }
}

export async function gerarPropostas(entrada: {
  fatos: string; // resumo do evento montado pela página (nome, data, local, valor, público...)
  formato: Formato;
  detalhe: Detalhe;
  frase: string;
  foto: string | null;
}): Promise<{ ok: boolean; erro?: string; propostas?: Proposta[] }> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada." };
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return { ok: false, erro: "ANTHROPIC_API_KEY não configurada." };

  const imagem = entrada.foto ? await fotoParaIa(entrada.foto) : null;
  const pedido = [
    `Evento:\n${entrada.fatos}`,
    `Formato: ${entrada.formato}. Nível: ${entrada.detalhe === "detalhado" ? "detalhado (até 4 destaques curtos)" : "conciso (sem destaques)"}.`,
    entrada.frase.trim() ? `A escola quer usar esta frase (pode ajustar de leve): "${entrada.frase.trim()}"` : "Sem frase definida: proponha uma chamada curta.",
    imagem ? "A foto do cartaz vai anexada: descreva-a para você mesmo e use o que ela transmite." : "Sem foto: use o layout 'sem-foto'.",
  ].join("\n\n");

  try {
    const cliente = new Anthropic({ apiKey: chave });
    const r = await cliente.messages.create({
      model: MODELO,
      max_tokens: 1500,
      system:
        "Você é designer da escola Centro Educacional Amadeus e propõe cartazes para eventos. A identidade é fixa: azul #083078, dourado #FFB000, creme #FAF7F0, títulos em serifa elegante. " +
        "Proponha 3 cartazes DIFERENTES entre si (estilo e/ou layout e/ou tom da chamada). Português do Brasil, sem emojis, sem exclamações em excesso. " +
        "Título: até 38 caracteres, pode encurtar o nome do evento sem mudar o sentido. Chamada: até 90 caracteres, calorosa e clara. " +
        "Destaques: fatos que ESTÃO no cadastro (o que inclui, público, horário de saída etc.), nunca invente data, preço, local ou brinde. " +
        `Estilos: ${Object.keys(ESTILOS).join(", ")}. Layouts: ${Object.keys(LAYOUTS).join(", ")} ('foto-lado' não serve para story). ` +
        "foco = parte da foto que deve aparecer quando cortada: center, top ou bottom (olhe onde estão as pessoas). " +
        "Combine a paleta com as cores da foto (foto escura ou colorida pede 'noite' com foto de fundo; foto clara pede 'creme'). " +
        'Responda SÓ JSON: {"propostas":[{"nome":"nome curto da proposta","porque":"1 frase de por que funciona","estilo":"...","layout":"...","foco":"...","titulo":"...","chamada":"...","destaques":["..."]}]}',
      messages: [
        {
          role: "user",
          content: [
            ...(imagem ? [{ type: "image" as const, source: { type: "base64" as const, ...imagem } }] : []),
            { type: "text" as const, text: pedido },
          ],
        },
      ],
    });
    const bruto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const json = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as { propostas?: Partial<Proposta>[] };
    const propostas: Proposta[] = (json.propostas ?? []).slice(0, 3).map((p) => ({
      nome: String(p.nome ?? "Proposta").slice(0, 40),
      porque: String(p.porque ?? "").slice(0, 160),
      estilo: p.estilo && p.estilo in ESTILOS ? p.estilo : "noite",
      layout: !imagem ? "sem-foto" : p.layout && p.layout in LAYOUTS ? p.layout : "foto-fundo",
      foco: p.foco === "top" || p.foco === "bottom" ? p.foco : "center",
      titulo: String(p.titulo ?? "").slice(0, 60),
      chamada: String(p.chamada ?? "").slice(0, 140),
      destaques: entrada.detalhe === "detalhado" ? (p.destaques ?? []).map(String).slice(0, 4) : [],
    }));
    if (!propostas.length) return { ok: false, erro: "A IA não devolveu propostas. Tente de novo." };
    return { ok: true, propostas };
  } catch (e) {
    return { ok: false, erro: `Não consegui gerar as propostas (${(e as Error).message.slice(0, 120)}).` };
  }
}

/** Para enviar outra foto só para o cartaz (vai para o bucket público de eventos). */
export async function prepararFotoCartaz(nome: string) {
  if (!(await logado())) return { ok: false as const, erro: "Sessão expirada." };
  const ext = (nome.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  const path = `cartaz/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const db = createAdminClient();
  const { data, error } = await db.storage.from("eventos").createSignedUploadUrl(path);
  if (error || !data) return { ok: false as const, erro: "Não consegui preparar o envio da foto." };
  const url = db.storage.from("eventos").getPublicUrl(path).data.publicUrl;
  return { ok: true as const, path, token: data.token, url };
}
