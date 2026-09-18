"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Check, ChevronDown, Loader2, Search, UserRound } from "lucide-react";
import type { AlunoBusca } from "@/lib/buscar-alunos";
import { cn } from "@/lib/utils";
import { buscarAlunosAction, confirmarPresenca } from "./actions";

interface Props {
  maxPessoas: number;
  whatsappEscola: string;
  dataLabel: string;
  horaLabel: string;
  local: string;
}

/** (84) 99999-9999 — máscara só visual; a action guarda só os dígitos. */
function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

const campoBase =
  "w-full rounded-xl border-2 border-[#0B1733]/10 bg-white px-4 py-3.5 text-base " +
  "text-[#0B1733] placeholder:text-[#0B1733]/35 outline-none transition-colors " +
  "focus:border-[#0B1733]/60 focus:ring-4 focus:ring-[#E8B44C]/25";

const rotuloBase =
  "mb-1.5 block text-[0.8rem] font-bold uppercase tracking-[0.12em] text-[#0B1733]/60";

export function ConfirmacaoForm({
  maxPessoas,
  whatsappEscola,
  dataLabel,
  horaLabel,
  local,
}: Props) {
  const idAluno = useId();
  const idResponsavel = useId();
  const idTelefone = useId();
  const idLista = useId();

  const [termo, setTermo] = useState("");
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoBusca | null>(
    null,
  );
  const [sugestoes, setSugestoes] = useState<AlunoBusca[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [listaAberta, setListaAberta] = useState(false);

  const [responsavel, setResponsavel] = useState("");
  const [telefone, setTelefone] = useState("");
  const [pessoas, setPessoas] = useState(1);

  const [erro, setErro] = useState<string | null>(null);
  const [concluido, setConcluido] = useState<null | { atualizou: boolean }>(
    null,
  );
  const [enviando, iniciarEnvio] = useTransition();

  const caixaBusca = useRef<HTMLDivElement>(null);
  const timerBusca = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cada digitada ganha um número. Só a resposta do número mais recente
  // pode mexer na tela — senão uma busca lenta sobrescreve a nova.
  const buscaAtual = useRef(0);

  /** Busca com atraso: espera o pai parar de digitar antes de ir ao banco. */
  function aoDigitarNome(valor: string) {
    setTermo(valor);
    setAlunoSelecionado(null);

    if (timerBusca.current) clearTimeout(timerBusca.current);
    const t = valor.trim();
    const meuId = ++buscaAtual.current;

    if (t.length < 3) {
      setSugestoes([]);
      setBuscando(false);
      setListaAberta(false);
      return;
    }

    setBuscando(true);
    timerBusca.current = setTimeout(async () => {
      try {
        const achados = await buscarAlunosAction(t);
        if (buscaAtual.current !== meuId) return;
        setSugestoes(achados);
        setListaAberta(true);
      } finally {
        if (buscaAtual.current === meuId) setBuscando(false);
      }
    }, 320);
  }

  // Clique fora fecha a lista de sugestões.
  useEffect(() => {
    function aoClicar(e: MouseEvent) {
      if (!caixaBusca.current?.contains(e.target as Node)) setListaAberta(false);
    }
    document.addEventListener("mousedown", aoClicar);
    return () => document.removeEventListener("mousedown", aoClicar);
  }, []);

  // Some da tela com uma busca pendente: não deixa o timer disparar.
  useEffect(() => {
    return () => {
      if (timerBusca.current) clearTimeout(timerBusca.current);
    };
  }, []);

  function escolher(aluno: AlunoBusca) {
    // Invalida qualquer busca em voo — o pai já escolheu.
    buscaAtual.current += 1;
    if (timerBusca.current) clearTimeout(timerBusca.current);
    setBuscando(false);
    setAlunoSelecionado(aluno);
    setTermo(aluno.nome_completo);
    setListaAberta(false);
    setErro(null);
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciarEnvio(async () => {
      const resultado = await confirmarPresenca({
        responsavelNome: responsavel,
        telefone,
        alunoId: alunoSelecionado?.id ?? null,
        alunoNome: alunoSelecionado?.nome_completo ?? termo,
        pessoas,
      });

      if (resultado.ok) {
        setConcluido({ atualizou: resultado.atualizou });
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErro(resultado.error);
      }
    });
  }

  if (concluido) {
    return (
      <div className="rounded-3xl bg-[#FAF7F0] p-7 text-center shadow-2xl sm:p-10">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[#E8B44C]">
          <Check className="size-9 text-[#0B1733]" strokeWidth={3} />
        </div>
        <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-[#0B1733] sm:text-3xl">
          {concluido.atualizou
            ? "Confirmação atualizada!"
            : "Presença confirmada!"}
        </h3>
        <p className="mx-auto mt-3 max-w-sm text-[0.95rem] leading-relaxed text-[#0B1733]/70">
          Te esperamos {dataLabel}, às <strong>{horaLabel}</strong>, no {local}.
          Vai ser bom ter você com a gente.
        </p>
        <p className="mt-5 text-sm text-[#0B1733]/55">
          Precisa mudar alguma coisa?{" "}
          <a
            className="font-bold text-[#0B1733] underline decoration-[#E8B44C] decoration-2 underline-offset-4"
            href={`https://wa.me/${whatsappEscola}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Fale com a secretaria
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={enviar}
      className="rounded-3xl bg-[#FAF7F0] p-6 shadow-2xl sm:p-8"
    >
      {/* ---------- Aluno ---------- */}
      <div ref={caixaBusca} className="relative">
        <label htmlFor={idAluno} className={rotuloBase}>
          Nome do seu filho ou filha
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-[#0B1733]/35" />
          <input
            id={idAluno}
            value={termo}
            onChange={(e) => aoDigitarNome(e.target.value)}
            onFocus={() => sugestoes.length > 0 && setListaAberta(true)}
            placeholder="Comece a digitar o nome"
            autoComplete="off"
            enterKeyHint="search"
            role="combobox"
            aria-expanded={listaAberta}
            aria-controls={idLista}
            aria-autocomplete="list"
            className={cn(campoBase, "pl-11 pr-11")}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {buscando ? (
              <Loader2 className="size-[18px] animate-spin text-[#0B1733]/40" />
            ) : alunoSelecionado ? (
              <Check className="size-[18px] text-emerald-600" strokeWidth={3} />
            ) : (
              <ChevronDown className="size-[18px] text-[#0B1733]/25" />
            )}
          </span>
        </div>

        {listaAberta && sugestoes.length > 0 && (
          <ul
            id={idLista}
            role="listbox"
            className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-xl border-2 border-[#0B1733]/10 bg-white py-1 shadow-xl"
          >
            {sugestoes.map((aluno) => (
              <li key={aluno.id}>
                <button
                  type="button"
                  onClick={() => escolher(aluno)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#E8B44C]/15"
                >
                  <UserRound className="size-4 shrink-0 text-[#0B1733]/40" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.95rem] font-semibold text-[#0B1733]">
                      {aluno.nome_completo}
                    </span>
                    <span className="block text-xs text-[#0B1733]/50">
                      {[aluno.serie, aluno.turma].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* Calouro ou irmão que ainda não está no cadastro não pode travar. */}
        {termo.trim().length >= 3 &&
          !buscando &&
          !alunoSelecionado &&
          sugestoes.length === 0 && (
            <p className="mt-2 text-sm text-[#0B1733]/55">
              Não encontramos esse nome no cadastro — sem problema, pode seguir
              assim mesmo.
            </p>
          )}
      </div>

      {/* ---------- Responsável ---------- */}
      <div className="mt-5">
        <label htmlFor={idResponsavel} className={rotuloBase}>
          Seu nome
        </label>
        <input
          id={idResponsavel}
          value={responsavel}
          onChange={(e) => setResponsavel(e.target.value)}
          placeholder="Nome do responsável"
          autoComplete="name"
          className={campoBase}
        />
      </div>

      {/* ---------- WhatsApp ---------- */}
      <div className="mt-5">
        <label htmlFor={idTelefone} className={rotuloBase}>
          WhatsApp
        </label>
        <input
          id={idTelefone}
          value={telefone}
          onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
          placeholder="(84) 99999-9999"
          inputMode="numeric"
          autoComplete="tel-national"
          enterKeyHint="done"
          className={campoBase}
        />
      </div>

      {/* ---------- Quantas pessoas ---------- */}
      <fieldset className="mt-6">
        <legend className={rotuloBase}>Quantas pessoas vêm?</legend>
        <p className="mb-3 text-sm leading-relaxed text-[#0B1733]/60">
          Se possível, vir apenas os responsáveis.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: maxPessoas }, (_, i) => i + 1).map((n) => {
            const ativo = pessoas === n;
            return (
              <button
                key={n}
                type="button"
                onClick={() => setPessoas(n)}
                aria-pressed={ativo}
                className={cn(
                  "rounded-xl border-2 py-3.5 text-base font-bold transition-all",
                  ativo
                    ? "border-[#0B1733] bg-[#0B1733] text-[#FAF7F0]"
                    : "border-[#0B1733]/15 bg-white text-[#0B1733]/70 hover:border-[#0B1733]/35",
                )}
              >
                {n === 1 ? "1 pessoa" : `${n} pessoas`}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-sm leading-relaxed text-[#0B1733]/55">
          Cada família pode confirmar até {maxPessoas} pessoas.
        </p>
      </fieldset>

      {erro && (
        <p
          role="alert"
          className="mt-5 rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {erro}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#E8B44C] py-4 text-base font-extrabold tracking-tight text-[#0B1733] shadow-lg transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-60"
      >
        {enviando && <Loader2 className="size-5 animate-spin" />}
        {enviando ? "Confirmando…" : "Confirmar minha presença"}
      </button>
    </form>
  );
}
