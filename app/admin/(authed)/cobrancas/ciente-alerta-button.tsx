"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { marcarAlertaVisto } from "./actions";

export function CienteAlertaButton({ id }: { id: string }) {
  const [pendente, iniciar] = useTransition();
  return (
    <button type="button" disabled={pendente} onClick={() => iniciar(async () => { await marcarAlertaVisto(id); })} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50">
      {pendente ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} Ciente
    </button>
  );
}
