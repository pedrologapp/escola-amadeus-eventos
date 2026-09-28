/**
 * Cartaz no estilo "Caderno" — o mesmo dos encartes da Experiência Amadeus
 * (docs/EventoRematricula/Encarte_Experiencia_Amadeus_Caderno.html): folha
 * pautada com margem e furos, post-its com fita para data e hora, pílulas do
 * público, cartões tipo polaroid, bilhete "Onde é" com QR.
 *
 * A IA lê a foto do evento (muitas vezes já é um material com as
 * informações) e o cadastro, e preenche estes campos; a escola revisa.
 */
import type { Formato } from "@/lib/cartaz";

export interface Nota { v: string; r: string }
export interface Valor { rotulo: string; valor: string }

export interface EspecCaderno {
  formato: Formato;
  etiqueta: string; // "CONVITE", "EVENTO", "PASSEIO"...
  titulo: string; // primeira parte do título
  tituloMarca: string; // parte grifada de amarelo (pode ser vazia)
  chamada: string;
  chamadaForte: string; // continuação em negrito
  notas: Nota[]; // até 2 post-its: data e hora/local
  publicoTitulo: string; // "Para as famílias de"
  publico: string[]; // pílulas
  itens: string[]; // o que tem / atividades (cartões com legenda)
  valores: Valor[];
  ondeTitulo: string; // "Viva Park"
  ondeLinhas: string[];
  qrRotulo: string; // "INSCRIÇÃO"
  link: string | null;
  foto: string | null; // só se for FOTO de verdade (não flyer)
  legendaFoto: string;
}

export function codificarCaderno(e: EspecCaderno): string {
  const json = JSON.stringify(e);
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodificarCaderno(s: string): EspecCaderno | null {
  try {
    return JSON.parse(Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8")) as EspecCaderno;
  } catch {
    return null;
  }
}
