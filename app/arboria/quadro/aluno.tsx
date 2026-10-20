"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MAX_VERSOES, TODOS, imagem } from "@/lib/arboria-quadro";
import { MAX_TROCAS, type Fala } from "@/lib/arboria-guia";
import { conversar, enviarDescricao, entrar, entrarSemLista, estadoAluno, listaDaTurma, responder } from "./actions";

/**
 * O tablet do aluno em "Qual é o quadro?" (visual em quadro.css: gabinete de museu + caderno do Arboria).
 * Uma coisa por tela: escrever a descrição do quadro secreto → adivinhar a de um colega (sem saber de quem é) →
 * (rodadas 2 e 3) reescrever quando o colega erra, conversando com o Arboria, que pergunta e nunca escreve pelo aluno.
 * Para entrar, o aluno digita o nome e escolhe entre as sugestões da lista da turma. Recarregar não perde nada.
 */

const CHAVE = "arboria-quadro";
type Sessao = { codigo: string; aluno: string };
type Estado = Awaited<ReturnType<typeof estadoAluno>>;
type EmRodada = Extract<Estado, { rodada: 1 | 2 | 3 }>;
const SUBTITULO = { 1: "4 quadros bem diferentes", 2: "8 quadros parecidos", 3: "8 retratos quase iguais" } as const;
const sem = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const ler = (): Sessao | null => { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };
const gravar = (v: Sessao | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

function Tela({ children, sala, rodada }: { children: React.ReactNode; sala?: string; rodada?: number }) {
  return (
    <main className="qq-pag">
      <header className="qq-topo">
        <span className="qq-marca">arbor<b>ia</b></span>
        <span className="qq-meta">{sala ? <>Sala <strong>{sala}</strong></> : "Fase Linguística"}{rodada ? <> · Rodada <strong>{rodada}/3</strong></> : null}</span>
      </header>
      {children}
    </main>
  );
}
function Quadro({ id, legenda, className = "" }: { id: string; legenda?: React.ReactNode; className?: string }) {
  return (
    <figure className={`qq-moldura ${className}`} style={{ margin: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem(id)} alt="" width={TODOS[id]?.w} height={TODOS[id]?.h} />
      {legenda && <figcaption className="qq-etiqueta">{legenda}</figcaption>}
    </figure>
  );
}

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

  if (!pronto) return <Tela><p className="qq-espera">Abrindo</p></Tela>;
  if (!sessao) return <Entrada codigoInicial={codigoInicial} entrou={(s) => { gravar(s); setSessao(s); }} />;
  if (!est || !est.ok) return <Tela sala={sessao.codigo}><p className="qq-espera">Conectando à sala</p></Tela>;

  const encerrada = /^r\df$/.test(est.fase);
  if (est.fase === "entrada" || encerrada || est.fase === "final") return (
    <Tela sala={sessao.codigo} rodada={encerrada ? Number(est.fase[1]) : undefined}>
      <p className="qq-rot">{est.fase === "entrada" ? "Você entrou" : encerrada ? "Rodada encerrada" : "Fim das rodadas"}</p>
      <h1 className="qq-tit">{est.fase === "entrada" ? <>Pronto, <em>{est.nome}</em>.</> : <>Olhe para a <em>TV</em>.</>}</h1>
      <p className="qq-txt">{est.fase === "entrada" ? "Espere o professor começar a primeira rodada." : encerrada ? "O professor vai mostrar como a turma foi em cada quadro. Depois vem a próxima rodada." : "Agora vamos celebrar algumas descrições da turma."}</p>
      <p className="qq-espera">Aguardando o professor</p>
    </Tela>
  );
  // key: o resultado de um palpite de uma rodada não fica na tela quando começa a próxima
  return <Rodada key={(est as EmRodada).rodada} est={est as EmRodada} sessao={sessao} atualizar={atualizar} />;
}

type Lista = Extract<Awaited<ReturnType<typeof listaDaTurma>>, { ok: true }>;

function Entrada({ codigoInicial, entrou }: { codigoInicial: string; entrou: (s: Sessao) => void }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [lista, setLista] = useState<Lista | null>(null);
  const [busca, setBusca] = useState("");
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [foraDaLista, setForaDaLista] = useState(false);
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

  // o aluno digita o nome; aparecem só os nomes da turma que batem (qualquer parte do nome, sem acento)
  const sugestoes = useMemo(() => {
    const b = sem(busca.trim());
    if (!lista || b.length < 2) return [];
    return lista.alunos.filter((a) => b.split(/\s+/).every((p) => sem(a.nome).split(" ").some((n) => n.startsWith(p)))).slice(0, 6);
  }, [busca, lista]);
  const nomeEscolhido = lista?.alunos.find((a) => a.id === escolhido)?.nome;

  const digitado = busca.trim().replace(/s+/g, " ");
  const pronto = foraDaLista ? digitado.replace(/s/g, "").length >= 2 : !!escolhido;
  const ir = async () => {
    if (!pronto) return;
    setEnviando(true); setErro("");
    const r = await (foraDaLista ? entrarSemLista(codigo, digitado, mostrar) : entrar(codigo, escolhido!, mostrar)).catch(() => null);
    setEnviando(false);
    if (r?.ok) entrou({ codigo: r.codigo, aluno: r.aluno }); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  return (
    <Tela>
      <p className="qq-rot">Fase Linguística · semana 3</p>
      <h1 className="qq-tit">Qual é o <em>quadro</em>?</h1>
      <label className="qq-legenda" htmlFor="qq-codigo">Código da sala · está na TV</label>
      <input id="qq-codigo" className="qq-campo codigo" value={codigo} inputMode="numeric" autoComplete="off"
        onChange={(e) => { setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4)); setEscolhido(null); }} />
      {lista && (
        <>
          <label className="qq-legenda" htmlFor="qq-nome">Seu nome · {lista.turma}</label>
          <input id="qq-nome" className="qq-campo" value={busca} autoComplete="off" placeholder={foraDaLista ? "Nome e sobrenome" : "Comece a digitar…"}
            onChange={(e) => { setBusca(e.target.value); setEscolhido(null); }} />
          {sugestoes.length > 0 && !escolhido && !foraDaLista && (
            <div className="qq-nomes">
              {sugestoes.map((a) => (
                <button key={a.id} className="qq-nome" disabled={a.dentro} onClick={() => { setEscolhido(a.id); setBusca(a.nome); }}>
                  {a.nome}<small>{a.dentro ? "já entrou" : "sou eu"}</small>
                </button>
              ))}
            </div>
          )}
          {foraDaLista ? (
            <p className="qq-txt">Escreva seu nome e sobrenome como você quer aparecer. <button className="qq-link" onClick={() => setForaDaLista(false)}>Voltar para a lista</button></p>
          ) : (
            <>
              {busca.trim().length >= 2 && !sugestoes.length && !escolhido && <p className="qq-txt">Nenhum nome da {lista.turma} começa assim.</p>}
              {!escolhido && <button className="qq-link" onClick={() => { setForaDaLista(true); setEscolhido(null); }}>Meu nome não está na lista</button>}
            </>
          )}
          <label className="qq-txt" style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 20 }}>
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} style={{ width: 20, height: 20, accentColor: "#2dd4bf" }} />
            Pode mostrar meu nome na TV no final
          </label>
        </>
      )}
      {erro && <p className="qq-aviso">{erro}</p>}
      <button className="qq-btn" onClick={ir} disabled={enviando || !pronto}>{enviando ? "Entrando" : foraDaLista && pronto ? `Entrar como ${digitado}` : nomeEscolhido ? `Entrar como ${nomeEscolhido}` : "Entrar"}</button>
    </Tela>
  );
}

