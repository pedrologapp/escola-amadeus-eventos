"use client";

import { useState, useTransition } from "react";
import { Link2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  CICLO_STATUS,
  CLASSE_STATUS,
  ROTULO_STATUS,
  type Categoria,
  type ItemReuniao,
  type Status,
} from "@/lib/reuniao";
import { cn } from "@/lib/utils";
import {
  atualizarItem,
  criarItem,
  excluirItem,
  mudarStatus,
  type ItemEntrada,
} from "./actions";

const campo =
  "w-full rounded-lg border border-border/70 px-3 py-2 text-sm outline-none focus:border-amadeus-blue/50";

export function Painel({
  cronograma,
  materiais,
}: {
  cronograma: ItemReuniao[];
  materiais: ItemReuniao[];
}) {
  return (
    <div className="mt-6 grid gap-8 lg:grid-cols-2">
      <Secao
        categoria="material"
        titulo="Materiais"
        descricao="O que precisa ficar pronto antes do dia. Guarde aqui o link de cada peça."
        itens={materiais}
      />
      <Secao
        categoria="cronograma"
        titulo="Cronograma do dia"
        descricao="A ordem das falas no sábado, com os responsáveis."
        itens={cronograma}
      />
    </div>
  );
}

function Secao({
  categoria,
  titulo,
  descricao,
  itens,
}: {
  categoria: Categoria;
  titulo: string;
  descricao: string;
  itens: ItemReuniao[];
}) {
  const [adicionando, setAdicionando] = useState(false);

  return (
    <section>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-amadeus-blue">{titulo}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>
        </div>
        <button
          type="button"
          onClick={() => setAdicionando((v) => !v)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border/70 px-3 py-2 text-sm font-semibold text-amadeus-blue transition-colors hover:border-amadeus-blue/40"
        >
          {adicionando ? <X className="size-4" /> : <Plus className="size-4" />}
          {adicionando ? "Cancelar" : "Adicionar"}
        </button>
      </div>

      {adicionando && (
        <Formulario
          categoria={categoria}
          aoFechar={() => setAdicionando(false)}
        />
      )}

      <ul className="mt-4 divide-y divide-border/60 rounded-xl border border-border/60 bg-white">
        {itens.map((item) => (
          <Linha key={item.id} item={item} />
        ))}
        {itens.length === 0 && !adicionando && (
          <li className="p-6 text-center text-sm text-muted-foreground">
            Nada por aqui ainda.
          </li>
        )}
      </ul>
    </section>
  );
}

function Linha({ item }: { item: ItemReuniao }) {
  const [editando, setEditando] = useState(false);
  const [salvando, iniciar] = useTransition();

  if (editando) {
    return (
      <li className="p-2">
        <Formulario
          categoria={item.categoria}
          item={item}
          aoFechar={() => setEditando(false)}
        />
      </li>
    );
  }

  function remover() {
    iniciar(async () => {
      await excluirItem(item.id);
    });
  }

  return (
    <li className="group flex items-center gap-2 px-3 py-2">
      {/* Status como seletor: cabe numa linha e troca com um clique. */}
      <select
        value={item.status}
        disabled={salvando}
        onChange={(e) =>
          iniciar(async () => {
            await mudarStatus(item.id, e.target.value as Status);
          })
        }
        aria-label={`Status de ${item.titulo}`}
        className={cn(
          "shrink-0 cursor-pointer appearance-none rounded-full border px-2.5 py-1 text-xs font-semibold outline-none",
          CLASSE_STATUS[item.status],
        )}
      >
        {CICLO_STATUS.map((s) => (
          <option key={s} value={s}>
            {ROTULO_STATUS[s]}
          </option>
        ))}
      </select>

      {item.horario && (
        <span className="shrink-0 text-xs font-bold tabular-nums text-amadeus-blue">
          {item.horario}
        </span>
      )}

      {/* O detalhe vira dica no hover pra não ocupar uma segunda linha. */}
      <span
        title={item.detalhe ?? undefined}
        className="min-w-0 flex-1 truncate text-sm font-semibold text-amadeus-blue"
      >
        {item.titulo}
      </span>

      {item.responsavel && (
        <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
          {item.responsavel}
        </span>
      )}

      {salvando && (
        <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
      )}

      {item.link && (
        <a
          href={item.link}
          target="_blank"
          rel="noopener noreferrer"
          title={item.link}
          aria-label="Abrir material"
          className="shrink-0 rounded-lg p-1.5 text-amadeus-blue hover:bg-amadeus-blue-50"
        >
          <Link2 className="size-4" />
        </a>
      )}

      <button
        type="button"
        onClick={() => setEditando(true)}
        aria-label="Editar"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-opacity hover:bg-muted hover:text-amadeus-blue sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
      >
        <Pencil className="size-4" />
      </button>
      <button
        type="button"
        onClick={remover}
        aria-label="Excluir"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-opacity hover:bg-red-50 hover:text-red-600 sm:opacity-0 sm:focus-visible:opacity-100 sm:group-hover:opacity-100"
      >
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function Formulario({
  categoria,
  item,
  aoFechar,
}: {
  categoria: Categoria;
  item?: ItemReuniao;
  aoFechar: () => void;
}) {
  const [titulo, setTitulo] = useState(item?.titulo ?? "");
  const [detalhe, setDetalhe] = useState(item?.detalhe ?? "");
  const [responsavel, setResponsavel] = useState(item?.responsavel ?? "");
  const [horario, setHorario] = useState(item?.horario ?? "");
  const [link, setLink] = useState(item?.link ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    const dados: ItemEntrada = {
      categoria,
      titulo,
      detalhe,
      responsavel,
      horario,
      link,
    };

    iniciar(async () => {
      const r = item
        ? await atualizarItem(item.id, dados)
        : await criarItem(dados);
      if (r.ok) aoFechar();
      else setErro(r.error);
    });
  }

  return (
    <form
      onSubmit={enviar}
      className="mt-3 rounded-xl border border-amadeus-blue/25 bg-amadeus-blue-50/40 p-3.5"
    >
      <input
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        placeholder="O que é"
        autoFocus
        className={cn(campo, "font-semibold")}
      />

      <textarea
        value={detalhe}
        onChange={(e) => setDetalhe(e.target.value)}
        placeholder="Detalhe (opcional)"
        rows={2}
        className={cn(campo, "mt-2 resize-y")}
      />

      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Responsável"
          className={campo}
        />
        <input
          value={horario}
          onChange={(e) => setHorario(e.target.value)}
          placeholder={categoria === "cronograma" ? "Horário" : "Prazo"}
          className={campo}
        />
      </div>

      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        placeholder="Link do material (Drive, site, arquivo…)"
        inputMode="url"
        className={cn(campo, "mt-2")}
      />

      {erro && <p className="mt-2 text-sm font-medium text-red-600">{erro}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {salvando && <Loader2 className="size-4 animate-spin" />}
          Salvar
        </button>
        <button
          type="button"
          onClick={aoFechar}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-muted"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
