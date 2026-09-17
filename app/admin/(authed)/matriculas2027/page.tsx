import Link from "next/link";
import { ExternalLink, Users, UserCheck, Home, TriangleAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { CAMPANHA_ATUAL, dataPorExtenso } from "@/lib/matriculas-config";
import { ListaInscritos, type InscritoLinha } from "./lista-inscritos";

export const metadata = {
  title: "Matrículas 2027 · Admin Amadeus",
};

// Números vindos do banco não podem ficar em cache entre visitas ao painel.
export const dynamic = "force-dynamic";

const campanha = CAMPANHA_ATUAL;

export default async function MatriculasAdminPage() {
  const admin = createAdminClient();

  const { data } = await admin
    .from("matriculas_inscricoes")
    .select(
      "id, responsavel_nome, telefone, aluno_id, aluno_nome, familia_id, serie, turma, pessoas, created_at",
    )
    .eq("slug", campanha.slug)
    .order("created_at", { ascending: false });

  const inscritos = (data ?? []) as InscritoLinha[];

  const totalFamilias = inscritos.length;
  const totalPessoas = inscritos.reduce((soma, i) => soma + (i.pessoas ?? 1), 0);
  const vinculados = inscritos.filter((i) => i.aluno_id !== null).length;

  // Irmãos confirmados separadamente contam como a MESMA família — sem isso
  // o total de famílias sai inflado e o de pessoas, furado.
  const porFamilia = new Map<string, number>();
  for (const i of inscritos) {
    if (!i.familia_id) continue;
    porFamilia.set(i.familia_id, (porFamilia.get(i.familia_id) ?? 0) + 1);
  }
  const familiasDuplicadas = [...porFamilia.values()].filter((n) => n > 1).length;

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-amadeus-blue">
            Matrículas 2027
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {campanha.nomeEvento} · {dataPorExtenso(campanha.data)}, às{" "}
            {campanha.horaLabel}
          </p>
        </div>
        <Link
          href="/matriculas2027"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-white px-4 py-2.5 text-sm font-semibold text-amadeus-blue transition-colors hover:border-amadeus-blue/40"
        >
          <ExternalLink className="size-4" />
          Ver a página
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Indicador
          icone={Home}
          rotulo="Famílias confirmadas"
          valor={totalFamilias}
        />
        <Indicador
          icone={Users}
          rotulo="Pessoas esperadas"
          valor={totalPessoas}
          destaque
        />
        <Indicador
          icone={UserCheck}
          rotulo="Ligadas ao cadastro"
          valor={vinculados}
          nota={
            totalFamilias > 0
              ? `${totalFamilias - vinculados} sem vínculo`
              : undefined
          }
        />
      </div>

      {familiasDuplicadas > 0 && (
        <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>
            {familiasDuplicadas === 1
              ? "1 família confirmou mais de uma vez"
              : `${familiasDuplicadas} famílias confirmaram mais de uma vez`}{" "}
            — provavelmente irmãos inscritos separadamente. Confira na lista
            antes de fechar o número de pessoas.
          </span>
        </p>
      )}

      <div className="mt-6">
        <ListaInscritos inscritos={inscritos} slug={campanha.slug} />
      </div>
    </div>
  );
}

function Indicador({
  icone: Icone,
  rotulo,
  valor,
  nota,
  destaque,
}: {
  icone: React.ComponentType<{ className?: string }>;
  rotulo: string;
  valor: number;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={
        destaque
          ? "rounded-2xl border border-amadeus-blue/25 bg-amadeus-blue-50/60 p-5"
          : "rounded-2xl border border-border/60 bg-white p-5"
      }
    >
      <div className="flex size-10 items-center justify-center rounded-xl bg-amadeus-blue-50 text-amadeus-blue">
        <Icone className="size-[18px]" />
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight text-amadeus-blue">
        {valor}
      </p>
      <p className="text-sm text-muted-foreground">{rotulo}</p>
      {nota && <p className="mt-0.5 text-xs text-muted-foreground/70">{nota}</p>}
    </div>
  );
}
