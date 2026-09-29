import Link from "next/link";
import { dadosPortal, type EventoPortal } from "@/lib/portal";
import { roteiroPublico } from "@/lib/tv";
import { PlayerTv } from "../admin/tv/player";
import { Saudacao } from "./saudacao";

/**
 * Portal da Família (29/09/2026). Vai ser a página do www.escolaamadeus.com
 * (o proxy leva a raiz do domínio principal para cá quando o domínio for
 * apontado para este projeto). Público: por isso a TV daqui não tem nome de
 * aluno. Ordem pedida pelo Pedro: TV e eventos, matrícula antecipada,
 * lembretes, agenda da semana, atalhos.
 */
export const metadata = {
  title: { absolute: "Centro Educacional Amadeus · Portal da Família" },
  description: "Eventos, passeios, lembretes e a agenda da semana do Centro Educacional Amadeus.",
};
export const dynamic = "force-dynamic";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS_CURTOS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const dataLonga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
const diasEntre = (de: string, ate: string) => Math.round((Date.parse(`${ate}T12:00:00Z`) - Date.parse(`${de}T12:00:00Z`)) / 864e5);

const VIDEO = /\.(mp4|mov|webm|m4v)(\?|$)/i;

function CartaoEvento({ e, hoje }: { e: EventoPortal; hoje: string }) {
  const prazo = e.prazo ? e.prazo.slice(0, 10) : null;
  const aberto = !e.passou && (!prazo || prazo >= hoje);
  const falta = diasEntre(hoje, e.data);
  // evento que passou mostra a 1ª foto do "como foi" (vídeo não serve de miniatura)
  const miniatura = (e.passou ? e.midias.find((m) => !VIDEO.test(m)) : null) ?? e.capa;
  return (
    <Link href={e.passou ? `/como-foi/${e.slug}` : `/eventos/${e.slug}`} className="flex gap-3 rounded-2xl bg-white p-2.5 shadow-[0_6px_16px_rgba(27,59,124,.1)] transition hover:-translate-y-0.5">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-amadeus-blue-50">
        {miniatura ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={miniatura} alt="" className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center text-amadeus-blue">
            <span className="f-ralton text-3xl leading-none">{e.data.slice(8)}</span>
            <span className="text-xs font-bold uppercase">{MESES[Number(e.data.slice(5, 7)) - 1]}</span>
          </div>
        )}
      </div>
      <div className="min-w-0 py-0.5">
        <p className="font-bold leading-tight text-amadeus-blue">{e.nome}</p>
        <p className="mt-1 text-xs text-slate-500">
          {e.passou ? `${dataLonga(e.data)} · já aconteceu` : [dataLonga(e.data), e.hora?.replace(":00", "h").replace(":", "h"), e.local].filter(Boolean).join(" · ")}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {e.passou ? (
            <span className="rounded-full bg-amadeus-blue px-3 py-1 text-xs font-bold text-white">📸 Veja como foi ({e.midias.length})</span>
          ) : aberto ? (
            <span className="rounded-full bg-amadeus-yellow px-3 py-1 text-xs font-bold text-amadeus-blue">Fazer inscrição</span>
          ) : (
            <span className="rounded-full bg-amadeus-blue-50 px-3 py-1 text-xs font-bold text-amadeus-blue">Ver detalhes</span>
          )}
          {!e.passou && (
            <span className="text-xs font-semibold text-red-600">
              {aberto && prazo ? `inscrições até ${prazo.slice(8)}/${prazo.slice(5, 7)}` : falta === 0 ? "é hoje!" : falta === 1 ? "é amanhã!" : `faltam ${falta} dias`}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function PortalFamilia() {
  const [d, roteiro] = await Promise.all([dadosPortal(), roteiroPublico()]);
  const zap = `https://wa.me/${d.whatsapp}`;
  const titulo = "f-caveat text-[30px] leading-none text-[#1B3B7C]";

  return (
    <div className="min-h-screen bg-[#FDFBF6] text-slate-800">
      <header className="sticky top-0 z-30 bg-amadeus-blue text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-amadeus-negativa.png" alt="Centro Educacional Amadeus" className="h-9 w-auto" />
          <nav className="ml-auto hidden items-center gap-5 text-sm font-semibold text-white/85 sm:flex">
            <a href="#eventos" className="hover:text-white">Eventos</a>
            {d.agenda.length > 0 && <a href="#agenda" className="hover:text-white">Agenda</a>}
            <Link href="/folder" className="hover:text-white">Matrículas 2027</Link>
            <a href={zap} target="_blank" rel="noreferrer" className="rounded-full bg-amadeus-yellow px-4 py-1.5 font-bold text-amadeus-blue hover:brightness-105">Fale com a escola</a>
          </nav>
          <a href={zap} target="_blank" rel="noreferrer" className="ml-auto rounded-full bg-amadeus-yellow px-3 py-1.5 text-xs font-bold text-amadeus-blue sm:hidden">WhatsApp</a>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10">
        <div className="pt-6"><Saudacao /></div>

        <div className="mt-4 grid gap-6 lg:grid-cols-[1.55fr_1fr]">
          {/* TV Amadeus */}
          <section>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-[0_14px_34px_rgba(18,48,122,.25)]">
              <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold tracking-widest text-white">● TV AMADEUS</span>
              <PlayerTv roteiro={roteiro} previa={false} embutida />
            </div>
            <p className="mt-1.5 text-xs text-slate-400">A TV da recepção da escola, passando aqui. Toque para ver em tela cheia.</p>
          </section>

          {/* Passeios e eventos */}
          <section id="eventos" className="scroll-mt-20">
            <h2 className={titulo}>Passeios e <span className="text-[#F29A0C]">eventos</span></h2>
            <div className="mt-3 grid gap-3">
              {d.eventos.length ? d.eventos.slice(0, 4).map((e) => <CartaoEvento key={e.slug} e={e} hoje={d.hoje} />) : <p className="text-sm text-slate-500">Nenhum evento marcado agora.</p>}
            </div>
          </section>
        </div>

        {/* Matrícula antecipada (antes dos lembretes, pedido do Pedro) */}
        {d.promo && (
          <Link href={d.promo.link} className="mt-8 flex items-center gap-4 rounded-3xl bg-amadeus-blue p-5 text-white shadow-lg transition hover:brightness-110 sm:p-6">
            <div className="min-w-0 flex-1">
              <p className="f-ralton text-2xl leading-none text-amadeus-yellow sm:text-3xl">Matrícula antecipada 2027</p>
              <p className="mt-2 text-sm text-white/90 sm:text-base">Mensalidade com desconto e material mais barato para quem garante a vaga até {dataLonga(d.promo.prazo)}.</p>
              <p className="mt-3 inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-bold">Ver o folder 2027 →</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-amadeus-yellow px-4 py-3 text-center text-amadeus-blue shadow-[0_6px_0_#E08A00]">
              <span className="block f-ralton text-4xl leading-none">{diasEntre(d.hoje, d.promo.prazo)}</span>
              <span className="text-xs font-bold">dias</span>
            </div>
          </Link>
        )}

        {/* Lembretes */}
        {d.lembretes.length > 0 && (
          <section className="mt-8">
            <h2 className={titulo}>Lembretes</h2>
            <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {d.lembretes.map((l, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-2xl border-l-[6px] bg-white p-3.5 shadow-sm ${l.tipo === "aviso" ? "border-[#F29A0C]" : "border-[#2E8FF0]"}`}>
                  <span className="text-2xl">{l.icone ?? (l.tipo === "aviso" ? "📣" : "📌")}</span>
                  <div className="min-w-0">
                    <p className="font-semibold leading-snug text-slate-800">{l.titulo.replace(/\*/g, "")}{l.texto ? `: ${l.texto.replace(/\*/g, "")}` : ""}</p>
                    <p className="text-[11px] text-slate-400">{l.tipo === "aviso" ? "aviso da escola" : "coordenação"}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Agenda da semana */}
        {d.agenda.length > 0 && (
          <section id="agenda" className="mt-8 scroll-mt-20">
            <h2 className={titulo}>Agenda da <span className="text-[#2E8FF0]">semana</span></h2>
            <div className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
              {d.agenda.map((dia, i) => {
                const hoje = dia.data === d.hoje;
                return (
                  <div key={dia.data} className={`min-w-[130px] flex-1 overflow-hidden rounded-2xl border-2 bg-white ${hoje ? "border-amadeus-yellow" : "border-[#EAF0FA]"}`}>
                    <div className={`px-3 py-1.5 text-sm font-bold ${hoje ? "bg-amadeus-yellow text-amadeus-blue" : "bg-amadeus-blue text-white"}`}>
                      {DIAS_CURTOS[i]} {dia.data.slice(8)}/{dia.data.slice(5, 7)}{hoje ? " · hoje" : ""}
                    </div>
                    <ul className="grid gap-1.5 p-3 text-xs">
                      {dia.itens.length ? dia.itens.map((t, j) => <li key={j} className="border-l-[3px] border-[#2E8FF0] pl-2">{t}</li>) : <li className="text-slate-300">—</li>}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Atalhos */}
        <section className="mt-8">
          <h2 className={titulo}>Atalhos</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { href: "/folder", icone: "📘", t: "Folder 2027", s: "tudo sobre o próximo ano" },
              { href: zap, icone: "💬", t: "Falar com a secretaria", s: "WhatsApp (84) 9 8145-0229", fora: true },
              { href: "https://pesquisa.escolaamadeus.com/escolar", icone: "⭐", t: "Sua opinião", s: "pesquisa de satisfação", fora: true },
              { href: "https://www.instagram.com/escolaamadeus/", icone: "📸", t: "Instagram", s: "@escolaamadeus", fora: true },
            ].map((a) => (
              <a key={a.t} href={a.href} {...(a.fora ? { target: "_blank", rel: "noreferrer" } : {})} className="rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5">
                <span className="text-2xl">{a.icone}</span>
                <p className="mt-1 text-sm font-bold text-amadeus-blue">{a.t}</p>
                <p className="text-xs text-slate-500">{a.s}</p>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="bg-[#0B2260] px-4 py-6 text-center text-xs text-[#AFC0E4]">
        Centro Educacional Amadeus · 30 anos educando para a vida · São Gonçalo do Amarante · RN
      </footer>
    </div>
  );
}
