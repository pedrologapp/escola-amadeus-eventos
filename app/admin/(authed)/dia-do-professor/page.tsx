import { createAdminClient } from "@/lib/supabase/admin";
import { chaveDe, listarColaboradores, type Colaborador } from "@/lib/fotos-infancia";
import { PRAZO_DIA_PROFESSOR, URL_DIA_PROFESSOR, VALOR_ACOMPANHANTE, VALOR_COLABORADOR } from "@/lib/dia-professor";

/**
 * Dia dos Professores 2026: quem vai ao West Aquapark, a votação das datas (16 × 29/10),
 * os acompanhantes e quem ainda não respondeu (contra a lista do Activesoft).
 */
export const metadata = { title: "Dia dos Professores · Admin Amadeus" };
export const dynamic = "force-dynamic";

type Linha = { chave: string; nome: string; participa: boolean; data_preferida: string | null; acompanhantes: number; acompanhantes_quem: string | null; atualizado_em: string };
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function DiaDoProfessorAdmin() {
  const { data } = await createAdminClient()
    .from("dia_professor_respostas")
    .select("chave, nome, participa, data_preferida, acompanhantes, acompanhantes_quem, atualizado_em")
    .order("nome");
  const linhas = (data ?? []) as Linha[];
  let colaboradores: Colaborador[] = [];
  try { colaboradores = await listarColaboradores(); } catch { /* sem a lista, mostra só as respostas */ }
  const ja = new Set(linhas.map((l) => l.chave));
  const faltam = colaboradores.filter((c) => !ja.has(chaveDe(c.id, c.nome))).map((c) => c.nome);

  const vao = linhas.filter((l) => l.participa);
  const v16 = vao.filter((l) => l.data_preferida === "16/10").length;
  const v29 = vao.filter((l) => l.data_preferida === "29/10").length;
  const acomp = vao.reduce((s, l) => s + l.acompanhantes, 0);
  const prazo = PRAZO_DIA_PROFESSOR.toLocaleString("pt-BR", { timeZone: "America/Fortaleza", weekday: "long", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  const Num = ({ v, t, destaque = false }: { v: number | string; t: string; destaque?: boolean }) => (
    <div className={`rounded-2xl border p-4 ${destaque ? "border-amadeus-blue bg-amadeus-blue-50" : "bg-white"}`}>
      <p className="text-3xl font-extrabold text-amadeus-blue">{v}</p>
      <p className="text-sm text-muted-foreground">{t}</p>
    </div>
  );

  return (
    <div className="container mx-auto space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-extrabold text-amadeus-blue">Dia dos Professores · West Aquapark</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Link para a equipe: <a href={URL_DIA_PROFESSOR} target="_blank" className="font-semibold text-amadeus-blue underline">{URL_DIA_PROFESSOR.replace("https://", "")}</a> · respostas até {prazo}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Num v={v16} t="votos em 16/10 (sexta)" destaque={v16 > v29} />
        <Num v={v29} t="votos em 29/10 (feriado)" destaque={v29 > v16} />
        <Num v={vao.length} t="colaboradores vão" />
        <Num v={acomp} t="acompanhantes" />
        <Num v={linhas.length - vao.length} t="não vão" />
      </div>
      <p className="text-sm text-muted-foreground">
        Total previsto: {vao.length + acomp} pessoas no ônibus · colaboradores pagam {reais(vao.length * VALOR_COLABORADOR)} · acompanhantes {reais(acomp * VALOR_ACOMPANHANTE)}
      </p>

      <section className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="p-3">Nome</th><th className="p-3">Vai?</th><th className="p-3">Data</th><th className="p-3">Acompanhantes</th><th className="p-3">Respondeu em</th></tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className="border-t">
                <td className="p-3 font-medium">{l.nome}</td>
                <td className="p-3">{l.participa ? "Sim" : "Não"}</td>
                <td className="p-3">{l.data_preferida ?? "–"}</td>
                <td className="p-3">{l.acompanhantes ? `${l.acompanhantes}${l.acompanhantes_quem ? ` · ${l.acompanhantes_quem}` : ""}` : "–"}</td>
                <td className="p-3 text-muted-foreground">{new Date(l.atualizado_em).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
              </tr>
            ))}
            {!linhas.length && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Ninguém respondeu ainda.</td></tr>}
          </tbody>
        </table>
      </section>

      {colaboradores.length > 0 && (
        <section>
          <h2 className="font-bold text-amadeus-blue">Ainda não responderam ({faltam.length} de {colaboradores.length})</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faltam.join(" · ") || "Todos responderam!"}</p>
        </section>
      )}
    </div>
  );
}
