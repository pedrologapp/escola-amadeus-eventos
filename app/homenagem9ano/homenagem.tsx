"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Eye,
  Gift,
  Heart,
  ImagePlus,
  Loader2,
  RotateCcw,
  Smartphone,
  Sun,
  UserPlus,
  VolumeX,
} from "lucide-react";
import { MAX_FOTOS, PRAZO_HOMENAGEM, QUEM_OPCOES, type StatusParte } from "@/lib/homenagem-9ano-texto";
import { atualizar, buscarAluno, criarEnvio, entrar, prepararArquivo, retomar, salvarArquivo, type EnvioFamilia } from "./actions";
import { BotoesPoema, Gravador, PoemaInteiro, type VideoPronto } from "./gravador";
import { subir } from "./subir";

type Tela = "entrada" | "instrucoes" | "quem" | "parte1" | "parte2" | "fotos" | "fim" | "envios";
type Familia = { passe: string; nome: string; primeiro: string; envios: EnvioFamilia[] };

const GUARDA = "homenagem9ano:passe";
const ler = () => { try { return localStorage.getItem(GUARDA); } catch { return null; } };
const guardar = (v: string | null) => { try { if (v) localStorage.setItem(GUARDA, v); else localStorage.removeItem(GUARDA); } catch {} };

/** Reduz a foto no navegador (lado maior 2400 px, JPEG): foto de celular vira ~1 MB. */
async function reduzir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * escala);
  c.height = Math.round(bmp.height * escala);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  const b = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.9));
  if (!b) throw new Error("Não consegui ler essa foto.");
  return b;
}

function Moldura({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`hom-moldura ${className}`}>{children}</div>;
}

function Titulo({ sobre, children }: { sobre: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.32em] text-[#D4B068]">{sobre}</p>
      <h2 className="font-hom-script mt-1 text-[52px] leading-[1.05] text-[#F3EBDD]">{children}</h2>
      <div className="hom-filete mx-auto mt-3" />
    </div>
  );
}

