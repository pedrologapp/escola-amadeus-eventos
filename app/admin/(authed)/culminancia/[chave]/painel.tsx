"use client";
/* eslint-disable @next/next/no-img-element -- imagens do Storage com link assinado */

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2, PencilLine, RotateCcw, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { BUCKET_CULMINANCIA, CHAVES, INTELIGENCIAS, ehChave, type Frente, type Outdoor } from "@/lib/culminancia";
import { apagarImagem, avaliarProposta, editarLegenda, prepararImagem, registrarImagem, salvarFrente } from "../actions";

export interface Imagem {
  id: string;
  tipo: "referencia" | "proposta";
  legenda: string | null;
  status: "pendente" | "aprovada" | "ajustar";
  comentario: string | null;
  quando: string;
  url: string | null;
}

const data = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit" });

export function PainelFrente({ frente, inicial, imagens }: {
  frente: Frente;
  inicial: { inteligencia: string | null; professora: string; ideia_sala: string; ideia_outdoor: string; outdoors: Outdoor[]; anotacoes: string; enviado_em: string | null };
  imagens: Imagem[];
}) {
  const router = useRouter();
  const [inteligencia, setInteligencia] = useState(inicial.inteligencia ?? "");
  const [professora, setProfessora] = useState(inicial.professora);
  const [ideiaSala, setIdeiaSala] = useState(inicial.ideia_sala);
  const [ideiaOutdoor, setIdeiaOutdoor] = useState(inicial.ideia_outdoor);
  const [outdoors, setOutdoors] = useState<Outdoor[]>(inicial.outdoors);
  const [anotacoes, setAnotacoes] = useState(inicial.anotacoes);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const intel = ehChave(inteligencia) ? INTELIGENCIAS[inteligencia] : null;
  const mudou = inteligencia !== (inicial.inteligencia ?? "") || professora !== inicial.professora || ideiaSala !== inicial.ideia_sala
    || ideiaOutdoor !== inicial.ideia_outdoor || anotacoes !== inicial.anotacoes || JSON.stringify(outdoors) !== JSON.stringify(inicial.outdoors);
  const mudaOutdoor = (i: number, o: Partial<Outdoor>) => setOutdoors(outdoors.map((x, k) => (k === i ? { ...x, ...o } : x)));
  const num = (v: string) => (v === "" ? null : Number(v));

  const salvar = async () => {
    setSalvando(true); setAviso(null);
    const r = await salvarFrente(frente.chave, { inteligencia: inteligencia || null, professora, ideia_sala: ideiaSala, ideia_outdoor: ideiaOutdoor, outdoors, anotacoes });
    setSalvando(false);
    setAviso(r.ok ? "Salvo." : r.erro);
    if (r.ok) router.refresh();
  };

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-8 w-1.5 rounded-full" style={{ background: intel?.cor ?? "#cbd5e1" }} />
        <h1 className="text-2xl font-extrabold text-amadeus-blue">{frente.titulo}</h1>
        <span className="text-sm text-muted-foreground">{frente.segmento}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${inicial.enviado_em ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>
          {inicial.enviado_em ? `Professora enviou em ${data(inicial.enviado_em)}` : "Professora ainda não enviou"}
        </span>
      </div>

      <section className="mt-5 rounded-2xl border border-border/60 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold">
            Inteligência
            {frente.casa ? (
              <p className="mt-1 font-normal" style={{ color: intel?.cor }}>{intel?.nome} (casa)</p>
            ) : (
              <select value={inteligencia} onChange={(e) => setInteligencia(e.target.value)}
                className="mt-1 block w-full rounded-xl border border-border bg-white px-3 py-2 font-normal">
                <option value="">Escolha a inteligência da sala</option>
                {CHAVES.map((k) => <option key={k} value={k}>{INTELIGENCIAS[k].nome}</option>)}
              </select>
            )}
          </label>
          <label className="block text-sm font-semibold">
            Professora(s)
            <input value={professora} onChange={(e) => setProfessora(e.target.value)} placeholder="Nome de quem trouxe a ideia"
              className="mt-1 block w-full rounded-xl border border-border px-3 py-2 font-normal" />
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block text-sm font-semibold">
            Como vai ficar a sala
            <textarea value={ideiaSala} onChange={(e) => setIdeiaSala(e.target.value)} rows={6}
              className="mt-1 block w-full rounded-xl border border-border px-3 py-2 font-normal leading-relaxed" />
          </label>
          <label className="block text-sm font-semibold">
            Ideia do outdoor
            <textarea value={ideiaOutdoor} onChange={(e) => setIdeiaOutdoor(e.target.value)} rows={6}
              className="mt-1 block w-full rounded-xl border border-border px-3 py-2 font-normal leading-relaxed" />
          </label>
        </div>
        <div className="mt-4">
          <p className="text-sm font-semibold">Outdoors (cm)</p>
          <div className="mt-1 space-y-2">
            {outdoors.map((o, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input value={o.descricao} onChange={(e) => mudaOutdoor(i, { descricao: e.target.value })} placeholder="Onde fica"
                  className="min-w-0 flex-1 rounded-xl border border-border px-3 py-1.5 text-sm" />
                <input type="number" value={o.largura ?? ""} onChange={(e) => mudaOutdoor(i, { largura: num(e.target.value) })} placeholder="largura"
                  className="w-24 rounded-xl border border-border px-3 py-1.5 text-sm" />
                <span className="text-sm text-muted-foreground">×</span>
                <input type="number" value={o.altura ?? ""} onChange={(e) => mudaOutdoor(i, { altura: num(e.target.value) })} placeholder="altura"
                  className="w-24 rounded-xl border border-border px-3 py-1.5 text-sm" />
                <button onClick={() => setOutdoors(outdoors.filter((_, k) => k !== i))} className="text-xs text-red-600">remover</button>
              </div>
            ))}
            <button onClick={() => setOutdoors([...outdoors, { descricao: "", largura: null, altura: null }])} className="text-sm font-semibold text-amadeus-blue">+ outdoor</button>
          </div>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Nossas anotações
          <textarea value={anotacoes} onChange={(e) => setAnotacoes(e.target.value)} rows={3}
            placeholder="O que corrigir, o que manter, direção da arte..."
            className="mt-1 block w-full rounded-xl border border-border px-3 py-2 font-normal leading-relaxed" />
        </label>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={salvar} disabled={salvando || !mudou}
            className="rounded-full bg-amadeus-blue px-5 py-2 text-sm font-bold text-white disabled:opacity-40">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          {aviso && <span className="text-sm text-muted-foreground">{aviso}</span>}
        </div>
      </section>

      <Galeria titulo="Imagens da professora" nota="O que ela trouxe: rascunhos, referências, fotos de ideias." tipo="referencia"
        frente={frente.chave} imagens={imagens.filter((i) => i.tipo === "referencia")} />
      <Galeria titulo="Nossas propostas" nota="As versões que geramos. Aprove ou peça ajuste dizendo o que mudar." tipo="proposta"
        frente={frente.chave} imagens={imagens.filter((i) => i.tipo === "proposta")} />
    </div>
  );
}

