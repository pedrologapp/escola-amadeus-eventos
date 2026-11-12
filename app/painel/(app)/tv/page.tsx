import { ehEquipeTv } from "./equipe";
import { ConteudoTv } from "./conteudo";

/**
 * Gerenciador da TV no painel novo (admin.escolaamadeus.com/tv, Pedro 12/11/2026): a TV ao vivo em cima, a fila
 * (a ordem em que as telas passam), o roteiro em cartões separados por função e o editor do cartão escolhido do lado.
 * A escola preenche o conteúdo e liga/desliga; ordem e tempo só a equipe Arboria (./equipe.ts).
 * Usa as mesmas tabelas do gerenciador antigo (app/admin/(authed)/comunicacao/tv), que continua valendo.
 */
export const metadata = { title: "TV · Painel Amadeus" };
export const dynamic = "force-dynamic";

export default async function PaginaTv() {
  return <ConteudoTv equipe={await ehEquipeTv()} />;
}

