import { BLOCOS, hojeLocal, lerItensEBlocos, roteiroPublico } from "@/lib/tv";
import { Gerenciador } from "./gerenciador";

/** Lê o que a TV tem hoje e monta o gerenciador (usado pela página e pelo teste no PC). */
export async function ConteudoTv({ equipe }: { equipe: boolean }) {
  const [{ itens, blocos }, roteiro] = await Promise.all([lerItensEBlocos(), roteiroPublico()]);
  // quantas telas cada bloco tem hoje na TV da recepção (0 = não passa hoje)
  const hojePassa: Record<string, number> = {};
  for (const c of roteiro.cenas) hojePassa[c.id] = (hojePassa[c.id] ?? 0) + 1;
  return <Gerenciador itens={itens} blocos={blocos} nomes={BLOCOS} hoje={hojeLocal()} hojePassa={hojePassa} equipe={equipe} />;
}
