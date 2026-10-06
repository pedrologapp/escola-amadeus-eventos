/**
 * Desenho em traço de caneta (estilo caderno) que se desenha sozinho: sol, tobogã, ondas e o ônibus chegando.
 * Traço fino azul-marinho com detalhes em amarelo, para não ficar infantil.
 */
const TRACOS: { d: string; cor?: string; atraso: number; largura?: number }[] = [
  // sol
  { d: "M268 58a26 26 0 1 0 52 0a26 26 0 1 0 -52 0", cor: "#F2A20C", atraso: 0.1, largura: 3 },
  { d: "M294 18v-10 M294 108v-10 M254 58h-10 M344 58h-10 M266 30l-7-7 M329 93l-7-7 M322 30l7-7 M259 93l7-7", cor: "#F2A20C", atraso: 0.5, largura: 2.5 },
  // tobogã: a torre e a curva do escorrega
  { d: "M70 168v-112 M98 168v-112 M64 56h40 M70 84h28 M70 112h28 M70 140h28", atraso: 0.6 },
  { d: "M98 60c40 0 52 30 34 52s-30 40 6 52s64 4 92 4", atraso: 1.0, largura: 3 },
  { d: "M98 72c32 2 40 26 24 44s-22 34 10 42s62 2 98 2", atraso: 1.3, largura: 2 },
  // respingo no fim do escorrega
  { d: "M232 150c4-10 10-12 14-4 M246 144c6-8 12-6 12 2", cor: "#2E8FF0", atraso: 1.9, largura: 2.5 },
  // ondas da piscina
  { d: "M20 186c18-10 36-10 54 0s36 10 54 0s36-10 54 0s36 10 54 0s36-10 54 0s36 10 54 0", cor: "#2E8FF0", atraso: 1.6, largura: 3 },
  { d: "M44 204c18-8 36-8 54 0s36 8 54 0s36-8 54 0s36 8 54 0s36-8 54 0", cor: "#2E8FF0", atraso: 1.9, largura: 2 },
  // ônibus
  { d: "M262 168v-36a8 8 0 0 1 8-8h64a8 8 0 0 1 8 8v36z M272 134h16v12h-16z M294 134h16v12h-16z M316 134h16v12h-16z", atraso: 2.1 },
  { d: "M276 170a7 7 0 1 0 14 0a7 7 0 1 0 -14 0 M314 170a7 7 0 1 0 14 0a7 7 0 1 0 -14 0", atraso: 2.5 },
];

export function DesenhoParque({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 220" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <style>{`.tr{stroke-dasharray:1;stroke-dashoffset:1;animation:dp-desenha 1.4s ease forwards}@keyframes dp-desenha{to{stroke-dashoffset:0}}@media (prefers-reduced-motion:reduce){.tr{animation:none;stroke-dashoffset:0}}`}</style>
      {TRACOS.map((t, i) => (
        <path key={i} d={t.d} pathLength={1} className="tr" stroke={t.cor ?? "#1B3B7C"} strokeWidth={t.largura ?? 2.5} style={{ animationDelay: `${t.atraso}s` }} />
      ))}
    </svg>
  );
}
