"use client";

import { useState, useTransition } from "react";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { somaDiasIso } from "./datas";
import type { ItemTv } from "@/lib/tv";
import { apagarItem, salvarItem } from "./actions";
import { ligarModoEvento } from "./telas-acoes";

/**
 * Modo evento (Pedro, 12/11/2026): um botão. Ligado para hoje ou amanhã, a TV continua passando tudo, mas o
 * "Você sabia?" passa as curiosidades do evento (escritas aqui), e o evento do dia vem logo depois da saudação.
 * Desliga sozinho no dia seguinte.
 */
export function ModoEvento({ dia, hoje, itens, onMudou }: { dia: string | null; hoje: string; itens: ItemTv[]; onMudou: () => void }) {
  const amanha = somaDiasIso(hoje, 1);
  const valendo = dia && dia >= hoje ? dia : null;
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, depois?: () => void) =>
    comecar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) return setErro(r.erro ?? "Não deu certo.");
      depois?.();
      onMudou();
    });
  const curiosidades = valendo ? itens.filter((i) => i.tipo === "curiosidade" && i.data === valendo) : [];
  const opcao = (rotulo: string, valor: string | null) => {
    const ativo = valendo === valor;
    return (
      <button
        type="button"
        disabled={pendente}
        onClick={() => rodar(() => ligarModoEvento(valor))}
        className={`rounded-xl px-4 py-2 text-[15px] font-bold transition ${ativo ? (valor ? "bg-[#FFC94D] text-[#0B2260]" : "bg-[#1B3B7C] text-white") : "bg-[#EEF2FA] text-[#1B3B7C] hover:bg-[#E3E8F2]"}`}
      >
        {rotulo}
      </button>
    );
  };

  return (
    <section id="modo-evento" className={`rounded-3xl p-5 ring-1 ${valendo ? "bg-[#FFF8E6] ring-[#FFC94D]" : "bg-white ring-[#E3E8F2]"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-extrabold text-[#1B3B7C]">Modo evento</h2>
        <div className="ml-auto flex flex-wrap gap-2">
          {opcao("Desligado", null)}
          {opcao("Hoje", hoje)}
          {opcao("Amanhã", amanha)}
        </div>
      </div>
      <p className="mt-1 text-sm text-[#5A6478]">
        {valendo
          ? `Ligado para ${valendo === hoje ? "hoje" : "amanhã"}. O "Você sabia?" passa as curiosidades do evento. Desliga sozinho no dia seguinte.`
          : `Em dia de evento, o "Você sabia?" passa curiosidades do evento. O resto da TV continua igual.`}
      </p>

      {valendo && (
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8A95AA]">Curiosidades do evento</p>
          <div className="mt-2 flex gap-2">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && texto.trim()) rodar(() => salvarItem({ tipo: "curiosidade", titulo: texto, texto: "", icone: "", data: valendo, inicio: "", fim: "" }), () => setTexto("")); }}
              placeholder="Ex.: Quantos experimentos os alunos vão mostrar? *Mais de 40!*"
              className="w-full rounded-xl border border-[#D5DDEB] bg-white px-3 py-2.5 text-[15px] outline-none focus:border-[#1B3B7C]"
            />
            <button
              type="button"
              disabled={pendente || !texto.trim()}
              onClick={() => rodar(() => salvarItem({ tipo: "curiosidade", titulo: texto, texto: "", icone: "", data: valendo, inicio: "", fim: "" }), () => setTexto(""))}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#1B3B7C] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {pendente ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Colocar
            </button>
          </div>
          <p className="mt-1 text-xs text-[#8A95AA]">Dica: escreva uma pergunta e a resposta depois do &quot;?&quot;. A TV mostra a pergunta e, logo depois, a resposta.</p>
          {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
          <ul className="mt-3 space-y-1.5">
            {!curiosidades.length && <li className="rounded-xl bg-white/70 p-3 text-sm text-[#5A6478]">Nenhuma ainda. Sem curiosidades do evento, a TV passa o &quot;Você sabia?&quot; de sempre.</li>}
            {curiosidades.map((i) => (
              <li key={i.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
                <Check className="size-4 shrink-0 text-emerald-600" />
                <span className="min-w-0 flex-1 text-[15px] text-[#1A2240]">{i.titulo.replace(/\*/g, "")}</span>
                <button type="button" aria-label="Apagar" onClick={() => rodar(() => apagarItem(i.id))} className="inline-flex size-8 items-center justify-center rounded-lg text-[#5A6478] hover:bg-red-50 hover:text-red-700"><Trash2 className="size-4" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
