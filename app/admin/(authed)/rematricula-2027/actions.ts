"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { linkDaCarta } from "@/lib/rematricula-2027-link";
import {
  SERIES,
  WEBHOOK_ENVIO,
  legendaAVista,
  legendaCarta,
  modoLivroValido,
  primeiroNome,
  textoApresentacao,
  tipoCartaValido,
  type NomeSerie,
} from "@/lib/rematricula-2027";

export interface Destino {
  nome: string | null;
  telefone: string;
}

export interface ResultadoEnvio {
  telefone: string;
  status: "enviado" | "sem_whatsapp" | "erro";
  detalhe?: string;
}

/** Dados da carta a partir do que veio da tela (novato não leva desconto nem base). */
function dadosDaCarta(entrada: { alunoId: number | null; nome: string; serie: NomeSerie; desconto: number; irmao: boolean; serieAtual?: string | null; base?: number | null; modo: string; tipo?: string }) {
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "long", year: "numeric" });
  const veterano = entrada.alunoId !== null;
  return {
    nome: entrada.nome, serie: entrada.serie, veterano, desconto: veterano ? entrada.desconto : 0,
    irmao: !!entrada.irmao, serieAtual: entrada.serieAtual ?? null, base: veterano ? entrada.base ?? null : null,
    modo: modoLivroValido(entrada.modo), tipo: tipoCartaValido(entrada.tipo), data,
  };
}

const origemDoSite = () => process.env.NEXT_PUBLIC_SITE_URL ?? "https://eventos.escolaamadeus.com";

/** Link assinado da imagem da carta, para a equipe ver antes de enviar. */
export async function previaCarta(entrada: {
  alunoId: number | null; nome: string; serie: string; desconto: number; irmao: boolean;
  serieAtual?: string | null; base?: number | null; modo: string; tipo?: string;
}): Promise<{ ok: boolean; url?: string; erro?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin." };
  const serie = SERIES.find((s) => s.nome === entrada.serie)?.nome as NomeSerie | undefined;
  const nome = entrada.nome.trim();
  if (!serie || !nome) return { ok: false, erro: "Faltam o nome ou a série de 2027." };
  return { ok: true, url: linkDaCarta(origemDoSite(), dadosDaCarta({ ...entrada, nome, serie })) };
}

/**
 * Manda a carta da rematrícula pelo WhatsApp da escola, um número por vez:
 * a apresentação com o folder e, em seguida, a imagem com os valores.
 * Cada tentativa fica em rematricula_envios.
 */
export async function enviarCarta(entrada: {
  alunoId: number | null;
  nome: string;
  serie: string;
  desconto: number;
  irmao: boolean;
  serieAtual?: string | null;
  base?: number | null;
  modo: string;
  tipo?: string; // "avista" = carta do pagamento à vista
  somenteFolder?: boolean; // só a apresentação com o folder, sem a carta de valores
  destinos: Destino[];
}): Promise<{ ok: boolean; erro?: string; resultados: ResultadoEnvio[] }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Sessão expirada. Entre de novo no admin.", resultados: [] };

  const serie = SERIES.find((s) => s.nome === entrada.serie)?.nome as NomeSerie | undefined;
  const nome = entrada.nome.trim();
  const soFolder = !!entrada.somenteFolder;
  if (!soFolder && (!serie || !nome)) return { ok: false, erro: "Faltam o nome ou a série de 2027.", resultados: [] };
  if (!(entrada.desconto >= 0)) return { ok: false, erro: "Desconto inválido.", resultados: [] };
  const chave = process.env.WEBHOOK_CONFIRM_SECRET;
  if (!chave) return { ok: false, erro: "WEBHOOK_CONFIRM_SECRET não está configurada no servidor.", resultados: [] };

  const destinos = entrada.destinos
    .map((d) => ({ ...d, telefone: d.telefone.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "") }))
    .filter((d, i, arr) => d.telefone.length >= 10 && arr.findIndex((x) => x.telefone === d.telefone) === i);
  if (!destinos.length) return { ok: false, erro: "Nenhum número válido (DDD + número).", resultados: [] };

  const origem = origemDoSite();
  const dados = soFolder || !serie ? null : dadosDaCarta({ ...entrada, nome, serie });
  // Só o folder: "imagem" vazia faz o n8n parar depois da apresentação.
  const imagem = dados ? linkDaCarta(origem, dados) : "";
  const primeiro = nome ? primeiroNome(nome) : "";
  const admin = createAdminClient();

  const resultados: ResultadoEnvio[] = [];
  for (const d of destinos) {
    let r: ResultadoEnvio;
    try {
      const resp = await fetch(WEBHOOK_ENVIO, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-amadeus-chave": chave },
        body: JSON.stringify({
          telefone: d.telefone,
          capa: `${origem}/api/rematricula/capa`,
          texto: textoApresentacao(primeiro),
          imagem,
          legenda: dados ? (dados.tipo === "avista" ? legendaAVista(primeiro) : legendaCarta(primeiro)) : "",
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const j = (await resp.json().catch(() => ({}))) as { status?: ResultadoEnvio["status"]; detalhe?: string };
      r = { telefone: d.telefone, status: resp.ok && j.status ? j.status : "erro", detalhe: j.detalhe || (resp.ok ? undefined : `HTTP ${resp.status}`) };
    } catch (e) {
      r = { telefone: d.telefone, status: "erro", detalhe: (e as Error).message };
    }
    resultados.push(r);
    await admin.from("rematricula_envios").insert({
      aluno_id: entrada.alunoId,
      aluno_nome: nome || "(só o folder)",
      serie_2027: serie ?? "—",
      responsavel: d.nome,
      telefone: d.telefone,
      status: r.status,
      detalhe: [soFolder ? "só o folder" : dados?.tipo === "avista" ? "à vista" : null, r.detalhe].filter(Boolean).join(" · ") || null,
      enviado_por: user.email ?? null,
    });
  }
  return { ok: true, resultados };
}
