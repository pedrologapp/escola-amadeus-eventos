import Link from "next/link";
import { Suspense } from "react";
import { listarAlunos } from "@/lib/rematricula-2027-dados";
import { reais } from "@/lib/rematricula-2027";
import {
  EXPERIENCIA, PRAZO_REMATRICULA, TIPOS_CALENDARIO, aniversariosHoje, diaCurto, diaLongo, diasEntre, eventosAbertos,
  funilExperiencia, hojeBR, itensDoCalendario, resumoRematricula, somaDias,
} from "@/lib/painel";
import { BuscaRematricula } from "./busca-rematricula";
import { EnvioRapido } from "./envio-rapido";

/**
 * "Hoje": a primeira página do painel novo (mockup aprovado pelo Pedro em 24/10/2026). No centro, a rematrícula
 * (digita o nome e vê os três valores); embaixo, Matrícula, Comunicação + Calendário e Eventos (sem valores).
 */
export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-[#e8e1d0] bg-white p-5";
const titulo = "font-[family-name:var(--font-serifa)] text-[21px] font-bold text-[#1B3B7C]";
const rotulo = "text-[11.5px] font-bold uppercase tracking-[0.12em] text-[#5b6478]";
const atalho = "rounded-full bg-[#f4f0e4] px-3 py-1 text-[12.5px] font-semibold text-[#1B3B7C] hover:bg-[#ebe4d2]";

export default async function Hoje({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  const hoje = hojeBR();
  const faltam = diasEntre(hoje, PRAZO_REMATRICULA);
  const alunos = await listarAlunos().catch(() => []);
  const id = aluno && /^\d+$/.test(aluno) ? Number(aluno) : null;

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-serifa)] text-3xl font-bold leading-none text-[#1B3B7C] first-letter:uppercase sm:text-4xl">{diaLongo(hoje)}</h1>
        </div>
        {faltam >= 0 && (
          <div className="rounded-xl bg-[#FFC21C] px-4 py-2.5 text-right font-bold leading-tight text-[#1B3B7C]">
            Condição da rematrícula até 28/10
            <small className="block text-xs font-medium">{faltam === 0 ? "hoje é o último dia" : `faltam ${faltam} ${faltam === 1 ? "dia" : "dias"}`} · depois vale a tabela cheia</small>
          </div>
        )}
      </div>

      <section className="mt-5 grid gap-6 rounded-[18px] bg-[#1B3B7C] p-5 text-white lg:grid-cols-[1fr_1.55fr] lg:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] opacity-80">Rematrícula 2027 · quanto fica?</p>
          <BuscaRematricula alunos={alunos.map((a) => ({ id: a.id, nome: a.nome, turma: a.turma }))} />
        </div>
        <div className="rounded-2xl bg-white p-5 text-[#1A2240]">
          {id ? (
            <Suspense fallback={<p className="py-10 text-center text-sm text-[#5b6478]">Lendo o boleto no Activesoft…</p>}>
              <Resultado id={id} />
            </Suspense>
          ) : (
            <div className="flex h-full min-h-40 flex-col justify-center text-[#5b6478]">
              <p className={`${titulo} text-[19px]`}>Digite o nome do aluno ao lado.</p>
              <p className="mt-1 text-sm">Aparecem aqui quanto a família paga hoje e quanto fica 2027, até 28/10 e depois. Para novato, abra o simulador completo.</p>
              <p className="mt-3"><Link href="/admin/rematricula-2027" className="text-sm font-bold text-[#1B3B7C] underline">Simular como novato</Link></p>
            </div>
          )}
        </div>
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <Suspense fallback={<div className={card}>Carregando…</div>}>
          <CardMatricula />
        </Suspense>
        <div className="flex flex-col gap-5">
          <Suspense fallback={<div className={card}>Carregando os aniversários…</div>}>
            <CardComunicacao />
          </Suspense>
          <Suspense fallback={<div className={card}>Carregando…</div>}>
            <CardCalendario hoje={hoje} />
          </Suspense>
        </div>
        <Suspense fallback={<div className={card}>Carregando…</div>}>
          <CardEventos />
        </Suspense>
      </div>
    </>
  );
}

