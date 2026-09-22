"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import {
  BOLHAS_DENTRO,
  BOLHAS_FORA,
  CARTOES_LIVRO,
  COMUNICACAO,
  CONTATO,
  ESPACOS,
  ESPORTES,
  FRASE_ESPORTES,
  INICIO_TABELA_CHEIA,
  PERCURSO,
  PRAZO_PROMOCAO,
  PROGRAMAS,
  SEGMENTOS,
  VALORES,
  acharSegmento,
  indiceSegmento,
  type CartaoLivro,
  type IconeComunicacao,
  type Peca,
  type SegmentoId,
} from "@/lib/folder-config";

/* As bolhas se apoiam numa medida só, --d, que é o lado do palco. Assim a
   constelação acompanha a largura do celular sem precisar de breakpoint. */
const RAIO_DENTRO = 0.215;
const RAIO_FORA = 0.41;
const TAM_DENTRO = 0.135;
const TAM_FORA = 0.175;
const MARCA = 0.19;

function angulos(quantidade: number, deslocamento: number): number[] {
  const passo = 360 / quantidade;
  return Array.from({ length: quantidade }, (_, i) => deslocamento + i * passo);
}

export default function FolderCliente() {
  const [segmento, setSegmento] = useState<SegmentoId | null>(null);
  const [etapa, setEtapa] = useState(-1);

  const irPara = useCallback((alvo: string, seg?: SegmentoId) => {
    if (seg) setSegmento(seg);
    document.getElementById(alvo)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  /* Quem manda na barra de progresso é a seção que está passando pelo meio
     da tela, não a que começou a aparecer. */
  useEffect(() => {
    const ids = ["capa", ...PERCURSO];
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          if (entrada.isIntersecting) setEtapa(ids.indexOf(entrada.target.id) - 1);
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 },
    );
    for (const id of ids) {
      const alvo = document.getElementById(id);
      if (alvo) observador.observe(alvo);
    }
    return () => observador.disconnect();
  }, []);

  const escolhido = segmento ? acharSegmento(segmento) : null;
  const progresso = etapa < 0 ? 0 : ((etapa + 1) / PERCURSO.length) * 100;

  return (
    <div className="bg-[#05060C]">
      <style>{`
        @keyframes fdGira { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .fd-anel-fora { animation: fdGira 58s linear infinite }
        .fd-contra-fora { animation: fdGira 58s linear infinite reverse }
        .fd-anel-dentro { animation: fdGira 44s linear infinite reverse }
        .fd-contra-dentro { animation: fdGira 44s linear infinite }
        @media (prefers-reduced-motion: reduce) {
          .fd-anel-fora, .fd-contra-fora, .fd-anel-dentro, .fd-contra-dentro { animation: none }
        }
      `}</style>

      {/* A barra só aparece depois que o pai sai da capa, senão ela promete um
          caminho antes de ele ter aceitado percorrer. */}
      <div
        className="fixed inset-x-0 top-0 z-30 transition-opacity duration-300"
        style={{ opacity: etapa < 0 ? 0 : 1 }}
        aria-hidden={etapa < 0}
      >
        <div className="h-[3px] bg-[#FAF7F0]/12">
          <div
            className="h-[3px] bg-[#E8B44C] transition-[width] duration-500"
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      <Capa aoTocar={irPara} escolhido={segmento} />
      <SecaoSegmento escolhido={segmento} aoEscolher={irPara} />
      <SecaoVideo segmento={segmento} aoEscolher={setSegmento} aoTocar={irPara} />
      <SecaoLivro />
      <SecaoComunicacao />
      <SecaoMosaico
        id="programas"
        etiqueta="Programas e projetos"
        titulo="O que ele vive além da aula."
        pecas={PROGRAMAS}
      />
      <SecaoMosaico
        id="esportes"
        escuro
        etiqueta="Esportes"
        titulo="Karatê, futsal e vôlei."
        apoio={FRASE_ESPORTES}
        pecas={ESPORTES}
      />
      <SecaoMosaico
        id="espacos"
        etiqueta="Espaços"
        titulo="Onde tudo isso acontece."
        pecas={ESPACOS}
      />
      <SecaoValores escolhido={escolhido} aoTocar={irPara} />
      <SecaoProximo aoTocar={irPara} />
    </div>
  );
}

