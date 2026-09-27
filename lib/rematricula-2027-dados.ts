import "server-only";

import {
  LIVRO,
  TABELA_2026,
  proximaSerie,
  segmentoDe,
  serieCanonica,
  type NomeSerie,
} from "@/lib/rematricula-2027";

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

async function buscar(caminho: string, revalidar: number | false = false): Promise<unknown> {
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
}

interface Titulo {
  valor_documento: number;
  dt_vencimento: string;
  dt_processamento: string | null;
  parcela_cobranca: string;
  nome_servico: string;
  situacao_titulo: string;
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

export async function lerAluno(id: number): Promise<Leitura | null> {
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
  const vazio = { aluno, serie2027, descontos, alternativa: undefined };

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

  if (de2026.some((t) => /^Livro/i.test(t.nome_servico))) {
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
  const qual = escolhida.livro === promo2025 ? "livro da promoção de 2025" : "livro de 2026";
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
