import { NextResponse } from "next/server";

/**
 * Link curto e legível para as mensagens do WhatsApp ("escolaamadeus.com/comochegar"):
 * os pais desconfiam de link comprido que não sabem para onde vai. Abre a escola no Google Maps.
 */
const MAPA = "https://www.google.com/maps/search/?api=1&query=Centro+Educacional+Amadeus+Av.+Benedito+Santana+09+S%C3%A3o+Gon%C3%A7alo+do+Amarante";

export function GET() {
  return NextResponse.redirect(MAPA, 302);
}
