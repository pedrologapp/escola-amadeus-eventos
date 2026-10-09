import { createAdminClient } from "@/lib/supabase/admin";
import { universoDaSerie, UNIVERSOS } from "@/lib/arboria-historia";
import { Painel } from "./painel";

/**
 * Experiência Amadeus (10/10/2026) · a história do Arboria de cada criança.
 * O QR da sala (/arboria/qr) leva o pai ao cadastro (/arboria). Aqui: "Começar reunião"
 * marca a hora; "Liberar histórias" abre a história nos celulares de quem se cadastrou depois.
 */
export const metadata = { title: "História do Arboria · Admin Amadeus" };
export const dynamic = "force-dynamic";

export default async function ArboriaExperienciaPage() {
  const db = createAdminClient();
  const [{ data: r }, { data: cs }] = await Promise.all([
    db.from("arboria_exp_reuniao").select("iniciada_em, liberada_em").eq("id", 1).single(),
    db.from("arboria_exp_criancas").select("id, responsavel, nome, serie, genero, pele, cabelo, foto_path, criado_em").order("criado_em", { ascending: false }),
  ]);
  const inicio = r?.iniciada_em ? Date.parse(r.iniciada_em) : null;
  const criancas = (cs ?? []).map((c) => ({
    ...c,
    universo: UNIVERSOS[universoDaSerie(c.serie)].titulo,
    valida: inicio !== null && Date.parse(c.criado_em) >= inicio,
    foto: !!c.foto_path,
  }));
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">História do Arboria</h1>
      <p className="mt-1 text-sm text-muted-foreground">Experiência Amadeus · sábado, 10/10. Cada pai cadastra o filho pelo QR e, no fim, a história aparece no celular.</p>
      <Painel iniciada={r?.iniciada_em ?? null} liberada={r?.liberada_em ?? null} criancas={criancas} />
    </div>
  );
}
