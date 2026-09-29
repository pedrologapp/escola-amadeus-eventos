import type { Metadata } from "next";

import EmBreve from "@/components/em-breve";
import { METADATA_EM_BREVE, PAGINAS_LIBERADAS } from "@/lib/liberacao";

import FolderCliente from "../folder/folder-cliente";

/**
 * Folder digital SEM valores (29/09/2026): é o que o público vê pelo portal
 * (www.escolaamadeus.com) e pelo QR da TV. No lugar do "Investimento 2027",
 * um convite para pedir os valores à escola pelo WhatsApp. O /folder com os
 * valores continua existindo para a equipe mandar a quem pedir.
 */
const METADATA_CONHECA: Metadata = {
  title: "O que nós somos! · Centro Educacional Amadeus",
  description: "Conheça o Amadeus em cinco minutos: as etapas, o novo material, os projetos, os esportes e os espaços.",
  openGraph: {
    title: "O que nós somos! · Centro Educacional Amadeus",
    description: "Trinta anos de escola em um folder digital. O Amadeus por dentro, etapa por etapa.",
    type: "website",
  },
};

export const metadata: Metadata = PAGINAS_LIBERADAS ? METADATA_CONHECA : METADATA_EM_BREVE;

export const revalidate = 3600;

export default function ConhecaPage() {
  if (!PAGINAS_LIBERADAS) return <EmBreve />;
  return <FolderCliente semValores />;
}
