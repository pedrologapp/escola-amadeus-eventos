import type { Metadata } from "next";

/**
 * O folder digital (/folder) e a página do Geekie (/geekie) ficam fechados
 * até o anúncio na Reunião de Abertura das Matrículas 2027 (26/09/2026).
 * O QR do encarte leva para o folder, e o nome do material só pode aparecer
 * depois que a diretora anunciar no palco.
 *
 * Para liberar: trocar para true e publicar.
 */
export const PAGINAS_LIBERADAS = false;

/** Título e prévia neutros, para o link no WhatsApp não entregar o anúncio. */
export const METADATA_EM_BREVE: Metadata = {
  title: "Em breve",
  description: "Esta página será liberada em breve.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Em breve",
    description: "Esta página será liberada em breve.",
    type: "website",
  },
};
