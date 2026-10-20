"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Eye, Maximize, RotateCcw, X } from "lucide-react";
import { TODOS, TURMAS, imagem, quadrosDaRodada, type Fase } from "@/lib/arboria-quadro";
import { criarSala, destacar, estadoTv, mudarFase, type Corrente } from "../actions";

/**
 * A TV de "Qual é o quadro?": entrada (QR + nomes) → rodada 1 → rodada 2 → rodada 3 (retratos) → as melhores descrições.
 * No final o professor escolhe uma descrição: a TV mostra só o texto e os quadros, a turma tenta
 * adivinhar, e "Revelar" mostra o quadro certo e o nome de quem escreveu (se o aluno deixou).
 * A sala fica guardada neste computador; "Nova sala" começa outra turma. F = tela cheia.
 */

const CHAVE = "arboria-quadro-tv";
type Sala = { codigo: string; chave: string };
type Estado = Awaited<ReturnType<typeof estadoTv>>;

const ler = (): Sala | null => { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };
const gravar = (v: Sala | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

const Pintura = ({ id, className = "" }: { id: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={imagem(id)} alt="" width={TODOS[id]?.w} height={TODOS[id]?.h} className={`object-contain ${className}`} />
);
const Numero = ({ n, rotulo }: { n: number | string; rotulo: string }) => (
  <div className="rounded-3xl border-[3px] border-[#2a3d3b] bg-[#14201f] px-8 py-6 text-center"><div className="text-7xl font-extrabold">{n}</div><div className="mt-1 text-lg font-bold uppercase tracking-[0.1em] text-[#fbbf24]">{rotulo}</div></div>
);

export function Tv() {
  const [sala, setSala] = useState<Sala | null>(null);
  const [pronto, setPronto] = useState(false);
  const [est, setEst] = useState<Estado | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => { setSala(ler()); setPronto(true); }, []);
  useEffect(() => {
    const f = (e: KeyboardEvent) => { if (e.key === "f" || e.key === "F") document.documentElement.requestFullscreen?.().catch(() => {}); };
    window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f);
  }, []);

  const atualizar = useCallback(async () => {
    if (!sala) return;
    try { setEst(await estadoTv(sala.codigo, sala.chave)); setErro(""); }
    catch { setErro("Sem conexão com a sala…"); }
  }, [sala]);
  useEffect(() => { if (!sala) return; atualizar(); const t = setInterval(atualizar, 2000); return () => clearInterval(t); }, [sala, atualizar]);

  const fase = async (f: Fase) => { if (!sala) return; await mudarFase(sala.codigo, sala.chave, f); atualizar(); };
  const destaque = async (id: string | null, revelado = false) => { if (!sala) return; await destacar(sala.codigo, sala.chave, id, revelado); atualizar(); };

  if (!pronto) return null;
  if (!sala) return <Abrir abriu={(s) => { gravar(s); setSala(s); }} />;
  if (!est) return <Fundo><p className="text-3xl">Abrindo a sala {sala.codigo}…</p>{erro && <p className="mt-4 text-red-300">{erro}</p>}</Fundo>;

  const s = est.sala;
  const barra = (
    <div className="fixed bottom-4 right-4 flex gap-2 opacity-30 transition hover:opacity-100">
      {(["entrada", "r1", "r2", "r3", "final"] as Fase[]).map((f, i) => (
        <button key={f} onClick={() => fase(f)} className={`rounded-full px-4 py-2 text-sm font-bold ${s.fase === f ? "bg-[#fbbf24] text-black" : "bg-white/15"}`}>
          {["Entrada", "Rodada 1", "Rodada 2", "Rodada 3", "Final"][i]}
        </button>
      ))}
      <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} className="rounded-full bg-white/15 px-3"><Maximize className="size-4" /></button>
      <button onClick={() => { if (confirm("Começar uma sala nova? Esta aula sai da TV.")) { gravar(null); setSala(null); setEst(null); } }} className="rounded-full bg-white/15 px-3 text-sm"><RotateCcw className="size-4" /></button>
    </div>
  );

  return (
    <Fundo>
      {s.fase === "entrada" && <Entrada est={est} comecar={() => fase("r1")} />}
      {s.fase === "r1" && <Andamento est={est} rodada={1} proxima={() => fase("r2")} />}
      {s.fase === "r2" && <Andamento est={est} rodada={2} proxima={() => fase("r3")} />}
      {s.fase === "r3" && <Andamento est={est} rodada={3} proxima={() => fase("final")} />}
      {s.fase === "final" && <Final est={est} destaque={destaque} />}
      {erro && <p className="fixed left-4 top-4 rounded bg-red-900/70 px-3 py-1 text-sm">{erro}</p>}
      {barra}
    </Fundo>
  );
}

