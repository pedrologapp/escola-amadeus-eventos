import { createAdminClient } from "@/lib/supabase/admin";
import { ENQUETE_SLUG } from "@/lib/enquete-config";
import {
  EnqueteDashboard,
  type RespostaRow,
} from "@/components/enquete/enquete-dashboard";

export default async function AdminEnquetePage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("enquete_respostas")
    .select("id, serie, turma, respostas, meta, created_at")
    .eq("slug", ENQUETE_SLUG)
    .order("created_at", { ascending: false });

  const shareUrl =
    process.env.NEXT_PUBLIC_ENQUETE_URL || "https://pesquisa.escolaamadeus.com";

  return (
    <EnqueteDashboard
      respostas={(data ?? []) as RespostaRow[]}
      shareUrl={shareUrl}
    />
  );
}
