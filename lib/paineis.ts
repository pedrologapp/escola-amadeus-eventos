/**
 * Painéis decorativos de evento (29/09/2026). Diferente do encarte (que
 * informa), o painel DECORA: quase tudo é imagem, e o texto é só o nome do
 * evento em destaque. Montados com as peças originais da identidade visual
 * (kit da agência Hillary: manchas, rabiscos, sol, personagens, material
 * escolar), as fontes Ralton Black e Scrib Sans e a paleta do manual.
 *
 * Cada composição tem três arranjos — largo, alto e quadrado — e escolhe o
 * que combina com a medida pedida. Camada: a = nº da peça (Ativo N do kit),
 * x/y = centro em fração da largura/altura, s = largura em fração do MENOR
 * lado, r = giro em graus, o = opacidade, fx = espelhar. z = zona do texto
 * [x, y, largura, altura] em fração do painel.
 *
 * Peças em public/marca/pecas (ativo-N.webp para a tela, ativo-N-hd.webp
 * para a gráfica), geradas por scripts/gerar-pecas-painel.cjs.
 */

import PROPORCOES from "@/public/marca/pecas/proporcoes.json";

export const PROPORCAO: Record<number, number> = PROPORCOES as Record<string, number> as unknown as Record<number, number>;
export const pecaUrl = (n: number, hd = false) => `/marca/pecas/ativo-${n}${hd ? "-hd" : ""}.webp`;
export const MARCA_30 = "/folder/marca-30-anos.png";

export interface Camada { a: number; x: number; y: number; s: number; r?: number; o?: number; fx?: boolean }
export interface Arranjo { z: [number, number, number, number]; c: Camada[] }
export type Fundo =
  | { tipo: "linear"; angulo: number; cores: [string, number][] }
  | { tipo: "radial"; cx: number; cy: number; cores: [string, number][] }
  | { tipo: "liso"; cor: string };

export interface Composicao {
  id: string;
  nome: string;
  uso: string;
  fundo: Fundo;
  grade?: boolean; // quadriculado de caderno (peça 21) ao fundo
  placa?: number; // peça atrás do texto
  marca30?: boolean; // selo dos 30 anos no lugar do logo
  texto: { l1: string; dest: string; l3: string; logo: number }; // logo: nº da peça (0 = sem)
  largo: Arranjo;
  alto: Arranjo;
  quad: Arranjo;
}

