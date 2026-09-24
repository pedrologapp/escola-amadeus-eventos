"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  BOLHAS_DENTRO,
  BOLHAS_FORA,
  CARTOES_LIVRO,
  COMUNICACAO,
  CONTATO,
  ESPACOS,
  ESPORTES,
  FRASE_ESPORTES,
  MANIFESTO,
  PERCURSO,
  PERGUNTAS,
  DESCONTO_FIDELIDADE,
  DIA_FIDELIDADE,
  PRAZO_ANTECIPADA,
  PROGRAMAS,
  SEGMENTOS,
  VALORES,
  acharSegmento,
  mensagemWhatsapp,
  indiceSegmento,
  type CartaoLivro,
  type IconeComunicacao,
  type IconeEspaco,
  type Peca,
  type SegmentoId,
} from "@/lib/folder-config";

/* As bolhas se apoiam numa medida só, --d, que é o lado do palco. Assim a
   constelação acompanha a largura do celular sem precisar de breakpoint. */
const RAIO_DENTRO = 0.215;
const RAIO_FORA = 0.41;
const TAM_DENTRO = 0.135;
const TAM_FORA = 0.165;
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
        .fd-anel-fora, .fd-contra-fora, .fd-anel-dentro, .fd-contra-dentro { will-change: transform; backface-visibility: hidden }
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
        {/* Anima escala, não largura: largura força o navegador a recalcular
            o layout a cada quadro, e isso trava a rolagem no celular. */}
        <div className="h-[3px] bg-[#FAF7F0]/12">
          <div
            className="h-[3px] w-full origin-left bg-[#E8B44C] transition-transform duration-500"
            style={{ transform: `scaleX(${progresso / 100})` }}
          />
        </div>
      </div>

      <Capa aoTocar={irPara} escolhido={segmento} />
      <SecaoManifesto aoTocar={irPara} />
      <SecaoSegmento escolhido={segmento} aoEscolher={irPara} aoTocar={irPara} />
      <SecaoVideo segmento={segmento} aoEscolher={setSegmento} aoTocar={irPara} />
      <SecaoLivro aoTocar={irPara} />
      <SecaoComunicacao aoTocar={irPara} />
      <SecaoMosaico
        id="programas"
        etiqueta="Programas e projetos"
        titulo="O que ele vive além da aula."
        pecas={PROGRAMAS}
        segmento={segmento}
        alvoContinuar="esportes"
        aoTocar={irPara}
      />
      <SecaoMosaico
        id="esportes"
        escuro
        etiqueta="Esportes"
        titulo="Karatê, futsal, vôlei e ballet."
        apoio={FRASE_ESPORTES}
        pecas={ESPORTES}
        alvoContinuar="espacos"
        aoTocar={irPara}
      />
      <SecaoMosaico
        id="espacos"
        etiqueta="Espaços"
        titulo="Onde tudo isso acontece."
        pecas={ESPACOS}
        alvoContinuar="somos"
        aoTocar={irPara}
      />
      <SecaoSomos aoTocar={irPara} />
      <SecaoValores escolhido={escolhido} aoEscolher={setSegmento} aoTocar={irPara} />
      <SecaoConversa escolhido={escolhido} aoTocar={irPara} />
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
      className="relative flex h-[100svh] min-h-[640px] justify-center overflow-hidden"
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
            onClick={() => aoTocar("manifesto")}
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
  rotulo,
  linhas,
  solida = false,
  ativa = false,
}: {
  angulo: number;
  raio: number;
  tamanho: number;
  classeContra: string;
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
      <span
        className={`${classeContra} flex size-full items-center justify-center rounded-full px-1.5 text-center leading-[1.15] ${
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
      </span>
    </span>
  );
}

/* ------------------------------------------------------------ moldura --- */

function Secao({
  id,
  escuro = false,
  fundo,
  children,
}: {
  id: string;
  escuro?: boolean;
  /** Fundo próprio, pra uma tela poder continuar o visual da anterior. */
  fundo?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`flex min-h-[100svh] pb-12 pt-16 ${
        escuro ? "bg-[#05060C] text-[#FAF7F0]" : "bg-[#FAF7F0] text-[#17223D]"
      }`}
      style={fundo ? { background: fundo } : undefined}
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
        escuro ? "border-[#FAF7F0]/22 text-[#FAF7F0]" : "border-[#17223D]/22 text-[#17223D]"
      }`}
    >
      {rotulo}
      <SetaBaixo cor={escuro ? "#E8B44C" : "#17223D"} />
    </button>
  );
}

