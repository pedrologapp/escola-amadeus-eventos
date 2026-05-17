import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "compact";
}

export function Logo({ className, variant = "default" }: LogoProps) {
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-amadeus-blue text-base font-extrabold text-white shadow-float">
          A
        </div>
        <span className="text-base font-extrabold tracking-tight text-amadeus-blue">
          Amadeus
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amadeus-blue text-lg font-extrabold text-white shadow-float">
        A
      </div>
      <div className="flex flex-col leading-tight">
        <span className="text-xs font-semibold uppercase tracking-widest text-amadeus-yellow">
          Centro Educacional
        </span>
        <span className="text-xl font-extrabold tracking-tight text-amadeus-blue">
          Amadeus
        </span>
      </div>
    </div>
  );
}
