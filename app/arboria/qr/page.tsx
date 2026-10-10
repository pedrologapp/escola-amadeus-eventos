import QRCode from "qrcode";
import { Atkinson_Hyperlegible, Young_Serif } from "next/font/google";

// as mesmas letras do trailer e do cadastro do pai
const atkinson = Atkinson_Hyperlegible({ subsets: ["latin"], weight: ["400", "700"] });
const youngSerif = Young_Serif({ subsets: ["latin"], weight: "400" });
export const metadata = { title: "Arboria · QR da sala", robots: { index: false } };

const LINK = "https://eventos.escolaamadeus.com/arboria";

/** Tela para a TV da sala: o QR que leva os pais ao cadastro da série do filho (estética do trailer). */
export default async function QrArboria() {
  const svg = await QRCode.toString(LINK, { type: "svg", margin: 1, color: { dark: "#000000", light: "#FFFFFF" } });
  return (
    <main className={`${atkinson.className} relative flex min-h-screen items-center justify-center gap-[6vw] overflow-hidden bg-black px-[6vw] text-[#F4EAD8]`}>
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at 30% 20%, rgba(255,201,74,.12), transparent 50%)" }} />
      <div className="relative max-w-[46vw]">
        <p className="text-[1.3vw] font-bold uppercase tracking-[0.45em] text-white/55">Uma série original Arboria</p>
        <h1 className={`${youngSerif.className} mt-[2vw] text-[4.6vw] leading-[1.12]`}>Toda série começa com <span className="text-[#FFC94A]">um protagonista.</span></h1>
        <p className="mt-[2.4vw] text-[2vw] leading-snug text-white/80">Aponte a câmera do celular para o código e conte para a gente quem é o seu.</p>
        <p className="mt-[1.6vw] text-[1.6vw] text-white/55">Tem mais de um filho? Dá para colocar todos. Cada um ganha a sua série.</p>
      </div>
      <div className="relative rounded-[1.6vw] bg-white p-[1.4vw] shadow-[0_0_80px_rgba(255,201,74,.25)]">
        <div className="size-[32vw] max-h-[76vh] max-w-[76vh] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-[0.8vw] text-center text-[1.5vw] font-bold text-black">eventos.escolaamadeus.com/arboria</p>
      </div>
    </main>
  );
}
