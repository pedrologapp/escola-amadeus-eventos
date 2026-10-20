"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Loader2, Send, X } from "lucide-react";
import { MAX_VERSOES, TODOS, imagem } from "@/lib/arboria-quadro";
import { MAX_TROCAS, type Fala } from "@/lib/arboria-guia";
import { conversar, enviarDescricao, entrar, estadoAluno, listaDaTurma, responder } from "./actions";

/**
 * O tablet do aluno em "Qual é o quadro?", com a cara das aulas do Arboria (fundo escuro, Instrument Serif,
 * turquesa e âmbar). Uma coisa por tela: escrever a descrição do quadro secreto → adivinhar a de um colega →
 * (rodadas 2 e 3) reescrever quando o colega erra, conversando com o Arbória, que pergunta e nunca escreve pelo aluno.
 * O aluno entra tocando no próprio nome na lista da turma. Recarregar a página não perde nada.
 */

const CHAVE = "arboria-quadro";
type Sessao = { codigo: string; aluno: string };
type Estado = Awaited<ReturnType<typeof estadoAluno>>;
type EmRodada = Extract<Estado, { rodada: 1 | 2 | 3 }>;
const SUBTITULO = { 1: "4 quadros bem diferentes", 2: "8 quadros parecidos", 3: "8 retratos quase iguais" } as const;

