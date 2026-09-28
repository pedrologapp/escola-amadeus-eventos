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

export interface LeituraCaderno {
  tipoFoto: "flyer" | "foto" | "nenhuma";
  etiqueta: string;
  titulo: string;
  tituloMarca: string;
  chamada: string;
  chamadaForte: string;
  notas: { v: string; r: string }[];
  publicoTitulo: string;
  publico: string[];
  itensTitulo: string;
  itens: string[];
  observacoes: string[];
  valores: { rotulo: string; valor: string }[];
  ondeTitulo: string;
  ondeLinhas: string[];
  legendaFoto: string;
}

/**
 * Lê a foto (muitas vezes já é um material com as informações do evento) e
 * o cadastro, e preenche o cartaz no estilo "Caderno" dos encartes da
 * Experiência Amadeus. O cadastro manda quando tiver o dado; o resto sai da
 * imagem. Nada é inventado.
 */
export async function lerFotoParaCartaz(entrada: {
  fatos: string;
  foto: string | null;
  detalhe: Detalhe;
  frase: string;
  /** Encarte a partir de texto (sem evento): o texto é a fonte principal. */
  texto?: string;
}): Promise<{ ok: boolean; erro?: string; leitura?: LeituraCaderno }> {
  if (!(await logado())) return { ok: false, erro: "Sessão expirada." };
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return { ok: false, erro: "ANTHROPIC_API_KEY não configurada." };
  const imagem = entrada.foto ? await fotoParaIa(entrada.foto) : null;

  try {
    const cliente = new Anthropic({ apiKey: chave });
    const r = await cliente.messages.create({
      model: MODELO,
      max_tokens: 1500,
      system:
        "Você monta cartazes de eventos do Centro Educacional Amadeus no estilo 'Caderno' (folha pautada, post-its, cartões com legenda). " +
        "Primeiro olhe a imagem: se ela for um material/flyer com textos e informações do evento, LEIA tudo o que está escrito (datas, horários, local, atividades, valores, público, observações) — tipoFoto='flyer'. " +
        "Se for uma foto de verdade (pessoas, lugar), tipoFoto='foto' e sugira uma legenda curta. Sem imagem, tipoFoto='nenhuma'. " +
        "Se vier um TEXTO escrito pela escola, ele é a fonte principal: organize as informações dele nos campos (não copie parágrafos inteiros; resuma em frases curtas de cartaz) e use a imagem só como foto ou complemento. Se o assunto não for um evento (aviso, comunicado, campanha), adapte: post-its com prazos/datas importantes, itens com os pontos principais; campos sem informação ficam vazios. " +
        "Junte com os dados do cadastro: quando o cadastro tiver data, horário, local ou valor, use o do cadastro. Nunca invente o que não está na imagem nem no cadastro. " +
        "Escreva em português do Brasil, sem emojis, frases curtas. " +
        "Campos: etiqueta (1 palavra em maiúsculas: CONVITE, PASSEIO, EVENTO, FESTA, AVISO...); titulo + tituloMarca (o título dividido em duas partes; a segunda é grifada de amarelo, ex.: 'Dia das Crianças' + 'no Viva Park'); " +
        "chamada (até 70 caracteres) + chamadaForte (continuação em negrito, até 50); notas: até 2 post-its {v: valor grande curto, r: rótulo pequeno} — o 1º é a data (v '15/10/2026', r o dia da semana), o 2º o horário (v '7h30', r 'SAÍDA DA ESCOLA' ou 'NA ESCOLA'); " +
        "publicoTitulo ('Para as famílias de', 'Para os alunos do') + publico (séries/segmentos, até 4, com os nomes EXATAMENTE como vieram; nunca expanda nem troque faixas: 'Maternal II ao 3º ano' fica uma pílula só assim; a escola usa Grupo IV e Grupo V, não Jardim); itensTitulo (rótulo dos cartões: 'O que está incluso' quando forem coisas incluídas no valor; 'Programação', 'Atividades' ou 'Pauta' conforme o caso) + itens: até 6, cada um com até 26 caracteres; observacoes: o que a família PRECISA saber ou levar (ex.: 'Levar garrafinha com água', 'Levar o lanche', 'Ir de farda', 'Protetor solar', prazos de inscrição, autorização assinada), até 8, cada uma com até 34 caracteres, só se estiver no texto/imagem/cadastro; " +
        "valores: [{rotulo, valor}] até 4 (ex.: {'Aluno','R$ 80,00'}); ondeTitulo (nome do lugar) + ondeLinhas (até 2 linhas: cidade, observação de saída/retorno). " +
        (entrada.detalhe === "conciso" ? "Nível CONCISO: itens no máximo 3 e valores vazio. " : "") +
        'Responda SÓ JSON: {"tipoFoto":"...","etiqueta":"...","titulo":"...","tituloMarca":"...","chamada":"...","chamadaForte":"...","notas":[{"v":"...","r":"..."}],"publicoTitulo":"...","publico":["..."],"itensTitulo":"...","itens":["..."],"observacoes":["..."],"valores":[{"rotulo":"...","valor":"..."}],"ondeTitulo":"...","ondeLinhas":["..."],"legendaFoto":"..."}',
      messages: [
        {
          role: "user",
          content: [
            ...(imagem ? [{ type: "image" as const, source: { type: "base64" as const, ...imagem } }] : []),
            {
              type: "text" as const,
              text: `${entrada.texto?.trim() ? `TEXTO da escola:\n${entrada.texto.trim().slice(0, 6000)}\n\n` : ""}Dados do cadastro:\n${entrada.fatos || "(sem cadastro: encarte avulso)"}\n\n${entrada.frase.trim() ? `A escola quer usar esta frase na chamada: "${entrada.frase.trim()}"` : "Sem frase definida."}`,
            },
          ],
        },
      ],
    });
    const bruto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const j = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as Partial<LeituraCaderno>;
    const lista = (x: unknown, n: number) => (Array.isArray(x) ? x.map(String).filter(Boolean).slice(0, n) : []);
    return {
      ok: true,
      leitura: {
        tipoFoto: j.tipoFoto === "foto" || j.tipoFoto === "flyer" ? j.tipoFoto : imagem ? "foto" : "nenhuma",
        etiqueta: String(j.etiqueta ?? "EVENTO").slice(0, 14).toUpperCase(),
        titulo: String(j.titulo ?? "").slice(0, 40),
        tituloMarca: String(j.tituloMarca ?? "").slice(0, 30),
        chamada: String(j.chamada ?? "").slice(0, 90),
        chamadaForte: String(j.chamadaForte ?? "").slice(0, 70),
        notas: (Array.isArray(j.notas) ? j.notas : []).slice(0, 2).map((n) => ({ v: String(n?.v ?? "").slice(0, 16), r: String(n?.r ?? "").slice(0, 22) })),
        publicoTitulo: String(j.publicoTitulo ?? "").slice(0, 30),
        publico: lista(j.publico, 4),
        itensTitulo: String(j.itensTitulo ?? "O que está incluso").slice(0, 26),
        itens: lista(j.itens, 6),
        observacoes: lista(j.observacoes, 8).map((o) => o.slice(0, 44)),
        valores: (Array.isArray(j.valores) ? j.valores : []).slice(0, 4).map((v) => ({ rotulo: String(v?.rotulo ?? "").slice(0, 20), valor: String(v?.valor ?? "").slice(0, 16) })),
        ondeTitulo: String(j.ondeTitulo ?? "").slice(0, 40),
        ondeLinhas: lista(j.ondeLinhas, 2),
        legendaFoto: String(j.legendaFoto ?? "").slice(0, 40),
      },
    };
  } catch (e) {
    return { ok: false, erro: `Não consegui ler a foto (${(e as Error).message.slice(0, 120)}).` };
  }
}
