"use client";
/* eslint-disable @next/next/no-img-element -- imagens do Storage com link assinado */

import { useRef, useState } from "react";
import { Check, FileText, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_CULMINANCIA, CHAVES, FRENTES, INTELIGENCIAS, ehChave, type Frente, type Outdoor } from "@/lib/culminancia";
import { enviarIdeias, lerFrente, prepararDocumentoProfessora, prepararImagemProfessora } from "./actions";

const EXT_DOC = /\.(pdf|docx?)$/i;

/** Reduz a imagem no navegador (lado maior 2000 px, JPEG): foto de celular vira ~600 KB. */
async function reduzir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  const cx = canvas.getContext("2d")!;
  cx.fillStyle = "#ffffff"; cx.fillRect(0, 0, canvas.width, canvas.height);
  cx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!blob) throw new Error("Não consegui ler essa imagem.");
  return blob;
}

const SEGMENTOS: Frente["segmento"][] = ["Educação Infantil", "Fundamental I", "Fundamental II"];
const campo = "mt-1 block w-full rounded-xl border border-[#D9D3C4] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-amadeus-blue";
const vazio = (): Outdoor => ({ descricao: "", largura: null, altura: null });

export function FormularioCulminancia() {
  const [chave, setChave] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [jaEnviado, setJaEnviado] = useState<{ quando: string; imagens: number } | null>(null);
  const [inteligencia, setInteligencia] = useState("");
  const [professora, setProfessora] = useState("");
  const [ideiaSala, setIdeiaSala] = useState("");
  const [ideiaOutdoor, setIdeiaOutdoor] = useState("");
  const [outdoors, setOutdoors] = useState<Outdoor[]>([vazio()]);
  const [fotos, setFotos] = useState<{ blob: Blob; previa: string }[]>([]);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [docs, setDocs] = useState<File[]>([]);
  const entrada = useRef<HTMLInputElement>(null);
  const entradaDoc = useRef<HTMLInputElement>(null);
  const frente = FRENTES.find((f) => f.chave === chave) ?? null;

  const escolher = async (k: string) => {
    setChave(k); setErro(null); setPronto(false); setFotos([]); setDocs([]);
    if (!k) return;
    setCarregando(true);
    const d = await lerFrente(k);
    setCarregando(false);
    if (!d) return;
    setInteligencia(d.inteligencia ?? ""); setProfessora(d.professora); setIdeiaSala(d.ideia_sala); setIdeiaOutdoor(d.ideia_outdoor);
    setOutdoors(d.outdoors.length ? d.outdoors : [vazio()]);
    setJaEnviado(d.enviado_em ? { quando: new Date(d.enviado_em).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }), imagens: d.imagens } : null);
  };

  const addFotos = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setErro(null);
    try {
      const novas = [];
      for (const a of Array.from(arquivos).slice(0, 20 - fotos.length)) {
        if (!a.type.startsWith("image/")) continue;
        const blob = await reduzir(a);
        novas.push({ blob, previa: URL.createObjectURL(blob) });
      }
      setFotos([...fotos, ...novas]);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      if (entrada.current) entrada.current.value = "";
    }
  };

  const muda = (i: number, o: Partial<Outdoor>) => setOutdoors(outdoors.map((x, k) => (k === i ? { ...x, ...o } : x)));
  const num = (v: string) => (v === "" ? null : Number(v));

  const enviar = async () => {
    if (!frente) return;
    setErro(null);
    try {
      const caminhos: string[] = [];
      for (const [n, f] of fotos.entries()) {
        setEnviando(`Enviando imagem ${n + 1} de ${fotos.length}...`);
        const p = await prepararImagemProfessora(frente.chave);
        if (!p.ok) throw new Error(p.erro);
        const { error } = await createClient().storage.from(BUCKET_CULMINANCIA).uploadToSignedUrl(p.path, p.token, f.blob, { contentType: "image/jpeg" });
        if (error) throw new Error("Uma imagem não subiu. Confira a internet e tente de novo.");
        caminhos.push(p.path);
      }
      for (const [n, d] of docs.entries()) {
        setEnviando(`Enviando documento ${n + 1} de ${docs.length}...`);
        const p = await prepararDocumentoProfessora(frente.chave, d.name);
        if (!p.ok) throw new Error(p.erro);
        const { error } = await createClient().storage.from(BUCKET_CULMINANCIA).uploadToSignedUrl(p.path, p.token, d, { contentType: d.type || "application/octet-stream" });
        if (error) throw new Error(`O documento "${d.name}" não subiu. Confira a internet e tente de novo.`);
        caminhos.push(p.path);
      }
      setEnviando("Salvando...");
      const r = await enviarIdeias({ chave: frente.chave, inteligencia: inteligencia || null, professora, ideia_sala: ideiaSala, ideia_outdoor: ideiaOutdoor, outdoors, imagens: caminhos });
      if (!r.ok) throw new Error(r.erro);
      setPronto(true); setFotos([]); setDocs([]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(null);
    }
  };

  if (pronto && frente) {
    return (
      <div className="mt-8 rounded-3xl border border-emerald-200 bg-white p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-6 w-6" /></span>
        <h2 className="mt-3 text-xl font-bold text-[#1F2A44]">Recebemos, obrigado!</h2>
        <p className="mt-2 text-[15px] text-[#5A6478]">As ideias de <b>{frente.titulo}</b> chegaram. Assim que as artes ficarem prontas, mostramos para você.</p>
        <button onClick={() => setPronto(false)} className="mt-5 text-sm font-semibold text-amadeus-blue">Completar ou corrigir algo</button>
      </div>
    );
  }

  const intel = ehChave(inteligencia) ? INTELIGENCIAS[inteligencia] : null;
  return (
    <div className="mt-8 space-y-6">
      <label className="block text-sm font-bold text-[#1F2A44]">
        Qual é a sua sala?
        <select value={chave} onChange={(e) => escolher(e.target.value)} className={campo}>
          <option value="">Escolha a série ou a casa</option>
          {SEGMENTOS.map((s) => (
            <optgroup key={s} label={s}>
              {FRENTES.filter((f) => f.segmento === s).map((f) => <option key={f.chave} value={f.chave}>{f.titulo}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      {carregando && <p className="flex items-center gap-2 text-sm text-[#5A6478]"><Loader2 className="h-4 w-4 animate-spin" /> Abrindo...</p>}

      {frente && !carregando && (
        <>
          {jaEnviado && (
            <p className="rounded-2xl bg-[#EEF3FB] p-3 text-sm text-[#1F2A44]">
              Já recebemos ideias desta sala em {jaEnviado.quando}{jaEnviado.imagens ? `, com ${jaEnviado.imagens} ${jaEnviado.imagens === 1 ? "arquivo" : "arquivos"}` : ""}.
              Você pode completar ou corrigir abaixo.
            </p>
          )}

          {frente.casa ? (
            <p className="text-sm text-[#5A6478]">Inteligência: <b style={{ color: intel?.cor }}>{intel?.nome}</b></p>
          ) : (
            <label className="block text-sm font-bold text-[#1F2A44]">
              Inteligência da sala
              <select value={inteligencia} onChange={(e) => setInteligencia(e.target.value)} className={campo}>
                <option value="">Escolha</option>
                {CHAVES.map((k) => <option key={k} value={k}>{INTELIGENCIAS[k].nome}</option>)}
              </select>
            </label>
          )}

          <label className="block text-sm font-bold text-[#1F2A44]">
            Seu nome
            <input value={professora} onChange={(e) => setProfessora(e.target.value)} placeholder="Se forem duas professoras, coloque as duas" className={campo} />
          </label>

          <label className="block text-sm font-bold text-[#1F2A44]">
            Como vai ficar a sala?
            <span className="block text-xs font-normal text-[#7A8396]">Tema, decoração, o que as crianças vão fazer ou mostrar, cores...</span>
            <textarea value={ideiaSala} onChange={(e) => setIdeiaSala(e.target.value)} rows={5} className={campo} />
          </label>

          <label className="block text-sm font-bold text-[#1F2A44]">
            Ideia do outdoor
            <span className="block text-xs font-normal text-[#7A8396]">O que você imagina no painel: cena, personagens, frase, título...</span>
            <textarea value={ideiaOutdoor} onChange={(e) => setIdeiaOutdoor(e.target.value)} rows={5} className={campo} />
          </label>

          <div>
            <p className="text-sm font-bold text-[#1F2A44]">Tamanho de cada outdoor</p>
            <p className="text-xs text-[#7A8396]">Em centímetros. Se não souber ainda, deixe em branco.</p>
            <div className="mt-2 space-y-3">
              {outdoors.map((o, i) => (
                <div key={i} className="rounded-2xl border border-[#E6E0D2] bg-white p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#7A8396]">Outdoor {i + 1}</span>
                    {outdoors.length > 1 && <button onClick={() => setOutdoors(outdoors.filter((_, k) => k !== i))} className="text-[#9AA3B4]"><X className="h-4 w-4" /></button>}
                  </div>
                  <input value={o.descricao} onChange={(e) => muda(i, { descricao: e.target.value })} placeholder="Onde fica (ex.: parede da porta, corredor)" className={campo} />
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <label className="text-xs text-[#5A6478]">Largura (cm)
                      <input type="number" inputMode="numeric" value={o.largura ?? ""} onChange={(e) => muda(i, { largura: num(e.target.value) })} className={campo} />
                    </label>
                    <label className="text-xs text-[#5A6478]">Altura (cm)
                      <input type="number" inputMode="numeric" value={o.altura ?? ""} onChange={(e) => muda(i, { altura: num(e.target.value) })} className={campo} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            {outdoors.length < 8 && (
              <button onClick={() => setOutdoors([...outdoors, vazio()])} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue"><Plus className="h-4 w-4" /> Mais um outdoor</button>
            )}
          </div>

          <div>
            <p className="text-sm font-bold text-[#1F2A44]">Imagens que você já tem</p>
            <p className="text-xs text-[#7A8396]">Rascunhos, desenhos, fotos de referência, prints. Até 20.</p>
            {fotos.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {fotos.map((f, i) => (
                  <div key={f.previa} className="relative">
                    <img src={f.previa} alt="" className="aspect-square w-full rounded-xl object-cover" />
                    <button onClick={() => setFotos(fotos.filter((_, k) => k !== i))} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => entrada.current?.click()} className="mt-2 inline-flex items-center gap-2 rounded-full border border-amadeus-blue/40 bg-white px-4 py-2 text-sm font-semibold text-amadeus-blue">
              <ImagePlus className="h-4 w-4" /> Adicionar imagens
            </button>
            <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => addFotos(e.target.files)} />
          </div>

          <div>
            <p className="text-sm font-bold text-[#1F2A44]">Documentos (Word ou PDF)</p>
            <p className="text-xs text-[#7A8396]">Se você escreveu o projeto num documento, pode mandar aqui. Até 10, com até 20 MB cada.</p>
            {docs.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {docs.map((d, i) => (
                  <li key={d.name + i} className="flex items-center gap-2 rounded-xl border border-[#E6E0D2] bg-white px-3 py-2 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-amadeus-blue" /><span className="min-w-0 flex-1 truncate">{d.name}</span>
                    <button onClick={() => setDocs(docs.filter((_, k) => k !== i))} className="text-[#9AA3B4]"><X className="h-4 w-4" /></button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={() => entradaDoc.current?.click()} className="mt-2 inline-flex items-center gap-2 rounded-full border border-amadeus-blue/40 bg-white px-4 py-2 text-sm font-semibold text-amadeus-blue">
              <FileText className="h-4 w-4" /> Adicionar documento
            </button>
            <input ref={entradaDoc} type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple hidden
              onChange={(e) => {
                const novos = Array.from(e.target.files ?? []).filter((d) => EXT_DOC.test(d.name));
                const grandes = novos.filter((d) => d.size > 20 * 1024 * 1024);
                setErro(grandes.length ? `"${grandes[0].name}" passa de 20 MB.` : novos.length < (e.target.files?.length ?? 0) ? "Só Word (.doc, .docx) ou PDF." : null);
                setDocs([...docs, ...novos.filter((d) => d.size <= 20 * 1024 * 1024)].slice(0, 10));
                e.target.value = "";
              }} />
          </div>

          {erro && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
          <button onClick={enviar} disabled={!!enviando}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-amadeus-blue py-4 text-base font-bold text-white disabled:opacity-60">
            {enviando ? <><Loader2 className="h-5 w-5 animate-spin" /> {enviando}</> : "Enviar"}
          </button>
        </>
      )}
    </div>
  );
}
