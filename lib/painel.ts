import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { carregarPainel } from "@/lib/aniversarios";
import { lerAluno } from "@/lib/rematricula-2027-dados";
import { simular, trocaDeSegmento, type NomeSerie } from "@/lib/rematricula-2027";

/**
 * Dados do painel novo (admin.escolaamadeus.com, Pedro 24/10/2026): a página "Hoje" junta a rematrícula
 * (os três valores do aluno, com a mesma conta do simulador), a Experiência, os aniversários do dia,
 * o calendário da escola e os eventos com inscrição aberta. Nenhum valor em dinheiro de eventos aparece aqui.
 */

export const FUSO = "America/Sao_Paulo"; // horário de Brasília
export const hojeBR = (d = new Date()) => d.toLocaleDateString("en-CA", { timeZone: FUSO });
export const PRAZO_REMATRICULA = "2026-10-28";
export const EXPERIENCIA = { data: "2026-11-07", rotulo: "sáb 07/11" };

export const somaDias = (dia: string, n: number) => new Date(new Date(dia + "T12:00:00Z").getTime() + n * 864e5).toISOString().slice(0, 10);
export const diasEntre = (de: string, ate: string) => Math.round((Date.parse(ate + "T12:00:00Z") - Date.parse(de + "T12:00:00Z")) / 864e5);
const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const diaCurto = (dia: string) => `${DIAS_SEMANA[new Date(dia + "T12:00:00Z").getUTCDay()]} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`;
export const diaLongo = (dia: string) =>
  new Date(dia + "T12:00:00Z").toLocaleDateString("pt-BR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });

export interface ResumoRematricula {
  id: number;
  nome: string;
  serieAtual: string | null;
  serie2027: string | null;
  hoje: number | null; // mensalidade de 2026 no boleto
  ate: number | null; // 2027 fechando até o prazo, pagando até o dia 05, com o livro
  depois: number | null; // 2027 depois do prazo, pagando até o dia 05, com o livro
  revisar: boolean; // a leitura do boleto precisa de conferência no simulador
  pendencias: number;
  linkCarta: string | null;
}

/** Os três valores do aluno com a condição padrão do simulador (desconto de hoje mantido, sem irmão, sem extra, com livro). */
export async function resumoRematricula(id: number): Promise<ResumoRematricula | null> {
  const l = await lerAluno(id);
  if (!l) return null;
  const serie = l.serie2027;
  const base = l.base;
  const vazio = { id, nome: l.aluno.nome, serieAtual: l.aluno.serie, serie2027: serie, hoje: l.valorBoleto, revisar: l.confianca !== "certa", pendencias: l.pendencias.length };
  if (!serie || !base || base <= 0) return { ...vazio, ate: null, depois: null, linkCarta: null };
  const troca = trocaDeSegmento(l.aluno.serie, serie as NomeSerie);
  const desconto = Math.max(0, l.descontoPagamento ?? 0);
  const baseMesmo = troca ? null : base;
  const sim = simular(serie as NomeSerie, desconto, false, baseMesmo, 0);
  const linkCarta = `/admin/rematricula-2027/carta?${new URLSearchParams({
    aluno: String(id),
    ...(l.aluno.serie ? { atual: l.aluno.serie } : {}),
    serie: sim.serie2027,
    desconto: String(desconto),
    ...(baseMesmo !== null ? { base: String(baseMesmo) } : {}),
    livro: "com",
  })}`;
  return { ...vazio, ate: sim.promo.totalAte05, depois: sim.depois.totalAte05, linkCarta };
}

/** Funil da Experiência de 07/11 (a lista recomeçou limpa em 24/10). */
export async function funilExperiencia() {
  const { data } = await createAdminClient().from("experiencia_contatos").select("convite_em, vai_em, veio_0711, matriculou_em, origem");
  const l = data ?? [];
  return {
    convidadas: l.filter((c) => c.convite_em).length,
    inscritas: l.filter((c) => c.vai_em).length,
    vieram: l.filter((c) => c.veio_0711).length,
    matricularam: l.filter((c) => c.matriculou_em).length,
  };
}

export interface AniversarioHoje { nome: string; turma: string | null; enviado: number; total: number; erro: boolean }

/** Aniversariantes de hoje, alunos e equipe, com a prova do envio do cartão. */
export async function aniversariosHoje(): Promise<{ alunos: AniversarioHoje[]; equipe: AniversarioHoje[]; proximaEquipe: { nome: string; data: string } | null; erro: string | null }> {
  const p = await carregarPainel(31);
  const hoje = p.hoje;
  const conv = (a: (typeof p.lista)[number]): AniversarioHoje => ({
    nome: a.nome,
    turma: a.turma,
    enviado: a.contatos.filter((c) => c.status === "enviado").length,
    total: a.contatos.length,
    erro: a.semTelefone || a.contatos.some((c) => c.status === "erro" || c.status === "sem_whatsapp" || c.status === "nao_enviado"),
  });
  const deHoje = p.lista.filter((a) => a.data === hoje);
  const prox = p.lista.find((a) => a.tipo === "colaborador" && a.data > hoje);
  return {
    alunos: deHoje.filter((a) => a.tipo === "aluno").map(conv),
    equipe: deHoje.filter((a) => a.tipo === "colaborador").map(conv),
    proximaEquipe: prox ? { nome: prox.nome, data: prox.data } : null,
    erro: p.erro,
  };
}

export type TipoCalendario = "feriado" | "evento" | "gravacao" | "comunicacao" | "pedagogico" | "prazo";
export const TIPOS_CALENDARIO: { valor: TipoCalendario; rotulo: string; cor: string; fundo: string }[] = [
  { valor: "feriado", rotulo: "Feriado", cor: "#9b2c22", fundo: "#f6d4d1" },
  { valor: "evento", rotulo: "Evento", cor: "#1B3B7C", fundo: "#dbe4f6" },
  { valor: "gravacao", rotulo: "Gravação", cor: "#14655e", fundo: "#d4efec" },
  { valor: "comunicacao", rotulo: "Comunicação", cor: "#5b3d99", fundo: "#efe3fb" },
  { valor: "pedagogico", rotulo: "Pedagógico", cor: "#1f6b45", fundo: "#e3f3ea" },
  { valor: "prazo", rotulo: "Prazo", cor: "#7a5b00", fundo: "#fff0c2" },
];

export interface ItemCalendario {
  id: string; data: string; ate: string | null; hora: string | null; titulo: string; tipo: TipoCalendario;
  responsavel: string | null; observacao: string | null; criado_por: string | null;
}

/** Itens que tocam o intervalo [de, ate]. */
export async function itensDoCalendario(de: string, ate: string): Promise<ItemCalendario[]> {
  const { data } = await createAdminClient()
    .from("calendario_itens")
    .select("id, data, ate, hora, titulo, tipo, responsavel, observacao, criado_por")
    .lte("data", ate)
    .or(`ate.gte.${de},and(ate.is.null,data.gte.${de})`)
    .order("data")
    .order("hora", { nullsFirst: true });
  return (data ?? []) as ItemCalendario[];
}

/** Eventos com inscrição aberta e quantas famílias já se inscreveram (pagas). Sem valores. */
export async function eventosAbertos() {
  const hoje = hojeBR();
  const db = createAdminClient();
  const { data: evs } = await db.from("eventos").select("id, nome, data_evento, prazo_inscricao").eq("status", "publicado").gte("data_evento", hoje).order("data_evento");
  const ids = (evs ?? []).map((e) => e.id);
  const { data: insc } = ids.length
    ? await db.from("inscricoes").select("evento_id").in("evento_id", ids).eq("status_pagamento", "pago")
    : { data: [] as { evento_id: string }[] };
  const conta = new Map<string, number>();
  for (const i of insc ?? []) conta.set(i.evento_id, (conta.get(i.evento_id) ?? 0) + 1);
  return (evs ?? []).map((e) => ({ id: e.id as string, nome: e.nome as string, data: e.data_evento as string, prazo: (e.prazo_inscricao as string | null) ?? null, inscritos: conta.get(e.id) ?? 0 }));
}
