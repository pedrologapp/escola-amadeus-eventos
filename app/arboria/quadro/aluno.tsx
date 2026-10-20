"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { MAX_VERSOES, TODOS, imagem } from "@/lib/arboria-quadro";
import { enviarDescricao, entrar, estadoAluno, responder } from "./actions";

/**
 * O tablet do aluno em "Qual é o quadro?". Uma coisa por tela:
 * escrever a descrição do quadro secreto → adivinhar a descrição de um colega → (rodada 2) reescrever
 * quando o colega erra. A sessão fica guardada no tablet: recarregar a página não perde nada.
 */

const CHAVE = "arboria-quadro";
type Sessao = { codigo: string; aluno: string };
type Estado = Awaited<ReturnType<typeof estadoAluno>>;
type EmRodada = Extract<Estado, { rodada: 1 | 2 }>;

const ler = (): Sessao | null => { try { return JSON.parse(localStorage.getItem(CHAVE) || "null"); } catch { return null; } };
const gravar = (v: Sessao | null) => { try { if (v) localStorage.setItem(CHAVE, JSON.stringify(v)); else localStorage.removeItem(CHAVE); } catch { /* sem armazenamento */ } };

const Tela = ({ children }: { children: React.ReactNode }) => (
  <main className="min-h-screen bg-[#F4F1EA] px-4 py-6 text-[#1d2b2a]"><div className="mx-auto max-w-3xl">{children}</div></main>
);
const Titulo = ({ children }: { children: React.ReactNode }) => <h1 className="font-[family-name:var(--font-serie)] text-3xl leading-tight text-[#0b5c55]">{children}</h1>;
const Botao = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className={`mt-4 w-full rounded-2xl bg-[#0b5c55] py-4 text-lg font-bold text-white disabled:opacity-40 ${p.className ?? ""}`}>{children}</button>
);
const Pintura = ({ id, className = "" }: { id: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element
  <img src={imagem(id)} alt="" width={TODOS[id]?.w} height={TODOS[id]?.h} className={`rounded-xl object-contain ${className}`} />
);

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

  if (!pronto) return <Tela><Loader2 className="mx-auto mt-20 size-8 animate-spin text-[#0b5c55]" /></Tela>;
  if (!sessao) return <Entrada codigoInicial={codigoInicial} entrou={(s) => { gravar(s); setSessao(s); }} />;
  if (!est || !est.ok) return <Tela><Loader2 className="mx-auto mt-20 size-8 animate-spin text-[#0b5c55]" /></Tela>;

  if (est.fase === "entrada") return (
    <Tela><Titulo>Pronto, {est.nome}!</Titulo><p className="mt-3 text-lg">Espere o professor começar. Olhe para a TV.</p></Tela>
  );
  if (est.fase === "final") return (
    <Tela><Titulo>Olhe para a TV</Titulo><p className="mt-3 text-lg">Agora vamos ver juntos algumas descrições da turma.</p></Tela>
  );
  // key: o resultado de um palpite da rodada 1 não fica na tela quando começa a rodada 2
  return <Rodada key={(est as EmRodada).rodada} est={est as EmRodada} sessao={sessao} atualizar={atualizar} />;
}

function Entrada({ codigoInicial, entrou }: { codigoInicial: string; entrou: (s: Sessao) => void }) {
  const [codigo, setCodigo] = useState(codigoInicial);
  const [nome, setNome] = useState("");
  const [mostrar, setMostrar] = useState(true);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const ir = async () => {
    setEnviando(true); setErro("");
    const r = await entrar(codigo, nome, mostrar).catch(() => null);
    setEnviando(false);
    if (r?.ok) entrou({ codigo: r.codigo, aluno: r.aluno }); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  return (
    <Tela>
      <p className="text-sm font-bold tracking-[0.2em] text-[#B07A12]">ARBORIA</p>
      <Titulo>Qual é o quadro?</Titulo>
      <label className="mt-6 block text-sm font-bold">Código da sala (está na TV)</label>
      <input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))} inputMode="numeric"
        className="mt-1 w-full rounded-xl border-2 border-[#0b5c55]/30 bg-white p-3 text-2xl tracking-[0.3em]" />
      <label className="mt-4 block text-sm font-bold">Seu nome</label>
      <input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={40} className="mt-1 w-full rounded-xl border-2 border-[#0b5c55]/30 bg-white p-3 text-xl" />
      <label className="mt-4 flex items-center gap-3 text-base">
        <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} className="size-5" />
        Pode mostrar meu nome na TV no final
      </label>
      {erro && <p className="mt-3 rounded-lg bg-red-50 p-3 text-red-700">{erro}</p>}
      <Botao onClick={ir} disabled={enviando || codigo.length !== 4 || nome.trim().length < 2}>{enviando ? "Entrando…" : "Entrar"}</Botao>
    </Tela>
  );
}

