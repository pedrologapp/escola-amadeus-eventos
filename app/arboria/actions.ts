"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { ATIVIDADE, SERIES, type Chave } from "@/lib/arboria-historia";

/**
 * Experiência Amadeus (10/10/2026) · a história do Arboria de cada criança.
 * O pai cadastra o(s) filho(s) pelo QR; a história só abre quando o admin aperta
 * "Liberar histórias", e só para quem se cadastrou depois de "Começar reunião".
 */

export interface FilhoEntrada {
  nome: string;
  serie: string;
  genero: string;
  pele: string;
  cabelo: string;
  respostas: (Chave | null)[];
  foto?: string | null;        // data:image/jpeg;base64,… (já reduzida no celular)
  fotoAutorizada?: boolean;
}

export interface CriancaHistoria {
  id: string;
  nome: string;
  serie: string;
  genero: "menino" | "menina";
  pele: "clara" | "morena" | "negra";
  cabelo: "liso" | "cacheado" | "crespo";
  respostas: (Chave | null)[];
  boneco_url: string | null;
}

const CHAVES = new Set(["ling", "log", "esp", "mus", "cor", "nat", "inter", "intra"]);

export async function cadastrar(e: { familia: string; responsavel: string; filhos: FilhoEntrada[] }) {
  const familia = String(e.familia ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(familia)) return { ok: false as const, erro: "Recarregue a página e tente de novo." };
  const filhos = (e.filhos ?? []).slice(0, 6);
  if (!filhos.length) return { ok: false as const, erro: "Coloque pelo menos um filho." };
  const responsavel = String(e.responsavel ?? "").replace(/\s+/g, " ").trim().slice(0, 80) || null;

  const db = createAdminClient();
  const linhas = [];
  for (const f of filhos) {
    const nome = String(f.nome ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (nome.length < 2) return { ok: false as const, erro: "Escreva o nome de cada filho." };
    if (!SERIES.includes(f.serie as (typeof SERIES)[number])) return { ok: false as const, erro: `Escolha a série de ${nome}.` };
    if (!["menino", "menina"].includes(f.genero)) return { ok: false as const, erro: `Marque se ${nome} é menino ou menina.` };
    if (!["clara", "morena", "negra"].includes(f.pele) || !["liso", "cacheado", "crespo"].includes(f.cabelo))
      return { ok: false as const, erro: `Escolha a pele e o cabelo de ${nome}.` };
    const respostas = ATIVIDADE.map((_, i) => (CHAVES.has(String(f.respostas?.[i])) ? f.respostas[i] : null));

    let foto_path: string | null = null;
    const autorizada = !!f.fotoAutorizada;
    if (autorizada && typeof f.foto === "string" && f.foto.startsWith("data:image/jpeg;base64,")) {
      const bytes = Buffer.from(f.foto.slice("data:image/jpeg;base64,".length), "base64");
      if (bytes.length < 3_000_000) {
        const caminho = `${familia}/${crypto.randomUUID()}.jpg`;
        const { error } = await db.storage.from("arboria-exp").upload(caminho, bytes, { contentType: "image/jpeg" });
        if (!error) foto_path = caminho;
      }
    }
    linhas.push({ familia, responsavel, nome, serie: f.serie, genero: f.genero, pele: f.pele, cabelo: f.cabelo, respostas, foto_path, foto_autorizada: autorizada && !!foto_path });
  }

  const { error } = await db.from("arboria_exp_criancas").insert(linhas);
  if (error) return { ok: false as const, erro: "Não consegui salvar agora. Tente de novo em instantes." };
  return { ok: true as const };
}

/** O celular pergunta a cada poucos segundos se a história já pode abrir. */
export async function estado(familia: string) {
  if (!/^[0-9a-f-]{36}$/i.test(String(familia ?? ""))) return { liberado: false, criancas: [] as CriancaHistoria[], antes: false };
  const db = createAdminClient();
  const [{ data: r }, { data: cs }] = await Promise.all([
    db.from("arboria_exp_reuniao").select("iniciada_em, liberada_em").eq("id", 1).single(),
    db.from("arboria_exp_criancas").select("id, nome, serie, genero, pele, cabelo, respostas, boneco_url, criado_em").eq("familia", familia).order("criado_em"),
  ]);
  const todas = cs ?? [];
  // Só quem se cadastrou depois de "Começar reunião" recebe a história.
  const validas = r?.iniciada_em ? todas.filter((c) => Date.parse(c.criado_em) >= Date.parse(r.iniciada_em!)) : [];
  const liberado = !!(r?.liberada_em && validas.length);
  return {
    liberado,
    antes: todas.length > 0 && validas.length === 0 && !!r?.liberada_em,
    criancas: (liberado ? validas : []).map(({ criado_em: _c, ...c }) => c as CriancaHistoria),
    cadastradas: todas.map((c) => c.nome),
  };
}
