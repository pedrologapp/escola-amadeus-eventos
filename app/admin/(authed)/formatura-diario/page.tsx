import { listarAlunos, mensagensDe, type AlunoDiario } from "@/lib/formatura-diario";
import { PainelDiario, type AlunoAdmin } from "./painel";
import { RevisaoAmigos, type LinhaRevisao } from "./revisao";
import { amigoDaCrianca } from "@/lib/amigomagico/amigos";
import { revisoesDe } from "@/lib/amigomagico/revisao";

/**
 * Diário da formatura do Grupo V (18/12/2026): o que as professoras registraram em /amigomagico/diario,
 * por turma e por aluno: textos, fotos e áudios, para ler, ouvir e baixar (as fotos e os áudios vão para o telão).
 */
export const metadata = { title: "Diário da formatura do Grupo V · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function DiarioAdmin() {
  let alunos: AlunoDiario[] = [];
  let erro: string | null = null;
  try {
    alunos = await listarAlunos(undefined, "todos"); // formandos e os outros alunos do Grupo V (aba "Alunos" do Diário)
  } catch (e) {
    erro = `Não consegui ler os alunos do Grupo V (${(e as Error).message}).`;
  }
  const rev = await revisoesDe(alunos.map((a) => a.id));
  const comAmigo = alunos.filter((a) => a.formando && amigoDaCrianca(a.nome));
  const revisao: LinhaRevisao[] = comAmigo
    .filter((a) => rev.get(a.id)?.conferido)
    .map((a) => {
      const am = amigoDaCrianca(a.nome)!, r = rev.get(a.id)!;
      return { alunoId: a.id, aluno: a.nome, turma: a.turma, slug: am.slug, original: am.amigo, novo: r.nomeAmigo, observacao: r.observacao, conferidoPor: r.conferidoPor, conferidoEm: r.conferidoEm, aplicadoNaIlha: r.aplicadoNaIlha };
    })
    .sort((x, y) => Number(x.aplicadoNaIlha) - Number(y.aplicadoNaIlha) || (y.conferidoEm ?? "").localeCompare(x.conferidoEm ?? ""));
  const porAluno = await mensagensDe(alunos.map((a) => a.id), { horas: 8, baixar: true });
  const lista: AlunoAdmin[] = alunos.map((a) => ({
    id: a.id,
    nome: a.nome,
    curto: a.curto,
    turma: a.turma,
    formando: a.formando,
    mensagens: (porAluno.get(a.id) ?? []).map((m) => ({
      id: m.id,
      tipo: m.tipo,
      texto: m.texto,
      url: m.url,
      baixar: m.baixar,
      ext: m.arquivo?.split(".").pop() ?? "",
      duracao: m.duracao,
      criadoEm: m.criadoEm,
    })),
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Diário da formatura do Grupo V</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        O que as professoras registram em cada criança no dia da atividade: as respostas por escrito, as fotos e a voz. Clique no aluno para ver a conversa e baixar as fotos e os áudios.
      </p>
      {erro && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>}
      <div className="mt-6">
        <RevisaoAmigos linhas={revisao} total={comAmigo.length} />
      </div>
      <PainelDiario link="https://www.escolaamadeus.com/amigomagico/diario" alunos={lista} />
    </div>
  );
}