function Rodada({ est, sessao, atualizar }: { est: EmRodada; sessao: Sessao; atualizar: () => Promise<void> }) {
  const [resultado, setResultado] = useState<{ acertou: boolean; certo: string } | null>(null);
  const rot = <p className="qq-rot">Rodada {est.rodada} · {SUBTITULO[est.rodada]}</p>;

  if (resultado) return (
    <Tela sala={sessao.codigo} rodada={est.rodada}>{rot}
      <h1 className="qq-tit">{resultado.acertou ? <>Você <em>acertou</em>.</> : <>Não era <em>esse</em>.</>}</h1>
      <p className="qq-txt">{resultado.acertou ? "As palavras do seu colega funcionaram." : `O quadro descrito era este.${est.rodada >= 2 ? " Seu colega vai poder reescrever." : ""}`}</p>
      <div className="qq-centro" style={{ marginTop: 24 }}><Quadro id={resultado.certo} legenda={<><b>O quadro certo</b><span>{TODOS[resultado.certo]?.autor.split(",")[0]}</span></>} /></div>
      <button className="qq-btn" onClick={() => { setResultado(null); atualizar(); }}>Continuar</button>
    </Tela>
  );

  if (!est.versoes.length) return <Escrever est={est} sessao={sessao} atualizar={atualizar} rot={rot} />;
  if (est.tarefa) return <Adivinhar tarefa={est.tarefa} sessao={sessao} rodada={est.rodada} rot={rot} respondeu={setResultado} />;
  if (est.reescrever) return <Escrever est={est} sessao={sessao} atualizar={atualizar} rot={rot} />;

  const ultima = est.versoes[est.versoes.length - 1];
  const situacao = ultima.acertou === true
    ? (ultima.versao === 1 ? <>Seu colega acertou <em>de primeira</em>.</> : <>Seu colega acertou <em>na versão {ultima.versao}</em>.</>)
    : ultima.acertou === false ? <>Seu colega <em>não acertou</em>.</> : ultima.comColega ? <>Um colega está <em>lendo</em>.</> : <>Esperando um colega <em>ficar livre</em>.</>;
  return (
    <Tela sala={sessao.codigo} rodada={est.rodada}>{rot}
      <h1 className="qq-tit">{situacao}</h1>
      <div className="qq-par">
        <Quadro id={est.quadro} legenda={<b>O seu quadro</b>} />
        <Versoes versoes={est.versoes} />
      </div>
      <p className="qq-espera">Esperando a descrição de um colega para você adivinhar</p>
      {est.adivinhei.feitas > 0 && <p className="qq-txt">Você já adivinhou {est.adivinhei.feitas} e acertou {est.adivinhei.acertos}.</p>}
    </Tela>
  );
}

