"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Lock,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDateTimeBrt } from "@/lib/utils";
import {
  excluirInscricaoCancelada,
  reenviarQRCodes,
  verificarSenhaAcao,
} from "../actions";
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
                      {i.status_pagamento === "cancelado" && (
                        <ExcluirInscricaoButton inscricaoId={i.id} />
                      )}
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
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroModal, setErroModal] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<
    { ok: boolean; msg: string } | null
  >(null);

  function abrirModal() {
    setSenha("");
    setErroModal(null);
    setFeedback(null);
    setOpen(true);
  }

  function confirmar() {
    setErroModal(null);
    startTransition(async () => {
      const senhaOk = await verificarSenhaAcao(senha);
      if (!senhaOk) {
        setErroModal("Senha incorreta.");
        return;
      }
      const r = await reenviarQRCodes(inscricaoId);
      setOpen(false);
      setFeedback(
        r.ok ? { ok: true, msg: r.mensagem } : { ok: false, msg: r.error },
      );
      setTimeout(() => setFeedback(null), 6000);
    });
  }

  return (
    <>
      <div className="mt-1.5 flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={abrirModal}
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

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-float-lg">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-amadeus-blue">
                <Lock className="size-5" />
                Confirmar senha
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite a senha para reenviar os QR Codes pelo WhatsApp.
            </p>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor={`senha-reenvio-${inscricaoId}`}>Senha</Label>
              <Input
                id={`senha-reenvio-${inscricaoId}`}
                type="password"
                value={senha}
                autoFocus
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmar();
                }}
                placeholder="••••••"
              />
              {erroModal && (
                <p className="text-xs text-destructive">{erroModal}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={confirmar}
                disabled={pending || senha.length === 0}
              >
                {pending ? "Reenviando..." : "Reenviar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExcluirInscricaoButton({ inscricaoId }: { inscricaoId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [senha, setSenha] = useState("");
  const [erroModal, setErroModal] = useState<string | null>(null);

  function abrirModal() {
    setSenha("");
    setErroModal(null);
    setOpen(true);
  }

  function confirmar() {
    setErroModal(null);
    startTransition(async () => {
      const senhaOk = await verificarSenhaAcao(senha);
      if (!senhaOk) {
        setErroModal("Senha incorreta.");
        return;
      }
      const r = await excluirInscricaoCancelada(inscricaoId);
      if (!r.ok) {
        setErroModal(r.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={abrirModal}
        disabled={pending}
        className="mt-1.5 inline-flex items-center gap-1 rounded-md border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="size-3" />
        {pending ? "Excluindo..." : "Excluir"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-float-lg">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-extrabold text-amadeus-blue">
                <Lock className="size-5" />
                Confirmar senha
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite a senha para excluir esta inscrição cancelada. Esta ação
              não pode ser desfeita.
            </p>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor={`senha-excluir-${inscricaoId}`}>Senha</Label>
              <Input
                id={`senha-excluir-${inscricaoId}`}
                type="password"
                value={senha}
                autoFocus
                onChange={(e) => setSenha(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmar();
                }}
                placeholder="••••••"
              />
              {erroModal && (
                <p className="text-xs text-destructive">{erroModal}</p>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmar}
                disabled={pending || senha.length === 0}
              >
                {pending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
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
