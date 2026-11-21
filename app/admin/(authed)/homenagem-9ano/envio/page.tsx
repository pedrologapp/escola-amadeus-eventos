import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { chaveCelular, listarContatosNono, respostasNono, TEXTO_CONVITE_9ANO, type AlunoContatos, type RespostaPai } from "@/lib/homenagem-9ano-envio";
import { createAdminClient } from "@/lib/supabase/admin";
import { ListaEnvio } from "./lista";

/**
 * Convite da homenagem surpresa do 9º ano: o Pedro manda pelo WhatsApp dele, um responsável por vez
 * (o botão abre a conversa com o texto já escrito). O sistema não envia nada.
 */
export const metadata = { title: "Convite do 9º ano · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function EnvioConvite9Ano() {
  let alunos: AlunoContatos[] = [];
  let erro: string | null = null;
  let porChave: Record<string, RespostaPai> = {};
  let gravaram: number[] = [];
  try {
    const [a, p, g] = await Promise.all([
      listarContatosNono(),
      respostasNono().catch(() => ({})),
      createAdminClient().from("homenagem_9ano_envios").select("aluno_id, parte1, parte2"),
    ]);
    alunos = a;
    porChave = p;
    gravaram = (g.data ?? []).filter((x) => x.parte1 || x.parte2).map((x) => Number(x.aluno_id));
  } catch (e) {
    erro = `Não consegui ler a turma do Activesoft (${(e as Error).message}). Recarregue a página em instantes.`;
  }
  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/homenagem-9ano" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-amadeus-blue">
        <ArrowLeft className="size-4" /> Homenagem do 9º ano
      </Link>
      <h1 className="mt-2 text-2xl font-extrabold text-amadeus-blue">Convite da homenagem surpresa: envio pelo seu WhatsApp</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Quinta, 26/11, às 10h. Cada botão abre a conversa com o texto pronto; você confere e aperta enviar. Nada sai daqui sozinho.
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Envie pelo WhatsApp <b>comercial da escola</b> (no celular, escolha WhatsApp Business): as respostas dos pais aparecem aqui, ao lado de cada nome, em até 5 minutos. Recarregue a página para atualizar.
      </p>
      {erro ? (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{erro}</p>
      ) : (
        <ListaEnvio
          alunos={alunos}
          texto={TEXTO_CONVITE_9ANO}
          imagem="/homenagem-9ano/convite-surpresa.png"
          gravaram={gravaram}
          respostas={Object.fromEntries(
            alunos.flatMap((a) => a.contatos).flatMap((c) => (c.celular && porChave[chaveCelular(c.celular)] ? [[c.celular, porChave[chaveCelular(c.celular)]]] : [])),
          )}
        />
      )}
    </div>
  );
}
