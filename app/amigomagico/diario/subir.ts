/**
 * Envio da foto e do áudio do diário direto para o bucket privado, pela URL assinada que o servidor criou
 * (o mesmo pedido que o uploadToSignedUrl do supabase-js faz, com barra de progresso). A chave anon é pública;
 * a do servidor nunca vem para o navegador.
 */
const BUCKET = "formatura-diario";

export function subir(path: string, token: string, arquivo: Blob, tipo: string, progresso: (p: number) => void): Promise<void> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const url = `${base}/storage/v1/object/upload/sign/${BUCKET}/${path}?token=${encodeURIComponent(token)}`;
  return new Promise((ok, falha) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("apikey", chave);
    xhr.setRequestHeader("Authorization", `Bearer ${chave}`);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "max-age=3600");
    xhr.setRequestHeader("content-type", tipo || "application/octet-stream");
    xhr.upload.onprogress = (e) => e.lengthComputable && progresso(e.loaded / e.total);
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? ok() : falha(new Error(`O envio foi recusado (${xhr.status}). Tente de novo.`)));
    xhr.onerror = () => falha(new Error("A internet caiu durante o envio. Tente de novo."));
    xhr.send(arquivo);
  });
}

/** Foto do celular (às vezes 5 MB ou mais) vira um JPEG de até 1600 px: sobe rápido na rede da escola e serve para o telão. */
export async function encolherFoto(arquivo: File, lado = 1600): Promise<Blob> {
  const img = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * escala);
  c.height = Math.round(img.height * escala);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  return new Promise((ok, falha) => c.toBlob((b) => (b ? ok(b) : falha(new Error("foto"))), "image/jpeg", 0.86));
}

/** Extensão pelo tipo que o gravador do navegador deu (Chrome: webm; iPhone: mp4). */
export function extensaoAudio(tipo: string): string {
  const t = tipo.toLowerCase();
  if (t.includes("webm")) return "webm";
  if (t.includes("ogg")) return "ogg";
  if (t.includes("aac")) return "aac";
  if (t.includes("mp4") || t.includes("m4a")) return "m4a";
  return "webm";
}
