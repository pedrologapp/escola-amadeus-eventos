import Link from "next/link";
import { ChevronLeft, BadgeCheck } from "lucide-react";
import {
  lerAluno,
  listarAlunos,
  responsaveisDoAluno,
  type AlunoBusca,
  type Leitura,
  type Responsavel,
} from "@/lib/rematricula-2027-dados";
import { FormAVista } from "./form-avista";

/**
 * Matrícula à vista (29/10/2026): a família pagou o ano inteiro direto à escola (Pix ou cartão), sem o Isaac. Escolhe o aluno (os valores
 * vêm do encarte à vista, a partir do que a família paga hoje) ou o novato pela série, a forma de pagamento e o desconto; fica salvo como
 * pago em Cobranças e sai o comprovante para o WhatsApp.
 */
export const metadata = { title: "Matrícula à vista · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function MatriculaAVistaPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  let alunos: AlunoBusca[] = [];
  let leitura: Leitura | null = null;
  let responsaveis: Responsavel[] = [];
  let erro: string | null = null;
  try {
    alunos = await listarAlunos();
    if (aluno && /^\d+$/.test(aluno)) {
      const id = Number(aluno);
      [leitura, responsaveis] = await Promise.all([lerAluno(id), responsaveisDoAluno(id).catch(() => [])]);
    }
  } catch (e) {
    erro = (e as Error).message;
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-10">
      <Link href="/admin/cobrancas" className="inline-flex items-center gap-1 text-sm font-semibold text-amadeus-blue hover:underline">
        <ChevronLeft className="size-4" />
        Voltar para cobranças
      </Link>
      <h1 className="mt-4 flex items-center gap-2 text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">
        <BadgeCheck className="size-7" />
        Matrícula à vista
      </h1>
      <p className="mt-1 text-muted-foreground">
        Para quem pagou o ano de 2027 inteiro direto à escola (Pix ou cartão), sem o Isaac. Os valores vêm do encarte à vista. Fica salvo como
        pago e sai o comprovante para a família.
      </p>
      {erro && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">Não consegui ler o Activesoft: {erro}</p>}
      <div className="mt-8">
        <FormAVista key={leitura?.aluno.id ?? "novo"} alunos={alunos} leitura={leitura} responsaveis={responsaveis} />
      </div>
    </div>
  );
}
