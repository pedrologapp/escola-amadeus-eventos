"use client";

import { useState } from "react";
import { CalendarPlus, Eye, EyeOff, Ticket, Wallet } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ICONES = {
  calendario: CalendarPlus,
  ingresso: Ticket,
  carteira: Wallet,
} as const;

export interface MetricaItem {
  titulo: string;
  valor: string;
  descricao: string;
  icone: keyof typeof ICONES;
  /** Valores sensíveis entram ocultos e só aparecem ao clicar no olhinho. */
  sensivel?: boolean;
}

export function MetricasCards({ metricas }: { metricas: MetricaItem[] }) {
  // Sempre começa oculto a cada visita — a página pode ser aberta
  // com gente olhando a tela.
  const [mostrar, setMostrar] = useState(false);
  const temSensivel = metricas.some((m) => m.sensivel);

  return (
    <section className="mt-8">
      {temSensivel && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
          >
            {mostrar ? (
              <>
                <EyeOff className="size-4" />
                Ocultar valores
              </>
            ) : (
              <>
                <Eye className="size-4" />
                Mostrar valores
              </>
            )}
          </button>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {metricas.map((m) => {
          const Icone = ICONES[m.icone];
          const oculto = m.sensivel && !mostrar;
          const valorExibido = oculto
            ? m.valor.startsWith("R$")
              ? "R$ ••••••"
              : "••••"
            : m.valor;
          return (
            <Card key={m.titulo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.titulo}</CardTitle>
                  <div className="grid size-10 place-items-center rounded-2xl bg-amadeus-blue-50 text-amadeus-blue">
                    <Icone className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-extrabold text-amadeus-blue ${oculto ? "select-none tracking-wider" : ""}`}
                >
                  {valorExibido}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {oculto ? "Clique em “Mostrar valores” pra revelar" : m.descricao}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
