import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { AbasRematricula } from "../../abas";

/**
 * Experiência Amadeus · contatos das edições passadas (10/10, 17/10 e 24/10), guardados em
 * experiencia_contatos_2410 quando a lista principal recomeçou limpa para 07/11 (Pedro, 24/10). Só leitura.
 */
export const metadata = { title: "Edições passadas · Experiência Amadeus · Admin Amadeus" };
export const dynamic = "force-dynamic";

const ORIGEM: Record<string, string> = { site: "Site", whatsapp: "WhatsApp da escola", novato: "Rematrícula (novato)", avulso: "Avulso" };
const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }) : "");
const telLegivel = (t: string) => (t.length >= 10 ? `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}` : t);

type Linha = {
  telefone: string; responsavel: string | null; crianca: string | null; serie: string | null; origem: string | null;
  criado_em: string; vai_em: string | null; pessoas: number | null; nao_vai_em: string | null; resposta_2410: string | null;
  veio_1010: boolean | null; matriculou_em: string | null; observacao: string | null;
};

function situacao(c: Linha) {
  if (c.matriculou_em) return "Matriculou";
  if (c.veio_1010) return "Veio em 10/10";
  if (c.resposta_2410 === "vai" || c.vai_em) return `Confirmou${c.pessoas ? ` · ${c.pessoas} pessoas` : ""}`;
  if (c.resposta_2410 === "nao_vai" || c.nao_vai_em) return "Disse que não ia";
  return "";
}

export default async function ArquivoPage() {
  const { data } = await createAdminClient()
    .from("experiencia_contatos_2410")
    .select("telefone, responsavel, crianca, serie, origem, criado_em, vai_em, pessoas, nao_vai_em, resposta_2410, veio_1010, matriculou_em, observacao")
    .order("criado_em", { ascending: false });
  const linhas = (data ?? []) as Linha[];
  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="experiencia" />
      <p className="mt-4 text-sm text-muted-foreground">
        <Link href="/admin/rematricula-2027/experiencia" className="font-semibold text-amadeus-blue hover:underline">← Experiência Amadeus (07/11)</Link>
        {" · "}Contatos das edições passadas (<b>10/10, 17/10 e 24/10</b>): <b>{linhas.length}</b> famílias. Ficam guardados aqui só para consulta; a lista de 07/11 começou limpa.
      </p>
      <div className="mt-4 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-3 py-2">Responsável</th><th className="px-3 py-2">WhatsApp</th><th className="px-3 py-2">Criança · série</th><th className="px-3 py-2">Origem</th><th className="px-3 py-2">Entrou</th><th className="px-3 py-2">Situação</th><th className="px-3 py-2">Observação</th></tr>
          </thead>
          <tbody>
            {linhas.map((c) => (
              <tr key={c.telefone} className="border-t">
                <td className="px-3 py-2 font-medium">{c.responsavel || "—"}</td>
                <td className="whitespace-nowrap px-3 py-2">{telLegivel(c.telefone)}</td>
                <td className="px-3 py-2">{[c.crianca, c.serie].filter(Boolean).join(" · ")}</td>
                <td className="px-3 py-2">{ORIGEM[c.origem ?? ""] ?? c.origem}</td>
                <td className="px-3 py-2">{dataCurta(c.criado_em)}</td>
                <td className="px-3 py-2">{situacao(c)}</td>
                <td className="px-3 py-2 text-muted-foreground">{c.observacao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
