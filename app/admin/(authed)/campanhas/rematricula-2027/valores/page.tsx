import Link from "next/link";
import { ArrowLeft, BookOpen, Info, Lock, TriangleAlert } from "lucide-react";
import { historicoDoAluno, listarAlunos, type AlunoBusca, type AnoDoAluno } from "@/lib/rematricula-2027-dados";
import { livroAVista, reais } from "@/lib/rematricula-2027";
import {
  ANOS_LETIVOS,
  NOME_SEGMENTO_CURTO,
  ORDEM_SEGMENTOS,
  PRECO_LIVRO,
  type AnoLetivo,
} from "@/lib/rematricula-historico";
import { AbasRematricula } from "../abas";
import { BuscaAluno } from "./busca-aluno";

/**
 * Tabela de valores da rematrícula, ano a ano: consulta da direção quando um
 * pai chega. Não vai para o pai. Os números estão em lib/rematricula-historico.ts.
 */
export const metadata = { title: "Tabela de valores · Rematrícula 2027" };
export const dynamic = "force-dynamic";

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

function Th({ children, destaque }: { children: React.ReactNode; destaque?: boolean }) {
  return <th className={`px-3 py-2 text-right font-semibold ${destaque ? "text-amadeus-blue" : ""}`}>{children}</th>;
}
function Td({ children, forte }: { children: React.ReactNode; forte?: boolean }) {
  return <td className={`px-3 py-2.5 text-right tabular-nums ${forte ? "font-extrabold text-amadeus-blue" : ""}`}>{children}</td>;
}