const ler = (): Sessao | null => { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };
const gravar = (v: Sessao | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

// as cores das aulas do Arboria (Aulas/F2-Linguistica)
const c = { bg: "#0b1112", card: "#14201f", linha: "#2a3d3b", creme: "#eef3ef", suave: "#8fa3a0", turq: "#2dd4bf", amar: "#fbbf24" };

const Tela = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen px-5 py-6 font-[family-name:var(--f-tight)]" style={{ background: `radial-gradient(ellipse at 30% 0%, #12201f, ${c.bg} 60%)`, color: c.creme }}>
    <div className="mx-auto max-w-3xl">{children}</div>
  </main>
);
const Rotulo = ({ children }: { children: React.ReactNode }) => <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: c.turq }}>{children}</p>;
const Titulo = ({ children }: { children: React.ReactNode }) => <h1 className="font-[family-name:var(--f-serif)] text-4xl leading-[1.05]">{children}</h1>;
const Texto = ({ children }: { children: React.ReactNode }) => <p className="mt-2 font-[family-name:var(--f-serif)] text-xl leading-snug" style={{ color: c.suave }}>{children}</p>;
const Botao = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`mt-4 w-full rounded-2xl py-4 text-lg font-extrabold disabled:opacity-30 ${p.className ?? ""}`} style={{ background: c.turq, color: "#05201d" }}>{children}</button>
);
const Ficha = ({ children, cor = c.linha }: { children: React.ReactNode; cor?: string }) => (
  <div className="rounded-2xl border-[3px] p-4" style={{ background: c.card, borderColor: cor }}>{children}</div>
);
const Pintura = ({ id, className = "" }: { id: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={imagem(id)} alt="" width={TODOS[id]?.w} height={TODOS[id]?.h} className={`rounded-lg object-contain ${className}`} style={{ boxShadow: "0 18px 40px rgba(0,0,0,.55)" }} />
);
const Carregando = () => <Tela><Loader2 className="mx-auto mt-24 size-8 animate-spin" style={{ color: c.turq }} /></Tela>;

export function Aluno({ codigoInicial }: { codigoInicial: string }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [pronto, setPronto] = useState(false);
  const [est, setEst] = useState<Estado | null>(null);

  useEffect(() => {
    const s = ler();
    // outro código no QR = outra aula: começa de novo
    setSessao(s && (!codigoInicial || s.codigo === codigoInicial) ? s : null);
    setPronto(true);
  }, [codigoInicial]);

  const atualizar = useCallback(async () => {
    if (!sessao) return;
    const r = await estadoAluno(sessao.codigo, sessao.aluno).catch(() => null);
    if (!r) return;
    if (!r.ok) { gravar(null); setSessao(null); return; }
    setEst(r);
  }, [sessao]);

  useEffect(() => {
    if (!sessao) return;
    atualizar();
    const t = setInterval(atualizar, 2500);
    return () => clearInterval(t);
  }, [sessao, atualizar]);

  if (!pronto) return <Carregando />;
  if (!sessao) return <Entrada codigoInicial={codigoInicial} entrou={(s) => { gravar(s); setSessao(s); }} />;
  if (!est || !est.ok) return <Carregando />;

  if (est.fase === "entrada") return (
    <Tela><Rotulo>Arboria · Linguística</Rotulo><Titulo>Pronto, <i style={{ color: c.turq }}>{est.nome}</i>!</Titulo><Texto>Espere o professor começar. Olhe para a TV.</Texto></Tela>
  );
  if (est.fase === "final") return (
    <Tela><Rotulo>Arboria · Linguística</Rotulo><Titulo>Olhe para a <i style={{ color: c.turq }}>TV</i></Titulo><Texto>Agora vamos ver juntos algumas descrições da turma.</Texto></Tela>
  );
  // key: o resultado de um palpite de uma rodada não fica na tela quando começa a próxima
  return <Rodada key={(est as EmRodada).rodada} est={est as EmRodada} sessao={sessao} atualizar={atualizar} />;
}

type Lista = Extract<Awaited<ReturnType<typeof listaDaTurma>>, { ok: true }>;

function Entrada({ codigoInicial, entrou }: { codigoInicial: string; entrou: (s: Sessao) => void }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [lista, setLista] = useState<Lista | null>(null);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // com o código completo, busca a lista da turma (e atualiza quem já entrou)
  useEffect(() => {
    if (codigo.length !== 4) { setLista(null); return; }
    let vivo = true;
    const ver = () => listaDaTurma(codigo).then((r) => { if (!vivo) return; if (r.ok) { setLista(r); setErro(""); } else { setLista(null); setErro(r.erro); } }).catch(() => {});
    ver();
    const t = setInterval(ver, 5000);
    return () => { vivo = false; clearInterval(t); };
  }, [codigo]);

  const ir = async () => {
    if (!escolhido) return;
    setEnviando(true); setErro("");
    const r = await entrar(codigo, escolhido, mostrar).catch(() => null);
    setEnviando(false);
    if (r?.ok) entrou({ codigo: r.codigo, aluno: r.aluno }); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  const nomeEscolhido = lista?.alunos.find((a) => a.id === escolhido)?.nome;
  return (
    <Tela>
      <p className="text-center text-5xl font-extrabold tracking-[-0.045em]">arbor<b style={{ color: c.turq }}>ia</b></p>
      <div className="mt-6"><Rotulo>Fase Linguística</Rotulo><Titulo>Qual é o <i style={{ color: c.turq }}>quadro</i>?</Titulo></div>
      <label className="mt-6 block text-xs font-bold uppercase tracking-[0.14em]" style={{ color: c.amar }}>Código da sala (está na TV)</label>
      <input value={codigo} onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4)); setEscolhido(null); }} inputMode="numeric"
        className="mt-1 w-full rounded-xl border-[3px] p-3 text-3xl font-extrabold tracking-[0.35em] outline-none" style={{ background: c.card, borderColor: c.linha, color: c.creme }} />
      {lista && (
        <>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: c.amar }}>Toque no seu nome · {lista.turma}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {lista.alunos.map((a) => {
              const meu = escolhido === a.id;
              return (
                <button key={a.id} onClick={() => setEscolhido(a.id)} disabled={a.dentro && !meu}
                  className="rounded-xl border-[3px] px-3 py-3 text-left text-base font-semibold disabled:opacity-35"
                  style={{ background: meu ? c.turq : c.card, borderColor: meu ? c.turq : c.linha, color: meu ? "#05201d" : c.creme }}>
                  {a.nome}{a.dentro && <span className="block text-xs font-normal">já entrou</span>}
                </button>
              );
            })}
          </div>
          <label className="mt-4 flex items-center gap-3 text-base" style={{ color: c.suave }}>
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="size-5 accent-[#2dd4bf]" />
            Pode mostrar meu nome na TV no final
          </label>
        </>
      )}
      {erro && <p className="mt-3 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-red-200">{erro}</p>}
      <Botao onClick={ir} disabled={enviando || !escolhido}>{enviando ? "Entrando…" : nomeEscolhido ? `Entrar como ${nomeEscolhido}` : "Entrar"}</Botao>
    </Tela>
  );
}

