"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Minus, Plus, Search, X } from "lucide-react";
import { buscarNome, responder } from "./actions";
import { DATAS, VALOR_ACOMPANHANTE, VALOR_COLABORADOR } from "@/lib/dia-professor";

type Achado = { id: number; nome: string; respondeu: boolean };
type Escolhido = { id: number | null; nome: string };
const reais = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const Cartao = ({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) => (
  <div className="rounded-3xl bg-white p-5 shadow-sm">
    <p className="text-sm font-bold text-amadeus-blue">{n}. {titulo}</p>
    <div className="mt-3">{children}</div>
  </div>
);
const Opcao = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full rounded-2xl border-2 px-4 py-3 text-left transition ${ativo ? "border-amadeus-blue bg-amadeus-blue-50" : "border-border bg-white"}`}
  >
    {children}
  </button>
);

export function Resposta() {
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Achado[]>([]);
  const [procurando, setProcurando] = useState(false);
  const [escolhido, setEscolhido] = useState<Escolhido | null>(null);
  const [jaRespondeu, setJaRespondeu] = useState(false);
  const [digitar, setDigitar] = useState(false);
  const [participa, setParticipa] = useState<boolean | null>(null);
  const [data, setData] = useState<string | null>(null);
  const [leva, setLeva] = useState<boolean | null>(null);
  const [qtd, setQtd] = useState(1);
  const [quem, setQuem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<{ nome: string; trocou: boolean } | null>(null);

  useEffect(() => {
    if (escolhido || digitar) return;
    const q = busca.trim();
    if (q.length < 3) { setAchados([]); return; }
    setProcurando(true);
    const t = setTimeout(async () => {
      setAchados(await buscarNome(q).catch(() => []));
      setProcurando(false);
    }, 300);
    return () => clearTimeout(t);
  }, [busca, escolhido, digitar]);

  const acompanhantes = participa && leva ? qtd : 0;
  const completo = !!escolhido && participa !== null && (!participa || (!!data && leva !== null));

  const enviar = async () => {
    if (!escolhido || participa === null) return;
    setEnviando(true); setErro(null);
    const r = await responder({ id: escolhido.id, nome: escolhido.nome, participa, data, acompanhantes, quem }).catch(() => null);
    setEnviando(false);
    if (!r) { setErro("Não consegui enviar. Confira a internet e tente de novo."); return; }
    if (!r.ok) { setErro(r.erro); return; }
    setPronto({ nome: r.nome, trocou: r.trocou });
  };

  if (pronto) {
    return (
      <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50"><Check className="size-7 text-emerald-600" /></div>
        <p className="mt-4 text-xl font-extrabold text-amadeus-blue">Resposta recebida!</p>
        <p className="mt-2 text-sm text-[#5A6478]">
          Obrigado, {pronto.nome.split(" ")[0]}. {pronto.trocou ? "Ela substituiu a resposta que você tinha mandado antes." : ""}
          {participa ? ` Seu voto foi para ${data}.` : " Que pena! Fica para a próxima."}
        </p>
        <button type="button" onClick={() => location.reload()} className="mt-6 text-sm font-semibold text-amadeus-blue underline">Responder por outra pessoa</button>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-5">
      <Cartao n={1} titulo="Seu nome">
        {escolhido ? (
          <>
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-amadeus-blue-50 px-4 py-3">
              <span className="font-semibold text-amadeus-blue">{escolhido.nome}</span>
              <button type="button" onClick={() => { setEscolhido(null); setJaRespondeu(false); }} aria-label="Trocar o nome" className="text-[#5A6478]"><X className="size-5" /></button>
            </div>
            {jaRespondeu && <p className="mt-2 text-xs text-[#5A6478]">Você já respondeu. Se enviar de novo, a resposta é trocada.</p>}
          </>
        ) : digitar ? (
          <>
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome e sobrenome"
              className="w-full rounded-2xl border border-border px-4 py-3 text-base outline-none focus:border-amadeus-blue" />
            <button type="button" disabled={busca.trim().split(/\s+/).length < 2} onClick={() => setEscolhido({ id: null, nome: busca.trim() })}
              className="mt-3 w-full rounded-2xl bg-amadeus-blue py-3 font-bold text-white disabled:opacity-40">Usar este nome</button>
            <button type="button" onClick={() => setDigitar(false)} className="mt-2 w-full text-sm text-[#5A6478] underline">Voltar para a busca</button>
          </>
        ) : (
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#9AA3B4]" />
              <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite seu nome" autoComplete="off"
                className="w-full rounded-2xl border border-border py-3 pl-10 pr-4 text-base outline-none focus:border-amadeus-blue" />
              {procurando && <Loader2 className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-[#9AA3B4]" />}
            </div>
            {achados.length > 0 && (
              <ul className="mt-2 divide-y divide-border/60 overflow-hidden rounded-2xl border border-border">
                {achados.map((a) => (
                  <li key={a.id}>
                    <button type="button" onClick={() => { setEscolhido({ id: a.id, nome: a.nome }); setJaRespondeu(a.respondeu); }}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-amadeus-blue-50">
                      <span>{a.nome}</span>
                      {a.respondeu && <span className="text-xs font-semibold text-emerald-600">já respondeu</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setDigitar(true)} className="mt-3 text-sm text-[#5A6478] underline">Não achei meu nome</button>
          </>
        )}
      </Cartao>

      {escolhido && (
        <Cartao n={2} titulo="Você vai participar?">
          <div className="grid grid-cols-2 gap-3">
            <Opcao ativo={participa === true} onClick={() => setParticipa(true)}><span className="font-bold text-amadeus-blue">Sim, eu vou!</span></Opcao>
            <Opcao ativo={participa === false} onClick={() => setParticipa(false)}><span className="font-bold text-[#5A6478]">Não vou</span></Opcao>
          </div>
        </Cartao>
      )}

      {escolhido && participa && (
        <>
          <Cartao n={3} titulo="Qual data você prefere?">
            <div className="space-y-3">
              {DATAS.map((d) => (
                <Opcao key={d.valor} ativo={data === d.valor} onClick={() => setData(d.valor)}>
                  <span className="block font-bold text-amadeus-blue">{d.titulo}</span>
                  <span className="text-sm text-[#5A6478]">{d.dia}</span>
                </Opcao>
              ))}
            </div>
          </Cartao>

          <Cartao n={4} titulo="Vai levar alguém?">
            <p className="-mt-1 mb-3 text-xs text-[#5A6478]">Filhos, marido, esposa, namorado(a) ou outra pessoa.</p>
            <div className="grid grid-cols-2 gap-3">
              <Opcao ativo={leva === false} onClick={() => setLeva(false)}><span className="font-bold text-[#5A6478]">Só eu</span></Opcao>
              <Opcao ativo={leva === true} onClick={() => setLeva(true)}><span className="font-bold text-amadeus-blue">Vou levar</span></Opcao>
            </div>
            {leva && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-2xl bg-[#FAF7F0] px-4 py-3">
                  <span className="text-sm font-semibold text-[#3E4A61]">Quantas pessoas?</span>
                  <div className="flex items-center gap-4">
                    <button type="button" aria-label="Menos" onClick={() => setQtd((q) => Math.max(1, q - 1))} className="flex size-9 items-center justify-center rounded-full border border-border bg-white"><Minus className="size-4" /></button>
                    <span className="w-5 text-center text-lg font-extrabold text-amadeus-blue">{qtd}</span>
                    <button type="button" aria-label="Mais" onClick={() => setQtd((q) => Math.min(10, q + 1))} className="flex size-9 items-center justify-center rounded-full border border-border bg-white"><Plus className="size-4" /></button>
                  </div>
                </div>
                <input value={quem} onChange={(e) => setQuem(e.target.value)} placeholder="Quem? (ex.: meu filho e minha esposa)"
                  className="w-full rounded-2xl border border-border px-4 py-3 text-base outline-none focus:border-amadeus-blue" />
              </div>
            )}
          </Cartao>

          {data && leva !== null && (
            <div className="rounded-3xl border-2 border-dashed border-[#F2A20C]/60 bg-[#FFF8E6] p-5 text-sm text-[#3E4A61]">
              <p className="flex justify-between"><span>Você</span><b>{reais(VALOR_COLABORADOR)} <span className="font-normal text-[#5A6478]">(até 2x)</span></b></p>
              {acompanhantes > 0 && (
                <p className="mt-1 flex justify-between"><span>{acompanhantes} acompanhante{acompanhantes > 1 ? "s" : ""}</span><b>{reais(acompanhantes * VALOR_ACOMPANHANTE)} <span className="font-normal text-[#5A6478]">(até 3x)</span></b></p>
              )}
              <p className="mt-2 flex justify-between border-t border-[#F2A20C]/40 pt-2 text-base"><span className="font-bold text-amadeus-blue">Total</span><b className="text-amadeus-blue">{reais(VALOR_COLABORADOR + acompanhantes * VALOR_ACOMPANHANTE)}</b></p>
            </div>
          )}
        </>
      )}

      {erro && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      {escolhido && (
        <button type="button" disabled={!completo || enviando} onClick={enviar}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amadeus-blue py-4 text-base font-bold text-white disabled:opacity-40">
          {enviando && <Loader2 className="size-5 animate-spin" />} Enviar minha resposta
        </button>
      )}
    </div>
  );
}
