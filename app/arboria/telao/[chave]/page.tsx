import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { Telao } from "@/app/admin/(authed)/arboria-experiencia/telao/telao";
import { chaveTelaoValida } from "@/lib/arboria-telao-chave";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--f-serif" });
const tight = Inter_Tight({ subsets: ["latin"], weight: ["500", "700", "800"], variable: "--f-tight" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["600"], variable: "--f-mono" });

export const metadata = { title: "Telão · Experiência Arboria", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * O mesmo telão do admin (/admin/arboria-experiencia/telao), por um link público:
 * abre na TV de qualquer computador sem login. Só funciona com a chave certa no
 * endereço (lib/arboria-telao-chave.ts); o link fica no admin, aba Apresentações.
 */
export default async function TelaoPublicoPage({ params }: { params: Promise<{ chave: string }> }) {
  const { chave } = await params;
  if (!chaveTelaoValida(chave)) notFound();
  const qr = await QRCode.toString("https://eventos.escolaamadeus.com/arboria", { type: "svg", margin: 1, color: { dark: "#0b1112", light: "#FFFFFF" } });
  return <div className={`${serif.variable} ${tight.variable} ${mono.variable}`}><Telao qr={qr} chave={chave} /></div>;
}
