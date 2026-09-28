"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { buscarNome, prepararFoto, salvarFoto } from "./actions";

type Achado = { id: number; nome: string; enviou: boolean };
type Escolhido = { id: number | null; nome: string };

/** Reduz a foto no navegador (lado maior 1800 px, JPEG): celular manda 5–10 MB, aqui vira ~500 KB. */
async function reduzir(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const escala = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * escala);
  canvas.height = Math.round(bmp.height * escala);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.88));
  if (!blob) throw new Error("Não consegui ler essa foto.");
  return blob;
}

export function EnvioFoto() {
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Achado[]>([]);
  const [procurando, setProcurando] = useState(false);
  const [escolhido, setEscolhido] = useState<Escolhido | null>(null);
  const [jaEnviou, setJaEnviou] = useState(false);
  const [digitar, setDigitar] = useState(false);
  const [foto, setFoto] = useState<Blob | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [idade, setIdade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ nome: string; trocou: boolean } | null>(null);
  const entrada = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (escolhido || digitar) return;
    const q = busca.trim();
    if (q.length < 3) { setAchados([]); return; }
    setProcurando(true);
    const t = setTimeout(async () => {
      setAchados(await buscarNome(q).catch(() => []));
      setProcurando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, escolhido, digitar]);

  useEffect(() => () => { if (previa) URL.revokeObjectURL(previa); }, [previa]);

  const escolherFoto = async (file?: File) => {
    setErro(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErro("Escolha um arquivo de imagem (foto)."); return; }
    try {
      const b = await reduzir(file);
      setFoto(b);
      setPrevia(URL.createObjectURL(b));
    } catch {
      setErro("Não consegui abrir essa foto. Tente tirar um print dela e enviar o print.");
    }
  };

  const enviar = async () => {
    if (!escolhido || !foto) return;
    setEnviando(true);
    setErro(null);
    try {
      const p = await prepararFoto(escolhido.id, escolhido.nome);
      if (!p.ok) throw new Error(p.erro);
      const { error } = await createClient().storage.from("fotos-infancia").uploadToSignedUrl(p.path, p.token, foto, { contentType: "image/jpeg" });
      if (error) throw new Error("A foto não subiu. Confira a internet e tente de novo.");
      const r = await salvarFoto({ id: escolhido.id, nome: escolhido.nome, path: p.path, idade });
      if (!r.ok) throw new Error(r.erro);
      setPronto({ nome: r.nome, trocou: r.trocou });
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(false);
    }
  };

  const recomecar = () => {
    setBusca(""); setEscolhido(null); setJaEnviou(false); setDigitar(false); setFoto(null); setPrevia(null); setIdade(""); setPronto(null); setErro(null);
  };

  if (pronto) {
    return (
      <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50"><Check className="size-7 text-emerald-600" /></div>
        <p className="mt-4 text-xl font-extrabold text-amadeus-blue">Foto recebida!</p>
        <p className="mt-2 text-sm text-[#5A6478]">
          Obrigado, {pronto.nome.split(" ")[0]}. {pronto.trocou ? "Ela substituiu a foto que você tinha mandado antes." : "Ela já chegou para a escola."}
        </p>
        {previa && <img src={previa} alt="" className="mx-auto mt-5 max-h-64 rounded-2xl object-contain" />}
        <button type="button" onClick={recomecar} className="mt-6 text-sm font-semibold text-amadeus-blue underline">Enviar a foto de outra pessoa</button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      {/* 1. Nome */}
      <div className="rounded-3xl bg-white p-5 shadow-sm">
        <p className="text-sm font-bold text-amadeus-blue">1. Seu nome</p>
        {escolhido ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-amadeus-blue-50 px-4 py-3">
            <span className="font-semibold text-amadeus-blue">{escolhido.nome}</span>
            <button type="button" onClick={() => { setEscolhido(null); setJaEnviou(false); }} aria-label="Trocar o nome" className="text-[#5A6478]"><X className="size-5" /></button>
          </div>
        ) : digitar ? (
          <>
            <input
              autoFocus
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nome e sobrenome"
              className="mt-3 w-full rounded-2xl border border-border px-4 py-3 text-base outline-none focus:border-amadeus-blue"
            />
            <button
              type="button"
              disabled={busca.trim().split(/\s+/).length < 2}
              onClick={() => setEscolhido({ id: null, nome: busca.trim() })}
              className="mt-3 w-full rounded-2xl bg-amadeus-blue py-3 font-bold text-white disabled:opacity-40"
            >
              Usar este nome
            </button>
            <button type="button" onClick={() => setDigitar(false)} className="mt-2 w-full text-sm text-[#5A6478] underline">Voltar para a busca</button>
          </>
        ) : (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9AA3B4]" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite seu nome"
                autoComplete="off"
                className="w-full rounded-2xl border border-border py-3 pl-10 pr-4 text-base outline-none focus:border-amadeus-blue"
              />
              {procurando && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#9AA3B4]" />}
            </div>
            {achados.length > 0 && (
              <ul className="mt-2 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
                {achados.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => { setEscolhido({ id: a.id, nome: a.nome }); setJaEnviou(a.enviou); }}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amadeus-blue-50"
                    >
                      <span className="font-medium">{a.nome}</span>
                      {a.enviou && <span className="shrink-0 text-xs font-semibold text-emerald-700">já enviou</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {busca.trim().length >= 3 && !procurando && achados.length === 0 && (
              <p className="mt-2 text-sm text-[#5A6478]">Não achei esse nome na lista.</p>
            )}
            <button type="button" onClick={() => setDigitar(true)} className="mt-3 text-sm font-semibold text-amadeus-blue underline">
              Não achei meu nome
            </button>
          </>
        )}
        {jaEnviou && <p className="mt-2 text-xs text-[#5A6478]">Você já mandou uma foto. Se enviar outra, ela substitui a anterior.</p>}
      </div>

      {/* 2. Foto */}
      <div className={`rounded-3xl bg-white p-5 shadow-sm transition-opacity ${escolhido ? "" : "pointer-events-none opacity-40"}`}>
        <p className="text-sm font-bold text-amadeus-blue">2. Sua foto de criança</p>
        <input ref={entrada} type="file" accept="image/*" className="hidden" onChange={(e) => escolherFoto(e.target.files?.[0])} />
        {previa ? (
          <div className="mt-3">
            <img src={previa} alt="Sua foto" className="mx-auto max-h-72 rounded-2xl object-contain" />
            <button type="button" onClick={() => entrada.current?.click()} className="mt-3 w-full text-sm font-semibold text-amadeus-blue underline">Trocar a foto</button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => entrada.current?.click()}
            className="mt-3 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-amadeus-blue-100 px-4 py-8 text-amadeus-blue hover:bg-amadeus-blue-50"
          >
            <Camera className="size-7" />
            <span className="font-semibold">Escolher foto</span>
            <span className="text-xs text-[#5A6478]">Da galeria, ou tire uma foto da foto impressa</span>
          </button>
        )}
        <label className="mt-4 block text-sm font-semibold text-[#17223D]">
          Quantos anos você tinha? <span className="font-normal text-[#9AA3B4]">(opcional)</span>
          <input value={idade} onChange={(e) => setIdade(e.target.value)} maxLength={40} placeholder="Ex.: 5 anos" className="mt-1 w-full rounded-2xl border border-border px-4 py-3 text-base font-normal outline-none focus:border-amadeus-blue" />
        </label>
      </div>

      {erro && <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erro}</p>}

      <button
        type="button"
        onClick={enviar}
        disabled={!escolhido || !foto || enviando}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amadeus-yellow py-4 text-base font-extrabold text-amadeus-blue shadow-sm disabled:opacity-40"
      >
        {enviando && <Loader2 className="size-5 animate-spin" />}
        {enviando ? "Enviando…" : "Enviar foto"}
      </button>
    </div>
  );
}
