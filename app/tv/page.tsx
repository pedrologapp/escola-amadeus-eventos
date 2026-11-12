import { roteiroPublico } from "@/lib/tv";
import { PlayerTv } from "../admin/tv/player";

/**
 * TV Amadeus aberta (www.escolaamadeus.com/tv, Pedro 12/11/2026): a TV da recepção abre direto, sem login,
 * já ocupando a tela inteira. É o mesmo roteiro do admin, mas a versão pública: sem nome de aluno
 * (a cena dos aniversariantes fica de fora, como no Portal da Família), porque o endereço é aberto.
 */
export const metadata = { title: "TV Amadeus", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function TvPublica() {
  const roteiro = await roteiroPublico();
  return <PlayerTv roteiro={roteiro} previa={false} />;
}
