"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Shapes,
} from "lucide-react";

/**
 * A barra do admin. O dia a dia fica aqui; campanhas com começo e fim moram
 * em /admin/campanhas e o que conversa com famílias e equipe no dia a dia
 * (aniversários, pesquisas) em /admin/comunicacao. As rotas antigas de cada
 * módulo continuam valendo.
 *
 * `inclui` diz quais rotas acendem a aba: a página de um módulo acende a
 * aba onde ele mora.
 */
const LINKS = [
  { href: "/admin/dashboard", label: "Visão geral", icon: LayoutDashboard, inclui: ["/admin/dashboard"] },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays, inclui: ["/admin/eventos"] },
  { href: "/admin/cobrancas", label: "Cobranças", icon: Receipt, inclui: ["/admin/cobrancas"] },
  { href: "/admin/comunicacao", label: "Comunicação", icon: Megaphone, inclui: ["/admin/comunicacao", "/admin/enquete"] },
  {
    href: "/admin/campanhas",
    label: "Campanhas",
    icon: Shapes,
    inclui: ["/admin/campanhas", "/admin/diversos", "/admin/matriculas2027", "/admin/reuniao", "/admin/dia-dos-pais", "/admin/fardamento"],
  },
];

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const caminho = usePathname() ?? "";
  const ativo = (inclui: string[]) => inclui.some((r) => caminho === r || caminho.startsWith(r + "/"));

  if (mobile) {
    return (
      <nav className="container mx-auto flex gap-1 overflow-x-auto px-4 pb-3 md:hidden">
        {LINKS.map((link) => {
          const Icone = link.icon;
          const on = ativo(link.inclui);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={on ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
                on ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue"
              }`}
            >
              <Icone className="size-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="hidden items-center gap-1 md:flex">
      {LINKS.map((link) => {
        const Icone = link.icon;
        const on = ativo(link.inclui);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
              on
                ? "bg-amadeus-blue-50 text-amadeus-blue"
                : "text-muted-foreground hover:bg-amadeus-blue-50 hover:text-amadeus-blue"
            }`}
          >
            <Icone className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
