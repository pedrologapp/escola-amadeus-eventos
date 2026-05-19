import Link from "next/link";
import {
  CalendarPlus,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import {
  DashboardEventosList,
  type DashboardEventoItem,
} from "./eventos-list";

const LIMITE_POR_ABA = 5;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const inicioMes = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1,
  ).toISOString();

  const [publicadosRes, totalEventosRes, inscricoesRes, eventosRes] =
    await Promise.all([
      supabase
        .from("eventos")
        .select("id", { count: "exact", head: true })
        .eq("status", "publicado"),
      supabase.from("eventos").select("id", { count: "exact", head: true }),
      supabase
        .from("inscricoes")
        .select("valor_total")
        .eq("status_pagamento", "pago")
        .gte("created_at", inicioMes),
      supabase
        .from("eventos")
        .select("id, nome, data_evento, status")
        .in("status", ["publicado", "encerrado"])
        .order("data_evento", { ascending: false }),
    ]);

  const eventosPublicados = publicadosRes.count ?? 0;
  const totalEventos = totalEventosRes.count ?? 0;
  const inscricoesMes = inscricoesRes.data ?? [];
  const receitaMes = inscricoesMes.reduce(
    (sum, i) => sum + Number(i.valor_total ?? 0),
    0,
  );

  // Particiona eventos
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proximosAll: DashboardEventoItem[] = [];
  const concluidosAll: DashboardEventoItem[] = [];

  for (const ev of eventosRes.data ?? []) {
    const item: DashboardEventoItem = {
      id: ev.id,
      nome: ev.nome,
      data_evento: ev.data_evento,
      status: ev.status as "rascunho" | "publicado" | "encerrado",
    };
    const dataEv = new Date(`${ev.data_evento}T00:00:00`);
    if (dataEv < hoje || ev.status === "encerrado") {
      concluidosAll.push(item);
    } else {
      proximosAll.push(item);
    }
  }

  // Ordenação: próximos do mais cedo pro mais tarde; concluídos do mais recente pro mais antigo
  proximosAll.sort(
    (a, b) =>
      new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime(),
  );
  concluidosAll.sort(
    (a, b) =>
      new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime(),
  );

  const proximos = proximosAll.slice(0, LIMITE_POR_ABA);
  const concluidos = concluidosAll.slice(0, LIMITE_POR_ABA);

  const metricas = [
    {
      titulo: "Eventos publicados",
      valor: eventosPublicados.toString(),
      descricao:
        totalEventos === 0
          ? "Nenhum evento cadastrado ainda"
          : `${totalEventos} cadastrado${totalEventos === 1 ? "" : "s"} no total`,
      icone: CalendarPlus,
    },
    {
      titulo: "Inscrições no mês",
      valor: inscricoesMes.length.toString(),
      descricao: "Pagamentos confirmados neste mês",
      icone: Users,
    },
    {
      titulo: "Receita do mês",
      valor: formatCurrency(receitaMes),
      descricao: "Total arrecadado em pagamentos pagos",
      icone: Wallet,
    },
  ];

  const semEventos = proximosAll.length === 0 && concluidosAll.length === 0;

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
            Visão geral
          </h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe os eventos, inscrições e a arrecadação da escola.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/eventos/novo">
            <CalendarPlus />
            Novo evento
          </Link>
        </Button>
      </header>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {metricas.map((m) => {
          const Icone = m.icone;
          return (
            <Card key={m.titulo}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{m.titulo}</CardTitle>
                  <div className="grid size-10 place-items-center rounded-2xl bg-amadeus-blue-50 text-amadeus-blue">
                    <Icone className="size-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-extrabold text-amadeus-blue">
                  {m.valor}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {m.descricao}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="mt-10">
        {semEventos ? (
          <Card>
            <CardContent className="pb-10">
              <div className="grid place-items-center rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-amadeus-blue-50/40 py-16">
                <div className="max-w-md text-center">
                  <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-amadeus-blue shadow-float">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold text-amadeus-blue">
                    Vamos criar o primeiro evento?
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Em menos de 5 minutos você publica um evento completo:
                    fotos, tipos de ingresso, valores e restrições por série.
                  </p>
                  <Button asChild className="mt-6">
                    <Link href="/admin/eventos/novo">
                      <CalendarPlus />
                      Criar meu primeiro evento
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DashboardEventosList
            proximos={proximos}
            concluidos={concluidos}
          />
        )}
      </section>
    </div>
  );
}
