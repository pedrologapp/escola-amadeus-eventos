"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  Calculator,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  Megaphone,
  Menu,
  Receipt,
  Shapes,
  X,
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
  { href: "/admin/rematricula-2027", label: "Rematrícula 2027", icon: Calculator, inclui: ["/admin/rematricula-2027", "/admin/campanhas/rematricula-2027"] },
  { href: "/admin/cobrancas", label: "Cobranças", icon: Receipt, inclui: ["/admin/cobrancas"] },
  { href: "/admin/comunicacao", label: "Comunicação", icon: Megaphone, inclui: ["/admin/comunicacao", "/admin/enquete"] },
  {
    href: "/admin/campanhas",
    label: "Campanhas",
    icon: Shapes,
    inclui: ["/admin/campanhas", "/admin/diversos", "/admin/matriculas2027", "/admin/reuniao", "/admin/dia-dos-pais", "/admin/fardamento", "/admin/fotos-infancia"],
  },
];

export function AdminNav({ mobile = false }: { mobile?: boolean }) {
  const caminho = usePathname() ?? "";
  const [aberto, setAberto] = useState(false);
  const ativo = (inclui: string[]) => inclui.some((r) => caminho === r || caminho.startsWith(r + "/"));

  if (mobile) {
    // No celular as abas viram um "Menu": mostra onde está e, ao tocar, lista todas.
    const atual = LINKS.find((l) => ativo(l.inclui));
    const IconeAtual = atual?.icon;
    return (
      <nav className="container relative mx-auto px-4 pb-3 md:hidden">
        <button
          type="button"
          onClick={() => setAberto(!aberto)}
          aria-expanded={aberto}
          className="flex w-full items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2.5 text-sm font-bold text-white"
        >
          {aberto ? <X className="size-4" /> : <Menu className="size-4" />}
          Menu
          {atual && IconeAtual && (
            <span className="ml-auto flex items-center gap-1.5 rounded-lg bg-white/15 px-2 py-0.5 text-xs font-semibold">
              <IconeAtual className="size-3.5" /> {atual.label}
            </span>
          )}
          <ChevronDown className={`size-4 transition-transform ${atual ? "" : "ml-auto"} ${aberto ? "rotate-180" : ""}`} />
        </button>
        {aberto && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
            <ul className="absolute inset-x-4 top-full z-50 -mt-1 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-xl">
              {LINKS.map((link) => {
                const Icone = link.icon;
                const on = ativo(link.inclui);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setAberto(false)}
                      aria-current={on ? "page" : undefined}
                      className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold ${on ? "bg-amadeus-blue-50 text-amadeus-blue" : "text-foreground hover:bg-muted"}`}
                    >
                      <Icone className="size-4" />
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
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
