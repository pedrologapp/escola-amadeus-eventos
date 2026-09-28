import "server-only";

import {
  LIVRO,
  TABELA_2026,
  proximaSerie,
  segmentoDe,
  serieCanonica,
  type NomeSerie,
} from "@/lib/rematricula-2027";
import { PRECO_LIVRO, anoLetivo } from "@/lib/rematricula-historico";

/**
 * Leitura do Activesoft para o simulador da rematrícula 2027.
 *
 * O boleto de 2026 vem com um valor só ("Mensalidade EF 1º Ano: 632"): o
 * livro está embutido para a maioria, mas a API não diz. Separamos assim:
 * valor = base + livro, onde o livro é o preço da promoção de 2025 (quem
 * fechou até 31/10/2025) ou o de 2026. Conferido em 27/09/2026 nos 498
 * alunos ativos: 617 = 490 + 127, 655 = 510 + 145, 632 = 490 + 142 etc.
 * Quem paga o livro à parte tem uma cobrança "Livros ..." separada.
 */

const HOST = "https://siga01.activesoft.com.br/api";
const FIM_PROMO_2025 = "2025-10-31";

type Json = Record<string, unknown>;

function token() {
  const t = process.env.ACTIVESOFT_TOKEN;
  if (!t) throw new Error("A chave do Activesoft (ACTIVESOFT_TOKEN) não está configurada na Vercel.");
  return t;
}

export async function buscar(caminho: string, revalidar: number | false = false): Promise<unknown> {
  const pedir = () =>
    fetch(`${HOST}/${caminho}`, {
      headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
      ...(revalidar === false ? { cache: "no-store" as const } : { next: { revalidate: revalidar } }),
    });
  let r = await pedir();
  // O Activesoft devolve 502 de vez em quando; uma segunda tentativa resolve.
  if (r.status >= 500) r = await pedir();
  if (!r.ok) throw new Error(`Activesoft respondeu ${r.status} em ${caminho.split("?")[0]}`);
  return r.json();
}

export interface AlunoBusca {
  id: number;
  nome: string;
  serie: NomeSerie | null;
  turma: string;
}

/** Alunos ativos (turma regular), para a busca por nome. */
export async function listarAlunos(): Promise<AlunoBusca[]> {
  const j = (await buscar("v0/acesso/alunos/", 600)) as Json[] | { results: Json[] };
  const lista = Array.isArray(j) ? j : j.results;
  const porId = new Map<number, AlunoBusca>();
  for (const a of lista) {
    const serie = serieCanonica(String(a.nome_serie ?? ""));
    const id = a.id_aluno as number;
    // Karatê, futsal etc. também aparecem como "turma"; a regular vence.
    if (!id || (porId.get(id)?.serie && !serie)) continue;
    porId.set(id, { id, nome: String(a.nome ?? "").trim(), serie, turma: String(a.nome_turma ?? "") });
  }
  return [...porId.values()].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}

export interface Responsavel {
  nome: string;
  telefone: string; // só dígitos, DDD + número
}

