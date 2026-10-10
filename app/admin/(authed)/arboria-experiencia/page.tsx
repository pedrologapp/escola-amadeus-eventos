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

// as apresentações do dia (10/10); abrem em tela cheia numa aba nova
const APRESENTACOES = [
  { titulo: "Educação Infantil", quem: "Gislene", href: "https://eventos.escolaamadeus.com/experiencia-geekie-ef881fab/infantil.html", leitura: "https://eventos.escolaamadeus.com/experiencia-geekie-ef881fab/leitura-infantil.html", cor: "#F59E0B" },
  { titulo: "Fundamental 1 e 2", quem: "Adriana", href: "https://eventos.escolaamadeus.com/experiencia-geekie-ef881fab/fundamental.html", leitura: "https://eventos.escolaamadeus.com/experiencia-geekie-ef881fab/leitura-fundamental.html", cor: "#3B82F6" },
  { titulo: "Arboria", quem: "Pedro · telão com a apresentação, a atividade e as séries", href: "/admin/arboria-experiencia/telao", leitura: null, cor: "#2dd4bf" },
  { titulo: "Financeiro", quem: "30 anos, Manifesto, programas e valores de 2027", href: "https://eventos.escolaamadeus.com/experiencia-geekie-ef881fab/financeiro.html", leitura: null, cor: "#FFC21A" },
];

export default async function ArboriaExperienciaPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const aba = (await searchParams).aba === "apresentacoes" ? "apresentacoes" : "historia";
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
      <nav className="mt-4 flex gap-1 border-b">
        {[["historia", "História do Arboria"], ["apresentacoes", "Apresentações de hoje"]].map(([k, t]) => (
          <a key={k} href={k === "historia" ? "/admin/arboria-experiencia" : "/admin/arboria-experiencia?aba=apresentacoes"}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold ${aba === k ? "border-amadeus-blue text-amadeus-blue" : "border-transparent text-muted-foreground hover:text-amadeus-blue"}`}>{t}</a>
        ))}
      </nav>
      {aba === "historia" ? (
        <>
          <a href="/admin/arboria-experiencia/telao" target="_blank" className="mt-4 inline-block rounded-full bg-[#0b1112] px-4 py-2 text-sm font-bold text-[#2dd4bf]">Abrir o telão da sala ↗</a>
          <Painel iniciada={r?.iniciada_em ?? null} liberada={r?.liberada_em ?? null} criancas={criancas} />
        </>
      ) : (
        <div className="mt-5">
          <p className="text-sm text-muted-foreground">Abra na TV e aperte <b>F</b> para tela cheia. <b>→</b> avança, <b>←</b> volta.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {APRESENTACOES.map((a) => (
              <div key={a.titulo} className="flex flex-col rounded-2xl border bg-white p-5 shadow-sm" style={{ borderTop: `6px solid ${a.cor}` }}>
                <p className="mt-1 text-xl font-extrabold text-amadeus-blue">{a.titulo}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.quem}</p>
                {a.href.startsWith("https://") && <p className="mt-2 select-all break-all rounded-lg bg-muted px-2 py-1 font-mono text-xs text-amadeus-blue">{a.href.replace("https://", "")}</p>}
                <div className="mt-4 flex flex-wrap gap-2">
                  <a href={a.href} target="_blank" className="rounded-full bg-amadeus-blue px-4 py-2 text-sm font-bold text-white">Abrir ↗</a>
                  {a.leitura && <a href={a.leitura} target="_blank" className="rounded-full border px-4 py-2 text-sm font-semibold text-amadeus-blue">Versão para ler ↗</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
