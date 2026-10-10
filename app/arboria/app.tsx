"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { ATIVIDADE, SERIES, primeiroNome, type Chave } from "@/lib/arboria-historia";
import { FORMAS, grade } from "@/lib/arboria-atividade";
import { cadastrar, estado, registrarAtividade, type CriancaHistoria, type Fase, type FilhoEntrada } from "./actions";
import { Trailer, urlTrailer } from "./trailer";

/**
 * O celular do pai na Experiência, com a cara do trailer (tela preta, uma pergunta por vez):
 * cadastra o(s) filho(s), faz a atividade e espera. Quando o admin aperta "Liberar histórias",
 * o trailer de cada filho aparece. O andamento fica guardado no celular (recarregar não perde nada).
 */

const CHAVE_LOCAL = "arboria-exp-2027";
type Etapa = "cadastro" | "atividade" | "espera";
type Filho = FilhoEntrada & { _id: string };
const novo = (): Filho => ({ _id: crypto.randomUUID(), nome: "", serie: "", genero: "", respostas: ATIVIDADE.map(() => null) });

const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE_LOCAL) || "null"); } catch { return null; } };
const gravar = (v: unknown) => { try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(v)); } catch { /* sem armazenamento: segue sem guardar */ } };

export function AppArboria({ demo }: { demo?: CriancaHistoria | null }) {
  const [familia, setFamilia] = useState("");
  const [etapa, setEtapa] = useState<Etapa>("cadastro");
  const [responsavel, setResponsavel] = useState("");
  const [filhos, setFilhos] = useState<Filho[]>([]);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const s = ler();
    if (s?.familia) { setFamilia(s.familia); setEtapa(s.etapa ?? "cadastro"); setResponsavel(s.responsavel ?? ""); setFilhos(s.filhos?.length ? s.filhos : [novo()]); }
    else { setFamilia(crypto.randomUUID()); setFilhos([novo()]); }
    setPronto(true);
  }, []);
  useEffect(() => {
    if (pronto) gravar({ familia, etapa, responsavel, filhos });
  }, [pronto, familia, etapa, responsavel, filhos]);

  if (demo) return <Trailer crianca={demo} />;
  if (!pronto) return <Preto />;
  if (etapa === "cadastro") return <Cadastro responsavel={responsavel} setResponsavel={setResponsavel} filhos={filhos} setFilhos={setFilhos} seguir={() => setEtapa("atividade")} />;
  if (etapa === "atividade") return <Atividade familia={familia} responsavel={responsavel} filhos={filhos} setFilhos={setFilhos} voltar={() => setEtapa("cadastro")} seguir={() => setEtapa("espera")} />;
  return <Espera familia={familia} nomes={filhos.map((f) => primeiroNome(f.nome))} />;
}

/* ---------------- peças da tela (estética do trailer) ---------------- */

const OURO = "#FFC94A";

function Preto({ children }: { children?: React.ReactNode }) {
  return (
    <main className="relative min-h-[100svh] overflow-hidden bg-black px-6 text-[#F4EAD8]">
      <style>{`
        @keyframes arbIn { from { opacity: 0; filter: blur(8px); transform: translateY(10px); } to { opacity: 1; filter: none; transform: none; } }
        .arb-in { animation: arbIn 1s ease both; }
        .arb-in-2 { animation: arbIn 1s ease .5s both; }
        .arb-in-3 { animation: arbIn 1s ease 1s both; }
        @keyframes arbGrao { 0%,100% { transform: translate(0,0) } 50% { transform: translate(-2%,1%) } }
        .arb-luz { position: absolute; inset: -20%; pointer-events: none; background: radial-gradient(circle at 50% 18%, rgba(255,201,74,.10), transparent 45%); animation: arbGrao 9s ease-in-out infinite; }
      `}</style>
      <div className="arb-luz" />
      <div className="relative mx-auto flex min-h-[100svh] max-w-md flex-col">{children}</div>
    </main>
  );
}