/* ---------------------------------------------------------------- capa --- */

function Capa({
  aoTocar,
  escolhido,
}: {
  aoTocar: (alvo: string, seg?: SegmentoId) => void;
  escolhido: SegmentoId | null;
}) {
  const anguloDentro = angulos(BOLHAS_DENTRO.length, -90);
  const anguloFora = angulos(BOLHAS_FORA.length, 0);

  return (
    <section
      id="capa"
      className="relative flex h-[100dvh] min-h-[640px] justify-center overflow-hidden"
      style={{
        background:
          "radial-gradient(120% 70% at 50% 34%, #16224A 0%, #0A0D18 58%, #05060C 100%)",
      }}
    >
      {/* O gradiente sangra na largura toda, como no hero do /geekie. Só o
          conteúdo fica preso na coluna de celular. */}
      <div className="flex w-full max-w-[470px] flex-col px-6 pb-8 pt-8">
        <div className="relative mx-auto h-12 w-[17rem]">
          <Image
            src="/folder/logo-horizontal.png"
            alt="Centro Educacional Amadeus"
            fill
            priority
            sizes="272px"
            className="object-contain"
          />
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div
            className="relative aspect-square"
            style={
              {
                "--d": "min(90vw, 420px)",
                width: "var(--d)",
              } as React.CSSProperties
            }
          >
            <TrilhaAnel proporcao={RAIO_DENTRO} opacidade={0.08} />
            <TrilhaAnel proporcao={RAIO_FORA} opacidade={0.06} />

            <div className="fd-anel-fora absolute inset-0">
              {BOLHAS_FORA.map((bolha, i) => (
                <Bolha
                  key={bolha.rotulo}
                  angulo={anguloFora[i]}
                  raio={RAIO_FORA}
                  tamanho={TAM_FORA}
                  classeContra="fd-contra-fora"
                  aoTocar={() => aoTocar(bolha.alvo)}
                  rotulo={bolha.rotulo}
                  linhas={bolha.linhas}
                />
              ))}
            </div>

            <div className="fd-anel-dentro absolute inset-0">
              {BOLHAS_DENTRO.map((bolha, i) => (
                <Bolha
                  key={bolha.rotulo}
                  angulo={anguloDentro[i]}
                  raio={RAIO_DENTRO}
                  tamanho={TAM_DENTRO}
                  classeContra="fd-contra-dentro"
                  aoTocar={() => aoTocar(bolha.alvo, bolha.segmento)}
                  rotulo={bolha.rotulo}
                  solida
                  ativa={escolhido === bolha.segmento}
                />
              ))}
            </div>

            {/* O símbolo do globo já é redondo e lê bem no escuro, então não
                precisa de disco nenhum atrás. */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: `calc(var(--d) * ${MARCA})`,
                height: `calc(var(--d) * ${MARCA})`,
              }}
            >
              <Image
                src="/folder/marca-globo.png"
                alt=""
                fill
                priority
                sizes="90px"
                className="object-contain"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-5">
          <h1 className="text-center font-serif text-[2.6rem] font-semibold leading-[1.02] text-[#FAF7F0]">
            O que nós
            <br />
            <span className="text-[#E8B44C]">somos!</span>
          </h1>
          <button
            type="button"
            onClick={() => aoTocar("segmento")}
            className="flex min-h-[3.5rem] items-center gap-2 rounded-full bg-[#FAF7F0] px-8 text-base font-bold text-[#0B1733] transition-transform active:scale-[0.98]"
          >
            Descubra aqui
            <Seta cor="#0B1733" />
          </button>
        </div>
      </div>
    </section>
  );
}

function TrilhaAnel({ proporcao, opacidade }: { proporcao: number; opacidade: number }) {
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border"
      style={{
        width: `calc(var(--d) * ${proporcao * 2})`,
        height: `calc(var(--d) * ${proporcao * 2})`,
        borderColor: `rgba(250,247,240,${opacidade})`,
      }}
    />
  );
}