function CartaoAno({ a }: { a: AnoLetivo }) {
  const livroPromo = PRECO_LIVRO[a.ano - 1];
  const livroDepois = PRECO_LIVRO[a.ano];
  const noPrazo = a.mensalidadeNoPrazo ?? a.mensalidade;
  return (
    <section id={`ano-${a.ano}`} className="scroll-mt-24 rounded-2xl border border-border/60 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-extrabold text-amadeus-blue">Ano letivo {a.ano}</h2>
        <span className="text-sm text-muted-foreground">
          rematrícula feita em {a.ano - 1}
          {a.prazo ? <> · promoção até <b className="text-amadeus-blue">{a.prazo}</b></> : null}
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Segmento</th>
              {a.ano === 2027 ? (
                <>
                  <Th>Novato até {a.prazo?.slice(0, 5)}</Th>
                  <Th>Novato depois</Th>
                </>
              ) : (
                <Th>Mensalidade</Th>
              )}
              {a.livroNaMensalidade && livroPromo ? (
                <>
                  <Th>Livro até o prazo<br /><span className="normal-case">preço {a.ano - 1}</span></Th>
                  <Th>Livro depois<br /><span className="normal-case">preço {a.ano}</span></Th>
                  <Th destaque>Total no prazo</Th>
                  <Th destaque>Total depois</Th>
                </>
              ) : (
                <Th>Livro (à parte)<br /><span className="normal-case">preço {a.ano}</span></Th>
              )}
              {a.material && <Th>Material</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {ORDEM_SEGMENTOS.map((s) => (
              <tr key={s}>
                <td className="px-3 py-2.5 font-semibold">{NOME_SEGMENTO_CURTO[s]}</td>
                {a.ano === 2027 ? (
                  <>
                    <Td>{reais(noPrazo[s])}</Td>
                    <Td>{reais(a.mensalidade[s])}</Td>
                  </>
                ) : (
                  <Td>{reais(a.mensalidade[s])}</Td>
                )}
                {a.livroNaMensalidade && livroPromo ? (
                  <>
                    <Td>12x {reais(livroPromo[s])}<span className="block text-xs text-muted-foreground">à vista {reais(livroAVista(livroPromo[s]))}</span></Td>
                    <Td>12x {reais(livroDepois[s])}<span className="block text-xs text-muted-foreground">à vista {reais(livroAVista(livroDepois[s]))}</span></Td>
                    <Td forte>{reais(noPrazo[s] + livroPromo[s])}</Td>
                    <Td forte>{reais(a.mensalidade[s] + livroDepois[s])}</Td>
                  </>
                ) : (
                  <Td>12x {reais(livroDepois[s])}</Td>
                )}
                {a.material && <Td>{reais(a.material[s === "ef1" ? "ef1" : s === "ef2" ? "ef2" : "infantil"])}</Td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {a.fidelidade && (
        <p className="mt-3 text-sm">
          Com a <b>Mensalidade Fidelidade</b> (pagando até o dia 05), cada total cai <b>{reais(a.fidelidade)}</b>.
        </p>
      )}
      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {a.observacoes.map((o) => <li key={o}>{o}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Fonte: {a.fonte}.</p>
    </section>
  );
}

function HistoricoAluno({ aluno, anos }: { aluno: AlunoBusca; anos: AnoDoAluno[] }) {
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-white p-5">
      <p className="text-lg font-extrabold text-amadeus-blue">{aluno.nome}</p>
      <p className="text-sm text-muted-foreground">{aluno.turma}</p>
      {anos.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">Nenhuma mensalidade em 12 parcelas no Activesoft (anuidade ou outro parcelamento).</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Ano letivo</th>
                <th className="px-3 py-2">Série</th>
                <th className="px-3 py-2">Rematrícula lançada em</th>
                <th className="px-3 py-2">Condição</th>
                <th className="px-3 py-2 text-right">Mensalidade no boleto</th>
                <th className="px-3 py-2">Como se compõe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {anos.map((x) => (
                <tr key={x.ano}>
                  <td className="px-3 py-2.5 font-bold">
                    <a href={`#ano-${x.ano}`} className="text-amadeus-blue underline-offset-2 hover:underline">{x.ano}</a>
                  </td>
                  <td className="px-3 py-2.5">{x.serie}</td>
                  <td className="px-3 py-2.5">{x.geradoEm ? dataBr(x.geradoEm) : "—"}</td>
                  <td className="px-3 py-2.5">
                    {x.naPromocao === null ? (
                      <span className="text-muted-foreground">—</span>
                    ) : x.naPromocao ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">Na promoção</span>
                    ) : (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">Depois do prazo</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{reais(x.valor)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    {!x.temTabela
                      ? "ano sem tabela cadastrada"
                      : x.livro && x.base !== null
                        ? `${reais(x.base)} + livro ${reais(x.livro)} (preço ${x.livroDoAno})`
                        : x.base !== null
                          ? x.livroAParte ? "livro cobrado à parte" : "sem livro na mensalidade"
                          : "não fecha com a tabela, conferir"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 flex gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        A data é quando as parcelas foram lançadas no Activesoft, que nem sempre é o dia da rematrícula. Quando o livro está na mensalidade, a condição vem do preço do livro (preço do ano anterior = promoção), que é mais seguro que a data.
      </p>
    </div>
  );
}

export default async function ValoresPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  let alunos: AlunoBusca[] = [];
  let escolhido: AlunoBusca | null = null;
  let anos: AnoDoAluno[] = [];
  let erro: string | null = null;
  try {
    alunos = await listarAlunos();
    if (aluno && /^\d+$/.test(aluno)) {
      escolhido = alunos.find((a) => a.id === Number(aluno)) ?? null;
      if (escolhido) anos = await historicoDoAluno(escolhido.id);
    }
  } catch (e) {
    erro = (e as Error).message;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/campanhas" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Campanhas
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="valores" />

      <p className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amadeus-blue-50/70 px-3 py-1.5 text-xs font-bold text-amadeus-blue">
        <Lock className="size-3.5" /> Só para a equipe. Esta página não vai para o pai.
      </p>

      <div className="mt-4 rounded-2xl border border-border/60 bg-white p-5">
        <p className="flex items-center gap-2 font-bold text-amadeus-blue"><BookOpen className="size-4" /> Como funciona a promoção</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm">
          <li>A rematrícula de um ano letivo é feita no ano anterior. Ex.: a de <b>2027</b> é feita em <b>2026</b>.</li>
          <li>
            Quem fecha <b>até o fim de outubro</b> leva o livro pelo <b>preço do ano presente</b>. Quem fecha depois paga o preço do
            ano letivo novo.
          </li>
          <li>
            Ex.: rematrícula de 2026 do Fund. 1 feita em 20/10/2025 ficou com o livro a <b>{reais(PRECO_LIVRO[2025].ef1)}</b> (preço 2025);
            feita em 10/11/2025, a <b>{reais(PRECO_LIVRO[2026].ef1)}</b> (preço 2026).
          </li>
          <li>O livro sobe cerca de 12% por ano. À vista, 10% de desconto sobre as 12 parcelas.</li>
          <li>A mensalidade de tabela subiu R$ 40 em 2025 e em 2026. Em 2027, o veterano tem + R$ 50 até 30/10 e + R$ 60 depois.</li>
        </ul>
      </div>

      <h2 className="mt-8 text-xs font-bold uppercase tracking-widest text-muted-foreground">Consultar um aluno</h2>
      <p className="mt-1 text-sm text-muted-foreground">Mostra cada ano em que ele rematriculou, se foi na promoção e quanto paga.</p>
      <div className="mt-3"><BuscaAluno alunos={alunos} /></div>
      {erro && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {erro}
        </div>
      )}
      {escolhido && <HistoricoAluno aluno={escolhido} anos={anos} />}

      <h2 className="mt-10 text-xs font-bold uppercase tracking-widest text-muted-foreground">Valores por ano letivo</h2>
      <nav className="mt-3 flex flex-wrap gap-2">
        {ANOS_LETIVOS.map((a) => (
          <a key={a.ano} href={`#ano-${a.ano}`} className="rounded-xl bg-amadeus-blue-50/70 px-3 py-1.5 text-sm font-semibold text-amadeus-blue hover:bg-amadeus-blue-50">
            {a.ano}
          </a>
        ))}
      </nav>
      <div className="mt-4 space-y-6">
        {ANOS_LETIVOS.map((a) => <CartaoAno key={a.ano} a={a} />)}
      </div>
    </div>
  );
}
