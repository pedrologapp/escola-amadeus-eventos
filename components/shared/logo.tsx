import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "compact" | "stacked";
}

const SIZES = {
  sm: 36,
  md: 48,
  lg: 64,
} as const;

/**
 * Logo do Centro Educacional Amadeus.
 * Usa a arte oficial em /public/logo-amadeus.png.
 */
export function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "compact") {
    // Barras de navegação compactas (mobile/header)
    return (
      <div className={cn("flex items-center gap-2.5", className)}>
        <LogoMark size="sm" priority />
        <div className="flex flex-col leading-none">
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-amadeus-yellow sm:block">
            Centro Educacional
          </span>
          <span className="text-base font-extrabold tracking-tight text-amadeus-blue">
            Amadeus
          </span>
        </div>
      </div>
    );
  }

  if (variant === "stacked") {
    // Empty states grandes, hero do admin, telas de login
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <LogoMark size="lg" />
        <div className="flex flex-col items-center leading-none">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amadeus-yellow">
            Centro Educacional
          </span>
          <span className="mt-1 text-3xl font-extrabold tracking-tight text-amadeus-blue">
            Amadeus
          </span>
        </div>
      </div>
    );
  }

  // default — cards, headers de página
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <LogoMark size="md" />
      <div className="flex flex-col leading-none">
        <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amadeus-yellow">
          Centro Educacional
        </span>
        <span className="mt-1 text-xl font-extrabold tracking-tight text-amadeus-blue">
          Amadeus
        </span>
      </div>
    </div>
  );
}

interface LogoMarkProps {
  size?: keyof typeof SIZES;
  priority?: boolean;
  className?: string;
}

/**
 * Apenas o símbolo (o círculo com o "A" e o globo).
 * Útil pra usar isolado em hero/destaque.
 */
export function LogoMark({
  size = "md",
  priority = false,
  className,
}: LogoMarkProps) {
  const px = SIZES[size];
  return (
    <Image
      src="/logo-amadeus.png"
      alt="Centro Educacional Amadeus"
      width={px}
      height={px}
      priority={priority}
      className={cn("shrink-0", className)}
    />
  );
}
