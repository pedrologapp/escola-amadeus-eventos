"use client";

import { useState, useTransition } from "react";
import {
  Check,
  ExternalLink,
  Link2,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
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

      <ul className="mt-4 space-y-2">
        {itens.map((item) => (
          <Linha key={item.id} item={item} />
        ))}
        {itens.length === 0 && !adicionando && (
          <li className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
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
      <li>
        <Formulario
          categoria={item.categoria}
          item={item}
          aoFechar={() => setEditando(false)}
        />
      </li>
    );
  }

  function trocar(status: Status) {
    iniciar(async () => {
      await mudarStatus(item.id, status);
    });
  }

  function remover() {
    iniciar(async () => {
      await excluirItem(item.id);
    });
  }

  return (
    <li className="group rounded-xl border border-border/60 bg-white p-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {item.horario && (
              <span className="rounded-md bg-amadeus-blue-50 px-1.5 py-0.5 text-xs font-bold text-amadeus-blue">
                {item.horario}
              </span>
            )}
            <span className="font-semibold text-amadeus-blue">
              {item.titulo}
            </span>
            {item.responsavel && (
              <span className="text-xs text-muted-foreground">
                · {item.responsavel}
              </span>
            )}
          </div>

          {item.detalhe && (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {item.detalhe}
            </p>
          )}

          {item.link && (
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex max-w-full items-center gap-1.5 text-sm font-medium text-amadeus-blue hover:underline"
            >
              <Link2 className="size-3.5 shrink-0" />
              <span className="truncate">{item.link}</span>
              <ExternalLink className="size-3 shrink-0 opacity-60" />
            </a>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label="Editar"
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-amadeus-blue focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Pencil className="size-4" />
          </button>
          <button
            type="button"
            onClick={remover}
            aria-label="Excluir"
            className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {salvando && (
          <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
        )}
        {CICLO_STATUS.map((s) => {
          const ativo = item.status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => !ativo && trocar(s)}
              aria-pressed={ativo}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors",
                ativo
                  ? CLASSE_STATUS[s]
                  : "border-transparent text-muted-foreground hover:bg-muted",
              )}
            >
              {ativo && <Check className="mr-1 inline size-3" />}
              {ROTULO_STATUS[s]}
            </button>
          );
        })}
      </div>
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
