/**
 * Cartaz de evento (admin → Eventos → Criar cartaz). Tipos e escolhas
 * compartilhados entre a tela (client) e a rota que desenha a imagem
 * (/api/eventos/cartaz). Os FATOS (data, local, valor) vêm do cadastro do
 * evento; a IA só propõe texto e composição — nunca inventa data ou preço.
 */

export const FORMATOS = {
  story: { rotulo: "Story / status", detalhe: "1080 × 1920 · Instagram e WhatsApp", w: 1080, h: 1920 },
  feed: { rotulo: "Feed", detalhe: "1080 × 1350 · Instagram", w: 1080, h: 1350 },
  quadrado: { rotulo: "Quadrado", detalhe: "1080 × 1080 · grupos de WhatsApp", w: 1080, h: 1080 },
  a4: { rotulo: "A4 para imprimir", detalhe: "mural e portaria", w: 1240, h: 1754 },
} as const;
export type Formato = keyof typeof FORMATOS;

export const ESTILOS = {
  noite: { rotulo: "Azul da escola", fundo: "#083078", texto: "#FFFFFF", titulo: "#FFFFFF", destaque: "#FFB000", suave: "rgba(255,255,255,.78)" },
  creme: { rotulo: "Creme e dourado", fundo: "#FAF7F0", texto: "#17223D", titulo: "#083078", destaque: "#B9862F", suave: "#5A6478" },
  dourado: { rotulo: "Dourado", fundo: "#FFB000", texto: "#17223D", titulo: "#083078", destaque: "#083078", suave: "#3A3F4E" },
} as const;
export type Estilo = keyof typeof ESTILOS;

export const LAYOUTS = {
  "foto-topo": "Foto em cima, texto embaixo",
  "foto-fundo": "Foto de fundo inteira",
  "foto-lado": "Foto de um lado, texto do outro",
  "sem-foto": "Só texto, tipográfico",
} as const;
export type Layout = keyof typeof LAYOUTS;

export type Detalhe = "conciso" | "detalhado";

export interface EspecCartaz {
  formato: Formato;
  estilo: Estilo;
  layout: Layout;
  foco: "center" | "top" | "bottom";
  detalhe: Detalhe;
  titulo: string;
  chamada: string;
  destaques: string[];
  // fatos do cadastro
  data: string; // "Quinta-feira, 15 de outubro"
  hora: string | null; // "8h às 12h"
  local: string | null;
  preco: string | null; // "A partir de R$ 80,00"
  link: string | null; // eventos.escolaamadeus.com/eventos/slug
  foto: string | null; // URL pública
}

export interface Proposta extends Pick<EspecCartaz, "estilo" | "layout" | "foco" | "titulo" | "chamada" | "destaques"> {
  nome: string;
  porque: string;
}

/** Codifica a especificação para a URL da imagem (sem dados pessoais; só o evento). */
export function codificar(e: EspecCartaz): string {
  const json = JSON.stringify(e);
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodificar(s: string): EspecCartaz | null {
  try {
    const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(Buffer.from(b64, "base64").toString("utf8")) as EspecCartaz;
  } catch {
    return null;
  }
}
