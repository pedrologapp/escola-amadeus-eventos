/** Datas no formato AAAA-MM-DD, sem depender do fuso do navegador. */
export function somaDiasIso(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
