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
  INICIO_TABELA_CHEIA,
  PERCURSO,
  PRAZO_PROMOCAO,
  PROGRAMAS,
  SEGMENTOS,
  VALORES,
  acharSegmento,
  type Item,
  type SegmentoId,
} from "@/lib/folder-config";

/* As bolhas são posicionadas em cima de uma medida só, --d, que é o lado do
   palco. Assim a constelação inteira acompanha a largura do celular sem
   precisar de breakpoint. */
const RAIO_DENTRO = 0.215;
const RAIO_FORA = 0.41;
const TAM_DENTRO = 0.135;
const TAM_FORA = 0.175;
/** O miolo é um disco creme: a logo tem tipografia azul e sumiria no preto. */
const MEDALHA = 0.2;

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

      {/* Barra de progresso. Só aparece depois que o pai sai da capa, senão
          ela promete um caminho antes de ele ter aceitado percorrer. */}
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

      <SecaoVideo escolhido={escolhido} aoTocar={irPara} />

      <SecaoLivro />

      <SecaoComunicacao />

      <SecaoLista
        id="programas"
        etiqueta="Programas e projetos"
        titulo="O que ele vive além da aula."
        itens={PROGRAMAS}
      />

      <SecaoLista
        id="esportes"
        escuro
        etiqueta="Esportes"
        titulo="Karatê, futsal e vôlei."
        itens={ESPORTES}
      />

      <SecaoEspacos />

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
      <div className="flex w-full max-w-[470px] flex-col px-6 pb-8 pt-9">
      <p className="text-center text-[0.62rem] uppercase tracking-[0.2em] text-[#FAF7F0]/45">
        Centro Educacional Amadeus
      </p>

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

          <div
            className="absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#FAF7F0]"
            style={{
              width: `calc(var(--d) * ${MEDALHA})`,
              height: `calc(var(--d) * ${MEDALHA})`,
            }}
          >
            <div
              className="relative"
              style={{
                width: `calc(var(--d) * ${MEDALHA * 0.76})`,
                height: `calc(var(--d) * ${MEDALHA * 0.76})`,
              }}
            >
              <Image
                src="/folder/logo-30-anos.png"
                alt="Centro Educacional Amadeus, 30 anos"
                fill
                priority
                sizes="140px"
                className="object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <h1 className="text-center font-serif text-[2.5rem] font-semibold leading-[1.02] text-[#FAF7F0]">
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

/* ------------------------------------------------------------- seções --- */

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
      {/* Mesma coluna da página /geekie: o folder é feito pra celular, e em
          tela larga ele continua sendo uma coluna de celular, centrada. */}
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
  rotulo = "Continuar",
}: {
  alvo: string;
  escuro?: boolean;
  aoTocar: (alvo: string) => void;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => aoTocar(alvo)}
      className={`mt-8 flex min-h-[3.375rem] items-center justify-center gap-2 rounded-full border text-[0.95rem] font-semibold ${
        escuro
          ? "border-[#FAF7F0]/22 text-[#FAF7F0]"
          : "border-[#17223D]/22 text-[#17223D]"
      }`}
    >
      {rotulo}
      <SetaBaixo cor={escuro ? "#E8B44C" : "#17223D"} />
    </button>
  );
}

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

function SecaoVideo({
  escolhido,
  aoTocar,
}: {
  escolhido: ReturnType<typeof acharSegmento> | null;
  aoTocar: (alvo: string, seg?: SegmentoId) => void;
}) {
  return (
    <Secao id="video" escuro>
      {escolhido ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <Etiqueta escuro>
              {escolhido.nome}
              {escolhido.series ? ` · ${escolhido.series}` : ""}
            </Etiqueta>
            <button
              type="button"
              onClick={() => aoTocar("segmento")}
              className="min-h-11 text-xs text-[#FAF7F0]/62 underline"
            >
              trocar
            </button>
          </div>

          <Titulo escuro>A gente prefere mostrar.</Titulo>

          {escolhido.video ? (
            <div className="mt-6 flex-1 overflow-hidden rounded-[22px] bg-[#0B1733]">
              <video
                src={escolhido.video}
                controls
                playsInline
                className="size-full object-cover"
              />
            </div>
          ) : (
            <div className="mt-6 flex flex-1 flex-col items-center justify-center gap-4 rounded-[22px] border border-dashed border-[#E8B44C]/45 bg-[#0B1733] px-8 text-center">
              <span className="grid size-[4.5rem] place-items-center rounded-full bg-[#FAF7F0]">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="#0B1733" aria-hidden>
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <span className="text-sm leading-relaxed text-[#FAF7F0]/72">
                O vídeo do {escolhido.nome} estreia na reunião de sábado.
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-1 flex-col justify-center">
          <Titulo escuro>Escolha a etapa para ver o vídeo.</Titulo>
          <div className="mt-6 flex flex-col gap-3">
            {SEGMENTOS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => aoTocar("video", s.id)}
                className="flex min-h-14 items-center gap-3 rounded-2xl border border-[#FAF7F0]/20 bg-[#FAF7F0]/[0.05] px-5 text-left text-[0.95rem] font-semibold text-[#FAF7F0]"
              >
                <span className="flex-1">{s.nome}</span>
                <Seta cor="#E8B44C" />
              </button>
            ))}
          </div>
        </div>
      )}

      <Continuar alvo="material" escuro aoTocar={aoTocar} />
    </Secao>
  );
}