export const COMPOSICOES: Composicao[] = [
  {
    id: "patio", nome: "Pátio Amadeus", uso: "Institucional, reuniões, eventos da escola toda. É o estilo dos painéis da entrada e do pátio.",
    fundo: { tipo: "linear", angulo: 135, cores: [["#0D55B0", 0], ["#0A438F", 0.45], ["#06306F", 1]] },
    texto: { l1: "#F8F3F0", dest: "#FCB000", l3: "#F8F3F0", logo: 8 },
    largo: { z: [0.47, 0.1, 0.46, 0.8], c: [
      { a: 40, x: 0.12, y: 0.22, s: 1.35, o: 0.95 }, { a: 31, x: 0.95, y: 0.9, s: 1.05, o: 0.9 }, { a: 29, x: 0.02, y: 1, s: 0.75, o: 0.6 },
      { a: 28, x: 0.14, y: 0.38, s: 1.05 }, { a: 28, x: 0.92, y: 0.78, s: 0.9, r: 180 }, { a: 18, x: 0.87, y: 0.2, s: 0.22 }, { a: 17, x: 0.33, y: 0.74, s: 0.3 } ] },
    alto: { z: [0.08, 0.2, 0.84, 0.56], c: [
      { a: 40, x: 0.1, y: 0.1, s: 1.2, o: 0.95 }, { a: 31, x: 0.95, y: 0.92, s: 1.1, o: 0.9 }, { a: 28, x: 0.3, y: 0.06, s: 1.1, r: 15 },
      { a: 28, x: 0.75, y: 0.88, s: 1, r: 190 }, { a: 18, x: 0.8, y: 0.16, s: 0.3 }, { a: 17, x: 0.25, y: 0.84, s: 0.38 } ] },
    quad: { z: [0.12, 0.14, 0.76, 0.72], c: [
      { a: 40, x: 0.05, y: 0.1, s: 0.9, o: 0.95 }, { a: 31, x: 0.98, y: 0.95, s: 0.85, o: 0.9 }, { a: 28, x: 0.2, y: 0.2, s: 0.8 },
      { a: 28, x: 0.85, y: 0.85, s: 0.7, r: 180 }, { a: 18, x: 0.88, y: 0.12, s: 0.2 } ] },
  },
  {
    id: "infantil", nome: "Infantil Ensolarado", uso: "Educação Infantil e Fundamental 1: Dia das Crianças, festas, boas-vindas.",
    fundo: { tipo: "linear", angulo: 160, cores: [["#2AA8E6", 0], ["#1C8FD8", 0.5], ["#1373C4", 1]] },
    texto: { l1: "#F8F3F0", dest: "#FFC70A", l3: "#F8F3F0", logo: 8 },
    largo: { z: [0.3, 0.12, 0.42, 0.76], c: [
      { a: 30, x: 0.02, y: 0.15, s: 1.1, o: 0.55 }, { a: 41, x: 0.98, y: 1, s: 1.1, o: 0.6 }, { a: 28, x: 0.15, y: 0.3, s: 1 },
      { a: 38, x: 0.88, y: 0.22, s: 0.42 }, { a: 10, x: 0.13, y: 0.72, s: 0.5 }, { a: 12, x: 0.83, y: 0.78, s: 0.28 }, { a: 11, x: 0.95, y: 0.62, s: 0.22 }, { a: 17, x: 0.72, y: 0.12, s: 0.26 } ] },
    alto: { z: [0.08, 0.22, 0.84, 0.44], c: [
      { a: 30, x: 0.05, y: 0.08, s: 1.1, o: 0.55 }, { a: 41, x: 1, y: 0.98, s: 1.2, o: 0.6 }, { a: 38, x: 0.78, y: 0.1, s: 0.45 },
      { a: 10, x: 0.3, y: 0.84, s: 0.62 }, { a: 12, x: 0.8, y: 0.82, s: 0.35 }, { a: 28, x: 0.2, y: 0.14, s: 0.9, r: 10 }, { a: 17, x: 0.78, y: 0.66, s: 0.3 } ] },
    quad: { z: [0.1, 0.12, 0.62, 0.56], c: [
      { a: 30, x: 0.05, y: 0.12, s: 0.9, o: 0.55 }, { a: 41, x: 1, y: 0.98, s: 0.9, o: 0.6 }, { a: 38, x: 0.84, y: 0.18, s: 0.34 },
      { a: 10, x: 0.2, y: 0.8, s: 0.42 }, { a: 12, x: 0.82, y: 0.8, s: 0.26 }, { a: 28, x: 0.5, y: 0.95, s: 0.7 } ] },
  },
  {
    id: "amarelo", nome: "Festa Amarela", uso: "Celebrações, aniversário da escola, formaturas do infantil, festas de encerramento.",
    fundo: { tipo: "linear", angulo: 150, cores: [["#FFC70A", 0], ["#FCB000", 0.6], ["#F6A300", 1]] },
    texto: { l1: "#06306F", dest: "#06306F", l3: "#0059B1", logo: 1 },
    largo: { z: [0.28, 0.1, 0.44, 0.8], c: [
      { a: 37, x: 0.06, y: 0.22, s: 1.15, o: 0.95 }, { a: 42, x: 0.95, y: 0.88, s: 1.05 }, { a: 12, x: 0.9, y: 0.3, s: 0.36 },
      { a: 13, x: 0.08, y: 0.82, s: 0.3 }, { a: 18, x: 0.2, y: 0.16, s: 0.2 }, { a: 14, x: 0.78, y: 0.14, s: 0.16 }, { a: 19, x: 0.75, y: 0.75, s: 0.22 } ] },
    alto: { z: [0.08, 0.2, 0.84, 0.52], c: [
      { a: 37, x: 0.1, y: 0.08, s: 1.2, o: 0.95 }, { a: 42, x: 0.95, y: 0.95, s: 1.2 }, { a: 12, x: 0.8, y: 0.8, s: 0.42 },
      { a: 13, x: 0.18, y: 0.86, s: 0.36 }, { a: 18, x: 0.82, y: 0.1, s: 0.28 }, { a: 14, x: 0.2, y: 0.72, s: 0.2 } ] },
    quad: { z: [0.14, 0.16, 0.72, 0.62], c: [
      { a: 37, x: 0.05, y: 0.1, s: 0.9, o: 0.95 }, { a: 42, x: 0.98, y: 0.95, s: 0.85 }, { a: 12, x: 0.86, y: 0.22, s: 0.3 },
      { a: 13, x: 0.12, y: 0.86, s: 0.26 }, { a: 18, x: 0.2, y: 0.14, s: 0.16 } ] },
  },
  {
    id: "sala", nome: "Sala de Aula", uso: "Feira de conhecimento, volta às aulas, mostra cultural, olimpíadas.",
    fundo: { tipo: "liso", cor: "#F8F3F0" }, grade: true,
    texto: { l1: "#0059B1", dest: "#06306F", l3: "#0059B1", logo: 1 },
    largo: { z: [0.3, 0.12, 0.42, 0.76], c: [
      { a: 41, x: 0.98, y: 0.12, s: 1, o: 0.95 }, { a: 36, x: 0.03, y: 0.92, s: 0.95 }, { a: 22, x: 0.14, y: 0.3, s: 0.38, r: -8 },
      { a: 27, x: 0.17, y: 0.72, s: 0.26, r: 8 }, { a: 23, x: 0.86, y: 0.66, s: 0.32, r: -18 }, { a: 25, x: 0.88, y: 0.3, s: 0.3 }, { a: 26, x: 0.74, y: 0.78, s: 0.09, r: 20 } ] },
    alto: { z: [0.08, 0.24, 0.84, 0.42], c: [
      { a: 41, x: 1, y: 0.05, s: 1.1, o: 0.95 }, { a: 36, x: 0, y: 0.98, s: 1.1 }, { a: 22, x: 0.24, y: 0.12, s: 0.45, r: -8 },
      { a: 27, x: 0.78, y: 0.8, s: 0.38, r: 8 }, { a: 23, x: 0.28, y: 0.82, s: 0.4, r: -20 }, { a: 25, x: 0.8, y: 0.14, s: 0.34 } ] },
    quad: { z: [0.14, 0.2, 0.72, 0.56], c: [
      { a: 41, x: 1, y: 0.06, s: 0.8, o: 0.95 }, { a: 36, x: 0, y: 0.98, s: 0.8 }, { a: 22, x: 0.14, y: 0.14, s: 0.28, r: -8 },
      { a: 23, x: 0.86, y: 0.82, s: 0.3, r: -18 }, { a: 25, x: 0.84, y: 0.16, s: 0.24 } ] },
  },
  {
    id: "faixa", nome: "Faixa Azul", uso: "Esporte, olimpíadas, datas cívicas, campanhas e avisos grandes.",
    fundo: { tipo: "linear", angulo: 135, cores: [["#0A7BFF", 0], ["#0070FF", 0.5], ["#0059B1", 1]] }, placa: 39,
    texto: { l1: "#F8F3F0", dest: "#FFC70A", l3: "#F8F3F0", logo: 8 },
    largo: { z: [0.24, 0.16, 0.52, 0.68], c: [
      { a: 33, x: 0.06, y: 0.9, s: 0.9, o: 0.8 }, { a: 35, x: 0.96, y: 0.12, s: 0.9, o: 0.55 }, { a: 14, x: 0.12, y: 0.22, s: 0.22 },
      { a: 19, x: 0.88, y: 0.74, s: 0.28 }, { a: 15, x: 0.95, y: 0.9, s: 0.2, r: 90 }, { a: 18, x: 0.1, y: 0.6, s: 0.18 } ] },
    alto: { z: [0.08, 0.28, 0.84, 0.4], c: [
      { a: 33, x: 0.1, y: 0.95, s: 1.1, o: 0.8 }, { a: 35, x: 0.9, y: 0.05, s: 1.1, o: 0.55 }, { a: 14, x: 0.22, y: 0.14, s: 0.28 },
      { a: 19, x: 0.78, y: 0.82, s: 0.34 }, { a: 18, x: 0.2, y: 0.78, s: 0.24 } ] },
    quad: { z: [0.12, 0.24, 0.76, 0.5], c: [
      { a: 33, x: 0.08, y: 0.95, s: 0.8, o: 0.8 }, { a: 35, x: 0.95, y: 0.06, s: 0.8, o: 0.55 }, { a: 14, x: 0.16, y: 0.14, s: 0.2 }, { a: 19, x: 0.84, y: 0.84, s: 0.24 } ] },
  },
  {
    id: "gala", nome: "Noite de Gala 30 Anos", uso: "Formatura do 9º ano, aniversário de 30 anos, noites de homenagem.",
    fundo: { tipo: "radial", cx: 0.5, cy: 0.4, cores: [["#0B3F8A", 0], ["#06306F", 0.45], ["#031B45", 1]] }, marca30: true,
    texto: { l1: "#FDE8A6", dest: "#FCB000", l3: "#F8F3F0", logo: 0 },
    largo: { z: [0.3, 0.1, 0.4, 0.8], c: [
      { a: 6, x: 0.08, y: 0.5, s: 1.05, o: 0.05 }, { a: 6, x: 0.92, y: 0.5, s: 1.05, o: 0.05 }, { a: 19, x: 0.14, y: 0.24, s: 0.26 },
      { a: 19, x: 0.86, y: 0.76, s: 0.26, fx: true }, { a: 15, x: 0.95, y: 0.2, s: 0.16, r: 90 }, { a: 15, x: 0.05, y: 0.8, s: 0.16, r: 90 }, { a: 17, x: 0.8, y: 0.24, s: 0.24 } ] },
    alto: { z: [0.1, 0.24, 0.8, 0.5], c: [
      { a: 6, x: 0.5, y: 0.06, s: 1.1, o: 0.05 }, { a: 6, x: 0.5, y: 0.96, s: 1.1, o: 0.05 }, { a: 19, x: 0.2, y: 0.14, s: 0.34 },
      { a: 19, x: 0.8, y: 0.86, s: 0.34, fx: true }, { a: 17, x: 0.78, y: 0.16, s: 0.3 } ] },
    quad: { z: [0.16, 0.16, 0.68, 0.66], c: [
      { a: 6, x: 0.05, y: 0.05, s: 0.8, o: 0.05 }, { a: 6, x: 0.95, y: 0.95, s: 0.8, o: 0.05 }, { a: 19, x: 0.14, y: 0.16, s: 0.22 }, { a: 19, x: 0.86, y: 0.84, s: 0.22, fx: true } ] },
  },
];

export const MEDIDAS: { rotulo: string; l: number; a: number }[] = [
  { rotulo: "3 × 1 m", l: 300, a: 100 },
  { rotulo: "2,5 × 1 m", l: 250, a: 100 },
  { rotulo: "2 × 1,5 m", l: 200, a: 150 },
  { rotulo: "1 × 1 m", l: 100, a: 100 },
  { rotulo: "0,8 × 2 m (banner)", l: 80, a: 200 },
  { rotulo: "A3 em pé", l: 29.7, a: 42 },
];

export const arranjoPara = (c: Composicao, l: number, a: number): Arranjo => (l >= a * 1.4 ? c.largo : a >= l * 1.4 ? c.alto : c.quad);
