import Link from "next/link";
import { ArrowRight, Calculator, CalendarDays, MessageCircleWarning, PenLine, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Visão geral: atalhos rápidos para o que a direção mais usa. Os números de
 * ingressos e receita ficam na aba Eventos (pedido da direção, 28/09/2026).
 */
export const dynamic = "force-dynamic";

// Cores de cada atalho: o do WhatsApp usa o verde do próprio WhatsApp.
const CORES = {
  azul: { icone: "bg-amadeus-blue-50 text-amadeus-blue", titulo: "text-amadeus-blue", link: "text-amadeus-blue" },
  whatsapp: { icone: "bg-[#25D366] text-white", titulo: "text-[#008069]", link: "text-[#008069]" },
} as const;

/** No celular fica em grade de 2 colunas (compacto); no computador, 4 lado a lado. */
function Atalho({ href, icone: Icone, titulo, descricao, destaque, extra, cor = "azul" }: {
  href: string;
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  destaque?: { valor: string; rotulo: string; alerta?: boolean };
  extra?: { href: string; rotulo: string };
  cor?: keyof typeof CORES;
}) {
  const c = CORES[cor];
  return (
    <div className={`flex flex-col rounded-2xl border bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-5 ${cor === "whatsapp" ? "border-[#25D366]/40" : "border-border/60"}`}>
      <Link href={href} className="flex flex-1 flex-col">
        <span className="flex items-start justify-between gap-2">
          <span className={`grid size-9 place-items-center rounded-xl sm:size-11 ${c.icone}`}>
            <Icone className="size-4 sm:size-5" />
          </span>
          {destaque && (
            <span className="text-right">
              <span className={`block text-xl font-extrabold leading-none sm:text-2xl ${destaque.alerta ? "text-red-600" : c.titulo}`}>{destaque.valor}</span>
              <span className="text-[11px] text-muted-foreground sm:text-xs">{destaque.rotulo}</span>
            </span>
          )}
        </span>
        <span className={`mt-3 text-base font-extrabold leading-tight sm:mt-4 sm:text-lg ${c.titulo}`}>{titulo}</span>
        <span className="mt-1 line-clamp-3 text-xs text-muted-foreground sm:text-sm">{descricao}</span>
      </Link>
      <span className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-semibold sm:mt-4 sm:text-sm">
        <Link href={href} className={`inline-flex items-center gap-1 ${c.link}`}>Abrir <ArrowRight className="size-4" /></Link>
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

      <section className="mt-6 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-4">
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
          cor="whatsapp"
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
        <Atalho
          href="/admin/eventos/encarte"
          icone={PenLine}
          titulo="Criar encarte"
          descricao="Escreva um aviso ou convite e a IA monta a imagem no estilo da escola."
        />
      </section>
    </div>
  );
}
