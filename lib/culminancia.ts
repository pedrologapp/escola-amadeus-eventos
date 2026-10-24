/**
 * Projeto de culminância do Arboria (22/10/2026): os painéis das salas.
 * Do Maternal II ao 5º ano cada série ficou com uma inteligência (escolhida no admin);
 * do 6º ao 9º ano o tema são as 8 casas. Cores oficiais das casas (Sistema Arboria).
 */

export const BUCKET_CULMINANCIA = "culminancia";
export const URL_CULMINANCIA = "https://eventos.escolaamadeus.com/culminancia";

/** Um outdoor da sala, com o tamanho em centímetros. */
export interface Outdoor {
  descricao: string;
  largura: number | null;
  altura: number | null;
}

/** Limpa a lista que vem do formulário (até 8 outdoors, medidas de 1 a 2000 cm). */
export function limparOutdoors(v: unknown): Outdoor[] {
  if (!Array.isArray(v)) return [];
  // aceita decimais (ex.: 197,5 cm): guarda com até 2 casas, sem arredondar para inteiro
  const cm = (n: unknown) => { const x = Number(String(n ?? "").replace(",", ".")); return Number.isFinite(x) && x > 0 && x <= 2000 ? Math.round(x * 100) / 100 : null; };
  return v.slice(0, 8).map((o) => ({ descricao: String(o?.descricao ?? "").trim().slice(0, 120), largura: cm(o?.largura), altura: cm(o?.altura) }))
    .filter((o) => o.descricao || o.largura || o.altura);
}

export type Chave = "ling" | "log" | "esp" | "mus" | "cor" | "nat" | "inter" | "intra";

export const INTELIGENCIAS: Record<Chave, { nome: string; casa: string; cor: string }> = {
  ling: { nome: "Linguística", casa: "Linguísticos", cor: "#1E3A8A" },
  log: { nome: "Lógico-Matemática", casa: "Lógicos-Matemáticos", cor: "#047857" },
  esp: { nome: "Espacial", casa: "Espaciais", cor: "#7C3AED" },
  mus: { nome: "Musical", casa: "Musicais", cor: "#7F1D1D" },
  cor: { nome: "Corporal-Cinestésica", casa: "Corporais-Cinestésicos", cor: "#B8860B" },
  nat: { nome: "Naturalista", casa: "Naturalistas", cor: "#78350F" },
  inter: { nome: "Interpessoal", casa: "Interpessoais", cor: "#0891B2" },
  intra: { nome: "Intrapessoal", casa: "Intrapessoais", cor: "#EA580C" },
};
export const CHAVES = Object.keys(INTELIGENCIAS) as Chave[];

export interface Frente {
  chave: string;
  titulo: string;
  segmento: "Educação Infantil" | "Fundamental I" | "Fundamental II";
  /** Nas casas a inteligência é a da casa; nas séries vem do banco. */
  casa?: Chave;
}

const serie = (chave: string, titulo: string, segmento: Frente["segmento"]): Frente => ({ chave, titulo, segmento });

export const FRENTES: Frente[] = [
  serie("maternal-ii", "Maternal II", "Educação Infantil"),
  serie("maternal-iii", "Maternal III", "Educação Infantil"),
  serie("grupo-iv", "Grupo IV", "Educação Infantil"),
  serie("grupo-v", "Grupo V", "Educação Infantil"),
  serie("1-ano", "1º ano", "Fundamental I"),
  serie("2-ano", "2º ano", "Fundamental I"),
  serie("3-ano", "3º ano", "Fundamental I"),
  serie("4-ano", "4º ano", "Fundamental I"),
  serie("5-ano", "5º ano", "Fundamental I"),
  ...CHAVES.map((k): Frente => ({ chave: `casa-${k}`, titulo: `Casa dos ${INTELIGENCIAS[k].casa}`, segmento: "Fundamental II", casa: k })),
];

export const frentePorChave = (chave: string) => FRENTES.find((f) => f.chave === chave) ?? null;

export const ehChave = (v: unknown): v is Chave => typeof v === "string" && v in INTELIGENCIAS;
