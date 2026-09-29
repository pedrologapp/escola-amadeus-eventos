"use client";

import { useRef, useState, useTransition } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { adicionarMidias, mostrarComoFoi, prepararMidia, removerMidia } from "./como-foi-actions";

/**
 * "Como foi": fotos e vídeos do evento para o Portal da Família. O portal só
 * mostra se tiver mídia e estiver ligado, e só os 2 eventos mais recentes dos
 * últimos 45 dias.
 */

export const ehVideo = (u: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u);

/** Foto do celular (4–8 MB) vira ~300 KB antes de subir; vídeo vai como está. */
async function comprimir(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/") || arquivo.type === "image/gif") return arquivo;
  try {
    const bmp = await createImageBitmap(arquivo);
    const e = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * e);
    c.height = Math.round(bmp.height * e);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return await new Promise((ok) => c.toBlob((b) => ok(b ?? arquivo), "image/jpeg", 0.85));
  } catch {
    return arquivo;
  }
}

export function ComoFoi({ eventoId, midias, mostrar, passou }: { eventoId: string; midias: string[]; mostrar: boolean; passou: boolean }) {
  const [enviando, setEnviando] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, comecar] = useTransition();
  const arquivo = useRef<HTMLInputElement>(null);

  const enviar = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setErro(null);
    const urls: string[] = [];
    try {
      const arquivos = [...lista];
      for (const [n, a] of arquivos.entries()) {
        setEnviando(`Enviando ${n + 1} de ${arquivos.length}…`);
        if (a.type.startsWith("video/") && a.size > 50 * 1024 * 1024) throw new Error(`O vídeo “${a.name}” tem mais de 50 MB. Mande uma versão menor (no WhatsApp ele já sai comprimido).`);
        const corpo = await comprimir(a);
        const foto = corpo !== a;
        const p = await prepararMidia(eventoId, foto ? a.name.replace(/\.[^.]+$/, ".jpg") : a.name);
        if (!p.ok) throw new Error(p.erro);
        const { error } = await createClient().storage.from("eventos").uploadToSignedUrl(p.path, p.token, corpo, { contentType: foto ? "image/jpeg" : a.type || "application/octet-stream" });
        if (error) throw new Error(error.message);
        urls.push(p.url);
      }
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      if (urls.length) {
        const r = await adicionarMidias(eventoId, urls);
        if (!r.ok) setErro(r.erro);
      }
      setEnviando(null);
    }
  };

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) =>
    comecar(async () => {
      setErro(null);
      const r = await fn();
      if (!r.ok) setErro(r.erro ?? "Não deu certo.");
    });

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <label className={`inline-flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-bold ${mostrar ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-border text-muted-foreground"} ${midias.length ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
          <input type="checkbox" checked={mostrar} disabled={!midias.length || pendente} onChange={(e) => rodar(() => mostrarComoFoi(eventoId, e.target.checked))} className="size-4 accent-emerald-600" />
          Mostrar no Portal da Família
        </label>
        <button type="button" disabled={!!enviando} onClick={() => arquivo.current?.click()} className="inline-flex items-center gap-2 rounded-xl bg-amadeus-blue px-3 py-2 text-sm font-bold text-white disabled:opacity-60">
          {enviando ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {enviando ?? "Colocar fotos e vídeos"}
        </button>
        <input ref={arquivo} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {passou ? "" : "O evento ainda não aconteceu: as fotos só aparecem no portal depois da data. "}
        O portal mostra só os 2 eventos mais recentes com fotos ligadas, até 45 dias depois do evento. Sem fotos, o evento que passou não aparece.
      </p>
      {erro && <p className="mt-2 text-sm font-semibold text-red-700">{erro}</p>}
      {midias.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-8">
          {midias.map((u) => (
            <div key={u} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
              {ehVideo(u) ? (
                <video src={u} muted playsInline preload="metadata" className="size-full object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="" className="size-full object-cover" />
              )}
              {ehVideo(u) && <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">vídeo</span>}
              <button type="button" title="Tirar" disabled={pendente} onClick={() => { if (window.confirm("Tirar esta foto/vídeo?")) rodar(() => removerMidia(eventoId, u)); }} className="absolute right-1 top-1 rounded-lg bg-white/90 p-1 text-red-700 opacity-80 hover:opacity-100">
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
