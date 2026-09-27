"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Printer, Search, UserPlus } from "lucide-react";
import type { AlunoBusca, Leitura } from "@/lib/rematricula-2027-dados";
import {
  DEPOIS_DO_PRAZO,
  FIDELIDADE,
  PRAZO_PROMOCAO,
  SERIES,
  URL_FOLDER,
  reais,
  simular,
  type Condicao,
  type NomeSerie,
} from "@/lib/rematricula-2027";

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const SELO_CONFIANCA = {
  certa: { texto: "Conta fechada", classe: "bg-emerald-50 text-emerald-700" },
  provavel: { texto: "Provável, confira", classe: "bg-amber-100 text-amber-800" },
  revisar: { texto: "Precisa de você", classe: "bg-red-50 text-red-700" },
} as const;

function Coluna({ titulo, c, destaque }: { titulo: string; c: Condicao; destaque?: boolean }) {
  return (
    <div className={`rounded-2xl p-5 ${destaque ? "bg-amadeus-blue text-white" : "border border-border/60 bg-white"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${destaque ? "text-amadeus-yellow" : "text-muted-foreground"}`}>{titulo}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between"><dt>Mensalidade Fidelidade</dt><dd className="font-semibold">{reais(c.mensalidade - FIDELIDADE)}</dd></div>
        <div className="flex justify-between"><dt>Livros (12x)</dt><dd className="font-semibold">{reais(c.livro)}</dd></div>
      </dl>
      <div className={`mt-3 border-t pt-3 ${destaque ? "border-white/20" : "border-border/60"}`}>
        <p className="text-xs opacity-80">Por mês, pagando até o dia 05</p>
        <p className="text-3xl font-extrabold">{reais(c.fidelidade)}</p>
        <p className={`mt-1 text-sm ${destaque ? "text-amadeus-yellow" : "text-amadeus-blue"}`}>
          Após o dia 05: <b>{reais(c.total)}</b>
        </p>
      </div>
    </div>
  );
}

