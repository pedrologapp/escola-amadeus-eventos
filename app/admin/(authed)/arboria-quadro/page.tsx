import Link from "next/link";
import { TODOS } from "@/lib/arboria-quadro";
import { listarSalas, relatorio, SITUACAO, type Situacao } from "./dados";
import { NaoFinalizaram } from "./nao-finalizaram";

/**
 * "Qual é o quadro?" · relatório do professor (Pedro, 20/10/2026). Fica no admin (com login), não na TV:
 * quem não finalizou não aparece para a turma. Escolhe a aula; vê cada aluno por rodada, quanto acertou
 * adivinhando e, para quem não finalizou, o material e a análise da IA de por que não deu certo.
 */
export const metadata = { title: "Qual é o quadro? · Relatório · Admin Amadeus" };
export const dynamic = "force-dynamic";

const quando = (d: string) => new Date(d).toLocaleString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });
const pct = (a: number, b: number) => (b ? Math.round((100 * a) / b) : 0);
const NOME_RODADA = { 1: "4 quadros diferentes", 2: "8 quadros parecidos", 3: "8 retratos" } as const;

export default async function RelatorioQuadroPage({ searchParams }: { searchParams: Promise<{ sala?: string }> }) {
  const codigo = (await searchParams).sala;
  if (!codigo) {
    const salas = await listarSalas();
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-amadeus-blue">Qual é o quadro? · Relatório</h1>
        <p className="mt-1 text-sm text-muted-foreground">Arboria · Fase Linguística, semana 3. Escolha a aula para ver como cada aluno foi e por que alguns não finalizaram.</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {salas.map((s) => (
            <Link key={s.codigo} href={`/admin/arboria-quadro?sala=${s.codigo}`} className="rounded-2xl border bg-white p-5 shadow-sm transition hover:border-amadeus-blue">
              <p className="text-2xl font-extrabold text-amadeus-blue">{s.turma}</p>
              <p className="mt-1 text-sm capitalize text-muted-foreground">{quando(s.criado_em)}</p>
              <p className="mt-3 text-sm"><b>{s.alunos}</b> alunos · sala {s.codigo}</p>
            </Link>
          ))}
          {!salas.length && <p className="text-sm text-muted-foreground">Nenhuma aula ainda.</p>}
        </div>
      </div>
    );
  }

  const rel = await relatorio(codigo);
  if (!rel) return <div className="container mx-auto px-4 py-6"><p>Sala não encontrada.</p><Link href="/admin/arboria-quadro" className="text-amadeus-blue underline">Voltar</Link></div>;
  const { sala, rodadas, alunos, linhas, reflexoes } = rel;
  const de = (aluno: string, r: number) => linhas.find((l) => l.aluno === aluno && l.rodada === r);
  const naoFinalizaram = linhas.filter((l) => !SITUACAO[l.situacao].finalizou);

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/arboria-quadro" className="text-sm font-semibold text-amadeus-blue underline">← Todas as aulas</Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">Qual é o quadro? · {sala.turma}</h1>
      <p className="mt-1 text-sm capitalize text-muted-foreground">{quando(sala.criado_em)} · {alunos.length} alunos · sala {sala.codigo}</p>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        {rodadas.map((r) => {
          const ls = linhas.filter((l) => l.rodada === r);
          const fin = ls.filter((l) => SITUACAO[l.situacao].finalizou).length;
          const feitas = ls.reduce((a, l) => a + l.adivinhou, 0);
          const acertos = ls.reduce((a, l) => a + l.acertou, 0);
          return (
            <div key={r} className="rounded-2xl border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Rodada {r} · {NOME_RODADA[r]}</p>
              <p className="mt-2 text-3xl font-extrabold text-amadeus-blue">{fin}<span className="text-lg text-muted-foreground">/{ls.length}</span></p>
              <p className="text-sm text-muted-foreground">finalizaram (o colega achou o quadro) · {pct(fin, ls.length)}%</p>
              <p className="mt-3 text-sm">Adivinhando: <b>{acertos}</b> acertos em {feitas} tentativas ({pct(acertos, feitas)}%)</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(Object.keys(SITUACAO) as Situacao[]).map((k) => {
                  const n = ls.filter((l) => l.situacao === k).length;
                  return n ? <span key={k} className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SITUACAO[k].cor}`}>{SITUACAO[k].rotulo}: {n}</span> : null;
                })}
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-6 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Aluno</th>
              {rodadas.map((r) => <th key={r} className="px-3 py-3">Rodada {r}</th>)}
              <th className="px-3 py-3">Acertou adivinhando</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {alunos.map((a) => {
              const ls = rodadas.map((r) => de(a.id, r)).filter((l) => !!l);
              const feitas = ls.reduce((s, l) => s + l.adivinhou, 0);
              const acertos = ls.reduce((s, l) => s + l.acertou, 0);
              return (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 font-semibold">{a.nome}</td>
                  {rodadas.map((r) => {
                    const l = de(a.id, r);
                    return (
                      <td key={r} className="px-3 py-2.5">
                        {l && <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${SITUACAO[l.situacao].cor}`} title={l.quadro ? TODOS[l.quadro]?.titulo : undefined}>{SITUACAO[l.situacao].rotulo}</span>}
                        {l && l.adivinhou > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{l.acertou}/{l.adivinhou}</span>}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5"><b>{acertos}</b> de {feitas} {feitas > 0 && <span className="text-muted-foreground">({pct(acertos, feitas)}%)</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">Nas rodadas, o número ao lado é quanto o aluno acertou adivinhando as descrições dos colegas naquela rodada (inclui as extras).</p>
      </section>

      <NaoFinalizaram sala={sala.codigo} linhas={naoFinalizaram} />

      {reflexoes.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-extrabold text-amadeus-blue">Fechamento da Fase Linguística · {reflexoes.length} de {alunos.length} responderam</h2>
          <div className="mt-3 overflow-x-auto rounded-2xl border bg-white shadow-sm">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="px-4 py-3">Aluno</th><th className="px-3 py-3">O que descobriu que sabe fazer com as palavras</th><th className="px-3 py-3">O que quer descobrir no ano que vem</th></tr>
              </thead>
              <tbody className="divide-y">
                {reflexoes.map((x) => (
                  <tr key={x.aluno} className="align-top">
                    <td className="px-4 py-2.5 font-semibold whitespace-nowrap">{x.nome}</td>
                    <td className="px-3 py-2.5">{x.descobri}</td>
                    <td className="px-3 py-2.5">{x.quero}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
