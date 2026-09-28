import "server-only";

/**
 * Fotos de infância da equipe (28/09/2026). A lista de nomes sai do
 * Activesoft (colaboradores ativos), a mesma dos aniversários. Quem não está
 * lá digita o nome. Chave em ACTIVESOFT_TOKEN.
 */

export const BUCKET_FOTOS = "fotos-infancia";
export const URL_FOTOS = "https://eventos.escolaamadeus.com/criancaamadeus";

export interface Colaborador {
  id: number;
  nome: string;
}

export const semAcento = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** "MARIA DA SILVA" → "Maria da Silva". O Activesoft guarda alguns nomes em caixa alta. */
export function nomeBonito(nome: string) {
  const minusculas = new Set(["da", "de", "do", "das", "dos", "e"]);
  return nome
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && minusculas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

export const chaveDe = (id: number | null, nome: string) => (id ? `colab:${id}` : `nome:${semAcento(nome)}`);

export async function listarColaboradores(): Promise<Colaborador[]> {
  const token = process.env.ACTIVESOFT_TOKEN;
  if (!token) throw new Error("ACTIVESOFT_TOKEN não configurada");
  const r = await fetch("https://siga01.activesoft.com.br/api/v1/lista_colaboradores/", {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!r.ok) throw new Error(`Activesoft respondeu ${r.status}`);
  const j = (await r.json()) as unknown;
  const lista = (Array.isArray(j) ? j : ((j as { results?: unknown[] }).results ?? [])) as Record<string, unknown>[];
  const vistos = new Set<number>();
  return lista
    .filter((c) => c.ativo !== false && c.id && c.nome)
    .map((c) => ({ id: Number(c.id), nome: nomeBonito(String(c.nome)) }))
    .filter((c) => !vistos.has(c.id) && vistos.add(c.id))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}
