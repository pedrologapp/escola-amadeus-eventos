"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { EXEMPLO_DESENHO } from "@/lib/painel-ia-exemplo";

/**
 * "Criar desenho com IA" (29/09/2026): a pessoa escreve o que quer do jeito
 * dela ("uma menina lendo embaixo de uma árvore") e aqui o pedido vira o
 * prompt completo, com as regras do estilo dos painéis (traço de giz
 * colorido, preenchimento suave, paleta da escola, composição simples). A IA
 * devolve um SVG, que é limpo antes de ir para a tela.
 */

// Opus desenha bem melhor que o Sonnet neste estilo (testado em 29/09); leva ~40 s por desenho.
const MODELO = "claude-opus-5-5";

const ESTILO = `Você é ilustrador de livros infantis e desenha para os painéis de decoração de uma escola brasileira (Centro Educacional Amadeus).
O estilo é SEMPRE o mesmo: desenho em traço colorido, como giz de cera caprichado de professora — fofo, simples, alegre e bem composto.

Regras obrigatórias:
- Responda SOMENTE com um único elemento <svg>…</svg>, sem texto antes ou depois, sem markdown.
- <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">. Fundo transparente: nada de retângulo de fundo.
- Use só <g>, <path>, <circle>, <ellipse>, <rect>, <line>, <polyline>, <polygon>. Proibido: texto, <image>, <style>, <defs>, gradiente, filtro, máscara, <use>, links.
- Todo contorno com stroke de 5 a 7, stroke-linecap="round" e stroke-linejoin="round".
- Cores de traço (só estas): #083078 (azul-marinho, contornos de pessoas), #1D4FA0 (azul), #E0524C (vermelho), #FFB000 (amarelo), #F28C28 (laranja), #3FA66B (verde), #E86FA6 (rosa), #8A5A2B (marrom), #7B5EA7 (roxo).
- Preenchimentos (só estes, ou fill="none"): #FFE08A, #F9C6DC, #CFE3F7, #CDEBC8, #F7B9B3, #FBD0A6, #DCCEF0, #FFF6DD, #FFFFFF; pele: #F3D7B5, #D9A77A, #8D5A3B (varie os tons de pele entre as pessoas).
- Pessoas: cabeça redonda, olhos de pontinho, sorriso simples, corpo com formas simples de roupa (sem detalhes realistas). Crianças com proporção de criança.
- Composição: de 3 a 7 elementos principais, centralizada, ocupando uns 85% do quadro, sem nada cortado nas bordas. Um chão curto é permitido; faixa de chão de ponta a ponta, não.
- Traço limpo: no máximo uns 70 elementos no total, caminhos curtos e bem desenhados (curvas suaves, nada de rabisco aleatório).

Exemplo do estilo (referência de traço, cores e jeito de desenhar):
${EXEMPLO_DESENHO}`;