function Selo({ status, tem }: { status: StatusParte; tem: boolean }) {
  if (!tem) return <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-bold text-[#C9BFAE]">Falta gravar</span>;
  if (status === "aprovado") return <span className="rounded-full bg-[#2F5D3A] px-3 py-1 text-[13px] font-bold text-[#D9F2DE]">Aprovado</span>;
  if (status === "refazer") return <span className="rounded-full bg-[#6B2B23] px-3 py-1 text-[13px] font-bold text-[#FADAD3]">Gravar de novo</span>;
  return <span className="rounded-full bg-[#D4B068]/20 px-3 py-1 text-[13px] font-bold text-[#EAD7A4]">Recebido</span>;
}

export function Homenagem() {
  const [tela, setTela] = useState<Tela>("entrada");
  const [familia, setFamilia] = useState<Familia | null>(null);
  const [envioId, setEnvioId] = useState<string | null>(null);
  const [soUma, setSoUma] = useState(false); // regravar só uma parte (vem da lista de envios)
  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [sugestoes, setSugestoes] = useState<{ id: number; nome: string }[]>([]);
  const [procurando, setProcurando] = useState(false);
  const [escolhido, setEscolhido] = useState<{ id: number; nome: string } | null>(null);
  const busca = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [quem, setQuem] = useState<string | null>(null);
  const [outro, setOutro] = useState("");
  const [quemGrava, setQuemGrava] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [fotos, setFotos] = useState<{ blob: Blob; url: string }[]>([]);
  const [verPoema, setVerPoema] = useState(false);
  const topo = useRef<HTMLDivElement>(null);

  const ir = (t: Tela) => {
    setErro(null);
    setTela(t);
    requestAnimationFrame(() => topo.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  // Volta sozinho para quem já entrou neste celular.
  useEffect(() => {
    const p = ler();
    if (!p) return;
    retomar(p).then((r) => {
      if (!r.ok) return guardar(null);
      setFamilia(r);
      setTela(r.envios.length ? "envios" : "instrucoes");
    });
  }, []);

  const recarregar = async () => {
    if (!familia) return;
    const envios = await atualizar(familia.passe);
    if (envios) setFamilia({ ...familia, envios });
  };

  const digitarNome = (v: string) => {
    setNome(v);
    if (busca.current) clearTimeout(busca.current);
    if (v.trim().length < 3) { setSugestoes([]); setProcurando(false); return; }
    setProcurando(true);
    busca.current = setTimeout(async () => {
      const r = await buscarAluno(v).catch(() => []);
      setSugestoes(r);
      setProcurando(false);
    }, 300);
  };

  const fazerEntrada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!escolhido) return;
    setOcupado(true);
    setErro(null);
    const r = await entrar(escolhido.id, nascimento).catch(() => ({ ok: false as const, erro: "Sem conexão. Tente de novo." }));
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    guardar(r.passe);
    setFamilia(r);
    ir(r.envios.length ? "envios" : "instrucoes");
  };

  const escolherQuem = async () => {
    if (!familia || !quem) return;
    if (quem === "Outra pessoa da família" && outro.trim().length < 2) return setErro("Escreva quem é da família (por exemplo: avó, tio, padrinho).");
    if (quemGrava.trim().length < 2) return setErro("Escreva o seu nome.");
    setOcupado(true);
    const r = await criarEnvio(familia.passe, quem, outro, quemGrava);
    setOcupado(false);
    if (!r.ok) return setErro(r.erro);
    setEnvioId(r.id);
    setSoUma(false);
    ir("parte1");
  };

  const enviarArquivo = async (tipo: "parte1" | "parte2" | "foto", arquivo: Blob, mime: string, ext: string) => {
    if (!familia || !envioId) throw new Error("Entre de novo.");
    const p = await prepararArquivo(familia.passe, envioId, tipo, ext);
    if (!p.ok) throw new Error(p.erro);
    await subir(p.path, p.token, arquivo, mime, (x) => setProgresso(x));
    const s = await salvarArquivo(familia.passe, envioId, tipo, p.path);
    if (!s.ok) throw new Error(s.erro);
  };

  const enviarVideo = async (tipo: "parte1" | "parte2", v: VideoPronto) => {
    setOcupado(true);
    setErro(null);
    setProgresso(0);
    try {
      await enviarArquivo(tipo, v.blob, v.tipo, v.ext);
      await recarregar();
      if (soUma) ir("envios");
      else ir(tipo === "parte1" ? "parte2" : "fotos");
    } catch (e) {
      setErro(`${(e as Error).message} O vídeo continua aqui: toque em "Ficou bom, enviar" de novo.`);
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  };

  const juntarFotos = async (files: FileList | null) => {
    if (!files) return;
    setErro(null);
    const novas: { blob: Blob; url: string }[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const b = await reduzir(f);
        novas.push({ blob: b, url: URL.createObjectURL(b) });
      } catch {
        setErro("Uma das fotos não abriu. Tente tirar um print dela e enviar o print.");
      }
    }
    setFotos((a) => [...a, ...novas].slice(0, MAX_FOTOS));
  };

  const enviarFotos = async () => {
    setOcupado(true);
    setErro(null);
    try {
      for (let i = 0; i < fotos.length; i++) {
        setProgresso(i / fotos.length);
        await enviarArquivo("foto", fotos[i].blob, "image/jpeg", "jpg");
      }
      fotos.forEach((f) => URL.revokeObjectURL(f.url));
      setFotos([]);
      await recarregar();
      ir(soUma ? "envios" : "fim");
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
      setProgresso(null);
    }
  };

  const regravar = (id: string, t: "parte1" | "parte2" | "fotos") => {
    setEnvioId(id);
    setSoUma(true);
    ir(t);
  };

  const sair = () => {
    guardar(null);
    setFamilia(null);
    setNome("");
    setNascimento("");
    setEscolhido(null);
    setSugestoes([]);
    ir("entrada");
  };

  const primeiro = familia?.primeiro ?? "";
  const barra = progresso !== null && (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-[#D4B068] transition-[width]" style={{ width: `${Math.round(progresso * 100)}%` }} />
      </div>
      <p className="text-center text-[15px] text-[#C9BFAE]">Enviando… {Math.round(progresso * 100)}%. Não feche esta página.</p>
    </div>
  );
  const aviso = erro && <p className="rounded-2xl bg-[#3A1D1D] p-3 text-[15px] leading-relaxed text-[#F6D5CF]">{erro}</p>;

  return (
    <div ref={topo} className="mx-auto max-w-md scroll-mt-4">
      {/* ENTRADA */}
      {tela === "entrada" && (
        <div className="hom-entra space-y-8">
          <div className="pt-2 text-center">
            <p className="text-[11px] font-bold uppercase tracking-[0.36em] text-[#D4B068]">Formatura 2026 · 9º ano</p>
            <h1 className="font-hom-script mt-3 text-[68px] leading-[0.95] text-[#F3EBDD]">Uma homenagem</h1>
            <p className="font-hom-serif mt-2 text-[22px] italic text-[#EAD7A4]">de quem mais te ama</p>
            <div className="hom-filete mx-auto mt-5" />
            <p className="mx-auto mt-5 max-w-sm text-[15.5px] leading-relaxed text-[#D9D1C3]">
              Estamos preparando um vídeo surpresa para a formatura, com a voz de todas as famílias da turma. Leva uns 10 minutos.
            </p>
          </div>

          <Moldura>
            <form onSubmit={fazerEntrada} className="space-y-4">
              {!escolhido ? (
                <div>
                  <label className="block">
                    <span className="text-[15px] font-bold text-[#EAD7A4]">Nome do seu filho ou da sua filha</span>
                    <input value={nome} onChange={(e) => digitarNome(e.target.value)} autoComplete="off" placeholder="Comece a digitar o nome" className="hom-campo mt-1.5" />
                  </label>
                  {procurando && <p className="mt-2 flex items-center gap-2 text-[15px] text-[#C9BFAE]"><Loader2 className="h-4 w-4 animate-spin" /> Procurando…</p>}
                  {sugestoes.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <p className="text-[14px] text-[#C9BFAE]">Toque no nome:</p>
                      {sugestoes.map((s) => (
                        <button key={s.id} type="button" onClick={() => { setEscolhido(s); setSugestoes([]); setErro(null); }} className="hom-opcao !py-3.5">
                          {s.nome}
                        </button>
                      ))}
                    </div>
                  )}
                  {!procurando && nome.trim().length >= 3 && sugestoes.length === 0 && (
                    <p className="mt-2 text-[15px] text-[#C9BFAE]">Nenhum aluno do 9º ano com esse nome. Confira como está escrito.</p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-[15px] font-bold text-[#EAD7A4]">Seu filho ou sua filha</span>
                    <div className="mt-1.5 flex items-center gap-3 rounded-[14px] border border-[#D4B068] bg-[#D4B068]/10 px-4 py-3">
                      <Check className="h-5 w-5 shrink-0 text-[#D4B068]" />
                      <span className="flex-1 text-[17px] font-bold text-[#F3EBDD]">{escolhido.nome}</span>
                      <button type="button" onClick={() => { setEscolhido(null); setNascimento(""); setErro(null); }} className="rounded-full border border-white/25 px-3 py-1.5 text-[14px] font-bold text-[#E6DED0]">Trocar</button>
                    </div>
                  </div>
                  <label className="block">
                    <span className="text-[15px] font-bold text-[#EAD7A4]">Data de nascimento de {escolhido.nome.split(" ")[0]}</span>
                    <input type="date" value={nascimento} onChange={(e) => setNascimento(e.target.value)} max="2014-12-31" min="2008-01-01" className="hom-campo mt-1.5" />
                  </label>
                </>
              )}
              {aviso}
              <button disabled={ocupado || !escolhido || !nascimento} className="hom-botao w-full">
                {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Entrar <ArrowRight className="h-5 w-5" /></>}
              </button>
            </form>
          </Moldura>

          <p className="flex items-center justify-center gap-2 text-center text-[15px] text-[#C9BFAE]">
            <Gift className="h-4 w-4 text-[#D4B068]" /> É surpresa: não conte para o seu filho.
          </p>
        </div>
      )}

      {/* INSTRUÇÕES */}
      {tela === "instrucoes" && familia && (
        <div className="hom-entra space-y-7">
          <Titulo sobre={`Família de ${primeiro}`}>Como vai ser</Titulo>
          <p className="text-center text-[15.5px] leading-relaxed text-[#D9D1C3]">
            Você vai gravar <b className="text-[#F3EBDD]">dois vídeos curtos</b> pelo celular, aqui mesmo nesta página.
            {PRAZO_HOMENAGEM && <> O prazo é <b className="text-[#F3EBDD]">{PRAZO_HOMENAGEM}</b>.</>}
          </p>

          <div className="space-y-4">
            <Moldura>
              <div className="flex gap-4">
                <span className="hom-numero">1</span>
                <div>
                  <p className="font-hom-serif text-[23px] font-bold text-[#F3EBDD]">Sua mensagem</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#D9D1C3]">
                    Fale com {primeiro} o que vem do coração. Pode ser uma lembrança, o que você admira, um desejo para o futuro. Até 2 minutos.
                  </p>
                </div>
              </div>
            </Moldura>
            <Moldura>
              <div className="flex gap-4">
                <span className="hom-numero">2</span>
                <div>
                  <p className="font-hom-serif text-[23px] font-bold text-[#F3EBDD]">O poema</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#D9D1C3]">
                    Um poema que <b className="text-[#F3EBDD]">todas as famílias</b> vão ler. No vídeo da formatura, cada verso sai na voz de uma família diferente, e no fim todas falam juntas. O texto aparece na tela enquanto você grava.
                  </p>
                  <button type="button" onClick={() => setVerPoema((v) => !v)} className="hom-acao mt-4 w-full">
                    {verPoema ? "Esconder o poema" : "Ler o poema agora"}
                  </button>
                </div>
              </div>
              {verPoema && (
                <div className="mt-5 space-y-5 border-t border-[#D4B068]/25 pt-5">
                  <PoemaInteiro />
                  <BotoesPoema />
                </div>
              )}
            </Moldura>
            <Moldura>
              <div className="flex gap-4">
                <span className="hom-numero">3</span>
                <div>
                  <p className="font-hom-serif text-[23px] font-bold text-[#F3EBDD]">Fotos <span className="text-[16px] font-semibold italic text-[#C9BFAE]">(se quiser)</span></p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[#D9D1C3]">Fotos de {primeiro} em qualquer fase da vida, até {MAX_FOTOS}.</p>
                </div>
              </div>
            </Moldura>
          </div>

          <div>
            <p className="text-center text-[11px] font-bold uppercase tracking-[0.32em] text-[#D4B068]">Para ficar bonito</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { i: Smartphone, t: "Celular em pé, na altura dos olhos" },
                { i: Sun, t: "Rosto de frente para a luz ou a janela" },
                { i: VolumeX, t: "Lugar silencioso, sem TV ligada" },
                { i: Eye, t: "Olhe para a câmera, não para a tela" },
                { i: RotateCcw, t: "Pode gravar quantas vezes quiser" },
                { i: Heart, t: "Fale devagar e com carinho" },
              ].map(({ i: I, t }) => (
                <div key={t} className="rounded-2xl border border-[#D4B068]/20 bg-white/[0.03] p-3.5">
                  <I className="h-5 w-5 text-[#D4B068]" />
                  <p className="mt-2 text-[13.5px] leading-snug text-[#E6DED0]">{t}</p>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => ir("quem")} className="hom-botao w-full">
            Começar <ArrowRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={sair} className="hom-acao-discreta w-full">
            Não é {familia.nome}? Sair
          </button>
        </div>
      )}

      {/* QUEM GRAVA */}
      {tela === "quem" && familia && (
        <div className="hom-entra space-y-6">
          <Titulo sobre={`Família de ${primeiro}`}>Quem vai gravar?</Titulo>
          <div className="grid gap-3">
            {QUEM_OPCOES.map((q) => (
              <button key={q} type="button" onClick={() => setQuem(q)} className={`hom-opcao ${quem === q ? "hom-opcao-sim" : ""}`}>
                <span className={`grid h-6 w-6 place-items-center rounded-full border ${quem === q ? "border-[#D4B068] bg-[#D4B068] text-[#0A1630]" : "border-white/30"}`}>
                  {quem === q && <Check className="h-4 w-4" />}
                </span>
                {q}
              </button>
            ))}
          </div>
          {quem === "Outra pessoa da família" && (
            <label className="block">
              <span className="text-[15px] font-bold text-[#EAD7A4]">Quem é da família?</span>
              <input value={outro} onChange={(e) => setOutro(e.target.value)} placeholder="Ex.: avó, tio, padrinho" className="hom-campo mt-1.5" />
            </label>
          )}
          <label className="block">
            <span className="text-[15px] font-bold text-[#EAD7A4]">{quem === "Mãe e pai" ? "Nome de vocês" : "Seu nome"}</span>
            <input value={quemGrava} onChange={(e) => setQuemGrava(e.target.value)} placeholder={quem === "Mãe e pai" ? "Ex.: Ana e Carlos" : "Nome e sobrenome"} autoComplete="name" className="hom-campo mt-1.5" />
          </label>
          <p className="text-center text-[15px] leading-relaxed text-[#C9BFAE]">Pai e mãe querem gravar separados? Sem problema: depois do primeiro envio, é só tocar em &quot;Outra pessoa da família quer gravar&quot;.</p>
          {aviso}
          <button type="button" disabled={!quem || quemGrava.trim().length < 2 || ocupado} onClick={escolherQuem} className="hom-botao w-full">
            {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continuar <ArrowRight className="h-5 w-5" /></>}
          </button>
          <button type="button" onClick={() => ir(familia.envios.length ? "envios" : "instrucoes")} className="hom-acao-discreta w-full">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      )}

      {/* PARTE 1 */}
      {tela === "parte1" && familia && (
        <div className="hom-entra space-y-5">
          <Titulo sobre="Parte 1 de 2">Sua mensagem</Titulo>
          <p className="text-center text-[15.5px] leading-relaxed text-[#D9D1C3]">
            Fale com {primeiro} como se estivesse na frente. Algumas ideias: <i>uma lembrança que você nunca esqueceu</i>, <i>o que mais admira</i>, <i>o que deseja para o futuro</i>.
          </p>
          <p className="flex items-center justify-center gap-2 text-[15px] text-[#C9BFAE]"><Clock className="h-4 w-4 text-[#D4B068]" /> Até 2 minutos</p>
          <Gravador modo="livre" limite={120} onPronto={(v) => !ocupado && enviarVideo("parte1", v)} />
          {barra}
          {aviso}
        </div>
      )}

      {/* PARTE 2 */}
      {tela === "parte2" && familia && (
        <div className="hom-entra space-y-5">
          <Titulo sobre="Parte 2 de 2">O poema</Titulo>
          <ol className="space-y-2 text-[15px] leading-relaxed text-[#D9D1C3]">
            <li className="flex gap-3"><span className="hom-numero-p">1</span><span>Abra a câmera e leia o poema uma vez em voz alta, para ensaiar.</span></li>
            <li className="flex gap-3"><span className="hom-numero-p">2</span><span>Toque em <b className="text-[#F3EBDD]">Começar a gravar</b>. O poema volta para o início.</span></li>
            <li className="flex gap-3"><span className="hom-numero-p">3</span><span>Leia uma estrofe e toque em <b className="text-[#F3EBDD]">Próxima</b>.</span></li>
            <li className="flex gap-3"><span className="hom-numero-p">4</span><span>No final, <b className="text-[#F3EBDD]">olhe para a câmera</b> e diga devagar: &quot;Saiba que sempre estaremos com você. Nós te amamos!&quot;</span></li>
          </ol>
          <div className="space-y-2">
            <p className="text-center text-[15px] text-[#C9BFAE]">Prefere ler em outro celular enquanto grava com este?</p>
            <BotoesPoema />
          </div>
          <Gravador modo="poema" limite={150} onPronto={(v) => !ocupado && enviarVideo("parte2", v)} />
          {barra}
          {aviso}
        </div>
      )}

      {/* FOTOS */}
      {tela === "fotos" && familia && (
        <div className="hom-entra space-y-5">
          <Titulo sobre="Se quiser">Fotos de {primeiro}</Titulo>
          <p className="text-center text-[15.5px] leading-relaxed text-[#D9D1C3]">Do bebê até hoje: as fotos podem entrar no vídeo da formatura. Até {MAX_FOTOS}.</p>
          {fotos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={f.url} className="relative aspect-square overflow-hidden rounded-xl border border-[#D4B068]/30">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => setFotos((a) => a.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-black/70 px-3 py-1 text-[14px] font-bold text-white">Tirar</button>
                </div>
              ))}
            </div>
          )}
          {fotos.length < MAX_FOTOS && (
            <label className="hom-botao-claro w-full cursor-pointer">
              <ImagePlus className="h-5 w-5" /> {fotos.length ? "Escolher mais fotos" : "Escolher fotos"}
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { juntarFotos(e.target.files); e.target.value = ""; }} />
            </label>
          )}
          {barra}
          {aviso}
          {fotos.length > 0 && (
            <button type="button" disabled={ocupado} onClick={enviarFotos} className="hom-botao w-full">
              {ocupado ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Enviar {fotos.length} {fotos.length === 1 ? "foto" : "fotos"} <ArrowRight className="h-5 w-5" /></>}
            </button>
          )}
          {!ocupado && (
            <button type="button" onClick={() => ir(soUma ? "envios" : "fim")} className="hom-acao-discreta w-full">
              {soUma ? "Voltar" : "Pular, não vou mandar fotos"}
            </button>
          )}
        </div>
      )}

      {/* FIM */}
      {tela === "fim" && familia && (
        <div className="hom-entra space-y-7 pt-4 text-center">
          <Heart className="mx-auto h-10 w-10 fill-[#D4B068] text-[#D4B068]" />
          <Titulo sobre={`Família de ${primeiro}`}>Obrigado!</Titulo>
          <p className="text-[15.5px] leading-relaxed text-[#D9D1C3]">
            Recebemos tudo. A escola vai assistir aos vídeos e, se alguma parte precisar ser gravada de novo, avisaremos por aqui e pelo WhatsApp.
          </p>
          <p className="font-hom-serif text-[21px] italic text-[#EAD7A4]">Lembre: é surpresa. Nos vemos na formatura.</p>
          <div className="space-y-3">
            <button type="button" onClick={() => { setQuem(null); setOutro(""); setQuemGrava(""); ir("quem"); }} className="hom-botao-claro w-full">
              <UserPlus className="h-5 w-5" /> Outra pessoa da família quer gravar
            </button>
            <button type="button" onClick={() => ir("envios")} className="hom-acao-discreta w-full">Ver o que já enviamos</button>
          </div>
        </div>
      )}

      {/* ENVIOS DA FAMÍLIA */}
      {tela === "envios" && familia && (
        <div className="hom-entra space-y-6">
          <Titulo sobre={`Família de ${primeiro}`}>Seus envios</Titulo>
          {familia.envios.map((e) => (
            <Moldura key={e.id}>
              <p className="font-hom-serif text-[22px] font-bold text-[#F3EBDD]">{e.quem}</p>
              {([
                ["parte1", "Parte 1 · Mensagem", e.parte1, e.status1, e.observacao1],
                ["parte2", "Parte 2 · Poema", e.parte2, e.status2, e.observacao2],
              ] as const).map(([t, rotulo, tem, st, obs]) => (
                <div key={t} className="mt-4 border-t border-[#D4B068]/20 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[15px] font-semibold text-[#E6DED0]">{rotulo}</p>
                    <Selo status={st} tem={tem} />
                  </div>
                  {st === "refazer" && obs && <p className="mt-2 rounded-xl bg-[#6B2B23]/40 p-3 text-[15px] text-[#FADAD3]">A escola pediu: {obs}</p>}
                  {st !== "aprovado" && (
                    <button type="button" onClick={() => regravar(e.id, t)} className="hom-acao mt-3 w-full">
                      {tem ? "Gravar de novo" : "Gravar agora"}
                    </button>
                  )}
                </div>
              ))}
              <div className="mt-4 flex items-center justify-between border-t border-[#D4B068]/20 pt-4">
                <p className="text-[15px] text-[#E6DED0]">{e.fotos ? `${e.fotos} ${e.fotos === 1 ? "foto enviada" : "fotos enviadas"}` : "Nenhuma foto"}</p>
                {e.fotos < MAX_FOTOS && (
                  <button type="button" onClick={() => regravar(e.id, "fotos")} className="hom-acao w-auto px-5">Mandar fotos</button>
                )}
              </div>
            </Moldura>
          ))}
          <button type="button" onClick={() => { setQuem(null); setOutro(""); setQuemGrava(""); ir("quem"); }} className="hom-botao-claro w-full">
            <UserPlus className="h-5 w-5" /> Outra pessoa da família quer gravar
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => ir("instrucoes")} className="hom-acao-discreta">Instruções</button>
            <button type="button" onClick={sair} className="hom-acao-discreta">Sair</button>
          </div>
        </div>
      )}
    </div>
  );
}
