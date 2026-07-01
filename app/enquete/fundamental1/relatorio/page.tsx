import { createAdminClient } from "@/lib/supabase/admin";
import { ENQUETE_PAIS } from "@/lib/enquete-config";
import { relatorioAutenticado } from "@/lib/relatorio-auth";
import {
  EnqueteDashboard,
  type RespostaRow,
} from "@/components/enquete/enquete-dashboard";
import { Logo } from "@/components/shared/logo";
import { RelatorioLogin } from "../../relatorio/relatorio-login";
import { SairButton } from "../../relatorio/sair-button";

export default async function RelatorioFundamental1Page() {
  if (!(await relatorioAutenticado())) {
    return <RelatorioLogin />;
  }

  const def = ENQUETE_PAIS;
  const admin = createAdminClient();
  const { data } = await admin
    .from("enquete_respostas")
    .select("id, serie, turma, respostas, meta, created_at")
    .eq("slug", def.slug)
    .order("created_at", { ascending: false });

  const shareUrl =
    (def.shareUrlEnv && process.env[def.shareUrlEnv]) || def.shareUrlDefault;

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="compact" />
          <SairButton />
        </div>
      </header>
      <EnqueteDashboard
        def={def}
        respostas={(data ?? []) as RespostaRow[]}
        shareUrl={shareUrl}
      />
    </div>
  );
}