const soDigitos = (t: unknown): string | null => {
  let d = String(t ?? "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  return d.length >= 10 ? d : null;
};

/** Responsáveis e filiação do aluno com celular, sem repetir número (igual aos aniversários). */
export async function responsaveisDoAluno(id: number): Promise<Responsavel[]> {
  const [cad, resp] = (await Promise.all([
    buscar("v1/lista_alunos/", 3600),
    buscar("v1/lista_responsaveis/", 3600),
  ])) as [Json[] | { results: Json[] }, Json[] | { results: Json[] }];
  const lista = (x: Json[] | { results: Json[] }) => (Array.isArray(x) ? x : x.results);
  const c = lista(cad).find((a) => a.id === id);
  if (!c) return [];
  const porId = new Map(lista(resp).map((r) => [r.id as number, r]));
  const ids = [c.responsavel_id, c.responsavel_secundario_id, c.filiacao_1_id, c.filiacao_2_id, ...((c.responsaveis_adicionais_ids as number[]) ?? [])]
    .filter(Boolean) as number[];
  const saida: Responsavel[] = [];
  for (const rid of new Set(ids)) {
    const r = porId.get(rid);
    const t = soDigitos(r?.celular);
    if (t && !saida.some((s) => s.telefone === t)) saida.push({ nome: String(r?.nome ?? "Responsável").trim(), telefone: t });
  }
  return saida;
}

export type Confianca = "certa" | "provavel" | "revisar";

export interface Leitura {
  aluno: AlunoBusca;
  serie2027: NomeSerie | null;
  valorBoleto: number | null; // mensalidade de 2026 como vem no boleto
  base: number | null; // sem o livro
  livroNoBoleto: number; // 0 = livro não está na mensalidade
  confianca: Confianca;
  explicacao: string;
  alternativa?: { base: number; livro: number };
  descontos: string[]; // descontos condicionais cadastrados em 2026
  /** Teto (tabela 2026) do segmento atual; teto − base = desconto que já vem no boleto. */
  tetoAtual: number | null;
  descontoBoleto: number;
  /**
   * O que o Isaac tira a mais quando a família paga até o dia 05, além dos
   * R$ 20 da Fidelidade (ex.: Pedro Gregório, 602 no boleto e 432 pago = 150
   * de desconto da escola). null = nunca pagou até o dia 05 em 2026.
   */
  descontoPagamento: number | null;
  pagamentosAte05: number;
  irmaos: { nome: string; serie: string }[];
  pendencias: Pendencia[];
}

interface Titulo {
  valor_documento: number;
  valor_recebido_total?: number | null;
  valor_recebido_multa?: number | null;
  valor_recebido_juros?: number | null;
  dt_pagamento?: string | null;
  dt_vencimento: string;
  dt_processamento: string | null;
  parcela_cobranca: string;
  nome_servico: string;
  situacao_titulo: string;
  situacao_no_agente?: string | null; // "isaac: Em aberto", "isaac: Liquidado"...
}

export interface Pendencia {
  servico: string;
  vencimento: string; // AAAA-MM-DD
  valor: number;
}

/**
 * Pendências financeiras (o "Não rematriculável (há pendências financeiras)"
 * do Isaac, que a API do Activesoft não expõe): parcelas vencidas que ainda
 * estão EM ABERTO NO ISAAC. O status do próprio Activesoft não serve: muitas
 * parcelas aparecem abertas lá mas já estão "isaac: Liquidado".
 * Títulos sem Isaac (antigos) contam se estiverem abertos no Activesoft.
 */
function pendenciasFinanceiras(titulos: Titulo[]): Pendencia[] {
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
  return titulos
    .filter((t) => {
      if (t.dt_vencimento.slice(0, 10) >= hoje) return false;
      const agente = (t.situacao_no_agente ?? "").toLowerCase();
      if (agente.startsWith("isaac")) return /em aberto|parcial|vencid|atras/.test(agente);
      return t.situacao_titulo === "ABE";
    })
    .map((t) => ({ servico: t.nome_servico, vencimento: t.dt_vencimento.slice(0, 10), valor: t.valor_documento }))
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento));
}

async function descontosDoAluno(id: number): Promise<string[]> {
  // A lista é paginada e sem filtro por aluno; guardamos 1h.
  const saida: string[] = [];
  for (let off = 0; off < 10000; off += 1000) {
    const j = (await buscar(`v1/lista_alunos_com_descontos/?limit=1000&offset=${off}`, 3600)) as {
      results: Json[];
      next: string | null;
    };
    const a = j.results.find((x) => x.id === id);
    if (a) {
      for (const d of (a.descontos as Json[]) ?? []) {
        if (String(d.data_final ?? "") < "2026-01-01") continue;
        const valor = d.valor_abatimento != null ? `R$ ${d.valor_abatimento}` : `${d.percentual_abatimento}%`;
        const dia = d.dia_desconto_condicional ? ` pagando até o dia ${d.dia_desconto_condicional}` : "";
        saida.push(`${d.nome_abatimento}: ${valor}${dia}`);
      }
      break;
    }
    if (!j.next) break;
  }
  return saida;
}

type LeituraBoleto = Omit<Leitura, "tetoAtual" | "descontoBoleto" | "descontoPagamento" | "pagamentosAte05" | "irmaos" | "pendencias">;

