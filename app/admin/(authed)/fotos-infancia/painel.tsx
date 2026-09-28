"use client";

import { useState } from "react";
import { Check, Copy, Download, ExternalLink, Search } from "lucide-react";

export interface FotoEnviada {
  chave: string;
  nome: string;
  idade: string | null;
  quando: string;
  url: string | null;
  naLista: boolean; // false = digitou o nome (não está no Activesoft)
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export function PainelFotos({ link, enviadas, faltam, total }: { link: string; enviadas: FotoEnviada[]; faltam: string[]; total: number }) {
  const [aba, setAba] = useState<"enviaram" | "faltam">("enviaram");
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState<"link" | "texto" | "faltam" | null>(null);

  const texto = `Oi, equipe Amadeus! Estamos preparando uma surpresa e precisamos de uma ajudinha: uma foto de quando vocês eram crianças.\n\nÉ só abrir o link, selecionar o seu nome e enviar a foto:\n${link}`;
  const copiar = async (o: "link" | "texto" | "faltam", t: string) => {
    await navigator.clipboard.writeText(t);
    setCopiado(o);
    setTimeout(() => setCopiado(null), 2000);
  };

  const q = semAcento(busca.trim());
  const env = enviadas.filter((f) => !q || semAcento(f.nome).includes(q));
  const fal = faltam.filter((n) => !q || semAcento(n).includes(q));
  const daLista = enviadas.filter((f) => f.naLista).length;
  const pct = total ? Math.round((daLista / total) * 100) : 0;

  const botao = "inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-amadeus-blue p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-amadeus-yellow">Enviaram</p>
          <p className="mt-1 text-3xl font-extrabold">{enviadas.length}</p>
          {enviadas.length > daLista && <p className="text-xs opacity-80">{enviadas.length - daLista} com nome digitado (fora da lista)</p>}
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faltam</p>
          <p className="mt-1 text-3xl font-extrabold text-amadeus-blue">{faltam.length}</p>
          <p className="text-xs text-muted-foreground">de {total} colaboradores ativos</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Andamento</p>
          <p className="mt-1 text-3xl font-extrabold text-amadeus-blue">{pct}%</p>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-amadeus-yellow" style={{ width: `${pct}%` }} /></div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-white p-4">
        <p className="text-sm font-bold text-amadeus-blue">Link para a equipe</p>
        <p className="mt-1 break-all text-sm text-muted-foreground">{link}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => copiar("link", link)} className={botao}>
            {copiado === "link" ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar link
          </button>
          <button type="button" onClick={() => copiar("texto", texto)} className={botao}>
            {copiado === "texto" ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar mensagem para o WhatsApp
          </button>
          <a href={link} target="_blank" rel="noreferrer" className={botao}><ExternalLink className="size-4" /> Abrir a página</a>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {([["enviaram", `Enviaram (${enviadas.length})`], ["faltam", `Faltam (${faltam.length})`]] as const).map(([v, t]) => (
          <button
            key={v}
            type="button"
            onClick={() => setAba(v)}
            className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${aba === v ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}
          >
            {t}
          </button>
        ))}
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar nome" className="w-full rounded-xl border border-border bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-amadeus-blue" />
        </div>
      </div>

      {aba === "enviaram" ? (
        env.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhuma foto ainda.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {env.map((f) => (
              <figure key={f.chave} className="overflow-hidden rounded-2xl border border-border/60 bg-white">
                {f.url ? (
                  <a href={f.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt={`Foto de infância de ${f.nome}`} className="aspect-square w-full bg-muted object-cover" loading="lazy" />
                  </a>
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-muted text-xs text-muted-foreground">sem prévia</div>
                )}
                <figcaption className="p-3">
                  <p className="text-sm font-bold leading-tight">{f.nome}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {f.idade ? `${f.idade} · ` : ""}{quando(f.quando)}
                  </p>
                  {!f.naLista && <p className="mt-1 text-xs font-semibold text-amber-700">Nome digitado</p>}
                  {f.url && (
                    <a href={`${f.url}&download=${encodeURIComponent(`${f.nome}.jpg`)}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-amadeus-blue">
                      <Download className="size-3.5" /> Baixar
                    </a>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        )
      ) : (
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Ainda não mandaram a foto:</p>
            {faltam.length > 0 && (
              <button type="button" onClick={() => copiar("faltam", faltam.join("\n"))} className={botao}>
                {copiado === "faltam" ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar a lista
              </button>
            )}
          </div>
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {fal.map((n) => <li key={n}>{n}</li>)}
          </ul>
          {fal.length === 0 && <p className="mt-2 text-sm text-muted-foreground">{faltam.length ? "Nenhum nome encontrado." : "Todo mundo já mandou!"}</p>}
        </div>
      )}
    </div>
  );
}
