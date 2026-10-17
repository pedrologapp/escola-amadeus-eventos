import { createAdminClient } from "@/lib/supabase/admin";
import { familiasDosTelefones } from "@/lib/whatsapp-auto";
import { AbasRematricula } from "../abas";

/**
 * O que as famílias fizeram no WhatsApp oficial da escola (resposta automática,
 * lib/whatsapp-auto.ts): quem tocou "Quero renovar" e quem perguntou o valor.
 * Cada número aparece com o responsável e os alunos ligados a ele no Activesoft.
 */
export const metadata = { title: "WhatsApp · Rematrícula 2027" };
export const dynamic = "force-dynamic";

type Linha = { telefone: string; evento: string; aluno_nome: string | null; detalhe: string | null; created_at: string };

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const telBonito = (t: string) => {
  const d = t.length === 10 ? t.slice(0, 2) + "9" + t.slice(2) : t;
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : t;
};

const SITUACAO: Record<string, { texto: string; cor: string }> = {
  enviou_carta: { texto: "Recebeu o encarte", cor: "bg-emerald-50 text-emerald-700" },
  pediu_nome: { texto: "Aguardando o nome do aluno", cor: "bg-amber-50 text-amber-700" },
  nome_errado: { texto: "Nome não bateu, aguardando", cor: "bg-amber-50 text-amber-700" },
  secretaria: { texto: "Secretaria precisa responder", cor: "bg-red-50 text-red-700" },
};

export default async function WhatsappRematriculaPage() {
  const { data, error } = await createAdminClient()
    .from("whatsapp_auto")
    .select("telefone, evento, aluno_nome, detalhe, created_at")
    .neq("evento", "ignorado")
    .order("created_at", { ascending: false })
    .limit(2000);
  const linhas = (data ?? []) as Linha[];

  // Por número: o toque mais recente em "Quero renovar" e a situação mais recente da pergunta do valor.
  const renovar = new Map<string, Linha>();
  const valor = new Map<string, Linha>();
  for (const l of linhas) {
    if (l.evento === "quer_renovar") {
      if (!renovar.has(l.telefone)) renovar.set(l.telefone, l);
    } else if (!valor.has(l.telefone)) valor.set(l.telefone, l);
  }
  const telefones = [...new Set([...renovar.keys(), ...valor.keys()])];
  const familias = telefones.length ? await familiasDosTelefones(telefones).catch(() => new Map()) : new Map();
  const pendentesSecretaria = [...valor.values()].filter((l) => l.evento === "secretaria").length;

  const Familia = ({ tel }: { tel: string }) => {
    const f = familias.get(tel);
    return (
      <div>
        <div className="font-semibold text-amadeus-blue">{f?.responsavel ?? "Número sem cadastro"}</div>
        <div className="text-xs text-muted-foreground">{telBonito(tel)}</div>
        {f?.alunos?.length ? <div className="mt-0.5 text-xs">{f.alunos.join(" · ")}</div> : null}
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-amadeus-blue">Rematrícula 2027</h1>
      <AbasRematricula ativa="whatsapp" />
      <p className="mt-4 text-sm text-muted-foreground">
        Respostas da mensagem da rematrícula no WhatsApp oficial da escola. Quem toca <b>Quero renovar</b> recebe na hora o aviso de que a condição já vale e
        que a escola o espera; quem pergunta o valor recebe o encarte de cada filho ligado ao número.
      </p>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Não consegui ler as respostas: {error.message}</p>}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <div className="text-3xl font-extrabold text-amadeus-blue">{renovar.size}</div>
          <div className="text-sm text-muted-foreground">tocaram em Quero renovar</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <div className="text-3xl font-extrabold text-amadeus-blue">{valor.size}</div>
          <div className="text-sm text-muted-foreground">perguntaram o valor</div>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <div className={`text-3xl font-extrabold ${pendentesSecretaria ? "text-red-600" : "text-amadeus-blue"}`}>{pendentesSecretaria}</div>
          <div className="text-sm text-muted-foreground">esperando a secretaria</div>
        </div>
      </div>

      <section className="mt-6 rounded-2xl border border-border/60 bg-white p-5">
        <h2 className="text-lg font-extrabold text-amadeus-blue">Quero renovar</h2>
        {renovar.size ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Família</th><th className="py-2 text-right">Quando</th></tr>
            </thead>
            <tbody>
              {[...renovar.values()].map((l) => (
                <tr key={l.telefone} className="border-t border-border/50 align-top">
                  <td className="py-2.5"><Familia tel={l.telefone} /></td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{quando(l.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Ninguém tocou em Quero renovar ainda.</p>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border/60 bg-white p-5">
        <h2 className="text-lg font-extrabold text-amadeus-blue">Perguntaram o valor</h2>
        {valor.size ? (
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Família</th><th className="py-2">Situação</th><th className="py-2 text-right">Quando</th></tr>
            </thead>
            <tbody>
              {[...valor.values()].map((l) => {
                const s = SITUACAO[l.evento] ?? { texto: l.evento, cor: "bg-muted text-muted-foreground" };
                return (
                  <tr key={l.telefone} className="border-t border-border/50 align-top">
                    <td className="py-2.5"><Familia tel={l.telefone} /></td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${s.cor}`}>{s.texto}</span>
                      {l.aluno_nome && <div className="mt-1 text-xs">{l.aluno_nome}</div>}
                      {l.detalhe && <div className="mt-1 text-xs text-muted-foreground">{l.detalhe}</div>}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-muted-foreground">{quando(l.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Ninguém perguntou o valor ainda.</p>
        )}
      </section>
    </div>
  );
}
