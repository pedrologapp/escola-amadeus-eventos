import Link from "next/link";
import { CalendarDays, ExternalLink } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CAMPANHA_ATUAL,
  dataPorExtenso,
  diaDaSemana,
} from "@/lib/matriculas-config";
import { SLUG_REUNIAO, type ItemReuniao } from "@/lib/reuniao";
import { Painel } from "./painel";

export const metadata = { title: "Reunião de Rematrículas · Admin Amadeus" };

// O status muda o tempo todo durante a semana do evento.
export const dynamic = "force-dynamic";

export default async function ReuniaoPage() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("reuniao_itens")
    .select(
      "id, categoria, titulo, detalhe, responsavel, horario, link, status, ordem",
    )
    .eq("slug", SLUG_REUNIAO)
    .order("ordem");

  const itens = (data ?? []) as ItemReuniao[];
  const materiais = itens.filter((i) => i.categoria === "material");
  const cronograma = itens.filter((i) => i.categoria === "cronograma");

  // Só os materiais entram na conta: cronograma é roteiro, não entrega.
  const prontos = materiais.filter((i) => i.status === "pronto").length;
  const fazendo = materiais.filter((i) => i.status === "fazendo").length;
  const faltam = materiais.filter((i) => i.status === "falta").length;
  const cobrados = materiais.filter((i) => i.status !== "nao_temos").length;

  const diasRestantes = (() => {
    const evento = new Date(`${CAMPANHA_ATUAL.data}T14:00:00-03:00`);
    const agora = new Date();
    const dias = Math.ceil(
      (evento.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
    );
    return dias;
  })();

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            Reunião de Rematrículas
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <CalendarDays className="size-4" />
            {diaDaSemana(CAMPANHA_ATUAL.data)}, {dataPorExtenso(
              CAMPANHA_ATUAL.data,
            )}, às {CAMPANHA_ATUAL.horaLabel}
          </p>
        </div>
        <Link
          href="/admin/matriculas2027"
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-sm font-semibold text-amadeus-blue transition-colors hover:border-amadeus-blue/40"
        >
          <ExternalLink className="size-4" />
          Ver confirmações
        </Link>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Indicador
          valor={diasRestantes > 0 ? diasRestantes : 0}
          rotulo={diasRestantes === 1 ? "dia para o evento" : "dias para o evento"}
          destaque
        />
        <Indicador valor={prontos} rotulo={`de ${cobrados} prontos`} />
        <Indicador valor={fazendo} rotulo="em andamento" />
        <Indicador valor={faltam} rotulo="ainda faltam" alerta={faltam > 0} />
      </div>

      <Painel cronograma={cronograma} materiais={materiais} />
    </div>
  );
}

function Indicador({
  valor,
  rotulo,
  destaque,
  alerta,
}: {
  valor: number;
  rotulo: string;
  destaque?: boolean;
  alerta?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? "rounded-2xl border border-amadeus-blue/25 bg-amadeus-blue-50/60 p-4"
          : alerta
            ? "rounded-2xl border border-red-200 bg-red-50/60 p-4"
            : "rounded-2xl border border-border/60 bg-white p-4"
      }
    >
      <p
        className={
          alerta
            ? "text-3xl font-extrabold tracking-tight text-red-600"
            : "text-3xl font-extrabold tracking-tight text-amadeus-blue"
        }
      >
        {valor}
      </p>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
    </div>
  );
}
