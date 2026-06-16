import { createAdminClient } from "@/lib/supabase/admin";
import { ENQUETE_SLUG } from "@/lib/enquete-config";
import { relatorioAutenticado } from "@/lib/relatorio-auth";
import {
  EnqueteDashboard,
  type RespostaRow,
} from "@/components/enquete/enquete-dashboard";
import { Logo } from "@/components/shared/logo";
import { RelatorioLogin } from "./relatorio-login";
import { SairButton } from "./sair-button";

export default async function RelatorioPage() {
  if (!(await relatorioAutenticado())) {
    return <RelatorioLogin />;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("enquete_respostas")
    .select("id, serie, turma, respostas, meta, created_at")
    .eq("slug", ENQUETE_SLUG)
    .order("created_at", { ascending: false });

  const shareUrl =
    process.env.NEXT_PUBLIC_ENQUETE_URL || "https://pesquisa.escolaamadeus.com";

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="compact" />
          <SairButton />
        </div>
      </header>
      <EnqueteDashboard
        respostas={(data ?? []) as RespostaRow[]}
        shareUrl={shareUrl}
      />
    </div>
  );
}
