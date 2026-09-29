"use client";

import { useState, useTransition } from "react";
import { BellRing, Download, Loader2, Send, Trash2, UserPlus, Users } from "lucide-react";
import {
  enviarExperiencia,
  incluirContatos,
  lembreteAgora,
  marcarLembrar,
  mudarAutomatico,
  removerContato,
  type ResultadoExp,
} from "./actions";

export interface ContatoExp {
  telefone: string;
  responsavel: string | null;
  crianca: string | null;
  serie: string | null;
  origem: string;
  lembrar: boolean;
  convite_em: string | null;
  lembrete_em: string | null;
  criado_em: string;
  ultimo?: string | null;
}
export interface Candidato { telefone: string; responsavel: string | null; crianca: string | null; serie: string | null; quando: string }

const tel = (t: string) => (t.length === 11 ? `(${t.slice(0, 2)}) ${t.slice(2, 7)}-${t.slice(7)}` : t.length === 10 ? `(${t.slice(0, 2)}) ${t.slice(2, 6)}-${t.slice(6)}` : t);
const dia = (d: string | null) => (d ? new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Fortaleza" }) : null);
const ORIGEM: Record<string, string> = { novato: "novato", simulador: "rematrícula", avulso: "avulso", manual: "manual" };
const SELO: Record<string, string> = { enviado: "bg-emerald-50 text-emerald-700", sem_whatsapp: "bg-amber-100 text-amber-800", erro: "bg-red-50 text-red-700" };
const TXT: Record<string, string> = { enviado: "Enviado", sem_whatsapp: "Sem WhatsApp", erro: "Erro" };
const campo = "mt-1 w-full rounded-xl border border-border bg-white px-3 py-2 font-normal outline-none focus:border-amadeus-blue";

/** Qual encarte vai: o convite "Mãe, pai", o original ou os dois (um depois do outro). */
export function EscolhaEncarte({ valor, mudar }: { valor: string; mudar: (v: string) => void }) {
  const opcoes = [
    { v: "convite", t: "Convite “Mãe, pai”", img: "/materiais/experiencia-convite.png" },
    { v: "original", t: "Encarte original", img: "/materiais/experiencia-original.png" },
    { v: "os_dois", t: "Os dois", img: null },
  ];
  return (
    <div className="flex flex-wrap gap-2">
      {opcoes.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => mudar(o.v)}
          className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 text-sm font-semibold ${valor === o.v ? "border-amadeus-blue bg-amadeus-blue text-white" : "border-border bg-white text-amadeus-blue hover:bg-amadeus-blue-50"}`}
        >
          {o.img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.img} alt="" className="h-10 w-7 rounded object-cover" />
          ) : (
            <span className="flex">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/materiais/experiencia-convite.png" alt="" className="h-10 w-7 rounded object-cover" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/materiais/experiencia-original.png" alt="" className="-ml-3 h-10 w-7 rounded object-cover ring-2 ring-white" />
            </span>
          )}
          {o.t}
        </button>
      ))}
    </div>
  );
}

function Resultados({ r }: { r: { erro?: string; resultados: ResultadoExp[] } | null }) {
  if (!r) return null;
  return (
    <div className="mt-3 space-y-1 text-sm">
      {r.erro && <p className="text-red-700">{r.erro}</p>}
      {r.resultados.map((x) => (
        <p key={x.telefone}>
          {tel(x.telefone)} <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${SELO[x.status]}`}>{TXT[x.status]}</span>
          {x.status === "erro" && x.detalhe && <span className="ml-2 text-xs text-muted-foreground">{x.detalhe}</span>}
        </p>
      ))}
    </div>
  );
}

