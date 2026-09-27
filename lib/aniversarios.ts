import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Dados do painel /admin/comunicacao/aniversarios.
 *
 * As datas de nascimento só existem no Activesoft, então a lista sai de lá
 * (a mesma consulta do fluxo do n8n: alunos ativos, cadastro, responsáveis e
 * colaboradores). O que foi enviado vem de `aniversario_envios`, que o fluxo
 * preenche às 7h. Chave em ACTIVESOFT_TOKEN.
 */

const HOST = "https://siga01.activesoft.com.br/api";
const FUSO = "America/Fortaleza";
const HORA_ENVIO = 7;

export type StatusEnvio = "enviado" | "sem_whatsapp" | "erro" | "aguardando" | "nao_enviado";

export interface Contato {
  nome: string;
  telefone: string;
  status: StatusEnvio;
  quando?: string; // hora do envio, "07:02"
}

export interface Aniversariante {
  ref: string; // "aluno:2166" | "colab:13"
  tipo: "aluno" | "colaborador";
  nome: string;
  turma: string | null;
  data: string; // AAAA-MM-DD do aniversário (no ano corrente ou seguinte)
  idade: number; // idade que completa
  contatos: Contato[]; // preenchido só para os de hoje
  semTelefone: boolean;
}

export interface EnvioRecente {
  data: string;
  quando: string;
  tipo: string;
  nome: string;
  telefone: string;
  status: string;
}

export interface PainelAniversarios {
  hoje: string;
  agoraHora: number;
  lista: Aniversariante[];
  recentes: EnvioRecente[];
  erro: string | null;
}

type Json = Record<string, unknown>;

async function buscar(caminho: string, token: string): Promise<Json[]> {
  const r = await fetch(`${HOST}/${caminho}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Activesoft ${caminho}: ${r.status}`);
  const j = await r.json();
  return Array.isArray(j) ? j : ((j?.results as Json[]) ?? []);
}

const dataLocal = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: FUSO });
const horaLocal = (d: Date) => Number(d.toLocaleString("en-US", { timeZone: FUSO, hour: "numeric", hour12: false })) % 24;
const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });

function telefone(t: unknown): string | null {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d.length >= 10 ? d : null;
}

const ehBissexto = (a: number) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;

/** Próximo aniversário a partir de hoje, dentro da janela; null se fora. */
function proximo(nasc: unknown, hoje: string, dias: number): { data: string; idade: number } | null {
  const s = String(nasc ?? "");
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const anoNasc = +s.slice(0, 4);
  let md = s.slice(5, 10);
  const inicio = new Date(hoje + "T12:00:00Z");
  for (const ano of [+hoje.slice(0, 4), +hoje.slice(0, 4) + 1]) {
    if (md === "02-29" && !ehBissexto(ano)) md = "02-28";
    const alvo = new Date(`${ano}-${md}T12:00:00Z`);
    const dif = Math.round((alvo.getTime() - inicio.getTime()) / 864e5);
    if (dif >= 0 && dif <= dias) return { data: `${ano}-${md}`, idade: ano - anoNasc };
  }
  return null;
}

export async function carregarPainel(dias = 30): Promise<PainelAniversarios> {
  const agora = new Date();
  const hoje = dataLocal(agora);
  const agoraHora = horaLocal(agora);
  const token = process.env.ACTIVESOFT_TOKEN;
  const vazio = { hoje, agoraHora, lista: [], recentes: [] };
  if (!token) return { ...vazio, erro: "A chave do Activesoft (ACTIVESOFT_TOKEN) não está configurada na Vercel." };

  let ativos: Json[], cadastro: Json[], responsaveis: Json[], colaboradores: Json[];
  try {
    [ativos, cadastro, responsaveis, colaboradores] = await Promise.all([
      buscar("v0/acesso/alunos/", token),
      buscar("v1/lista_alunos/", token),
      buscar("v1/lista_responsaveis/", token),
      buscar("v1/lista_colaboradores/", token),
    ]);
  } catch (e) {
    return { ...vazio, erro: `Não consegui falar com o Activesoft agora (${(e as Error).message}).` };
  }

  const supabase = createAdminClient();
  const desde = dataLocal(new Date(agora.getTime() - 7 * 864e5));
  const { data: envios } = await supabase
    .from("aniversario_envios")
    .select("data, tipo, pessoa_ref, nome, telefone, status, created_at")
    .gte("data", desde)
    .not("pessoa_ref", "like", "teste:%")
    .order("created_at", { ascending: false });
  const envioHoje = new Map<string, { status: string; created_at: string }>();
  for (const e of envios ?? []) if (e.data === hoje) envioHoje.set(`${e.pessoa_ref}|${e.telefone}`, e);

  const porCadastro = new Map(cadastro.map((c) => [c.id as number, c]));
  const respPorId = new Map(responsaveis.map((r) => [r.id as number, r]));

  const statusDe = (ref: string, tel: string): Contato["status"] => {
    const e = envioHoje.get(`${ref}|${tel}`);
    if (e) return (e.status as StatusEnvio) ?? "enviado";
    return agoraHora < HORA_ENVIO ? "aguardando" : "nao_enviado";
  };

  const lista: Aniversariante[] = [];
  const vistos = new Set<number>();
  for (const a of ativos) {
    const id = a.id_aluno as number;
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const p = proximo(a.data_nascimento, hoje, dias);
    if (!p) continue;
    const ref = `aluno:${id}`;
    const c = porCadastro.get(id) ?? {};
    const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...((c.responsaveis_adicionais_ids as number[]) ?? [])]
      .filter(Boolean) as number[];
    const contatos: Contato[] = [];
    const tels = new Set<string>();
    for (const rid of [...new Set(ids)]) {
      const r = respPorId.get(rid);
      const t = telefone(r?.celular);
      if (!t || tels.has(t)) continue;
      tels.add(t);
      if (p.data === hoje) {
        const e = envioHoje.get(`${ref}|${t}`);
        contatos.push({ nome: String(r?.nome ?? "Responsável"), telefone: t, status: statusDe(ref, t), quando: e ? hhmm(e.created_at) : undefined });
      }
    }
    lista.push({
      ref, tipo: "aluno", nome: String(a.nome ?? ""),
      turma: (a.nome_turma as string) ?? (a.nome_serie as string) ?? null,
      data: p.data, idade: p.idade, contatos, semTelefone: tels.size === 0,
    });
  }
  for (const c of colaboradores) {
    if (c.ativo === false) continue;
    const p = proximo(c.data_nascimento, hoje, dias);
    if (!p) continue;
    const ref = `colab:${c.id}`;
    const t = telefone(c.celular);
    const e = t ? envioHoje.get(`${ref}|${t}`) : undefined;
    lista.push({
      ref, tipo: "colaborador", nome: String(c.nome ?? ""), turma: null, data: p.data, idade: p.idade,
      contatos: p.data === hoje && t ? [{ nome: String(c.nome ?? ""), telefone: t, status: statusDe(ref, t), quando: e ? hhmm(e.created_at) : undefined }] : [],
      semTelefone: !t,
    });
  }
  lista.sort((x, y) => x.data.localeCompare(y.data) || x.nome.localeCompare(y.nome, "pt-BR"));

  const recentes: EnvioRecente[] = (envios ?? []).slice(0, 40).map((e) => ({
    data: e.data, quando: hhmm(e.created_at), tipo: e.tipo, nome: e.nome, telefone: e.telefone, status: e.status,
  }));

  return { hoje, agoraHora, lista, recentes, erro: null };
}
