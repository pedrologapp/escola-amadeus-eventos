"use client";

import { useTransition } from "react";
import { Check, EyeOff, Loader2, RotateCcw } from "lucide-react";
import { marcarConversa } from "./actions";

export function BotoesConversa({ chatId, status }: { chatId: string; status: string }) {
  const [pendente, iniciar] = useTransition();
  const marcar = (s: "resolvida" | "ignorada" | "aguardando") => iniciar(async () => { await marcarConversa(chatId, s); });
  if (pendente) return <Loader2 className="size-4 animate-spin text-muted-foreground" />;
  if (status !== "aguardando") {
    return (
      <button type="button" onClick={() => marcar("aguardando")} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-amadeus-blue">
        <RotateCcw className="size-3.5" /> Reabrir
      </button>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => marcar("resolvida")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100">
        <Check className="size-3.5" /> Resolvido
      </button>
      <button type="button" onClick={() => marcar("ignorada")} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted/70">
        <EyeOff className="size-3.5" /> Ignorar
      </button>
    </div>
  );
}
