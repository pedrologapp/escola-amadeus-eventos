"use client";

import { useEffect, useState } from "react";
import { Camera, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { ATIVIDADE, SERIES, primeiroNome, type Chave } from "@/lib/arboria-historia";
import { cadastrar, estado, type CriancaHistoria, type FilhoEntrada } from "./actions";
import { Historia } from "./historia";

/**
 * O celular do pai na Experiência: cadastra o(s) filho(s), faz a atividade e espera.
 * Quando o admin aperta "Liberar histórias", a história de cada filho aparece com um efeito.
 * O andamento fica guardado no celular (recarregar a página não perde nada).
 */

const CHAVE_LOCAL = "arboria-exp-2027";
type Etapa = "cadastro" | "atividade" | "espera";
type Filho = FilhoEntrada & { _id: string };
const novo = (): Filho => ({ _id: crypto.randomUUID(), nome: "", serie: "", genero: "", pele: "", cabelo: "", respostas: ATIVIDADE.map(() => null), foto: null, fotoAutorizada: false });

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
    // a foto não fica guardada no celular (é pesada); o resto sim
    if (pronto) gravar({ familia, etapa, responsavel, filhos: filhos.map((f) => ({ ...f, foto: null })) });
  }, [pronto, familia, etapa, responsavel, filhos]);

  if (demo) return <Historia crianca={demo} />;
  if (!pronto) return null;
  if (etapa === "cadastro") return <Cadastro responsavel={responsavel} setResponsavel={setResponsavel} filhos={filhos} setFilhos={setFilhos} seguir={() => setEtapa("atividade")} />;
  if (etapa === "atividade") return <Atividade familia={familia} responsavel={responsavel} filhos={filhos} setFilhos={setFilhos} voltar={() => setEtapa("cadastro")} seguir={() => setEtapa("espera")} />;
  return <Espera familia={familia} nomes={filhos.map((f) => primeiroNome(f.nome))} />;
}

/* ---------------- 1 · cadastro ---------------- */

const campo = "w-full rounded-2xl border border-[#D9DEE8] bg-white px-4 py-3 text-base text-[#0A2F7A] outline-none focus:border-[#0A2F7A]";
const PELES = [{ v: "clara", cor: "#F3D2B3" }, { v: "morena", cor: "#C68A5E" }, { v: "negra", cor: "#6B4430" }];
const CABELOS = [{ v: "liso", t: "Liso" }, { v: "cacheado", t: "Ondulado / cacheado" }, { v: "crespo", t: "Crespo" }];

