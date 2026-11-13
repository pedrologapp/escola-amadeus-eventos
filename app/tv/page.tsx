import { roteiroDoDia } from "@/lib/tv";
import { PlayerTv } from "../admin/tv/player";

/**
 * TV Amadeus aberta (www.escolaamadeus.com/tv, Pedro 12/11/2026): a TV da recepção abre direto, sem login,
 * já ocupando a tela inteira.
 * (12/11/2026, à noite) Pedro: "deixe com os aniversariantes por enquanto, vou ajustar isso depois". A recepção passa
 * o roteiro completo, com os aniversariantes (nome e turma), mesmo o endereço sendo aberto. Pendente: trocar por um
 * link com chave só para a TV da recepção. O Portal da Família (escolaamadeus.com) continua sem nomes (roteiroPublico).
 */
export const metadata = { title: "TV Amadeus", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TvPublica() {
  const roteiro = await roteiroDoDia();
  return <PlayerTv roteiro={roteiro} previa={false} />;
}
