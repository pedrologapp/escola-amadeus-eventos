import { TriangleAlert } from "lucide-react";
import { lerAluno, listarAlunos, type AlunoBusca, type Leitura } from "@/lib/rematricula-2027-dados";
import { PRAZO_PROMOCAO } from "@/lib/rematricula-2027";
import { Simulador } from "../simulador";
import { AbasRematricula } from "../abas";

/**
 * (04/11/2026, Pedro) Como era a rematrícula até 28/10: o mesmo simulador, mas com as duas colunas
 * (fechando até 28/10 × depois) e a carta antiga. Só para consulta: daqui nada vai para a família.
 */
export const metadata = { title: "Rematrícula 2027 · como era até 28/10 · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function AntesPage({ searchParams }: { searchParams: Promise<{ aluno?: string }> }) {
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
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="antes" />
      <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Só para ver.</b> Esta é a condição que valeu até {PRAZO_PROMOCAO}: os valores fechando no prazo, os valores depois e a carta
        como ela ia para a família. Daqui nada é enviado. Para mandar valores hoje, use o Simulador.
      </p>

      {erro && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {erro}
        </div>
      )}

      <Simulador key={leitura?.aluno.id ?? "novo"} alunos={alunos} leitura={leitura} responsaveis={[]} envios={[]} antes />
    </div>
  );
}
