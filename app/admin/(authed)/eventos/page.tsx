import Link from "next/link";
import { CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils";
import { valoresLiberados } from "@/lib/valores-auth";
import { AdminEventosTabbed, type AdminEventoItem } from "./eventos-tabbed";
import { MetricasCompactas, type MetricaItem } from "../dashboard/metricas-compactas";

export default async function AdminEventosPage() {
  const supabase = await createClient();
  const [{ data: eventos, error }, { data: pagas }] = await Promise.all([
    supabase
      .from("eventos")
      .select(
        "id, slug, nome, data_evento, hora_evento, hora_fim, local, imagem_capa_url, cor_tematica, status, inscricoes(count)",
      )
      .order("data_evento", { ascending: false }),
    // Ingressos e receita (antes ficavam na Visão geral).
    supabase.from("inscricoes").select("evento_id, valor_total, itens").eq("status_pagamento", "pago"),
  ]);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Erro ao carregar eventos</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Particiona por aba: rascunhos / concluídos / próximos
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const proximos: AdminEventoItem[] = [];
  const concluidos: AdminEventoItem[] = [];
  const rascunhos: AdminEventoItem[] = [];

  for (const ev of eventos ?? []) {
    const totalInscricoes =
      (ev.inscricoes as { count: number }[] | null)?.[0]?.count ?? 0;
    const item: AdminEventoItem = {
      id: ev.id,
      slug: ev.slug,
      nome: ev.nome,
      data_evento: ev.data_evento,
      hora_evento: ev.hora_evento,
      hora_fim: ev.hora_fim,
      local: ev.local,
      imagem_capa_url: ev.imagem_capa_url,
      cor_tematica: ev.cor_tematica,
      status: ev.status as "rascunho" | "publicado" | "encerrado",
      totalInscricoes,
    };

    if (ev.status === "rascunho") {
      rascunhos.push(item);
      continue;
    }

    const dataEv = new Date(`${ev.data_evento}T00:00:00`);
    const passou = dataEv < hoje;
    if (passou || ev.status === "encerrado") {
      concluidos.push(item);
    } else {
      proximos.push(item);
    }
  }

  proximos.sort(
    (a, b) =>
      new Date(a.data_evento).getTime() - new Date(b.data_evento).getTime(),
  );
  concluidos.sort(
    (a, b) =>
      new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime(),
  );
  rascunhos.sort(
    (a, b) =>
      new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime(),
  );

  const total = proximos.length + concluidos.length + rascunhos.length;

  let ingressosVendidos = 0;
  const receitaPorEvento = new Map<string, number>();
  for (const i of pagas ?? []) {
    ingressosVendidos += ((i.itens as { qtd?: number }[] | null) ?? []).reduce((s, it) => s + (it.qtd ?? 0), 0);
    if (i.evento_id) receitaPorEvento.set(i.evento_id, (receitaPorEvento.get(i.evento_id) ?? 0) + Number(i.valor_total ?? 0));
  }
  const publicados = (eventos ?? []).filter((e) => e.status === "publicado").length;
  const receitaAtivos = proximos.reduce((s, ev) => s + (receitaPorEvento.get(ev.id) ?? 0), 0);
  const liberado = await valoresLiberados();
  const metricas: MetricaItem[] = [
    { titulo: "Eventos publicados", valor: `${publicados} de ${(eventos ?? []).length}`, icone: "calendario" },
    { titulo: "Ingressos vendidos", valor: liberado ? ingressosVendidos.toString() : null, icone: "ingresso", sensivel: true },
    { titulo: "Receita (eventos ativos)", valor: liberado ? formatCurrency(receitaAtivos) : null, icone: "carteira", sensivel: true },
  ];

  return (
    <div className="container mx-auto px-4 py-10">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
            Eventos
          </h1>
          <p className="mt-1 text-muted-foreground">
            {total === 0
              ? "Você ainda não criou nenhum evento."
              : total === 1
                ? "1 evento cadastrado."
                : `${total} eventos cadastrados.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/eventos/importar">
              <Sparkles />
              Importar de aviso
            </Link>
          </Button>
          <Button asChild>
            <Link href="/admin/eventos/novo">
              <CalendarPlus />
              Novo evento
            </Link>
          </Button>
        </div>
      </header>

      <section className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="order-last min-w-0 lg:order-none">
          <AdminEventosTabbed
            proximos={proximos}
            concluidos={concluidos}
            rascunhos={rascunhos}
          />
        </div>
        <MetricasCompactas metricas={metricas} />
      </section>
    </div>
  );
}
