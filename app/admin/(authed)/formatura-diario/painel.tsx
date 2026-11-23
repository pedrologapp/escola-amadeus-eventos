"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Download, ExternalLink, Image as ImagemIcone, Mic, Search, Trash2, Type, X } from "lucide-react";
import { apagarMensagem } from "./actions";
import { botaoApresentar, comLinks, marcaDoAmigo } from "@/lib/amigomagico/links";

export interface MensagemAdmin {
  id: string;
  tipo: "texto" | "foto" | "audio";
  texto: string | null;
  url: string | null;
  baixar: string | null;
  ext: string;
  duracao: number | null;
  criadoEm: string;
}

export interface AlunoAdmin {
  id: string;
  nome: string;
  curto: string;
  turma: "A" | "B";
  mensagens: MensagemAdmin[];
}

const FUSO = "America/Fortaleza";
const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const arquivoNome = (aluno: string, m: MensagemAdmin, i: number) =>
  `${semAcento(aluno).replace(/[^a-z0-9]+/g, "-")}_${m.tipo}-${String(i).padStart(2, "0")}.${m.ext || (m.tipo === "foto" ? "jpg" : "webm")}`;
const conta = (l: MensagemAdmin[], t: MensagemAdmin["tipo"]) => l.filter((m) => m.tipo === t).length;
const qtd = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** Baixa um por um (o navegador pede para permitir vários downloads na primeira vez). */
async function baixarTodos(aluno: AlunoAdmin) {
  const arquivos = aluno.mensagens.filter((m) => m.baixar);
  let i = 0;
  for (const m of arquivos) {
    i++;
    const a = document.createElement("a");
    a.href = m.baixar!;
    a.download = arquivoNome(aluno.nome, m, i);
    document.body.appendChild(a);
    a.click();
    a.remove();
    await new Promise((r) => setTimeout(r, 700));
  }
}

