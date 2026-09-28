import Link from "next/link";
import { after } from "next/server";
import { Lock } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/utils";
import { valoresLiberados } from "@/lib/valores-auth";
import { conferirSeAntigo, ultimaConferencia } from "@/lib/asaas-conferencia";
import { BotaoMostrarValores } from "@/components/admin/valores-sensiveis";
import { AbasCobrancas } from "../abas";
import { ConferirAsaasButton } from "../conferir-asaas-button";

/**
 * Tudo que entrou no Asaas, inclusive o que foi criado FORA do sistema (livros
 * parcelados do fluxo antigo "EduHub - Amadeus - Financeiro"), para bater com
 * o extrato. "Na conta" = RECEIVED; "a cair" = cartão já confirmado cujas
 * parcelas caem mês a mês. Dados vêm de lib/asaas-conferencia (só leitura do Asaas).
 */
export const metadata = { title: "Recebimentos Asaas · Admin Amadeus" };
export const dynamic = "force-dynamic";

interface Linha {
  id: string;
  valor: number;
  recebido_em: string | null;
  previsto_em: string | null;
  forma: string | null;
  descricao: string | null;
  origem: string;
  categoria: string;
}

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const FORMA: Record<string, string> = { PIX: "PIX", CREDIT_CARD: "Cartão", BOLETO: "Boleto", UNDEFINED: "—" };
const ORIGEM: Record<string, string> = { evento: "Sistema", avulsa: "Sistema", externo: "Fora do sistema" };