function Galeria({ titulo, nota, tipo, frente, imagens }: { titulo: string; nota: string; tipo: Imagem["tipo"]; frente: string; imagens: Imagem[] }) {
  const router = useRouter();
  const entrada = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const enviar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    setErro(null);
    try {
      for (const [n, arquivo] of Array.from(arquivos).entries()) {
        if (!arquivo.type.startsWith("image/")) throw new Error(`"${arquivo.name}" não é uma imagem.`);
        setEnviando(`Enviando ${n + 1} de ${arquivos.length}...`);
        const p = await prepararImagem(frente, arquivo.name);
        if (!p.ok) throw new Error(p.erro);
        const { error } = await createClient().storage.from(BUCKET_CULMINANCIA).uploadToSignedUrl(p.path, p.token, arquivo, { contentType: arquivo.type });
        if (error) throw new Error(error.message);
        const r = await registrarImagem(frente, tipo, p.path, "");
        if (!r.ok) throw new Error(r.erro);
      }
      router.refresh();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setEnviando(null);
      if (entrada.current) entrada.current.value = "";
    }
  };

  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{titulo}</h2>
          <p className="text-sm text-muted-foreground">{nota}</p>
        </div>
        <button onClick={() => entrada.current?.click()} disabled={!!enviando}
          className="inline-flex items-center gap-2 rounded-full border border-amadeus-blue/40 px-4 py-2 text-sm font-semibold text-amadeus-blue disabled:opacity-50">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {enviando ?? "Adicionar imagens"}
        </button>
        <input ref={entrada} type="file" accept="image/*" multiple hidden onChange={(e) => enviar(e.target.files)} />
      </div>
      {erro && <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
      {imagens.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma imagem ainda.</p>
      ) : (
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {imagens.map((i) => <Cartao key={i.id} i={i} />)}
        </div>
      )}
    </section>
  );
}