/* ------------------------------------------------------------- etapas --- */

/* O poema abre o folder, respondendo a pergunta que a capa deixou no ar.
   O "Continuar" logo abaixo existe pra ninguém se sentir preso: um minuto e
   meio é muito pra quem ainda não sabe o que é essa página. */
function SecaoManifesto({ aoTocar }: { aoTocar: (alvo: string) => void }) {
  if (!MANIFESTO) return null;

  return (
    <Secao
      id="manifesto"
      escuro
      fundo="radial-gradient(130% 80% at 50% 8%, #16224A 0%, #0A0D18 55%, #05060C 100%)"
    >
      {/* Título, vídeo e botão andam juntos no meio da tela. Se o vídeo
          esticasse pra ocupar a altura toda, sobraria um vão preto enorme
          em cima e embaixo dele. */}
      <div className="flex flex-1 flex-col justify-center">
        <Etiqueta escuro>Esse é o nosso folder digital</Etiqueta>
        <h2 className="mt-2 font-serif text-[2.1rem] font-semibold leading-[1.06] text-[#FAF7F0]">
          Seja bem-vindo(a) ao Amadeus!
        </h2>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[#FAF7F0]/68">
          É aqui que você vê a escola inteira: como a gente ensina, o que seu
          filho ou filha vive além da aula, os espaços, os esportes e os valores
          de 2027. Comece pelo vídeo.
        </p>

        {/* poster evita o retângulo preto antes de o pai apertar play, e
            preload="none" não baixa os 13 MB de quem só vai passar direto. */}
        <video
          src={MANIFESTO.src}
          poster={MANIFESTO.capa}
          controls
          playsInline
          preload="none"
          className="mt-5 aspect-video w-full rounded-[22px] border border-[#FAF7F0]/12 bg-[#0B1733] object-cover"
        />

        <Continuar
          alvo="segmento"
          escuro
          aoTocar={aoTocar}
          rotulo="Agora podemos começar!"
        />
      </div>
    </Secao>
  );
}

function SecaoSegmento({
  escolhido,
  aoEscolher,
  aoTocar,
}: {
  escolhido: SegmentoId | null;
  aoEscolher: (alvo: string, seg?: SegmentoId) => void;
  aoTocar: (alvo: string) => void;
}) {
  return (
    <Secao id="segmento" escuro>
      <div className="flex flex-1 flex-col justify-center">
        <Etiqueta escuro>Antes de começar</Etiqueta>
        <Titulo escuro>Qual a idade do seu filho ou filha?</Titulo>
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

      <Continuar alvo="video" escuro aoTocar={aoTocar} />
    </Secao>
  );
}

/* Os três vídeos ficam lado a lado num carrossel: o do meio ocupa quase a
   tela e os vizinhos espiam nas bordas, então o pai entende sozinho que dá
   pra arrastar. Quem parar no card manda na etapa do resto do folder. */
function SecaoVideo({
  segmento,
  aoEscolher,
  aoTocar,
}: {
  segmento: SegmentoId | null;
  aoEscolher: (seg: SegmentoId) => void;
  aoTocar: (alvo: string) => void;
}) {
  const trilho = useRef<HTMLDivElement>(null);
  /* Enquanto o carrossel desliza por ordem nossa, o detector de posição fica
     mudo: senão ele lê a posição no meio do caminho e desfaz a escolha que
     o pai acabou de fazer em outra tela. */
  const rolandoSozinho = useRef(false);
  const atual = segmento ?? "infantil";

  /* Quando a etapa é escolhida em outro lugar (na pergunta, por exemplo),
     o carrossel vai até ela. */
  useEffect(() => {
    const caixa = trilho.current;
    if (!caixa) return;
    const alvo = caixa.children[indiceSegmento(atual)] as HTMLElement | undefined;
    if (!alvo) return;
    rolandoSozinho.current = true;
    caixa.scrollTo({
      left: alvo.offsetLeft - (caixa.clientWidth - alvo.clientWidth) / 2,
      behavior: "smooth",
    });
    const solta = setTimeout(() => {
      rolandoSozinho.current = false;
    }, 800);
    return () => clearTimeout(solta);
  }, [atual]);

  function aoRolar() {
    const caixa = trilho.current;
    if (!caixa || rolandoSozinho.current) return;
    const meio = caixa.scrollLeft + caixa.clientWidth / 2;
    let maisPerto = 0;
    let menorDistancia = Infinity;
    [...caixa.children].forEach((filho, i) => {
      const el = filho as HTMLElement;
      const centro = el.offsetLeft + el.clientWidth / 2;
      const distancia = Math.abs(centro - meio);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisPerto = i;
      }
    });
    const novo = SEGMENTOS[maisPerto];
    if (novo && novo.id !== atual) aoEscolher(novo.id);
  }

  return (
    <Secao id="video" escuro>
      <Etiqueta escuro>O que nós somos</Etiqueta>
      <Titulo escuro>A gente prefere mostrar.</Titulo>
      <p className="mt-3 text-[0.95rem] leading-relaxed text-[#FAF7F0]/68">
        Arraste para o lado e veja a etapa do seu filho.
      </p>

      <div
        ref={trilho}
        onScroll={aoRolar}
        className="-mx-6 mt-6 flex flex-1 snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {SEGMENTOS.map((s) => (
          <article
            key={s.id}
            className={`flex w-[84%] shrink-0 snap-center flex-col overflow-hidden rounded-[22px] border transition-opacity ${
              s.id === atual
                ? "border-[#FAF7F0]/20 opacity-100"
                : "border-[#FAF7F0]/10 opacity-60"
            } bg-[#0B1733]`}
          >
            {s.video ? (
              <video src={s.video} controls playsInline className="w-full flex-1 object-cover" />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
                <span className="grid size-[4.5rem] place-items-center rounded-full bg-[#FAF7F0]">
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="#0B1733" aria-hidden>
                    <path d="M8 5.5v13l11-6.5z" />
                  </svg>
                </span>
                <span className="text-sm leading-relaxed text-[#FAF7F0]/70">
                  O vídeo estreia na reunião de sábado.
                </span>
              </div>
            )}

            <div className="border-t border-[#FAF7F0]/10 px-4 py-3 text-center">
              <span className="block text-[0.95rem] font-bold text-[#FAF7F0]">{s.nome}</span>
              <span className="block text-xs text-[#FAF7F0]/55">{s.series ?? s.idade}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {SEGMENTOS.map((s) => (
          <span
            key={s.id}
            aria-hidden
            className={`h-1.5 rounded-full transition-all ${
              s.id === atual ? "w-5 bg-[#E8B44C]" : "w-1.5 bg-[#FAF7F0]/25"
            }`}
          />
        ))}
      </div>

      <Continuar alvo="livro" escuro aoTocar={aoTocar} />
    </Secao>
  );
}

