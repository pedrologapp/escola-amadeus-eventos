import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { FRENTES, INTELIGENCIAS, URL_CULMINANCIA, ehChave, type Frente } from "@/lib/culminancia";
import { LinkProfessoras } from "./link-professoras";

/**
 * Projeto de culminância do Arboria: um cartão por série (Maternal II ao 5º ano,
 * cada uma com a sua inteligência) e por casa (6º ao 9º ano). Em cada um ficam as
 * ideias da professora, as imagens dela e as nossas versões para aprovar.
 */
export const metadata = { title: "Projeto de culminância · Admin Amadeus" };
export const dynamic = "force-dynamic";

const SEGMENTOS: { nome: Frente["segmento"]; nota: string }[] = [
  { nome: "Educação Infantil", nota: "Uma inteligência por série" },
  { nome: "Fundamental I", nota: "Uma inteligência por série" },
  { nome: "Fundamental II", nota: "As 8 casas" },
];

export default async function CulminanciaAdmin() {
  const db = createAdminClient();
  const [{ data: frentes }, { data: imagens }] = await Promise.all([
    db.from("culminancia_frentes").select("chave, inteligencia, professora, enviado_em"),
    db.from("culminancia_imagens").select("frente, tipo, status"),
  ]);
  const dados = new Map((frentes ?? []).map((f) => [f.chave, f]));
  const conta = (chave: string) => {
    const l = (imagens ?? []).filter((i) => i.frente === chave);
    return {
      ref: l.filter((i) => i.tipo === "referencia").length,
      prop: l.filter((i) => i.tipo === "proposta").length,
      ok: l.filter((i) => i.tipo === "proposta" && i.status === "aprovada").length,
      ajustar: l.filter((i) => i.tipo === "proposta" && i.status === "ajustar").length,
    };
  };
  const total = FRENTES.length, aprovadas = FRENTES.filter((f) => conta(f.chave).ok > 0).length;
  const faltam = FRENTES.filter((f) => !dados.get(f.chave)?.enviado_em).map((f) => f.titulo);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Projeto de culminância</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Os painéis do Arboria para as paredes. Em cada série ou casa, coloque as ideias e as imagens que a professora trouxe;
        as nossas versões aparecem ao lado para aprovar ou pedir ajuste.
      </p>
      <p className="mt-3 text-sm font-semibold text-foreground">
        {total - faltam.length} de {total} professoras enviaram · {aprovadas} de {total} com painel aprovado
      </p>
      <LinkProfessoras link={URL_CULMINANCIA} faltam={faltam} />

      {SEGMENTOS.map((s) => (
        <section key={s.nome} className="mt-8">
          <div className="flex items-baseline gap-3">
            <h2 className="text-lg font-bold">{s.nome}</h2>
            <span className="text-xs text-muted-foreground">{s.nota}</span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FRENTES.filter((f) => f.segmento === s.nome).map((f) => {
              const d = dados.get(f.chave), c = conta(f.chave);
              const k = f.casa ?? (ehChave(d?.inteligencia) ? d.inteligencia : null);
              const intel = k ? INTELIGENCIAS[k] : null;
              const situacao = c.ok ? "Aprovado" : c.ajustar ? "Ajustar" : c.prop ? "Para aprovar" : d?.enviado_em ? "Professora enviou" : "Falta a professora";
              const corSituacao = c.ok ? "bg-emerald-50 text-emerald-700" : c.ajustar ? "bg-amber-50 text-amber-800" : c.prop ? "bg-blue-50 text-blue-700" : d?.enviado_em ? "bg-slate-100 text-slate-700" : "bg-rose-50 text-rose-700";
              return (
                <Link key={f.chave} href={`/admin/culminancia/${f.chave}`}
                  className="group relative overflow-hidden rounded-2xl border border-border/60 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: intel?.cor ?? "#cbd5e1" }} />
                  <span className={`absolute right-4 top-4 rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold ${corSituacao}`}>{situacao}</span>
                  <p className="text-base font-bold">{f.titulo}</p>
                  <p className="mt-0.5 text-sm" style={{ color: intel?.cor ?? undefined }}>
                    {intel ? (f.casa ? `Inteligência ${intel.nome}` : intel.nome) : <span className="text-muted-foreground">Inteligência a definir</span>}
                  </p>
                  {d?.professora && <p className="mt-2 text-xs text-muted-foreground">Prof.ª {d.professora}</p>}
                  <p className="mt-3 text-xs text-muted-foreground">
                    {c.ref} {c.ref === 1 ? "imagem da professora" : "imagens da professora"} · {c.prop} {c.prop === 1 ? "proposta" : "propostas"}
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
