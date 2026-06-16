import { createAdminClient } from "@/lib/supabase/admin";
import {
  FardamentoDashboard,
  type RowFardamento,
} from "@/components/fardamento/fardamento-dashboard";

export default async function AdminFardamentoPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("fardamento_interesse")
    .select("id, nome, quer, modelo, tamanho, tipo, quantidade, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="mb-1 text-2xl font-extrabold text-amadeus-blue">
        Fardamento — Pedidos
      </h1>
      <FardamentoDashboard rows={(data ?? []) as RowFardamento[]} />
    </div>
  );
}