function Rodada({ est, sessao, atualizar }: { est: EmRodada; sessao: Sessao; atualizar: () => Promise<void> }) {
  const [resultado, setResultado] = useState<{ acertou: boolean; certo: string } | null>(null);
  const cabecalho = <Rotulo>Rodada {est.rodada} · {SUBTITULO[est.rodada]}</Rotulo>;

  // 1) o resultado do palpite que acabei de dar
  if (resultado) return (
    <Tela>{cabecalho}
      <Titulo>{resultado.acertou ? <>Você <i style={{ color: c.turq }}>acertou</i>!</> : <>Não era <i style={{ color: c.amar }}>esse</i>.</>}</Titulo>
      <Texto>{resultado.acertou ? "As palavras do seu colega funcionaram." : `O quadro descrito era este.${est.rodada >= 2 ? " Seu colega vai poder reescrever." : ""}`}</Texto>
      <Pintura id={resultado.certo} className="mx-auto mt-5 max-h-[50vh]" />
      <Botao onClick={() => { setResultado(null); atualizar(); }}>Continuar</Botao>
    </Tela>
  );

  if (!est.versoes.length) return <Escrever est={est} sessao={sessao} atualizar={atualizar} cabecalho={cabecalho} />;
  if (est.tarefa) return <Adivinhar tarefa={est.tarefa} sessao={sessao} cabecalho={cabecalho} respondeu={setResultado} />;
  if (est.reescrever) return <Escrever est={est} sessao={sessao} atualizar={atualizar} cabecalho={cabecalho} />;

  // esperando
  const ultima = est.versoes[est.versoes.length - 1];
  const situacao = ultima.acertou === true
    ? (ultima.versao === 1 ? "Seu colega acertou de primeira!" : `Seu colega acertou na versão ${ultima.versao}!`)
    : ultima.acertou === false ? "Seu colega não acertou." : ultima.comColega ? "Um colega está lendo a sua descrição…" : "Sua descrição está esperando um colega ficar livre…";
  return (
    <Tela>{cabecalho}
      <Titulo>{situacao}</Titulo>
      <div className="mt-5 flex gap-4">
        <Pintura id={est.quadro} className="max-h-48 w-1/3" />
        <Versoes versoes={est.versoes} />
      </div>
      <p className="mt-6 flex items-center gap-2 text-lg font-semibold" style={{ color: c.turq }}><Loader2 className="size-5 animate-spin" /> Esperando a descrição de um colega para você adivinhar…</p>
      {est.adivinhei.feitas > 0 && <p className="mt-2 text-sm" style={{ color: c.suave }}>Você já adivinhou {est.adivinhei.feitas} {est.adivinhei.feitas === 1 ? "descrição" : "descrições"} e acertou {est.adivinhei.acertos}.</p>}
    </Tela>
  );
}

function Versoes({ versoes }: { versoes: EmRodada["versoes"] }) {
  return (
    <ol className="flex-1 space-y-2">
      {versoes.map((v) => (
        <li key={v.versao}>
          <Ficha cor={v.acertou ? c.turq : c.linha}>
            <span className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: c.amar }}>Versão {v.versao} </span>
            {v.acertou === true && <Check className="inline size-4" style={{ color: c.turq }} />}
            {v.acertou === false && <X className="inline size-4 text-red-300" />}
            <p className="mt-1 whitespace-pre-wrap font-[family-name:var(--f-serif)] text-lg leading-snug">{v.texto}</p>
          </Ficha>
        </li>
      ))}
    </ol>
  );
}