function Versoes({ versoes }: { versoes: EmRodada["versoes"] }) {
  return (
    <ol className="qq-versoes">
      {versoes.map((v) => (
        <li key={v.versao}>
          <span className={`n ${v.acertou === true ? "ok" : v.acertou === false ? "x" : ""}`}>Nº {v.versao}{v.acertou === true ? " ✓" : v.acertou === false ? " ✗" : ""}</span>
          <p>{v.texto}</p>
        </li>
      ))}
    </ol>
  );
}

function Escrever({ est, sessao, atualizar, rot }: { est: EmRodada; sessao: Sessao; atualizar: () => Promise<void>; rot: React.ReactNode }) {
  const ultima = est.versoes[est.versoes.length - 1];
  const reescrita = !!ultima;
  const [texto, setTexto] = useState(ultima?.texto ?? "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  // só as falas do próprio aluno na conversa, sem as fora do assunto (as do Arboria nunca viram sugestão de texto)
  const [minhas, setMinhas] = useState<string[]>(() => (ultima?.conversa ?? []).filter((f) => f.de === "aluno" && !f.fora).map((f) => f.texto));
  const mandar = async () => {
    setEnviando(true); setErro("");
    const r = await enviarDescricao(sessao.codigo, sessao.aluno, texto).catch(() => null);
    setEnviando(false);
    if (r?.ok) await atualizar(); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  return (
    <Tela sala={sessao.codigo} rodada={est.rodada}>{rot}
      <h1 className="qq-tit">{reescrita ? <>Reescreva · <em>versão {ultima.versao + 1} de {MAX_VERSOES}</em></> : <>Descreva o seu <em>quadro secreto</em>.</>}</h1>
      <p className="qq-txt">
        {reescrita
          ? "Seu colega escolheu o da direita. Converse com o Arboria e reescreva com as suas palavras."
          : est.rodada === 1
            ? "Só você está vendo este quadro. Escreva de um jeito que um colega consiga achá-lo entre outros quatro."
            : est.rodada === 2
              ? "Agora são 8 quadros muito parecidos. Lembre do jeito dos pintores: a cor exata, onde fica cada coisa e o sentimento."
              : "São 8 retratos da mesma moça, com as mesmas cores. Aqui não vale falar de cor: o que o rosto dela está dizendo?"}
        {est.rodada < 3 && " Não vale escrever o nome do quadro nem do pintor."}
      </p>
      {reescrita ? (
        <div className="qq-par">
          <Quadro id={est.quadro} legenda={<b>O seu</b>} />
          {ultima.escolha && <Quadro id={ultima.escolha} legenda={<b>O que o colega escolheu</b>} />}
        </div>
      ) : (
        <div className="qq-centro" style={{ marginTop: 24 }}><Quadro id={est.quadro} legenda={<><b>Quadro secreto</b><span>só você vê</span></>} /></div>
      )}
      {reescrita && <Guia key={ultima.versao} sessao={sessao} inicial={ultima.conversa} mudou={setMinhas} />}
      {reescrita && minhas.length > 0 && (
        <div className="qq-minhas">
          <span className="qq-legenda">O que você disse ao Arboria</span>
          {minhas.map((m, i) => <q key={i}>{m}</q>)}
          <p className="qq-txt" style={{ fontSize: 16 }}>São palavras suas. Alguma delas cabe na nova descrição?</p>
        </div>
      )}
      <label className="qq-legenda" htmlFor="qq-ficha">{reescrita ? `Versão ${ultima.versao + 1}` : "Sua descrição"}</label>
      <textarea id="qq-ficha" className="qq-ficha" value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={700} placeholder="Escreva aqui…" />
      {reescrita && <p className="qq-txt" style={{ fontSize: 15 }}>A versão anterior fica guardada: você está escrevendo uma nova.</p>}
      {erro && <p className="qq-aviso">{erro}</p>}
      <button className="qq-btn" onClick={mandar} disabled={enviando || texto.trim().length < 15 || (reescrita && texto.trim() === ultima.texto.trim())}>
        {enviando ? "Mandando" : "Mandar para um colega"}
      </button>
    </Tela>
  );
}

/** A conversa com o Arboria: ele pergunta, o aluno responde. Abre sozinha ao chegar na reescrita. */
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
  useEffect(() => { mudou(conversa.filter((f) => f.de === "aluno" && !f.fora).map((f) => f.texto)); }, [conversa, mudou]);

  const mandar = () => { const r = resposta.trim(); if (!r || pensando) return; setResposta(""); falar(r); };
  return (
    <section className="qq-arboria" aria-label="Conversa com o Arboria">
      <p className="qq-arboria-nome">Arboria</p>
      {conversa.map((f, i) => f.de === "arboria"
        ? <p key={i} className="qq-fala">{f.texto}</p>
        : <p key={i} className="qq-fala-aluno">{f.texto}</p>)}
      {pensando && <p className="qq-espera" style={{ marginTop: 4 }}>Pensando</p>}
      <div ref={fim} />
      {perguntas > 0 && perguntas < MAX_TROCAS && conversa[conversa.length - 1]?.de === "arboria" && (
        <div className="qq-resp">
          <input value={resposta} onChange={(e) => setResposta(e.target.value)} onKeyDown={(e) => e.key === "Enter" && mandar()} maxLength={300} placeholder="Responda o Arboria…" aria-label="Sua resposta" />
          <button onClick={mandar} disabled={!resposta.trim() || pensando}>Responder</button>
        </div>
      )}
      {perguntas >= MAX_TROCAS && <p className="qq-txt" style={{ fontSize: 16 }}>Agora é com você: reescreva com as suas palavras.</p>}
    </section>
  );
}

function Adivinhar({ tarefa, sessao, rodada, rot, respondeu }: {
  tarefa: NonNullable<EmRodada["tarefa"]>; sessao: Sessao; rodada: number; rot: React.ReactNode;
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
  const retrato = tarefa.opcoes[0]?.startsWith("r");
  return (
    <Tela sala={sessao.codigo} rodada={rodada}>{rot}
      <h1 className="qq-tit">Qual é o <em>quadro</em>?</h1>
      <p className="qq-txt">A descrição de um colega{tarefa.versao > 1 ? ` (ele já reescreveu: versão ${tarefa.versao})` : ""}. Toque no quadro que ele descreveu.</p>
      <blockquote className="qq-citacao">{tarefa.texto}</blockquote>
      <div className={`qq-opcoes ${tarefa.opcoes.length <= 4 ? "quatro" : ""}`}>
        {tarefa.opcoes.map((id, i) => (
          <button key={id} className={`qq-opcao ${retrato ? "retrato" : ""} ${escolha === id ? "escolhida" : ""}`} onClick={() => setEscolha(id)} aria-label={`Quadro ${i + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagem(id)} alt="" width={TODOS[id]?.w} height={TODOS[id]?.h} />
            <span>Nº {String(i + 1).padStart(2, "0")}</span>
          </button>
        ))}
      </div>
      <button className="qq-btn" onClick={confirmar} disabled={!escolha || enviando}>{enviando ? "Conferindo" : "É esse"}</button>
    </Tela>
  );
}
