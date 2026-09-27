"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import type { AlunoBusca } from "@/lib/rematricula-2027-dados";

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export function BuscaAluno({ alunos }: { alunos: AlunoBusca[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [carregando, iniciar] = useTransition();
  const achados = useMemo(() => {
    const partes = semAcento(busca.trim()).split(/\s+/).filter(Boolean);
    if (busca.trim().length < 2) return [];
    return alunos.filter((a) => partes.every((p) => semAcento(a.nome).includes(p))).slice(0, 8);
  }, [busca, alunos]);

  return (
    <div className="relative max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Nome do aluno"
        className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-amadeus-blue"
      />
      {carregando && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      {achados.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
          {achados.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => { setBusca(""); iniciar(() => router.push(`?aluno=${a.id}`)); }}
                className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-amadeus-blue-50"
              >
                <span className="font-semibold">{a.nome}</span>
                <span className="shrink-0 text-muted-foreground">{a.serie ?? a.turma}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
