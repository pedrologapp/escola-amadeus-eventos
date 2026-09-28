import { AlertTriangle } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { CienteAlertaButton } from "./ciente-alerta-button";

const ROTULO: Record<string, string> = {
  REFUND_REQUESTED: "Reembolso solicitado",
  REFUND_IN_PROGRESS: "Reembolso em andamento",
  REFUNDED: "Reembolsado",
  CHARGEBACK_REQUESTED: "Contestação no cartão",
  CHARGEBACK_DISPUTE: "Contestação em disputa",
  AWAITING_CHARGEBACK_REVERSAL: "Aguardando reversão de contestação",
};

/** Faixa vermelha no topo de Cobranças: reembolsos e contestações que ninguém viu ainda. */
export async function AlertasReembolso({ liberado }: { liberado: boolean }) {
  const db = createAdminClient();
  const { data } = await db.from("asaas_alertas").select("id, status, valor, descricao, data").is("visto_em", null).order("data", { ascending: false }).limit(20);
  if (!data?.length) return null;
  return (
    <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="flex items-center gap-2 font-bold text-red-800">
        <AlertTriangle className="size-4" /> {data.length === 1 ? "1 alerta de reembolso no Asaas" : `${data.length} alertas de reembolso no Asaas`}
      </p>
      <ul className="mt-2 divide-y divide-red-100 text-sm">
        {data.map((a) => (
          <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
            <span className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">{ROTULO[a.status as string] ?? a.status}</span>
            <span className="min-w-0 flex-1 truncate" title={a.descricao ?? ""}>{a.descricao ?? "Sem descrição"}</span>
            <span className="text-xs text-red-900/70">{(a.data as string | null)?.split("-").reverse().join("/")}</span>
            <span className="font-semibold tabular-nums">{liberado ? formatCurrency(Number(a.valor)) : "R$ ••••"}</span>
            <CienteAlertaButton id={a.id as string} />
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-red-900/70">Confira no painel do Asaas. “Ciente” só tira o aviso daqui; se a situação mudar (ex.: de solicitado para reembolsado), ele volta.</p>
    </section>
  );
}
