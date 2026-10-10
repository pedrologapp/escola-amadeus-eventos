import QRCode from "qrcode";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Telao } from "./telao";

// as letras da apresentação Parte 1 (o vídeo), para a tela do QR continuar no mesmo estilo
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--f-tight" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["600"], variable: "--f-mono" });

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
