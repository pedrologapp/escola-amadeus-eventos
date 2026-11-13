import QRCode from "qrcode";
import localFont from "next/font/local";
import { Telao } from "./telao";

// as letras da apresentação Parte 1 (o vídeo), para a tela do QR continuar no mesmo estilo
const serif = localFont({ src: [{ path: "../../../../../lib/fontes/arquivos/instrument-serif-400-italic.woff2", weight: "400", style: "italic" }, { path: "../../../../../lib/fontes/arquivos/instrument-serif-400.woff2", weight: "400", style: "normal" }], variable: "--f-serif" }); // Instrument Serif, guardada aqui (antes vinha do Google na publicação)
const tight = localFont({ src: [{ path: "../../../../../lib/fontes/arquivos/inter-tight-500-800.woff2", weight: "500 800", style: "normal" }], variable: "--f-tight" }); // Inter Tight, guardada aqui (antes vinha do Google na publicação)
const mono = localFont({ src: [{ path: "../../../../../lib/fontes/arquivos/jetbrains-mono-600.woff2", weight: "600", style: "normal" }], variable: "--f-mono" }); // JetBrains Mono, guardada aqui (antes vinha do Google na publicação)

export const metadata = { title: "Telão · Experiência Arboria" };
export const dynamic = "force-dynamic";

/**
 * A TV da sala na Experiência Amadeus. Fica aberta na TV (logada no admin):
 * "Começar reunião" marca a hora e toca a apresentação; no fim vem o QR real com a contagem;
 * "Liberar as séries" abre os trailers nos celulares; "Encerrar" agradece.
 */
export default async function TelaoPage() {
  const qr = await QRCode.toString("https://eventos.escolaamadeus.com/arboria", { type: "svg", margin: 1, color: { dark: "#0b1112", light: "#FFFFFF" } });
  return <div className={`${serif.variable} ${tight.variable} ${mono.variable}`}><Telao qr={qr} /></div>;
}
