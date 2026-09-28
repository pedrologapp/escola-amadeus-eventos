import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_FOTOS, URL_FOTOS, chaveDe, listarColaboradores, type Colaborador } from "@/lib/fotos-infancia";
import { PainelFotos, type FotoEnviada } from "./painel";

/**
 * Fotos de infância da equipe: quem já mandou (com a foto) e quem falta,
 * contra a lista de colaboradores ativos do Activesoft.
 */
export const metadata = { title: "Fotos de infância · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function FotosInfanciaAdmin() {
  const db = createAdminClient();
  let colaboradores: Colaborador[] = [];
  let erro: string | null = null;
  try {
    colaboradores = await listarColaboradores();
  } catch (e) {
    erro = `Não consegui ler a lista de colaboradores do Activesoft (${(e as Error).message}).`;
  }
  const { data } = await db.from("fotos_infancia").select("chave, colaborador_id, nome, arquivo, idade, atualizado_em").order("atualizado_em", { ascending: false });
  const linhas = data ?? [];
  const assinadas = linhas.length
    ? (await db.storage.from(BUCKET_FOTOS).createSignedUrls(linhas.map((l) => l.arquivo), 60 * 60 * 8)).data ?? []
    : [];
  const url = new Map(assinadas.map((s) => [s.path, s.signedUrl]));
  const enviadas: FotoEnviada[] = linhas.map((l) => ({
    chave: l.chave,
    nome: l.nome,
    idade: l.idade,
    quando: l.atualizado_em,
    url: url.get(l.arquivo) ?? null,
    naLista: l.colaborador_id !== null,
  }));
  const ja = new Set(linhas.map((l) => l.chave));
  const faltam = colaboradores.filter((c) => !ja.has(chaveDe(c.id, c.nome))).map((c) => c.nome);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Fotos de infância</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Cada colaborador procura o nome e envia uma foto de quando era criança. Aqui aparece quem já mandou e quem falta.
      </p>
      {erro && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{erro}</p>}
      <PainelFotos link={URL_FOTOS} enviadas={enviadas} faltam={faltam} total={colaboradores.length} />
    </div>
  );
}
