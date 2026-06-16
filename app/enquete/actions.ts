"use server";

import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ENQUETE_SLUG,
  ESCALA,
  scoreDe,
  TODAS_CLIMA,
  type ValorEscala,
} from "@/lib/enquete-config";

const VALORES = new Set<string>(ESCALA.map((e) => e.valor));

type EnvioEnquete = {
  serie?: string;
  turma?: string;
  disc?: Record<string, { clareza?: string; respeito?: string; sugestao?: string }>;
  dificuldade?: string[];
  clima?: Record<string, string>;
  abertas?: { mais_gosta?: string; mudaria?: string };
  ajuda?: { quer?: boolean; contato?: string };
  duracaoSeg?: number;
};

export type EnvioState = { ok: true } | { ok: false; error: string };

export async function enviarEnquete(payload: EnvioEnquete): Promise<EnvioState> {
  const serie = (payload?.serie ?? "").toString().trim();
  if (!serie) return { ok: false, error: "Selecione sua série/ano." };

  const clima = (payload?.clima ?? {}) as Record<string, string>;
  const respondidasClima = TODAS_CLIMA.filter((p) =>
    VALORES.has(clima[p.id]),
  ).length;
  if (respondidasClima === 0) {
    return { ok: false, error: "Responda ao menos as perguntas sobre a escola." };
  }

  // ---------- Camada de qualidade (invisível) ----------
  const climaVals = TODAS_CLIMA.map((p) => clima[p.id]).filter((v) =>
    VALORES.has(v),
  ) as ValorEscala[];

  const straightLine =
    climaVals.length >= 5 && climaVals.every((v) => v === climaVals[0]);

  // Par de coerência: "acolhido" (positivo) x "sozinho" (invertido).
  let coerenciaOk = true;
  const aco = clima["acolhido"];
  const soz = clima["sozinho"];
  if (VALORES.has(aco) && VALORES.has(soz)) {
    const dif = Math.abs(
      scoreDe(aco as ValorEscala, false) - scoreDe(soz as ValorEscala, true),
    );
    coerenciaOk = dif <= 50; // contradição grande = incoerente
  }

  const duracaoSeg = Math.max(0, Math.round(Number(payload?.duracaoSeg) || 0));
  const rapidoDemais = duracaoSeg > 0 && duracaoSeg < 60;

  const suspeito = straightLine || !coerenciaOk || rapidoDemais;

  // ---------- Monta o registro ----------
  const respostas = {
    disc: payload?.disc ?? {},
    dificuldade: Array.isArray(payload?.dificuldade) ? payload.dificuldade : [],
    clima,
    abertas: {
      mais_gosta: (payload?.abertas?.mais_gosta ?? "").toString().slice(0, 1000),
      mudaria: (payload?.abertas?.mudaria ?? "").toString().slice(0, 1000),
    },
    ajuda: {
      quer: !!payload?.ajuda?.quer,
      contato: (payload?.ajuda?.contato ?? "").toString().slice(0, 300),
    },
  };

  const meta = {
    duracao_seg: duracaoSeg,
    straight_line: straightLine,
    coerencia_ok: coerenciaOk,
    suspeito,
  };

  const admin = createAdminClient();
  const { error } = await admin.from("enquete_respostas").insert({
    slug: ENQUETE_SLUG,
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
  store.set(`enquete_${ENQUETE_SLUG}`, "1", {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return { ok: true };
}
