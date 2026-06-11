"use client";

import { CalendarPlus, Ticket, Wallet } from "lucide-react";
import { ValorSensivel } from "@/components/admin/valores-sensiveis";

const ICONES = {
  calendario: CalendarPlus,
  ingresso: Ticket,
  carteira: Wallet,
} as const;

export interface MetricaItem {
  titulo: string;
  valor: string;
  icone: keyof typeof ICONES;
  /** Sensível = entra oculto; revela pelo olhinho global no topo. */
  sensivel?: boolean;
}

export function MetricasCompactas({ metricas }: { metricas: MetricaItem[] }) {
  return (
    <div className="w-full rounded-2xl border border-border bg-white px-4 py-1.5 shadow-sm sm:w-72">
      {metricas.map((m) => {
        const Icone = ICONES[m.icone];
        return (
          <div
            key={m.titulo}
            className="flex items-center justify-between gap-4 border-b border-border/40 py-2 text-xs last:border-0"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Icone className="size-3.5 shrink-0" />
              {m.titulo}
            </span>
            <span className="font-bold tabular-nums text-amadeus-blue">
              {m.sensivel ? <ValorSensivel valor={m.valor} /> : m.valor}
            </span>
          </div>
        );
      })}
    </div>
  );
}
