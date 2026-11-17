import { BUCKET_HOMENAGEM } from "@/lib/homenagem-9ano-texto";

/**
 * Sobe o arquivo para a URL assinada do Storage com barra de progresso. O supabase-js não informa
 * progresso, e um vídeo de celular leva tempo: sem a barra, o pai acha que travou e fecha a página.
 * Mesmo pedido que o uploadToSignedUrl faz (PUT com o corpo cru).
 */
export function subir(path: string, token: string, arquivo: Blob, tipo: string, progresso: (p: number) => void): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url = `${base}/storage/v1/object/upload/sign/${BUCKET_HOMENAGEM}/${path}?token=${encodeURIComponent(token)}`;
  return new Promise((ok, falha) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("apikey", chave);
    xhr.setRequestHeader("Authorization", `Bearer ${chave}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", tipo || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && progresso(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : falha(new Error(`envio recusado (${xhr.status})`)));
    xhr.onerror = () => falha(new Error("A internet caiu durante o envio."));
    xhr.send(arquivo);
  });
}

/** Extensão do arquivo pelo tipo (gravado no site) ou pelo nome (escolhido da galeria). */
export function extensaoDe(tipo: string, nome?: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("quicktime")) return "mov";
  if (t.includes("webm")) return "webm";
  if (t.includes("3gpp")) return "3gp";
  if (t.includes("mp4")) return "mp4";
  const n = (nome ?? "").toLowerCase().split(".").pop() ?? "";
  return ["mp4", "mov", "webm", "m4v", "3gp"].includes(n) ? n : "mp4";
}
