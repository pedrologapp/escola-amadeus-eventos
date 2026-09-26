import Image from "next/image";

/** Tela das páginas que ainda não foram liberadas (ver lib/liberacao.ts). */
export default function EmBreve() {
  return (
    <main
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center text-[#FAF7F0]"
      style={{
        background:
          "radial-gradient(120% 80% at 50% 38%, #16224A 0%, #0A0D18 58%, #05060C 100%)",
      }}
    >
      <Image
        src="/folder/marca-globo.png"
        alt="Centro Educacional Amadeus"
        width={140}
        height={140}
        priority
        className="h-28 w-28 sm:h-36 sm:w-36"
      />
      <p className="mt-10 text-xs font-extrabold uppercase tracking-[0.3em] text-[#FFB000]">
        Matrículas 2027
      </p>
      <h1 className="mt-4 max-w-md font-serif text-4xl leading-tight sm:text-5xl">
        Esta página será liberada em breve.
      </h1>
      <p className="mt-5 max-w-sm text-base leading-relaxed text-[#FAF7F0]/70">
        Ela abre durante a Reunião de Abertura das Matrículas 2027. Volte
        daqui a pouco!
      </p>
      <p className="mt-14 text-xs font-bold uppercase tracking-[0.24em] text-[#FAF7F0]/40">
        Centro Educacional Amadeus · 30 anos
      </p>
    </main>
  );
}