async function Resultado({ id }: { id: number }) {
  const r = await resumoRematricula(id).catch(() => null);
  if (!r) return <p className="text-sm text-red-700">Não consegui ler esse aluno no Activesoft agora. Tente de novo ou abra o simulador completo.</p>;
  const caixa = "rounded-xl border border-[#e8e1d0] px-4 py-3";
  const valor = "mt-1 block font-[family-name:var(--font-serifa)] text-[26px] font-bold text-[#1B3B7C]";
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className={titulo}>{r.nome}</p>
        <span className={`text-sm font-bold ${r.pendencias ? "text-red-700" : "text-[#1f8a5b]"}`}>
          {r.pendencias ? `Não rematriculável · ${r.pendencias} pendência${r.pendencias > 1 ? "s" : ""} no Isaac` : "Rematriculável · sem pendência no Isaac"}
        </span>
      </div>
      <p className="text-sm text-[#5b6478]">{[r.serieAtual, r.serie2027].filter(Boolean).join(" → ")}</p>
      {r.ate === null ? (
        <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Esse boleto precisa ser conferido no simulador antes de mostrar os valores.</p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.2fr_1fr]">
          <div className={caixa}><span className={rotulo}>Hoje · 2026</span><b className={valor}>{r.hoje ? reais(r.hoje) : "—"}</b><span className="text-xs text-[#5b6478]">mensalidade no boleto</span></div>
          <div className={`${caixa} border-2 border-[#1B3B7C] bg-[#f4f7fd]`}><span className={rotulo}>2027 · fechando até 28/10</span><b className={valor}>{reais(r.ate)}</b><span className="text-xs text-[#5b6478]">pagando até o dia 05 · com o livro</span></div>
          <div className={caixa}><span className={rotulo}>2027 · depois de 28/10</span><b className={valor}>{reais(r.depois!)}</b><span className="text-xs text-[#5b6478]">pagando até o dia 05 · com o livro</span></div>
        </div>
      )}
      {r.revisar && r.ate !== null && <p className="mt-2 text-xs text-amber-800">A leitura do boleto pede conferência: confira no simulador antes de mandar para a família.</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {r.linkCarta && <Link href={r.linkCarta} target="_blank" className="rounded-lg bg-[#1B3B7C] px-3.5 py-2 text-sm font-bold text-white">Ver o encarte com todos os valores ↗</Link>}
        <Link href={`/admin/rematricula-2027?aluno=${r.id}`} className="rounded-lg bg-[#128C7E] px-3.5 py-2 text-sm font-bold text-white">Mandar no WhatsApp</Link>
        <Link href={`/admin/rematricula-2027?aluno=${r.id}`} className="rounded-lg bg-[#eef2fa] px-3.5 py-2 text-sm font-bold text-[#1B3B7C]">Descontos, irmão e à vista</Link>
      </div>
    </div>
  );
}

async function CardMatricula() {
  const f = await funilExperiencia();
  const n = [
    { v: f.convidadas, r: "convidadas" }, { v: f.inscritas, r: "inscritas" }, { v: f.vieram, r: "vieram" }, { v: f.matricularam, r: "matricularam" },
  ];
  return (
    <div className={`${card} flex flex-col`}>
      <div className="flex items-baseline justify-between"><h2 className={titulo}>Matrícula</h2><Link href="/admin/rematricula-2027/experiencia" className="text-sm font-semibold text-[#1B3B7C]">abrir</Link></div>
      <p className={`${rotulo} mt-3`}>Experiência Amadeus · {EXPERIENCIA.rotulo}</p>
      <div className="mt-2 grid grid-cols-4 gap-1.5 text-center">
        {n.map((x) => (
          <div key={x.r}><b className="block rounded-md bg-[#e9eef8] py-1.5 text-lg text-[#1B3B7C]">{x.v}</b><span className="text-[11.5px] text-[#5b6478]">{x.r}</span></div>
        ))}
      </div>
      <div className="mt-4 border-t border-[#f0ebde] pt-4">
        <EnvioRapido />
      </div>
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Link href="/admin/rematricula-2027/valores" className={atalho}>Tabela de valores</Link>
        <Link href="/admin/rematricula-2027/experiencia/arquivo" className={atalho}>Para convidar (edições passadas)</Link>
      </div>
    </div>
  );
}

