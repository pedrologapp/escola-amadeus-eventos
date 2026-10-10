"use client";

import { X } from "lucide-react";
import { primeiroNome, universoDaSerie } from "@/lib/arboria-historia";
import type { CriancaHistoria } from "./actions";

/**
 * O trailer da série da criança (public/arboria/trailer): Infantil tem o próprio;
 * 1º–2º (heróis), 3º–5º (agentes) e 6º–9º (Casas) usam o serie.html com ?u=.
 * As respostas do pai vão em k, das mais marcadas para as menos: os 2 lugares completos saem delas.
 */
export function urlTrailer(c: CriancaHistoria) {
  const universo = universoDaSerie(c.serie);
  const conta = new Map<string, number>();
  c.respostas.forEach((r) => { if (r) conta.set(r, (conta.get(r) ?? 0) + 1); });
  const k = [...conta.entries()].sort((a, b) => b[1] - a[1]).map(([chave]) => chave).join(",");
  const q = new URLSearchParams({ nome: primeiroNome(c.nome), g: c.genero === "menino" ? "menino" : "menina", k });
  if (universo === "infantil") return `/arboria/trailer/infantil.html?${q}`;
  q.set("u", universo);
  return `/arboria/trailer/serie.html?${q}`;
}

export function Trailer({ crianca, fechar }: { crianca: CriancaHistoria; fechar?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black">
      <iframe src={urlTrailer(crianca)} title={`A série de ${primeiroNome(crianca.nome)}`} className="h-full w-full border-0" allow="autoplay; fullscreen" />
      {fechar && (
        <button onClick={fechar} aria-label="Fechar" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white">
          <X size={20} />
        </button>
      )}
    </div>
  );
}
