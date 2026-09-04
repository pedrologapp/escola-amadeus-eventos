// As 8 Casas do Fundamental 2 (projeto Arboria) — as inteligências
// múltiplas de Gardner.
//
// As cores são as CORES REAIS DAS CAMISAS do desfile de 7 de setembro,
// tiradas de docs/Camisas_Desfile_7set2026.pdf. Não são decoração: é por
// elas que a confecção separa o pedido, então não troque sem o documento
// novo em mãos.
//
// A lista de alunos de cada casa está em docs/Arboria_As_Casas_29ago2026.pdf
// e entra no banco por scripts/importar-casas.mjs.

export const CASAS = [
  { nome: "Linguística", cor: "#1E3A8A" }, // azul-marinho
  { nome: "Lógico-Matemática", cor: "#047857" }, // verde
  { nome: "Espacial", cor: "#7C3AED" }, // roxo
  { nome: "Musical", cor: "#7F1D1D" }, // vinho
  { nome: "Corporal-Cinestésica", cor: "#B8860B" }, // dourado
  { nome: "Naturalista", cor: "#78350F" }, // marrom
  { nome: "Interpessoal", cor: "#0891B2" }, // ciano
  { nome: "Intrapessoal", cor: "#EA580C" }, // laranja
] as const;

export type NomeCasa = (typeof CASAS)[number]["nome"];

const PORNOME = new Map(CASAS.map((c) => [c.nome, c]));

export function casaPorNome(nome: string | null | undefined) {
  return nome ? PORNOME.get(nome as NomeCasa) : undefined;
}

/**
 * Ordem de exibição: alfabética pelo nome da casa.
 *
 * O PDF das camisas lista noutra ordem (a das cores), mas quem lê o
 * relatório procura a casa pelo nome — então ordena por nome.
 */
const ORDEM = [...CASAS].map((c) => c.nome).sort((a, b) => a.localeCompare(b, "pt-BR"));

export function ordemCasa(nome: string | null | undefined): number {
  const i = ORDEM.indexOf(nome as NomeCasa);
  return i === -1 ? 999 : i;
}

function rgb(hex: string) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ] as const;
}

/**
 * Versão clara da cor, para fundo de selo. Mistura com branco em vez de
 * usar a cor cheia: a lista é impressa, e oito faixas escuras por página
 * bebem tinta à toa.
 */
export function corSuave(hex: string, forca = 0.14): string {
  const [r, g, b] = rgb(hex);
  const mix = (v: number) => Math.round(v * forca + 255 * (1 - forca));
  return `#${[mix(r), mix(g), mix(b)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

function hex6(r: number, g: number, b: number) {
  return `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * A cor da casa escurecida o quanto baste para ser lida sobre o fundo
 * claro do selo (4,5:1).
 *
 * O dourado, o ciano e o laranja, na cor cheia, ficam em torno de 3:1
 * sobre o próprio tom claro — legível de longe, ruim de perto e péssimo
 * impresso. Escurecer só até passar preserva a identidade da casa; trocar
 * por cinza a perderia.
 */
export function corLegivel(hex: string, fundo: string): string {
  let [r, g, b] = rgb(hex);
  for (let i = 0; i < 12; i++) {
    if (contraste(hex6(r, g, b), fundo) >= 4.5) break;
    r *= 0.85;
    g *= 0.85;
    b *= 0.85;
  }
  return hex6(r, g, b);
}

/** Razão de contraste WCAG entre duas cores. */
export function contraste(a: string, b: string): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Luminância relativa (WCAG). */
function luminancia(hex: string): number {
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = rgb(hex);
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Preto ou branco por cima da cor cheia — o que der mais contraste.
 *
 * Medir contraste de verdade, e não "a cor é clara ou escura?": pela
 * aproximação por luminância, o dourado da Corporal-Cinestésica, o ciano
 * da Interpessoal e o laranja da Intrapessoal ficavam com texto branco a
 * 3,2–3,7:1, abaixo do mínimo legível. Com preto passam de 5:1.
 */
export function corTexto(hex: string): string {
  const l = luminancia(hex);
  const comBranco = 1.05 / (l + 0.05);
  const comPreto = (l + 0.05) / 0.05;
  return comPreto > comBranco ? "#1a1a1a" : "#ffffff";
}
