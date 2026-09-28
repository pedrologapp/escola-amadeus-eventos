"use client";

/* eslint-disable @next/next/no-img-element -- prévias vêm da rota /api/eventos/cartaz */
import { useEffect, useState } from "react";
import { Check, Download, ImageOff, Loader2, Sparkles, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  ESTILOS,
  FORMATOS,
  LAYOUTS,
  codificar,
  type Detalhe,
  type EspecCartaz,
  type Formato,
  type Proposta,
} from "@/lib/cartaz";
import { gerarPropostas, prepararFotoCartaz } from "./actions";

export interface FatosEvento {
  nome: string;
  data: string;
  hora: string | null;
  local: string | null;
  preco: string | null;
  link: string;
  fotos: string[];
  resumo: string;
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="flex items-center gap-2 font-bold text-amadeus-blue">
        <span className="grid size-6 place-items-center rounded-full bg-amadeus-blue text-xs text-white">{n}</span> {titulo}
      </p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const url = (e: EspecCartaz, baixar = false) => `/api/eventos/cartaz?d=${codificar(e)}${baixar ? "&baixar=1" : "&escala=0.45"}`;

export function EditorCartaz({ fatos }: { fatos: FatosEvento }) {
  const [formato, setFormato] = useState<Formato>("feed");
  const [detalhe, setDetalhe] = useState<Detalhe>("detalhado");
  const [frase, setFrase] = useState("");
  const [foto, setFoto] = useState<string | null>(fatos.fotos[0] ?? null);
  const [fotos, setFotos] = useState(fatos.fotos);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [escolhida, setEscolhida] = useState<number | null>(null);
  const [edicao, setEdicao] = useState<Proposta | null>(null);
  const [previa, setPrevia] = useState<Proposta | null>(null);
  // A prévia só redesenha quando para de digitar (cada desenho leva uns segundos).
  useEffect(() => {
    const t = setTimeout(() => setPrevia(edicao), 700);
    return () => clearTimeout(t);
  }, [edicao]);

  const espec = (p: Proposta): EspecCartaz => ({
    formato, detalhe, estilo: p.estilo, layout: foto ? p.layout : "sem-foto", foco: p.foco,
    titulo: p.titulo || fatos.nome, chamada: p.chamada, destaques: p.destaques,
    data: fatos.data, hora: fatos.hora, local: fatos.local,
    preco: detalhe === "detalhado" ? fatos.preco : null, link: detalhe === "detalhado" ? fatos.link : null, foto,
  });

  const enviarFoto = async (arquivo: File) => {
    setEnviandoFoto(true);
    setErro(null);
    try {
      const p = await prepararFotoCartaz(arquivo.name);
      if (!p.ok) throw new Error(p.erro);
      const { error } = await createClient().storage.from("eventos").uploadToSignedUrl(p.path, p.token, arquivo, { contentType: arquivo.type || "image/jpeg" });
      if (error) throw new Error(error.message);
      setFotos((f) => [p.url, ...f]);
      setFoto(p.url);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviandoFoto(false);
    }
  };

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    setPropostas([]);
    setEscolhida(null);
    setEdicao(null);
    const r = await gerarPropostas({ fatos: fatos.resumo, formato, detalhe, frase, foto });
    setGerando(false);
    if (!r.ok || !r.propostas) return setErro(r.erro ?? "Não consegui gerar.");
    setPropostas(r.propostas);
  };

  const proporcao = `${FORMATOS[formato].w} / ${FORMATOS[formato].h}`;