function Cadastro({ responsavel, setResponsavel, filhos, setFilhos, seguir }: {
  responsavel: string; setResponsavel: (v: string) => void; filhos: Filho[]; setFilhos: (f: Filho[]) => void; seguir: () => void;
}) {
  const muda = (id: string, d: Partial<Filho>) => setFilhos(filhos.map((f) => (f._id === id ? { ...f, ...d } : f)));
  const completo = filhos.every((f) => f.nome.trim().length >= 2 && f.serie && f.genero && f.pele && f.cabelo && (!f.foto || f.fotoAutorizada));
  return (
    <Tela>
      <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-[#B07A12]">Experiência Amadeus · Arboria</p>
      <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0A2F7A]">A jornada do seu filho em 2027</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-[#3E4A61]">Conte quem ele(a) é. No fim do encontro, uma surpresa vai aparecer aqui. 💛</p>

      <label className="mt-6 block">
        <span className="text-sm font-semibold text-[#3E4A61]">Seu nome</span>
        <input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" className={`${campo} mt-1`} />
      </label>

      {filhos.map((f, k) => (
        <div key={f._id} className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-lg font-bold text-[#0A2F7A]">{filhos.length > 1 ? `${k + 1}º filho(a)` : "Seu filho(a)"}</p>
            {filhos.length > 1 && <button onClick={() => setFilhos(filhos.filter((x) => x._id !== f._id))} className="p-1 text-[#9AA3B4]" aria-label="Tirar"><Trash2 className="size-5" /></button>}
          </div>
          <input value={f.nome} onChange={(e) => muda(f._id, { nome: e.target.value })} placeholder="Nome da criança" className={`${campo} mt-3`} />
          <select value={f.serie} onChange={(e) => muda(f._id, { serie: e.target.value })} className={`${campo} mt-3 ${f.serie ? "" : "text-[#9AA3B4]"}`}>
            <option value="" disabled>Série em 2027</option>
            {SERIES.map((s) => <option key={s} value={s} className="text-[#0A2F7A]">{s}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {["menino", "menina"].map((g) => (
              <button key={g} onClick={() => muda(f._id, { genero: g })} className={`rounded-2xl border-2 py-3 font-bold capitalize ${f.genero === g ? "border-[#0A2F7A] bg-[#0A2F7A] text-white" : "border-[#D9DEE8] text-[#0A2F7A]"}`}>{g}</button>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-[#3E4A61]">Para o personagem ficar parecido:</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="w-14 text-sm text-[#5A6478]">Pele</span>
            {PELES.map((p) => (
              <button key={p.v} onClick={() => muda(f._id, { pele: p.v })} aria-label={p.v}
                className={`size-11 rounded-full border-4 ${f.pele === p.v ? "border-[#0A2F7A]" : "border-white shadow"}`} style={{ background: p.cor }} />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="w-14 text-sm text-[#5A6478]">Cabelo</span>
            {CABELOS.map((c) => (
              <button key={c.v} onClick={() => muda(f._id, { cabelo: c.v })} className={`rounded-full border-2 px-3 py-1.5 text-sm font-semibold ${f.cabelo === c.v ? "border-[#0A2F7A] bg-[#0A2F7A] text-white" : "border-[#D9DEE8] text-[#0A2F7A]"}`}>{c.t}</button>
            ))}
          </div>
          <Foto f={f} muda={(d) => muda(f._id, d)} />
        </div>
      ))}

      <button onClick={() => setFilhos([...filhos, novo()])} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0A2F7A]/40 py-3.5 font-bold text-[#0A2F7A]">
        <Plus className="size-5" /> Tenho outro filho(a)
      </button>
      <button disabled={!completo} onClick={seguir} className="mt-6 w-full rounded-2xl bg-[#0A2F7A] py-4 text-base font-bold text-white disabled:opacity-40">Continuar</button>
    </Tela>
  );
}

function Foto({ f, muda }: { f: Filho; muda: (d: Partial<Filho>) => void }) {
  const [lendo, setLendo] = useState(false);
  const escolher = async (arq?: File | null) => {
    if (!arq) return;
    setLendo(true);
    try { muda({ foto: await reduzir(arq) }); } catch { /* imagem que o navegador não abre: segue sem foto */ }
    setLendo(false);
  };
  return (
    <div className="mt-4 rounded-2xl bg-[#F4F6FB] p-3">
      <div className="flex items-center gap-3">
        {f.foto ? <img src={f.foto} alt="" className="size-14 rounded-full object-cover" /> : <div className="flex size-14 items-center justify-center rounded-full bg-white text-[#9AA3B4]"><Camera className="size-6" /></div>}
        <label className="flex-1 cursor-pointer text-sm font-semibold text-[#0A2F7A]">
          {lendo ? "Preparando a foto…" : f.foto ? "Trocar a foto" : "Foto do rosto (opcional)"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => escolher(e.target.files?.[0])} />
          <span className="block text-xs font-normal text-[#5A6478]">Para o personagem ganhar o rosto dela(e).</span>
        </label>
        {f.foto && <button onClick={() => muda({ foto: null, fotoAutorizada: false })} className="p-1 text-[#9AA3B4]" aria-label="Tirar a foto"><Trash2 className="size-5" /></button>}
      </div>
      {f.foto && (
        <label className="mt-3 flex items-start gap-2 text-xs leading-snug text-[#3E4A61]">
          <input type="checkbox" checked={!!f.fotoAutorizada} onChange={(e) => muda({ fotoAutorizada: e.target.checked })} className="mt-0.5 size-4" />
          Autorizo o Centro Educacional Amadeus a usar esta foto só para criar o personagem da história do meu filho(a). A foto é apagada depois do evento.
        </label>
      )}
    </div>
  );
}

// reduz a foto no próprio celular (máx. 900 px, JPEG) antes de enviar
async function reduzir(arq: File): Promise<string> {
  const url = URL.createObjectURL(arq);
  try {
    const img = await new Promise<HTMLImageElement>((ok, erro) => { const i = new Image(); i.onload = () => ok(i); i.onerror = erro; i.src = url; });
    const esc = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * esc); c.height = Math.round(img.height * esc);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82);
  } finally { URL.revokeObjectURL(url); }
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
      <Tela>
        <div className="mt-10 rounded-3xl bg-white p-6 text-center shadow-sm">
          <Sparkles className="mx-auto size-10 text-[#FFC21A]" />
          <p className="mt-3 text-xl font-bold text-[#0A2F7A]">Prontinho!</p>
          <p className="mt-2 text-[15px] leading-relaxed text-[#3E4A61]">Agora é só enviar e guardar o celular. Fique de olho na apresentação…</p>
          {erro && <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
          <button onClick={enviar} disabled={enviando} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0A2F7A] py-4 font-bold text-white disabled:opacity-50">
            {enviando && <Loader2 className="size-5 animate-spin" />} Enviar
          </button>
        </div>
      </Tela>
    );
  }
  if (p < 0) return null;
  const q = ATIVIDADE[p];
  return (
    <Tela>
      <button onClick={voltar} className="text-sm font-semibold text-[#5A6478]">‹ voltar</button>
      <div className="mt-3 flex gap-1">{ATIVIDADE.map((_, k) => <div key={k} className={`h-1.5 flex-1 rounded-full ${k < p ? "bg-[#0A2F7A]" : k === p ? "bg-[#FFC21A]" : "bg-[#D9DEE8]"}`} />)}</div>
      <p className="mt-6 text-[12px] font-bold uppercase tracking-[0.2em] text-[#B07A12]">{filhos.length > 1 ? `Sobre ${nome} · ` : ""}{p + 1} de {ATIVIDADE.length}</p>
      <p key={`${qual}-${p}`} className="mt-2 text-[24px] font-bold leading-tight text-[#0A2F7A]">{q.pergunta.replace("{nome}", nome)}</p>
      <div className="mt-6 space-y-3">
        {q.opcoes.map((o) => (
          <button key={o.texto} onClick={() => responder(o.chave)} className="w-full rounded-2xl border-2 border-[#D9DEE8] bg-white px-5 py-4 text-left text-[16px] font-semibold text-[#0A2F7A] active:scale-[.98] active:border-[#0A2F7A]">{o.texto}</button>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-[#9AA3B4]">Não existe resposta certa. Toda criança vai passar por todos os lugares.</p>
    </Tela>
  );
}

/* ---------------- 3 · espera e revelação ---------------- */

function Espera({ familia, nomes }: { familia: string; nomes: string[] }) {
  const [criancas, setCriancas] = useState<CriancaHistoria[]>([]);
  const [antes, setAntes] = useState(false);
  const [aberta, setAberta] = useState<CriancaHistoria | null>(null);
  const [revelando, setRevelando] = useState(false);

  useEffect(() => {
    let vivo = true;
    const ver = async () => {
      const r = await estado(familia).catch(() => null);
      if (!vivo || !r) return;
      setAntes(r.antes);
      if (r.liberado && r.criancas.length) {
        setCriancas((atual) => { if (!atual.length) { setRevelando(true); setTimeout(() => setRevelando(false), 3200); } return r.criancas; });
      } else setCriancas([]);
    };
    ver();
    const t = setInterval(ver, 4000);
    return () => { vivo = false; clearInterval(t); };
  }, [familia]);

  if (aberta) return <Historia crianca={aberta} fechar={() => setAberta(null)} />;

  if (!criancas.length) {
    return (
      <div className="flex min-h-[100svh] flex-col items-center justify-center bg-[#0A2F7A] px-8 text-center text-white">
        <div className="relative size-28">
          <div className="absolute inset-0 animate-ping rounded-full bg-[#FFC21A]/30" />
          <div className="absolute inset-3 flex items-center justify-center rounded-full bg-[#FFC21A] text-5xl">🎒</div>
        </div>
        <p className="mt-8 text-2xl font-bold">Tudo pronto!</p>
        <p className="mt-3 text-[15px] leading-relaxed text-white/80">
          {antes ? "Esse cadastro foi feito antes do encontro começar. Fale com a equipe na sala." : <>No fim do encontro, a jornada de <b className="text-[#FFC21A]">{nomes.join(" e ")}</b> vai aparecer aqui. Deixe esta página aberta.</>}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[100svh] bg-[#0A2F7A] px-5 pb-10 pt-12 text-white">
      {revelando && <Revelacao />}
      <p className="text-center text-[12px] font-bold uppercase tracking-[0.2em] text-[#FFC21A]">Arboria 2027</p>
      <p className="mt-2 text-center text-[26px] font-bold leading-tight">{criancas.length > 1 ? "As jornadas chegaram!" : `A jornada de ${primeiroNome(criancas[0].nome)} chegou!`}</p>
      <div className="mx-auto mt-8 max-w-sm space-y-4">
        {criancas.map((c) => (
          <button key={c.id} onClick={() => setAberta(c)} className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left text-[#0A2F7A] shadow-lg active:scale-[.98]">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-[#FFC21A] text-3xl">▶</span>
            <span><b className="block text-lg">{primeiroNome(c.nome)}</b><span className="text-sm text-[#5A6478]">{c.serie} · toque para abrir</span></span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Revelacao() {
  return (
    <div className="pointer-events-none fixed inset-0 z-40 flex items-center justify-center overflow-hidden">
      <style>{`
        .rv-luz { position:absolute; width:20px; height:20px; border-radius:50%; background:#FFC21A; animation: rvLuz 2.8s ease-out forwards; box-shadow: 0 0 120px 80px rgba(255,194,26,.6); }
        @keyframes rvLuz { 0% { transform: scale(0); opacity: 1 } 60% { transform: scale(60); opacity: .9 } 100% { transform: scale(90); opacity: 0 } }
        .rv-p { position:absolute; left:50%; top:50%; font-size:28px; animation: rvP 2.6s ease-out forwards; }
        @keyframes rvP { from { transform: translate(-50%,-50%) scale(.4); opacity: 1 } to { transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y))) scale(1.2) rotate(40deg); opacity: 0 } }
      `}</style>
      <div className="rv-luz" />
      {Array.from({ length: 18 }).map((_, k) => {
        const a = (k / 18) * Math.PI * 2;
        return <span key={k} className="rv-p" style={{ ["--x" as string]: `${Math.cos(a) * 46}vw`, ["--y" as string]: `${Math.sin(a) * 46}vh`, animationDelay: `${(k % 4) * 0.08}s` }}>{["✨", "⭐", "💛", "🎒"][k % 4]}</span>;
      })}
    </div>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return <main className="min-h-[100svh] bg-[#FAF7F0] px-5 pb-12 pt-6"><div className="mx-auto max-w-md">{children}</div></main>;
}

