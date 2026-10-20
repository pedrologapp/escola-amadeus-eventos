"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { TODOS, TURMAS, imagem, type Fase } from "@/lib/arboria-quadro";
import { celebrar, criarSala, estadoTv, mudarFase } from "../actions";

/**
 * A TV de "Qual é o quadro?" (visual em quadro.css). Entrada (QR + nomes) → rodada N em andamento (sem quadros:
 * só o andamento, para ninguém ver as respostas) → "Encerrar a rodada": aparecem os quadros com a estatística de
 * cada um → próxima rodada → no fim, a celebração: as 3 melhores descrições de cada rodada, escolhidas pela IA, com os nomes.
 * A sala fica guardada neste computador. F = tela cheia. A barra discreta no canto deixa pular de fase.
 */

const CHAVE = "arboria-quadro-tv";
type Sala = { codigo: string; chave: string };
type Estado = Awaited<ReturnType<typeof estadoTv>>;
type Rodada = Estado["rodadas"][number];
const NOME_RODADA = { 1: "4 quadros bem diferentes", 2: "8 quadros parecidos", 3: "8 retratos quase iguais" } as const;
const ORDEM: Fase[] = ["entrada", "r1", "r1f", "r2", "r2f", "r3", "r3f", "final"];

const ler = (): Sala | null => { try { if (new URLSearchParams(location.search).has("nova")) { localStorage.removeItem(CHAVE); history.replaceState(null, "", location.pathname); return null; } return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };
const gravar = (v: Sala | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

function Tela({ children, sala, meta }: { children: React.ReactNode; sala?: string; meta?: React.ReactNode }) {
  return (
    <main className="qq-pag qq-pag-tv">
      <header className="qq-topo">
        <span className="qq-marca" style={{ fontSize: 34 }}>arbor<b>ia</b></span>
        <span className="qq-meta" style={{ fontSize: 15 }}>{sala ? <>Sala <strong>{sala}</strong>{meta}</> : "Fase Linguística · semana 3"}</span>
      </header>
      {children}
    </main>
  );
}

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

  if (!pronto) return null;
  if (!sala) return <Abrir abriu={(s) => { gravar(s); setSala(s); }} />;
  if (!est) return <Tela sala={sala.codigo}><p className="qq-espera">Abrindo a sala</p>{erro && <p className="qq-aviso">{erro}</p>}</Tela>;

  const f = est.sala.fase;
  const n = f.startsWith("r") ? Number(f[1]) as 1 | 2 | 3 : null;
  const meta = <> · {est.sala.turma}{n ? <> · Rodada <strong>{n}/3</strong></> : null}</>;
  return (
    <Tela sala={est.sala.codigo} meta={meta}>
      {f === "entrada" && <Entrada est={est} comecar={() => fase("r1")} />}
      {n && !f.endsWith("f") && <Andamento r={est.rodadas[n - 1]} alunos={est.alunos.length} encerrar={() => fase(`r${n}f` as Fase)} />}
      {n && f.endsWith("f") && <Encerrada key={f} est={est} sala={sala} atualizar={atualizar} r={est.rodadas[n - 1]} turma={est.sala.turma} proxima={() => fase(n < 3 ? (`r${n + 1}` as Fase) : "final")} />}
      {f === "final" && <Celebracao est={est} sala={sala} atualizar={atualizar} />}
      {erro && <p className="qq-aviso" style={{ position: "fixed", left: 16, top: 16 }}>{erro}</p>}
      <nav className="qq-barra-prof" aria-label="Fases da aula">
        {ORDEM.map((o) => (
          <button key={o} className={f === o ? "on" : ""} onClick={() => fase(o)}>
            {o === "entrada" ? "Entrada" : o === "final" ? "Final" : o.endsWith("f") ? `R${o[1]} fim` : `R${o[1]}`}
          </button>
        ))}
        <button onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>Tela cheia</button>
        <button onClick={() => { gravar(null); setSala(null); setEst(null); }}>Nova sala</button>
      </nav>
    </Tela>
  );
}

function Abrir({ abriu }: { abriu: (s: Sala) => void }) {
  const [turma, setTurma] = useState("");
  const [erro, setErro] = useState("");
  const abrir = async () => {
    const r = await criarSala(turma).catch(() => null);
    if (r?.ok) abriu({ codigo: r.codigo, chave: r.chave }); else setErro(r?.erro ?? "Sem internet?");
  };
  return (
    <Tela>
      <p className="qq-rot" style={{ fontSize: 16 }}>Fase Linguística · semana 3</p>
      <h1 className="qq-tit qq-tit-tv">Qual é o <em>quadro</em>?</h1>
      <p className="qq-txt qq-txt-tv">Qual turma vai jogar agora?</p>
      <div className="qq-turmas">
        {TURMAS.map((t) => <button key={t} className={turma === t ? "on" : ""} onClick={() => setTurma(t)}>{t}</button>)}
      </div>
      {erro && <p className="qq-aviso">{erro}</p>}
      <div style={{ maxWidth: 520 }}><button className="qq-btn" onClick={abrir} disabled={!turma}>Abrir a sala</button></div>
    </Tela>
  );
}

function Entrada({ est, comecar }: { est: Estado; comecar: () => void }) {
  const [qr, setQr] = useState("");
  const link = typeof window !== "undefined" ? `${window.location.origin}/arboria/quadro?s=${est.sala.codigo}` : "";
  useEffect(() => { if (link) QRCode.toString(link, { type: "svg", margin: 0, color: { dark: "#1d2a3a", light: "#f3ecdd" } }).then(setQr).catch(() => {}); }, [link]);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 64, alignItems: "start" }}>
      <div>
        <div className="qq-qr" dangerouslySetInnerHTML={{ __html: qr }} />
        <p className="qq-legenda" style={{ fontSize: 15 }}>ou digite o código</p>
        <p className="qq-codigo">{est.sala.codigo}</p>
        <p className="qq-meta" style={{ textAlign: "left", marginTop: 8 }}>{link.replace(/^https?:\/\//, "").replace(/\?.*/, "")}</p>
      </div>
      <div>
        <p className="qq-rot" style={{ fontSize: 16 }}>Fase Linguística · {est.sala.turma}</p>
        <h1 className="qq-tit qq-tit-tv">Qual é o <em>quadro</em>?</h1>
        <p className="qq-txt qq-txt-tv">Cada um recebe um quadro secreto e descreve. Um colega vai tentar achar o quadro só pelas suas palavras.</p>
        <p className="qq-legenda" style={{ fontSize: 15, marginTop: 40 }}>{est.alunos.length} {est.alunos.length === 1 ? "aluno entrou" : "alunos entraram"}</p>
        <div className="qq-chips">{est.alunos.map((a) => <span key={a.id}>{a.nome}</span>)}</div>
        <div style={{ maxWidth: 560 }}><button className="qq-btn" onClick={comecar} disabled={est.alunos.length < 2}>Começar a rodada 1</button></div>
      </div>
    </div>
  );
}

