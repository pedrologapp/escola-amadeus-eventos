"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { marcarAplicadoNaIlha } from "./actions";

/** O que as professoras conferiram em "Revisar amigos". As trocas de nome valem no Diário sozinhas; na ilha 3D, à mão. */
export interface LinhaRevisao {
  alunoId: string;
  aluno: string;
  turma: "A" | "B";
  slug: string;
  original: string | null;
  novo: string | null; // null = manteve o original
  observacao: string | null;
  conferidoPor: string | null;
  conferidoEm: string | null;
  aplicadoNaIlha: boolean;
}

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function RevisaoAmigos({ linhas, total }: { linhas: LinhaRevisao[]; total: number }) {
  const [pendente, iniciar] = useTransition();
  const aplicar = linhas.filter((l) => (l.novo || l.observacao) && !l.aplicadoNaIlha);
  return (
    <section className="rounded-2xl border border-border/60 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-extrabold text-amadeus-blue">Revisão das professoras</h2>
        <p className="text-sm text-muted-foreground">
          {linhas.length} de {total} amigos conferidos · {aplicar.length} para aplicar na ilha
        </p>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">O nome corrigido já vale no Diário. Na ilha 3D, troque à mão e marque aqui.</p>
      {linhas.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Nenhuma criança conferida ainda.</p>}
      <div className="mt-3 divide-y divide-border/60">
        {linhas.map((l) => (
          <div key={l.alunoId} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
            <div className="min-w-0">
              <p className="font-bold text-amadeus-blue">
                {l.aluno} <span className="font-normal text-muted-foreground">· Grupo V {l.turma} · ilha ?c={l.slug}</span>
              </p>
              <p>
                {l.novo ? (
                  <>
                    Nome: <s className="text-muted-foreground">{l.original ?? "sem nome"}</s> → <b>{l.novo}</b>
                  </>
                ) : (
                  <>Nome confirmado: {l.original ?? "sem nome"}</>
                )}
                {l.observacao && <span className="block text-amber-800">Obs.: {l.observacao}</span>}
              </p>
              <p className="text-xs text-muted-foreground">
                {l.conferidoPor} · {l.conferidoEm ? quando(l.conferidoEm) : ""}
              </p>
            </div>
            {(l.novo || l.observacao) &&
              (l.aplicadoNaIlha ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  <Check className="h-3.5 w-3.5" /> Aplicado na ilha
                </span>
              ) : (
                <button disabled={pendente} onClick={() => iniciar(async () => void (await marcarAplicadoNaIlha(l.alunoId)))} className="rounded-lg bg-amadeus-blue px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
                  Já troquei na ilha
                </button>
              ))}
          </div>
        ))}
      </div>
    </section>
  );
}
