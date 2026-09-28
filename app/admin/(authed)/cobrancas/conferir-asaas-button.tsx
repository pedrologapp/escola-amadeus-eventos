"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { conferirAsaasAgora } from "./actions";

/** "Conferir com o Asaas agora": só lê o Asaas e atualiza as nossas telas (nada é enviado). */
export function ConferirAsaasButton() {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pendente}
        onClick={() =>
          iniciar(async () => {
            setMsg(null);
            const r = await conferirAsaasAgora();
            setMsg(r.ok ? "Conferido agora." : r.erro ?? "Não consegui conferir.");
            router.refresh();
          })
        }
        className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-semibold text-amadeus-blue hover:bg-amadeus-blue-50 disabled:opacity-50"
      >
        {pendente ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {pendente ? "Conferindo com o Asaas… (pode levar 1 minuto)" : "Conferir com o Asaas agora"}
      </button>
      {msg && <span className={`text-xs ${msg.startsWith("Conferido") ? "text-emerald-700" : "text-red-700"}`}>{msg}</span>}
    </span>
  );
}