function Rodada({ est, sessao, atualizar }: { est: EmRodada; sessao: Sessao; atualizar: () => Promise<void> }) {
  const [resultado, setResultado] = useState<{ acertou: boolean; certo: string; escolha: string } | null>(null);
  const cabecalho = (
    <p className="mb-2 text-sm font-bold tracking-[0.15em] text-[#B07A12]">
      RODADA {est.rodada} · {est.rodada === 1 ? "4 QUADROS BEM DIFERENTES" : "8 QUADROS PARECIDOS"}
    </p>
  );

  // 1) o resultado do palpite que acabei de dar
  if (resultado) return (
    <Tela>{cabecalho}
      <Titulo>{resultado.acertou ? "Você acertou!" : "Não era esse."}</Titulo>
      <p className="mt-2 text-lg">{resultado.acertou ? "A descrição do seu colega funcionou." : `O quadro descrito era este.${est.rodada === 2 ? " Seu colega vai poder reescrever." : ""}`}</p>
      <Pintura id={resultado.certo} className="mt-4 max-h-[50vh] w-full" />
      <Botao onClick={() => { setResultado(null); atualizar(); }}>Continuar</Botao>
    </Tela>
  );

  // 2) escrever a primeira versão
  if (!est.versoes.length) return <Escrever est={est} sessao={sessao} atualizar={atualizar} cabecalho={cabecalho} />;

  // 3) adivinhar a descrição de um colega
  if (est.tarefa) return <Adivinhar tarefa={est.tarefa} sessao={sessao} cabecalho={cabecalho} respondeu={setResultado} />;

  // 4) reescrever: o colega errou
  if (est.reescrever) return <Escrever est={est} sessao={sessao} atualizar={atualizar} cabecalho={cabecalho} />;

  // 5) esperando
  const ultima = est.versoes[est.versoes.length - 1];
  const situacao = ultima.acertou === true
    ? (ultima.versao === 1 ? "Seu colega acertou de primeira!" : `Seu colega acertou na versão ${ultima.versao}!`)
    : ultima.acertou === false ? "Seu colega não acertou." : ultima.comColega ? "Um colega está lendo a sua descrição…" : "Sua descrição está esperando um colega ficar livre…";
  return (
    <Tela>{cabecalho}
      <Titulo>{situacao}</Titulo>
      <div className="mt-4 flex gap-4">
        <Pintura id={est.quadro} className="max-h-48 w-1/3" />
        <Versoes versoes={est.versoes} />
      </div>
      <p className="mt-6 flex items-center gap-2 text-lg text-[#0b5c55]"><Loader2 className="size-5 animate-spin" /> Esperando a descrição de um colega para você adivinhar…</p>
      {est.adivinhei.feitas > 0 && <p className="mt-2 text-sm text-[#5a6478]">Você já adivinhou {est.adivinhei.feitas} {est.adivinhei.feitas === 1 ? "descrição" : "descrições"} e acertou {est.adivinhei.acertos}.</p>}
    </Tela>
  );
}

