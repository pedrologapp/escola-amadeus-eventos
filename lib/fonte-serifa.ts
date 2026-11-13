import localFont from "next/font/local";

/** Fraunces dos títulos do painel novo; um lugar só, usado no painel e na Visão geral do admin.eventos. */
export const serifa = localFont({ src: [{ path: "./fontes/arquivos/fraunces-600-700.woff2", weight: "600 700", style: "normal" }], variable: "--font-serifa" }); // Fraunces, guardada aqui (antes vinha do Google na publicação)
