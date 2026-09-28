"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, Loader2, Printer, Search, Send, UserPlus } from "lucide-react";
import type { AlunoBusca, Leitura, Responsavel } from "@/lib/rematricula-2027-dados";
import { enviarCarta, previaCarta, type Destino, type ResultadoEnvio } from "./actions";
import {
  DEPOIS_DO_PRAZO,
  DESCONTO_IRMAO,
  MODOS_LIVRO,
  DESCONTO_PLANO_ACTIVESOFT,
  PARCELAS_MATRICULA,
  planoActivesoft,
  REAJUSTE,
  origemDaCheia,
  trocaDeSegmento,
  PRAZO_PROMOCAO,
  SERIES,
  URL_FOLDER,
  economiaNoAno,
  livroAVista,
  reais,
  simular,
  condicaoAVista,
  type Condicao,
  type ModoLivro,
  type NomeSerie,
  type TipoCarta,
} from "@/lib/rematricula-2027";

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const SELO_CONFIANCA = {
  certa: { texto: "Conta fechada", classe: "bg-emerald-50 text-emerald-700" },
  provavel: { texto: "Provável, confira", classe: "bg-amber-100 text-amber-800" },
  revisar: { texto: "Precisa de você", classe: "bg-red-50 text-red-700" },
} as const;