function Versoes({ versoes }: { versoes: EmRodada["versoes"] }) {
  return (
    <ol className="flex-1 space-y-2">
      {versoes.map((v) => (
        <li key={v.versao} className="rounded-xl bg-white p-3 text-sm">
          <span className="font-bold text-[#0b5c55]">Versão {v.versao} </span>
          {v.acertou === true && <Check className="inline size-4 text-emerald-600" />}
          {v.acertou === false && <X className="inline size-4 text-red-600" />}
          <p className="mt-1 whitespace-pre-wrap">{v.texto}</p>
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
  const mandar = async () => {
    setEnviando(true); setErro("");
    const r = await enviarDescricao(sessao.codigo, sessao.aluno, texto).catch(() => null);
    setEnviando(false);
    if (r?.ok) await atualizar(); else setErro(r?.erro ?? "Sem internet? Tente de novo.");
  };
  return (
    <Tela>{cabecalho}
      <Titulo>{reescrita ? `Reescreva (versão ${ultima.versao + 1} de ${MAX_VERSOES})` : "Descreva o seu quadro secreto"}</Titulo>
      <p className="mt-2 text-base text-[#3e4a61]">
        {reescrita
          ? "Seu colega escolheu o quadro da direita. O que faltou nas suas palavras para ele achar o certo?"
          : est.rodada === 1
            ? "Só você está vendo este quadro. Escreva de um jeito que um colega consiga achá-lo entre outros quatro."
            : "Agora são 8 quadros muito parecidos. Lembre do jeito dos pintores: a cor exata, onde fica cada coisa e o sentimento."}
        {" "}Não vale escrever o nome do quadro nem do pintor.
      </p>
      {reescrita ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><p className="mb-1 text-sm font-bold text-emerald-700">O seu quadro</p><Pintura id={est.quadro} className="max-h-56 w-full" /></div>
          <div><p className="mb-1 text-sm font-bold text-red-700">O que o colega escolheu</p>{ultima.escolha && <Pintura id={ultima.escolha} className="max-h-56 w-full" />}</div>
        </div>
      ) : (
        <Pintura id={est.quadro} className="mt-4 max-h-[42vh] w-full" />
      )}
      <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={700}
        className="mt-4 w-full rounded-xl border-2 border-[#0b5c55]/30 bg-white p-3 text-lg" placeholder="Descreva aqui…" />
      {reescrita && <p className="text-xs text-[#5a6478]">A versão anterior fica guardada: você está escrevendo uma nova.</p>}
      {erro && <p className="mt-2 rounded-lg bg-red-50 p-3 text-red-700">{erro}</p>}
      <Botao onClick={mandar} disabled={enviando || texto.trim().length < 15 || (reescrita && texto.trim() === ultima.texto.trim())}>
        {enviando ? "Mandando…" : "Mandar para um colega"}
      </Botao>
    </Tela>
  );
}

function Adivinhar({ tarefa, sessao, cabecalho, respondeu }: {
  tarefa: NonNullable<EmRodada["tarefa"]>; sessao: Sessao; cabecalho: React.ReactNode;
  respondeu: (r: { acertou: boolean; certo: string; escolha: string }) => void;
}) {
  const [escolha, setEscolha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const confirmar = async () => {
    if (!escolha) return;
    setEnviando(true);
    const r = await responder(sessao.codigo, sessao.aluno, tarefa.id, escolha).catch(() => null);
    setEnviando(false);
    if (r?.ok) respondeu({ acertou: r.acertou, certo: r.certo, escolha });
  };
  return (
    <Tela>{cabecalho}
      <Titulo>Qual é o quadro?</Titulo>
      <p className="mt-1 text-sm text-[#5a6478]">Leia a descrição de um colega{tarefa.versao > 1 ? ` (ele já reescreveu: versão ${tarefa.versao})` : ""} e toque no quadro que ele descreveu.</p>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-2xl bg-white p-4 text-xl leading-relaxed shadow-sm">{tarefa.texto}</blockquote>
      <div className={`mt-4 grid gap-2 ${tarefa.opcoes.length > 4 ? "grid-cols-4" : "grid-cols-2"}`}>
        {tarefa.opcoes.map((id) => (
          <button key={id} onClick={() => setEscolha(id)}
            className={`overflow-hidden rounded-xl border-4 bg-white p-1 ${escolha === id ? "border-[#B07A12]" : "border-transparent"}`}>
            <Pintura id={id} className="h-32 w-full sm:h-40" />
          </button>
        ))}
      </div>
      <Botao onClick={confirmar} disabled={!escolha || enviando}>{enviando ? "…" : "É esse!"}</Botao>
    </Tela>
  );
}
