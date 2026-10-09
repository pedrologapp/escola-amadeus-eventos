import QRCode from "qrcode";
import { Fredoka } from "next/font/google";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["500", "700"] });
export const metadata = { title: "Arboria · QR da sala", robots: { index: false } };

const LINK = "https://eventos.escolaamadeus.com/arboria";

/** Tela para a TV da sala: o QR que leva os pais ao cadastro da história do filho. */
export default async function QrArboria() {
  const svg = await QRCode.toString(LINK, { type: "svg", margin: 1, color: { dark: "#0A2F7A", light: "#FFFFFF" } });
  return (
    <main className={`${fredoka.className} flex min-h-screen items-center justify-center gap-[6vw] bg-[#0A2F7A] px-[6vw] text-white`}>
      <div className="max-w-[44vw]">
        <p className="text-[2vw] font-bold uppercase tracking-[0.25em] text-[#FFC21A]">Arboria · 2027</p>
        <h1 className="mt-[1.5vw] text-[5vw] font-bold leading-[1.05]">Qual vai ser a jornada do seu filho?</h1>
        <p className="mt-[2vw] text-[2.2vw] leading-snug text-white/85">Aponte a câmera do celular para o código, coloque o nome dele(a) e responda as perguntas.</p>
        <p className="mt-[2vw] text-[1.8vw] text-white/70">Tem mais de um filho? Dá para colocar todos. Cada um ganha a sua história.</p>
      </div>
      <div className="rounded-[2vw] bg-white p-[1.6vw] shadow-2xl">
        <div className="size-[34vw] max-h-[78vh] max-w-[78vh] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
        <p className="mt-[1vw] text-center text-[1.6vw] font-bold text-[#0A2F7A]">eventos.escolaamadeus.com/arboria</p>
      </div>
    </main>
  );
}