/** Durante a rodada a TV não mostra quadros: só o andamento da turma. */
function Andamento({ r, alunos, encerrar }: { r: Rodada; alunos: number; encerrar: () => void }) {
  return (
    <div>
      <p className="qq-rot" style={{ fontSize: 16 }}>Rodada {r.rodada} · {NOME_RODADA[r.rodada as 1 | 2 | 3]} · em andamento</p>
      <h1 className="qq-tit qq-tit-tv">{r.rodada === 1 ? <>Descrevam o <em>quadro secreto</em>.</> : r.rodada === 2 ? <>Agora o atalho <em>não funciona</em>.</> : <>Não vale <em>falar de cor</em>.</>}</h1>
      <p className="qq-txt qq-txt-tv">
        {r.rodada === 1 ? "Escreva para um colega achar o seu quadro. Depois, adivinhe o quadro de um colega."
          : r.rodada === 2 ? "Use a cor exata, o lugar de cada coisa e o sentimento. Se o colega errar, você reescreve com o Arboria."
          : "A mesma moça, as mesmas cores. Diga o que o rosto dela está dizendo."}
      </p>
      <div className="qq-placar">
        <div><b>{r.escreveram}<small style={{ fontSize: 48, color: "#8fa3a0" }}>/{alunos}</small></b><span>já escreveram</span></div>
        <div><b>{r.palpites}</b><span>palpites</span></div>
        <div><b>{r.acertos}</b><span>acertos</span></div>
        {r.rodada >= 2 && <div><b>{r.melhorou}</b><span>acertaram ao reescrever</span></div>}
      </div>
      <div style={{ maxWidth: 560 }}><button className="qq-btn" onClick={encerrar}>Encerrar a rodada</button></div>
    </div>
  );
}

