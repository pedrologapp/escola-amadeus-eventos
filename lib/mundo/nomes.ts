// os nomes curtos da turma, sem repetir (Pedro, 26/10): "Ana S." e, se houver outra "Ana S.", mais letras do sobrenome ("Ana Sil." / "Ana Sou.")
// (27/10, Pedro) o último sobrenome fica SEMPRE abreviado (antes, dois "Ana ... S." iguais acabavam com o nome inteiro no mapa da Corte):
// o desempate usa primeiro o segundo nome ("Ana Clara S."), depois mais letras do último ("Ana Clara Sou."). "de/da/dos" não contam.
const LIGA = new Set(["de", "da", "do", "das", "dos", "e"]);
function candidato(nome: string, n: number) {
  const p = String(nome).trim().split(/\s+/);
  if (p.length === 1) return p[0];
  const ult = p[p.length - 1], meio = p.slice(1, -1).filter((w) => !LIGA.has(w.toLowerCase()));
  const letras = (k: number) => ult.slice(0, Math.max(1, Math.min(k, ult.length - 1))) + ".";
  if (n === 1) return p[0] + " " + letras(1);
  const base = meio.length ? p[0] + " " + meio.slice(0, Math.min(meio.length, n - 1)).join(" ") + " " : p[0] + " ";
  return base + letras(meio.length ? Math.max(1, n - meio.length) : n);
}
export function nomesCurtos(lista: { id: string; nome: string }[]): Record<string, string> {
  const nivel: Record<string, number> = {}, res: Record<string, string> = {};
  for (const a of lista) nivel[a.id] = 1;
  for (let volta = 0; volta < 12; volta++) {
    const grupos: Record<string, string[]> = {};
    for (const a of lista) { res[a.id] = candidato(a.nome, nivel[a.id]); (grupos[res[a.id]] ||= []).push(a.id); }
    let mudou = false; for (const ids of Object.values(grupos)) if (ids.length > 1) { for (const id of ids) nivel[id]++; mudou = true; }
    if (!mudou) break;
  }
  return res;
}
