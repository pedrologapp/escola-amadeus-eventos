import {
  MODELOS,
  TAMANHOS,
  TIPOS,
  labelModelo,
  labelTipo,
} from "@/lib/fardamento-config";
import { formatDateTimeBrt } from "@/lib/utils";

export interface RowFardamento {
  id: string;
  nome: string;
  quer: boolean;
  modelo: string | null;
  tamanho: string | null;
  tipo: string | null;
  quantidade: number;
  created_at: string;
}

export function FardamentoDashboard({ rows }: { rows: RowFardamento[] }) {
  const querem = rows.filter((r) => r.quer);
  const naoQuerem = rows.filter((r) => !r.quer);
  const totalPecas = querem.reduce((s, r) => s + (r.quantidade || 1), 0);

  const somaPor = (campo: "tamanho" | "tipo" | "modelo", valor: string) =>
    querem
      .filter((r) => r[campo] === valor)
      .reduce((s, r) => s + (r.quantidade || 1), 0);

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {rows.length} resposta{rows.length === 1 ? "" : "s"} · {querem.length}{" "}
        querem · {naoQuerem.length} não querem ·{" "}
        <strong>{totalPecas} peças no total</strong>
      </p>

      {/* Resumo pra fazer o pedido */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Bloco titulo="Por tamanho">
          {TAMANHOS.map((t) => (
            <Linha key={t} nome={t} valor={somaPor("tamanho", t)} />
          ))}
        </Bloco>
        <Bloco titulo="Por tipo">
          {TIPOS.map((t) => (
            <Linha
              key={t.valor}
              nome={t.label}
              valor={somaPor("tipo", t.valor)}
            />
          ))}
        </Bloco>
        <Bloco titulo="Por modelo">
          {MODELOS.map((m) => (
            <Linha
              key={m.valor}
              nome={m.label}
              valor={somaPor("modelo", m.valor)}
            />
          ))}
        </Bloco>
      </div>

      {/* Lista completa */}
      <h2 className="mb-3 mt-8 text-lg font-extrabold">Lista completa</h2>
      {rows.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-white py-12 text-sm text-muted-foreground">
          Nenhuma resposta ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/70 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 font-semibold">Nome</th>
                <th className="px-3 py-2 font-semibold">Quer?</th>
                <th className="px-3 py-2 font-semibold">Modelo</th>
                <th className="px-3 py-2 font-semibold">Tam.</th>
                <th className="px-3 py-2 font-semibold">Tipo</th>
                <th className="px-3 py-2 font-semibold">Qtd</th>
                <th className="px-3 py-2 font-semibold">Data</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-medium">{r.nome}</td>
                  <td className="px-3 py-2">
                    {r.quer ? (
                      <span className="font-semibold text-green-700">Sim</span>
                    ) : (
                      <span className="text-muted-foreground">Não</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {r.quer ? labelModelo(r.modelo) : "—"}
                  </td>
                  <td className="px-3 py-2">{r.quer ? r.tamanho : "—"}</td>
                  <td className="px-3 py-2">
                    {r.quer ? labelTipo(r.tipo) : "—"}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {r.quer ? r.quantidade : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {formatDateTimeBrt(r.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Bloco({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Linha({ nome, valor }: { nome: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span>{nome}</span>
      <span className="font-bold tabular-nums text-amadeus-blue">{valor}</span>
    </div>
  );
}
