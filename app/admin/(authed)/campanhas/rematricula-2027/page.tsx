import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { lerAluno, listarAlunos, type AlunoBusca, type Leitura } from "@/lib/rematricula-2027-dados";
import { Simulador } from "./simulador";

/**
 * Simulador da rematrícula 2027 (só a direção usa). Escolhe o aluno, o
 * sistema lê o boleto de 2026 no Activesoft, separa o livro e mostra quanto
 * fica 2027 fechando até 30/10 e depois. Daí sai o texto do WhatsApp e a
 * carta impressa para a família. Nada é gravado.
 */
export const metadata = { title: "Rematrícula 2027 · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function RematriculaPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
  const { aluno } = await searchParams;
  let alunos: AlunoBusca[] = [];
  let leitura: Leitura | null = null;
  let erro: string | null = null;
  try {
    alunos = await listarAlunos();
    if (aluno && /^\d+$/.test(aluno)) leitura = await lerAluno(Number(aluno));
  } catch (e) {
    erro = (e as Error).message;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/campanhas" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Campanhas
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Escolha o aluno para ver quanto a família paga hoje e como fica 2027. Se não achar, simule como novato.
      </p>

      {erro && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {erro}
        </div>
      )}

      <Simulador key={leitura?.aluno.id ?? "novo"} alunos={alunos} leitura={leitura} />
    </div>
  );
}