async function lerBoleto(id: number): Promise<(LeituraBoleto & { mensais: Titulo[]; todos: Titulo[] }) | null> {
  const alunos = await listarAlunos();
  const aluno = alunos.find((a) => a.id === id);
  if (!aluno) return null;

  const [boletos, descontos] = await Promise.all([
    buscar(`v1/informacoes_boleto/?id_aluno=${id}`) as Promise<{ resultados?: Titulo[] }>,
    descontosDoAluno(id).catch(() => []),
  ]);
  const de2026 = (boletos.resultados ?? []).filter(
    (t) => t.dt_vencimento >= "2026-01-01" && t.dt_vencimento < "2027-01-01" && t.situacao_titulo !== "CAN",
  );
  const todasMensais = de2026.filter((t) => /^Mensalidade/i.test(t.nome_servico) && /^\d{2}\/12/.test(t.parcela_cobranca.trim()));
  // Parcela do contrato do ano anterior (ex.: Grupo V com vencimento em
  // janeiro) cai em 2026 também; fica só a série atual quando existir.
  const daSerie = todasMensais.filter((t) => serieCanonica(t.nome_servico) === aluno.serie);
  const mensais = daSerie.length ? daSerie : todasMensais;
  const serie2027 = aluno.serie ? proximaSerie(aluno.serie) : null;
  const vazio = { aluno, serie2027, descontos, alternativa: undefined, mensais, todos: (boletos.resultados ?? []).filter((t) => t.situacao_titulo !== "CAN") };

  if (mensais.length === 0) {
    const outras = de2026.filter((t) => /^Mensalidade/i.test(t.nome_servico));
    const resumo = outras.length
      ? outras.map((t) => `${t.parcela_cobranca.trim()} de ${t.valor_documento}`).join(", ")
      : "nenhuma mensalidade em 2026";
    return {
      ...vazio,
      valorBoleto: null,
      base: null,
      livroNoBoleto: 0,
      confianca: "revisar",
      explicacao: `Não tem as 12 parcelas mensais de 2026 (${resumo}). Informe a mensalidade que a família paga hoje, sem o livro.`,
    };
  }

  // O valor que mais se repete (uma parcela negociada à parte não muda a regra).
  const contagem = new Map<number, number>();
  for (const t of mensais) contagem.set(t.valor_documento, (contagem.get(t.valor_documento) ?? 0) + 1);
  const v = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];

  const serie2026 = serieCanonica(mensais[0].nome_servico) ?? aluno.serie;
  const seg = serie2026 ? segmentoDe(serie2026) : null;
  if (!seg) {
    return { ...vazio, valorBoleto: v, base: v, livroNoBoleto: 0, confianca: "revisar", explicacao: `Não reconheci a série da mensalidade (${mensais[0].nome_servico}). Confira a base.` };
  }

  const tabela = TABELA_2026[seg];
  const { promo2025, l2026 } = LIVRO[seg];

  if (de2026.some((t) => /^Livros? Ensino/i.test(t.nome_servico))) {
    return { ...vazio, valorBoleto: v, base: v, livroNoBoleto: 0, confianca: "certa", explicacao: `O livro é cobrado à parte, então a mensalidade de hoje é ${v}.` };
  }

  // Na tabela ou abaixo dela: não sobra espaço para o livro dentro.
  if (v <= tabela) {
    return {
      ...vazio, valorBoleto: v, base: v, livroNoBoleto: 0, confianca: v === tabela ? "certa" : "provavel",
      explicacao: v === tabela
        ? `${v} é a mensalidade de tabela, sem o livro dentro.`
        : `${v} é mensalidade com desconto, sem o livro dentro.`,
    };
  }

  const fechouNaPromo =mensais.map((t) => (t.dt_processamento ?? "").slice(0, 10)).sort()[0] <= FIM_PROMO_2025;
  const plausivel = (b: number) => b <= tabela && b >= tabela - 120;
  const opcoes = [
    { livro: promo2025, base: v - promo2025 },
    { livro: l2026, base: v - l2026 },
  ].filter((o) => plausivel(o.base));

  if (v - l2026 > tabela) {
    return {
      ...vazio, valorBoleto: v, base: v - l2026, livroNoBoleto: l2026, confianca: "revisar",
      explicacao: `${v} está acima da tabela (${tabela} + livro ${l2026}). Pode ser outra série ou um acréscimo. Confira a base.`,
    };
  }
  if (opcoes.length === 0) {
    return {
      ...vazio, valorBoleto: v, base: v - l2026, livroNoBoleto: l2026, confianca: "revisar",
      explicacao: `${v} não fecha com a tabela (${tabela}) mais o livro (${promo2025} ou ${l2026}). Confira a base.`,
    };
  }

  const exata = opcoes.find((o) => o.base === tabela);
  const escolhida =
    exata ?? opcoes.find((o) => o.livro === (fechouNaPromo ? promo2025 : l2026)) ?? opcoes[0];
  const outra = opcoes.find((o) => o !== escolhida);
  const qual = escolhida.livro === promo2025 ? "livro na promoção, valor de 2024" : "livro depois do prazo, valor de 2026";
  return {
    ...vazio,
    valorBoleto: v,
    base: escolhida.base,
    livroNoBoleto: escolhida.livro,
    confianca: exata ? "certa" : "provavel",
    explicacao: `${v} = ${escolhida.base} de mensalidade + ${escolhida.livro} do ${qual}${exata ? "." : `. Fechou ${fechouNaPromo ? "até" : "depois de"} 31/10/2025.`}`,
    alternativa: outra && !exata ? { base: outra.base, livro: outra.livro } : undefined,
  };
}