function Cartao({ i }: { i: Imagem }) {
  const router = useRouter();
  const [legenda, setLegenda] = useState(i.legenda ?? "");
  const [pedindo, setPedindo] = useState(false);
  const [comentario, setComentario] = useState(i.comentario ?? "");
  const [ocupado, setOcupado] = useState(false);
  const faz = async (f: () => Promise<{ ok: boolean }>) => { setOcupado(true); await f(); setOcupado(false); setPedindo(false); router.refresh(); };
  const selo = i.status === "aprovada" ? ["Aprovada", "bg-emerald-50 text-emerald-700"] : i.status === "ajustar" ? ["Ajustar", "bg-amber-50 text-amber-800"] : ["Para aprovar", "bg-blue-50 text-blue-700"];

  return (
    <div className={`overflow-hidden rounded-2xl border bg-white ${i.status === "aprovada" && i.tipo === "proposta" ? "border-emerald-400" : "border-border/60"}`}>
      {i.url ? (
        <a href={i.url} target="_blank" rel="noreferrer"><img src={i.url} alt={legenda || "imagem"} className="aspect-[4/3] w-full bg-slate-50 object-contain" /></a>
      ) : <div className="aspect-[4/3] w-full bg-slate-100" />}
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between gap-2">
          {i.tipo === "proposta" ? <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${selo[1]}`}>{selo[0]}</span> : <span />}
          <span className="text-xs text-muted-foreground">{data(i.quando)}</span>
        </div>
        <input value={legenda} onChange={(e) => setLegenda(e.target.value)} onBlur={() => legenda !== (i.legenda ?? "") && editarLegenda(i.id, legenda)}
          placeholder="Legenda (opcional)" className="w-full rounded-lg border border-transparent px-2 py-1 text-sm hover:border-border focus:border-border" />
        {i.tipo === "proposta" && i.status === "ajustar" && i.comentario && !pedindo && (
          <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{i.comentario}</p>
        )}
        {pedindo && (
          <div className="space-y-2">
            <textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} placeholder="O que mudar?"
              className="w-full rounded-lg border border-border px-2 py-1 text-sm" />
            <div className="flex gap-2">
              <button disabled={ocupado} onClick={() => faz(() => avaliarProposta(i.id, "ajustar", comentario))}
                className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-bold text-white">Pedir ajuste</button>
              <button onClick={() => setPedindo(false)} className="rounded-full px-3 py-1.5 text-xs text-muted-foreground">Cancelar</button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {i.tipo === "proposta" && !pedindo && (
            <>
              {i.status !== "aprovada" && (
                <button disabled={ocupado} onClick={() => faz(() => avaliarProposta(i.id, "aprovada", ""))}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Aprovar</button>
              )}
              <button disabled={ocupado} onClick={() => setPedindo(true)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-400 px-3 py-1.5 text-xs font-semibold text-amber-800"><PencilLine className="h-3.5 w-3.5" /> Ajustar</button>
              {i.status !== "pendente" && (
                <button disabled={ocupado} onClick={() => faz(() => avaliarProposta(i.id, "pendente", ""))}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-muted-foreground"><RotateCcw className="h-3.5 w-3.5" /> Desfazer</button>
              )}
            </>
          )}
          <button disabled={ocupado} onClick={() => window.confirm("Apagar esta imagem?") && faz(() => apagarImagem(i.id))}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /> Apagar</button>
        </div>
      </div>
    </div>
  );
}
