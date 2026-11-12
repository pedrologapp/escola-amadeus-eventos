"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/**
 * Abas do painel. "Hoje" e "Calendário" já são do painel novo; as outras ainda abrem as telas de sempre
 * (mesmo login), até cada uma ganhar a sua versão nova.
 */
const ABAS = [
  { href: "/painel", rotulo: "Hoje" },
  { href: "/admin/rematricula-2027", rotulo: "Matrícula" },
  { href: "/admin/comunicacao/aniversarios", rotulo: "Comunicação" },
  { href: "/admin/eventos", rotulo: "Eventos" },
  { href: "/painel/calendario", rotulo: "Calendário" },
];
const MAIS = [
  { href: "/admin/culminancia", rotulo: "Pedagógico" },
  { href: "/admin/campanhas", rotulo: "Arquivo" },
];

export function Abas() {
  const caminho = usePathname() ?? "";
  const [aberto, setAberto] = useState(false);
  const ativa = (href: string) => (href === "/painel" ? caminho === "/painel" : caminho.startsWith(href));
  return (
    <>
      <nav className="hidden items-center gap-1 text-[15px] font-semibold lg:flex">
        {ABAS.map((a) => (
          <Link key={a.href} href={a.href} className={`rounded-full px-4 py-1.5 ${ativa(a.href) ? "bg-white text-[#1B3B7C]" : "opacity-85 hover:bg-white/10"}`}>{a.rotulo}</Link>
        ))}
        {MAIS.map((a) => (
          <Link key={a.href} href={a.href} className="rounded-full px-3 py-1.5 text-sm font-medium opacity-60 hover:bg-white/10 hover:opacity-100">{a.rotulo}</Link>
        ))}
      </nav>
      <div className="relative lg:hidden">
        <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-bold">
          Menu
        </button>
        {aberto && (
          <ul className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 text-[#1A2240] shadow-xl">
            {[...ABAS, ...MAIS].map((a) => (
              <li key={a.href}><Link href={a.href} onClick={() => setAberto(false)} className={`block px-4 py-2.5 text-sm font-semibold ${ativa(a.href) ? "bg-[#eef2fa] text-[#1B3B7C]" : ""}`}>{a.rotulo}</Link></li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