function Linha({ rotulo, valor, forte, menos }: { rotulo: string; valor: number; forte?: boolean; menos?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 text-sm ${forte ? "font-extrabold" : ""}`}>
      <span>{rotulo}</span>
      <span className="tabular-nums">{menos ? "− " : ""}{reais(valor)}</span>
    </div>
  );
}

/**
 * Uma condição na ordem da carta: mensalidade cheia, os descontos, a
 * mensalidade real pagando até o dia 05; depois o livro e o total.
 * Tudo no mesmo tamanho de letra (pedido da direção).
 */
function Coluna({ titulo, c, modo, destaque }: { titulo: string; c: Condicao; modo: ModoLivro; destaque?: boolean }) {
  const fio = destaque ? "border-white/20" : "border-border/60";
  const cor = destaque ? "text-amadeus-yellow" : "text-amadeus-blue";
  return (
    <div className={`rounded-2xl p-5 ${destaque ? "bg-amadeus-blue text-white" : "border border-border/60 bg-white"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${destaque ? "text-amadeus-yellow" : "text-muted-foreground"}`}>{titulo}</p>
      <div className="mt-4 space-y-1.5">
        <Linha rotulo="Mensalidade cheia" valor={c.cheia} forte />
        <Linha rotulo="Fidelidade (até o dia 05)" valor={c.fidelidade} menos />
        {c.desconto > 0 && <Linha rotulo="Desconto" valor={c.desconto} menos />}
        {c.irmao > 0 && <Linha rotulo="Desconto de irmão" valor={c.irmao} menos />}
      </div>
      <div className={`mt-3 border-t pt-3 ${fio}`}>
        <p className="text-sm font-bold">Pagando até o dia 05</p>
        <p className={`text-4xl font-extrabold ${cor}`}>{reais(c.ate05)}</p>
      </div>
      {modo === "sem" && (
        <>
          <p className="mt-1 text-xs opacity-75">do dia 06 ao 10: {reais(c.ate10)} ({"sem os descontos, só R$ 10 de Fidelidade"})</p>
          <p className="text-xs opacity-75">depois do dia 10: {reais(c.cheia)}</p>
        </>
      )}

      {modo === "com" && (
        <>
          <div className={`mt-3 border-t pt-3 ${fio}`}>
            <Linha rotulo="Livros (12x)" valor={c.livro} />
            <p className="text-xs opacity-75">ou {reais(livroAVista(c.livro))} à vista</p>
          </div>
          <div className={`mt-3 border-t pt-3 ${fio}`}>
            <p className="text-sm font-bold">Total por mês até o dia 05</p>
            <p className={`text-2xl font-extrabold ${cor}`}>{reais(c.totalAte05)}</p>
          </div>
          <p className="mt-1 text-xs opacity-75">do dia 06 ao 10: {reais(c.ate10 + c.livro)} ({"sem os descontos, só R$ 10 de Fidelidade"})</p>
          <p className="text-xs opacity-75">depois do dia 10: {reais(c.totalCheio)}</p>
        </>
      )}
      <div className={`mt-3 border-t pt-3 text-sm ${fio}`}>
        Matrícula: <b>{reais(c.matricula)}</b> <span className="opacity-75">· até {PARCELAS_MATRICULA}x de {reais(c.matricula / PARCELAS_MATRICULA)}</span>
      </div>
    </div>
  );
}

/** Pagamento à vista: matrícula + 11 mensalidades cheias com 10%, sem e com os livros. */
function ColunaAVista({ titulo, c, destaque }: { titulo: string; c: Condicao; destaque?: boolean }) {
  const v = condicaoAVista(c);
  const fio = destaque ? "border-white/20" : "border-border/60";
  const cor = destaque ? "text-amadeus-yellow" : "text-amadeus-blue";
  return (
    <div className={`rounded-2xl p-5 ${destaque ? "bg-amadeus-blue text-white" : "border border-border/60 bg-white"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${destaque ? "text-amadeus-yellow" : "text-muted-foreground"}`}>{titulo}</p>
      <div className="mt-4 space-y-1.5">
        <Linha rotulo="Matrícula + 11 mensalidades" valor={v.ano} forte />
        <p className="text-xs opacity-75">12 × {reais(v.mensalidade)}</p>
        <Linha rotulo="Desconto à vista (10%)" valor={v.desconto} menos />
      </div>
      <div className={`mt-3 border-t pt-3 ${fio}`}>
        <p className="text-sm font-bold">À vista, sem os livros</p>
        <p className={`text-3xl font-extrabold ${cor}`}>{reais(v.semLivro)}</p>
      </div>
      <div className={`mt-3 border-t pt-3 ${fio}`}>
        <Linha rotulo="Livros à vista" valor={v.livro} />
        <p className="text-xs opacity-75">12 × {reais(c.livro)} = {reais(v.livro12x)}, com 10%</p>
      </div>
      <div className={`mt-3 border-t pt-3 ${fio}`}>
        <p className="text-sm font-bold">À vista, com os livros</p>
        <p className={`text-3xl font-extrabold ${cor}`}>{reais(v.comLivro)}</p>
      </div>
    </div>
  );
}

function linhasAVista(c: Condicao) {
  const v = condicaoAVista(c);
  return [
    `Matrícula + 11 mensalidades: ${reais(v.ano)} (12 × ${reais(v.mensalidade)})`,
    `Desconto à vista (10%): − ${reais(v.desconto)}`,
    `*À vista, sem os livros: ${reais(v.semLivro)}*`,
    `Livros à vista: ${reais(v.livro)} (12 × ${reais(c.livro)} com 10%)`,
    `*À vista, com os livros: ${reais(v.comLivro)}*`,
  ];
}

/** Linhas de uma condição no texto do WhatsApp. */
function linhasTexto(c: Condicao, modo: ModoLivro) {
  const l = [`Mensalidade cheia: ${reais(c.cheia)}`, `Fidelidade (até o dia 05): − ${reais(c.fidelidade)}`];
  if (c.desconto) l.push(`Desconto: − ${reais(c.desconto)}`);
  if (c.irmao) l.push(`Desconto de irmão: − ${reais(c.irmao)}`);
  l.push(`*Mensalidade pagando até o dia 05: ${reais(c.ate05)}*`);
  if (modo === "com") {
    l.push(`Livros: 12x ${reais(c.livro)} (ou ${reais(livroAVista(c.livro))} à vista)`);
    l.push(`*Total por mês até o dia 05: ${reais(c.totalAte05)}*`);
    l.push(`Do dia 06 ao 10: ${reais(c.ate10 + c.livro)} (sem os descontos, só R$ 10 de Fidelidade)`);
  }
  l.push(`Matrícula: ${reais(c.matricula)} (até ${PARCELAS_MATRICULA}x)`);
  return l;
}

export interface EnvioFeito {
  responsavel: string | null;
  telefone: string;
  status: string;
  detalhe?: string | null;
  created_at: string;
}

const telLegivel = (t: string) => `(${t.slice(0, 2)}) ${t.slice(2, -4)}-${t.slice(-4)}`;
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const SELO_ENVIO: Record<string, { texto: string; classe: string }> = {
  enviado: { texto: "Enviado", classe: "bg-emerald-50 text-emerald-700" },
  sem_whatsapp: { texto: "Sem WhatsApp", classe: "bg-amber-100 text-amber-800" },
  erro: { texto: "Erro", classe: "bg-red-50 text-red-700" },
};

/**
 * Envio pelo WhatsApp da escola. "Folder + carta" manda as duas mensagens;
 * "Só o folder" manda só a apresentação com o link (para quem vai receber os
 * valores por telefone). Com `soFolder` fixo, é o envio avulso, sem aluno.
 */
function EnviarWhatsApp({ responsaveis, envios, enviar, rotuloCarta, soFolder: soFolderFixo }: {
  responsaveis: Responsavel[];
  envios: EnvioFeito[];
  enviar: (destinos: Destino[], soFolder: boolean) => Promise<{ ok: boolean; erro?: string; resultados: ResultadoEnvio[] }>;
  rotuloCarta?: string;
  soFolder?: boolean;
}) {
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [outro, setOutro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [retorno, setRetorno] = useState<{ erro?: string; resultados: ResultadoEnvio[] } | null>(null);
  const [soFolderEscolhido, setSoFolder] = useState(false);
  const soFolder = soFolderFixo || soFolderEscolhido;
  const jaRecebeu = new Set(envios.filter((e) => e.status === "enviado").map((e) => e.telefone));

  const destinos: Destino[] = [
    ...responsaveis.filter((r) => marcados.has(r.telefone)).map((r) => ({ nome: r.nome, telefone: r.telefone })),
    ...(outro.replace(/\D/g, "").length >= 10 ? [{ nome: null, telefone: outro }] : []),
  ];

  const disparar = async () => {
    const repetidos = destinos.filter((d) => jaRecebeu.has(d.telefone.replace(/\D/g, "")));
    const aviso = repetidos.length ? `\n\n${repetidos.length} desse(s) número(s) já recebeu mensagem antes.` : "";
    const oque = soFolder ? "só o folder digital (sem valores)" : `a apresentação e a ${rotuloCarta ?? "carta com os valores"}`;
    if (!window.confirm(`Enviar ${oque} para ${destinos.length} número(s) pelo WhatsApp da escola?${aviso}`)) return;
    setEnviando(true);
    setRetorno(null);
    try {
      setRetorno(await enviar(destinos, soFolder));
    } catch (e) {
      setRetorno({ erro: (e as Error).message, resultados: [] });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className={`${soFolderFixo ? "" : "mt-6 "}rounded-2xl border border-border/60 bg-white p-5`}>
      <p className="flex items-center gap-2 text-sm font-bold text-amadeus-blue"><Send className="size-4" /> {soFolderFixo ? "Enviar só o folder digital" : "Enviar pelo WhatsApp da escola"}</p>
      {!soFolderFixo && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {[
            { v: false, t: `Folder + ${rotuloCarta ?? "carta com os valores"}` },
            { v: true, t: "Só o folder (sem valores)" },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setSoFolder(o.v)}
              className={`rounded-xl px-3 py-1.5 font-semibold ${soFolderEscolhido === o.v ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}
            >
              {o.t}
            </button>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {soFolder
          ? "Vai uma mensagem só: a apresentação da escola com o folder digital. Os valores a família recebe por outro caminho (ex.: pelo telefone)."
          : `Vão duas mensagens: a apresentação da escola com o folder digital e, em seguida, a imagem da ${rotuloCarta ?? "carta com os valores"}.`}
      </p>

      {responsaveis.length > 0 && (
        <ul className="mt-4 space-y-2">
          {responsaveis.map((r) => (
            <li key={r.telefone}>
              <label className="flex cursor-pointer items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[#083078]"
                  checked={marcados.has(r.telefone)}
                  onChange={(e) => {
                    const s = new Set(marcados);
                    if (e.target.checked) s.add(r.telefone); else s.delete(r.telefone);
                    setMarcados(s);
                  }}
                />
                <span className="font-semibold">{r.nome}</span>
                <span className="text-muted-foreground">{telLegivel(r.telefone)}</span>
                {jaRecebeu.has(r.telefone) && <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-bold text-emerald-700">já recebeu</span>}
              </label>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-4 block max-w-xs text-sm font-semibold">
        {responsaveis.length ? "Outro número" : "Número (DDD + celular)"}
        <input value={outro} onChange={(e) => setOutro(e.target.value)} inputMode="tel" placeholder="84 99999-9999" className="mt-1 w-full rounded-xl border border-border px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
      </label>

      <button
        type="button"
        disabled={!destinos.length || enviando}
        onClick={disparar}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {enviando ? "Enviando…" : destinos.length ? `Enviar para ${destinos.length} número${destinos.length > 1 ? "s" : ""}` : "Escolha para quem enviar"}
      </button>

      {retorno?.erro && <p className="mt-3 text-sm text-red-700">{retorno.erro}</p>}
      {retorno?.resultados.map((r) => (
        <p key={r.telefone} className="mt-2 text-sm">
          {telLegivel(r.telefone)}{" "}
          <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${SELO_ENVIO[r.status].classe}`}>{SELO_ENVIO[r.status].texto}</span>
          {r.detalhe && r.status === "erro" && <span className="ml-2 text-xs text-muted-foreground">{r.detalhe}</span>}
        </p>
      ))}

      {envios.length > 0 && (
        <div className="mt-5 border-t border-border/60 pt-3">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Envios anteriores</p>
          <ul className="mt-2 space-y-1 text-sm">
            {envios.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">{quando(e.created_at)}</span>
                <span>{e.responsavel ?? "Outro número"} · {telLegivel(e.telefone)}</span>
                <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${(SELO_ENVIO[e.status] ?? SELO_ENVIO.erro).classe}`}>{(SELO_ENVIO[e.status] ?? SELO_ENVIO.erro).texto}</span>
                {e.detalhe && /^(só o folder|à vista)/.test(e.detalhe) && <span className="text-xs text-muted-foreground">{e.detalhe.split(" · ")[0]}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Só o folder para um número avulso, sem escolher aluno (ex.: família que vai receber os valores por telefone). */
function FolderAvulso() {
  const [nome, setNome] = useState("");
  return (
    <div className="max-w-xl space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <label className="block max-w-xs text-sm font-semibold">
        Nome da criança <span className="font-normal text-muted-foreground">(opcional)</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-normal outline-none focus:border-amadeus-blue" />
      </label>
      <p className="text-xs text-muted-foreground">
        {nome.trim() ? `A mensagem começa com "Olá, família de ${nome.trim().split(/\s+/)[0]}!".` : 'Sem nome, a mensagem começa com "Olá, família!".'}
      </p>
      <EnviarWhatsApp
        soFolder
        responsaveis={[]}
        envios={[]}
        enviar={(destinos) =>
          enviarCarta({ alunoId: null, nome: nome.trim(), serie: "", desconto: 0, irmao: false, modo: "com", somenteFolder: true, destinos })
        }
      />
    </div>
  );
}

export function Simulador({ alunos, leitura, responsaveis, envios }: {
  alunos: AlunoBusca[];
  leitura: Leitura | null;
  responsaveis: Responsavel[];
  envios: EnvioFeito[];
}) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [busca, setBusca] = useState("");
  const [novato, setNovato] = useState(false);
  const [nomeNovato, setNomeNovato] = useState("");
  const [base, setBase] = useState<string>(leitura?.base != null ? String(leitura.base) : "");
  const [serie, setSerie] = useState<NomeSerie | "">(leitura?.serie2027 ?? "");
  const [copiado, setCopiado] = useState(false);
  const [modo, setModo] = useState<ModoLivro>("com");
  const [tipo, setTipo] = useState<TipoCarta>("mensal");
  const [soFolderAberto, setSoFolderAberto] = useState(false);
  const [abrindoPrevia, setAbrindoPrevia] = useState(false);
  const [descPag, setDescPag] = useState<string>(String(leitura?.descontoPagamento ?? 0));
  const [irmao, setIrmao] = useState(false);
  const [manterDesconto, setManterDesconto] = useState(true);

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
  const teto = leitura?.tetoAtual ?? null;
  const serieAtualCedo = novato ? null : leitura?.aluno.serie ?? null;
  // Troca de segmento: parte do teto novo e aplica todos os descontos (inclusive o que vem no boleto).
  // Mesmo segmento: parte da mensalidade de hoje, onde o desconto do boleto já está.
  const troca = !novato && !!serie && trocaDeSegmento(serieAtualCedo, serie as NomeSerie);
  // Boleto abaixo do teto NÃO é desconto (Arthur Mafra: 480 era a tabela de 2025; o recibo do Isaac
  // mostra só os R$ 20 da Fidelidade). Desconto é só o que o Isaac tira no pagamento, além da Fidelidade.
  const abaixoDoTeto = troca && teto !== null && Number.isFinite(baseNum) ? Math.max(0, teto - (baseNum ?? teto)) : 0;
  const descontoPag = novato ? 0 : Math.max(0, Number(descPag.replace(",", ".")) || 0);
  const desconto = manterDesconto ? descontoPag : 0;
  const serieAtual = novato ? null : leitura?.aluno.serie ?? null;
  const pronto = ativo && serie && nome && (novato || (Number.isFinite(baseNum) && (baseNum ?? 0) > 0));
  const baseMesmoSegmento = !novato && !troca && Number.isFinite(baseNum) ? baseNum : null;
  const sim = pronto ? simular(serie as NomeSerie, desconto, irmao, baseMesmoSegmento) : null;

  const linkCarta = sim
    ? `/admin/rematricula-2027/carta?${new URLSearchParams({
        ...(novato ? { nome } : { aluno: String(leitura!.aluno.id), ...(serieAtual ? { atual: serieAtual } : {}) }),
        serie: sim.serie2027,
        desconto: String(desconto),
        ...(baseMesmoSegmento !== null ? { base: String(baseMesmoSegmento) } : {}),
        ...(irmao ? { irmao: "1" } : {}),
        livro: modo,
      })}`
    : "";

  const dadosCarta = sim
    ? {
        alunoId: novato ? null : leitura!.aluno.id,
        nome,
        serie: sim.serie2027,
        desconto,
        irmao,
        serieAtual,
        base: baseMesmoSegmento,
        modo,
        tipo,
      }
    : null;

  const verImagem = async () => {
    if (!dadosCarta) return;
    // A aba abre antes do await para o navegador não bloquear o pop-up.
    const aba = window.open("about:blank", "_blank");
    setAbrindoPrevia(true);
    try {
      const r = await previaCarta(dadosCarta);
      if (r.url && aba) aba.location.href = r.url;
      else { aba?.close(); window.alert(r.erro ?? "Não consegui gerar a imagem."); }
    } finally {
      setAbrindoPrevia(false);
    }
  };

  const texto = sim && tipo === "avista"
    ? [
        `Olá! Seguem os valores de 2027 de *${nome}* (${sim.serie2027}) para pagamento *à vista*, com 10% de desconto:`,
        "",
        `*Fechando até ${PRAZO_PROMOCAO}*`,
        ...linhasAVista(sim.promo),
        "",
        `*A partir de ${DEPOIS_DO_PRAZO}*`,
        ...linhasAVista(sim.depois),
        "",
        "À vista é o pagamento único do ano (matrícula + 11 mensalidades). Não acumula com outros descontos.",
        "",
        `Conheça tudo o que vem em 2027: ${URL_FOLDER}`,
        "",
        "_Centro Educacional Amadeus_",
      ].join("\n")
    : sim
    ? [
        `Olá! Seguem os valores de 2027 de *${nome}* (${sim.serie2027}):`,
        "",
        `*Fechando até ${PRAZO_PROMOCAO}*`,
        ...linhasTexto(sim.promo, modo),
        "",
        `*A partir de ${DEPOIS_DO_PRAZO}*`,
        ...linhasTexto(sim.depois, modo),
        "",
        "Os descontos valem pagando até o dia 05 de cada mês.",
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
        <button
          type="button"
          onClick={() => setSoFolderAberto((v) => !v)}
          className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold ${soFolderAberto ? "bg-emerald-600 text-white" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}
        >
          <Send className="size-4" /> Enviar só o folder
        </button>
        {carregando && <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Lendo o Activesoft…</span>}
      </div>

      {soFolderAberto && <FolderAvulso />}

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
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" className="size-4 accent-[#083078]" checked={irmao} onChange={(e) => setIrmao(e.target.checked)} />
                  Tem irmão na escola (− {reais(DESCONTO_IRMAO)} até o dia 05)
                </label>
              </>
            ) : leitura && (
              <>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Hoje · 2026</p>
                  <p className="mt-1 text-lg font-extrabold text-amadeus-blue">{leitura.aluno.nome}</p>
                  <p className="text-sm text-muted-foreground">{leitura.aluno.turma}</p>
                </div>
                {/* Status no Isaac: parcelas vencidas ainda em aberto lá. */}
                {leitura.pendencias.length > 0 ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-bold">Não rematriculável: há pendências financeiras</p>
                    <p className="mt-0.5 text-xs">
                      {leitura.pendencias.length} parcela{leitura.pendencias.length > 1 ? "s" : ""} de mensalidade vencida{leitura.pendencias.length > 1 ? "s" : ""} em aberto no Isaac ·
                      total {reais(leitura.pendencias.reduce((t, p) => t + p.valor, 0))}
                    </p>
                    <ul className="mt-1.5 space-y-0.5 text-xs">
                      {leitura.pendencias.slice(0, 6).map((p, i) => (
                        <li key={i}>{p.vencimento.split("-").reverse().join("/")} · {p.servico} · {reais(p.valor)}</li>
                      ))}
                      {leitura.pendencias.length > 6 && <li>… e mais {leitura.pendencias.length - 6}</li>}
                    </ul>
                  </div>
                ) : (
                  <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">Rematriculável: sem mensalidade vencida em aberto no Isaac.</p>
                )}
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

                {serie && (
                  <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                    <p className="font-bold">Informação sobre a mensalidade</p>
                    <p className="mt-1">{origemDaCheia(serieAtual, serie as NomeSerie, REAJUSTE.promo, Number.isFinite(baseNum) ? baseNum : null)} Depois de 30/10: + {reais(REAJUSTE.depois)}.</p>
                  </div>
                )}
                {/* O desconto que a família tem hoje e mantém em 2027 */}
                <div className="space-y-2 rounded-xl border border-border/60 p-3 text-sm">
                  <p className="font-semibold">Desconto que a família tem hoje</p>
                  {abaixoDoTeto > 0 && (
                    <p className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      O boleto de hoje está {reais(abaixoDoTeto)} abaixo do teto ({teto !== null ? reais(teto) : "—"}). Isso não conta como desconto: na troca de segmento a conta parte do teto novo.
                    </p>
                  )}
                  <label className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground">
                      No pagamento até o dia 05, além da Fidelidade
                      {leitura.descontoPagamento === null
                        ? " (nunca pagou até o dia 05 em 2026)"
                        : ` (visto em ${leitura.pagamentosAte05} pagamento${leitura.pagamentosAte05 > 1 ? "s" : ""})`}
                    </span>
                    <input inputMode="decimal" value={descPag} onChange={(e) => setDescPag(e.target.value)} className="w-24 rounded-lg border border-border px-2 py-1 text-right font-bold outline-none focus:border-amadeus-blue" />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between gap-2 border-t border-border/60 pt-2 font-bold text-amadeus-blue">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" className="size-4 accent-[#083078]" checked={manterDesconto} onChange={(e) => setManterDesconto(e.target.checked)} />
                      Manter o desconto em 2027
                    </span>
                    <span className={`tabular-nums ${manterDesconto ? "" : "text-muted-foreground line-through"}`}>{reais(descontoPag)}</span>
                  </label>
                  {leitura.descontos.length > 0 && (
                    <p className="text-xs text-muted-foreground">No Activesoft: {leitura.descontos.join("; ")}.</p>
                  )}
                  <p className="text-xs text-muted-foreground">Desmarque para tirar o desconto (ex.: erro de lançamento). A carta sai só com a Fidelidade.</p>
                </div>

                {/* Irmão: só aparece aqui, não na carta */}
                <div className="space-y-2 rounded-xl border border-border/60 p-3 text-sm">
                  <p className="font-semibold">Irmãos na escola</p>
                  {leitura.irmaos.length ? (
                    <ul className="text-muted-foreground">
                      {leitura.irmaos.map((i) => <li key={i.nome}>{i.nome} · {i.serie}</li>)}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground">Nenhum irmão ativo encontrado pela filiação.</p>
                  )}
                  <label className="flex items-center gap-2 font-semibold">
                    <input type="checkbox" className="size-4 accent-[#083078]" checked={irmao} onChange={(e) => setIrmao(e.target.checked)} />
                    Somar desconto de irmão (− {reais(DESCONTO_IRMAO)} até o dia 05)
                  </label>
                  <p className="text-xs text-muted-foreground">Marque só se o desconto de hoje ainda não for o de irmão.</p>
                </div>
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
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground">Condição:</span>
                  {([
                    { v: "mensal", t: "Mensal" },
                    { v: "avista", t: "À vista (10%)" },
                  ] as const).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setTipo(o.v)}
                      className={`rounded-xl px-3 py-1.5 font-semibold ${tipo === o.v ? "bg-amadeus-yellow text-amadeus-blue" : "bg-amber-50 text-amber-900 hover:bg-amber-100"}`}
                    >
                      {o.t}
                    </button>
                  ))}
                </div>
                {tipo === "avista" ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ColunaAVista titulo={`Fechando até ${PRAZO_PROMOCAO}`} c={sim.promo} destaque />
                      <ColunaAVista titulo={`A partir de ${DEPOIS_DO_PRAZO}`} c={sim.depois} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Matrícula + 11 mensalidades pela mensalidade cheia, com 10% de desconto. Não soma Fidelidade, desconto da família nem de irmão.
                      {" "}Fechando no prazo, com os livros, a família economiza{" "}
                      <b className="text-amadeus-blue">{reais(condicaoAVista(sim.depois).comLivro - condicaoAVista(sim.promo).comLivro)}</b>.
                    </p>
                  </>
                ) : (
                <>
                <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground">Mostrar:</span>
                  {MODOS_LIVRO.map((m) => (
                    <button
                      key={m.valor}
                      type="button"
                      onClick={() => setModo(m.valor)}
                      className={`rounded-xl px-3 py-1.5 font-semibold ${modo === m.valor ? "bg-amadeus-blue text-white" : "bg-amadeus-blue-50/70 text-amadeus-blue hover:bg-amadeus-blue-50"}`}
                    >
                      {m.rotulo}
                    </button>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Coluna titulo={`Fechando até ${PRAZO_PROMOCAO}`} c={sim.promo} modo={modo} destaque />
                  <Coluna titulo={`A partir de ${DEPOIS_DO_PRAZO}`} c={sim.depois} modo={modo} />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Fechando no prazo, a família economiza <b className="text-amadeus-blue">{reais(economiaNoAno(sim, modo))}</b> no ano.
                  {" "}Todos os descontos valem só pagando até o dia 05.
                </p>
                </>
                )}
                <div className="mt-4 rounded-xl border border-border/60 bg-white p-3 text-sm">
                  <p className="font-bold text-amadeus-blue">Plano de pagamento no Activesoft</p>
                  <p className="mt-1 text-muted-foreground">Valor para selecionar ao concluir a matrícula (mensalidade cheia − {reais(DESCONTO_PLANO_ACTIVESOFT)}):</p>
                  <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
                    <span>Fechando até {PRAZO_PROMOCAO}: <b className="tabular-nums">{reais(planoActivesoft(sim.promo))}</b></span>
                    <span>A partir de {DEPOIS_DO_PRAZO}: <b className="tabular-nums">{reais(planoActivesoft(sim.depois))}</b></span>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button type="button" onClick={verImagem} disabled={abrindoPrevia} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60">
                    {abrindoPrevia ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Ver a imagem que vai no WhatsApp
                  </button>
                  {tipo === "mensal" && (
                    <a href={linkCarta} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50">
                      <Printer className="size-4" /> Imprimir carta para a família
                    </a>
                  )}
                  <button type="button" onClick={copiar} className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50">
                    {copiado ? <Check className="size-4" /> : <Copy className="size-4" />}
                    {copiado ? "Copiado" : "Copiar texto para o WhatsApp"}
                  </button>
                </div>
                <EnviarWhatsApp
                  responsaveis={novato ? [] : responsaveis}
                  envios={novato ? [] : envios}
                  rotuloCarta={tipo === "avista" ? "carta do pagamento à vista" : "carta com os valores"}
                  enviar={(destinos, soFolder) => enviarCarta({ ...dadosCarta!, somenteFolder: soFolder, destinos })}
                />
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
