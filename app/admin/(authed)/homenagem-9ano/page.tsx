import { createAdminClient } from "@/lib/supabase/admin";
import { listarTurma, type AlunoNono } from "@/lib/homenagem-9ano";
import { BUCKET_HOMENAGEM, URL_HOMENAGEM, type StatusParte } from "@/lib/homenagem-9ano-texto";
import { PainelHomenagem, type EnvioAdmin } from "./painel";

/**
 * Homenagem do 9º ano (formatura 2026): quem da turma já mandou, os vídeos de cada família para
 * assistir e aprovar (ou pedir para gravar de novo), as fotos e os links para baixar tudo.
 */
export const metadata = { title: "Homenagem do 9º ano · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function HomenagemAdmin() {
  const db = createAdminClient();
  let turma: AlunoNono[] = [];
  let erro: string | null = null;
  try {
    turma = await listarTurma();
  } catch (e) {
    erro = `Não consegui ler a turma do Activesoft (${(e as Error).message}).`;
  }
  const { data } = await db
    .from("homenagem_9ano_envios")
    .select("id, aluno_id, aluno_nome, quem, parte1, parte2, fotos, status1, status2, observacao1, observacao2, criado_em, atualizado_em")
    .order("criado_em");
  const linhas = data ?? [];

  const caminhos = linhas.flatMap((l) => [l.parte1, l.parte2, ...((l.fotos as string[]) ?? [])]).filter(Boolean) as string[];
  const ver = new Map<string, string>();
  const baixar = new Map<string, string>();
  if (caminhos.length) {
    const [a, b] = await Promise.all([
      db.storage.from(BUCKET_HOMENAGEM).createSignedUrls(caminhos, 60 * 60 * 8),
      db.storage.from(BUCKET_HOMENAGEM).createSignedUrls(caminhos, 60 * 60 * 8, { download: true }),
    ]);
    for (const s of a.data ?? []) if (s.path && s.signedUrl) ver.set(s.path, s.signedUrl);
    for (const s of b.data ?? []) if (s.path && s.signedUrl) baixar.set(s.path, s.signedUrl);
  }
  const arq = (p: string | null) => (p ? { ver: ver.get(p) ?? null, baixar: baixar.get(p) ?? null, ext: p.split(".").pop() ?? "mp4" } : null);

  const envios: EnvioAdmin[] = linhas.map((l) => ({
    id: l.id,
    alunoId: l.aluno_id,
    aluno: l.aluno_nome,
    quem: l.quem,
    parte1: arq(l.parte1),
    parte2: arq(l.parte2),
    status1: l.status1 as StatusParte,
    status2: l.status2 as StatusParte,
    observacao1: l.observacao1,
    observacao2: l.observacao2,
    fotos: ((l.fotos as string[]) ?? []).map((p) => arq(p)!).filter(Boolean),
    quando: l.atualizado_em,
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Homenagem do 9º ano</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        As famílias gravam a mensagem (parte 1) e o poema (parte 2). Assista, aprove ou peça para gravar de novo: o pedido aparece para a família na página dela.
      </p>
      {erro && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>}
      <PainelHomenagem link={URL_HOMENAGEM} turma={turma.map((a) => ({ id: a.id, nome: a.nome }))} envios={envios} />
    </div>
  );
}
