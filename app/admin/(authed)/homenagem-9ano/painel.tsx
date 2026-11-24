"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, ExternalLink, RotateCcw, Search, Undo2 } from "lucide-react";
import type { StatusParte } from "@/lib/homenagem-9ano-texto";
import { avaliarParte } from "./actions";

interface Arquivo {
  ver: string | null;
  baixar: string | null;
  ext: string;
}

export interface EnvioAdmin {
  id: string;
  alunoId: number;
  aluno: string;
  quem: string;
  parte1: Arquivo | null;
  parte2: Arquivo | null;
  status1: StatusParte;
  status2: StatusParte;
  observacao1: string | null;
  observacao2: string | null;
  fotos: Arquivo[];
  quando: string;
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const nomeArquivo = (aluno: string, quem: string, parte: string, ext: string) =>
  `${semAcento(aluno).replace(/[^a-z0-9]+/g, "-")}_${semAcento(quem).replace(/[^a-z0-9]+/g, "-")}_${parte}.${ext}`;

function Parte({ envio, n }: { envio: EnvioAdmin; n: 1 | 2 }) {
  const arq = n === 1 ? envio.parte1 : envio.parte2;
  const status = n === 1 ? envio.status1 : envio.status2;
  const obs = n === 1 ? envio.observacao1 : envio.observacao2;
  const [pedindo, setPedindo] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const mudar = (s: "aprovado" | "refazer" | "pendente", m?: string) =>
    iniciar(async () => {
      const r = await avaliarParte(envio.id, n, s, m);
      if (!r.ok) setErro(r.erro);
      else { setErro(null); setPedindo(false); setMotivo(""); }
    });

  const selo =
    !arq ? <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground">Não enviou</span>
    : status === "aprovado" ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Aprovado</span>
    : status === "refazer" ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800">Pediu para refazer</span>
    : <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">Para conferir</span>;

  return (
    <div className="rounded-xl border border-border/60 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-amadeus-blue">{n === 1 ? "Parte 1 · Mensagem" : "Parte 2 · Poema"}</p>
        {selo}
      </div>
      {arq?.ver ? (
        <video src={arq.ver} controls playsInline preload="metadata" className="mt-2 aspect-video w-full rounded-lg bg-black object-contain" />
      ) : (
        <div className="mt-2 grid aspect-video w-full place-items-center rounded-lg bg-muted text-sm text-muted-foreground">Sem vídeo</div>
      )}
      {status === "refazer" && obs && <p className="mt-2 text-xs text-red-800">Motivo: {obs}</p>}
      {erro && <p className="mt-2 text-xs text-red-700">{erro}</p>}
      {arq && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {status !== "aprovado" && (
            <button disabled={pendente} onClick={() => mudar("aprovado")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              <Check className="h-3.5 w-3.5" /> Aprovar
            </button>
          )}
          {status !== "refazer" && (
            <button disabled={pendente} onClick={() => setPedindo((v) => !v)} className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" /> Pedir para gravar de novo
            </button>
          )}
          {status !== "pendente" && (
            <button disabled={pendente} onClick={() => mudar("pendente")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground disabled:opacity-50">
              <Undo2 className="h-3.5 w-3.5" /> Desfazer
            </button>
          )}
          {arq.baixar && (
            <a href={arq.baixar} download={nomeArquivo(envio.aluno, envio.quem, `parte${n}`, arq.ext)} className="ml-auto inline-flex items-center gap-1 text-xs font-bold text-amadeus-blue hover:underline">
              <Download className="h-3.5 w-3.5" /> Baixar
            </a>
          )}
        </div>
      )}
      {pedindo && (
        <div className="mt-2 space-y-2">
          <input
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (a família vai ler). Ex.: o som ficou baixo, grave num lugar mais silencioso."
            className="w-full rounded-lg border border-border px-2.5 py-2 text-sm"
          />
          <button disabled={pendente || motivo.trim().length < 5} onClick={() => mudar("refazer", motivo)} className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
            Enviar pedido
          </button>
        </div>
      )}
    </div>
  );
}

export function PainelHomenagem({ link, turma, envios }: { link: string; turma: { id: number; nome: string }[]; envios: EnvioAdmin[] }) {
  const [aba, setAba] = useState<"enviaram" | "faltam">("enviaram");
  const [busca, setBusca] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const comEnvio = new Set(envios.filter((e) => e.parte1 || e.parte2).map((e) => e.alunoId));
  const faltam = turma.filter((a) => !comEnvio.has(a.id));
  const poemas = envios.filter((e) => e.parte2).length;
  const aprovados = envios.filter((e) => e.status2 === "aprovado" && e.parte2).length;
  const conferir = envios.reduce((n, e) => n + (e.parte1 && e.status1 === "pendente" ? 1 : 0) + (e.parte2 && e.status2 === "pendente" ? 1 : 0), 0);

  const texto = [
    "Queridas famílias do 9º ano,",
    "",
    "Estamos preparando uma surpresa para o último dia de aula (sexta, 27/11): um vídeo com a voz de todas as famílias da turma.",
    "",
    "Pedimos que cada família grave uma mensagem curta para o filho ou a filha e leia um poema que preparamos. É tudo pelo celular, em uns 10 minutos:",
    "",
    link,
    "",
    "Para entrar, usem o nome do aluno e a data de nascimento dele.",
    "",
    "*É surpresa: não contem para eles!*",
  ].join("\n");
  const copiar = async (o: string, t: string) => {
    await navigator.clipboard.writeText(t);
    setCopiado(o);
    setTimeout(() => setCopiado(null), 2000);
  };

  const q = semAcento(busca.trim());
  const lista = envios.filter((e) => !q || semAcento(`${e.aluno} ${e.quem}`).includes(q));
  const listaFaltam = faltam.filter((a) => !q || semAcento(a.nome).includes(q));
  const botao = "inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-amadeus-blue p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-amadeus-yellow">Famílias que enviaram</p>
          <p className="mt-1 text-3xl font-extrabold">{comEnvio.size}<span className="text-lg opacity-70"> / {turma.length}</span></p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Vozes no poema</p>
          <p className="mt-1 text-3xl font-extrabold text-amadeus-blue">{poemas}</p>
          <p className="text-xs text-muted-foreground">{aprovados} aprovadas · 16 versos</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Para conferir</p>
          <p className="mt-1 text-3xl font-extrabold text-amber-700">{conferir}</p>
        </div>
        <div className="rounded-2xl border border-border/60 bg-white p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Faltam</p>
          <p className="mt-1 text-3xl font-extrabold text-amadeus-blue">{faltam.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => copiar("texto", texto)} className={botao}>
          {copiado === "texto" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar mensagem do WhatsApp
        </button>
        <button onClick={() => copiar("link", link)} className={botao}>
          {copiado === "link" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar link
        </button>
        <a href={link} target="_blank" rel="noreferrer" className={botao}>
          <ExternalLink className="h-4 w-4" /> Abrir a página dos pais
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-white p-1">
          {(["enviaram", "faltam"] as const).map((a) => (
            <button key={a} onClick={() => setAba(a)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${aba === a ? "bg-amadeus-blue text-white" : "text-muted-foreground"}`}>
              {a === "enviaram" ? `Envios (${envios.length})` : `Faltam (${faltam.length})`}
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="rounded-xl border border-border bg-white py-2 pl-8 pr-3 text-sm" />
        </label>
        {aba === "faltam" && faltam.length > 0 && (
          <button onClick={() => copiar("faltam", faltam.map((a) => a.nome).join("\n"))} className={botao}>
            {copiado === "faltam" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar nomes
          </button>
        )}
      </div>

      {aba === "enviaram" && (
        <div className="space-y-4">
          {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum envio ainda.</p>}
          {lista.map((e) => (
            <div key={e.id} className="rounded-2xl border border-border/60 bg-[#FBF7EE] p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base font-extrabold text-amadeus-blue">
                  {e.aluno} <span className="font-semibold text-muted-foreground">· {e.quem}</span>
                </p>
                <p className="text-xs text-muted-foreground">Atualizado {quando(e.quando)}</p>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <Parte envio={e} n={1} />
                <Parte envio={e} n={2} />
              </div>
              {e.fotos.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Fotos ({e.fotos.length})</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.fotos.map((f, i) => (
                      <a key={i} href={f.baixar ?? f.ver ?? "#"} download={nomeArquivo(e.aluno, e.quem, `foto-${i + 1}`, f.ext)} title="Baixar">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {f.ver && <img src={f.ver} alt="" className="h-20 w-20 rounded-lg object-cover" />}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {aba === "faltam" && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {listaFaltam.map((a) => (
            <p key={a.id} className="rounded-xl border border-border/60 bg-white px-3 py-2 text-sm font-semibold text-amadeus-blue">{a.nome}</p>
          ))}
        </div>
      )}
    </div>
  );
}
