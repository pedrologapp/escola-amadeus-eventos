"use client";

import { useState, useTransition } from "react";
import { AlertCircle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDateTimeBrt } from "@/lib/utils";
import { reenviarQRCodes } from "../actions";
import { LogsDisclosure, type LogItem } from "./logs-disclosure";

export interface InscricaoRow {
  id: string;
  responsavel_nome: string;
  telefone: string;
  valor_total: number;
  total_senhas: number;
  senhas_detalhe: string;
  status_pagamento: "pendente" | "pago" | "cancelado" | "estornado";
  metodo_pagamento: "pix" | "cartao" | "dinheiro";
  parcelas: number;
  created_at: string;
  confirmacao_enviada_em: string | null;
  confirmacao_erro: string | null;
  qrcode_enviado_em: string | null;
  qrcode_erro: string | null;
  aluno: { nome_completo: string; serie: string; turma: string } | null;
  logs: LogItem[];
}

type Aba = "todas" | "pagas" | "pendentes" | "canceladas";

const statusInscricao: Record<
  string,
  { label: string; variant: "muted" | "success" | "warning" | "destructive" }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  estornado: { label: "Estornado", variant: "destructive" },
};

export function InscricoesTable({ inscricoes }: { inscricoes: InscricaoRow[] }) {
  const [aba, setAba] = useState<Aba>("todas");

  const pagas = inscricoes.filter((i) => i.status_pagamento === "pago");
  const pendentes = inscricoes.filter(
    (i) => i.status_pagamento === "pendente",
  );
  const canceladas = inscricoes.filter((i) =>
    ["cancelado", "estornado"].includes(i.status_pagamento),
  );

  const lista =
    aba === "pagas"
      ? pagas
      : aba === "pendentes"
        ? pendentes
        : aba === "canceladas"
          ? canceladas
          : inscricoes;

  return (
    <div>
      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-border bg-white p-1 shadow-sm">
        <TabPill active={aba === "todas"} onClick={() => setAba("todas")} count={inscricoes.length}>
          Todas
        </TabPill>
        <TabPill active={aba === "pagas"} onClick={() => setAba("pagas")} count={pagas.length}>
          Pagas
        </TabPill>
        <TabPill active={aba === "pendentes"} onClick={() => setAba("pendentes")} count={pendentes.length}>
          Pendentes
        </TabPill>
        <TabPill active={aba === "canceladas"} onClick={() => setAba("canceladas")} count={canceladas.length}>
          Canceladas
        </TabPill>
      </div>

      {lista.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-amadeus-blue-50/30 py-12 text-sm text-muted-foreground">
          {aba === "todas"
            ? "Nenhuma inscrição ainda."
            : `Nenhuma inscrição ${aba === "pagas" ? "paga" : aba === "pendentes" ? "pendente" : "cancelada"}.`}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-3 pr-4 font-semibold">Aluno</th>
                <th className="py-3 pr-4 font-semibold">Responsável</th>
                <th className="py-3 pr-4 font-semibold">Senhas</th>
                <th className="py-3 pr-4 font-semibold">Valor</th>
                <th className="py-3 pr-4 font-semibold">Pagamento</th>
                <th className="py-3 pr-4 font-semibold">Status</th>
                <th className="py-3 pr-4 font-semibold">Envios</th>
                <th className="py-3 pr-4 font-semibold">Histórico</th>
                <th className="py-3 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((i) => {
                const st = statusInscricao[i.status_pagamento] ?? statusInscricao.pendente;
                return (
                  <tr key={i.id} className="border-b border-border/40 last:border-0">
                    <td className="py-3 pr-4">
                      {i.aluno ? (
                        <>
                          <div className="font-semibold">{i.aluno.nome_completo}</div>
                          <div className="text-xs text-muted-foreground">
                            {i.aluno.serie} · {i.aluno.turma}
                          </div>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <div>{i.responsavel_nome}</div>
                      <div className="text-xs text-muted-foreground">{i.telefone}</div>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-semibold tabular-nums">{i.total_senhas}</div>
                      {i.senhas_detalhe && (
                        <div className="text-xs text-muted-foreground">
                          {i.senhas_detalhe}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-4 tabular-nums">
                      {formatCurrency(Number(i.valor_total))}
                    </td>
                    <td className="py-3 pr-4">
                      {i.metodo_pagamento === "pix"
                        ? "PIX"
                        : i.metodo_pagamento === "dinheiro"
                          ? "Dinheiro"
                          : `Cartão ${i.parcelas}x`}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </td>
                    <td className="py-3 pr-4">
                      <EnvioStatus tipo="confirmação" enviadoEm={i.confirmacao_enviada_em} erro={i.confirmacao_erro} />
                      <EnvioStatus tipo="QR code" enviadoEm={i.qrcode_enviado_em} erro={i.qrcode_erro} />
                      {i.status_pagamento === "pago" && (
                        <ReenviarQRButton inscricaoId={i.id} />
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <LogsDisclosure logs={i.logs} />
                    </td>
                    <td className="py-3 text-xs text-muted-foreground">
                      {formatDateTimeBrt(i.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TabPill({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-xl px-4 py-1.5 text-sm font-semibold transition-colors ${
        active ? "bg-amadeus-blue text-white shadow-float" : "text-amadeus-blue hover:bg-amadeus-blue-50"
      }`}
    >
      {children}
      <span
        className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${
          active ? "bg-white/25 text-white" : "bg-amadeus-blue-50 text-amadeus-blue"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function ReenviarQRButton({ inscricaoId }: { inscricaoId: string }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { ok: boolean; msg: string } | null
  >(null);

  function handleClick() {
    setFeedback(null);
    if (!confirm("Reenviar os QR codes para o WhatsApp do responsável?")) {
      return;
    }
    startTransition(async () => {
      const r = await reenviarQRCodes(inscricaoId);
      setFeedback(
        r.ok ? { ok: true, msg: r.mensagem } : { ok: false, msg: r.error },
      );
      // Some o feedback depois de 6s
      setTimeout(() => setFeedback(null), 6000);
    });
  }

  return (
    <div className="mt-1.5 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="inline-flex items-center gap-1 rounded-md border border-amadeus-blue/30 bg-white px-2 py-0.5 text-[10px] font-semibold text-amadeus-blue transition-colors hover:bg-amadeus-blue-50 disabled:opacity-50"
      >
        <RefreshCw className={`size-3 ${pending ? "animate-spin" : ""}`} />
        {pending ? "Reenviando..." : "Reenviar QR"}
      </button>
      {feedback && (
        <span
          className={`text-[10px] ${feedback.ok ? "text-green-700" : "text-red-700"}`}
        >
          {feedback.msg}
        </span>
      )}
    </div>
  );
}

function EnvioStatus({
  tipo,
  enviadoEm,
  erro,
}: {
  tipo: string;
  enviadoEm: string | null;
  erro: string | null;
}) {
  if (enviadoEm) {
    return (
      <div className="flex items-center gap-1.5 text-xs" title={`${tipo} enviada em ${formatDateTimeBrt(enviadoEm)}`}>
        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
        <span className="text-muted-foreground">{tipo}</span>
      </div>
    );
  }
  if (erro) {
    return (
      <div className="flex items-center gap-1.5 text-xs" title={`Erro: ${erro}`}>
        <AlertCircle className="size-4 shrink-0 text-red-600" />
        <span className="text-red-700">{tipo}</span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs" title={`${tipo} ainda não enviada`}>
      <Clock className="size-4 shrink-0 text-zinc-400" />
      <span className="text-muted-foreground">{tipo}</span>
    </div>
  );
}
