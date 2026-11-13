import QRCode from "qrcode";
import { notFound } from "next/navigation";
import localFont from "next/font/local";
import { Telao } from "@/app/admin/(authed)/arboria-experiencia/telao/telao";
import { chaveTelaoValida } from "@/lib/arboria-telao-chave";

const serif = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/instrument-serif-400-italic.woff2", weight: "400", style: "italic" }, { path: "../../../../lib/fontes/arquivos/instrument-serif-400.woff2", weight: "400", style: "normal" }], variable: "--f-serif" }); // Instrument Serif, guardada aqui (antes vinha do Google na publicação)
const tight = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/inter-tight-500-800.woff2", weight: "500 800", style: "normal" }], variable: "--f-tight" }); // Inter Tight, guardada aqui (antes vinha do Google na publicação)
const mono = localFont({ src: [{ path: "../../../../lib/fontes/arquivos/jetbrains-mono-600.woff2", weight: "600", style: "normal" }], variable: "--f-mono" }); // JetBrains Mono, guardada aqui (antes vinha do Google na publicação)

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