export interface AnoDoAluno {
  ano: number;
  serie: string;
  geradoEm: string | null; // quando as parcelas foram lançadas no sistema (AAAA-MM-DD)
  naPromocao: boolean | null; // null = ano sem data de promoção conhecida
  valor: number; // mensalidade do boleto (a mais frequente)
  base: number | null; // sem o livro
  livro: number; // 0 = fora da mensalidade
  livroDoAno: number | null; // de que ano é o preço do livro que ele pegou
  livroAParte: boolean;
  temTabela: boolean;
}

/** Cada ano letivo do aluno no Activesoft: quando rematriculou, quanto paga e de que ano é o livro. */
export async function historicoDoAluno(id: number): Promise<AnoDoAluno[]> {
  type T = Titulo & { turma?: string };
  const j = (await buscar(`v1/informacoes_boleto/?id_aluno=${id}`)) as { resultados?: T[] };
  const titulos = (j.resultados ?? []).filter((t) => t.situacao_titulo !== "CAN");
  const porAno = new Map<number, T[]>();
  const livroAParte = new Set<number>();
  for (const t of titulos) {
    const ano = Number((t.turma ?? "").match(/\/ (20\d\d) \//)?.[1]);
    if (!ano) continue;
    if (/^Livros? Ensino/i.test(t.nome_servico)) livroAParte.add(ano);
    if (/^Mensalidade/i.test(t.nome_servico) && /^\d{2}\/12/.test(t.parcela_cobranca.trim())) porAno.set(ano, [...(porAno.get(ano) ?? []), t]);
  }
  const saida: AnoDoAluno[] = [];
  for (const [ano, ts] of porAno) {
    const cont = new Map<number, number>();
    for (const t of ts) cont.set(t.valor_documento, (cont.get(t.valor_documento) ?? 0) + 1);
    const v = [...cont.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const geradoEm = ts.map((t) => (t.dt_processamento ?? "").slice(0, 10)).filter(Boolean).sort()[0] ?? null;
    const serie = serieCanonica(ts[0].nome_servico) ?? ts[0].nome_servico.replace(/^Mensalidade\s*/i, "").replace(/\s*\(.*\)$/, "");
    const seg = segmentoDe(serie);
    const info = anoLetivo(ano);
    const pelaData = info?.prazoIso && geradoEm ? geradoEm <= info.prazoIso : null;
    let base: number | null = null;
    let livro = 0;
    let livroDoAno: number | null = null;
    if (seg && info) {
      const tabela = info.mensalidade[seg];
      if (!info.livroNaMensalidade || v <= tabela) {
        base = v;
      } else {
        const opcoes = [ano - 1, ano]
          .filter((a) => PRECO_LIVRO[a])
          .map((a) => ({ a, l: PRECO_LIVRO[a][seg], b: v - PRECO_LIVRO[a][seg] }))
          .filter((o) => o.b <= tabela && o.b >= tabela - 120);
        const certa = opcoes.find((o) => o.b === tabela) ?? opcoes.find((o) => o.a === (pelaData ? ano - 1 : ano)) ?? opcoes[0];
        if (certa) {
          base = certa.b;
          livro = certa.l;
          livroDoAno = certa.a;
        }
      }
    }
    // O preço do livro no boleto diz se a família pegou a promoção; a data de
    // lançamento das parcelas só decide quando não há livro na mensalidade.
    const naPromocao = livroDoAno !== null ? livroDoAno === ano - 1 : pelaData;
    saida.push({ ano, serie, geradoEm, naPromocao, valor: v, base, livro, livroDoAno, livroAParte: livroAParte.has(ano), temTabela: !!info });
  }
  return saida.sort((a, b) => b.ano - a.ano);
}

/** Moda do que a família deixou de pagar nas parcelas pagas até o dia 05 (sem multa nem juros). */
function descontoNoPagamento(mensais: Titulo[]): { valor: number | null; n: number } {
  const difs: number[] = [];
  for (const t of mensais) {
    if (t.situacao_titulo !== "LIQ" || !t.dt_pagamento || t.valor_recebido_total == null) continue;
    if ((t.valor_recebido_multa ?? 0) > 0 || (t.valor_recebido_juros ?? 0) > 0) continue;
    const pago = t.dt_pagamento.slice(0, 10);
    const venc = t.dt_vencimento.slice(0, 10);
    // até o dia 05 do mês do vencimento, ou antes desse mês
    if (pago.slice(0, 7) > venc.slice(0, 7) || (pago.slice(0, 7) === venc.slice(0, 7) && Number(pago.slice(8)) > 5)) continue;
    difs.push(Math.round((t.valor_documento - t.valor_recebido_total) * 100) / 100);
  }
  if (!difs.length) return { valor: null, n: 0 };
  const c = new Map<number, number>();
  for (const d of difs) c.set(d, (c.get(d) ?? 0) + 1);
  const moda = [...c.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0][0];
  return { valor: Math.max(0, moda - 20), n: difs.length };
}

/** Irmãos ativos: mesmo pai ou mesma mãe (filiação) no Activesoft — nunca pelo nome do responsável. */
async function irmaosDoAluno(id: number, alunos: AlunoBusca[]): Promise<{ nome: string; serie: string }[]> {
  const cad = (await buscar("v1/lista_alunos/", 3600)) as Json[] | { results: Json[] };
  const lista = Array.isArray(cad) ? cad : cad.results;
  const eu = lista.find((a) => a.id === id);
  const pais = new Set([eu?.filiacao_1_id, eu?.filiacao_2_id].filter(Boolean));
  if (!pais.size) return [];
  const ativos = new Map(alunos.map((a) => [a.id, a]));
  return lista
    .filter((a) => a.id !== id && ativos.has(a.id as number) && (pais.has(a.filiacao_1_id) || pais.has(a.filiacao_2_id)))
    .map((a) => {
      const x = ativos.get(a.id as number)!;
      return { nome: x.nome, serie: x.serie ?? x.turma };
    });
}

export async function lerAluno(id: number): Promise<Leitura | null> {
  const [l, alunos] = await Promise.all([lerBoleto(id), listarAlunos()]);
  if (!l) return null;
  const { mensais, todos, ...resto } = l;
  const seg = l.aluno.serie ? segmentoDe(l.aluno.serie) : null;
  const tetoAtual = seg ? TABELA_2026[seg] : null;
  const pag = descontoNoPagamento(mensais);
  const irmaos = await irmaosDoAluno(id, alunos).catch(() => []);
  return {
    ...resto,
    tetoAtual,
    // Usado só na troca de segmento (no mesmo segmento esse desconto já está na
    // mensalidade de hoje). A Fidelidade não está no boleto: o Isaac a tira no pagamento.
    descontoBoleto: tetoAtual !== null && l.base !== null ? Math.max(0, tetoAtual - l.base) : 0,
    descontoPagamento: pag.valor,
    pagamentosAte05: pag.n,
    irmaos,
    pendencias: pendenciasFinanceiras(todos),
  };
}
