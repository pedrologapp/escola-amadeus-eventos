import { AlertTriangle, CalendarX, ClipboardList } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  lerFoto,
  faltasNaUltimaChamada,
  faltasConsecutivas,
  type Consecutiva,
} from "@/lib/dashboard/frequencia";

/** Enquanto está em desenvolvimento, os dados vêm do arquivo local da fotografia. */
export const dynamic = "force-dynamic";

export default async function CoordenacaoPage() {
  const foto = lerFoto();

  if (!foto) {
    return (
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-extrabold text-amadeus-blue">Coordenação</h1>
        <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
          Nenhuma fotografia de frequência encontrada. Rode{" "}
          <code className="rounded bg-white px-1 py-0.5">
            node activeesoft/snapshot-frequencia.mjs
          </code>
        </p>
      </div>
    );
  }

  const { ausencias, cobertura } = faltasNaUltimaChamada(foto);
  const consecutivas = faltasConsecutivas(foto, 2);

  const turmasCompletas = cobertura.filter((c) => c.lancados === c.total).length;
  const lancados = cobertura.reduce((s, c) => s + c.lancados, 0);
  const totais = cobertura.reduce((s, c) => s + c.total, 0);

  // Um aluno pode aparecer em várias disciplinas. Fica a pior sequência dele,
  // senão o mesmo nome inflaria a contagem cinco vezes.
  const pior = new Map<string, Consecutiva>();
  for (const c of consecutivas) {
    const atual = pior.get(c.matricula);
    if (!atual || atual.seguidas < c.seguidas) pior.set(c.matricula, c);
  }
  const criticos = [...pior.values()].filter((c) => c.seguidas >= 3);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-amadeus-blue">Coordenação</h1>
        <p className="text-xs text-muted-foreground">
          Fotografia de {new Date(foto.tirada_em).toLocaleString("pt-BR")}
        </p>
      </div>

      {/* A cobertura vem ANTES dos números, de propósito: sem ela, "3 faltas"
          é lido como dia tranquilo quando dois terços da escola não foi medida. */}
      <div className="mb-6 rounded-2xl border border-border/60 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="font-semibold text-amadeus-blue">
            <ClipboardList className="mr-1 inline size-4" />
            Cobertura da chamada
          </span>
          <span>
            <strong>{lancados}</strong> de {totais} diários com aula lançada
          </span>
          <span>
            <strong>{turmasCompletas}</strong> de {cobertura.length} turmas completas
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Diário não lançado não é presença. Os números abaixo cobrem só o que já foi
          lançado.
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Resumo
          icone={<CalendarX className="size-5" />}
          label="Faltaram na última chamada"
          valor={ausencias.length}
          alerta={ausencias.length > 0}
        />
        <Resumo
          icone={<AlertTriangle className="size-5" />}
          label="Com 2+ faltas seguidas"
          valor={pior.size}
          alerta={pior.size > 0}
        />
        <Resumo
          icone={<AlertTriangle className="size-5" />}
          label="Com 3+ faltas seguidas"
          valor={criticos.length}
          alerta={criticos.length > 0}
        />
      </div>

      <Secao
        titulo="Faltas consecutivas"
        sub="O alerta precoce de evasão — taxa de presença esconde isso. Falta justificada interrompe a contagem."
      >
        {pior.size === 0 ? (
          <Vazio texto="Ninguém com faltas seguidas." />
        ) : (
          <Tabela
            cabecalho={["Aluno", "Turma", "Onde", "Seguidas"]}
            linhas={[...pior.values()]
              .sort((a, b) => b.seguidas - a.seguidas || a.nome.localeCompare(b.nome, "pt-BR"))
              .slice(0, 40)
              .map((c) => [
                c.nome,
                c.turma,
                c.porDia ? "dias letivos" : c.disciplina,
                String(c.seguidas),
              ])}
            destacar={(l) => Number(l[3]) >= 3}
          />
        )}
      </Secao>

      <Secao
        titulo="Faltaram na última chamada lançada"
        sub="No Infantil e Fundamental I a chamada é do dia inteiro; no Fundamental II, por disciplina."
      >
        {ausencias.length === 0 ? (
          <Vazio texto="Ninguém faltou nas chamadas já lançadas." />
        ) : (
          <Tabela
            cabecalho={["Aluno", "Turma", "Onde"]}
            linhas={ausencias
              .sort(
                (a, b) =>
                  a.turma.localeCompare(b.turma, "pt-BR") ||
                  a.nome.localeCompare(b.nome, "pt-BR"),
              )
              .map((a) => [
                a.nome + (a.justificada ? " (justificada)" : ""),
                a.turma,
                a.disciplinas.length ? a.disciplinas.join(", ") : "dia inteiro",
              ])}
          />
        )}
      </Secao>

      <Secao titulo="Cobertura por turma" sub="Turmas com diário pendente aparecem primeiro.">
        <Tabela
          cabecalho={["Turma", "Modelo", "Lançados"]}
          linhas={cobertura
            .sort((a, b) => a.lancados / a.total - b.lancados / b.total)
            .map((c) => [
              c.turma,
              c.porDia ? "dia inteiro" : "por disciplina",
              `${c.lancados} / ${c.total}`,
            ])}
          destacar={(l) => {
            const [a, b] = l[2].split(" / ").map(Number);
            return a < b;
          }}
        />
      </Secao>
    </div>
  );
}

function Resumo({
  icone,
  label,
  valor,
  alerta,
}: {
  icone: React.ReactNode;
  label: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 px-4 py-4">
        <div className={alerta ? "text-amadeus-yellow-dark" : "text-amadeus-blue"}>
          {icone}
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p
            className={`text-2xl font-extrabold ${
              alerta ? "text-amadeus-yellow-dark" : "text-amadeus-blue"
            }`}
          >
            {valor}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Secao({
  titulo,
  sub,
  children,
}: {
  titulo: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold text-amadeus-blue">{titulo}</h2>
      {sub && <p className="mb-2 text-xs text-muted-foreground">{sub}</p>}
      {children}
    </section>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <p className="rounded-2xl border border-border/60 bg-white px-4 py-6 text-sm text-muted-foreground">
      {texto}
    </p>
  );
}

function Tabela({
  cabecalho,
  linhas,
  destacar,
}: {
  cabecalho: string[];
  linhas: string[][];
  destacar?: (l: string[]) => boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border/60 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border/60 text-left">
            {cabecalho.map((c) => (
              <th
                key={c}
                className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr
              key={i}
              className={`border-b border-border/30 last:border-0 ${
                destacar?.(l) ? "bg-amber-50" : ""
              }`}
            >
              {l.map((c, j) => (
                <td key={j} className={`px-4 py-2 ${j === 0 ? "font-medium" : ""}`}>
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
