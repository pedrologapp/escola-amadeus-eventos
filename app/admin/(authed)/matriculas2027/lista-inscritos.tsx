"use client";

import { useMemo, useState } from "react";
import { Check, Copy, Download, Search } from "lucide-react";

export interface InscritoLinha {
  id: string;
  responsavel_nome: string;
  telefone: string;
  aluno_id: string | null;
  aluno_nome: string;
  familia_id: string | null;
  serie: string | null;
  turma: string | null;
  pessoas: number;
  created_at: string;
}

/** Escapa a célula pro CSV do Excel (separador ponto e vírgula). */
function celulaCsv(valor: string | number): string {
  const s = String(valor ?? "");
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function telefoneLegivel(d: string): string {
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}

/**
 * Formato que o WhatsApp (e o n8n) esperam: 55 + DDD + número, só dígitos.
 * É esta coluna que alimenta o lembrete às vésperas da reunião.
 */
function paraWhatsapp(d: string): string {
  const so = d.replace(/\D/g, "");
  return so.startsWith("55") ? so : `55${so}`;
}

const quandoFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function ListaInscritos({
  inscritos,
  slug,
}: {
  inscritos: InscritoLinha[];
  slug: string;
}) {
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState(false);

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase();
    if (!t) return inscritos;
    return inscritos.filter((i) =>
      [i.aluno_nome, i.responsavel_nome, i.serie, i.turma, i.telefone]
        .filter(Boolean)
        .some((campo) => String(campo).toLowerCase().includes(t)),
    );
  }, [inscritos, busca]);

  function baixarCsv() {
    const cabecalho = [
      "Aluno",
      "Série",
      "Turma",
      "Responsável",
      "WhatsApp",
      "WhatsApp (envio)",
      "Pessoas",
      "Família",
      "No cadastro",
      "Confirmado em",
    ];
    const linhas = filtrados.map((i) => [
      i.aluno_nome,
      i.serie ?? "",
      i.turma ?? "",
      i.responsavel_nome,
      telefoneLegivel(i.telefone),
      paraWhatsapp(i.telefone),
      i.pessoas,
      i.familia_id ?? "",
      i.aluno_id ? "sim" : "não",
      quandoFmt.format(new Date(i.created_at)),
    ]);
    // BOM faz o Excel abrir o arquivo como UTF-8 (acentos corretos).
    const csv =
      "﻿" +
      [cabecalho, ...linhas]
        .map((l) => l.map(celulaCsv).join(";"))
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Números prontos pro lembrete, um por linha, sem repetir a mesma família. */
  async function copiarNumeros() {
    const vistos = new Set<string>();
    const numeros: string[] = [];
    for (const i of filtrados) {
      const n = paraWhatsapp(i.telefone);
      if (vistos.has(n)) continue;
      vistos.add(n);
      numeros.push(n);
    }
    try {
      await navigator.clipboard.writeText(numeros.join("\n"));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sem permissão de área de transferência: o CSV continua servindo.
      setCopiado(false);
    }
  }

  if (inscritos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/70 bg-white p-10 text-center">
        <p className="font-semibold text-amadeus-blue">
          Nenhuma confirmação ainda.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Assim que as famílias abrirem o link do cartaz, elas aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-white">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 p-4">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por aluno, responsável ou turma"
            className="w-full rounded-xl border border-border/70 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amadeus-blue/50"
          />
        </div>
        <button
          type="button"
          onClick={copiarNumeros}
          className="inline-flex items-center gap-2 rounded-xl border border-border/70 px-4 py-2.5 text-sm font-semibold text-amadeus-blue transition-colors hover:border-amadeus-blue/40"
          title="Copia os números no formato 55DDDNÚMERO, um por linha"
        >
          {copiado ? (
            <Check className="size-4 text-emerald-600" />
          ) : (
            <Copy className="size-4" />
          )}
          {copiado ? "Copiado!" : "Copiar números"}
        </button>
        <button
          type="button"
          onClick={baixarCsv}
          className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        >
          <Download className="size-4" />
          Baixar CSV
        </button>
      </div>

      {/* Celular: cartões. Telas maiores: tabela. */}
      <ul className="divide-y divide-border/60 sm:hidden">
        {filtrados.map((i) => (
          <li key={i.id} className="p-4">
            <p className="font-bold text-amadeus-blue">{i.aluno_nome}</p>
            <p className="text-xs text-muted-foreground">
              {[i.serie, i.turma].filter(Boolean).join(" · ") ||
                "Fora do cadastro"}
            </p>
            <p className="mt-2 text-sm">{i.responsavel_nome}</p>
            <p className="text-sm text-muted-foreground">
              {telefoneLegivel(i.telefone)}
            </p>
            <p className="mt-2 text-xs font-semibold text-amadeus-blue">
              {i.pessoas === 1 ? "1 pessoa" : `${i.pessoas} pessoas`}
              <span className="ml-2 font-normal text-muted-foreground">
                {quandoFmt.format(new Date(i.created_at))}
              </span>
            </p>
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-semibold">Aluno</th>
              <th className="px-4 py-3 font-semibold">Turma</th>
              <th className="px-4 py-3 font-semibold">Responsável</th>
              <th className="px-4 py-3 font-semibold">WhatsApp</th>
              <th className="px-4 py-3 text-center font-semibold">Pessoas</th>
              <th className="px-4 py-3 font-semibold">Quando</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtrados.map((i) => (
              <tr key={i.id}>
                <td className="px-4 py-3">
                  <span className="font-semibold text-amadeus-blue">
                    {i.aluno_nome}
                  </span>
                  {!i.aluno_id && (
                    <span className="ml-2 rounded-md bg-amber-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-amber-800">
                      fora do cadastro
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {[i.serie, i.turma].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 py-3">{i.responsavel_nome}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {telefoneLegivel(i.telefone)}
                </td>
                <td className="px-4 py-3 text-center font-semibold">
                  {i.pessoas}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {quandoFmt.format(new Date(i.created_at))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtrados.length === 0 && (
        <p className="p-8 text-center text-sm text-muted-foreground">
          Nada encontrado para “{busca}”.
        </p>
      )}
    </div>
  );
}
