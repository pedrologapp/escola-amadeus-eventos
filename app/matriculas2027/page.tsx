import type { Metadata } from "next";
import Image from "next/image";
import { MapPin } from "lucide-react";
import {
  CAMPANHA_ATUAL,
  dataCurta,
  dataPorExtenso,
  diaDaSemana,
  inscricoesAbertas,
} from "@/lib/matriculas-config";
import { ConfirmacaoForm } from "./confirmacao-form";

const campanha = CAMPANHA_ATUAL;

/**
 * A página é quase toda estática, mas `inscricoesAbertas()` compara o prazo
 * com a hora atual. Sem revalidar, esse cálculo congelaria no build e o
 * formulário nunca fecharia sozinho — revalida a cada 5 min pra que o prazo
 * valha de verdade, sem abrir mão do cache.
 */
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${campanha.titulo} · ${campanha.eyebrow}`,
  description: `${campanha.subtitulo} ${campanha.nomeEvento} — ${dataPorExtenso(
    campanha.data,
  )}, às ${campanha.horaLabel}. Confirme sua presença.`,
  openGraph: {
    title: `${campanha.titulo} · ${campanha.eyebrow}`,
    description: campanha.subtitulo,
    type: "website",
  },
};

/**
 * Os anéis concêntricos do cartaz. Decorativos: ficam atrás do texto,
 * sangram pela direita e somem pra quem usa leitor de tela.
 */
function Aneis({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 600 600"
      className={className}
      fill="none"
    >
      {[110, 185, 260, 335, 410].map((r) => (
        <circle
          key={r}
          cx="420"
          cy="300"
          r={r}
          stroke="#E8B44C"
          strokeOpacity={r === 110 ? 0.9 : 0.22}
          strokeWidth={r === 110 ? 3 : 1.5}
        />
      ))}
      <circle cx="420" cy="300" r="106" fill="#16244A" />
    </svg>
  );
}

export default function MatriculasPage() {
  const abertas = inscricoesAbertas(campanha);
  const diaSemana = diaDaSemana(campanha.data);
  const dataLabel = `${diaSemana}, ${dataCurta(campanha.data)}`;

  return (
    <main className="bg-[#0B1733] text-[#FAF7F0]">
      {/* ---------- Faixa do topo, como no cartaz ---------- */}
      <header className="border-b border-[#FAF7F0]/10">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-5 py-5">
          {/* A versão negativa já traz o lockup completo (emblema + nome). */}
          <Image
            src="/logo-amadeus-negativa.png"
            alt="Centro Educacional Amadeus"
            width={1600}
            height={398}
            priority
            className="h-9 w-auto sm:h-11"
          />
          <p className="text-right text-[0.7rem] font-bold uppercase leading-tight tracking-[0.2em] text-[#E8B44C] sm:text-xs">
            {campanha.eyebrow.split(" ").map((palavra) => (
              <span key={palavra} className="block">
                {palavra}
              </span>
            ))}
          </p>
        </div>
      </header>

      {/* ---------- Herói ---------- */}
      <section className="relative overflow-hidden">
        <Aneis className="pointer-events-none absolute -right-28 top-1/2 h-[520px] -translate-y-1/2 opacity-80 sm:-right-16 sm:h-[620px]" />

        <div className="relative mx-auto max-w-2xl px-5 pb-14 pt-12 sm:pb-20 sm:pt-16">
          <h1 className="max-w-[9ch] text-[3.25rem] font-extrabold leading-[0.92] tracking-[-0.03em] sm:text-7xl">
            {campanha.titulo}
          </h1>

          <p className="mt-5 max-w-sm text-lg leading-relaxed text-[#FAF7F0]/75 sm:text-xl">
            {campanha.subtitulo}
          </p>

          <p className="mt-10 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#E8B44C] sm:text-sm">
            {campanha.nomeEvento}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-2xl border border-[#FAF7F0]/20 px-5 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#FAF7F0]/55">
                {diaSemana}
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {dataCurta(campanha.data)}
              </p>
            </div>
            <div className="rounded-2xl border border-[#FAF7F0]/20 px-5 py-4">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-[#FAF7F0]/55">
                Horário
              </p>
              <p className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
                {campanha.horaLabel}
              </p>
            </div>
          </div>

          <p className="mt-4 flex items-start gap-2 text-[0.95rem] leading-relaxed text-[#FAF7F0]/60">
            <MapPin className="mt-0.5 size-4 shrink-0 text-[#E8B44C]" />
            <span>
              {campanha.local}
              {campanha.localDetalhe && (
                <span className="block">{campanha.localDetalhe}</span>
              )}
            </span>
          </p>

          {abertas && (
            <a
              href="#confirmar"
              className="mt-8 flex w-full items-center justify-center rounded-xl bg-[#E8B44C] py-4 text-base font-extrabold tracking-tight text-[#0B1733] shadow-lg transition-all hover:brightness-105 active:scale-[0.99]"
            >
              Confirmar minha presença
            </a>
          )}
        </div>
      </section>

      {/* ---------- Bloco dourado: confirmação ---------- */}
      <section id="confirmar" className="scroll-mt-4 bg-[#E8B44C]">
        <div className="mx-auto max-w-2xl px-5 py-14 sm:py-20">
          <h2 className="text-3xl font-extrabold leading-tight tracking-[-0.02em] text-[#0B1733] sm:text-4xl">
            Confirme sua presença
          </h2>
          <p className="mt-3 max-w-md leading-relaxed text-[#0B1733]/70">
            {abertas
              ? "Leva menos de um minuto. É só nos dizer quem vem."
              : "As confirmações desta reunião já foram encerradas."}
          </p>

          <div className="mt-7">
            {abertas ? (
              <ConfirmacaoForm
                maxPessoas={campanha.maxPessoas}
                whatsappEscola={campanha.whatsappEscola}
                dataLabel={dataLabel}
                horaLabel={campanha.horaLabel}
                local={campanha.local}
              />
            ) : (
              <div className="rounded-3xl bg-[#FAF7F0] p-7 text-center shadow-2xl">
                <p className="leading-relaxed text-[#0B1733]/75">
                  O prazo para confirmar pela internet terminou. Se você ainda
                  quer participar, fale com a secretaria — a gente dá um jeito.
                </p>
                <a
                  href={`https://wa.me/${campanha.whatsappEscola}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex rounded-xl bg-[#0B1733] px-6 py-3 font-bold text-[#FAF7F0]"
                >
                  Falar com a secretaria
                </a>
              </div>
            )}
          </div>

          {campanha.infos.length > 0 && (
            <ul className="mt-8 space-y-2.5">
              {campanha.infos.map((info) => (
                <li
                  key={info}
                  className="flex gap-2.5 text-[0.95rem] leading-relaxed text-[#0B1733]/75"
                >
                  <span aria-hidden="true" className="font-bold">
                    ·
                  </span>
                  {info}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* ---------- Rodapé ---------- */}
      <footer className="border-t border-[#FAF7F0]/10 px-5 py-10 text-center">
        <p className="text-sm font-semibold tracking-tight text-[#FAF7F0]/70">
          {campanha.local}
        </p>
        {campanha.localDetalhe && (
          <p className="mt-1 text-sm text-[#FAF7F0]/45">
            {campanha.localDetalhe}
          </p>
        )}
      </footer>
    </main>
  );
}