function Conversa({ aluno, fechar }: { aluno: AlunoAdmin; fechar: () => void }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const textos = aluno.mensagens.filter((m) => m.tipo === "texto").map((m) => m.texto).join("\n\n");
  const arquivos = aluno.mensagens.filter((m) => m.baixar).length;
  const apagar = (m: MensagemAdmin) => {
    if (!confirm("Apagar este registro? Não dá para desfazer.")) return;
    iniciar(async () => {
      const r = await apagarMensagem(m.id);
      setErro(r.ok ? null : r.erro);
    });
  };
  let n = 0;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={fechar}>
      <div className="flex h-full w-full max-w-xl flex-col bg-[#FBF7EE] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-border/60 bg-white p-4">
          <div>
            <p className="text-lg font-extrabold text-amadeus-blue">{aluno.nome}</p>
            <p className="text-xs text-muted-foreground">
              Grupo V {aluno.turma} · {qtd(conta(aluno.mensagens, "texto"), "texto", "textos")} · {qtd(conta(aluno.mensagens, "foto"), "foto", "fotos")} ·{" "}
              {qtd(conta(aluno.mensagens, "audio"), "áudio", "áudios")}
            </p>
          </div>
          <button onClick={fechar} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border/60 bg-white px-4 pb-3">
          <button
            disabled={!arquivos}
            onClick={() => baixarTodos(aluno)}
            className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Baixar fotos e áudios ({arquivos})
          </button>
          <button
            disabled={!textos}
            onClick={async () => {
              await navigator.clipboard.writeText(`${aluno.nome}\n\n${textos}`);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            }}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-amadeus-blue disabled:opacity-40"
          >
            {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar os textos
          </button>
        </div>
        {erro && <p className="bg-red-50 px-4 py-2 text-sm text-red-700">{erro}</p>}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {aluno.mensagens.length === 0 && <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>}
          {aluno.mensagens.map((m) => {
            if (m.baixar) n++;
            const i = n;
            return (
              <div key={m.id} className="rounded-2xl border border-border/60 bg-white p-3">
                {m.tipo === "texto" && <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{comLinks(marcaDoAmigo(m.texto ?? "").texto, "font-semibold text-amadeus-blue underline break-all")}{marcaDoAmigo(m.texto ?? "").slug && <span className="mt-1 block text-xs font-bold text-amber-700">Botão para a professora: {botaoApresentar(marcaDoAmigo(m.texto ?? "").slug!)}</span>}</p>}
                {m.tipo === "foto" && m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.url} alt="" className="max-h-[70vh] w-full rounded-xl object-contain" />
                  </a>
                )}
                {m.tipo === "audio" && m.url && <audio src={m.url} controls preload="metadata" className="w-full" />}
                <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {quando(m.criadoEm)}
                    {m.tipo === "audio" && m.duracao ? ` · ${mmss(m.duracao)}` : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    {m.baixar && (
                      <a href={m.baixar} download={arquivoNome(aluno.nome, m, i)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-amadeus-blue hover:bg-amadeus-blue-50">
                        <Download className="h-3.5 w-3.5" /> Baixar
                      </a>
                    )}
                    <button disabled={pendente} onClick={() => apagar(m)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" /> Apagar
                    </button>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function PainelDiario({ link, alunos }: { link: string; alunos: AlunoAdmin[] }) {
  const [turma, setTurma] = useState<"A" | "B">("A");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const daTurma = alunos.filter((a) => a.turma === turma);
  const q = semAcento(busca.trim());
  const lista = daTurma.filter((a) => !q || semAcento(a.nome).includes(q));
  const todas = alunos.flatMap((a) => a.mensagens);
  const comRegistro = alunos.filter((a) => a.mensagens.length).length;
  const atual = alunos.find((a) => a.id === aberto) ?? null;
  const botao = "inline-flex items-center gap-2 rounded-xl border border-border bg-white px-3 py-2 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-amadeus-blue p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-widest text-amadeus-yellow">Crianças com registro</p>
          <p className="mt-1 text-3xl font-extrabold">
            {comRegistro}
            <span className="text-lg opacity-70"> / {alunos.length}</span>
          </p>
        </div>
        {(
          [
            ["Textos", "texto"],
            ["Fotos", "foto"],
            ["Áudios", "audio"],
          ] as const
        ).map(([rotulo, t]) => (
          <div key={t} className="rounded-2xl border border-border/60 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{rotulo}</p>
            <p className="mt-1 text-3xl font-extrabold text-amadeus-blue">{conta(todas, t)}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-xl border border-border bg-white p-1">
          {(["A", "B"] as const).map((t) => (
            <button key={t} onClick={() => setTurma(t)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${turma === t ? "bg-amadeus-blue text-white" : "text-muted-foreground"}`}>
              Grupo V {t} ({alunos.filter((a) => a.turma === t).length})
            </button>
          ))}
        </div>
        <label className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar aluno" className="rounded-xl border border-border bg-white py-2 pl-8 pr-3 text-sm" />
        </label>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(link);
            setCopiado(true);
            setTimeout(() => setCopiado(false), 2000);
          }}
          className={botao}
        >
          {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copiar link do diário
        </button>
        <a href={link} target="_blank" rel="noreferrer" className={botao}>
          <ExternalLink className="h-4 w-4" /> Abrir o diário
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((a) => {
          const total = a.mensagens.length;
          const ultima = a.mensagens[total - 1];
          return (
            <button
              key={a.id}
              onClick={() => setAberto(a.id)}
              className={`rounded-2xl border p-4 text-left transition hover:shadow-md ${total ? "border-amadeus-blue/20 bg-white" : "border-border/60 bg-white/60"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-extrabold text-amadeus-blue">{a.nome}</p>
                <span className={`flex-none rounded-full px-2 py-0.5 text-xs font-bold ${total ? "bg-amadeus-yellow-100 text-amadeus-yellow-dark" : "bg-muted text-muted-foreground"}`}>
                  {total === 1 ? "1 registro" : `${total} registros`}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Type className="h-3.5 w-3.5" />{conta(a.mensagens, "texto")}</span>
                <span className="inline-flex items-center gap-1"><ImagemIcone className="h-3.5 w-3.5" />{conta(a.mensagens, "foto")}</span>
                <span className="inline-flex items-center gap-1"><Mic className="h-3.5 w-3.5" />{conta(a.mensagens, "audio")}</span>
                {ultima && <span className="ml-auto">{quando(ultima.criadoEm)}</span>}
              </div>
            </button>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Nenhum aluno.</p>}
      </div>

      {atual && <Conversa aluno={atual} fechar={() => setAberto(null)} />}
    </div>
  );
}