async function CardComunicacao() {
  const a = await aniversariosHoje().catch(() => null);
  const linha = (x: { nome: string; turma: string | null; enviado: number; total: number; erro: boolean }) => (
    <span>
      <b>{x.nome.split(" ").slice(0, 2).join(" ")}</b>{x.turma ? <span className="text-[#5b6478]"> · {x.turma}</span> : null}
      {x.total > 0 && <span className={x.erro ? " font-bold text-red-700" : " font-bold text-[#1f8a5b]"}> · {x.enviado} de {x.total} {x.enviado === 1 ? "cartão enviado" : "cartões enviados"}</span>}
      {x.total === 0 && <span className="font-bold text-red-700"> · sem WhatsApp no cadastro</span>}
    </span>
  );
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between"><h2 className={titulo}>Comunicação</h2><Link href="/admin/comunicacao/aniversarios" className="text-sm font-semibold text-[#1B3B7C]">abrir</Link></div>
      <p className={`${rotulo} mt-3`}>Aniversários de hoje</p>
      {!a || a.erro ? (
        <p className="mt-2 text-sm text-[#5b6478]">Não consegui falar com o Activesoft agora.</p>
      ) : (
        <div className="mt-2 grid grid-cols-[58px_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
          <span className="pt-0.5 text-xs font-bold uppercase text-[#5b6478]">Aluno</span>
          <div className="space-y-1">{a.alunos.length ? a.alunos.map((x) => <div key={x.nome}>{linha(x)}</div>) : <span className="text-[#5b6478]">ninguém hoje</span>}</div>
          <span className="pt-0.5 text-xs font-bold uppercase text-[#5b6478]">Equipe</span>
          <div className="space-y-1">
            {a.equipe.length ? a.equipe.map((x) => <div key={x.nome}>{linha(x)}</div>) : (
              <span className="text-[#5b6478]">ninguém hoje{a.proximaEquipe ? ` · próxima: ${a.proximaEquipe.nome.split(" ")[0]}, ${diaCurto(a.proximaEquipe.data)}` : ""}</span>
            )}
          </div>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link href="/admin/imagens" className={atalho}>Gerador de imagens</Link>
        <Link href="/admin/comunicacao/tv" className={atalho}>TV da escola</Link>
      </div>
    </div>
  );
}

async function CardCalendario({ hoje }: { hoje: string }) {
  const itens = (await itensDoCalendario(hoje, somaDias(hoje, 14)).catch(() => [])).slice(0, 7);
  const cor = (t: string) => TIPOS_CALENDARIO.find((x) => x.valor === t);
  return (
    <div className={card}>
      <div className="flex items-baseline justify-between"><h2 className={titulo}>Calendário</h2><Link href="/painel/calendario" className="text-sm font-semibold text-[#1B3B7C]">ver o mês</Link></div>
      {itens.length ? (
        <div className="mt-3 grid grid-cols-[58px_1fr] gap-x-3 gap-y-2 text-[13.5px]">
          {itens.map((i) => (
            <div key={i.id} className="contents">
              <span className="pt-0.5 text-xs font-bold uppercase text-[#5b6478]">{i.data <= hoje ? "hoje" : diaCurto(i.data).slice(0, 6)}</span>
              <span>
                <span className="font-semibold" style={{ color: i.tipo === "feriado" ? cor(i.tipo)?.cor : undefined }}>{i.titulo}</span>
                {i.hora ? <span className="text-[#5b6478]"> · {i.hora}</span> : null}
                {(i.responsavel || i.observacao) && <small className="block text-xs text-[#5b6478]">{[i.responsavel, i.observacao].filter(Boolean).join(" · ")}</small>}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[#5b6478]">Nada marcado nas próximas duas semanas.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <Link href="/painel/calendario#novo" className={atalho}>+ Adicionar ao calendário</Link>
        <Link href="/painel/calendario?tipo=comunicacao#novo" className={atalho}>Pedir à Comunicação</Link>
      </div>
    </div>
  );
}

async function CardEventos() {
  const evs = await eventosAbertos().catch(() => []);
  return (
    <div className={`${card} flex flex-col`}>
      <div className="flex items-baseline justify-between"><h2 className={titulo}>Eventos</h2><Link href="/admin/eventos" className="text-sm font-semibold text-[#1B3B7C]">abrir</Link></div>
      <p className={`${rotulo} mt-3`}>Com inscrição aberta</p>
      {evs.length ? (
        <div className="mt-2 divide-y divide-[#f0ebde]">
          {evs.map((e) => (
            <Link key={e.id} href={`/admin/eventos/${e.id}`} className="flex items-center gap-3 py-2.5">
              <span className="flex-1 text-sm"><b>{e.nome}</b><small className="block text-xs text-[#5b6478]">{diaCurto(e.data)}{e.prazo ? ` · inscrição até ${diaCurto(e.prazo.slice(0, 10))}` : ""}</small></span>
              <span className="text-right font-[family-name:var(--font-serifa)] text-2xl font-bold leading-none text-[#1B3B7C]">{e.inscritos}<small className="block font-sans text-[11px] font-normal text-[#5b6478]">inscritos</small></span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[#5b6478]">Nenhum evento com inscrição aberta agora.</p>
      )}
      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        <Link href="/admin/eventos/novo" className={atalho}>Novo evento</Link>
        <Link href="/admin/eventos" className={atalho}>Ver todos</Link>
      </div>
    </div>
  );
}
