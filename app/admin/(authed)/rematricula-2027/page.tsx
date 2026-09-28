import { TriangleAlert } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  lerAluno,
  listarAlunos,
  responsaveisDoAluno,
  type AlunoBusca,
  type Leitura,
  type Responsavel,
} from "@/lib/rematricula-2027-dados";
import { Simulador, type EnvioFeito } from "./simulador";
import { AbasRematricula } from "./abas";

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
  let responsaveis: Responsavel[] = [];
  let envios: EnvioFeito[] = [];
  let erro: string | null = null;
  try {
    alunos = await listarAlunos();
    if (aluno && /^\d+$/.test(aluno)) {
      const id = Number(aluno);
      const [l, r, e] = await Promise.all([
        lerAluno(id),
        responsaveisDoAluno(id).catch(() => []),
        createAdminClient()
          .from("rematricula_envios")
          .select("responsavel, telefone, status, detalhe, created_at")
          .eq("aluno_id", id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);
      leitura = l;
      responsaveis = r;
      envios = (e.data ?? []) as EnvioFeito[];
    }
  } catch (e) {
    erro = (e as Error).message;
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="simulador" />
      <p className="mt-4 text-sm text-muted-foreground">
        Escolha o aluno para ver quanto a família paga hoje e como fica 2027. Se não achar, simule como novato.
      </p>

      {erro && (
        <div className="mt-6 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {erro}
        </div>
      )}

      <Simulador key={leitura?.aluno.id ?? "novo"} alunos={alunos} leitura={leitura} responsaveis={responsaveis} envios={envios} />
    </div>
  );
}
