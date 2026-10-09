"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ExternalLink, Loader2, Play, QrCode, Sparkles, Undo2 } from "lucide-react";
import { comecarReuniao, liberarHistorias, recolherHistorias } from "./actions";

interface Linha { id: string; responsavel: string | null; nome: string; serie: string; genero: string; universo: string; valida: boolean; foto: boolean; criado_em: string }

const hora = (d: string | null) => (d ? new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }) : null);

export function Painel({ iniciada, liberada, criancas }: { iniciada: string | null; liberada: string | null; criancas: Linha[] }) {
  const router = useRouter();
  const [ocupado, iniciar] = useTransition();
  // a lista se atualiza sozinha enquanto os pais se cadastram
  useEffect(() => { const t = setInterval(() => router.refresh(), 8000); return () => clearInterval(t); }, [router]);
  const validas = criancas.filter((c) => c.valida);
  const fazer = (f: () => Promise<void>, pergunta?: string) => { if (pergunta && !window.confirm(pergunta)) return; iniciar(async () => { await f(); router.refresh(); }); };

  return (
    <div className="mt-6 space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">1 · Começo</p>
          <p className="mt-2 text-sm">{iniciada ? <>Reunião começou às <b>{hora(iniciada)}</b>.</> : "A reunião ainda não começou."}</p>
          <button disabled={ocupado} onClick={() => fazer(comecarReuniao, iniciada ? "Recomeçar a reunião agora? Quem se cadastrou antes deste momento não recebe a história." : undefined)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amadeus-blue px-4 py-3 font-bold text-white disabled:opacity-40">
            {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />} {iniciada ? "Recomeçar reunião" : "Começar reunião"}
          </button>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">2 · Cadastros</p>
          <p className="mt-2 text-4xl font-extrabold text-amadeus-blue">{validas.length}</p>
          <p className="text-sm text-muted-foreground">{validas.length === 1 ? "criança vai receber a história" : "crianças vão receber a história"}</p>
          <a href="/arboria/qr" target="_blank" className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-amadeus-blue underline"><QrCode className="size-4" /> Abrir o QR para a TV</a>
        </div>
        <div className={`rounded-2xl border-2 p-5 ${liberada ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">3 · A surpresa</p>
          <p className="mt-2 text-sm">{liberada ? <>Histórias liberadas às <b>{hora(liberada)}</b>.</> : "Aperte no fim da atividade."}</p>
          {liberada ? (
            <button disabled={ocupado} onClick={() => fazer(recolherHistorias, "Esconder as histórias de novo?")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 px-4 py-3 font-bold text-emerald-700 disabled:opacity-40">
              <Undo2 className="size-4" /> Esconder de novo
            </button>
          ) : (
            <button disabled={ocupado || !iniciada} onClick={() => fazer(liberarHistorias, `Liberar as histórias para ${validas.length} criança(s) agora?`)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFC21A] px-4 py-3 text-lg font-extrabold text-[#0A2F7A] shadow disabled:opacity-40">
              <Sparkles className="size-5" /> Liberar histórias
            </button>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-amadeus-blue">Crianças cadastradas · {criancas.length}</p>
          <a href="/arboria?demo=Grupo V&nome=Maria&g=menina&p=morena&c=cacheado" target="_blank" className="inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue underline"><ExternalLink className="size-4" /> Ver uma história de exemplo</a>
        </div>
        <div className="mt-3 divide-y divide-border/60">
          {criancas.map((c) => (
            <div key={c.id} className={`flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm ${c.valida ? "" : "opacity-50"}`}>
              <span><b className="text-amadeus-blue">{c.nome}</b> · {c.serie} · {c.genero}{c.responsavel ? <span className="text-muted-foreground"> · {c.responsavel}</span> : null}</span>
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                {c.foto && <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-1.5 py-0.5 font-bold text-sky-700"><Camera className="size-3" /> foto</span>}
                <span>{c.universo}</span>
                <span>{hora(c.criado_em)}</span>
                {!c.valida && <span className="rounded-md bg-muted px-1.5 py-0.5 font-bold">antes do começo</span>}
                <a href={`/arboria?demo=${encodeURIComponent(c.serie)}&nome=${encodeURIComponent(c.nome)}&g=${c.genero}`} target="_blank" className="font-semibold text-amadeus-blue underline">ver</a>
              </span>
            </div>
          ))}
          {!criancas.length && <p className="py-4 text-sm text-muted-foreground">Ninguém se cadastrou ainda.</p>}
        </div>
      </section>
    </div>
  );
}
