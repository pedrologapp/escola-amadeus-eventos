import { Info } from "lucide-react";
import { DIAS_LIMPEZA, LIMPEZA_ATIVA } from "@/lib/asaas-conferencia";

/** Aviso da limpeza automática (direção, 28/09/2026). Só diz "são excluídas" quando estiver ligada de verdade. */
export function AvisoLimpeza() {
  return (
    <p className="mt-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
      <Info className="mt-0.5 size-4 shrink-0" />
      {LIMPEZA_ATIVA ? (
        <span>
          Cobranças de <b>inscrição de evento</b> não pagas há <b>{DIAS_LIMPEZA} dias ou mais</b> são <b>excluídas automaticamente</b> no Asaas (todo dia às 7h) e a inscrição fica cancelada. Cobranças avulsas não são excluídas.
        </span>
      ) : (
        <span>
          Exclusão automática de cobranças de inscrição não pagas há {DIAS_LIMPEZA} dias: <b>em simulação</b> (ainda não exclui nada; só registra o que excluiria).
        </span>
      )}
    </p>
  );
}
