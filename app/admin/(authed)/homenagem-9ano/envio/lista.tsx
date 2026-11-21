"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarResolvida } from "./actions";
import type { AlunoContatos, RespostaPai } from "@/lib/homenagem-9ano-envio";

const CHAVE = "convite-9ano-enviados";
const telLegivel = (t: string) => `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}`;

function ler(): Record<string, 1> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) || "{}");
  } catch {
    return {};
  }
}

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Recife", weekday: "short", hour: "2-digit", minute: "2-digit" });

export function ListaEnvio({ alunos, texto, imagem, respostas, gravaram }: { alunos: AlunoContatos[]; texto: string; imagem: string; respostas: Record<string, RespostaPai>; gravaram: number[] }) {
  const [aba, setAba] = useState<"enviar" | "respostas">("enviar");
  const [feitos, setFeitos] = useState<Record<string, 1>>({});
  const [aviso, setAviso] = useState("");
  const [podeCompartilhar, setPodeCompartilhar] = useState(false);
  // a imagem já fica carregada para o clique em "Abrir no WhatsApp" copiar na hora
  const imgPronta = useRef<Blob | null>(null);
  useEffect(() => {
    fetch(imagem).then((r) => r.blob()).then((b) => (imgPronta.current = b)).catch(() => {});
  }, [imagem]);

  // lê a marca deste aparelho depois de montar (localStorage não existe no servidor)
  useEffect(() => {
    const t = setTimeout(() => {
      setFeitos(ler());
      setPodeCompartilhar("canShare" in navigator && /Android|iPhone|iPad/i.test(navigator.userAgent));
    }, 0);
    return () => clearTimeout(t);
  }, []);

  const grava = (o: Record<string, 1>) => {
    setFeitos(o);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(o));
    } catch {}
  };
  const marca = (t: string, sim = true) => {
    const o = { ...feitos };
    if (sim) o[t] = 1;
    else delete o[t];
    grava(o);
  };

  const blob = async () => (await fetch(imagem)).blob();
  const copiaImg = async () => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": await blob() })]);
      setAviso("Imagem copiada: cole com Ctrl+V na conversa.");
    } catch {
      setAviso("Não deu para copiar aqui. Use Baixar a imagem.");
    }
  };
  const copiaTxt = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Texto copiado.");
    } catch {
      setAviso("Não deu para copiar o texto aqui.");
    }
  };
  // ao abrir a conversa: o texto vai no link e a imagem fica copiada (no computador é só Ctrl+V)
  const abrir = (cel: string) => {
    marca(cel);
    if (podeCompartilhar) return;
    try {
      const b = imgPronta.current;
      const item = new ClipboardItem({ "image/png": b ?? fetch(imagem).then((r) => r.blob()) });
      navigator.clipboard.write([item]).then(
        () => setAviso("Imagem copiada: na conversa, aperte Ctrl+V e depois Enter."),
        () => setAviso("Não deu para copiar a imagem. Use Copiar a imagem."),
      );
    } catch {
      setAviso("Não deu para copiar a imagem. Use Copiar a imagem.");
    }
  };
  const compartilha = async () => {
    try {
      const f = new File([await blob()], "homenagem-9ano.png", { type: "image/png" });
      await navigator.share({ files: [f], text: texto });
    } catch {}
  };

  const total = alunos.reduce((s, a) => s + a.contatos.filter((c) => c.celular).length, 0);
  const enviados = alunos.reduce((s, a) => s + a.contatos.filter((c) => c.celular && feitos[c.celular]).length, 0);
  const botao = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold";
  const lista = Object.values(respostas);
  const esperando = lista.filter((r) => r.estado === "esperando").length;
  const abaCls = (k: string) => `min-h-11 rounded-t-xl px-4 text-sm font-bold ${aba === k ? "bg-white text-amadeus-blue" : "text-muted-foreground hover:text-amadeus-blue"}`;

  return (
    <>
    <div className="mt-6 flex gap-1 border-b border-border/60">
      <button type="button" className={abaCls("enviar")} onClick={() => setAba("enviar")}>Enviar convite</button>
      <button type="button" className={abaCls("respostas")} onClick={() => setAba("respostas")}>
        Respostas ({lista.length})
        {esperando > 0 && <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">{esperando}</span>}
      </button>
    </div>
    {aba === "respostas" ? (
      <Respostas alunos={alunos} respostas={respostas} gravaram={gravaram} />
    ) : (
    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagem} alt="Imagem do convite" className="w-full max-w-xs rounded-xl shadow-md lg:max-w-none" />
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
          <button type="button" onClick={copiaImg} className={`${botao} bg-amadeus-blue text-white`}>Copiar a imagem</button>
          <a href={imagem} download="Homenagem 9º ano.png" className={`${botao} bg-amadeus-blue text-white`}>Baixar a imagem</a>
          <button type="button" onClick={copiaTxt} className={`${botao} bg-amadeus-blue text-white`}>Copiar o texto</button>
          {podeCompartilhar && (
            <button type="button" onClick={compartilha} className={`${botao} bg-amadeus-blue text-white`}>Imagem e texto juntos</button>
          )}
        </div>
        {aviso && <p className="text-sm text-amber-700">{aviso}</p>}
        <div className="rounded-xl bg-white p-4 text-sm">
          <b>Como enviar</b>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            <li>Clique em <b>Abrir no WhatsApp</b>: abre a conversa com o texto já escrito e a imagem já fica copiada.</li>
            <li>No computador, na conversa: <b>Ctrl+V</b> para a imagem entrar e <b>Enter</b> para enviar. No celular, <b>Baixar a imagem</b> uma vez e anexar pela galeria.</li>
            <li>Envie e volte aqui: a linha fica verde. A marca fica guardada neste aparelho.</li>
          </ol>
        </div>
      </div>

      <div>
        <p className="font-bold text-amadeus-blue">{enviados} de {total} enviados</p>
        <p className="mb-3 text-sm">
          <b>{lista.length}</b> responderam
          {esperando > 0 ? <button type="button" onClick={() => setAba("respostas")} className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">{esperando} esperando sua resposta</button> : null}
        </p>
        <div className="space-y-2">
          {alunos.map((a) => (
            <div key={a.nome} className="rounded-xl bg-white p-3">
              <p className="font-bold">{a.nome}</p>
              {!a.contatos.length && <p className="mt-1 text-sm text-amber-700">Sem celular no cadastro: pedir à secretaria.</p>}
              {a.contatos.map((c, i) => {
                const feito = !!(c.celular && feitos[c.celular]);
                return (
                  <div key={i} className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg px-2 py-2 text-sm ${feito ? "bg-emerald-50 text-emerald-800" : ""}`}>
                    <span className="min-w-40 flex-1">
                      {c.nome}
                      {c.celular ? <span className="text-muted-foreground"> · {telLegivel(c.celular)}</span> : null}
                      {c.semNove && <span className="block text-xs text-amber-700">Cadastro sem o 9: conferir o número</span>}
                      {!c.celular && <span className="block text-xs text-amber-700">Número com erro no cadastro</span>}
                    </span>
                    {c.celular && respostas[c.celular] && (
                      <button type="button" onClick={() => setAba("respostas")} className={`rounded-full px-3 py-1 text-xs font-bold ${respostas[c.celular].estado === "esperando" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
                        {respostas[c.celular].estado === "esperando" ? "Respondeu: esperando você" : "Respondeu"}
                      </button>
                    )}
                    {c.celular && (
                      <>
                        <a
                          href={`https://wa.me/55${c.celular}?text=${encodeURIComponent(texto)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => abrir(c.celular!)}
                          className={`${botao} bg-[#1F8F4E] text-white`}
                        >
                          Abrir no WhatsApp
                        </a>
                        <label className="flex items-center gap-1">
                          <input type="checkbox" checked={feito} onChange={(e) => marca(c.celular!, e.target.checked)} /> enviado
                        </label>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
    )}
    </>
  );
}

type Filtro = "esperando" | "respondida" | "resolvida" | "sem";
const ROTULO: Record<RespostaPai["estado"], { t: string; c: string }> = {
  esperando: { t: "Esperando você", c: "bg-amber-100 text-amber-800" },
  respondida: { t: "Você já respondeu", c: "bg-sky-100 text-sky-800" },
  resolvida: { t: "Resolvida", c: "bg-emerald-100 text-emerald-800" },
};

/** Aba Respostas: quem respondeu o convite no WhatsApp comercial, para responder e marcar como resolvida. */
function Respostas({ alunos, respostas, gravaram }: { alunos: AlunoContatos[]; respostas: Record<string, RespostaPai>; gravaram: number[] }) {
  const router = useRouter();
  const [pendente, comecar] = useTransition();
  const gravou = new Set(gravaram);
  const linhas = alunos.flatMap((a) => a.contatos.filter((c) => c.celular).map((c) => ({ aluno: a, c, r: respostas[c.celular!] as RespostaPai | undefined })));
  const cont: Record<Filtro, number> = { esperando: 0, respondida: 0, resolvida: 0, sem: 0 };
  for (const l of linhas) cont[l.r ? l.r.estado : "sem"]++;
  const [filtro, setFiltro] = useState<Filtro>(cont.esperando ? "esperando" : cont.respondida ? "respondida" : "sem");
  const vis = linhas
    .filter((l) => (l.r ? l.r.estado : "sem") === filtro)
    .sort((x, y) => (y.r?.ultimaEm ?? "").localeCompare(x.r?.ultimaEm ?? "") || x.aluno.nome.localeCompare(y.aluno.nome, "pt-BR"));
  const marcar = (chat: string, sim: boolean) =>
    comecar(async () => {
      await marcarResolvida(chat, sim);
      router.refresh();
    });
  const chip = (k: Filtro, t: string) => (
    <button
      type="button"
      onClick={() => setFiltro(k)}
      className={`min-h-11 rounded-xl border px-4 text-sm font-bold ${filtro === k ? "border-amadeus-blue bg-amadeus-blue text-white" : "border-border bg-white text-amadeus-blue"}`}
    >
      {t} ({cont[k]})
    </button>
  );
  const btn = "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-bold";
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">
        Respostas que chegaram no WhatsApp comercial desde o envio do convite. Atualiza a cada 5 minutos: recarregue a página para ver as novas. O painel guarda um
        resumo do que o pai escreveu, não o texto inteiro.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {chip("esperando", "Esperando você")}
        {chip("respondida", "Você já respondeu")}
        {chip("resolvida", "Resolvidas")}
        {chip("sem", "Ainda não responderam")}
      </div>
      <div className="mt-4 space-y-2">
        {!vis.length && <p className="rounded-xl bg-white p-4 text-sm text-muted-foreground">Ninguém aqui por enquanto.</p>}
        {vis.map(({ aluno, c, r }) => (
          <div key={c.celular} className="rounded-xl bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold">{aluno.nome}</p>
              {gravou.has(aluno.id) ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">Já gravou o vídeo</span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">Ainda não gravou</span>
              )}
              {r && <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${ROTULO[r.estado].c}`}>{ROTULO[r.estado].t}</span>}
            </div>
            <p className="mt-1 text-muted-foreground">
              {c.nome} · {telLegivel(c.celular!)}
            </p>
            {r && (
              <div className="mt-2 rounded-lg bg-[#F7F3EA] px-3 py-2">
                <p className="text-xs text-muted-foreground">
                  {hora(r.ultimaEm)}
                  {r.msgs > 1 ? ` · ${r.msgs} mensagens` : ""}
                  {r.assunto ? ` · ${r.assunto}` : ""}
                </p>
                <p className="mt-0.5">{r.resumo ?? "Sem resumo (pode ser áudio, foto ou figurinha)."}</p>
              </div>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`https://wa.me/55${c.celular}`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#1F8F4E] text-white`}>
                Responder no WhatsApp
              </a>
              {r && r.estado !== "resolvida" && (
                <button type="button" disabled={pendente} onClick={() => marcar(r.chatId, true)} className={`${btn} border border-border bg-white text-amadeus-blue`}>
                  Marcar como resolvida
                </button>
              )}
              {r && r.estado === "resolvida" && (
                <button type="button" disabled={pendente} onClick={() => marcar(r.chatId, false)} className={`${btn} border border-border bg-white text-muted-foreground`}>
                  Reabrir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
