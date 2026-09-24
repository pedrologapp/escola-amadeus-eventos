import type { Metadata } from "next";

import FolderCliente from "./folder-cliente";

export const metadata: Metadata = {
  title: "O que nós somos! · Centro Educacional Amadeus",
  description:
    "Conheça o Amadeus em cinco minutos: as etapas, o novo material, os projetos, os esportes, os espaços e os valores de 2027.",
  openGraph: {
    title: "O que nós somos! · Centro Educacional Amadeus",
    description:
      "Trinta anos de escola em um folder digital. O Amadeus por dentro, etapa por etapa.",
    type: "website",
  },
};

/** Conteúdo institucional, sem dado dinâmico. */
export const revalidate = 3600;

export default function FolderPage() {
  return <FolderCliente />;
}
