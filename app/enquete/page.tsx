import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ENQUETE_SLUG } from "@/lib/enquete-config";
import { EnqueteForm } from "./enquete-form";

const SERIES_FALLBACK = [
  "Educação Infantil",
  "1º ano",
  "2º ano",
  "3º ano",
  "4º ano",
  "5º ano",
  "6º ano",
  "7º ano",
  "8º ano",
  "9º ano",
  "1ª série - EM",
  "2ª série - EM",
  "3ª série - EM",
];

function ordenarSeries(a: string, b: string) {
  return a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
}

export default async function EnquetePage() {
  const admin = createAdminClient();
  const { data: alunos } = await admin
    .from("alunos")
    .select("serie")
    .not("serie", "is", null);

  const seriesDb = Array.from(
    new Set(
      (alunos ?? [])
        .map((a) => (a.serie ?? "").trim())
        .filter((s) => s.length > 0),
    ),
  ).sort(ordenarSeries);

  const series = seriesDb.length > 0 ? seriesDb : SERIES_FALLBACK;

  const store = await cookies();
  const jaRespondeu = store.get(`enquete_${ENQUETE_SLUG}`)?.value === "1";

  return <EnqueteForm series={series} jaRespondeu={jaRespondeu} />;
}
