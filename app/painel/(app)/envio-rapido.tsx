"use client";

import { useState, useTransition } from "react";
import { enviarExperiencia } from "@/app/admin/(authed)/rematricula-2027/experiencia/actions";
import { enviarCarta } from "@/app/admin/(authed)/rematricula-2027/actions";

type Qual = "experiencia" | "folder";
const OPCOES: Record<Qual, { botao: string; titulo: string; explica: string }> = {
  experiencia: { botao: "Enviar encarte da Experiência", titulo: "Convite da Experiência (07/11)", explica: "Sai o vídeo do convite com o texto, pelo WhatsApp da escola. O número entra na lista da Experiência." },
  folder: { botao: "Enviar folder digital", titulo: "Folder digital da escola", explica: "Sai a apresentação com o link do folder, pelo WhatsApp da escola. O número entra na lista da Experiência." },
};
const campo = "mt-1 w-full rounded-lg border border-[#e8e1d0] px-3 py-2 text-sm outline-none focus:border-[#1B3B7C]";

/** Envio para UMA família, digitando o número: nada sai antes do botão "Enviar agora". */
export function EnvioRapido() {
  const [qual, setQual] = useState<Qual | null>(null);
  const [nome, setNome] = useState("");
  const [crianca, setCrianca] = useState("");
  const [tel, setTel] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);
  const [enviando, iniciar] = useTransition();

  const numero = tel.replace(/\D/g, "");
  const valido = numero.length === 10 || numero.length === 11;

  const enviar = () => {
    if (!qual || !valido) return;
    setMsg(null);
    iniciar(async () => {
      const destinos = [{ telefone: numero, nome: nome.trim() || null }];
      const r = qual === "experiencia"
        ? await enviarExperiencia({ destinos, crianca: crianca.trim() || null, escolha: "video", origem: "avulso" })
        : await enviarCarta({ alunoId: null, nome: crianca.trim(), serie: "", desconto: 0, irmao: false, modo: "com", somenteFolder: true, destinos });
      const st = r.resultados[0]?.status;
      const det = r.resultados[0]?.detalhe;
      if (!r.ok) setMsg({ ok: false, texto: r.erro ?? "Não foi enviado." });
      else if (st === "enviado") { setMsg({ ok: true, texto: `Enviado para ${tel}.` }); setTel(""); setNome(""); setCrianca(""); }
      else if (st === "sem_whatsapp") setMsg({ ok: false, texto: "Esse número não tem WhatsApp." });
      else if (st === "pulado") setMsg({ ok: false, texto: `Não enviado: ${det ?? "fora do convite"}.` });
      else setMsg({ ok: false, texto: `Não foi enviado${det ? ` (${det})` : ""}.` });
    });
  };

  if (!qual) {
    return (
      <div className="flex flex-col gap-2">
        {(Object.keys(OPCOES) as Qual[]).map((q) => (
          <button key={q} type="button" onClick={() => { setQual(q); setMsg(null); }} className="rounded-lg bg-[#1B3B7C] px-3.5 py-2 text-left text-sm font-bold text-white hover:bg-[#2a4f9a]">
            {OPCOES[q].botao}
          </button>
        ))}
        {msg && <p className={`text-sm font-semibold ${msg.ok ? "text-[#1f8a5b]" : "text-red-700"}`}>{msg.texto}</p>}
      </div>
    );
  }
  const o = OPCOES[qual];
  return (
    <div className="rounded-xl bg-[#f6f3ea] p-3.5">
      <p className="text-sm font-bold text-[#1B3B7C]">{o.titulo}</p>
      <p className="mt-0.5 text-xs text-[#5b6478]">{o.explica}</p>
      <label className="mt-3 block text-xs font-semibold">WhatsApp com DDD<input value={tel} onChange={(e) => setTel(e.target.value)} inputMode="tel" placeholder="84 99999-9999" className={campo} /></label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="block text-xs font-semibold">Responsável <span className="font-normal">(opcional)</span><input value={nome} onChange={(e) => setNome(e.target.value)} className={campo} /></label>
        <label className="block text-xs font-semibold">Criança <span className="font-normal">(opcional)</span><input value={crianca} onChange={(e) => setCrianca(e.target.value)} className={campo} /></label>
      </div>
      {msg && <p className={`mt-2 text-sm font-semibold ${msg.ok ? "text-[#1f8a5b]" : "text-red-700"}`}>{msg.texto}</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" disabled={!valido || enviando} onClick={enviar} className="rounded-lg bg-[#128C7E] px-3.5 py-2 text-sm font-bold text-white disabled:opacity-50">
          {enviando ? "Enviando…" : "Enviar agora"}
        </button>
        <button type="button" disabled={enviando} onClick={() => { setQual(null); setMsg(null); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#5b6478]">Voltar</button>
      </div>
    </div>
  );
}
