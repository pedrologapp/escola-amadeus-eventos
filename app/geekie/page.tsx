import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Geekie no Amadeus · O que muda em 2027",
  description:
    "A partir de 2027 o material didático do Amadeus é Geekie. Entenda o que muda para o seu filho e o que muda para você.",
  openGraph: {
    title: "O que muda em 2027 · Centro Educacional Amadeus",
    description:
      "Novo material didático, tablets em sala e um relatório semanal sobre como seu filho está indo.",
    type: "website",
  },
};

/** Página institucional, sem dado dinâmico. */
export const revalidate = 3600;

const VERDE = "#5F9683";
const AMBAR = "#E8B44C";

interface Materia {
  nome: string;
  valor: number;
  cor: string;
  corTexto: string;
}

const MATERIAS: Materia[] = [
  { nome: "Matemática", valor: 88, cor: VERDE, corTexto: "#4A7C6A" },
  { nome: "Ciências", valor: 81, cor: VERDE, corTexto: "#4A7C6A" },
  { nome: "Língua Portuguesa", valor: 54, cor: AMBAR, corTexto: "#B9862F" },
];

export default function GeekiePage() {
  return (
    <main className="bg-[#05060C] text-[#FAF7F0]">
      {/* As barras do relatório crescem ao abrir. Partem de um estado
          visível, então quem desativa animação vê a tela completa. */}
      <style>{`
        @media (prefers-reduced-motion: no-preference){
          .g-sobe{animation:gSobe .7s cubic-bezier(.2,.9,.3,1) both}
          @keyframes gSobe{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
          .g-cresce{animation:gCresce .9s .55s cubic-bezier(.2,.95,.3,1) both;transform-origin:left}
          @keyframes gCresce{from{transform:scaleX(.03)}to{transform:scaleX(1)}}
          .g-pisca{animation:gPisca 2.4s 1.4s ease-in-out infinite}
          @keyframes gPisca{0%,100%{transform:translateY(0)}50%{transform:translateY(4px)}}
        }
      `}</style>

      {/* ---------- abertura ---------- */}
      <section
        className="flex min-h-[82vh] flex-col justify-center py-14"
        style={{
          background:
            "radial-gradient(120% 70% at 50% 34%, #16224A 0%, #0A0D18 58%, #05060C 100%)",
        }}
      >
        <div className="mx-auto w-full max-w-[470px] px-6">
          <h1
            className="g-sobe text-center text-[clamp(1.7rem,7.6vw,2.35rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-balance"
            style={{ animationDelay: ".12s" }}
          >
            A partir de 2027, você acorda sabendo{" "}
            <span className="text-[#E8B44C]">
              como seu filho está indo na escola.
            </span>
          </h1>

          <div
            className="g-sobe mx-auto mt-7 max-w-[340px] rounded-[20px] bg-[#FAF7F0] p-[18px_17px_16px] text-[#17223D] shadow-[0_26px_60px_rgba(0,0,0,.65),0_0_0_1px_rgba(232,180,76,.18)]"
            style={{ animationDelay: ".3s" }}
          >
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid size-[26px] shrink-0 place-items-center rounded-full bg-[#0B1733] text-[0.68rem] font-extrabold text-[#E8B44C]">
                A
              </span>
              <span className="text-[0.78rem] font-bold">Amadeus</span>
              <span className="ml-auto text-[0.7rem] tabular-nums text-[#5A657F]">
                agora
              </span>
            </div>

            {MATERIAS.map((m, i) => (
              <div key={m.nome} className="mt-3 grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-[3px]">
                <span className="text-[0.85rem] font-medium">{m.nome}</span>
                <span
                  className="text-[0.77rem] font-extrabold tabular-nums"
                  style={{ color: m.corTexto }}
                >
                  {m.valor}%
                </span>
                <div className="col-span-2 h-[7px] overflow-hidden rounded-full bg-[#17223D]/10">
                  <div
                    className="g-cresce h-full rounded-full"
                    style={{
                      width: `${m.valor}%`,
                      background: m.cor,
                      animationDelay: `${0.55 + i * 0.08}s`,
                    }}
                  />
                </div>
              </div>
            ))}

            <p className="mt-3.5 flex gap-2 border-t border-[#17223D]/12 pt-3 text-[0.79rem] text-[#5A657F]">
              <span className="text-[#B9862F]">●</span>
              <span>Português caindo há duas semanas. Vale conversar com ele.</span>
            </p>
          </div>

          <p
            className="g-sobe mt-3 text-center text-[0.7rem] text-[#FAF7F0]/35"
            style={{ animationDelay: ".5s" }}
          >
            Exemplo ilustrativo
          </p>
          {/* É o convite para rolar a página. Se passar despercebido,
              o pai para na primeira tela e não vê o resto. */}
          <p className="g-sobe mt-8 text-center" style={{ animationDelay: ".66s" }}>
            <span className="g-pisca inline-flex items-center gap-2 rounded-full border border-[#E8B44C]/60 bg-[#E8B44C]/10 px-5 py-2.5 text-[0.95rem] font-bold text-[#E8B44C]">
              Entenda o que torna isso possível
              <span aria-hidden="true">▾</span>
            </span>
          </p>
        </div>
      </section>

      {/* ---------- o que é ---------- */}
      <section className="bg-[#FAF7F0] py-11 text-[#17223D]">
        <div className="mx-auto max-w-[470px] px-6">
          <p className="mb-3 text-[0.64rem] font-extrabold uppercase tracking-[0.22em] text-[#B9862F]">
            Mas o que aconteceu?
          </p>
          <h2 className="text-[clamp(1.5rem,6.2vw,1.95rem)] font-extrabold leading-tight tracking-[-0.03em]">
            O Amadeus agora é
          </h2>
          <p className="mb-1 mt-1 text-[clamp(2.6rem,12.5vw,3.6rem)] font-extrabold leading-[.95] tracking-[-0.05em] text-[#B9862F]">
            Geekie
          </p>
          <p className="mt-4 text-[1.06rem] leading-relaxed">
            Geekie é o <strong className="font-bold">novo material didático</strong> da
            escola. Em 2027, os livros do seu filho mudam.
          </p>

          <div className="mt-5 grid gap-2.5">
            <div className="rounded-2xl border border-[#17223D]/10 bg-[#17223D]/[0.055] p-4">
              <span className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-[#B9862F]">
                Metade impressa
              </span>
              <span className="block text-[0.93rem] leading-relaxed text-[#5A657F]">
                O livro continua na mochila. É nele que ele escreve, resolve e
                registra o que aprendeu.
              </span>
            </div>
            <div className="rounded-2xl bg-[#0B1733] p-4 text-[#FAF7F0]">
              <span className="mb-1 block text-[0.72rem] font-extrabold uppercase tracking-[0.18em] text-[#E8B44C]">
                Metade digital
              </span>
              <span className="block text-[0.93rem] leading-relaxed text-[#FAF7F0]/75">
                Uma plataforma que conversa com o livro e faz o que o papel
                sozinho não consegue.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- para o filho ---------- */}
      <section className="bg-[#05060C] py-11">
        <div className="mx-auto max-w-[470px] px-6">
          <p className="mb-3 text-[0.64rem] font-extrabold uppercase tracking-[0.22em] text-[#E8B44C]">
            O que muda para o seu filho
          </p>
          <h2 className="mb-3 text-[clamp(1.5rem,6.2vw,1.95rem)] font-extrabold leading-tight tracking-[-0.03em] text-balance">
            Se ele travar, o material percebe
          </h2>
          <Lista
            escura
            itens={[
              <>
                Travou num assunto? O material <b>volta nesse ponto</b>, em vez de
                empurrar ele pra frente.
              </>,
              <>
                Cada capítulo vem com vídeo e exercício. São{" "}
                <b>150 mil questões</b> no total.
              </>,
              <>
                Do 6º ao 9º, a coleção é <b>nova em folha</b>: projetos, projeto de
                vida e olimpíada de matemática.
              </>,
            ]}
          />
        </div>
      </section>

      {/* ---------- para o pai ---------- */}
      <section className="bg-[#FAF7F0] py-11 text-[#17223D]">
        <div className="mx-auto max-w-[470px] px-6">
          <p className="mb-3 text-[0.64rem] font-extrabold uppercase tracking-[0.22em] text-[#B9862F]">
            O que muda para você
          </p>
          <h2 className="mb-3 text-[clamp(1.5rem,6.2vw,1.95rem)] font-extrabold leading-tight tracking-[-0.03em] text-balance">
            Você não vai mais ser o último a saber
          </h2>
          <Lista
            itens={[
              <>
                Toda semana chega um resumo: <b>como ele foi em cada matéria</b> e
                onde a barra baixou.
              </>,
              <>
                Vem pelo WhatsApp. <b>Não tem aplicativo para baixar</b>, nem senha
                para decorar.
              </>,
              <>
                Se português cair em março, <b>você sabe em março</b>. Não em maio.
              </>,
            ]}
          />
        </div>
      </section>

      {/* ---------- tablets ---------- */}
      <section className="bg-[#05060C] py-11">
        <div className="mx-auto max-w-[470px] px-6">
          <p className="mb-3 text-[0.64rem] font-extrabold uppercase tracking-[0.22em] text-[#E8B44C]">
            E tem mais uma novidade
          </p>
          <h2 className="mb-3 text-[clamp(1.5rem,6.2vw,1.95rem)] font-extrabold leading-tight tracking-[-0.03em] text-balance">
            Os tablets chegam à sala de aula
          </h2>
          <p className="text-[#FAF7F0]/70">
            A escola está adquirindo tablets para que, do{" "}
            <b className="font-bold text-[#E8B44C]">4º ao 9º ano</b>, algumas aulas
            aconteçam com eles. É a primeira vez que isso acontece aqui: chegam
            para facilitar o aprendizado e promover ainda mais a educação no
            Amadeus.
          </p>

          <div className="mt-5 grid gap-2.5">
            <Bloco
              destaque
              titulo="Você não compra nada"
              texto="Os tablets são da escola. Você não precisa comprar tablet nenhum."
            />
            <Bloco
              titulo="Ficam na escola"
              texto="São usados dentro da aula, com o professor junto. Não vão para casa."
            />
            <Bloco
              titulo="Não é todo dia"
              texto="São aulas escolhidas. O livro continua sendo a base do estudo."
            />
          </div>
        </div>
      </section>

      {/* ---------- a prova ----------
          Fundo claro de propósito: vinha logo depois dos tablets, que também
          é escuro, e as duas seções se fundiam numa só. */}
      <section className="bg-[#FAF7F0] py-11 text-[#17223D]">
        <div className="mx-auto max-w-[470px] px-6">
          <p className="mb-3 text-[0.64rem] font-extrabold uppercase tracking-[0.22em] text-[#B9862F]">
            Por que escolhemos esse
          </p>
          <p className="text-[clamp(3rem,14vw,4rem)] font-extrabold leading-[.92] tracking-[-0.05em] tabular-nums">
            130 mil
            <span className="mt-2 block text-[0.25em] font-extrabold uppercase tracking-[0.14em] text-[#B9862F]">
              famílias avaliaram
            </span>
          </p>
          <p className="mt-3.5 text-[#5A657F]">
            Entre todos os materiais didáticos do país, o Geekie foi o mais bem
            avaliado pelas famílias.
          </p>
          <p className="mt-3.5 text-[0.72rem] leading-relaxed text-[#5A657F]">
            Diagnóstico Nacional da Educação, do Escolas Exponenciais, com 130 mil
            famílias, 14 mil professores e 400 instituições. Noticiado pela Folha
            de S.Paulo em agosto de 2021.
          </p>
        </div>
      </section>

      {/* ---------- fecho ---------- */}
      <footer className="bg-[#05060C] py-12 text-center">
        <div className="mx-auto max-w-[470px] px-6">
          <Image
            src="/logo-amadeus-negativa.png"
            alt="Centro Educacional Amadeus"
            width={1600}
            height={398}
            className="mx-auto h-7 w-auto opacity-90"
          />
          <p className="mb-1 mt-5 text-[1.18rem] font-bold tracking-[-0.02em]">
            Onde cada aluno importa.
          </p>
          <p className="text-[0.8rem] text-[#FAF7F0]/45">
            Matrículas 2027 · 30 anos
          </p>
        </div>
      </footer>
    </main>
  );
}

function Lista({
  itens,
  escura,
}: {
  itens: React.ReactNode[];
  escura?: boolean;
}) {
  return (
    <ul className="mt-5">
      {itens.map((item, i) => (
        <li
          key={i}
          className={[
            "flex gap-3 py-3 text-[0.96rem]",
            escura ? "text-[#FAF7F0]/70" : "text-[#5A657F]",
            i > 0
              ? escura
                ? "border-t border-[#FAF7F0]/10"
                : "border-t border-[#17223D]/12"
              : "",
            escura ? "[&_b]:text-[#FAF7F0]" : "[&_b]:text-[#17223D]",
            "[&_b]:font-bold",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="mt-2 size-[7px] shrink-0 rounded-full bg-[#E8B44C]"
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function Bloco({
  titulo,
  texto,
  destaque,
}: {
  titulo: string;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? "rounded-2xl bg-[#FAF7F0] p-4 text-[#17223D]"
          : "rounded-2xl border border-[#FAF7F0]/12 bg-[#FAF7F0]/5 p-4"
      }
    >
      <span
        className={`mb-1 block text-[0.72rem] font-extrabold uppercase tracking-[0.16em] ${
          destaque ? "text-[#B9862F]" : "text-[#E8B44C]"
        }`}
      >
        {titulo}
      </span>
      <span
        className={`block text-[0.94rem] leading-relaxed ${
          destaque ? "text-[#17223D]" : "text-[#FAF7F0]/72"
        }`}
      >
        {texto}
      </span>
    </div>
  );
}