function Fundo({ children }: { children: React.ReactNode }) {
  return <main className="min-h-screen px-10 py-8 font-[family-name:var(--f-tight)] text-[#eef3ef]" style={{ background: "radial-gradient(ellipse at 30% 20%, #12201f, #0b1112 60%)" }}><div className="mx-auto max-w-[1600px]">{children}</div></main>;
}
const Cabeca = ({ sobre, titulo }: { sobre: string; titulo: string }) => (
  <div><p className="text-lg font-bold uppercase tracking-[0.18em] text-[#2dd4bf]">{sobre}</p><h1 className="font-[family-name:var(--f-serif)] text-7xl leading-[1.02]">{titulo}</h1></div>
);

function Abrir({ abriu }: { abriu: (s: Sala) => void }) {
  const [turma, setTurma] = useState("");
  const [erro, setErro] = useState("");
  const abrir = async () => {
    const r = await criarSala(turma).catch(() => null);
    if (r?.ok) abriu({ codigo: r.codigo, chave: r.chave }); else setErro(r?.erro ?? "Sem internet?");
  };
  return (
    <Fundo>
      <p className="mb-10 text-8xl font-extrabold tracking-[-0.045em]">arbor<b className="text-[#2dd4bf]">ia</b></p>
      <Cabeca sobre="Fase Linguística" titulo="Qual é o quadro?" />
      <p className="mt-8 text-2xl text-white/80">Qual turma vai jogar agora?</p>
      <div className="mt-4 flex gap-4">
        {TURMAS.map((t) => (
          <button key={t} onClick={() => setTurma(t)} className={`rounded-2xl px-10 py-6 text-4xl font-bold ${turma === t ? "bg-[#fbbf24] text-black" : "bg-white/10"}`}>{t}</button>
        ))}
      </div>
      {erro && <p className="mt-4 text-red-300">{erro}</p>}
      <button onClick={abrir} disabled={!turma} className="mt-8 rounded-2xl bg-[#2dd4bf] text-[#05201d] px-10 py-5 text-2xl font-bold disabled:opacity-30">Abrir a sala</button>
    </Fundo>
  );
}