// o "selo" de cima, como a abertura do trailer
const Selo = ({ children }: { children: React.ReactNode }) => (
  <p className="arb-in pt-10 text-center text-[10px] font-bold uppercase tracking-[0.42em] text-white/50">{children}</p>
);
const Titulo = ({ children, k }: { children: React.ReactNode; k?: string }) => (
  <h1 key={k} className="arb-in-2 mt-10 text-center font-[family-name:var(--font-serie)] text-[30px] leading-[1.2]">{children}</h1>
);
const Ouro = ({ children }: { children: React.ReactNode }) => <span style={{ color: OURO }}>{children}</span>;

const Botao = ({ children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button {...p} className="w-full rounded-full py-4 text-base font-bold text-[#1B1405] transition active:scale-[.98] disabled:opacity-30" style={{ background: OURO }}>{children}</button>
);
const Opcao = ({ marcada, children, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { marcada?: boolean }) => (
  <button {...p} className={`w-full rounded-2xl border px-5 py-4 text-left text-[16px] font-semibold transition active:scale-[.98] ${marcada ? "border-[#FFC94A] bg-[#FFC94A]/15 text-[#FFE4A0]" : "border-white/20 bg-white/[.04] text-[#F4EAD8]"}`}>{children}</button>
);
const Voltar = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="absolute left-0 top-9 z-10 text-sm text-white/50">‹ voltar</button>
);
const campo = "arb-in-3 mt-10 w-full border-b-2 border-white/25 bg-transparent pb-2 text-center font-[family-name:var(--font-serie)] text-[26px] text-[#FFE4A0] outline-none placeholder:text-white/25 focus:border-[#FFC94A]";

/* ---------------- 1 · cadastro: uma pergunta por tela ---------------- */

type Passo = { t: "abertura" } | { t: "voce" } | { t: "nome"; i: number } | { t: "serie"; i: number } | { t: "genero"; i: number } | { t: "mais" };
const GRUPOS: { nome: string; series: string[] }[] = [
  { nome: "Educação Infantil", series: SERIES.slice(0, 4) },
  { nome: "Fundamental 1", series: SERIES.slice(4, 9) },
  { nome: "Fundamental 2", series: SERIES.slice(9) },
];

function Cadastro({ responsavel, setResponsavel, filhos, setFilhos, seguir }: {
  responsavel: string; setResponsavel: (v: string) => void; filhos: Filho[]; setFilhos: (f: Filho[]) => void; seguir: () => void;
}) {
  const passos: Passo[] = [{ t: "abertura" }, { t: "voce" }, ...filhos.flatMap((_, i) => [{ t: "nome", i }, { t: "serie", i }, { t: "genero", i }] as Passo[]), { t: "mais" }];
  const [n, setN] = useState(0);
  const p = passos[Math.min(n, passos.length - 1)];
  const anda = () => setN((x) => x + 1);
  const volta = () => setN((x) => Math.max(0, x - 1));
  const muda = (i: number, d: Partial<Filho>) => setFilhos(filhos.map((f, k) => (k === i ? { ...f, ...d } : f)));
  const quem = (i: number) => primeiroNome(filhos[i]?.nome || "") || "seu filho(a)";
  const varios = filhos.length > 1;

  if (p.t === "abertura") {
    return (
      <Preto>
        <Selo>Experiência Amadeus · Arboria</Selo>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <p className="arb-in text-center text-[10px] font-bold uppercase tracking-[0.42em] text-white/60">Uma série original Arboria</p>
          <Titulo>Toda série começa com <Ouro>um protagonista.</Ouro></Titulo>
          <p className="arb-in-3 mt-6 text-center text-[16px] leading-relaxed text-white/70">Conte para a gente quem é o seu. No fim do encontro, uma surpresa vai aparecer aqui.</p>
        </div>
        <div className="arb-in-3 pb-10"><Botao onClick={anda}>Começar</Botao></div>
      </Preto>
    );
  }

  if (p.t === "voce") {
    return (
      <Preto>
        <Voltar onClick={volta} />
        <Selo>Créditos</Selo>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <Titulo>Antes de tudo… <Ouro>como podemos te chamar?</Ouro></Titulo>
          <input autoFocus value={responsavel} onChange={(e) => setResponsavel(e.target.value)} autoComplete="name" placeholder="Seu nome" className={campo} onKeyDown={(e) => e.key === "Enter" && responsavel.trim().length >= 2 && anda()} />
        </div>
        <div className="pb-10"><Botao disabled={responsavel.trim().length < 2} onClick={anda}>Continuar</Botao></div>
      </Preto>
    );
  }

  if (p.t === "nome") {
    const f = filhos[p.i];
    return (
      <Preto>
        <Voltar onClick={volta} />
        <Selo>{varios ? `Protagonista ${p.i + 1}` : "O protagonista"}</Selo>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <Titulo k={`n${p.i}`}>{p.i ? <>E quem é <Ouro>o próximo protagonista?</Ouro></> : <>Quem é <Ouro>o protagonista</Ouro> dessa história?</>}</Titulo>
          <input key={f._id} autoFocus value={f.nome} onChange={(e) => muda(p.i, { nome: e.target.value })} placeholder="Nome da criança" className={campo} onKeyDown={(e) => e.key === "Enter" && f.nome.trim().length >= 2 && anda()} />
        </div>
        <div className="pb-10"><Botao disabled={f.nome.trim().length < 2} onClick={anda}>Continuar</Botao></div>
      </Preto>
    );
  }

  if (p.t === "serie") {
    const f = filhos[p.i];
    return (
      <Preto>
        <Voltar onClick={volta} />
        <Selo>{varios ? `Protagonista ${p.i + 1}` : "O protagonista"}</Selo>
        <Titulo k={`s${p.i}`}>Em 2027, <Ouro>{quem(p.i)}</Ouro> vai estar em qual série?</Titulo>
        <div className="arb-in-3 mt-8 space-y-6 pb-10">
          {GRUPOS.map((g) => (
            <div key={g.nome}>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">{g.nome}</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {g.series.map((s) => (
                  <button key={s} onClick={() => { muda(p.i, { serie: s }); setTimeout(anda, 250); }}
                    className={`rounded-xl border py-3 text-[14px] font-semibold ${f.serie === s ? "border-[#FFC94A] bg-[#FFC94A]/15 text-[#FFE4A0]" : "border-white/20 bg-white/[.04]"}`}>{s}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Preto>
    );
  }

  if (p.t === "genero") {
    const f = filhos[p.i];
    return (
      <Preto>
        <Voltar onClick={volta} />
        <Selo>{varios ? `Protagonista ${p.i + 1}` : "O protagonista"}</Selo>
        <div className="flex flex-1 flex-col justify-center pb-16">
          <Titulo k={`g${p.i}`}><Ouro>{quem(p.i)}</Ouro> é…</Titulo>
          <div className="arb-in-3 mt-10 grid grid-cols-2 gap-3">
            {[["menino", "um menino"], ["menina", "uma menina"]].map(([g, t]) => (
              <Opcao key={g} marcada={f.genero === g} onClick={() => { muda(p.i, { genero: g }); setTimeout(anda, 250); }}><span className="block text-center">{t}</span></Opcao>
            ))}
          </div>
        </div>
      </Preto>
    );
  }

  // mais algum filho?
  return (
    <Preto>
      <Voltar onClick={volta} />
      <Selo>Elenco</Selo>
      <div className="flex flex-1 flex-col justify-center pb-10">
        <Titulo>Estrelando: <Ouro>{filhos.map((f) => primeiroNome(f.nome)).join(" e ")}</Ouro>.</Titulo>
        <p className="arb-in-3 mt-6 text-center text-[16px] text-white/70">Tem mais algum filho(a) no Amadeus em 2027?</p>
      </div>
      <div className="arb-in-3 space-y-3 pb-10">
        <Botao onClick={seguir}>Não, só {filhos.length > 1 ? "esses" : primeiroNome(filhos[0].nome)}. Continuar</Botao>
        <button onClick={() => { setFilhos([...filhos, novo()]); setN(passos.length - 1); }} className="w-full rounded-full border border-white/25 py-4 font-semibold text-white/85">Sim, tenho outro filho(a)</button>
      </div>
    </Preto>
  );
}

/* ---------------- 2 · atividade ---------------- */

function Atividade({ familia, responsavel, filhos, setFilhos, voltar, seguir }: {
  familia: string; responsavel: string; filhos: Filho[]; setFilhos: (f: Filho[]) => void; voltar: () => void; seguir: () => void;
}) {
  const [qual, setQual] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const f = filhos[qual];
  const nome = primeiroNome(f.nome);
  const p = f.respostas.findIndex((r) => r === null);
  const responder = (chave: Chave) => {
    const respostas = [...f.respostas]; respostas[p] = chave;
    setFilhos(filhos.map((x, k) => (k === qual ? { ...x, respostas } : x)));
  };
  const desfaz = () => {
    // volta uma pergunta (ou para o cadastro, se for a primeira)
    const ult = f.respostas.findLastIndex((r) => r !== null);
    if (ult < 0) return qual > 0 ? setQual(qual - 1) : voltar();
    const respostas = [...f.respostas]; respostas[ult] = null;
    setFilhos(filhos.map((x, k) => (k === qual ? { ...x, respostas } : x)));
  };
  const terminou = filhos.every((x) => x.respostas.every(Boolean));

  const enviar = async () => {
    setEnviando(true); setErro(null);
    const r = await cadastrar({ familia, responsavel, filhos: filhos.map(({ _id: _x, ...resto }) => resto) }).catch(() => null);
    setEnviando(false);
    if (!r) return setErro("Não consegui enviar. Confira a internet e tente de novo.");
    if (!r.ok) return setErro(r.erro);
    seguir();
  };

  // terminou as perguntas deste filho: passa para o próximo
  useEffect(() => { if (p < 0 && qual < filhos.length - 1) setQual(qual + 1); }, [p, qual, filhos.length]);

  if (terminou) {
    return (
      <Preto>
        <Selo>Fim do roteiro</Selo>
        <div className="flex flex-1 flex-col justify-center pb-10">
          <Titulo>O roteiro <Ouro>está pronto.</Ouro></Titulo>
          <p className="arb-in-3 mt-6 text-center text-[16px] leading-relaxed text-white/70">Agora é só enviar e guardar o celular. Fique de olho na apresentação…</p>
          {erro && <p className="mt-6 rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-center text-sm text-red-200">{erro}</p>}
        </div>
        <div className="arb-in-3 pb-10">
          <Botao onClick={enviar} disabled={enviando}><span className="inline-flex items-center gap-2">{enviando && <Loader2 className="size-5 animate-spin" />} Enviar</span></Botao>
        </div>
      </Preto>
    );
  }
  if (p < 0) return <Preto />;
  const q = ATIVIDADE[p];
  return (
    <Preto>
      <Voltar onClick={desfaz} />
      <Selo>{filhos.length > 1 ? `${nome} · ` : ""}Cena {p + 1} de {ATIVIDADE.length}</Selo>
      <div className="arb-in mt-5 flex gap-1">{ATIVIDADE.map((_, k) => <div key={k} className="h-[3px] flex-1 rounded-full" style={{ background: k < p ? OURO : k === p ? "rgba(255,201,74,.5)" : "rgba(255,255,255,.15)" }} />)}</div>
      <Titulo k={`${qual}-${p}`}>{q.pergunta.split("{nome}").map((parte, k, arr) => <span key={k}>{parte}{k < arr.length - 1 && <Ouro>{nome}</Ouro>}</span>)}</Titulo>
      <div key={`o${qual}-${p}`} className="arb-in-3 mt-8 space-y-3">
        {q.opcoes.map((o) => <Opcao key={o.texto} onClick={() => responder(o.chave)}>{o.texto}</Opcao>)}
      </div>
      <p className="mt-auto pb-8 pt-6 text-center text-xs text-white/40">Não existe resposta certa. Toda criança vai passar por todos os lugares.</p>
    </Preto>
  );
}

/* ---------------- 3 · espera e estreia ---------------- */

function Espera({ familia, nomes }: { familia: string; nomes: string[] }) {
  const [criancas, setCriancas] = useState<CriancaHistoria[]>([]);
  const [antes, setAntes] = useState(false);
  const [aberta, setAberta] = useState<CriancaHistoria | null>(null);
  const [revelando, setRevelando] = useState(false);
  const [fase, setFase] = useState<Fase>(null);
  const [feito, setFeito] = useState<{ r1: boolean; forma: string | null; r2: boolean }>({ r1: false, forma: null, r2: false });
  const [fazendo, setFazendo] = useState<Fase>(null);

  useEffect(() => {
    let vivo = true;
    const ver = async () => {
      const r = await estado(familia).catch(() => null);
      if (!vivo || !r) return;
      setAntes(r.antes); setFase(r.fase); setFeito(r.feito);
      if (r.liberado && r.criancas.length) {
        setCriancas((atual) => { if (!atual.length) { setRevelando(true); setTimeout(() => setRevelando(false), 3200); } return r.criancas; });
      } else setCriancas([]);
    };
    ver();
    const t = setInterval(ver, 3000);
    return () => { vivo = false; clearInterval(t); };
  }, [familia]);

  if (aberta) return <Trailer crianca={aberta} fechar={() => setAberta(null)} />;
  if (fazendo && !criancas.length) {
    const fim = (ok: boolean, forma?: string) => { if (ok) setFeito((f) => (fazendo === "forma" ? { ...f, forma: forma ?? "ok" } : { ...f, [fazendo]: true })); setFazendo(null); };
    if (fazendo === "forma") return <EscolheForma familia={familia} voltar={fim} />;
    return <Lembrar familia={familia} rodada={fazendo === "r1" ? 0 : 1} voltar={fim} />;
  }

  // o cartão da atividade: aparece quando o telão abre cada etapa
  const pendente = fase && !(fase === "forma" ? feito.forma : feito[fase]);
  const cartao: Record<"r1" | "forma" | "r2", [string, string]> = {
    r1: ["A atividade começou", "Toque nas palavras de que você lembra"],
    forma: ["Escolha a sua forma", "Qual das 8 formas você quer usar agora?"],
    r2: ["Agora, com a sua forma", "Toque nas palavras de que você lembra"],
  };

  if (!criancas.length) {
    return (
      <Preto>
        <Selo>Uma série original Arboria</Selo>
        <div className="flex flex-1 flex-col items-center justify-center pb-16 text-center">
          <p className="arb-in text-[11px] font-bold uppercase tracking-[0.5em] text-white/50">Em breve</p>
          <Titulo>{antes ? "Esse cadastro foi feito antes do encontro começar." : <>A série de <Ouro>{nomes.join(" e ")}</Ouro> estreia no fim do encontro.</>}</Titulo>
          <p className="arb-in-3 mt-6 text-[15px] leading-relaxed text-white/60">{antes ? "Fale com a equipe na sala." : "Deixe esta página aberta."}</p>
          {!antes && <div className="arb-in-3 mt-10 flex gap-2">{[0, 1, 2].map((k) => <span key={k} className="size-2 animate-pulse rounded-full" style={{ background: OURO, animationDelay: `${k * 0.3}s` }} />)}</div>}
          {!antes && fase && (
            pendente
              ? <button key={fase} onClick={() => setFazendo(fase)} className="arb-in mt-10 flex w-full items-center gap-4 rounded-2xl border border-[#FFC94A]/60 bg-[#FFC94A]/10 p-4 text-left active:scale-[.98]">
                  <span className="relative flex size-12 shrink-0 items-center justify-center rounded-full text-2xl" style={{ background: OURO }}><span className="absolute inset-0 animate-ping rounded-full" style={{ background: "rgba(255,201,74,.35)" }} />✦</span>
                  <span><b className="block font-[family-name:var(--font-serie)] text-xl font-normal text-[#FFE4A0]">{cartao[fase][0]}</b><span className="text-sm text-white/65">{cartao[fase][1]} · toque aqui</span></span>
                </button>
              : <p key={"ok" + fase} className="arb-in mt-10 rounded-2xl border border-white/15 px-5 py-4 text-[15px] leading-relaxed text-white/75">
                  {fase === "forma" && feito.forma
                    ? <>✓ A sua forma: <b style={{ color: FORMAS.find((x) => x.chave === feito.forma)?.cor ?? OURO }}>{FORMAS.find((x) => x.chave === feito.forma)?.titulo ?? "escolhida"}</b>.<br />Use ela nas próximas palavras. <b className="text-[#FFE4A0]">Olhe a TV.</b></>
                    : <>✓ Enviado! <b className="text-[#FFE4A0]">Agora olhe a TV.</b></>}
                </p>
          )}
        </div>
      </Preto>
    );
  }

  return (
    <Preto>
      {revelando && <Revelacao />}
      <Selo>Estreia</Selo>
      <div className="flex flex-1 flex-col justify-center pb-16">
        <Titulo>{criancas.length > 1 ? <>As séries <Ouro>chegaram.</Ouro></> : <>A série de <Ouro>{primeiroNome(criancas[0].nome)}</Ouro> chegou.</>}</Titulo>
        <div className="arb-in-3 mt-10 space-y-3">
          {criancas.map((c) => (
            <button key={c.id} onClick={() => setAberta(c)} className="flex w-full items-center gap-4 rounded-2xl border border-[#FFC94A]/50 bg-[#FFC94A]/10 p-4 text-left active:scale-[.98]">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full text-xl text-[#1B1405]" style={{ background: OURO }}>▶</span>
              <span><b className="block font-[family-name:var(--font-serie)] text-xl font-normal text-[#FFE4A0]">{primeiroNome(c.nome)}</b><span className="text-sm text-white/60">{c.serie} · toque para assistir</span></span>
            </button>
          ))}
          <Guardar criancas={criancas} />
        </div>
      </div>
    </Preto>
  );
}

/* ---------------- atividade das 15 palavras ---------------- */

// as palavras de que o pai lembra: uma grade com as 15 certas misturadas a 15 parecidas
function Lembrar({ familia, rodada, voltar }: { familia: string; rodada: number; voltar: (ok: boolean, forma?: string) => void }) {
  const palavras = useMemo(() => grade(rodada), [rodada]);
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const alterna = (p: string) => setMarcadas((m) => (m.includes(p) ? m.filter((x) => x !== p) : [...m, p]));
  const enviar = async () => {
    setEnviando(true); setErro(null);
    const r = await registrarAtividade(familia, rodada === 0 ? "r1" : "r2", marcadas).catch(() => null);
    setEnviando(false);
    if (!r?.ok) return setErro("Não consegui enviar. Confira a internet e toque de novo.");
    voltar(true);
  };
  return (
    <Preto>
      <Voltar onClick={() => voltar(false)} />
      <Selo>{rodada === 0 ? "1ª parte" : "2ª parte · com a sua forma"}</Selo>
      <Titulo>Toque nas palavras <Ouro>de que você lembra.</Ouro></Titulo>
      <p className="arb-in-3 mt-3 text-center text-[14px] text-white/55">Algumas delas não estavam na TV. Ninguém vê as suas respostas.</p>
      <div className="arb-in-3 mt-6 flex flex-wrap justify-center gap-2 pb-4">
        {palavras.map((p) => {
          const m = marcadas.includes(p);
          return <button key={p} onClick={() => alterna(p)} className={`rounded-full border px-3.5 py-2 text-[15px] font-semibold transition active:scale-95 ${m ? "border-[#FFC94A] bg-[#FFC94A] text-[#1B1405]" : "border-white/20 bg-white/[.04] text-[#F4EAD8]"}`}>{p}</button>;
        })}
      </div>
      {erro && <p className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-center text-sm text-red-200">{erro}</p>}
      <div className="mt-auto pb-8 pt-4"><Botao disabled={enviando || !marcadas.length} onClick={enviar}><span className="inline-flex items-center gap-2">{enviando && <Loader2 className="size-5 animate-spin" />} Enviar {marcadas.length ? `(${marcadas.length})` : ""}</span></Botao></div>
    </Preto>
  );
}

// a forma que o pai mais gostou (a TV mostra só quantos escolheram cada uma)
function EscolheForma({ familia, voltar }: { familia: string; voltar: (ok: boolean, forma?: string) => void }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const escolhe = async (k: string) => {
    setEnviando(k); setErro(null);
    const r = await registrarAtividade(familia, "forma", k).catch(() => null);
    setEnviando(null);
    if (!r?.ok) return setErro("Não consegui enviar. Confira a internet e toque de novo.");
    voltar(true, k);
  };
  return (
    <Preto>
      <Voltar onClick={() => voltar(false)} />
      <Selo>Escolha a sua forma</Selo>
      <Titulo>Qual forma você <Ouro>quer usar agora?</Ouro></Titulo>
      <div className="arb-in-3 mt-6 space-y-2.5 pb-8">
        {FORMAS.map((f) => (
          <button key={f.chave} disabled={!!enviando} onClick={() => escolhe(f.chave)} className="flex w-full items-start gap-3 rounded-2xl border border-white/20 bg-white/[.04] px-4 py-3.5 text-left active:scale-[.98] disabled:opacity-50">
            <span className="mt-1 size-3.5 shrink-0 rounded-full" style={{ background: f.cor }} />
            <span><b className="block text-[16px] text-[#F4EAD8]">{f.titulo}</b><span className="text-[13px] leading-snug text-white/60">{f.como}</span></span>
            {enviando === f.chave && <Loader2 className="ml-auto size-5 shrink-0 animate-spin text-white/60" />}
          </button>
        ))}
        {erro && <p className="rounded-2xl border border-red-400/40 bg-red-500/10 p-3 text-center text-sm text-red-200">{erro}</p>}
      </div>
    </Preto>
  );
}

// guarda o link da série: abre o menu de compartilhar do celular (WhatsApp, salvar…); sem ele, copia o link
function Guardar({ criancas }: { criancas: CriancaHistoria[] }) {
  const [aviso, setAviso] = useState<string | null>(null);
  const guardar = async () => {
    const links = criancas.map((c) => `${primeiroNome(c.nome)}: ${location.origin}${urlTrailer(c)}`).join("\n");
    const texto = `A série do Arboria 💛\n${links}`;
    try {
      if (navigator.share) { await navigator.share({ title: "A série do Arboria", text: texto }); return; }
      await navigator.clipboard.writeText(texto); setAviso("Link copiado. Cole no seu WhatsApp para guardar.");
    } catch { /* fechou o menu sem escolher */ }
  };
  return (
    <div className="pt-3 text-center">
      <button onClick={guardar} className="w-full rounded-full border border-white/25 py-3.5 font-semibold text-white/85">Guardar no meu celular</button>
      <p className="mt-2 text-xs text-white/45">{aviso ?? "Mande o link para você mesmo no WhatsApp e assista quando quiser."}</p>
    </div>
  );
}

// a luz dourada que abre a tela quando as séries são liberadas
function Revelacao() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      <style>{`
        .rv-luz { position:absolute; width:20px; height:20px; border-radius:50%; background:${OURO}; animation: rvLuz 2.8s ease-out forwards; box-shadow: 0 0 120px 80px rgba(255,201,74,.55); }
        @keyframes rvLuz { 0% { transform: scale(0); opacity: 1 } 60% { transform: scale(60); opacity: .85 } 100% { transform: scale(90); opacity: 0 } }
      `}</style>
      <div className="rv-luz" />
    </div>
  );
}