function Bolha({
  angulo,
  raio,
  tamanho,
  classeContra,
  aoTocar,
  rotulo,
  linhas,
  solida = false,
  ativa = false,
}: {
  angulo: number;
  raio: number;
  tamanho: number;
  classeContra: string;
  aoTocar: () => void;
  rotulo: string;
  linhas?: string[];
  solida?: boolean;
  ativa?: boolean;
}) {
  const lado = `calc(var(--d) * ${tamanho})`;
  const partes = linhas ?? [rotulo];
  const maiorParte = Math.max(...partes.map((p) => p.length));

  return (
    <span
      className="absolute left-1/2 top-1/2"
      style={{
        width: lado,
        height: lado,
        margin: `calc(${lado} / -2) 0 0 calc(${lado} / -2)`,
        transform: `rotate(${angulo}deg) translate(calc(var(--d) * ${raio})) rotate(${-angulo}deg)`,
      }}
    >
      <button
        type="button"
        onClick={aoTocar}
        aria-label={rotulo}
        className={`${classeContra} flex size-full items-center justify-center rounded-full px-1.5 text-center leading-[1.15] transition-colors ${
          solida
            ? "bg-[#FAF7F0] text-[0.68rem] font-bold text-[#0B1733]"
            : `border border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05] font-semibold text-[#FAF7F0]/90 ${
                maiorParte > 9 ? "text-[0.62rem]" : "text-[0.7rem]"
              }`
        } ${ativa ? "ring-2 ring-[#E8B44C] ring-offset-2 ring-offset-[#0A0D18]" : ""}`}
      >
        <span>
          {partes.map((parte, i) => (
            <span key={parte} className="block">
              {parte}
              {i < partes.length - 1 ? <span className="sr-only"> </span> : null}
            </span>
          ))}
        </span>
      </button>
    </span>
  );
}

/* ------------------------------------------------------------ moldura --- */

function Secao({
  id,
  escuro = false,
  children,
}: {
  id: string;
  escuro?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`flex min-h-[100dvh] pb-12 pt-16 ${
        escuro ? "bg-[#05060C] text-[#FAF7F0]" : "bg-[#FAF7F0] text-[#17223D]"
      }`}
    >
      <div className="mx-auto flex w-full max-w-[470px] flex-col px-6">{children}</div>
    </section>
  );
}

function Etiqueta({ escuro, children }: { escuro?: boolean; children: React.ReactNode }) {
  return (
    <p
      className={`text-[0.68rem] font-semibold uppercase tracking-[0.17em] ${
        escuro ? "text-[#E8B44C]" : "text-[#7A5310]"
      }`}
    >
      {children}
    </p>
  );
}

function Titulo({ escuro, children }: { escuro?: boolean; children: React.ReactNode }) {
  return (
    <h2
      className={`mt-2 font-serif text-[2.1rem] font-semibold leading-[1.06] ${
        escuro ? "text-[#FAF7F0]" : "text-[#17223D]"
      }`}
    >
      {children}
    </h2>
  );
}

function Continuar({
  alvo,
  escuro,
  aoTocar,
}: {
  alvo: string;
  escuro?: boolean;
  aoTocar: (alvo: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => aoTocar(alvo)}
      className={`mt-8 flex min-h-[3.375rem] items-center justify-center gap-2 rounded-full border text-[0.95rem] font-semibold ${
        escuro ? "border-[#FAF7F0]/22 text-[#FAF7F0]" : "border-[#17223D]/22 text-[#17223D]"
      }`}
    >
      Continuar
      <SetaBaixo cor={escuro ? "#E8B44C" : "#17223D"} />
    </button>
  );
}

/* ------------------------------------------------------------- etapas --- */

