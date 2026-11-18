"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { alunosDaTurma, conversa, mandarTexto, prepararArquivo, salvarArquivo, type AlunoQuadro } from "./actions";
import { encolherFoto, extensaoAudio, subir } from "./subir";

/**
 * O diário da formatura, em três passos numa tela só (sem rolar a página):
 * 1. a turma (Grupo V A ou B), em dois quadros grandes;
 * 2. os alunos da turma, em quadradinhos;
 * 3. a conversa do aluno, no jeito do WhatsApp (referência: a conversa da Agenda do Arbória), no papel do caderno:
 *    texto, foto (câmera ou galeria) e áudio gravado ali mesmo. Cada envio vira um balão com a hora.
 * O botão "voltar" do celular volta um passo (history), em vez de sair da página.
 */

type Turma = "A" | "B";
type Tela = { qual: "turma" } | { qual: "alunos"; turma: Turma } | { qual: "conversa"; turma: Turma; aluno: string };

interface Mensagem {
  id: string;
  tipo: "texto" | "foto" | "audio";
  texto: string | null;
  url: string | null;
  duracao: number | null;
  criadoEm: string;
  enviando?: number; // 0..1 enquanto sobe
  falhou?: string;
}

const FUSO = "America/Fortaleza";
const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { timeZone: FUSO, hour: "2-digit", minute: "2-digit" });
const diaDe = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO });
function rotuloDia(iso: string) {
  const d = diaDe(iso);
  if (d === diaDe(new Date().toISOString())) return "hoje";
  if (d === diaDe(new Date(Date.now() - 864e5).toISOString())) return "ontem";
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: FUSO, weekday: "short", day: "2-digit", month: "2-digit" });
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export function Diario() {
  // O passo fica no endereço (?turma=A&aluno=…): o "voltar" do celular volta um passo sem recarregar a página
  // (pushState com URL é o jeito que o roteador do Next acompanha; estado próprio no histórico faz ele recarregar).
  const sp = useSearchParams();
  const t = sp.get("turma"), a = sp.get("aluno");
  const tela: Tela = t === "A" || t === "B" ? (a ? { qual: "conversa", turma: t, aluno: a } : { qual: "alunos", turma: t }) : { qual: "turma" };
  const ir = useCallback((n: Tela) => {
    const q = n.qual === "turma" ? "" : n.qual === "alunos" ? `?turma=${n.turma}` : `?turma=${n.turma}&aluno=${n.aluno}`;
    history.pushState(null, "", `/amigomagico/diario${q}`);
  }, []);
  const voltar = () => {
    if (history.length > 1) history.back();
    else ir(tela.qual === "conversa" ? { qual: "alunos", turma: tela.turma } : { qual: "turma" });
  };

  return (
    <div className="dd-livro">
      {tela.qual === "turma" && <EscolherTurma ir={ir} />}
      {tela.qual === "alunos" && <EscolherAluno turma={tela.turma} ir={ir} voltar={voltar} />}
      {tela.qual === "conversa" && <Conversa turma={tela.turma} alunoId={tela.aluno} voltar={voltar} />}
    </div>
  );
}

function Faixa({ titulo, voltar, menu }: { titulo: string; voltar?: () => void; menu?: boolean }) {
  return (
    <header className="dd-faixa">
      {voltar ? (
        <button className="dd-voltar" onClick={voltar} aria-label="Voltar">‹</button>
      ) : menu ? (
        <a className="dd-voltar" href="/amigomagico" aria-label="Voltar ao menu">‹</a>
      ) : null}
      <img className="dd-logo" src="/amigomagico/img/amadeus-horizontal.webp" alt="Centro Educacional Amadeus" width={560} height={139} />
      <span className="dd-faixa-t">{titulo}</span>
      {voltar && <a className="dd-menu" href="/amigomagico">menu</a>}
      <span className="dd-elastico" aria-hidden="true" />
    </header>
  );
}

function EscolherTurma({ ir }: { ir: (t: Tela) => void }) {
  return (
    <>
      <Faixa titulo="Diário da formatura" menu />
      <main className="dd-folha dd-turmas">
        <p className="dd-intro">Escolha a turma. Depois toque no aluno e registre: escreva, mande foto ou grave um áudio.</p>
        <div className="dd-turmas-grade">
          {(["A", "B"] as Turma[]).map((t) => (
            <button key={t} className="dd-quadro" onClick={() => ir({ qual: "alunos", turma: t })}>
              <img src={t === "A" ? "/amigomagico/img/gato-caderno.webp" : "/amigomagico/img/nuvem-caderno.webp"} alt="" />
              <b>Grupo V {t}</b>
              <span className="dd-ir">abrir ›</span>
            </button>
          ))}
        </div>
      </main>
    </>
  );
}