function Escrever({ est, sessao, atualizar, cabecalho }: { est: EmRodada; sessao: Sessao; atualizar: () => Promise<void>; cabecalho: React.ReactNode }) {
  const ultima = est.versoes[est.versoes.length - 1];
  const reescrita = !!ultima;
  const [texto, setTexto] = useState(ultima?.texto ?? "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // só as falas do próprio aluno na conversa (as do Arbória nunca viram sugestão de texto)
  const [minhas, setMinhas] = useState<string[]>(() => (ultima?.conversa ?? []).filter((f) => f.de === "aluno").map((f) => f.texto));
  const mandar = async () => {
    setEnviando(true); setErro("");
    const r = await enviarDescricao(sessao.codigo, sessao.aluno, texto).catch(() => null);
    setEnviando(false);
    if (r?.ok) await atualizar(); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  return (
    <Tela>{cabecalho}
      <Titulo>{reescrita ? <>Reescreva <i style={{ color: c.turq }}>(versão {ultima.versao + 1} de {MAX_VERSOES})</i></> : <>Descreva o seu <i style={{ color: c.turq }}>quadro secreto</i></>}</Titulo>
      <Texto>
        {reescrita
          ? "Seu colega escolheu o da direita. Converse com o Arbória e reescreva com as suas palavras."
          : est.rodada === 1
            ? "Só você está vendo este quadro. Escreva de um jeito que um colega consiga achá-lo entre outros quatro."
            : est.rodada === 2
              ? "Agora são 8 quadros muito parecidos. Lembre do jeito dos pintores: a cor exata, onde fica cada coisa e o sentimento."
              : "São 8 retratos da mesma moça, com as mesmas cores. Aqui não vale falar de cor: o que o rosto dela está dizendo?"}
        {est.rodada < 3 && " Não vale escrever o nome do quadro nem do pintor."}
      </Texto>
      {reescrita ? (
        <div className="mt-5 grid grid-cols-2 gap-4">
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: c.turq }}>O seu</p><Pintura id={est.quadro} className="max-h-56 w-full" /></div>
          <div><p className="mb-2 text-xs font-bold uppercase tracking-[0.12em]" style={{ color: c.amar }}>O que o colega escolheu</p>{ultima.escolha && <Pintura id={ultima.escolha} className="max-h-56 w-full" />}</div>
        </div>
      ) : (
        <Pintura id={est.quadro} className="mx-auto mt-5 max-h-[42vh]" />
      )}
      {reescrita && <Guia key={ultima.versao} sessao={sessao} inicial={ultima.conversa} mudou={setMinhas} />}
      {reescrita && minhas.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em]" style={{ color: c.turq }}>O que você disse ao Arbória</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {minhas.map((m, i) => <span key={i} className="rounded-full px-3 py-1 font-[family-name:var(--f-serif)] text-lg" style={{ background: "#0f2a27", color: c.turq }}>“{m}”</span>)}
          </div>
          <p className="mt-1 text-xs" style={{ color: c.suave }}>São palavras suas. Alguma delas cabe na nova descrição?</p>
        </div>
      )}
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={700} placeholder="Descreva aqui…"
        className="mt-5 w-full rounded-2xl p-4 font-[family-name:var(--f-serif)] text-xl leading-snug outline-none" style={{ background: "#f6f1e4", color: "#1d2a3a" }} />
      {reescrita && <p className="mt-1 text-xs" style={{ color: c.suave }}>A versão anterior fica guardada: você está escrevendo uma nova.</p>}
      {erro && <p className="mt-2 rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-red-200">{erro}</p>}
      <Botao onClick={mandar} disabled={enviando || texto.trim().length < 15 || (reescrita && texto.trim() === ultima.texto.trim())}>
        {enviando ? "Mandando…" : "Mandar para um colega"}
      </Botao>
    </Tela>
  );
}