export function PainelExperiencia({ contatos, candidatos, automatico }: { contatos: ContatoExp[]; candidatos: Candidato[]; automatico: boolean }) {
  const [escolha, setEscolha] = useState("convite");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [novo, setNovo] = useState({ responsavel: "", crianca: "", serie: "", telefone: "" });
  const [retorno, setRetorno] = useState<{ erro?: string; resultados: ResultadoExp[] } | null>(null);
  const [retornoLembrete, setRetornoLembrete] = useState<{ erro?: string; resultados: ResultadoExp[] } | null>(null);
  const [ocupado, iniciar] = useTransition();

  const pendentesLembrete = contatos.filter((c) => c.lembrar && c.convite_em && !c.lembrete_em).length;
  const selecionados = contatos.filter((c) => marcados.has(c.telefone));
  const nomeEncarte = escolha === "os_dois" ? "os dois encartes" : escolha === "original" ? "o encarte original" : "o convite “Mãe, pai”";

  const enviarSelecionados = () => {
    const ja = selecionados.filter((c) => c.convite_em).length;
    if (!window.confirm(`Enviar ${nomeEncarte} para ${selecionados.length} número(s) pelo WhatsApp da escola?${ja ? `\n\n${ja} já recebeu encarte antes.` : ""}\n\nEntre um número e outro há uma pausa de alguns segundos.`)) return;
    iniciar(async () => {
      setRetorno(null);
      const r: { erro?: string; resultados: ResultadoExp[] } = { resultados: [] };
      // Um contato por vez, cada um com o nome da própria criança na mensagem.
      for (const [i, c] of selecionados.entries()) {
        // pausa entre um número e outro, para o WhatsApp da escola não ser marcado como spam
        if (i > 0) await new Promise((ok) => setTimeout(ok, 6000 + Math.random() * 6000));
        const x = await enviarExperiencia({ destinos: [{ telefone: c.telefone, nome: c.responsavel }], crianca: c.crianca, serie: c.serie, escolha });
        if (x.erro) r.erro = x.erro;
        r.resultados.push(...x.resultados);
        setRetorno({ ...r, resultados: [...r.resultados] });
      }
      setMarcados(new Set());
    });
  };

  const salvarNovo = (enviar: boolean) => {
    if (novo.telefone.replace(/\D/g, "").length < 10) return window.alert("Digite o número com DDD.");
    if (enviar && !window.confirm(`Enviar ${nomeEncarte} para ${novo.telefone} pelo WhatsApp da escola?`)) return;
    iniciar(async () => {
      if (enviar) {
        setRetorno(await enviarExperiencia({ destinos: [{ telefone: novo.telefone, nome: novo.responsavel || null }], crianca: novo.crianca, serie: novo.serie, escolha, origem: "avulso" }));
      } else {
        await incluirContatos([{ ...novo, origem: "manual" }]);
      }
      setNovo({ responsavel: "", crianca: "", serie: "", telefone: "" });
    });
  };

  const baixarPlanilha = () => {
    const linhas = [["Responsável", "Criança", "Série", "Telefone", "Origem", "Encarte", "Lembrete"], ...contatos.map((c) => [c.responsavel ?? "", c.crianca ?? "", c.serie ?? "", tel(c.telefone), ORIGEM[c.origem] ?? c.origem, dia(c.convite_em) ?? "", dia(c.lembrete_em) ?? ""])];
    const csv = "﻿" + linhas.map((l) => l.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "contatos-experiencia-amadeus.csv";
    a.click();
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {/* Novo número */}
        <section className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amadeus-blue"><Send className="size-4" /> Enviar o encarte da Experiência</p>
          <div className="mt-3"><EscolhaEncarte valor={escolha} mudar={setEscolha} /></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Número (DDD + celular)<input value={novo.telefone} onChange={(e) => setNovo({ ...novo, telefone: e.target.value })} inputMode="tel" placeholder="84 99999-9999" className={campo} /></label>
            <label className="text-sm font-semibold">Responsável <span className="font-normal text-muted-foreground">(opcional)</span><input value={novo.responsavel} onChange={(e) => setNovo({ ...novo, responsavel: e.target.value })} className={campo} /></label>
            <label className="text-sm font-semibold">Nome da criança <span className="font-normal text-muted-foreground">(opcional)</span><input value={novo.crianca} onChange={(e) => setNovo({ ...novo, crianca: e.target.value })} className={campo} /></label>
            <label className="text-sm font-semibold">Série <span className="font-normal text-muted-foreground">(opcional)</span><input value={novo.serie} onChange={(e) => setNovo({ ...novo, serie: e.target.value })} placeholder="ex.: 1º Ano" className={campo} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" disabled={ocupado} onClick={() => salvarNovo(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-40">
              {ocupado ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar e guardar
            </button>
            <button type="button" disabled={ocupado} onClick={() => salvarNovo(false)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50 disabled:opacity-40">
              <UserPlus className="size-4" /> Só guardar o contato
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">A mensagem convida para sábado, 10/10, às 14h, pede para confirmar respondendo e leva o endereço com o mapa.</p>
          <Resultados r={retorno} />
        </section>

        {/* Lista de contatos */}
        <section className="rounded-2xl border border-border/60 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-bold text-amadeus-blue"><Users className="size-4" /> Contatos da Experiência · {contatos.length}</p>
            <div className="flex flex-wrap gap-2">
              {selecionados.length > 0 && (
                <button type="button" disabled={ocupado} onClick={enviarSelecionados} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
                  <Send className="size-4" /> Enviar encarte para {selecionados.length}
                </button>
              )}
              {contatos.length > 0 && (
                <button type="button" onClick={baixarPlanilha} className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50">
                  <Download className="size-4" /> Baixar planilha
                </button>
              )}
            </div>
          </div>
          {contatos.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Ninguém ainda. Todo número que receber o encarte entra aqui sozinho.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2">
                      <input type="checkbox" className="size-4 accent-[#083078]" checked={marcados.size === contatos.length} onChange={(e) => setMarcados(e.target.checked ? new Set(contatos.map((c) => c.telefone)) : new Set())} />
                    </th>
                    <th className="py-2 pr-3">Família</th>
                    <th className="py-2 pr-3">Telefone</th>
                    <th className="py-2 pr-3">Encarte</th>
                    <th className="py-2 pr-3">Lembrete</th>
                    <th className="py-2 pr-3">Lembrar?</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {contatos.map((c) => (
                    <tr key={c.telefone} className="border-b border-border/40 last:border-0">
                      <td className="py-2.5 pr-2">
                        <input type="checkbox" className="size-4 accent-[#083078]" checked={marcados.has(c.telefone)} onChange={(e) => { const s = new Set(marcados); if (e.target.checked) s.add(c.telefone); else s.delete(c.telefone); setMarcados(s); }} />
                      </td>
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold">{c.crianca ?? "—"}{c.serie ? <span className="font-normal text-muted-foreground"> · {c.serie}</span> : null}</p>
                        <p className="text-xs text-muted-foreground">{c.responsavel ?? "responsável não informado"} · {ORIGEM[c.origem] ?? c.origem}</p>
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{tel(c.telefone)}</td>
                      <td className="py-2.5 pr-3">
                        {c.convite_em ? <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${SELO.enviado}`}>{dia(c.convite_em)}</span>
                          : c.ultimo ? <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${SELO[c.ultimo]}`}>{TXT[c.ultimo]}</span>
                          : <span className="text-xs text-muted-foreground">não enviado</span>}
                      </td>
                      <td className="py-2.5 pr-3">{c.lembrete_em ? <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${SELO.enviado}`}>{dia(c.lembrete_em)}</span> : <span className="text-xs text-muted-foreground">—</span>}</td>
                      <td className="py-2.5 pr-3">
                        <input type="checkbox" className="size-4 accent-[#083078]" checked={c.lembrar} disabled={ocupado} onChange={(e) => iniciar(() => marcarLembrar(c.telefone, e.target.checked))} />
                      </td>
                      <td className="py-2.5 text-right">
                        <button type="button" aria-label="Tirar da lista" disabled={ocupado} onClick={() => window.confirm(`Tirar ${tel(c.telefone)} da lista?`) && iniciar(() => removerContato(c.telefone))} className="text-muted-foreground hover:text-red-600">
                          <Trash2 className="size-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        {/* Lembrete da véspera */}
        <section className="rounded-2xl border border-border/60 bg-white p-5">
          <p className="flex items-center gap-2 text-sm font-bold text-amadeus-blue"><BellRing className="size-4" /> Lembrete da véspera</p>
          <label className="mt-3 flex cursor-pointer items-center gap-3 text-sm">
            <input type="checkbox" className="size-4 accent-[#083078]" checked={automatico} disabled={ocupado} onChange={(e) => iniciar(() => mudarAutomatico(e.target.checked))} />
            <span><b>Automático</b> na sexta, 09/10, às 9h</span>
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Vai para quem recebeu o encarte e está com “Lembrar?” marcado. Mensagem: “é amanhã, sábado (10/10), às 14h…” com o convite e o mapa.
            {" "}<b className="text-amadeus-blue">{pendentesLembrete}</b> na fila agora.
          </p>
          <button
            type="button"
            disabled={ocupado || pendentesLembrete === 0}
            onClick={() => window.confirm(`Mandar o lembrete AGORA para ${pendentesLembrete} número(s)?`) && iniciar(async () => setRetornoLembrete(await lembreteAgora()))}
            className="mt-3 inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-bold text-amadeus-blue hover:bg-amadeus-blue-50 disabled:opacity-40"
          >
            <BellRing className="size-4" /> Enviar lembrete agora
          </button>
          <Resultados r={retornoLembrete} />
        </section>

        {/* Novatos fora da lista */}
        {candidatos.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5">
            <p className="text-sm font-bold text-amadeus-blue">Novatos que receberam a carta e não estão na lista</p>
            <ul className="mt-3 space-y-2 text-sm">
              {candidatos.map((c) => (
                <li key={c.telefone} className="flex items-center justify-between gap-2">
                  <span>{c.crianca ?? "(só o folder)"}{c.serie ? ` · ${c.serie}` : ""} <span className="text-muted-foreground">· {tel(c.telefone)}</span></span>
                  <button type="button" disabled={ocupado} onClick={() => iniciar(async () => { await incluirContatos([{ ...c, origem: "novato" }]); })} className="text-xs font-bold text-amadeus-blue underline">incluir</button>
                </li>
              ))}
            </ul>
            <button type="button" disabled={ocupado} onClick={() => iniciar(async () => { await incluirContatos(candidatos.map((c) => ({ ...c, origem: "novato" as const }))); })} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-40">
              <UserPlus className="size-4" /> Incluir todos
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
