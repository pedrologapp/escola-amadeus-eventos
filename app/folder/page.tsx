import type { Metadata } from "next";

import EmBreve from "@/components/em-breve";
import { METADATA_EM_BREVE, PAGINAS_LIBERADAS } from "@/lib/liberacao";

import FolderCliente from "./folder-cliente";

const METADATA_FOLDER: Metadata = {
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

/** Fechado até o anúncio na reunião: ver lib/liberacao.ts. */
export const metadata: Metadata = PAGINAS_LIBERADAS ? METADATA_FOLDER : METADATA_EM_BREVE;

/** Conteúdo institucional, sem dado dinâmico. */
export const revalidate = 3600;

export default function FolderPage() {
  if (!PAGINAS_LIBERADAS) return <EmBreve />;
  return <FolderCliente />;
}
