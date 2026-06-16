import { createAdminClient } from "@/lib/supabase/admin";
import { relatorioAutenticado } from "@/lib/relatorio-auth";
import { Logo } from "@/components/shared/logo";
import {
  FardamentoDashboard,
  type RowFardamento,
} from "@/components/fardamento/fardamento-dashboard";
import { RelatorioLogin } from "./relatorio-login";
import { SairButton } from "./sair-button";

export default async function FardamentoRelatorioPage() {
  if (!(await relatorioAutenticado())) {
    return <RelatorioLogin />;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("fardamento_interesse")
    .select("id, nome, quer, modelo, tamanho, tipo, quantidade, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/85 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Logo variant="compact" />
          <SairButton />
        </div>
      </header>
      <div className="container mx-auto px-4 py-6">
        <h1 className="mb-1 text-2xl font-extrabold text-amadeus-blue">
          Fardamento — Pedidos
        </h1>
        <FardamentoDashboard rows={(data ?? []) as RowFardamento[]} />
      </div>
    </div>
  );
}
