import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET_CULMINANCIA, frentePorChave, limparOutdoors } from "@/lib/culminancia";
import { PainelFrente, type Imagem } from "./painel";

export const metadata = { title: "Projeto de culminância · Admin Amadeus" };
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ chave: string }>;
}

export default async function FrenteCulminancia({ params }: PageProps) {
  const { chave } = await params;
  const frente = frentePorChave(chave);
  if (!frente) notFound();
  const db = createAdminClient();
  const [{ data: dados }, { data: linhas }] = await Promise.all([
    db.from("culminancia_frentes").select("inteligencia, professora, ideia_sala, ideia_outdoor, outdoors, enviado_em, anotacoes").eq("chave", chave).maybeSingle(),
    db.from("culminancia_imagens").select("id, tipo, arquivo, legenda, status, comentario, criado_em").eq("frente", chave).order("criado_em"),
  ]);
  const lista = linhas ?? [];
  const assinadas = lista.length
    ? (await db.storage.from(BUCKET_CULMINANCIA).createSignedUrls(lista.map((l) => l.arquivo), 60 * 60 * 8)).data ?? []
    : [];
  const url = new Map(assinadas.map((s) => [s.path, s.signedUrl]));
  const imagens: Imagem[] = lista.map((l) => ({
    id: l.id, tipo: l.tipo, legenda: l.legenda, status: l.status, comentario: l.comentario, quando: l.criado_em, url: url.get(l.arquivo) ?? null,
  }));

  return (
    <div className="container mx-auto px-4 py-6">
      <Link href="/admin/culminancia" className="text-sm text-muted-foreground hover:text-foreground">‹ Projeto de culminância</Link>
      <PainelFrente
        frente={frente}
        inicial={{
          inteligencia: frente.casa ?? dados?.inteligencia ?? null, professora: dados?.professora ?? "", ideia_sala: dados?.ideia_sala ?? "",
          ideia_outdoor: dados?.ideia_outdoor ?? "", outdoors: limparOutdoors(dados?.outdoors), anotacoes: dados?.anotacoes ?? "", enviado_em: dados?.enviado_em ?? null,
        }}
        imagens={imagens}
      />
    </div>
  );
}
