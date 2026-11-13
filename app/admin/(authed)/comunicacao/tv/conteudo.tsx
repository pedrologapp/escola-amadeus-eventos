import { BLOCOS, MODO_EVENTO, hojeLocal, lerItensEBlocos, lerTelas, modoEventoDe, roteiroPublico, type BlocoTv } from "@/lib/tv";
import { Gerenciador } from "./gerenciador";

/**
 * Lê o que a TV tem hoje e monta o gerenciador (usado pela página e pelo teste no PC).
 * As telas criadas entram na mesma lista dos blocos como "tela:<id>", na ordem em que passam.
 */
export async function ConteudoTv({ equipe }: { equipe: boolean }) {
  const [{ itens, blocos }, telas, roteiro] = await Promise.all([lerItensEBlocos(), lerTelas(), roteiroPublico()]);
  // quantas telas cada bloco tem hoje na TV da recepção (0 = não passa hoje); a tela criada conta pela chave
  const hojePassa: Record<string, number> = {};
  for (const c of roteiro.cenas) {
    const k = c.id === "tela" ? c.chave : c.id;
    hojePassa[k] = (hojePassa[k] ?? 0) + 1;
  }
  // com as telas criadas, a formatura fixa virou uma tela (formato celebração)
  const lista: BlocoTv[] = [
    ...(telas ? blocos.filter((b) => b.id !== "formatura") : blocos).filter((b) => b.id !== MODO_EVENTO),
    ...(telas ?? []).map((t) => ({ id: `tela:${t.id}`, ativo: t.ativo, ordem: t.ordem, segundos: t.segundos })),
  ].sort((a, b) => a.ordem - b.ordem);
  return (
    <Gerenciador
      itens={itens}
      blocos={lista}
      telas={telas ?? []}
      podeCriar={telas !== null}
      nomes={BLOCOS}
      hoje={hojeLocal()}
      hojePassa={hojePassa}
      equipe={equipe}
      modoEvento={modoEventoDe(blocos)}
    />
  );
}