function Entrada({ est, comecar }: { est: Estado; comecar: () => void }) {
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/arboria/quadro?s=${est.sala.codigo}` : "";
  useEffect(() => { if (link) QRCode.toString(link, { type: "svg", margin: 1 }).then(setQr).catch(() => {}); }, [link]);
  return (
    <div className="grid grid-cols-[auto_1fr] gap-12">
      <div className="text-center">
        <div className="w-[420px] rounded-3xl bg-white p-5" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="mt-5 text-2xl text-white/70">ou digite o código</p>
        <p className="text-8xl font-bold tracking-[0.15em] text-[#fbbf24]">{est.sala.codigo}</p>
        <p className="mt-2 text-lg text-white/50">{link.replace(/^https?:\/\//, "").replace(/\?.*/, "")}</p>
      </div>
      <div>
        <Cabeca sobre={`ARBORIA · ${est.sala.turma}`} titulo="Qual é o quadro?" />
        <p className="mt-6 text-3xl text-white/80">Cada um vai receber um quadro secreto e descrever. Um colega vai tentar achar o quadro só pelas suas palavras.</p>
        <p className="mt-8 text-2xl font-bold">{est.alunos.length} {est.alunos.length === 1 ? "aluno entrou" : "alunos entraram"}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {est.alunos.map((a) => <span key={a.id} className="rounded-full bg-white/10 px-4 py-2 text-xl">{a.nome}</span>)}
        </div>
        <button onClick={comecar} disabled={est.alunos.length < 2} className="mt-10 rounded-2xl bg-[#2dd4bf] text-[#05201d] px-10 py-5 text-2xl font-bold disabled:opacity-30">Começar a rodada 1</button>
      </div>
    </div>
  );
}

function Andamento({ est, rodada, proxima }: { est: Estado; rodada: 1 | 2 | 3; proxima: () => void }) {
  const r = rodada === 1 ? est.r1 : rodada === 2 ? est.r2 : est.r3;
  const quadros = quadrosDaRodada(rodada, est.sala.turma);
  return (
    <div>
      <Cabeca sobre={`RODADA ${rodada}`} titulo={rodada === 1 ? "4 quadros bem diferentes" : rodada === 2 ? "8 quadros muito parecidos" : "8 retratos quase iguais"} />
      <p className="mt-4 text-3xl text-white/80">
        {rodada === 1
          ? "Descreva o seu quadro secreto. Depois, adivinhe o quadro de um colega."
          : rodada === 2
            ? "Agora o atalho não funciona. Use a cor exata, o lugar de cada coisa e o sentimento. Se o colega errar, você reescreve."
            : "A mesma moça, as mesmas cores. Não vale falar de cor: diga o que o rosto dela está dizendo."}
      </p>
      <div className={`mt-8 grid gap-3 ${quadros.length > 4 ? "grid-cols-8" : "grid-cols-4"}`}>
        {quadros.map((q) => <Pintura key={q.id} id={q.id} className={`w-full rounded-xl bg-black/30 ${rodada === 3 ? "h-72" : "h-56"}`} />)}
      </div>
      <div className="mt-10 flex flex-wrap gap-6">
        <Numero n={`${r.escreveram}/${est.alunos.length}`} rotulo="já escreveram" />
        <Numero n={r.palpites} rotulo="palpites" />
        <Numero n={r.acertos} rotulo="acertos" />
        {rodada >= 2 && <Numero n={r.primeira} rotulo="acertaram de primeira" />}
        {rodada >= 2 && <Numero n={r.melhorou} rotulo="acertaram depois de reescrever" />}
      </div>
      <button onClick={proxima} className="mt-10 rounded-2xl bg-[#2dd4bf] text-[#05201d] px-10 py-5 text-2xl font-bold">{rodada === 1 ? "Ir para a rodada 2" : rodada === 2 ? "Ir para a rodada 3" : "Ver as melhores descrições"}</button>
    </div>
  );
}

const SELO: Record<Corrente["resultado"], [string, string]> = {
  primeira: ["Acertaram de primeira", "bg-emerald-500/20 text-emerald-200"],
  melhorou: ["Acertaram depois de reescrever", "bg-amber-500/20 text-amber-200"],
  nao: ["Ninguém acertou", "bg-white/10 text-white/60"],
  aberto: ["Ainda em jogo", "bg-white/10 text-white/60"],
};

function Final({ est, destaque }: { est: Estado; destaque: (id: string | null, revelado?: boolean) => void }) {
  const ordem: Corrente["resultado"][] = ["primeira", "melhorou", "aberto", "nao"];
  const lista = [...est.correntes].sort((a, b) => b.rodada - a.rodada || ordem.indexOf(a.resultado) - ordem.indexOf(b.resultado));
  const d = est.destaque;

  if (d) {
    const final = d.versoes.find((v) => v.acertou) ?? d.versoes[d.versoes.length - 1];
    const primeira = d.versoes[0];
    const revelado = est.sala.revelado;
    return (
      <div>
        <div className="flex items-start justify-between gap-6">
          <Cabeca sobre="QUAL É O QUADRO?" titulo={revelado ? (d.mostrarNome ? `Descrição de ${d.nome.split(" ")[0]}` : "Descrição de um colega") : "Leia e tente achar"} />
          <div className="flex gap-3">
            {!revelado && <button onClick={() => destaque(final.id, true)} className="flex items-center gap-2 rounded-2xl bg-[#fbbf24] px-8 py-4 text-2xl font-bold text-black"><Eye className="size-6" /> Revelar</button>}
            <button onClick={() => destaque(null)} className="rounded-2xl bg-white/10 px-8 py-4 text-2xl font-bold">Voltar à lista</button>
          </div>
        </div>
        <div className={`mt-6 grid gap-6 ${revelado && d.versoes.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {revelado && d.versoes.length > 1 && primeira.id !== final.id && (
            <blockquote className="rounded-3xl bg-white/5 p-6 text-2xl leading-relaxed text-white/70">
              <p className="mb-2 text-base font-bold tracking-[0.2em] text-red-300">VERSÃO 1 · O COLEGA ERROU</p>{primeira.texto}
            </blockquote>
          )}
          <blockquote className="rounded-3xl bg-white p-8 text-3xl leading-relaxed text-[#1d2b2a]">
            {revelado && <p className={`mb-2 text-base font-bold tracking-[0.2em] ${final.acertou ? "text-emerald-700" : "text-red-700"}`}>VERSÃO {final.versao} · {final.acertou ? "O COLEGA ACERTOU" : "O COLEGA NÃO ACERTOU"}</p>}
            {final.texto}
          </blockquote>
        </div>
        <div className="mt-6 grid grid-cols-8 gap-3">
          {d.opcoes.map((id) => (
            <div key={id} className={`rounded-xl p-1 transition ${revelado ? (id === d.quadro ? "scale-105 bg-[#fbbf24]" : "opacity-25") : "bg-white/5"}`}>
              <Pintura id={id} className={`w-full rounded-lg ${d.rodada === 3 ? "h-64" : "h-52"}`} />
            </div>
          ))}
        </div>
        {revelado && <p className="mt-4 text-2xl text-white/80">{TODOS[d.quadro]?.titulo} · {TODOS[d.quadro]?.autor}</p>}
      </div>
    );
  }

  return (
    <div>
      <Cabeca sobre="AS DESCRIÇÕES DA TURMA" titulo="As que fizeram o colega acertar" />
      <p className="mt-3 text-2xl text-white/70">Toque em uma: a TV mostra só o texto e os quadros. A turma tenta achar e depois vocês revelam.</p>
      {!lista.length && <p className="mt-10 text-3xl">Ninguém escreveu nas rodadas 2 e 3.</p>}
      <div className="mt-6 grid grid-cols-3 gap-4">
        {lista.map((c, i) => {
          const final = c.versoes.find((v) => v.acertou) ?? c.versoes[c.versoes.length - 1];
          const [rotulo, cor] = SELO[c.resultado];
          return (
            <button key={c.aluno} onClick={() => destaque(final.id)} className="rounded-3xl bg-white/5 p-5 text-left hover:bg-white/10">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-bold">Descrição {i + 1} <span className="text-base font-normal text-white/50">· rodada {c.rodada}</span></span>
                <span className={`rounded-full px-3 py-1 text-sm font-bold ${cor}`}>
                  {c.resultado === "primeira" && <Check className="mr-1 inline size-4" />}{c.resultado === "nao" && <X className="mr-1 inline size-4" />}{rotulo}
                </span>
              </div>
              <p className="mt-2 line-clamp-3 text-lg text-white/70">{final.texto}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
