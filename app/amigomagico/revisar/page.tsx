import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { redirect } from "next/navigation";
import { professoraLogada } from "@/lib/amigomagico-acesso";
import { Revisar } from "./revisar";
import "../diario/diario.css";
import "./revisar.css";

const caveat = localFont({ src: "../../../lib/fontes/arquivos/caveat-600-700.woff2", weight: "600 700", variable: "--dd-titulo", display: "swap" });
const mao = localFont({ src: "../../../lib/fontes/arquivos/patrick-hand-400.woff2", weight: "400", variable: "--dd-mao", display: "swap" });

export const metadata: Metadata = {
  title: "Revisar amigos · Grupo V",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1E2C78", width: "device-width", initialScale: 1, viewportFit: "cover" };
export const dynamic = "force-dynamic";

/**
 * Revisar amigos (formatura do Grupo V, 24/11/2026): as professoras conferem, por criança, o amigo mágico e o nome dele,
 * corrigem se preciso e dão "Está certo". Atrás do login do kit (o menu leva até aqui).
 */
export default async function RevisarPage() {
  if (!(await professoraLogada())) redirect("/amigomagico?para=revisar");
  return (
    <div className={`${caveat.variable} ${mao.variable} dd-mesa`}>
      <Revisar />
    </div>
  );
}