/** Rodada encerrada: agora aparecem os quadros, cada um com quantos o descreveram e como foi a 1ª versão. */
function Encerrada({ est, sala, atualizar, r, turma, proxima }: { est: Estado; sala: Sala; atualizar: () => Promise<void>; r: Rodada; turma: string; proxima: () => void }) {
  const oito = r.quadros.length > 4;
  const [vendo, setVendo] = useState(false);
  const seguir = <button className="qq-btn" onClick={proxima}>{r.rodada < 3 ? `Começar a rodada ${r.rodada + 1}` : "Celebrar as melhores descrições"}</button>;
  if (vendo) return (
    <div>
      <Melhores est={est} sala={sala} atualizar={atualizar} rodada={r.rodada as 1 | 2 | 3} />
      <div style={{ display: "flex", gap: 16, maxWidth: 1000 }}>
        <button className="qq-btn contorno" onClick={() => setVendo(false)}>Voltar aos quadros</button>
        {r.rodada < 3 && seguir}
      </div>
    </div>
  );
  return (
    <div>
      <p className="qq-rot" style={{ fontSize: 16 }}>Rodada {r.rodada} · encerrada · {turma}</p>
      <h1 className="qq-tit qq-tit-tv" style={{ fontSize: 72 }}>Como a turma foi em <em>cada quadro</em></h1>
      <div className={`qq-tv-grade ${oito ? "oito" : ""}`}>
        {r.quadros.map((q, i) => {
          const total = Math.max(q.descreveram, 1);
          return (
            <figure key={q.id} className="qq-moldura" style={{ margin: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagem(q.id)} alt="" width={TODOS[q.id]?.w} height={TODOS[q.id]?.h} />
              <figcaption className="qq-etiqueta"><b>Nº {String(i + 1).padStart(2, "0")}</b><span>{q.descreveram} {q.descreveram === 1 ? "descreveu" : "descreveram"}</span></figcaption>
              <div className="qq-conta" aria-hidden="true">
                <i style={{ width: `${(100 * q.primeira) / total}%`, background: "#0f766e" }} />
                <i style={{ width: `${(100 * q.depois) / total}%`, background: "#d4a017" }} />
                <i style={{ width: `${(100 * q.nunca) / total}%`, background: "#b4432f" }} />
              </div>
              <div className="qq-numeros">
                <span className="ok">✓ {q.primeira} de 1ª</span>
                <span className="x">✗ {q.errou1} errou na 1ª</span>
                {r.rodada >= 2 && <span className="dep">↻ {q.depois} depois</span>}
              </div>
            </figure>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 16, maxWidth: 1000 }}>
        {r.rodada < 3 ? <button className="qq-btn" onClick={() => setVendo(true)}>Ver as 3 melhores da rodada</button> : null}
        {seguir}
      </div>
    </div>
  );
}

/** As 3 melhores de uma rodada, logo depois de encerrá-la (a IA escolhe na primeira vez; depois fica guardado). */
function Melhores({ est, sala, atualizar, rodada }: { est: Estado; sala: Sala; atualizar: () => Promise<void>; rodada: 1 | 2 | 3 }) {
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    celebrar(sala.codigo, sala.chave, rodada).catch(() => {}).finally(() => { atualizar().finally(() => { if (vivo) setPronto(true); }); });
    return () => { vivo = false; };
  }, [sala, rodada, atualizar]);
  if (!pronto) return (
    <div>
      <p className="qq-rot" style={{ fontSize: 16 }}>Rodada {rodada} · encerrada</p>
      <h1 className="qq-tit qq-tit-tv">O Arboria está lendo <em>as descrições</em>.</h1>
      <p className="qq-espera" style={{ fontSize: 18 }}>Escolhendo três</p>
    </div>
  );
  return <TresMelhores est={est} rodada={rodada} />;
}

function TresMelhores({ est, rodada }: { est: Estado; rodada: number }) {
  const destas = est.melhores.filter((m) => m.rodada === rodada);
  return (
    <>
      <div className="qq-folhas" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => <i key={i} style={{ left: `${(i * 4.7) % 100}%`, animationDuration: `${7 + (i % 5)}s`, animationDelay: `${(i % 7) * 0.9}s`, ["--x" as string]: `${(i % 2 ? 1 : -1) * (30 + (i % 4) * 25)}px` }} />)}
      </div>
      <p className="qq-rot" style={{ fontSize: 16 }}>Celebração · rodada {rodada} · {NOME_RODADA[rodada as 1 | 2 | 3]}</p>
      <h1 className="qq-tit qq-tit-tv" style={{ fontSize: 80 }}>Três descrições <em>para lembrar</em></h1>
      {destas.length ? (
        <div className="qq-celebra">
          {destas.map((m, i) => (
            <article key={i}>
              <figure className="qq-moldura" style={{ margin: 0 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagem(m.quadro)} alt="" width={TODOS[m.quadro]?.w} height={TODOS[m.quadro]?.h} />
                <figcaption className="qq-etiqueta"><b>{TODOS[m.quadro]?.titulo}</b></figcaption>
              </figure>
              <p className="quem">{m.nome ?? "Um colega"}</p>
              <p className="texto">“{m.texto}”</p>
              <p className="motivo">{m.motivo}{m.versao > 1 ? ` · acertou na versão ${m.versao}` : ""}</p>
            </article>
          ))}
        </div>
      ) : <p className="qq-txt qq-txt-tv">Nesta rodada ninguém chegou ao quadro certo.</p>}
    </>
  );
}

