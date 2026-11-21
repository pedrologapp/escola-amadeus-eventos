"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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

export function ListaEnvio({ alunos, texto, imagem, respostas }: { alunos: AlunoContatos[]; texto: string; imagem: string; respostas: Record<string, RespostaPai> }) {
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
  const esperando = lista.filter((r) => !r.respondida).length;

  return (
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
          {esperando > 0 ? <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-800">{esperando} esperando sua resposta</span> : null}
          {" "}<Link href="/admin/comunicacao/whatsapp" className="ml-2 font-semibold text-amadeus-blue underline">Abrir o painel do WhatsApp</Link>
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
                    {c.celular && respostas[c.celular] && (() => {
                      const r = respostas[c.celular!];
                      return (
                        <div className={`w-full rounded-lg px-3 py-2 ${r.respondida ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                          <p className="font-bold">
                            {r.respondida ? "Respondeu e já teve resposta" : "Respondeu e está esperando você"}
                            <span className="font-normal text-muted-foreground"> · {hora(r.ultimaEm)}{r.msgs > 1 ? ` · ${r.msgs} mensagens` : ""}</span>
                          </p>
                          {r.resumo && <p className="mt-0.5">{r.resumo}</p>}
                          <a href={`https://wa.me/55${c.celular}`} target="_blank" rel="noopener noreferrer" className={`${botao} mt-2 bg-[#1F8F4E] text-white`}>
                            Responder no WhatsApp
                          </a>
                        </div>
                      );
                    })()}
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
  );
}
