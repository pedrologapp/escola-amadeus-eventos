"use client";

import Link from "next/link";
import { ChevronLeft, List, Printer, StretchHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  eventoId: string;
  modo: "lista" | "paginas";
}

export function RelatorioControls({ eventoId, modo }: Props) {
  const base = `/admin/eventos/${eventoId}/relatorio`;
  return (
    <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-center sm:justify-between">
      <Link
        href={`/admin/eventos/${eventoId}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue hover:underline"
      >
        <ChevronLeft className="size-4" />
        Voltar para o evento
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-xl border border-border">
          <Link
            href={`${base}?modo=lista`}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${
              modo === "lista"
                ? "bg-amadeus-blue text-white"
                : "text-muted-foreground hover:bg-amadeus-blue-50"
            }`}
          >
            <List className="size-4" />
            Lista direta
          </Link>
          <Link
            href={`${base}?modo=paginas`}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors ${
              modo === "paginas"
                ? "bg-amadeus-blue text-white"
                : "text-muted-foreground hover:bg-amadeus-blue-50"
            }`}
          >
            <StretchHorizontal className="size-4" />
            Uma página por turma
          </Link>
        </div>

        <Button type="button" onClick={() => window.print()}>
          <Printer />
          Imprimir / Salvar PDF
        </Button>
      </div>
    </div>
  );
}
