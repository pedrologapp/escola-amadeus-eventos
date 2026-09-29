import Link from "next/link";

/** Abas da rematrícula: o simulador (vai para o pai) e a tabela de consulta (só da equipe). */
export function AbasRematricula({ ativa }: { ativa: "simulador" | "valores" | "experiencia" }) {
  const abas = [
    { id: "simulador", href: "/admin/rematricula-2027", rotulo: "Simulador" },
    { id: "valores", href: "/admin/rematricula-2027/valores", rotulo: "Tabela de valores" },
    { id: "experiencia", href: "/admin/rematricula-2027/experiencia", rotulo: "Experiência Amadeus" },
  ] as const;
  return (
    <div className="mt-4 flex gap-1 border-b border-border/60">
      {abas.map((a) => (
        <Link
          key={a.id}
          href={a.href}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${
            ativa === a.id ? "border-amadeus-blue text-amadeus-blue" : "border-transparent text-muted-foreground hover:text-amadeus-blue"
          }`}
        >
          {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
