"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TODOS, imagem, quadroSecreto, type Rodada } from "@/lib/arboria-quadro";
import { relatorio, SITUACAO } from "./dados";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";

async function logado() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Faça login de novo.");
}

async function fonte(id: string): Promise<Anthropic.ImageBlockParam["source"]> {
  try {
    const dados = await readFile(path.join(process.cwd(), "public", imagem(id)));
    return { type: "base64", media_type: "image/jpeg", data: dados.toString("base64") };
  } catch {
    return { type: "url", url: SITE + imagem(id) };
  }
}

const CONJUNTO: Record<Rodada, string> = {
  1: "4 quadros bem diferentes entre si",
  2: "8 quadros do mesmo pintor, muito parecidos (tema e jeito de pintar se repetem)",
  3: "8 retratos da mesma moça, com cabelo, roupa, fundo e cores iguais; só a expressão do rosto muda (nesta rodada não vale falar de cor)",
};

/**
 * A análise de por que o aluno não finalizou a rodada: a IA vê o quadro dele, o que o colega escolheu
 * e tudo o que ele escreveu (versões, perguntas do Arboria, conversa) e explica para o professor.
 * Fica guardada (arboria_quadro_analises); "de novo" gera outra.
 */
export async function analisar(codigo: string, aluno: string, rodada: Rodada) {
  await logado();
  const rel = await relatorio(codigo);
  const l = rel?.linhas.find((x) => x.aluno === aluno && x.rodada === rodada);
  if (!l || SITUACAO[l.situacao].finalizou) return { ok: false as const, erro: "Este aluno finalizou a rodada." };
  if (l.situacao === "nao_escreveu") return { ok: true as const, texto: "O aluno não escreveu nada nesta rodada: não há texto para analisar. Vale conversar com ele para entender se travou na tarefa, no tempo ou no tablet." };
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false as const, erro: "Sem a chave da IA no servidor." };

  // o quadro secreto: quando o aluno travou antes de mandar, ainda não há descrição com o quadro; ele vem da regra do sorteio
  const secreto = l.quadro ?? quadroSecreto(aluno, rodada, rel!.sala.turma);
  const escolhidos = [...new Set(l.versoes.map((v) => v.escolha).filter((e): e is string => !!e && e !== secreto))];

  const historia: string[] = [];
  for (const v of l.versoes) {
    historia.push(`VERSÃO ${v.versao} (enviada): "${v.texto}"`);
    historia.push(v.acertou === null ? "→ Nenhum colega respondeu." : v.acertou ? "→ O colega acertou." : `→ O colega escolheu outro quadro (${TODOS[v.escolha ?? ""]?.titulo ?? v.escolha}).`);
    const falas = v.conversa.filter((f) => !f.fora).map((f) => `${f.de === "arboria" ? "Arboria" : "Aluno"}: ${f.texto}`);
    if (falas.length) historia.push(`Conversa com o Arboria depois do erro:\n${falas.join("\n")}`);
  }
  const barradas = l.notas.filter((n) => !n.aprovado && n.observacao);
  if (barradas.length) historia.push(`Tentativas que o Arboria segurou antes do envio:\n${barradas.map((n, i) => `${i + 1}. "${n.texto}"\n   Pergunta do Arboria: ${n.observacao}`).join("\n")}`);

  const content: Anthropic.ContentBlockParam[] = [
    { type: "text", text: `Quadro secreto do aluno: "${TODOS[secreto]?.titulo ?? secreto}".` },
    { type: "image", source: await fonte(secreto) },
  ];
  for (const e of escolhidos) {
    content.push({ type: "text", text: `Quadro que o colega escolheu no lugar: "${TODOS[e]?.titulo ?? e}".` });
    content.push({ type: "image", source: await fonte(e) });
  }
  content.push({ type: "text", text: `Rodada ${rodada}: o colega precisava achar o quadro entre ${CONJUNTO[rodada]}.\nSituação final: ${SITUACAO[l.situacao].rotulo}.\n\n${historia.join("\n\n")}` });

  try {
    const resp = await new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }).messages.create({
      model: "claude-sonnet-5-5", max_tokens: 2000,
      system: [
        "Você ajuda um professor de Linguagem a entender por que um aluno de 11 a 15 anos não conseguiu finalizar uma rodada de uma atividade de descrição de quadros.",
        "Compare o texto do aluno com o quadro dele e, se houver, com o quadro que o colega escolheu: o que no texto servia para os dois? o que faltou para separar? havia algo errado ou inventado?",
        "Considere também as perguntas do Arboria (o guia de IA) e se o aluno respondeu a elas no texto.",
        "Escreva em português do Brasil, direto, sem jargão, em três partes curtas com estes títulos exatos:",
        "O que aconteceu: (1 ou 2 frases, citando palavras do aluno entre aspas)",
        "Por que não funcionou: (1 ou 2 frases, concretas: a palavra genérica, o detalhe que valia para os dois, a ordem, o que não está no quadro)",
        "Para trabalhar com ele: (1 frase com uma ação pedagógica simples para a próxima aula)",
        "No máximo 110 palavras no total. Texto simples, sem markdown (sem asteriscos). Não dê nota, não julgue o aluno, não use emojis.",
      ].join("\n"),
      messages: [{ role: "user", content }],
    });
    const texto = resp.content.map((x) => (x.type === "text" ? x.text : "")).join("").replace(/[*#]+/g, "").trim();
    if (!texto) return { ok: false as const, erro: "A IA não respondeu. Tente de novo." };
    await createAdminClient().from("arboria_quadro_analises").upsert({ aluno, rodada, sala: codigo, texto, criado_em: new Date().toISOString() });
    return { ok: true as const, texto };
  } catch {
    return { ok: false as const, erro: "A IA não respondeu. Tente de novo." };
  }
}
