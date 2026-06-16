import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fardamento · Escola Amadeus",
  description: "Registre seu interesse no fardamento.",
};

export default function FardamentoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-screen bg-amadeus-blue-50/30">{children}</div>;
}
