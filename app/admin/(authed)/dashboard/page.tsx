import Link from "next/link";
import { ArrowRight, Calculator, CalendarDays, MessageCircleWarning, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Visão geral: atalhos rápidos para o que a direção mais usa. Os números de
 * ingressos e receita ficam na aba Eventos (pedido da direção, 28/09/2026).
 */
export const dynamic = "force-dynamic";

function Atalho({ href, icone: Icone, titulo, descricao, destaque, extra }: {
  href: string;
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  destaque?: { valor: string; rotulo: string; alerta?: boolean };
  extra?: { href: string; rotulo: string };
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <Link href={href} className="flex flex-1 flex-col">
        <span className="flex items-start justify-between gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-amadeus-blue-50 text-amadeus-blue">
            <Icone className="size-5" />
          </span>
          {destaque && (
            <span className="text-right">
              <span className={`block text-2xl font-extrabold leading-none ${destaque.alerta ? "text-red-600" : "text-amadeus-blue"}`}>{destaque.valor}</span>
              <span className="text-xs text-muted-foreground">{destaque.rotulo}</span>
            </span>
          )}
        </span>
        <span className="mt-4 text-lg font-extrabold text-amadeus-blue">{titulo}</span>
        <span className="mt-1 text-sm text-muted-foreground">{descricao}</span>
      </Link>
      <span className="mt-4 flex items-center justify-between gap-2 text-sm font-semibold">
        <Link href={href} className="inline-flex items-center gap-1 text-amadeus-blue">Abrir <ArrowRight className="size-4" /></Link>
        {extra && <Link href={extra.href} className="text-muted-foreground hover:text-amadeus-blue">{extra.rotulo}</Link>}
      </span>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
  const [{ data: proximos }, { data: conversas }] = await Promise.all([
    supabase.from("eventos").select("nome, data_evento").eq("status", "publicado").gte("data_evento", hoje).order("data_evento").limit(1),
    createAdminClient().from("whatsapp_conversas").select("importancia").eq("status", "aguardando").eq("ultima_da_escola", false), // só as sem resposta
  ]);
  const aguardando = (conversas ?? []).filter((c) => c.importancia !== "baixa").length;
  const importantes = (conversas ?? []).filter((c) => c.importancia === "alta").length;
  const prox = proximos?.[0];
  const dataProx = prox ? new Date(`${prox.data_evento}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : null;

  return (
    <div className="container mx-auto px-4 py-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">Visão geral</h1>
      <p className="mt-1 text-muted-foreground">Atalhos para o dia a dia.</p>

      <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Atalho
          href="/admin/rematricula-2027"
          icone={Calculator}
          titulo="Rematrícula 2027"
          descricao="Simular a mensalidade, imprimir ou mandar a carta para a família."
          extra={{ href: "/admin/rematricula-2027/valores", rotulo: "Tabela de valores" }}
        />
        <Atalho
          href="/admin/comunicacao/whatsapp"
          icone={MessageCircleWarning}
          titulo="WhatsApp da escola"
          descricao="Mensagens que esperam resposta, por assunto e importância."
          destaque={{
            valor: String(aguardando),
            rotulo: importantes ? `${importantes} importante${importantes > 1 ? "s" : ""}` : "aguardando",
            alerta: importantes > 0,
          }}
        />
        <Atalho
          href="/admin/eventos"
          icone={CalendarDays}
          titulo="Eventos"
          descricao={prox ? `Próximo: ${prox.nome}` : "Nenhum evento publicado pela frente."}
          destaque={dataProx ? { valor: dataProx, rotulo: "próximo" } : undefined}
          extra={{ href: "/admin/eventos/novo", rotulo: "Novo evento" }}
        />
      </section>
    </div>
  );
}
