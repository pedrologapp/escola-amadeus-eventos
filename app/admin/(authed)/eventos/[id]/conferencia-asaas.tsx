"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { conferirEventoAgora } from "./conferencia-actions";

export interface DadosConferencia {
  /** Última conferência que vale para o evento (dele ou geral), ISO; null = nunca. */
  ultima: string | null;
  /** Minutos desde a última conferência (calculado no servidor). */
  minutos: number | null;
  /** Inscrições pendentes com cobrança no Asaas (ainda podem ser pagas). */
  pendentes: number;
  /** Pagas no sistema sem cobrança no Asaas e sem estar como dinheiro. */
  pagasSemOrigem: string[];
  /** Alunos com mais de uma inscrição paga. */
  duplicados: string[];
  /** Corrigidas pela conferência nos últimos 7 dias (o aviso do Asaas não tinha chegado). */
  corrigidas: { aluno: string | null; em: string }[];
}

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/**
 * Conferência dos pagamentos com o Asaas (22/10/2026): mostra quando foi a última,
 * o que foi corrigido e o que não bate, e o botão para conferir na hora.
 */
export function ConferenciaAsaas({ eventoId, dados }: { eventoId: string; dados: DadosConferencia }) {
  const router = useRouter();
  const [rodando, setRodando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const minutos = dados.minutos ?? Infinity;
  const divergencias = dados.pagasSemOrigem.length + dados.duplicados.length;
  const emDia = minutos <= 60 && divergencias === 0;

  const conferir = async () => {
    setRodando(true);
    setAviso(null);
    const r = await conferirEventoAgora(eventoId);
    setRodando(false);
    setAviso(
      r.ok
        ? r.corrigidas
          ? `${r.corrigidas} pagamento(s) estavam pagos no Asaas e foram confirmados agora.`
          : `Conferido: ${r.conferidas} pendente(s) olhadas no Asaas, nenhuma estava paga.`
        : r.erro,
    );
    router.refresh();
  };

  return (
    <div className={`rounded-2xl border p-5 ${emDia ? "border-emerald-200 bg-emerald-50/60" : "border-amber-300 bg-amber-50/70"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {emDia ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />}
          <div>
            <p className="font-bold">Conferência com o Asaas</p>
            <p className="text-sm text-muted-foreground">
              {dados.ultima ? `Última conferência: ${quando(dados.ultima)}` : "Ainda não conferido."}
              {dados.pendentes > 0 && ` ${dados.pendentes} inscrição(ões) aguardando pagamento.`}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={conferir} disabled={rodando}>
          {rodando ? <Loader2 className="animate-spin" /> : <RefreshCw />}
          {rodando ? "Conferindo..." : "Conferir agora"}
        </Button>
      </div>

      {aviso && <p className="mt-3 rounded-lg bg-white/80 p-2.5 text-sm">{aviso}</p>}

      {dados.corrigidas.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold">Confirmados pela conferência (o aviso do Asaas não chegou):</p>
          <p className="text-muted-foreground">{dados.corrigidas.map((c) => `${c.aluno ?? "sem nome"} (${quando(c.em)})`).join(", ")}</p>
        </div>
      )}
      {dados.pagasSemOrigem.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-amber-800">Pagos no sistema sem cobrança no Asaas e sem estar como dinheiro (confira):</p>
          <p className="text-muted-foreground">{dados.pagasSemOrigem.join(", ")}</p>
        </div>
      )}
      {dados.duplicados.length > 0 && (
        <div className="mt-3 text-sm">
          <p className="font-semibold text-amber-800">Alunos com mais de uma inscrição paga (pode ser pagamento em dobro):</p>
          <p className="text-muted-foreground">{dados.duplicados.join(", ")}</p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        A lista oficial para a porta é o Relatório (todos os pagos, por Asaas ou dinheiro). Antes de imprimir, clique em “Conferir agora”.
      </p>
    </div>
  );
}
