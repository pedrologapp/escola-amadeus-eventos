import Image from "next/image";
import { FormLogin } from "./form";

export const metadata = { title: "Entrar · Painel Amadeus" };

export default function LoginPainel() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <Image src="/folder/marca-30-anos.png" alt="Centro Educacional Amadeus, 30 anos" width={72} height={79} priority />
          <h1 className="mt-5 font-[family-name:var(--font-serifa)] text-3xl font-bold text-[#1B3B7C]">Painel da escola</h1>
          <p className="mt-1 text-sm text-[#5b6478]">Entre com o seu e-mail e a sua senha.</p>
        </div>
        <div className="mt-7 rounded-2xl border border-[#e8e1d0] bg-white p-6 shadow-sm">
          <FormLogin />
        </div>
      </div>
    </main>
  );
}
