// os nomes curtos da turma, sem repetir (Pedro, 26/10): "Ana S." e, se houver outra "Ana S.", mais letras do sobrenome ("Ana Sil." / "Ana Sou.")
export function nomesCurtos(lista: { id: string; nome: string }[]): Record<string, string> {
  const partes = (a: { nome: string }) => String(a.nome).trim().split(/\s+/), nivel: Record<string, number> = {}, res: Record<string, string> = {};
  for (const a of lista) nivel[a.id] = 1;
  for (let volta = 0; volta < 12; volta++) {
    const grupos: Record<string, string[]> = {};
    for (const a of lista) { const p = partes(a), n = nivel[a.id];
      if (p.length === 1) res[a.id] = p[0];
      else { const ult = p[p.length - 1]; res[a.id] = n < ult.length ? p[0] + ' ' + ult.slice(0, n) + '.' : n === ult.length ? p[0] + ' ' + ult : p.slice(0, -1).join(' ') + ' ' + ult; }
      (grupos[res[a.id]] ||= []).push(a.id); }
    let mudou = false; for (const ids of Object.values(grupos)) if (ids.length > 1) { for (const id of ids) nivel[id]++; mudou = true; }
    if (!mudou) break;
  }
  return res;
}
