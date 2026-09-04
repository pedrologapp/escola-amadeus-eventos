"use client";

import Link from "next/link";
import {
  ChevronLeft,
  EyeOff,
  List,
  Printer,
  Shapes,
  StretchHorizontal,
  Ticket,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  eventoId: string;
  modo: "lista" | "paginas";
  mostrarSenhas: boolean;
  agruparPorCasa: boolean;
  /** O seletor de casa só aparece se os alunos deste evento tiverem casa. */
  temCasa: boolean;
}

export function RelatorioControls({
  eventoId,
  modo,
  mostrarSenhas,
  agruparPorCasa,
  temCasa,
}: Props) {
  const base = `/admin/eventos/${eventoId}/relatorio`;
  const url = (
    m: "lista" | "paginas",
    senhas: boolean,
    casa: boolean = agruparPorCasa,
  ) =>
    `${base}?modo=${m}&senhas=${senhas ? "sim" : "nao"}` +
    (casa ? "&agrupar=casa" : "");

  const abaAtiva = "bg-amadeus-blue text-white";
  const abaInativa = "text-muted-foreground hover:bg-amadeus-blue-50";
  const aba = "flex items-center gap-2 px-3 py-2 text-sm font-semibold transition-colors";

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
        {temCasa && (
          <div className="inline-flex overflow-hidden rounded-xl border border-border">
            <Link
              href={url(modo, mostrarSenhas, false)}
              className={`${aba} ${!agruparPorCasa ? abaAtiva : abaInativa}`}
            >
              <Users className="size-4" />
              Por turma
            </Link>
            <Link
              href={url(modo, mostrarSenhas, true)}
              className={`${aba} ${agruparPorCasa ? abaAtiva : abaInativa}`}
            >
              <Shapes className="size-4" />
              Por casa
            </Link>
          </div>
        )}

        <div className="inline-flex overflow-hidden rounded-xl border border-border">
          <Link
            href={url("lista", mostrarSenhas)}
            className={`${aba} ${modo === "lista" ? abaAtiva : abaInativa}`}
          >
            <List className="size-4" />
            Lista direta
          </Link>
          <Link
            href={url("paginas", mostrarSenhas)}
            className={`${aba} ${modo === "paginas" ? abaAtiva : abaInativa}`}
          >
            <StretchHorizontal className="size-4" />
            {agruparPorCasa ? "Uma página por casa" : "Uma página por turma"}
          </Link>
        </div>

        <div className="inline-flex overflow-hidden rounded-xl border border-border">
          <Link
            href={url(modo, true)}
            className={`${aba} ${mostrarSenhas ? abaAtiva : abaInativa}`}
          >
            <Ticket className="size-4" />
            Com senhas
          </Link>
          <Link
            href={url(modo, false)}
            className={`${aba} ${!mostrarSenhas ? abaAtiva : abaInativa}`}
          >
            <EyeOff className="size-4" />
            Sem senhas (professores)
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
