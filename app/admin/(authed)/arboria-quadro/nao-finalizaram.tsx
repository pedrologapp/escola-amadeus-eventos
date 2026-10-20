"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { TODOS, imagem } from "@/lib/arboria-quadro";
import { analisar } from "./actions";
import { SITUACAO_CLIENTE } from "./situacao";
import type { Linha } from "./dados";

/** Quem não finalizou, por rodada: o que escreveu, o que o colega escolheu, as perguntas do Arboria e a análise da IA. */
export function NaoFinalizaram({ sala, linhas }: { sala: string; linhas: Linha[] }) {
  const [analises, setAnalises] = useState<Record<string, string>>(() => Object.fromEntries(linhas.filter((l) => l.analise).map((l) => [`${l.aluno}:${l.rodada}`, l.analise!])));
  const [lendo, setLendo] = useState<Set<string>>(new Set());
  const [erro, setErro] = useState("");

  const uma = async (l: Linha) => {
    const k = `${l.aluno}:${l.rodada}`;
    setLendo((s) => new Set(s).add(k));
    const r = await analisar(sala, l.aluno, l.rodada).catch(() => null);
    setLendo((s) => { const n = new Set(s); n.delete(k); return n; });
    if (r?.ok) setAnalises((a) => ({ ...a, [k]: r.texto })); else setErro(r?.erro ?? "Sem conexão. Tente de novo.");
  };
  const todas = async () => {
    setErro("");
    const fila = linhas.filter((l) => !analises[`${l.aluno}:${l.rodada}`]);
    // três de cada vez, para não demorar nem sobrecarregar
    for (let i = 0; i < fila.length; i += 3) await Promise.all(fila.slice(i, i + 3).map(uma));
  };
  const faltam = linhas.filter((l) => !analises[`${l.aluno}:${l.rodada}`]).length;
  const rodadas = [...new Set(linhas.map((l) => l.rodada))].sort();

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-extrabold text-amadeus-blue">Quem não finalizou · {linhas.length}</h2>
          <p className="text-sm text-muted-foreground">O que cada um escreveu, o quadro que o colega escolheu no lugar, e a análise da IA de por que não funcionou.</p>
        </div>
        {faltam > 0 && (
          <button onClick={todas} disabled={lendo.size > 0} className="flex items-center gap-2 rounded-full bg-amadeus-blue px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            {lendo.size > 0 ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Analisar todos ({faltam})
          </button>
        )}
      </div>
      {erro && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{erro}</p>}
      {!linhas.length && <p className="mt-4 text-sm text-muted-foreground">Todos finalizaram as rodadas.</p>}

      {rodadas.map((r) => (
        <div key={r} className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Rodada {r}</h3>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {linhas.filter((l) => l.rodada === r).map((l) => {
              const k = `${l.aluno}:${l.rodada}`;
              const escolhas = [...new Set(l.versoes.map((v) => v.escolha).filter((e): e is string => !!e && e !== l.quadro))];
              const barradas = l.notas.filter((n) => !n.aprovado && n.observacao);
              return (
                <article key={k} className="rounded-2xl border bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-lg font-extrabold text-amadeus-blue">{l.nome}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SITUACAO_CLIENTE[l.situacao].cor}`}>{SITUACAO_CLIENTE[l.situacao].rotulo}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">Adivinhando nesta rodada: acertou {l.acertou} de {l.adivinhou}</p>

                  {(l.quadro || escolhas.length > 0) && (
                    <div className="mt-3 flex flex-wrap gap-3">
                      {l.quadro && <Mini id={l.quadro} legenda="O quadro dele" cor="border-emerald-500" />}
                      {escolhas.map((e) => <Mini key={e} id={e} legenda="O colega escolheu" cor="border-rose-400" />)}
                    </div>
                  )}

                  {l.versoes.map((v) => (
                    <div key={v.versao} className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Versão {v.versao} · {v.acertou === null ? "ninguém respondeu" : v.acertou ? "colega acertou" : "colega errou"}</p>
                      <p className="mt-1 rounded-lg bg-muted/50 px-3 py-2 text-sm italic">“{v.texto}”</p>
                    </div>
                  ))}
                  {barradas.length > 0 && (
                    <details className="mt-3 text-sm">
                      <summary className="cursor-pointer font-semibold text-amber-700">O Arboria segurou {barradas.length} {barradas.length === 1 ? "tentativa" : "tentativas"} antes do envio</summary>
                      <ol className="mt-2 space-y-2">
                        {barradas.map((n, i) => <li key={i}><p className="italic text-muted-foreground">“{n.texto}”</p><p className="text-amber-800">Arboria: {n.observacao}</p></li>)}
                      </ol>
                    </details>
                  )}

                  <div className="mt-4 rounded-xl border border-dashed border-amadeus-blue/40 bg-blue-50/40 p-3">
                    {analises[k] ? (
                      <>
                        <Analise texto={analises[k]} />
                        <button onClick={() => uma(l)} disabled={lendo.has(k)} className="mt-2 text-xs font-semibold text-amadeus-blue underline disabled:opacity-50">{lendo.has(k) ? "Analisando…" : "Analisar de novo"}</button>
                      </>
                    ) : (
                      <button onClick={() => uma(l)} disabled={lendo.has(k)} className="flex items-center gap-2 text-sm font-bold text-amadeus-blue disabled:opacity-50">
                        {lendo.has(k) ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} {lendo.has(k) ? "Analisando…" : "Por que não funcionou? Analisar com IA"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

function Mini({ id, legenda, cor }: { id: string; legenda: string; cor: string }) {
  return (
    <figure className="m-0 w-32">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imagem(id)} alt={TODOS[id]?.titulo ?? ""} className={`h-24 w-32 rounded-lg border-4 object-cover ${cor}`} />
      <figcaption className="mt-1 text-xs font-semibold">{legenda}</figcaption>
      <figcaption className="text-[11px] leading-tight text-muted-foreground">{TODOS[id]?.titulo}</figcaption>
    </figure>
  );
}

/** A análise em três partes: o título de cada parte ("O que aconteceu:") em negrito. */
function Analise({ texto }: { texto: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {texto.replace(/[*#]+/g, "").split(/\n+/).filter((p) => p.trim()).map((p, i) => {
        const m = p.match(/^(O que aconteceu|Por que não funcionou|Para trabalhar com (?:ele|ela)):\s*(.*)$/i);
        return <p key={i}>{m ? <><b className="text-amadeus-blue">{m[1]}:</b> {m[2]}</> : p}</p>;
      })}
    </div>
  );
}
