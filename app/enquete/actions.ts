"use server";

import { cookies, headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ESCALA,
  getEnquete,
  NAO_SEI,
  scoreDe,
  todasClima,
  type ValorEscala,
} from "@/lib/enquete-config";

const VALORES = new Set<string>(ESCALA.map((e) => e.valor));

type EnvioEnquete = {
  slug?: string;
  serie?: string;
  turma?: string;
  perfil?: Record<string, string>;
  disc?: Record<string, Record<string, string>>;
  dificuldade?: string[];
  clima?: Record<string, string>;
  comentarios?: Record<string, string>;
  abertas?: Record<string, string>;
  ajuda?: { quer?: boolean; contato?: string };
  duracaoSeg?: number;
  tempos?: Record<string, number>;
};

export type EnvioState = { ok: true } | { ok: false; error: string };

export async function enviarEnquete(payload: EnvioEnquete): Promise<EnvioState> {
  const def = getEnquete((payload?.slug ?? "").toString());
  if (!def) return { ok: false, error: "Pesquisa inválida." };

  const serie = (payload?.serie ?? "").toString().trim();
  if (!serie) return { ok: false, error: "Selecione o ano/série." };

  const clima = (payload?.clima ?? {}) as Record<string, string>;
  const perguntasClima = todasClima(def);
  const respondidasClima = perguntasClima.filter(
    (p) => VALORES.has(clima[p.id]) || clima[p.id] === NAO_SEI,
  ).length;
  if (respondidasClima === 0) {
    return { ok: false, error: "Responda ao menos as perguntas sobre a escola." };
  }

  // Perfil (só ids/opções definidos na pesquisa).
  const perfil: Record<string, string> = {};
  for (const p of def.perguntasPerfil ?? []) {
    const v = (payload?.perfil?.[p.id] ?? "").toString();
    if (p.opcoes.includes(v)) perfil[p.id] = v;
  }

  // ---------- Camada de qualidade (invisível) ----------
  const climaVals = perguntasClima
    .map((p) => clima[p.id])
    .filter((v) => VALORES.has(v)) as ValorEscala[];

  const straightLine =
    climaVals.length >= 5 && climaVals.every((v) => v === climaVals[0]);

  // Par de coerência (se a pesquisa definir um): duas perguntas que deveriam
  // ter respostas opostas. Contradição grande = incoerente.
  let coerenciaOk = true;
  const par = perguntasClima.find((p) => p.coerenciaCom);
  if (par?.coerenciaCom) {
    const a = clima[par.id];
    const b = clima[par.coerenciaCom];
    if (VALORES.has(a) && VALORES.has(b)) {
      const outra = perguntasClima.find((p) => p.id === par.coerenciaCom);
      const dif = Math.abs(
        scoreDe(a as ValorEscala, par.invertida) -
          scoreDe(b as ValorEscala, outra?.invertida),
      );
      coerenciaOk = dif <= 50;
    }
  }

  const duracaoSeg = Math.max(0, Math.round(Number(payload?.duracaoSeg) || 0));

  // Tempo por bloco (cada professor/seção). Suspeito quando a mediana dos
  // blocos é muito baixa — sinal de que respondeu no automático.
  const temposEntrada =
    payload?.tempos && typeof payload.tempos === "object" ? payload.tempos : {};
  const tempos: Record<string, number> = {};
  for (const [k, v] of Object.entries(temposEntrada)) {
    const n = Number(v);
    if (Number.isFinite(n) && n >= 0) tempos[k] = Math.round(n);
  }
  const tempoVals = Object.values(tempos).sort((a, b) => a - b);
  const medianaBloco = tempoVals.length
    ? tempoVals[Math.floor(tempoVals.length / 2)]
    : null;
  const rapidoDemais =
    tempoVals.length >= 5 && medianaBloco !== null && medianaBloco < 2;

  const suspeito = straightLine || !coerenciaOk || rapidoDemais;

  // IP de quem respondeu (Vercel preenche x-forwarded-for). Só registro.
  const h = await headers();
  const ip =
    (h.get("x-forwarded-for") || "").split(",")[0].trim() ||
    h.get("x-real-ip") ||
    "";

  // ---------- Monta o registro ----------
  // Comentários por categoria (limita tamanho de cada um)
  const comentarios: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload?.comentarios ?? {})) {
    const txt = (v ?? "").toString().trim();
    if (txt) comentarios[k] = txt.slice(0, 1000);
  }

  // Abertas (limita tamanho de cada uma)
  const abertas: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload?.abertas ?? {})) {
    abertas[k] = (v ?? "").toString().slice(0, 1000);
  }

  const respostas = {
    perfil,
    disc: payload?.disc ?? {},
    dificuldade: Array.isArray(payload?.dificuldade) ? payload.dificuldade : [],
    clima,
    comentarios,
    abertas,
    ajuda: {
      quer: !!payload?.ajuda?.quer,
      contato: (payload?.ajuda?.contato ?? "").toString().slice(0, 300),
    },
  };

  const meta = {
    duracao_seg: duracaoSeg,
    tempos,
    mediana_bloco_seg: medianaBloco,
    straight_line: straightLine,
    coerencia_ok: coerenciaOk,
    suspeito,
    ip,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("enquete_respostas").insert({
    slug: def.slug,
    serie,
    turma: (payload?.turma ?? "").toString().trim() || null,
    respostas,
    meta,
  });

  if (error) {
    return { ok: false, error: "Não foi possível enviar. Tente de novo." };
  }

  // Marca o aparelho (trava suave — não impede de verdade, só evita reenvio bobo)
  const store = await cookies();
  store.set(`enquete_${def.slug}`, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
}
