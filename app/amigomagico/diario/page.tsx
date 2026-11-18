import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { professoraLogada } from "@/lib/amigomagico-acesso";
import { Diario } from "./diario";
import "./diario.css";

const caveat = localFont({ src: "../../../lib/fontes/arquivos/caveat-600-700.woff2", weight: "600 700", variable: "--dd-titulo", display: "swap" });
const mao = localFont({ src: "../../../lib/fontes/arquivos/patrick-hand-400.woff2", weight: "400", variable: "--dd-mao", display: "swap" });

export const metadata: Metadata = {
  title: "Diário da formatura · Grupo V",
  description: "Registro das professoras, por aluno, para a formatura do Grupo V.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#1E2C78", width: "device-width", initialScale: 1, viewportFit: "cover" };

/**
 * Diário da formatura do Grupo V (18/12/2026, "Meu Mundo da Imaginação"). Endereço: www.escolaamadeus.com/amigomagico/diario
 * (o menu do kit leva até aqui). Só para quem entrou no kit (o login das professoras, em /amigomagico). A professora escolhe a turma, o aluno e registra numa conversa:
 * texto, foto e áudio. A escola acompanha e baixa tudo no admin (Campanhas → Diário da formatura do Grupo V).
 */
export const dynamic = "force-dynamic";

export default async function DiarioPage() {
  if (!(await professoraLogada())) redirect("/amigomagico?para=diario");
  return (
    <div className={`${caveat.variable} ${mao.variable} dd-mesa`}>
      <Suspense>
        <Diario />
      </Suspense>
    </div>
  );
}
