import Link from "next/link";
import { ExternalLink, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDateTimeBrt } from "@/lib/utils";
import type { InscricaoStatus } from "@/types/database";
import { ExcluirCobrancaButton } from "./excluir-cobranca-button";

const statusBadge: Record<InscricaoStatus, { label: string; className: string }> =
  {
    pendente: {
      label: "Pendente",
      className: "bg-amber-100 text-amber-800 border-amber-300",
    },
    pago: {
      label: "Pago",
      className: "bg-green-100 text-green-800 border-green-300",
    },
    cancelado: {
      label: "Cancelado",
      className: "bg-gray-100 text-gray-600 border-gray-300",
    },
    estornado: {
      label: "Estornado",
      className: "bg-red-100 text-red-800 border-red-300",
    },
  };

export default async function CobrancasPage() {
  const supabase = await createClient();
  const { data: cobrancas, error } = await supabase
    .from("cobrancas_avulsas")
    .select(
      "id, descricao, valor, valor_total, metodo_cobranca, parcelas, repassar_juros, responsavel_nome, telefone, status_pagamento, payment_url, created_at, link_enviado_em, link_erro, confirmacao_enviada_em, confirmacao_erro, alunos(nome_completo, serie, turma)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar cobranças</CardTitle>
            <CardDescription>
              {error.message}. Se a tabela ainda não existe, rode a migration{" "}
              <code>0009_cobrancas_avulsas.sql</code> no Supabase.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const lista = cobrancas ?? [];
  const totalPago = lista
    .filter((c) => c.status_pagamento === "pago")
    .reduce((sum, c) => sum + Number(c.valor_total ?? c.valor), 0);

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
            Cobranças avulsas
          </h1>
          <p className="mt-1 text-muted-foreground">
            {lista.length === 0
              ? "Nenhuma cobrança criada ainda."
              : `${lista.length} cobrança${lista.length === 1 ? "" : "s"} · ${formatCurrency(totalPago)} recebido${totalPago > 0 ? "" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/cobrancas/nova">
            <Receipt />
            Nova cobrança
          </Link>
        </Button>
      </header>

      {lista.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Receipt className="mx-auto size-10 opacity-40" />
            <p className="mt-3">
              Crie uma cobrança pra vender livro, material ou qualquer item
              fora de eventos. O link de pagamento vai direto pro WhatsApp.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-8 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-3">Data</th>
                  <th className="px-4 py-3">Aluno</th>
                  <th className="px-4 py-3">Descrição</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Valor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Link</th>
                </tr>
              </thead>
              <tbody>
                {lista.map((c) => {
                  const aluno = c.alunos as unknown as {
                    nome_completo: string;
                    serie: string;
                    turma: string;
                  } | null;
                  const badge =
                    statusBadge[c.status_pagamento as InscricaoStatus] ??
                    statusBadge.pendente;
                  return (
                    <tr
                      key={c.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDateTimeBrt(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        {aluno ? (
                          <>
                            <div className="font-semibold">
                              {aluno.nome_completo}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {aluno.serie} · Turma {aluno.turma}
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-[220px] px-4 py-3">{c.descricao}</td>
                      <td className="px-4 py-3">
                        <div>{c.responsavel_nome}</div>
                        <div className="text-xs text-muted-foreground">
                          {c.telefone}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(c.valor_total ?? c.valor))}
                        <div className="text-xs font-normal text-muted-foreground">
                          {c.metodo_cobranca === "pix" && "PIX"}
                          {c.metodo_cobranca === "cartao" &&
                            `Cartão ${c.parcelas}x ${c.repassar_juros ? "com" : "sem"} juros`}
                          {(c.metodo_cobranca === "aberto" ||
                            !c.metodo_cobranca) &&
                            "Link aberto"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                        <div className="mt-1 space-y-0.5 text-xs">
                          {c.link_enviado_em ? (
                            <div className="text-green-700">✓ Link enviado</div>
                          ) : c.link_erro ? (
                            <div className="text-red-600" title={c.link_erro}>
                              ⚠ Link falhou
                            </div>
                          ) : null}
                          {c.confirmacao_enviada_em ? (
                            <div className="text-green-700">
                              ✓ Confirmação enviada
                            </div>
                          ) : c.confirmacao_erro ? (
                            <div
                              className="text-red-600"
                              title={c.confirmacao_erro}
                            >
                              ⚠ Confirmação falhou
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          {c.payment_url ? (
                            <a
                              href={c.payment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-amadeus-blue hover:underline"
                            >
                              Abrir
                              <ExternalLink className="size-3.5" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {c.status_pagamento === "cancelado" && (
                            <ExcluirCobrancaButton
                              cobrancaId={c.id}
                              descricao={c.descricao}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
