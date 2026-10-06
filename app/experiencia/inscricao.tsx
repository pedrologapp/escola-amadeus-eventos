"use client";

import { useState } from "react";
import { CalendarPlus, Check, Loader2 } from "lucide-react";
import { inscrever } from "./actions";
import { SERIES_2027 } from "./series";

// Máscara simples: (84) 9 8888-7777
const mascara = (v: string) => {
  const d = v.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 3)} ${d.slice(3, 7)}-${d.slice(7)}`;
};
const AGENDA = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Experi%C3%AAncia+Amadeus&dates=20261010T170000Z/20261010T200000Z&location=Centro+Educacional+Amadeus,+Av.+Benedito+Santana,+09,+Amarante,+S%C3%A3o+Gon%C3%A7alo+do+Amarante&details=Venha+viver+um+dia+dentro+da+nossa+escola+junto+com+seu+filho+ou+sua+filha.";

export function Inscricao() {
  const [nome, setNome] = useState("");
  const [zap, setZap] = useState("");
  const [serie, setSerie] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true); setErro(null);
    const r = await inscrever({ nome, whatsapp: zap, serie }).catch(() => null);
    setEnviando(false);
    if (!r) return setErro("Não consegui enviar. Confira a internet e tente de novo.");
    if (!r.ok) return setErro(r.erro);
    setPronto(r.nome);
  };

  if (pronto) {
    return (
      <div className="mt-8 rounded-3xl bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50"><Check className="size-7 text-emerald-600" /></div>
        <p className="mt-4 text-xl font-extrabold text-[#1B3B7C]">Obrigado, {pronto}! Inscrição feita 💛</p>
        <p className="mt-2 text-sm leading-relaxed text-[#5A6478]">
          Esperamos vocês no <b className="text-[#1B3B7C]">sábado, 10 de outubro, às 14h</b>. Vai ser uma alegria receber sua família!<br /><br />Em instantes chega no seu WhatsApp a confirmação, com o nosso folder para você conhecer a escola por dentro.
        </p>
        <a href={AGENDA} target="_blank" className="mt-5 inline-flex items-center gap-2 rounded-2xl border-2 border-[#1B3B7C] px-4 py-2.5 text-sm font-bold text-[#1B3B7C]">
          <CalendarPlus className="size-4" /> Salvar na agenda
        </a>
      </div>
    );
  }

  const campo = "w-full rounded-2xl border border-[#D9DEE8] bg-white px-4 py-3 text-base text-[#1B3B7C] outline-none focus:border-[#1B3B7C]";
  return (
    <form onSubmit={enviar} className="mt-4 space-y-4 rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-lg font-extrabold text-[#1B3B7C]">Garanta o lugar da sua família</p>
      <label className="block">
        <span className="text-sm font-semibold text-[#3E4A61]">Seu nome</span>
        <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" placeholder="Como podemos te chamar?" className={`${campo} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3E4A61]">Seu WhatsApp</span>
        <input value={zap} onChange={(e) => setZap(mascara(e.target.value))} inputMode="tel" autoComplete="tel" placeholder="(84) 9 8888-7777" className={`${campo} mt-1`} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold text-[#3E4A61]">Série que seu filho(a) vai cursar em 2027</span>
        <select value={serie} onChange={(e) => setSerie(e.target.value)} className={`${campo} mt-1 ${serie ? "" : "text-[#9AA3B4]"}`}>
          <option value="" disabled>Escolha a série</option>
          {SERIES_2027.map((s) => <option key={s} value={s} className="text-[#1B3B7C]">{s}</option>)}
        </select>
      </label>
      {erro && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{erro}</p>}
      <button type="submit" disabled={enviando || !nome.trim() || zap.replace(/\D/g, "").length < 10 || !serie}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1B3B7C] py-4 text-base font-bold text-white disabled:opacity-40">
        {enviando && <Loader2 className="size-5 animate-spin" />} Quero participar
      </button>
      <p className="text-center text-xs text-[#9AA3B4]">Gratuito. Usamos seu WhatsApp só para falar sobre a Experiência.</p>
    </form>
  );
}