function SecaoSegmento({
  escolhido,
  aoEscolher,
}: {
  escolhido: SegmentoId | null;
  aoEscolher: (alvo: string, seg?: SegmentoId) => void;
}) {
  return (
    <Secao id="segmento" escuro>
      <div className="flex flex-1 flex-col justify-center">
        <Etiqueta escuro>Antes de começar</Etiqueta>
        <Titulo escuro>Qual a idade do seu filho?</Titulo>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[#FAF7F0]/68">
          Daqui pra frente o folder mostra só o que é dele. Sem tabela, sem procurar a sua
          linha.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {SEGMENTOS.map((s) => {
            const ativo = escolhido === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => aoEscolher("video", s.id)}
                className={`flex min-h-16 items-center gap-3 rounded-2xl border px-5 py-3 text-left transition-colors ${
                  ativo
                    ? "border-[#FAF7F0] bg-[#FAF7F0] text-[#0B1733]"
                    : "border-[#FAF7F0]/20 bg-[#FAF7F0]/[0.05] text-[#FAF7F0]"
                }`}
              >
                <span
                  className={`w-[5.25rem] shrink-0 text-[0.95rem] font-bold ${
                    ativo ? "text-[#0B1733]" : "text-[#E8B44C]"
                  }`}
                >
                  {s.idade}
                </span>
                <span className="flex-1 text-[0.95rem] font-semibold leading-snug">
                  {s.nome}
                  {s.series ? (
                    <span
                      className={`block text-xs font-normal ${
                        ativo ? "text-[#0B1733]/70" : "text-[#FAF7F0]/58"
                      }`}
                    >
                      {s.series}
                    </span>
                  ) : null}
                </span>
                <Seta cor={ativo ? "#0B1733" : "#E8B44C"} />
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs leading-relaxed text-[#FAF7F0]/50">
        Ainda não estuda no Amadeus?
        <br />
        Também é por aqui.
      </p>
    </Secao>
  );
}

/* O vídeo de cada etapa fica lado a lado: as setas trocam de etapa sem tirar
   o pai da tela, em vez de mandar ele voltar pra pergunta. */
function SecaoVideo({
  segmento,
  aoEscolher,
  aoTocar,
}: {
  segmento: SegmentoId | null;
  aoEscolher: (seg: SegmentoId) => void;
  aoTocar: (alvo: string) => void;
}) {
  const atual = acharSegmento(segmento ?? "infantil");
  const i = indiceSegmento(atual.id);
  const anterior = SEGMENTOS[(i - 1 + SEGMENTOS.length) % SEGMENTOS.length];
  const proximo = SEGMENTOS[(i + 1) % SEGMENTOS.length];

  return (
    <Secao id="video" escuro>
      <Etiqueta escuro>O que nós somos</Etiqueta>
      <Titulo escuro>A gente prefere mostrar.</Titulo>

      <div className="relative mt-6 flex flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-hidden rounded-[22px] border border-[#FAF7F0]/12 bg-[#0B1733]">
          {atual.video ? (
            <video
              src={atual.video}
              controls
              playsInline
              className="size-full flex-1 object-cover"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
              <span className="grid size-[4.5rem] place-items-center rounded-full bg-[#FAF7F0]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#0B1733" aria-hidden>
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <span className="text-sm leading-relaxed text-[#FAF7F0]/70">
                O vídeo do {atual.nome} estreia na reunião de sábado.
              </span>
            </div>
          )}

          <div className="border-t border-[#FAF7F0]/10 px-4 py-3 text-center">
            <span className="block text-[0.95rem] font-bold text-[#FAF7F0]">
              {atual.nome}
            </span>
            <span className="block text-xs text-[#FAF7F0]/55">
              {atual.series ?? atual.idade}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => aoEscolher(anterior.id)}
          aria-label={`Ver o vídeo do ${anterior.nome}`}
          className="absolute -left-1 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border border-[#FAF7F0]/20 bg-[#05060C]/85 py-2 pl-1.5 pr-3 backdrop-blur"
        >
          <SetaLado cor="#E8B44C" />
          <span className="text-[0.7rem] font-semibold text-[#FAF7F0]/80">
            {anterior.curto}
          </span>
        </button>

        <button
          type="button"
          onClick={() => aoEscolher(proximo.id)}
          aria-label={`Ver o vídeo do ${proximo.nome}`}
          className="absolute -right-1 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full border border-[#FAF7F0]/20 bg-[#05060C]/85 py-2 pl-3 pr-1.5 backdrop-blur"
        >
          <span className="text-[0.7rem] font-semibold text-[#FAF7F0]/80">
            {proximo.curto}
          </span>
          <SetaLado cor="#E8B44C" direita />
        </button>
      </div>

      <Continuar alvo="livro" escuro aoTocar={aoTocar} />
    </Secao>
  );
}

function SecaoLivro() {
  return (
    <Secao id="livro">
      <Etiqueta>O Livro</Etiqueta>
      <h2 className="mt-2 font-serif text-[1.6rem] font-semibold leading-tight text-[#17223D]">
        Em 2027 o livro do seu filho é
      </h2>
      <p className="-mt-1 font-serif text-[3.6rem] font-semibold leading-[0.95] tracking-tight text-[#B9862F]">
        Geekie
      </p>

      <div className="mt-3 flex items-center gap-2 text-[0.8rem] font-semibold text-[#5A657F]">
        <span>Arraste para o lado</span>
        <SetaLado cor="#B9862F" direita />
      </div>

      {/* A página /geekie inteira vive aqui dentro, em cartões que o pai
          empurra com o dedo. Ninguém precisa abrir outro site. */}
      <div className="-mx-6 mt-4 flex-1 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-full snap-x snap-mandatory gap-3">
          {CARTOES_LIVRO.map((cartao, i) => (
            <CartaoDoLivro key={cartao.etiqueta + i} cartao={cartao} escuro={i % 2 === 1} />
          ))}

          <Link
            href={CONTATO.linkGeekie}
            className="flex w-[9.5rem] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[22px] border border-dashed border-[#17223D]/25 p-5 text-center"
          >
            <span className="text-[0.9rem] font-bold text-[#17223D]">
              Ver a página inteira
            </span>
            <Seta cor="#B9862F" />
          </Link>
        </div>
      </div>
    </Secao>
  );
}

function CartaoDoLivro({ cartao, escuro }: { cartao: CartaoLivro; escuro: boolean }) {
  const pele = escuro
    ? "bg-[#0B1733] text-[#FAF7F0]"
    : "border border-[#17223D]/10 bg-[#17223D]/[0.055] text-[#17223D]";
  const etiqueta = escuro ? "text-[#E8B44C]" : "text-[#B9862F]";
  const apoio = escuro ? "text-[#FAF7F0]/72" : "text-[#5A657F]";

  return (
    <article
      className={`flex w-[16.5rem] shrink-0 snap-start flex-col rounded-[22px] p-5 ${pele}`}
    >
      <span
        className={`text-[0.6rem] font-bold uppercase tracking-[0.18em] ${etiqueta}`}
      >
        {cartao.etiqueta}
      </span>

      {cartao.tipo === "metades" ? (
        <div className="mt-4 flex flex-1 flex-col justify-center gap-3">
          <div className="rounded-2xl bg-[#17223D]/[0.07] p-4">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#B9862F]">
              Metade impressa
            </span>
            <span className="mt-1 block text-[0.85rem] leading-relaxed text-[#5A657F]">
              {cartao.impresso}
            </span>
          </div>
          <div className="rounded-2xl bg-[#0B1733] p-4">
            <span className="block text-[0.62rem] font-bold uppercase tracking-[0.16em] text-[#E8B44C]">
              Metade digital
            </span>
            <span className="mt-1 block text-[0.85rem] leading-relaxed text-[#FAF7F0]/75">
              {cartao.digital}
            </span>
          </div>
        </div>
      ) : null}

      {cartao.tipo === "relatorio" ? (
        <div className="mt-3 flex flex-1 flex-col">
          <span className="text-[1.15rem] font-bold leading-snug">{cartao.titulo}</span>
          <div className="mt-4 flex flex-col gap-2.5 rounded-2xl bg-[#FAF7F0] p-4">
            {cartao.materias.map((m) => (
              <span key={m.nome} className="flex items-center gap-2.5">
                <span className="w-[5.5rem] shrink-0 text-[0.72rem] font-semibold text-[#17223D]">
                  {m.nome}
                </span>
                <span className="h-[7px] flex-1 overflow-hidden rounded-full bg-[#17223D]/10">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${m.valor}%`,
                      background: m.alerta ? "#E8B44C" : "#5F9683",
                    }}
                  />
                </span>
                <span className="w-7 text-right text-[0.72rem] font-bold tabular-nums text-[#17223D]">
                  {m.valor}
                </span>
              </span>
            ))}
          </div>
          <span className={`mt-4 text-[0.85rem] leading-relaxed ${apoio}`}>
            {cartao.frase}
          </span>
        </div>
      ) : null}

      {cartao.tipo === "numero" ? (
        <div className="mt-3 flex flex-1 flex-col">
          <span className="font-serif text-[3.6rem] font-semibold leading-[0.9] tracking-tight tabular-nums">
            {cartao.numero}
          </span>
          <span
            className={`mt-1 text-[0.7rem] font-bold uppercase tracking-[0.14em] ${etiqueta}`}
          >
            {cartao.unidade}
          </span>
          <span className={`mt-4 text-[0.9rem] leading-relaxed ${apoio}`}>
            {cartao.frase}
          </span>
          {cartao.nota ? (
            <span className={`mt-auto pt-4 text-[0.62rem] leading-relaxed ${apoio}`}>
              {cartao.nota}
            </span>
          ) : null}
        </div>
      ) : null}

      {cartao.tipo === "chips" ? (
        <div className="mt-3 flex flex-1 flex-col">
          <span className="text-[1.15rem] font-bold leading-snug">{cartao.titulo}</span>
          <span className="mt-2 font-serif text-[2.6rem] font-semibold leading-none tracking-tight text-[#E8B44C]">
            {cartao.destaque}
          </span>
          <div className="mt-5 flex flex-wrap gap-2">
            {cartao.chips.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-[#FAF7F0]/20 px-3 py-1.5 text-[0.72rem] font-semibold text-[#FAF7F0]/85"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SecaoComunicacao() {
  return (
    <Secao id="comunicacao" escuro>
      <Etiqueta escuro>Comunicação</Etiqueta>
      <Titulo escuro>A escola cabe no seu bolso.</Titulo>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[#FAF7F0]/68">
        O <span className="font-bold text-[#E8B44C]">AgendaEdu</span> é o aplicativo por
        onde a escola fala com a sua família.
      </p>

      <div className="mt-8 grid flex-1 grid-cols-2 content-start gap-3">
        {COMUNICACAO.map((item) => (
          <div
            key={item.nome}
            className="flex min-h-[8.5rem] flex-col items-center justify-center gap-3 rounded-[20px] border border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05] p-4 text-center"
          >
            <IconeApp qual={item.icone} />
            <span className="text-[0.92rem] font-bold leading-snug text-[#FAF7F0]">
              {item.nome}
            </span>
          </div>
        ))}
      </div>
    </Secao>
  );
}

/* -------------------------------------------------------------- mosaico --- */

function SecaoMosaico({
  id,
  escuro = false,
  etiqueta,
  titulo,
  apoio,
  pecas,
}: {
  id: string;
  escuro?: boolean;
  etiqueta: string;
  titulo: string;
  apoio?: string;
  pecas: Peca[];
}) {
  return (
    <Secao id={id} escuro={escuro}>
      <Etiqueta escuro={escuro}>{etiqueta}</Etiqueta>
      <Titulo escuro={escuro}>{titulo}</Titulo>
      {apoio ? (
        <p
          className={`mt-3 text-[0.95rem] leading-relaxed ${
            escuro ? "text-[#FAF7F0]/68" : "text-[#5A657F]"
          }`}
        >
          {apoio}
        </p>
      ) : null}
      <Mosaico pecas={pecas} escuro={escuro} />
    </Secao>
  );
}

/* As peças têm tamanhos diferentes de propósito. Tocar numa abre o texto dela
   embaixo, em vez de empurrar a grade inteira pra baixo. */
function Mosaico({ pecas, escuro }: { pecas: Peca[]; escuro?: boolean }) {
  const [aberta, setAberta] = useState<string | null>(null);
  const escolhida = pecas.find((p) => p.nome === aberta) ?? null;

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div className="grid grid-cols-2 gap-3 [grid-auto-rows:8.25rem]">
        {pecas.map((peca) => {
          const ativa = aberta === peca.nome;
          const clicavel = Boolean(peca.resumo);
          return (
            <button
              key={peca.nome}
              type="button"
              disabled={!clicavel}
              onClick={() => setAberta(ativa ? null : peca.nome)}
              className={`relative flex flex-col justify-end overflow-hidden rounded-[18px] border p-4 text-left transition-[box-shadow,border-color] ${
                peca.largo ? "col-span-2" : ""
              } ${peca.alto ? "row-span-2" : ""} ${
                escuro
                  ? "border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05]"
                  : "border-[#17223D]/10 bg-[#17223D]/[0.045]"
              } ${ativa ? "ring-2 ring-[#E8B44C]" : ""}`}
            >
              {peca.foto ? (
                <>
                  <Image
                    src={peca.foto}
                    alt=""
                    fill
                    sizes="(max-width: 470px) 50vw, 235px"
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgba(5,6,12,0.88) 0%, rgba(5,6,12,0.45) 45%, rgba(5,6,12,0.1) 100%)",
                    }}
                  />
                </>
              ) : null}

              <span className="relative">
                <span
                  className={`block text-[1rem] font-bold leading-snug ${
                    peca.foto || escuro ? "text-[#FAF7F0]" : "text-[#17223D]"
                  }`}
                >
                  {peca.nome}
                </span>
                {peca.nota ? (
                  <span
                    className={`mt-0.5 block text-[0.68rem] ${
                      peca.foto || escuro ? "text-[#FAF7F0]/70" : "text-[#5A657F]"
                    }`}
                  >
                    {peca.nota}
                  </span>
                ) : null}
              </span>

              {clicavel ? (
                <span
                  aria-hidden
                  className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full ${
                    peca.foto ? "bg-[#05060C]/60" : escuro ? "bg-[#FAF7F0]/10" : "bg-[#17223D]/8"
                  }`}
                >
                  <svg
                    className={`transition-transform duration-200 ${ativa ? "rotate-45" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={peca.foto || escuro ? "#E8B44C" : "#B9862F"}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  >
                    <path d="M12 5v14" />
                    <path d="M5 12h14" />
                  </svg>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {escolhida?.resumo ? (
        <div
          className={`mt-3 rounded-[18px] p-5 ${
            escuro ? "bg-[#FAF7F0]/[0.07]" : "bg-[#17223D]/[0.06]"
          }`}
        >
          <span
            className={`block text-[0.95rem] font-bold ${
              escuro ? "text-[#FAF7F0]" : "text-[#17223D]"
            }`}
          >
            {escolhida.nome}
          </span>
          <p
            className={`mt-1.5 text-[0.9rem] leading-relaxed ${
              escuro ? "text-[#FAF7F0]/72" : "text-[#5A657F]"
            }`}
          >
            {escolhida.resumo}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- valores --- */

function SecaoValores({
  escolhido,
  aoTocar,
}: {
  escolhido: ReturnType<typeof acharSegmento> | null;
  aoTocar: (alvo: string, seg?: SegmentoId) => void;
}) {
  const valores = escolhido ? VALORES[escolhido.id] : null;

  return (
    <Secao id="valores" escuro>
      <Etiqueta escuro>Investimento 2027</Etiqueta>
      <Titulo escuro>{escolhido ? escolhido.nome : "Os valores de 2027"}</Titulo>

      <div className="mt-7 flex flex-1 flex-col gap-4">
        {valores ? (
          <>
            <div className="rounded-[22px] bg-[#FAF7F0] p-6">
              <span className="block text-xs uppercase tracking-[0.1em] text-[#5A657F]">
                Mensalidade
              </span>
              <span className="mt-1.5 block font-serif text-[2.75rem] font-semibold leading-none text-[#B9862F]">
                {valores.promocional.cheio}
              </span>
              <span className="mt-2 block text-sm leading-relaxed text-[#454F6B]">
                {valores.promocional.ateODia5} pagando até o dia 5.
              </span>
              <span className="mt-3.5 block border-t border-[#17223D]/14 pt-3.5 text-[0.8rem] leading-relaxed text-[#5A657F]">
                Esta é a tabela promocional, válida para matrículas até {PRAZO_PROMOCAO}. A
                partir de {INICIO_TABELA_CHEIA}, {valores.depois.cheio} por mês, ou{" "}
                {valores.depois.ateODia5} até o dia 5.
              </span>
            </div>

            <div className="rounded-[18px] border border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05] p-5">
              <span className="block text-[0.95rem] font-bold text-[#FAF7F0]">
                Material didático
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-[#FAF7F0]/68">
                O material Geekie One é comprado à parte, uma vez no ano.
              </span>
              <div className="mt-4 flex flex-col gap-3.5">
                {valores.material.map((linha) => (
                  <span key={linha.rotulo} className="block">
                    <span className="block text-[0.72rem] uppercase tracking-[0.12em] text-[#FAF7F0]/55">
                      {linha.rotulo}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2">
                      <span className="text-[0.8rem] text-[#FAF7F0]/72">até 12x de</span>
                      <span className="font-serif text-[1.65rem] font-semibold leading-none text-[#E8B44C]">
                        {linha.parcela}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[0.72rem] text-[#FAF7F0]/50">
                      à vista {linha.total}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Confere />
              <span className="flex-1 text-sm leading-relaxed text-[#FAF7F0]/72">
                Os tablets são adquiridos pela escola. Você não paga por eles.
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-[0.95rem] leading-relaxed text-[#FAF7F0]/68">
              Escolha a etapa do seu filho para ver a mensalidade e o material dele.
            </p>
            <button
              type="button"
              onClick={() => aoTocar("segmento")}
              className="mt-5 self-start text-sm font-semibold text-[#E8B44C] underline"
            >
              Escolher a etapa
            </button>
          </div>
        )}
      </div>

      <Continuar alvo="proximo" escuro aoTocar={aoTocar} />
    </Secao>
  );
}

function SecaoProximo({ aoTocar }: { aoTocar: (alvo: string) => void }) {
  return (
    <Secao id="proximo">
      <div className="relative h-11 w-[15rem]">
        <Image
          src="/folder/marca-30-anos.png"
          alt="Centro Educacional Amadeus"
          fill
          sizes="240px"
          className="object-contain object-left"
        />
      </div>

      <h2 className="mt-6 font-serif text-[2.5rem] font-semibold leading-[1.04] text-[#17223D]">
        Venha ver
        <br />
        de perto.
      </h2>
      <p className="mt-2.5 max-w-[18rem] text-[0.95rem] leading-relaxed text-[#5A657F]">
        Folder nenhum substitui entrar na escola e sentir o barulho do recreio.
      </p>

      <div className="flex-1" />

      <div className="flex flex-col gap-2.5">
        <Link
          href={CONTATO.linkReuniao}
          className="flex min-h-[3.625rem] items-center justify-center rounded-full bg-[#17223D] px-6 text-center text-base font-bold text-[#FAF7F0]"
        >
          Confirmar presença na reunião
        </Link>
        {CONTATO.whatsapp ? (
          <a
            href={`https://wa.me/${CONTATO.whatsapp}`}
            className="flex min-h-14 items-center justify-center rounded-full border border-[#17223D]/24 text-[0.95rem] font-semibold text-[#17223D]"
          >
            Falar com a secretaria
          </a>
        ) : null}
      </div>

      <div className="mt-7 flex items-end gap-3 border-t border-[#17223D]/14 pt-5">
        <span className="flex-1 text-xs leading-relaxed text-[#5A657F]">
          Centro Educacional Amadeus
          <br />
          São Gonçalo do Amarante, RN
        </span>
        <button
          type="button"
          onClick={() => aoTocar("capa")}
          className="min-h-11 text-xs font-semibold text-[#5A657F] underline"
        >
          voltar ao início
        </button>
      </div>
    </Secao>
  );
}

/* -------------------------------------------------------------- ícones --- */

function IconeApp({ qual }: { qual: IconeComunicacao }) {
  const comum = {
    width: 30,
    height: 30,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#E8B44C",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (qual === "agenda") {
    return (
      <svg {...comum}>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18M8 3v3M16 3v3" />
        <path d="M8 14h4" />
      </svg>
    );
  }
  if (qual === "evento") {
    return (
      <svg {...comum}>
        <path d="M12 3.5l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 9.2l5.4-.8z" />
      </svg>
    );
  }
  if (qual === "recado") {
    return (
      <svg {...comum}>
        <path d="M20.5 12.5a7.5 7.5 0 0 1-7.5 7.5H8l-4.5 2.5.9-4.3A7.5 7.5 0 0 1 13 5a7.5 7.5 0 0 1 7.5 7.5z" />
        <path d="M9 11h7M9 14.5h4.5" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17.5" cy="9.5" r="2.4" />
      <path d="M16 15.2c3 .3 5 2.3 5 4.8" />
    </svg>
  );
}

function Seta({ cor }: { cor: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function SetaLado({ cor, direita = false }: { cor: string; direita?: boolean }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="shrink-0"
    >
      {direita ? <path d="m9 18 6-6-6-6" /> : <path d="m15 18-6-6 6-6" />}
    </svg>
  );
}

function SetaBaixo({ cor }: { cor: string }) {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke={cor}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="m5 12 7 7 7-7" />
    </svg>
  );
}

function Confere() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#E8B44C"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mt-px shrink-0"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
