"use client";

import { useEffect, useState } from "react";

const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/** Bom dia/tarde/noite pela hora de quem está vendo (a página fica guardada o dia todo). */
export function Saudacao() {
  const [agora, setAgora] = useState<Date | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setAgora(new Date()), 0);
    return () => clearTimeout(t);
  }, []);
  const h = agora?.getHours() ?? 9;
  const oi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return (
    <div>
      <h1 className="f-ralton text-3xl leading-none text-amadeus-blue sm:text-4xl">{oi}, família Amadeus!</h1>
      <p className="mt-1.5 f-scrib text-base text-slate-500">
        {agora ? `${DIAS[agora.getDay()]}, ${agora.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}` : " "}
      </p>
    </div>
  );
}