export function Simulador({ alunos, leitura }: { alunos: AlunoBusca[]; leitura: Leitura | null }) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [busca, setBusca] = useState("");
  const [novato, setNovato] = useState(false);
  const [nomeNovato, setNomeNovato] = useState("");
  const [base, setBase] = useState<string>(leitura?.base != null ? String(leitura.base) : "");
  const [serie, setSerie] = useState<NomeSerie | "">(leitura?.serie2027 ?? "");
  const [copiado, setCopiado] = useState(false);

  const achados = useMemo(() => {
    const q = semAcento(busca.trim());
    if (q.length < 2) return [];
    const partes = q.split(/\s+/);
    return alunos.filter((a) => partes.every((p) => semAcento(a.nome).includes(p))).slice(0, 8);
  }, [busca, alunos]);

  const escolher = (id: number) => {
    setBusca("");
    setNovato(false);
    iniciar(() => router.push(`?aluno=${id}`));
  };

  const ativo = novato || leitura;
  const nome = novato ? nomeNovato.trim() : leitura?.aluno.nome ?? "";
  const baseNum = novato ? null : Number(base.replace(",", "."));
  const pronto = ativo && serie && nome && (novato || (Number.isFinite(baseNum) && (baseNum ?? 0) > 0));
  const sim = pronto ? simular(serie as NomeSerie, baseNum) : null;

  const linkCarta = sim
    ? `/admin/campanhas/rematricula-2027/carta?${new URLSearchParams({
        ...(novato ? { nome } : { aluno: String(leitura!.aluno.id), base: String(baseNum) }),
        serie: sim.serie2027,
      })}`
    : "";

  const texto = sim
    ? [
        `Olá! Seguem os valores de 2027 de *${nome}* (${sim.serie2027}):`,
        "",
        `*Fechando até ${PRAZO_PROMOCAO}*`,
        `Mensalidade Fidelidade: ${reais(sim.promo.mensalidade - FIDELIDADE)}`,
        `Livros: 12x ${reais(sim.promo.livro)}`,
        `Total por mês: *${reais(sim.promo.fidelidade)}* (após o dia 05: ${reais(sim.promo.total)})`,
        "",
        `*A partir de ${DEPOIS_DO_PRAZO}*`,
        `Mensalidade Fidelidade: ${reais(sim.depois.mensalidade - FIDELIDADE)}`,
        `Livros: 12x ${reais(sim.depois.livro)}`,
        `Total por mês: *${reais(sim.depois.fidelidade)}* (após o dia 05: ${reais(sim.depois.total)})`,
        "",
        `Os valores já têm o desconto Fidelidade de ${reais(FIDELIDADE)}, para pagamento até o dia 05 de cada mês.`,
        "",
        `Conheça tudo o que vem em 2027: ${URL_FOLDER}`,
        "",
        "_Centro Educacional Amadeus_",
      ].join("\n")
    : "";

  const copiar = async () => {
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Busca */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Nome do aluno"
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-amadeus-blue"
        />
        {achados.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-border bg-white shadow-lg">
            {achados.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => escolher(a.id)} className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-amadeus-blue-50">
                  <span className="font-semibold">{a.nome}</span>
                  <span className="shrink-0 text-muted-foreground">{a.serie ?? a.turma}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {busca.trim().length >= 2 && achados.length === 0 && (
          <p className="mt-2 text-sm text-muted-foreground">Nenhum aluno ativo com esse nome.</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => { setNovato(true); setSerie(""); setNomeNovato(busca.trim()); setBusca(""); }}
          className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue-50/70 px-3 py-1.5 text-sm font-semibold text-amadeus-blue hover:bg-amadeus-blue-50"
        >
          <UserPlus className="size-4" /> Simular como novato
        </button>
        {carregando && <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lendo o Activesoft…</span>}
      </div>

      {ativo && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          {/* Situação de hoje */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-white p-5">
            {novato ? (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Novato</p>
                <label className="block text-sm font-semibold">
                  Nome da criança
                  <input value={nomeNovato} onChange={(e) => setNomeNovato(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
                </label>
                <p className="text-sm text-muted-foreground">Usa a tabela de 2027 do flyer, mais o livro da série.</p>
              </>
            ) : leitura && (
              <>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hoje · 2026</p>
                  <p className="mt-1 text-lg font-extrabold text-amadeus-blue">{leitura.aluno.nome}</p>
                  <p className="text-sm text-muted-foreground">{leitura.aluno.turma}</p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span>Mensalidade no boleto</span>
                    <b>{leitura.valorBoleto != null ? reais(leitura.valorBoleto) : "—"}</b>
                  </div>
                  <p className="mt-2 text-muted-foreground">{leitura.explicacao}</p>
                  <span className={`mt-2 inline-block rounded-md px-2 py-0.5 text-xs font-bold ${SELO_CONFIANCA[leitura.confianca].classe}`}>
                    {SELO_CONFIANCA[leitura.confianca].texto}
                  </span>
                  {leitura.alternativa && (
                    <button type="button" onClick={() => setBase(String(leitura.alternativa!.base))} className="ml-2 text-xs font-semibold text-amadeus-blue underline">
                      ou {leitura.alternativa.base} + livro {leitura.alternativa.livro}
                    </button>
                  )}
                </div>
                <label className="block text-sm font-semibold">
                  Mensalidade de hoje, sem o livro
                  <input inputMode="decimal" value={base} onChange={(e) => setBase(e.target.value)} className="mt-1 w-full rounded-xl border border-border px-3 py-2 text-lg font-bold outline-none focus:border-amadeus-blue" />
                </label>
                {leitura.descontos.length > 0 && (
                  <div className="text-sm">
                    <p className="font-semibold">Descontos cadastrados à parte em 2026</p>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {leitura.descontos.map((d) => <li key={d}>{d}</li>)}
                    </ul>
                    <p className="mt-1 text-xs text-muted-foreground">Não entram na conta; o boleto vem sem eles.</p>
                  </div>
                )}
              </>
            )}

            <label className="block text-sm font-semibold">
              Série em 2027
              <select value={serie} onChange={(e) => setSerie(e.target.value as NomeSerie)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-normal outline-none focus:border-amadeus-blue">
                <option value="">Escolha…</option>
                {SERIES.map((s) => <option key={s.nome} value={s.nome}>{s.nome}</option>)}
              </select>
            </label>
            {!novato && leitura && leitura.aluno.serie === "9º Ano" && (
              <p className="text-sm text-amber-800">Está no 9º ano: em 2027 sai da escola.</p>
            )}
          </div>

          {/* 2027 */}
          <div>
            {sim ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Coluna titulo={`Fechando até ${PRAZO_PROMOCAO}`} c={sim.promo} destaque />
                  <Coluna titulo={`A partir de ${DEPOIS_DO_PRAZO}`} c={sim.depois} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Fechando no prazo, a família economiza <b className="text-amadeus-blue">{reais(sim.economiaAno)}</b> no ano.
                  {" "}Os valores já têm o desconto Fidelidade de {reais(FIDELIDADE)} (pagando até o dia 05).
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href={linkCarta} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                    <Printer className="size-4" /> Imprimir carta para a família
                  </a>
                  <button type="button" onClick={copiar} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50">
                    {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiado ? "Copiado" : "Copiar texto para o WhatsApp"}
                  </button>
                </div>
              </>
            ) : (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                {novato && !nome ? "Digite o nome da criança." : "Escolha a série de 2027 e confira a mensalidade de hoje."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
