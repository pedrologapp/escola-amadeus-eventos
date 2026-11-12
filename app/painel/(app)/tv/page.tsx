import { BLOCOS, hojeLocal, lerItensEBlocos, roteiroPublico } from "@/lib/tv";
import { Gerenciador } from "./gerenciador";

/**
 * Gerenciador da TV no painel novo (admin.escolaamadeus.com/tv, Pedro 12/11/2026): uma tela só, com a TV ao vivo
 * em cima, o roteiro em cartões (arrasta para mudar a ordem) e o editor do cartão escolhido do lado.
 * Usa as mesmas tabelas e ações do gerenciador antigo (app/admin/(authed)/comunicacao/tv), que continua valendo.
 */
export const metadata = { title: "TV · Painel Amadeus" };
export const dynamic = "force-dynamic";

export default async function PaginaTv() {
  const [{ itens, blocos }, roteiro] = await Promise.all([lerItensEBlocos(), roteiroPublico()]);
  // quantas telas cada bloco tem hoje na TV da recepção (0 = não passa hoje)
  const hojePassa: Record<string, number> = {};
  for (const c of roteiro.cenas) hojePassa[c.id] = (hojePassa[c.id] ?? 0) + 1;
  return <Gerenciador itens={itens} blocos={blocos} nomes={BLOCOS} hoje={hojeLocal()} hojePassa={hojePassa} />;
}