function SecaoLivro({ aoTocar }: { aoTocar: (alvo: string) => void }) {
  return (
    <Secao id="livro">
      <Etiqueta>O Livro</Etiqueta>
      <h2 className="mt-2 font-serif text-[1.55rem] font-semibold leading-tight text-[#17223D]">
        Em 2027 o material do seu filho muda. O nome dele é
      </h2>
      <p className="-mt-1 font-serif text-[3.6rem] font-semibold leading-[0.95] tracking-tight text-[#B9862F]">
        Geekie
      </p>
      {/* O pai está vendo esse nome pela primeira vez. Antes de qualquer
          detalhe, ele precisa saber que continua sendo livro. */}
      <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5A657F]">
        Se você nunca ouviu falar, tudo bem. Em um minuto você entende o que é, e
        por que a escola escolheu ele.
      </p>

      <div className="mt-4 flex items-center gap-2 text-[0.8rem] font-semibold text-[#5A657F]">
        <span>Arraste para o lado</span>
        <SetaLado cor="#B9862F" direita />
      </div>

      {/* A página /geekie inteira vive aqui dentro, em cartões que o pai
          empurra com o dedo. Ninguém precisa abrir outro site. */}
      <div className="-mx-6 mt-4 flex-1 overflow-x-auto overscroll-x-contain px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {/* As dúvidas que os pais trouxeram na reunião. Ficam fechadas pra não
          ocupar a tela de quem já entendeu. */}
      <div className="mt-6">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.17em] text-[#7A5310]">
          As dúvidas mais comuns
        </p>
        <div className="mt-2">
          {PERGUNTAS.map((p) => (
            <details key={p.pergunta} className="group border-b border-[#17223D]/12">
              <summary className="flex min-h-[3.25rem] cursor-pointer list-none items-center gap-3 py-3 [&::-webkit-details-marker]:hidden">
                <span className="flex-1 text-[0.95rem] font-semibold text-[#17223D]">
                  {p.pergunta}
                </span>
                <svg
                  className="shrink-0 transition-transform duration-200 group-open:rotate-45"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#B9862F"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
              </summary>
              <p className="pb-4 text-[0.85rem] leading-relaxed text-[#5A657F]">
                {p.resposta}
              </p>
            </details>
          ))}
        </div>
      </div>

      <Continuar alvo="comunicacao" aoTocar={aoTocar} />
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

      {cartao.tipo === "gancho" ? (
        <div className="flex flex-1 flex-col justify-center">
          <span className="font-serif text-[1.75rem] font-semibold leading-[1.12]">
            {cartao.pergunta}
          </span>
          <span className={`mt-4 text-[0.92rem] leading-relaxed ${apoio}`}>
            {cartao.resposta}
          </span>
        </div>
      ) : null}

      {cartao.tipo === "oquee" ? (
        <div className="mt-3 flex flex-1 flex-col">
          <span className="text-[1.15rem] font-bold leading-snug">{cartao.titulo}</span>
          <ul className="mt-4 flex flex-col gap-3">
            {cartao.pontos.map((ponto) => (
              <li key={ponto} className="flex gap-2.5">
                <span
                  className={`mt-[0.45rem] size-[5px] shrink-0 rounded-full ${
                    escuro ? "bg-[#E8B44C]" : "bg-[#B9862F]"
                  }`}
                />
                <span className={`flex-1 text-[0.85rem] leading-relaxed ${apoio}`}>
                  {ponto}
                </span>
              </li>
            ))}
          </ul>
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

      {cartao.tipo === "segmentos" ? (
        <div className="mt-3 flex flex-1 flex-col">
          <span className="text-[1.15rem] font-bold leading-snug">{cartao.titulo}</span>
          <div className="mt-4 flex flex-col gap-4">
            {cartao.linhas.map((linha) => (
              <span key={linha.etapa} className="block">
                <span className="flex items-baseline gap-2">
                  <span className={`text-[0.82rem] font-bold ${etiqueta}`}>
                    {linha.etapa}
                  </span>
                  <span className={`text-[0.66rem] ${apoio}`}>{linha.idade}</span>
                </span>
                <span className={`mt-1 block text-[0.82rem] leading-relaxed ${apoio}`}>
                  {linha.texto}
                </span>
              </span>
            ))}
          </div>
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

function SecaoComunicacao({ aoTocar }: { aoTocar: (alvo: string) => void }) {
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

      <Continuar alvo="programas" escuro aoTocar={aoTocar} />
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
  segmento,
  alvoContinuar,
  aoTocar,
}: {
  id: string;
  escuro?: boolean;
  etiqueta: string;
  titulo: string;
  apoio?: string;
  pecas: Peca[];
  /** Quando vem, some o que não existe na etapa do filho. */
  segmento?: SegmentoId | null;
  alvoContinuar: string;
  aoTocar: (alvo: string) => void;
}) {
  const visiveis = segmento
    ? pecas.filter((p) => !p.etapas || p.etapas.includes(segmento))
    : pecas;
  // Sem esse aviso, quem escolheu Infantil acha que a robótica e a educação
  // financeira sumiram por erro, quando elas só não existem nessa etapa.
  const escondeu = segmento ? visiveis.length < pecas.length : false;
  const nomeEtapa = segmento ? acharSegmento(segmento).curto : null;
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
      {escondeu ? (
        <p
          className={`mt-3 text-[0.8rem] leading-relaxed ${
            escuro ? "text-[#E8B44C]" : "text-[#7A5310]"
          }`}
        >
          Mostrando o que existe no {nomeEtapa}. As outras etapas têm mais.
        </p>
      ) : null}
      <Mosaico pecas={visiveis} escuro={escuro} alvoContinuar={alvoContinuar} aoTocar={aoTocar} />
    </Secao>
  );
}

/* As peças têm tamanhos diferentes de propósito. Tocar numa abre a foto
   inteira, sem corte, com o texto embaixo. */
function Mosaico({
  pecas,
  escuro,
  alvoContinuar,
  aoTocar,
}: {
  pecas: Peca[];
  escuro?: boolean;
  alvoContinuar: string;
  aoTocar: (alvo: string) => void;
}) {
  const [aberta, setAberta] = useState<string | null>(null);
  const escolhida = pecas.find((p) => p.nome === aberta) ?? null;

  if (escolhida) {
    return (
      <div className="mt-6 flex flex-1 flex-col">
        {escolhida.foto ? (
          <Image
            src={escolhida.foto.src}
            alt={escolhida.nome}
            width={escolhida.foto.w}
            height={escolhida.foto.h}
            sizes="(max-width: 470px) 92vw, 422px"
            className="w-full rounded-[22px]"
          />
        ) : null}

        <h3
          className={`mt-5 font-serif text-[1.7rem] font-semibold leading-tight ${
            escuro ? "text-[#FAF7F0]" : "text-[#17223D]"
          }`}
        >
          {escolhida.nome}
        </h3>
        {escolhida.nota ? (
          <span
            className={`mt-1 text-[0.72rem] font-semibold uppercase tracking-[0.12em] ${
              escuro ? "text-[#E8B44C]" : "text-[#B9862F]"
            }`}
          >
            {escolhida.nota}
          </span>
        ) : null}
        {escolhida.resumo ? (
          <p
            className={`mt-3 text-[1rem] leading-relaxed ${
              escuro ? "text-[#FAF7F0]/72" : "text-[#5A657F]"
            }`}
          >
            {escolhida.resumo}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => setAberta(null)}
          className={`mt-8 flex min-h-[3.375rem] items-center justify-center gap-2 rounded-full border text-[0.95rem] font-semibold ${
            escuro
              ? "border-[#FAF7F0]/22 text-[#FAF7F0]"
              : "border-[#17223D]/22 text-[#17223D]"
          }`}
        >
          <SetaLado cor={escuro ? "#E8B44C" : "#B9862F"} />
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-1 flex-col">
      <div className="grid grid-cols-2 gap-3 [grid-auto-rows:8.25rem]">
        {pecas.map((peca) => {
          const abrivel = Boolean(peca.foto || peca.resumo);
          return (
            <button
              key={peca.nome}
              type="button"
              disabled={!abrivel}
              onClick={() => setAberta(peca.nome)}
              className={`relative flex flex-col justify-end overflow-hidden rounded-[18px] border p-4 text-left ${
                peca.largo ? "col-span-2" : ""
              } ${peca.alto ? "row-span-2" : ""} ${
                escuro
                  ? "border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05]"
                  : "border-[#17223D]/10 bg-[#17223D]/[0.045]"
              }`}
            >
              {peca.foto ? (
                <>
                  <Image
                    src={peca.foto.src}
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

              {peca.icone ? (
                <span className="absolute left-4 top-4">
                  <IconeEspacoSvg qual={peca.icone} escuro={escuro} />
                </span>
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

              {abrivel ? (
                <span
                  aria-hidden
                  className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full ${
                    peca.foto
                      ? "bg-[#05060C]/60"
                      : escuro
                        ? "bg-[#FAF7F0]/10"
                        : "bg-[#17223D]/[0.08]"
                  }`}
                >
                  <svg
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

      <Continuar alvo={alvoContinuar} escuro={escuro} aoTocar={aoTocar} />
    </div>
  );
}

function IconeEspacoSvg({ qual, escuro }: { qual: IconeEspaco; escuro?: boolean }) {
  const cor = escuro ? "#E8B44C" : "#B9862F";
  const comum = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: cor,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (qual === "auditorio") {
    return (
      <svg {...comum}>
        <path d="M12 3v9" />
        <rect x="9.5" y="3" width="5" height="7" rx="2.5" />
        <path d="M6.5 11a5.5 5.5 0 0 0 11 0" />
        <path d="M8 21h8M12 17v4" />
      </svg>
    );
  }
  if (qual === "quadra") {
    return (
      <svg {...comum}>
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <path d="M12 5v14" />
        <circle cx="12" cy="12" r="2.6" />
        <path d="M3 9h2.5v6H3M21 9h-2.5v6H21" />
      </svg>
    );
  }
  if (qual === "parquinho") {
    return (
      <svg {...comum}>
        <path d="M4 20V8l8-4 8 4v12" />
        <path d="M4 14h16" />
        <path d="M9.5 20v-4.5h5V20" />
      </svg>
    );
  }
  if (qual === "sala") {
    return (
      <svg {...comum}>
        <rect x="3" y="4.5" width="18" height="12" rx="2" />
        <path d="M8.5 20h7M12 16.5V20" />
      </svg>
    );
  }
  if (qual === "lanche") {
    return (
      <svg {...comum}>
        <path d="M6 8h12l-1.2 11a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
    );
  }
  return (
    <svg {...comum}>
      <path d="M4 8h12l-3-3M20 16H8l3 3" />
      <path d="M4 8v3M20 16v-3" />
    </svg>
  );
}

/* A tela de identidade vem logo antes do preço: o pai lê quem somos e só
   então vê o valor. */
function SecaoSomos({ aoTocar }: { aoTocar: (alvo: string) => void }) {
  return (
    <Secao id="somos">
      <div className="flex flex-1 flex-col items-center justify-center gap-7 text-center">
        <h2 className="font-serif text-[2.6rem] font-semibold leading-[1.05] text-[#17223D]">
          Isso é o que nós
          <br />
          <span className="text-[#B9862F]">somos!</span>
        </h2>
        <div className="relative h-[15rem] w-full max-w-[17rem]">
          <Image
            src="/folder/marca-30-anos.png"
            alt="Centro Educacional Amadeus, 30 anos"
            fill
            sizes="272px"
            className="object-contain"
          />
        </div>
      </div>

      <Continuar alvo="valores" aoTocar={aoTocar} />
    </Secao>
  );
}

/* ------------------------------------------------------------- valores --- */

function SecaoValores({
  escolhido,
  aoEscolher,
  aoTocar,
}: {
  escolhido: ReturnType<typeof acharSegmento> | null;
  aoEscolher: (seg: SegmentoId) => void;
  aoTocar: (alvo: string, seg?: SegmentoId) => void;
}) {
  /* Quem não escolheu etapa nenhuma cai no Infantil em vez de ver uma tela
     vazia. Os botões logo abaixo deixam claro que dá pra trocar. */
  const mostrado = escolhido ?? acharSegmento("infantil");
  const valores = VALORES[mostrado.id];

  return (
    <Secao id="valores" escuro>
      <Etiqueta escuro>Investimento 2027</Etiqueta>
      <Titulo escuro>{mostrado.nome}</Titulo>

      {/* Aqui o pai olha as outras etapas sem voltar lá pra cima. Quem tem
          dois filhos precisa comparar. */}
      <div className="mt-4 flex items-center gap-2">
        <SetaLado cor="#E8B44C" />
        {SEGMENTOS.map((s) => {
          const ativo = s.id === mostrado.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => aoEscolher(s.id)}
              className={`min-h-10 flex-1 rounded-full px-2 text-[0.78rem] font-bold transition-colors ${
                ativo
                  ? "bg-[#FAF7F0] text-[#0B1733]"
                  : "border border-[#FAF7F0]/20 text-[#FAF7F0]/70"
              }`}
            >
              {s.curto}
            </button>
          );
        })}
        <SetaLado cor="#E8B44C" direita />
      </div>

      <div className="mt-7 flex flex-1 flex-col gap-4">
        {valores ? (
          <>
            {/* O valor cheio abre a tela e as duas condições aparecem como
                desconto. Assim o pai lê ganho, não letra miúda. */}
            {/* Abre no melhor cenário, que é o que a maioria das famílias da
                reunião vai pagar, com as duas condições à vista logo abaixo.
                O valor sem condição nenhuma fica na nota do rodapé. */}
            <div className="rounded-[22px] bg-[#FAF7F0] p-6">
              <span className="block text-xs uppercase tracking-[0.1em] text-[#5A657F]">
                Mensalidade a partir de
              </span>
              <span className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[0.95rem] text-[#5A657F]">12x de</span>
                <span className="font-serif text-[2.75rem] font-semibold leading-none text-[#B9862F]">
                  {valores.melhor.mensal}
                </span>
              </span>

              <span className="mt-5 block border-t border-[#17223D]/14 pt-4 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[#7A5310]">
                Para chegar nesse valor
              </span>

              <span className="mt-3 flex items-start gap-3">
                <Confere />
                <span className="flex-1 text-[0.88rem] leading-relaxed text-[#454F6B]">
                  Matricule ou renove até <b>{PRAZO_ANTECIPADA}</b>, e a mensalidade
                  fica {valores.antecipada.mensal}.
                </span>
              </span>

              <span className="mt-3 flex items-start gap-3">
                <Confere />
                <span className="flex-1 text-[0.88rem] leading-relaxed text-[#454F6B]">
                  Pague até o <b>dia {DIA_FIDELIDADE}</b> de cada mês, e são{" "}
                  <b>{DESCONTO_FIDELIDADE} a menos, no mês</b>. É a Mensalidade
                  Fidelidade.
                </span>
              </span>

              <span className="mt-4 block border-t border-[#17223D]/14 pt-3.5 text-[0.76rem] leading-relaxed text-[#5A657F]">
                Sem nenhuma das duas condições, a mensalidade 2027 é{" "}
                {valores.cheia.mensal}. A Mensalidade Fidelidade vale sempre, em
                qualquer condição.
              </span>
            </div>

            <div className="rounded-[18px] border border-[#FAF7F0]/12 bg-[#FAF7F0]/[0.05] p-5">
              <span className="block text-[0.95rem] font-bold text-[#FAF7F0]">
                Material didático
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-[#FAF7F0]/68">
                O material Geekie One é comprado à parte, uma vez no ano.
              </span>
              {/* Quando existe tabela promocional, ela vem primeiro: é o valor
                  de quem matricula até 30/10, e é o que a escola quer vender. */}
              <div className="mt-4 flex flex-col gap-5">
                {valores.material.map((linha) => {
                  const destaque = linha.promo ?? linha;
                  return (
                    <span key={linha.rotulo} className="block">
                      <span className="block text-[0.72rem] uppercase tracking-[0.12em] text-[#FAF7F0]/55">
                        {linha.rotulo}
                      </span>
                      {linha.promo ? (
                        <span className="mt-0.5 block text-[0.72rem] font-semibold text-[#E8B44C]">
                          Matriculando até {PRAZO_ANTECIPADA}
                        </span>
                      ) : null}
                      <span className="mt-1 flex items-baseline gap-2">
                        <span className="text-[0.8rem] text-[#FAF7F0]/72">12x de</span>
                        <span className="font-serif text-[1.65rem] font-semibold leading-none text-[#E8B44C]">
                          {destaque.parcela}
                        </span>
                      </span>
                      {linha.promo ? (
                        <span className="mt-1.5 block text-[0.72rem] leading-relaxed text-[#FAF7F0]/45">
                          Depois dessa data, 12x de {linha.parcela}.
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>

              <span className="mt-4 block border-t border-[#FAF7F0]/14 pt-3.5 text-[0.78rem] leading-relaxed text-[#E8B44C]">
                Quem matricular ou renovar até {PRAZO_ANTECIPADA} tem desconto
                no material.
              </span>
            </div>

            <div className="flex items-start gap-2.5">
              <Confere />
              <span className="flex-1 text-sm leading-relaxed text-[#FAF7F0]/72">
                Os tablets são adquiridos pela escola. Você não paga por eles.
              </span>
            </div>
          </>
        ) : null}
      </div>

      {/* Aqui o pai já viu tudo e já viu o preço. O único caminho que
          sobra é falar com gente de verdade, então só existe um botão. */}
      <Continuar alvo="conversa" escuro aoTocar={aoTocar} rotulo="Vamos conversar?" />
    </Secao>
  );
}

/* Última tela. O folder inteiro serviu pra informar; aqui a informação
   sai de cena e fica só o convite de se conhecerem pessoalmente. */
function SecaoConversa({
  escolhido,
  aoTocar,
}: {
  escolhido: ReturnType<typeof acharSegmento> | null;
  aoTocar: (alvo: string) => void;
}) {
  return (
    <Secao
      id="conversa"
      escuro
      fundo="radial-gradient(130% 80% at 50% 30%, #16224A 0%, #0A0D18 58%, #05060C 100%)"
    >
      <div className="flex flex-1 flex-col justify-center">
        <h2 className="font-serif text-[2rem] font-semibold leading-[1.12] text-[#FAF7F0]">
          É bom ter as informações digitalmente, mas nada pode se comparar a
          conhecer <span className="text-[#E8B44C]">pessoalmente!</span>
        </h2>

        <a
          href={`https://wa.me/${CONTATO.whatsapp}?text=${encodeURIComponent(
            mensagemWhatsapp(escolhido ? escolhido.nome : null),
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex min-h-[3.5rem] items-center justify-center gap-2 rounded-full bg-[#FAF7F0] px-6 text-[0.95rem] font-bold text-[#0B1733]"
        >
          <IconeWhatsapp />
          Falar com a escola no WhatsApp
        </a>

        <div className="mt-8 flex items-end gap-3 border-t border-[#FAF7F0]/14 pt-5">
          <span className="flex-1 text-xs leading-relaxed text-[#FAF7F0]/55">
            Centro Educacional Amadeus
            <br />
            São Gonçalo do Amarante, RN
          </span>
          <button
            type="button"
            onClick={() => aoTocar("capa")}
            className="min-h-11 text-xs font-semibold text-[#FAF7F0]/65 underline"
          >
            voltar ao início
          </button>
        </div>
      </div>
    </Secao>
  );
}

function IconeWhatsapp() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="#0B1733" aria-hidden className="shrink-0">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.39a9.86 9.86 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.25-4.39c0-4.54 3.7-8.23 8.23-8.23 2.2 0 4.26.86 5.81 2.42a8.16 8.16 0 0 1 2.41 5.82c0 4.54-3.69 8.24-8.23 8.24zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.71-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.65.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.54c.12.17 1.73 2.64 4.19 3.7.59.26 1.04.4 1.4.52.59.19 1.12.16 1.54.1.47-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29z" />
    </svg>
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