  return (
    <div className="mt-6 grid gap-5">
      <Passo n={1} titulo="Tamanho">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(FORMATOS) as Formato[]).map((f) => {
            const F = FORMATOS[f];
            return (
              <button key={f} type="button" onClick={() => setFormato(f)} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center ${formato === f ? "border-amadeus-blue bg-amadeus-blue-50 ring-2 ring-amadeus-blue/30" : "border-border hover:border-amadeus-blue/50"}`}>
                <span className="flex h-24 items-center justify-center">
                  <span className="block rounded-md bg-gradient-to-b from-amadeus-blue to-[#0A3A8C] shadow" style={{ height: 88, width: (88 * F.w) / F.h }} />
                </span>
                <span className="text-sm font-bold">{F.rotulo}</span>
                <span className="text-xs text-muted-foreground">{F.detalhe}</span>
              </button>
            );
          })}
        </div>
      </Passo>

      <Passo n={2} titulo="Quanta informação">
        <div className="grid gap-3 sm:grid-cols-2">
          {([
            ["conciso", "Conciso", "Nome do evento, chamada, data, horário e local. Bom para story e para chamar atenção."],
            ["detalhado", "Detalhado", "Tudo do conciso + destaques (o que inclui, público), valor e QR code para inscrição."],
          ] as const).map(([v, t, d]) => (
            <button key={v} type="button" onClick={() => setDetalhe(v)} className={`rounded-xl border p-4 text-left ${detalhe === v ? "border-amadeus-blue bg-amadeus-blue-50 ring-2 ring-amadeus-blue/30" : "border-border hover:border-amadeus-blue/50"}`}>
              <span className="font-bold">{t}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{d}</span>
            </button>
          ))}
        </div>
      </Passo>

      <Passo n={3} titulo="Quer alguma frase? (opcional)">
        <input value={frase} onChange={(e) => setFrase(e.target.value)} placeholder="Ex.: Um dia inteiro de diversão com os amigos" className="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-amadeus-blue" />
        <p className="mt-1.5 text-xs text-muted-foreground">Se deixar em branco, a IA sugere a chamada a partir da foto e do evento.</p>
      </Passo>

      <Passo n={4} titulo="Foto">
        <div className="flex flex-wrap gap-3">
          {fotos.map((f) => (
            <button key={f} type="button" onClick={() => setFoto(f)} className={`relative size-24 overflow-hidden rounded-xl border-2 ${foto === f ? "border-amadeus-blue" : "border-transparent"}`}>
              <img src={f} alt="" className="size-full object-cover" />
              {foto === f && <span className="absolute right-1 top-1 grid size-5 place-items-center rounded-full bg-amadeus-blue text-white"><Check className="size-3" /></span>}
            </button>
          ))}
          <label className="grid size-24 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-border text-center text-xs text-muted-foreground hover:border-amadeus-blue">
            {enviandoFoto ? <Loader2 className="size-5 animate-spin" /> : <span className="flex flex-col items-center gap-1"><Upload className="size-5" /> Enviar outra</span>}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && enviarFoto(e.target.files[0])} />
          </label>
          <button type="button" onClick={() => setFoto(null)} className={`grid size-24 place-items-center rounded-xl border-2 text-xs text-muted-foreground ${foto === null ? "border-amadeus-blue" : "border-dashed border-border"}`}>
            <span className="flex flex-col items-center gap-1"><ImageOff className="size-5" /> Sem foto</span>
          </button>
        </div>
      </Passo>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={gerar} disabled={gerando} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-5 py-3 font-bold text-white hover:opacity-90 disabled:opacity-50">
          {gerando ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          {gerando ? "Lendo a foto e criando propostas…" : propostas.length ? "Gerar outras propostas" : "Ver propostas de cartaz"}
        </button>
        {erro && <p className="text-sm text-red-700">{erro}</p>}
      </div>

      {propostas.length > 0 && (
        <section>
          <p className="font-bold text-amadeus-blue">Escolha uma proposta</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {propostas.map((p, i) => (
              <button key={i} type="button" onClick={() => { setEscolhida(i); setEdicao(p); }} className={`overflow-hidden rounded-2xl border bg-white text-left ${escolhida === i ? "border-amadeus-blue ring-2 ring-amadeus-blue/40" : "border-border hover:border-amadeus-blue/50"}`}>
                <img src={url(espec(p))} alt={p.nome} className="w-full bg-muted" style={{ aspectRatio: proporcao }} />
                <span className="block p-3">
                  <span className="block font-bold">{p.nome}</span>
                  <span className="block text-xs text-muted-foreground">{p.porque}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {edicao && (
        <section className="grid gap-5 rounded-2xl border border-border/60 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-3 text-sm">
            <p className="font-bold text-amadeus-blue">Ajustar e baixar</p>
            <label className="block font-semibold">Título
              <input value={edicao.titulo} onChange={(e) => setEdicao({ ...edicao, titulo: e.target.value })} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
            </label>
            <label className="block font-semibold">Chamada
              <textarea value={edicao.chamada} onChange={(e) => setEdicao({ ...edicao, chamada: e.target.value })} rows={2} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
            </label>
            {detalhe === "detalhado" && (
              <label className="block font-semibold">Destaques (um por linha, até 4)
                <textarea value={edicao.destaques.join("\n")} onChange={(e) => setEdicao({ ...edicao, destaques: e.target.value.split("\n").slice(0, 4) })} rows={4} className="mt-1 w-full rounded-lg border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
              </label>
            )}
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block font-semibold">Cores
                <select value={edicao.estilo} onChange={(e) => setEdicao({ ...edicao, estilo: e.target.value as Proposta["estilo"] })} className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 font-normal">
                  {Object.entries(ESTILOS).map(([k, v]) => <option key={k} value={k}>{v.rotulo}</option>)}
                </select>
              </label>
              <label className="block font-semibold">Composição
                <select value={edicao.layout} onChange={(e) => setEdicao({ ...edicao, layout: e.target.value as Proposta["layout"] })} className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 font-normal">
                  {Object.entries(LAYOUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="block font-semibold">Parte da foto
                <select value={edicao.foco} onChange={(e) => setEdicao({ ...edicao, foco: e.target.value as Proposta["foco"] })} className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-2 font-normal">
                  <option value="top">Mostrar mais o topo</option>
                  <option value="center">Centro</option>
                  <option value="bottom">Mostrar mais embaixo</option>
                </select>
              </label>
            </div>
            <a href={url(espec(edicao), true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-bold text-white hover:bg-emerald-700">
              <Download className="size-4" /> Baixar cartaz (PNG)
            </a>
            <p className="text-xs text-muted-foreground">Data, horário, local e valor vêm do cadastro do evento. Para mudar, edite o evento.</p>
          </div>
          <img key={previa ? codificar(espec(previa)) : "vazio"} src={previa ? url(espec(previa)) : undefined} alt="Prévia" className="w-full rounded-xl border border-border bg-muted" style={{ aspectRatio: proporcao }} />
        </section>
      )}
    </div>
  );
}