/** A celebração: a IA escolhe as 3 melhores de cada rodada; a TV mostra uma rodada por vez, com o nome de quem escreveu. */
function Celebracao({ est, sala, atualizar }: { est: Estado; sala: Sala; atualizar: () => Promise<void> }) {
  const [rodada, setRodada] = useState(1);
  const [pronto, setPronto] = useState(false);
  useEffect(() => {
    let vivo = true;
    celebrar(sala.codigo, sala.chave).catch(() => {}).finally(() => { atualizar().finally(() => { if (vivo) setPronto(true); }); });
    return () => { vivo = false; };
  }, [sala, atualizar]);

  if (!pronto) return (
    <div>
      <p className="qq-rot" style={{ fontSize: 16 }}>Fim das rodadas</p>
      <h1 className="qq-tit qq-tit-tv">O Arboria está lendo <em>todas as descrições</em>.</h1>
      <p className="qq-espera" style={{ fontSize: 18 }}>Escolhendo três de cada rodada</p>
    </div>
  );
  const rodadasComMelhores = [1, 2, 3].filter((r) => est.melhores.some((m) => m.rodada === r));
  return (
    <div>
      <TresMelhores est={est} rodada={rodada} />
      <div style={{ display: "flex", gap: 16, maxWidth: 900 }}>
        {rodadasComMelhores.filter((r) => r !== rodada).map((r) => (
          <button key={r} className="qq-btn contorno" onClick={() => setRodada(r)}>Rodada {r}</button>
        ))}
      </div>
    </div>
  );
}