function mesesAte(fim: string, n: number) {
  const [a, m] = fim.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(a, m - 1 - (n - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export default async function RecebimentosAsaasPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  after(conferirSeAntigo);
  const liberado = await valoresLiberados();
  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Fortaleza" }).slice(0, 7);
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? (mesParam as string) : hoje;
  const ultima = await ultimaConferencia();
  const quando = ultima
    ? new Date(ultima.em).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  const cabecalho = (
    <>
      <AbasCobrancas atual="asaas" />
      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-amadeus-blue sm:text-4xl">Recebimentos Asaas</h1>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            Tudo que entrou no Asaas, inclusive o que foi criado fora deste sistema (livros parcelados, outros). Só leitura: nada aqui altera o Asaas ou envia mensagem.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {quando ? `Última conferência: ${quando}. Confere sozinho a cada 12 horas.` : "Ainda não conferido."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BotaoMostrarValores />
          <ConferirAsaasButton />
        </div>
      </header>
    </>
  );

  if (!liberado) {
    return (
      <div className="container mx-auto px-4 py-10">
        {cabecalho}
        <div className="mt-8 rounded-2xl border border-border/60 bg-white p-10 text-center text-muted-foreground">
          <Lock className="mx-auto size-8 opacity-50" />
          <p className="mt-3">Os valores estão ocultos. Clique em “Mostrar valores” e digite a senha.</p>
        </div>
      </div>
    );
  }

  const db = createAdminClient();
  const meses = mesesAte(mes, 6);
  const inicio = `${meses[0]}-01`;
  const [{ data: entrou }, { data: aCair }] = await Promise.all([
    db.from("asaas_recebimentos").select("id, valor, recebido_em, previsto_em, forma, descricao, origem, categoria").gte("recebido_em", inicio).order("recebido_em", { ascending: false }).limit(5000),
    db.from("asaas_recebimentos").select("valor, previsto_em").not("previsto_em", "is", null).limit(5000),
  ]);
  const linhas = (entrou ?? []).map((l) => ({ ...l, valor: Number(l.valor) })) as Linha[];
  const doMes = linhas.filter((l) => l.recebido_em?.startsWith(mes));
  const soma = (l: { valor: number | string }[]) => l.reduce((s, x) => s + Number(x.valor), 0);
  const totalMes = soma(doMes);
  const sistemaMes = soma(doMes.filter((l) => l.origem !== "externo"));
  const aCairMes = soma((aCair ?? []).filter((l) => (l.previsto_em as string).startsWith(mes)));
  const aCairTotal = soma(aCair ?? []);

  // Matriz categoria x mês (o que entrou na conta).
  const categorias = [...new Set(linhas.map((l) => l.categoria))];
  const celula = (cat: string, m: string) => soma(linhas.filter((l) => l.categoria === cat && l.recebido_em?.startsWith(m)));
  categorias.sort((a, b) => meses.reduce((s, m) => s + celula(b, m), 0) - meses.reduce((s, m) => s + celula(a, m), 0));

  const cartao = (rotulo: string, valor: number, detalhe: string, cor = "text-amadeus-blue") => (
    <div className="rounded-2xl border border-border/60 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className={`mt-1 text-2xl font-extrabold tabular-nums ${cor}`}>{formatCurrency(valor)}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detalhe}</p>
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-10">
      {cabecalho}

      <div className="mt-6 flex flex-wrap gap-1.5">
        {mesesAte(hoje, 9).reverse().map((m) => (
          <Link key={m} href={`/admin/cobrancas/asaas?mes=${m}`} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${m === mes ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}>
            {rotuloMes(m)}
          </Link>
        ))}
      </div>

      <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cartao(`Entrou na conta · ${rotuloMes(mes)}`, totalMes, `${doMes.length} pagamentos`)}
        {cartao("Pelo sistema", sistemaMes, "eventos e cobranças avulsas")}
        {cartao("Criado fora do sistema", totalMes - sistemaMes, "livros parcelados, outros (EduHub)", "text-sky-800")}
        {cartao(`Cartão a cair · ${rotuloMes(mes)}`, aCairMes, `${formatCurrency(aCairTotal)} a cair no total, nos próximos meses`, "text-emerald-700")}
      </section>

      <section className="mt-8 overflow-x-auto rounded-2xl border border-border/60 bg-white">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3">Entrou na conta por tipo</th>
              {meses.map((m) => (
                <th key={m} className={`px-3 py-3 text-right ${m === mes ? "text-amadeus-blue" : ""}`}>{rotuloMes(m)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categorias.map((c) => (
              <tr key={c} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-2.5 font-semibold">{c}</td>
                {meses.map((m) => {
                  const v = celula(c, m);
                  return <td key={m} className={`px-3 py-2.5 text-right tabular-nums ${v ? "" : "text-muted-foreground/50"} ${m === mes ? "font-semibold" : ""}`}>{v ? formatCurrency(v) : "—"}</td>;
                })}
              </tr>
            ))}
            <tr className="bg-muted/40 font-bold">
              <td className="px-4 py-2.5">Total</td>
              {meses.map((m) => (
                <td key={m} className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(soma(linhas.filter((l) => l.recebido_em?.startsWith(m))))}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-8">
        <p className="font-bold text-amadeus-blue">Pagamentos que entraram em {rotuloMes(mes)} ({doMes.length})</p>
        <div className="mt-3 overflow-x-auto rounded-2xl border border-border/60 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Descrição no Asaas</th>
                <th className="px-4 py-3">Forma</th>
                <th className="px-4 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              {doMes.slice(0, 400).map((l) => (
                <tr key={l.id} className="border-b border-border/60 last:border-0">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{l.recebido_em?.split("-").reverse().join("/")}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {l.categoria}
                    <span className={`ml-1.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${l.origem === "externo" ? "bg-sky-50 text-sky-800" : "bg-emerald-50 text-emerald-800"}`}>{ORIGEM[l.origem]}</span>
                  </td>
                  <td className="max-w-[380px] truncate px-4 py-2" title={l.descricao ?? ""}>{l.descricao ?? "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">{FORMA[l.forma ?? ""] ?? l.forma}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right font-semibold tabular-nums">{formatCurrency(l.valor)}</td>
                </tr>
              ))}
              {doMes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">Nada entrou neste mês.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Soma as duas contas do Asaas: a atual (desde 08/09/2026) e a antiga (bloqueada, onde ainda caem parcelas de livros e cartões antigos). Valores brutos (antes da taxa do Asaas). Cartão parcelado: o Asaas confirma todas as parcelas na hora e cada uma entra na conta no seu mês; as que ainda vão cair aparecem em “Cartão a cair”.
        </p>
      </section>
    </div>
  );
}