function EscolherAluno({ turma, ir, voltar }: { turma: Turma; ir: (t: Tela) => void; voltar: () => void }) {
  const [alunos, setAlunos] = useState<AlunoQuadro[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    alunosDaTurma(turma).then((r) => {
      if (!vivo) return;
      if (r.ok) setAlunos(r.alunos);
      else setErro(r.erro);
    });
    return () => {
      vivo = false;
    };
  }, [turma]);
  const feitos = alunos?.filter((a) => a.registros > 0).length ?? 0;
  return (
    <>
      <Faixa titulo={`Grupo V ${turma}`} voltar={voltar} />
      <main className="dd-folha dd-alunos">
        <p className="dd-intro">
          {alunos ? `${alunos.length} crianças · ${feitos} já com registro` : erro ?? "abrindo a turma…"}
        </p>
        {alunos && (
          <div className="dd-grade" style={{ ["--linhas" as string]: Math.ceil(alunos.length / 4) }}>
            {alunos.map((a) => (
              <button key={a.id} className={`dd-aluno ${a.registros ? "tem" : ""}`} onClick={() => ir({ qual: "conversa", turma, aluno: a.id })}>
                <span className="dd-inicial" aria-hidden="true">{a.curto[0]}</span>
                <b>{a.curto}</b>
                {a.registros > 0 && <small>{a.registros}</small>}
              </button>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Conversa({ turma, alunoId, voltar }: { turma: Turma; alunoId: string; voltar: () => void }) {
  const [nome, setNome] = useState("");
  const [msgs, setMsgs] = useState<Mensagem[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const [gravando, setGravando] = useState<{ inicio: number; seg: number } | null>(null);
  const gravador = useRef<{ rec: MediaRecorder; partes: Blob[]; stream: MediaStream; cancelado: boolean } | null>(null);
  const fim = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const galeria = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let vivo = true;
    conversa(alunoId).then((r) => {
      if (!vivo) return;
      if (r.ok) {
        setNome(r.curto);
        setMsgs(r.mensagens);
      } else setErro(r.erro);
    });
    return () => {
      vivo = false;
    };
  }, [alunoId]);
  useEffect(() => {
    fim.current?.scrollIntoView({ block: "end" });
  }, [msgs?.length]);
  useEffect(() => () => gravador.current?.stream.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setGravando((g) => (g ? { ...g, seg: (Date.now() - g.inicio) / 1000 } : g)), 250);
    return () => clearInterval(id);
  }, [gravando?.inicio]); // eslint-disable-line react-hooks/exhaustive-deps

  const trocar = (id: string, m: Partial<Mensagem>) => setMsgs((l) => (l ?? []).map((x) => (x.id === id ? { ...x, ...m } : x)));

  const enviarTexto = async () => {
    const t = texto.trim();
    if (!t) return;
    const tmp = `tmp-${Date.now()}`;
    setMsgs((l) => [...(l ?? []), { id: tmp, tipo: "texto", texto: t, url: null, duracao: null, criadoEm: new Date().toISOString(), enviando: 1 }]);
    setTexto("");
    campo.current?.focus();
    const r = await mandarTexto(alunoId, t);
    if (r.ok) trocar(tmp, { ...r.mensagem, enviando: undefined });
    else trocar(tmp, { enviando: undefined, falhou: r.erro });
  };

  const enviarArquivo = async (tipo: "foto" | "audio", blob: Blob, ext: string, duracao: number | null) => {
    const tmp = `tmp-${Date.now()}`;
    const local = URL.createObjectURL(blob);
    setMsgs((l) => [...(l ?? []), { id: tmp, tipo, texto: null, url: local, duracao, criadoEm: new Date().toISOString(), enviando: 0 }]);
    try {
      const p = await prepararArquivo(alunoId, tipo, ext);
      if (!p.ok) throw new Error(p.erro);
      await subir(p.path, p.token, blob, blob.type, (x) => trocar(tmp, { enviando: Math.max(0.02, x) }));
      const s = await salvarArquivo(alunoId, tipo, p.path, duracao);
      if (!s.ok) throw new Error(s.erro);
      trocar(tmp, { ...s.mensagem, url: local, enviando: undefined }); // segue mostrando a cópia local (já carregada)
    } catch (e) {
      trocar(tmp, { enviando: undefined, falhou: (e as Error).message || "Não foi. Tente de novo." });
    }
  };

  const escolheuFoto = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = [...(ev.target.files ?? [])].slice(0, 10);
    ev.target.value = "";
    for (const f of arquivos) {
      try {
        const jpg = await encolherFoto(f);
        await enviarArquivo("foto", jpg, "jpg", null);
      } catch {
        setErro("Não consegui ler essa foto.");
      }
    }
  };

  const gravar = async () => {
    setErro(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErro("Este celular não deixa gravar áudio pelo site. Mande por texto.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const tipo = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported(t));
      const rec = new MediaRecorder(stream, tipo ? { mimeType: tipo } : undefined);
      const g = { rec, partes: [] as Blob[], stream, cancelado: false };
      rec.ondataavailable = (e) => e.data.size && g.partes.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const seg = (Date.now() - inicio) / 1000;
        if (g.cancelado || seg < 0.8) return;
        const blob = new Blob(g.partes, { type: rec.mimeType || tipo || "audio/webm" });
        enviarArquivo("audio", blob, extensaoAudio(blob.type), seg);
      };
      const inicio = Date.now();
      rec.start(500);
      gravador.current = g;
      setGravando({ inicio, seg: 0 });
    } catch {
      setErro("Não consegui usar o microfone. Confira se o navegador tem permissão.");
    }
  };
  const pararGravacao = (cancelar: boolean) => {
    const g = gravador.current;
    if (!g) return;
    g.cancelado = cancelar;
    if (g.rec.state !== "inactive") g.rec.stop();
    gravador.current = null;
    setGravando(null);
  };

  const lista = msgs ?? [];
  return (
    <>
      <header className="dd-topo">
        <button className="dd-voltar" onClick={voltar} aria-label="Voltar para a turma">‹</button>
        <span className="dd-foto" aria-hidden="true">{nome[0] ?? ""}</span>
        <span className="dd-quem">
          <b>{nome || "…"}</b>
          <small>Grupo V {turma} · diário da formatura</small>
        </span>
        <a className="dd-menu" href="/amigomagico">menu</a>
      </header>
      <div className="dd-falas">
        {msgs === null && !erro && <p className="dd-vazio">abrindo…</p>}
        {msgs?.length === 0 && (
          <p className="dd-vazio">
            Ainda sem registro.
            <br />
            Escreva as respostas, mande fotos ou grave a voz.
          </p>
        )}
        {lista.map((m, i) => {
          const novoDia = i === 0 || diaDe(lista[i - 1].criadoEm) !== diaDe(m.criadoEm);
          return (
            <div key={m.id}>
              {novoDia && <p className="dd-dia"><span>{rotuloDia(m.criadoEm)}</span></p>}
              <div className={`dd-balao ${m.tipo} ${m.falhou ? "falhou" : ""}`}>
                {m.tipo === "texto" && <p>{m.texto}</p>}
                {m.tipo === "foto" && m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    <img src={m.url} alt="Foto do registro" />
                  </a>
                )}
                {m.tipo === "audio" && m.url && <audio src={m.url} controls preload="metadata" />}
                {m.enviando !== undefined && m.tipo !== "texto" && (
                  <span className="dd-barra"><i style={{ width: `${Math.round(m.enviando * 100)}%` }} /></span>
                )}
                <small>
                  {m.tipo === "audio" && m.duracao ? `${mmss(m.duracao)} · ` : ""}
                  {hora(m.criadoEm)}
                  {m.falhou ? " · não foi" : m.enviando !== undefined ? " · enviando" : " ✓"}
                </small>
                {m.falhou && <em>{m.falhou}</em>}
              </div>
            </div>
          );
        })}
        <div ref={fim} />
      </div>
      {erro && <p className="dd-erro" role="alert">{erro}</p>}
      <div className="dd-baixo">
        <input ref={galeria} type="file" accept="image/*" multiple hidden onChange={escolheuFoto} />
        <input ref={camera} type="file" accept="image/*" capture="environment" hidden onChange={escolheuFoto} />
        {gravando ? (
          <div className="dd-gravando">
            <button className="dd-cancelar" onClick={() => pararGravacao(true)}>cancelar</button>
            <span className="dd-rec"><i aria-hidden="true" />gravando {mmss(gravando.seg)}</span>
            <button className="dd-enviar pronto" onClick={() => pararGravacao(false)} aria-label="Parar e enviar o áudio">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5l2.6 7L15 12l-9.4 1.5z" /></svg>
            </button>
          </div>
        ) : (
          <form
            className="dd-escrever"
            onSubmit={(e) => {
              e.preventDefault();
              enviarTexto();
            }}
          >
            <div className="dd-campo">
              <button type="button" className="dd-icone" onClick={() => galeria.current?.click()} aria-label="Mandar foto da galeria">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.5 12.4 19.6a5 5 0 0 1-7.1-7.1l8.5-8.5a3.3 3.3 0 0 1 4.7 4.7l-8.5 8.5a1.7 1.7 0 0 1-2.4-2.4l7.8-7.8" /></svg>
              </button>
              <textarea
                ref={campo}
                rows={1}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={nome ? `Escreva sobre ${nome}` : "Escreva"}
                aria-label="Escreva o registro"
                enterKeyHint="send"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && matchMedia("(pointer: fine)").matches) {
                    e.preventDefault();
                    enviarTexto();
                  }
                }}
              />
              {!texto.trim() && (
                <button type="button" className="dd-icone" onClick={() => camera.current?.click()} aria-label="Tirar foto">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.6" /></svg>
                </button>
              )}
            </div>
            {texto.trim() ? (
              <button type="submit" className="dd-enviar pronto" aria-label="Enviar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5l2.6 7L15 12l-9.4 1.5z" /></svg>
              </button>
            ) : (
              <button type="button" className="dd-enviar mic" onClick={gravar} aria-label="Gravar áudio" disabled={msgs === null}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></svg>
              </button>
            )}
          </form>
        )}
      </div>
    </>
  );
}