/** A conversa com o Arbória: ele pergunta, o aluno responde. Abre sozinha ao chegar na reescrita. */
function Guia({ sessao, inicial, mudou }: { sessao: Sessao; inicial: Fala[]; mudou: (minhas: string[]) => void }) {
  const [conversa, setConversa] = useState<Fala[]>(inicial);
  const [resposta, setResposta] = useState("");
  const [pensando, setPensando] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  const perguntas = conversa.filter((f) => f.de === "arboria").length;

  const falar = useCallback(async (r?: string) => {
    setPensando(true);
    if (r) setConversa((v) => [...v, { de: "aluno", texto: r }]);
    const res = await conversar(sessao.codigo, sessao.aluno, r).catch(() => null);
    if (res?.ok) setConversa(res.conversa);
    setPensando(false);
  }, [sessao]);

  useEffect(() => { if (!inicial.length) falar(); }, [inicial.length, falar]);
  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [conversa, pensando]);
  useEffect(() => { mudou(conversa.filter((f) => f.de === "aluno").map((f) => f.texto)); }, [conversa, mudou]);

  const mandar = () => { const r = resposta.trim(); if (!r || pensando) return; setResposta(""); falar(r); };
  return (
    <div className="mt-5">
      <Ficha cor={c.amar}>
        <p className="font-[family-name:var(--f-mao)] text-3xl leading-none" style={{ color: c.amar }}>Arbória</p>
        <div className="mt-2 space-y-3">
          {conversa.map((f, i) => f.de === "arboria"
            ? <p key={i} className="font-[family-name:var(--f-serif)] text-xl leading-snug">{f.texto}</p>
            : <p key={i} className="ml-8 rounded-xl px-3 py-2 text-base" style={{ background: "#0f2a27", color: c.turq }}>{f.texto}</p>)}
          {pensando && <p className="flex items-center gap-2" style={{ color: c.suave }}><Loader2 className="size-4 animate-spin" /> pensando…</p>}
          <div ref={fim} />
        </div>
        {perguntas > 0 && perguntas < MAX_TROCAS && conversa[conversa.length - 1]?.de === "arboria" && (
          <div className="mt-3 flex gap-2">
            <input value={resposta} onChange={(e) => setResposta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mandar()} maxLength={300}
              placeholder="Responda o Arbória…" className="flex-1 rounded-xl border-2 px-3 py-2 text-base outline-none" style={{ background: c.bg, borderColor: c.linha, color: c.creme }} />
            <button onClick={mandar} disabled={!resposta.trim() || pensando} className="rounded-xl px-4 disabled:opacity-30" style={{ background: c.amar, color: "#2a1d05" }}><Send className="size-5" /></button>
          </div>
        )}
        {perguntas >= MAX_TROCAS && <p className="mt-3 text-sm" style={{ color: c.suave }}>Agora é com você: reescreva com as suas palavras.</p>}
      </Ficha>
    </div>
  );
}

function Adivinhar({ tarefa, sessao, cabecalho, respondeu }: {
  tarefa: NonNullable<EmRodada["tarefa"]>; sessao: Sessao; cabecalho: React.ReactNode;
  respondeu: (r: { acertou: boolean; certo: string }) => void;
}) {
  const [escolha, setEscolha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    if (!escolha) return;
    setEnviando(true);
    const r = await responder(sessao.codigo, sessao.aluno, tarefa.id, escolha).catch(() => null);
    setEnviando(false);
    if (r?.ok) respondeu({ acertou: r.acertou, certo: r.certo });
  };
  return (
    <Tela>{cabecalho}
      <Titulo>Qual é o <i style={{ color: c.turq }}>quadro</i>?</Titulo>
      <Texto>Leia a descrição de um colega{tarefa.versao > 1 ? ` (ele já reescreveu: versão ${tarefa.versao})` : ""} e toque no quadro que ele descreveu.</Texto>
      <blockquote className="mt-4 whitespace-pre-wrap border-l-[6px] pl-5 font-[family-name:var(--f-serif)] text-2xl italic leading-snug" style={{ borderColor: c.turq }}>{tarefa.texto}</blockquote>
      <div className={`mt-5 grid gap-2 ${tarefa.opcoes.length > 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {tarefa.opcoes.map((id) => (
          <button key={id} onClick={() => setEscolha(id)} className="rounded-xl border-4 p-1" style={{ borderColor: escolha === id ? c.amar : "transparent", background: c.card }}>
            <Pintura id={id} className={`w-full ${id.startsWith("r") ? "h-44 sm:h-56" : "h-32 sm:h-40"}`} />
          </button>
        ))}
      </div>
      <Botao onClick={confirmar} disabled={!escolha || enviando}>{enviando ? "…" : "É esse!"}</Botao>
    </Tela>
  );
}
