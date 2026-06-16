import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pesquisa de Clima Escolar · Escola Amadeus",
  description: "Sua voz faz a diferença. Pesquisa anônima.",
};

export default function EnqueteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-amadeus-blue-50/30">{children}</div>;
}
