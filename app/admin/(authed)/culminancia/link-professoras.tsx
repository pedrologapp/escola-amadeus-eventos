"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

/** O link da página das professoras, a mensagem pronta para o WhatsApp e quem ainda não enviou. */
export function LinkProfessoras({ link, faltam }: { link: string; faltam: string[] }) {
  const [copiado, setCopiado] = useState<"link" | "texto" | "faltam" | null>(null);
  const texto = [
    "Olá, professoras!",
    "",
    "*Projeto de culminância do Arboria*",
    "",
    "Para montarmos as artes dos outdoors das salas, abra o link, *escolha a sua série* e conte:",
    "• como vai ficar a sala",
    "• a ideia do outdoor",
    "• o tamanho de cada outdoor",
    "• e as imagens que você já tem",
    "",
    link,
  ].join("\n");
  const copiar = async (o: "link" | "texto" | "faltam", t: string) => {
    try { await navigator.clipboard.writeText(t); setCopiado(o); setTimeout(() => setCopiado(null), 2000); } catch { /* sem permissão de copiar */ }
  };
  const botao = (o: "link" | "texto" | "faltam", t: string, rotulo: string) => (
    <button key={o} onClick={() => copiar(o, t)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted">
      {copiado === o ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />} {copiado === o ? "Copiado" : rotulo}
    </button>
  );
  return (
    <div className="mt-4 rounded-2xl border border-border/60 bg-white p-4">
      <p className="text-sm font-semibold">Página para as professoras preencherem</p>
      <a href={link} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 break-all text-sm text-amadeus-blue">{link} <ExternalLink className="h-3.5 w-3.5" /></a>
      <div className="mt-3 flex flex-wrap gap-2">
        {botao("link", link, "Copiar link")}
        {botao("texto", texto, "Copiar mensagem para o WhatsApp")}
        {faltam.length > 0 && botao("faltam", `Ainda faltam:\n${faltam.map((f) => `• ${f}`).join("\n")}`, `Copiar quem falta (${faltam.length})`)}
      </div>
      {faltam.length > 0 && <p className="mt-3 text-xs text-muted-foreground">Faltam: {faltam.join(", ")}</p>}
    </div>
  );
}
