"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MODELOS,
  TAMANHOS,
  TIPOS,
  labelModelo,
  labelTipo,
} from "@/lib/fardamento-config";
import { formatDateTimeBrt } from "@/lib/utils";
import {
  atualizarFardamento,
  excluirFardamento,
} from "@/app/fardamento/gerenciar-actions";

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
  const router = useRouter();
  const [editando, setEditando] = useState<RowFardamento | null>(null);

  const querem = rows.filter((r) => r.quer);
  const naoQuerem = rows.filter((r) => !r.quer);
  const totalPecas = querem.reduce((s, r) => s + (r.quantidade || 1), 0);

  const tamanhosComDados = TAMANHOS.filter((t) =>
    querem.some((r) => r.tamanho === t),
  );
  function combosDoTamanho(t: string) {
    const map = new Map<string, number>();
    for (const r of querem) {
      if (r.tamanho !== t) continue;
      const key = `${r.tipo}|${r.modelo}`;
      map.set(key, (map.get(key) || 0) + (r.quantidade || 1));
    }
    return [...map.entries()].map(([k, qtd]) => {
      const [tipo, modelo] = k.split("|");
      return { tipo, modelo, qtd };
    });
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        {rows.length} resposta{rows.length === 1 ? "" : "s"} · {querem.length}{" "}
        querem · {naoQuerem.length} não querem ·{" "}
        <strong>{totalPecas} peças no total</strong>
      </p>

      {/* Resumo para o pedido — por tamanho, com as categorias de cada um */}
      <h2 className="mb-3 mt-6 text-lg font-extrabold">Resumo para o pedido</h2>
      {tamanhosComDados.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-amadeus-blue/20 bg-white py-8 text-center text-sm text-muted-foreground">
          Ninguém pediu fardamento ainda.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tamanhosComDados.map((t) => {
            const combos = combosDoTamanho(t);
            const subtotal = combos.reduce((s, c) => s + c.qtd, 0);
            return (
              <div
                key={t}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-base font-extrabold text-amadeus-blue">
                    Tamanho {t}
                  </span>
                  <span className="text-sm font-bold tabular-nums text-muted-foreground">
                    {subtotal} {subtotal === 1 ? "peça" : "peças"}
                  </span>
                </div>
                <div className="space-y-1">
                  {combos.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {labelTipo(c.tipo)} · {labelModelo(c.modelo)}
                      </span>
                      <span className="font-bold tabular-nums text-amadeus-blue">
                        {c.qtd}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                <th className="px-3 py-2 font-semibold"></th>
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
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => setEditando(r)}
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-semibold text-amadeus-blue transition-colors hover:bg-amadeus-blue-50"
                    >
                      <Pencil className="size-3.5" />
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editando && (
        <EditarModal
          row={editando}
          onFechar={() => setEditando(null)}
          onSalvo={() => {
            setEditando(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function EditarModal({
  row,
  onFechar,
  onSalvo,
}: {
  row: RowFardamento;
  onFechar: () => void;
  onSalvo: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState(row.nome);
  const [quer, setQuer] = useState(row.quer);
  const [modelo, setModelo] = useState(row.modelo ?? "");
  const [tamanho, setTamanho] = useState(row.tamanho ?? "");
  const [tipo, setTipo] = useState(row.tipo ?? "");
  const [quantidade, setQuantidade] = useState(row.quantidade || 1);

  function salvar() {
    setErro(null);
    startTransition(async () => {
      const r = await atualizarFardamento(row.id, {
        nome,
        quer,
        modelo,
        tamanho,
        tipo,
        quantidade,
      });
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      onSalvo();
    });
  }

  function excluir() {
    if (!window.confirm(`Excluir o registro de ${row.nome}?`)) return;
    setErro(null);
    startTransition(async () => {
      const r = await excluirFardamento(row.id);
      if (!r.ok) {
        setErro(r.error);
        return;
      }
      onSalvo();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-float-lg">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-amadeus-blue">
            Editar registro
          </h3>
          <button
            type="button"
            onClick={onFechar}
            aria-label="Fechar"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Quer o fardamento?</Label>
            <div className="flex gap-2">
              <Opcao ativo={quer} onClick={() => setQuer(true)}>
                Sim
              </Opcao>
              <Opcao ativo={!quer} onClick={() => setQuer(false)}>
                Não
              </Opcao>
            </div>
          </div>

          {quer && (
            <>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <div className="flex flex-wrap gap-2">
                  {MODELOS.map((m) => (
                    <Opcao
                      key={m.valor}
                      ativo={modelo === m.valor}
                      onClick={() => setModelo(m.valor)}
                    >
                      {m.label}
                    </Opcao>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tamanho</Label>
                <div className="flex flex-wrap gap-2">
                  {TAMANHOS.map((t) => (
                    <Opcao
                      key={t}
                      ativo={tamanho === t}
                      onClick={() => setTamanho(t)}
                    >
                      {t}
                    </Opcao>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS.map((t) => (
                    <Opcao
                      key={t.valor}
                      ativo={tipo === t.valor}
                      onClick={() => setTipo(t.valor)}
                    >
                      {t.label}
                    </Opcao>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Quantidade</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={() => setQuantidade((q) => Math.max(1, q - 1))}
                    disabled={quantidade <= 1}
                  >
                    <Minus className="size-4" />
                  </Button>
                  <span className="w-8 text-center text-xl font-extrabold tabular-nums text-amadeus-blue">
                    {quantidade}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10"
                    onClick={() => setQuantidade((q) => Math.min(50, q + 1))}
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {erro && <p className="text-sm text-destructive">{erro}</p>}

          <div className="flex items-center justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={excluir}
              disabled={pending}
              className="text-red-700 hover:bg-red-50"
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onFechar}
                disabled={pending}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={salvar} disabled={pending}>
                {pending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Opcao({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`rounded-xl border-2 px-4 py-2 text-sm font-semibold transition-colors ${
        ativo
          ? "border-amadeus-blue bg-amadeus-blue text-white"
          : "border-border bg-white text-foreground hover:bg-muted/50"
      }`}
    >
      {children}
    </button>
  );
}
