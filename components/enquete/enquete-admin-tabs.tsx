"use client";

import { useState } from "react";
import type { EnqueteDef } from "@/lib/enquete-config";
import {
  EnqueteDashboard,
  type RespostaRow,
} from "@/components/enquete/enquete-dashboard";

export interface AbaEnquete {
  chave: string;
  rotulo: string;
  def: EnqueteDef;
  respostas: RespostaRow[];
  shareUrl: string;
}

export function EnqueteAdminTabs({ abas }: { abas: AbaEnquete[] }) {
  const [ativa, setAtiva] = useState(abas[0]?.chave ?? "");
  const aba = abas.find((a) => a.chave === ativa) ?? abas[0];

  return (
    <div>
      <div className="container mx-auto flex flex-wrap gap-2 px-4 pt-4">
        {abas.map((a) => {
          const on = a.chave === aba?.chave;
          return (
            <button
              key={a.chave}
              type="button"
              onClick={() => setAtiva(a.chave)}
              className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
                on
                  ? "border-amadeus-blue bg-amadeus-blue text-white"
                  : "border-border bg-white text-muted-foreground hover:bg-muted/50"
              }`}
            >
              {a.rotulo}
              <span className="ml-1.5 opacity-80">({a.respostas.length})</span>
            </button>
          );
        })}
      </div>
      {aba && (
        <EnqueteDashboard
          def={aba.def}
          respostas={aba.respostas}
          shareUrl={aba.shareUrl}
        />
      )}
    </div>
  );
}