function SecaoLivro() {
  return (
    <Secao id="livro">
      <Etiqueta>O Livro</Etiqueta>
      <h2 className="mt-2 font-serif text-[1.65rem] font-semibold leading-tight text-[#17223D]">
        Em 2027 o livro do seu filho é
      </h2>
      <p className="-mt-1 font-serif text-[3.4rem] font-semibold leading-[0.95] tracking-tight text-[#B9862F]">
        Geekie
      </p>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[#5A657F]">
        Arraste para o lado e entenda o que isso muda, sem sair daqui.
      </p>

      {/* O conteúdo da página /geekie vive aqui dentro, em cartões que o pai
          empurra com o dedo. Ninguém precisa abrir outro site. */}
      <div className="-mx-6 mt-6 flex-1 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex h-full snap-x snap-mandatory gap-3">
          {CARTOES_LIVRO.map((cartao, i) => (
            <article
              key={cartao.titulo}
              className={`flex w-[17rem] shrink-0 snap-start flex-col rounded-[20px] p-5 ${
                i % 2 === 0
                  ? "border border-[#17223D]/10 bg-[#17223D]/[0.055] text-[#17223D]"
                  : "bg-[#0B1733] text-[#FAF7F0]"
              }`}
            >
              <span
                className={`text-[0.62rem] font-bold uppercase tracking-[0.18em] ${
                  i % 2 === 0 ? "text-[#B9862F]" : "text-[#E8B44C]"
                }`}
              >
                {cartao.etiqueta}
              </span>
              <span className="mt-2 text-[1.15rem] font-bold leading-snug">
                {cartao.titulo}
              </span>
              <ul className="mt-3 flex flex-col gap-2.5">
                {cartao.pontos.map((ponto) => (
                  <li key={ponto} className="flex gap-2.5">
                    <span
                      className={`mt-[0.45rem] size-[5px] shrink-0 rounded-full ${
                        i % 2 === 0 ? "bg-[#B9862F]" : "bg-[#E8B44C]"
                      }`}
                    />
                    <span
                      className={`flex-1 text-[0.85rem] leading-relaxed ${
                        i % 2 === 0 ? "text-[#5A657F]" : "text-[#FAF7F0]/75"
                      }`}
                    >
                      {ponto}
                    </span>
                  </li>
                ))}
              </ul>
              {cartao.nota ? (
                <span
                  className={`mt-4 text-[0.68rem] leading-relaxed ${
                    i % 2 === 0 ? "text-[#5A657F]" : "text-[#FAF7F0]/55"
                  }`}
                >
                  {cartao.nota}
                </span>
              ) : null}
            </article>
          ))}

          <Link
            href={CONTATO.linkGeekie}
            className="flex w-[11rem] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[20px] border border-dashed border-[#17223D]/25 p-5 text-center"
          >
            <span className="text-[0.95rem] font-bold text-[#17223D]">
              Ver a página inteira
            </span>
            <Seta cor="#B9862F" />
          </Link>
        </div>
      </div>
    </Secao>
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

      <div className="mt-7 flex-1">
        <GradeItens itens={COMUNICACAO} escuro />
      </div>
    </Secao>
  );
}

function SecaoLista({
  id,
  escuro = false,
  etiqueta,
  titulo,
  itens,
}: {
  id: string;
  escuro?: boolean;
  etiqueta: string;
  titulo: string;
  itens: Item[];
}) {
  return (
    <Secao id={id} escuro={escuro}>
      <Etiqueta escuro={escuro}>{etiqueta}</Etiqueta>
      <Titulo escuro={escuro}>{titulo}</Titulo>

      <div className="mt-7 flex-1">
        <GradeItens itens={itens} escuro={escuro} />
      </div>
    </Secao>
  );
}

function GradeItens({ itens, escuro }: { itens: Item[]; escuro?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {itens.map((item) => (
        <CaixaItem key={item.nome} item={item} escuro={escuro} />
      ))}
    </div>
  );
}

/* Sem resumo, a caixa é só um nome. Quando o texto chegar, a mesma caixa
   passa a abrir, ocupando a largura toda, sem mudar o desenho da tela. */
function CaixaItem({
  item,
  escuro,
  largo = false,
}: {
  item: Item;
  escuro?: boolean;
  largo?: boolean;
}) {
  const pele = escuro
    ? "border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05] text-[#FAF7F0]"
    : "border-[#17223D]/10 bg-[#17223D]/[0.045] text-[#17223D]";
  const apoio = escuro ? "text-[#FAF7F0]/55" : "text-[#5A657F]";

  const cabeca = (
    <>
      <span className="block text-[1rem] font-bold leading-snug">{item.nome}</span>
      {item.nota ? (
        <span className={`mt-1 block text-[0.7rem] ${apoio}`}>{item.nota}</span>
      ) : null}
    </>
  );

  if (!item.resumo) {
    return (
      <div
        className={`flex min-h-[5.25rem] flex-col justify-end rounded-[18px] border p-4 ${pele} ${
          largo ? "col-span-2" : ""
        }`}
      >
        {cabeca}
      </div>
    );
  }

  return (
    <details
      className={`group rounded-[18px] border p-4 ${pele} ${
        largo ? "col-span-2" : "[&[open]]:col-span-2"
      }`}
    >
      <summary className="flex min-h-[3.75rem] cursor-pointer list-none flex-col justify-end [&::-webkit-details-marker]:hidden">
        {cabeca}
        <svg
          className="mt-2 transition-transform duration-200 group-open:rotate-45"
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke={escuro ? "#E8B44C" : "#B9862F"}
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
        >
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </summary>
      <p className={`mt-2 text-[0.85rem] leading-relaxed ${apoio}`}>{item.resumo}</p>
    </details>
  );
}

function SecaoEspacos() {
  const [auditorio, ...resto] = ESPACOS;

  return (
    <Secao id="espacos">
      <Etiqueta>Espaços</Etiqueta>
      <Titulo>Onde tudo isso acontece.</Titulo>

      {/* O auditório abre a grade ocupando a largura toda. */}
      <div className="mt-7 grid flex-1 grid-cols-2 content-start gap-3">
        <div className="col-span-2 flex aspect-[16/9] flex-col justify-end rounded-[20px] border border-[#17223D]/10 bg-[#17223D]/[0.045] p-5">
          <span className="font-serif text-[1.85rem] font-semibold text-[#17223D]">
            {auditorio.nome}
          </span>
          {auditorio.resumo ? (
            <span className="mt-1 text-sm leading-relaxed text-[#5A657F]">
              {auditorio.resumo}
            </span>
          ) : null}
        </div>

        {resto.map((item) => (
          <CaixaItem key={item.nome} item={item} />
        ))}
      </div>
    </Secao>
  );
}

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
              <div className="mt-3.5 flex flex-col gap-2">
                {valores.material.map((linha) => (
                  <span key={linha.rotulo} className="flex items-baseline gap-3">
                    <span className="flex-1 text-sm text-[#FAF7F0]/72">{linha.rotulo}</span>
                    <span className="text-[0.95rem] font-bold text-[#FAF7F0]">
                      {linha.valor}
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
              {escolhido
                ? `Os valores do ${escolhido.nome} para 2027 serão apresentados na reunião de abertura das matrículas.`
                : "Os valores de 2027 serão apresentados na reunião de abertura das matrículas."}
            </p>
            {!escolhido ? (
              <button
                type="button"
                onClick={() => aoTocar("segmento")}
                className="mt-5 self-start text-sm font-semibold text-[#E8B44C] underline"
              >
                Escolher a etapa do meu filho
              </button>
            ) : null}
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
      <div className="relative size-[5.5rem]">
        <Image
          src="/folder/logo-30-anos.png"
          alt=""
          fill
          sizes="88px"
          className="object-contain"
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

/* ---------------------------------------------------------------- ícones --- */

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
      stroke="#7A5310"
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