const PERMITIDOS = new Set(["svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);
const ATRIBUTOS = new Set([
  "xmlns", "viewbox", "d", "cx", "cy", "r", "rx", "ry", "x", "y", "width", "height", "x1", "y1", "x2", "y2", "points",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "fill-opacity", "stroke-opacity", "opacity", "transform", "fill-rule",
]);

/** Mantém só as tags e atributos de desenho; qualquer outra coisa sai. */
function limparSvg(bruto: string): string | null {
  const ini = bruto.indexOf("<svg"), fim = bruto.lastIndexOf("</svg>");
  if (ini < 0 || fim < 0) return null;
  const svg = bruto.slice(ini, fim + 6);
  let saida = "";
  const tag = /<\s*(\/?)\s*([a-zA-Z]+)([^>]*?)(\/?)\s*>/g;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(svg))) {
    const [, fecha, nome, attrs, autoFecha] = m;
    const n = nome.toLowerCase();
    if (!PERMITIDOS.has(n)) continue;
    if (fecha) {
      saida += `</${n}>`;
      continue;
    }
    const limpos: string[] = [];
    for (const a of attrs.matchAll(/([a-zA-Z:-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const k = a[1].toLowerCase(), v = a[3] ?? a[4] ?? "";
      if (!ATRIBUTOS.has(k) || /url\(|javascript:|expression/i.test(v)) continue;
      limpos.push(`${k === "viewbox" ? "viewBox" : k}="${v.replace(/"/g, "")}"`);
    }
    if (n === "svg") {
      if (!limpos.some((x) => x.startsWith("xmlns="))) limpos.push('xmlns="http://www.w3.org/2000/svg"');
      if (!limpos.some((x) => x.startsWith("viewBox="))) limpos.push('viewBox="0 0 400 400"');
      // tamanho explícito: sem isso o navegador desenha o SVG em 300 × 150
      const semTamanho = limpos.filter((x) => !x.startsWith("width=") && !x.startsWith("height="));
      saida += `<svg ${semTamanho.join(" ")} width="800" height="800">`;
      continue;
    }
    saida += `<${n} ${limpos.join(" ")}${autoFecha ? "/" : ""}>`;
  }
  return /<(path|circle|ellipse|rect|line|polyline|polygon)\b/.test(saida) ? saida : null;
}

export async function desenharComIa(pedido: string): Promise<{ ok: true; svg: string } | { ok: false; erro: string }> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin." };
  const texto = String(pedido ?? "").trim().slice(0, 300);
  if (texto.length < 3) return { ok: false, erro: "Escreva o que você quer no desenho." };
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return { ok: false, erro: "A chave da IA não está configurada no servidor." };
  try {
    const r = await new Anthropic({ apiKey: chave }).messages.create({
      model: MODELO,
      max_tokens: 8000,
      system: ESTILO,
      messages: [{ role: "user", content: `Pedido da escola: "${texto}". Desenhe isso no estilo descrito. Responda só com o <svg>.` }],
    });
    const bruto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const svg = limparSvg(bruto);
    if (!svg) return { ok: false, erro: "A IA não conseguiu desenhar isso agora. Tente descrever de outro jeito." };
    return { ok: true, svg };
  } catch (e) {
    return { ok: false, erro: `Não consegui falar com a IA agora (${(e as Error).message.slice(0, 120)}).` };
  }
}

/* ------------------------------------------------------------------------ */
/* "Sugerir a partir do tema": 3 painéis completos a partir de uma frase.    */
/* ------------------------------------------------------------------------ */

export interface SugestaoPainel {
  nome: string; // "Delicado e floral"
  porque: string; // uma frase explicando a ideia
  fundo: string; // id em FUNDOS
  posicao: "cima" | "meio" | "baixo";
  alinhar: "esq" | "centro";
  texto: { l1: string; dest: string; l3: string };
  icones: string[]; // ids da biblioteca (até 5)
  desenho: string | null; // pedido para um desenho novo feito pela IA (opcional)
}

export async function sugerirPainel(tema: string): Promise<{ ok: true; sugestoes: SugestaoPainel[] } | { ok: false; erro: string }> {
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin." };
  const pedido = String(tema ?? "").trim().slice(0, 300);
  if (pedido.length < 3) return { ok: false, erro: "Escreva o tema do painel." };
  const chave = process.env.ANTHROPIC_API_KEY;
  if (!chave) return { ok: false, erro: "A chave da IA não está configurada no servidor." };

  const { ICONES } = await import("@/lib/painel-icones");
  const { FUNDOS } = await import("@/lib/painel-caderno");
  const idsIcones = new Set(ICONES.map((i) => i.id));
  const idsFundos = new Set(FUNDOS.map((f) => f.id));
  const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "numeric", month: "long", year: "numeric" });

  const sistema = `Você é diretor de arte de uma escola brasileira (Centro Educacional Amadeus, Educação Infantil ao 9º ano) e monta painéis de decoração de eventos no estilo "caderno ilustrado": folha de caderno ou fundo colorido, frase grande com marca-texto, etiqueta amarela e desenhos em traço de giz colados como polaroid.
Hoje é ${hoje}.

A partir do tema, proponha 3 painéis BEM DIFERENTES entre si (clima, fundo e posição da frase diferentes), todos adequados para escola e famílias.

Responda SOMENTE com JSON válido, sem markdown, neste formato:
{"sugestoes":[{"nome":"2 a 4 palavras","porque":"uma frase curta sobre a ideia","fundo":"id","posicao":"cima|meio|baixo","alinhar":"esq|centro","texto":{"l1":"linha de cima curta (ou vazia)","dest":"frase principal, curta (até ~5 palavras)","l3":"etiqueta curta (data, público ou chamada)"},"icones":["id","id"],"desenho":"pedido de um desenho novo em até 12 palavras, ou null"}]}

Regras:
- "fundo" só destes ids: ${FUNDOS.map((f) => `${f.id} (${f.nome})`).join(", ")}.
- "icones": de 3 a 5 ids, só destes: ${ICONES.map((i) => `${i.id} (${i.nome})`).join(", ")}. O primeiro vai em destaque numa polaroid.
- "desenho": use quando nenhum ícone da lista representa bem o tema (ex.: "professora lendo para crianças sentadas no chão"). Descreva uma cena simples e alegre, com crianças quando fizer sentido. Pelo menos 1 das 3 sugestões deve ter desenho.
- Não invente data, horário ou local: só coloque se estiverem no tema. Sem data, use em "l3" algo como o público ("para toda a família") ou uma chamada curta.
- Português do Brasil, tom caloroso de escola, sem emojis. "l1" em minúsculas soa bem ("vem aí o", "festa do").`;

  try {
    const r = await new Anthropic({ apiKey: chave }).messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2500,
      system: sistema,
      messages: [{ role: "user", content: `Tema do painel: "${pedido}"` }],
    });
    const bruto = r.content.map((c) => (c.type === "text" ? c.text : "")).join("");
    const json = JSON.parse(bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)) as { sugestoes?: Partial<SugestaoPainel>[] };
    const limpa = (s: unknown, max: number) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
    const sugestoes: SugestaoPainel[] = (json.sugestoes ?? []).slice(0, 3).map((s) => ({
      nome: limpa(s.nome, 40) || "Sugestão",
      porque: limpa(s.porque, 160),
      fundo: idsFundos.has(String(s.fundo)) ? String(s.fundo) : "papel",
      posicao: s.posicao === "cima" || s.posicao === "baixo" ? s.posicao : "meio",
      alinhar: s.alinhar === "centro" ? "centro" : "esq",
      texto: { l1: limpa(s.texto?.l1, 40), dest: limpa(s.texto?.dest, 60) || pedido.slice(0, 40), l3: limpa(s.texto?.l3, 50) },
      icones: [...new Set((s.icones ?? []).map(String).filter((i) => idsIcones.has(i)))].slice(0, 5),
      desenho: s.desenho ? limpa(s.desenho, 120) || null : null,
    }));
    if (!sugestoes.length) return { ok: false, erro: "A IA não conseguiu sugerir agora. Tente de novo." };
    return { ok: true, sugestoes };
  } catch (e) {
    return { ok: false, erro: `Não consegui falar com a IA agora (${(e as Error).message.slice(0, 120)}).` };
  }
}
