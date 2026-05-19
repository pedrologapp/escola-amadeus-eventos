import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Clock,
  ExternalLink,
  MapPin,
  Pencil,
  Ticket,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency, formatDate, formatDateTimeBrt } from "@/lib/utils";
import { DeleteButton } from "./delete-button";
import { DuplicateButton } from "./duplicate-button";

const statusConfig: Record<
  string,
  { label: string; variant: "muted" | "success" | "warning" }
> = {
  rascunho: { label: "Rascunho", variant: "muted" },
  publicado: { label: "Publicado", variant: "success" },
  encerrado: { label: "Encerrado", variant: "warning" },
};

const statusInscricao: Record<
  string,
  { label: string; variant: "muted" | "success" | "warning" | "destructive" }
> = {
  pendente: { label: "Pendente", variant: "warning" },
  pago: { label: "Pago", variant: "success" },
  cancelado: { label: "Cancelado", variant: "destructive" },
  estornado: { label: "Estornado", variant: "destructive" },
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventoDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select(
      "id, slug, nome, descricao_curta, data_evento, hora_evento, local, imagem_capa_url, cor_tematica, series_permitidas, turmas_permitidas, metodos_pagamento, max_parcelas, prazo_inscricao, status, tipos_ingresso(id, nome, preco, descricao, ordem)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  const { data: inscricoes } = await supabase
    .from("inscricoes")
    .select(
      "id, responsavel_nome, email, telefone, valor_total, status_pagamento, metodo_pagamento, parcelas, created_at, aluno_id, confirmacao_enviada_em, confirmacao_erro, qrcode_enviado_em, qrcode_erro, aluno:alunos(nome_completo, serie, turma)",
    )
    .eq("evento_id", id)
    .order("created_at", { ascending: false });

  const lista = inscricoes ?? [];
  const tipos = (evento.tipos_ingresso ?? []).sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
  );

  const totalPagas = lista.filter((i) => i.status_pagamento === "pago").length;
  const totalPendentes = lista.filter(
    (i) => i.status_pagamento === "pendente",
  ).length;
  const receita = lista
    .filter((i) => i.status_pagamento === "pago")
    .reduce((sum, i) => sum + Number(i.valor_total ?? 0), 0);

  const status = statusConfig[evento.status] ?? statusConfig.rascunho;
  const cor = evento.cor_tematica ?? "#1B3B7C";
  const hora = evento.hora_evento?.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-10">
      <Link
        href="/admin/eventos"
        className="inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue hover:underline"
      >
        <ChevronLeft className="size-4" />
        Voltar para eventos
      </Link>

      {/* Header */}
      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
              {evento.nome}
            </h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {evento.descricao_curta && (
            <p className="mt-2 text-muted-foreground">
              {evento.descricao_curta}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {evento.status === "publicado" && (
            <Button asChild variant="outline">
              <a
                href={`${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/eventos/${evento.slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink />
                Ver no site
              </a>
            </Button>
          )}
          <DuplicateButton eventoId={evento.id} />
          <Button asChild>
            <Link href={`/admin/eventos/${evento.id}/editar`}>
              <Pencil />
              Editar
            </Link>
          </Button>
        </div>
      </header>

      {/* Métricas */}
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Inscrições pagas"
          value={totalPagas}
          icon={Users}
        />
        <MetricCard
          label="Pendentes"
          value={totalPendentes}
          icon={Ticket}
        />
        <MetricCard
          label="Receita confirmada"
          value={formatCurrency(receita)}
          icon={Wallet}
        />
      </section>

      {/* Informações */}
      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Informações do evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Info label="Data" icon={CalendarDays}>
              {formatDate(evento.data_evento)}
            </Info>
            {hora && (
              <Info label="Horário" icon={Clock}>
                {hora}
              </Info>
            )}
            {evento.local && (
              <Info label="Local" icon={MapPin}>
                {evento.local}
              </Info>
            )}
            {evento.prazo_inscricao && (
              <Info label="Prazo de inscrição" icon={CalendarDays}>
                {formatDate(evento.prazo_inscricao)}
              </Info>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <KV
                label="Séries permitidas"
                value={
                  evento.series_permitidas?.length
                    ? evento.series_permitidas.join(", ")
                    : "Todas"
                }
              />
              <KV
                label="Turmas permitidas"
                value={
                  evento.turmas_permitidas?.length
                    ? evento.turmas_permitidas.join(", ")
                    : "Todas"
                }
              />
              <KV
                label="Métodos de pagamento"
                value={(evento.metodos_pagamento as string[])
                  .map((m: string) => (m === "pix" ? "PIX" : "Cartão"))
                  .join(", ")}
              />
              <KV
                label="Parcelamento máximo"
                value={`${evento.max_parcelas}x`}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ingressos</CardTitle>
            <CardDescription>{tipos.length} tipo(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tipos.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-2xl border border-border/70 p-3"
              >
                <div>
                  <div className="font-semibold" style={{ color: cor }}>
                    {t.nome}
                  </div>
                  {t.descricao && (
                    <div className="text-xs text-muted-foreground">
                      {t.descricao}
                    </div>
                  )}
                </div>
                <div
                  className="font-extrabold tabular-nums"
                  style={{ color: cor }}
                >
                  {formatCurrency(Number(t.preco))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* Inscrições */}
      <section className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Inscrições</CardTitle>
            <CardDescription>
              {lista.length === 0
                ? "Ainda sem inscrições."
                : `${lista.length} inscrição/inscrições registradas.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {lista.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-amadeus-blue-50/30 py-12 text-sm text-muted-foreground">
                Nenhuma inscrição ainda.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-3 pr-4 font-semibold">Aluno</th>
                      <th className="py-3 pr-4 font-semibold">Responsável</th>
                      <th className="py-3 pr-4 font-semibold">Valor</th>
                      <th className="py-3 pr-4 font-semibold">Pagamento</th>
                      <th className="py-3 pr-4 font-semibold">Status</th>
                      <th className="py-3 pr-4 font-semibold">Envios</th>
                      <th className="py-3 font-semibold">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((i) => {
                      const st =
                        statusInscricao[i.status_pagamento] ??
                        statusInscricao.pendente;
                      const aluno = i.aluno as unknown as
                        | { nome_completo: string; serie: string; turma: string }
                        | null;
                      return (
                        <tr
                          key={i.id}
                          className="border-b border-border/40 last:border-0"
                        >
                          <td className="py-3 pr-4">
                            {aluno ? (
                              <>
                                <div className="font-semibold">
                                  {aluno.nome_completo}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {aluno.serie} · {aluno.turma}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div>{i.responsavel_nome}</div>
                            <div className="text-xs text-muted-foreground">
                              {i.telefone}
                            </div>
                          </td>
                          <td className="py-3 pr-4 tabular-nums">
                            {formatCurrency(Number(i.valor_total))}
                          </td>
                          <td className="py-3 pr-4">
                            {i.metodo_pagamento === "pix"
                              ? "PIX"
                              : `Cartão ${i.parcelas}x`}
                          </td>
                          <td className="py-3 pr-4">
                            <Badge variant={st.variant}>{st.label}</Badge>
                          </td>
                          <td className="py-3 pr-4">
                            <EnvioStatus
                              tipo="confirmação"
                              enviadoEm={i.confirmacao_enviada_em}
                              erro={i.confirmacao_erro}
                            />
                            <EnvioStatus
                              tipo="QR code"
                              enviadoEm={i.qrcode_enviado_em}
                              erro={i.qrcode_erro}
                            />
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
          </CardContent>
        </Card>
      </section>

      {/* Zona perigosa */}
      <section className="mt-12 rounded-3xl border-2 border-destructive/30 bg-destructive/5 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-extrabold text-destructive">
              Zona perigosa
            </h3>
            <p className="text-sm text-muted-foreground">
              Excluir um evento é permanente. Eventos com inscrições não podem
              ser excluídos.
            </p>
          </div>
          <DeleteButton eventoId={evento.id} eventoNome={evento.nome} />
        </div>
      </section>
    </div>
  );
}

// ---------- helpers UI ----------

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-6">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-extrabold text-amadeus-blue">
            {value}
          </div>
        </div>
        <div className="grid size-10 place-items-center rounded-2xl bg-amadeus-blue-50 text-amadeus-blue">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function Info({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-amadeus-blue" />
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-medium">{children}</div>
      </div>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-amadeus-blue-50/30 p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
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
      <div
        className="flex items-center gap-1.5 text-xs"
        title={`${tipo} enviada em ${formatDateTimeBrt(enviadoEm)}`}
      >
        <CheckCircle2 className="size-4 shrink-0 text-green-600" />
        <span className="text-muted-foreground">{tipo}</span>
      </div>
    );
  }
  if (erro) {
    return (
      <div
        className="flex items-center gap-1.5 text-xs"
        title={`Erro: ${erro}`}
      >
        <AlertCircle className="size-4 shrink-0 text-red-600" />
        <span className="text-red-700">{tipo}</span>
      </div>
    );
  }
  return (
    <div
      className="flex items-center gap-1.5 text-xs"
      title={`${tipo} ainda não enviada`}
    >
      <Clock className="size-4 shrink-0 text-zinc-400" />
      <span className="text-muted-foreground">{tipo}</span>
    </div>
  );
}
