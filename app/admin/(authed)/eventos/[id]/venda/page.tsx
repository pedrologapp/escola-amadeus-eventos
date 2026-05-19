import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { Lote } from "@/lib/lotes";
import { VendaForm } from "./venda-form";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function VendaDinheiroPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventos")
    .select(
      "id, nome, cor_tematica, series_permitidas, turmas_permitidas, tipos_ingresso(id, nome, preco, descricao, ordem, lotes)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!evento) notFound();

  const cor = evento.cor_tematica ?? "#1B3B7C";
  const tipos = (evento.tipos_ingresso ?? [])
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0))
    .map((t) => ({
      id: t.id,
      nome: t.nome,
      preco: Number(t.preco),
      descricao: t.descricao,
      lotes: (t.lotes ?? []) as Lote[],
    }));

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Link
        href={`/admin/eventos/${id}`}
        className="inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue hover:underline"
      >
        <ChevronLeft className="size-4" />
        Voltar para o evento
      </Link>
      <h1 className="mt-4 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
        <Wallet className="size-7" />
        Venda em dinheiro
      </h1>
      <p className="mt-1 text-muted-foreground">
        Registre um pagamento presencial. A inscrição entra como{" "}
        <strong>paga</strong> e os QR Codes vão pro WhatsApp do responsável.
      </p>

      <div className="mt-8">
        <VendaForm
          eventoId={evento.id}
          eventoNome={evento.nome}
          cor={cor}
          seriesPermitidas={evento.series_permitidas}
          turmasPermitidas={evento.turmas_permitidas}
          tipos={tipos}
        />
      </div>
    </div>
  );
}
