import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export interface Modulo {
  href: string;
  icone: LucideIcon;
  titulo: string;
  descricao: string;
  /** Selo no canto: "Em andamento", "Encerrada", "Novo"... */
  selo?: string;
}

/** Cartão de módulo dos hubs Comunicação e Campanhas. */
export function ModuloCard({ m, apagado = false }: { m: Modulo; apagado?: boolean }) {
  const Icone = m.icone;
  return (
    <Link
      href={m.href}
      className={`group relative rounded-2xl border border-border/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-amadeus-blue/40 hover:shadow-lg ${
        apagado ? "opacity-70 hover:opacity-100" : ""
      }`}
    >
      {m.selo && (
        <span
          className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${
            apagado ? "bg-muted text-muted-foreground" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {m.selo}
        </span>
      )}
      <div className="flex size-11 items-center justify-center rounded-xl bg-amadeus-blue-50 text-amadeus-blue transition-colors group-hover:bg-amadeus-blue group-hover:text-white">
        <Icone className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-extrabold text-amadeus-blue">{m.titulo}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{m.descricao}</p>
    </Link>
  );
}
