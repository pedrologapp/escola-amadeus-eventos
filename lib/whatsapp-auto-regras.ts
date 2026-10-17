/**
 * Regras de texto da resposta automática (sem acesso a nada, para testar à
 * parte): o pai está perguntando o valor? O nome que ele digitou é de um dos
 * filhos ligados àquele número?
 */

export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();

/** Pergunta sobre valor da rematrícula ("qual o valor?", "quanto fica?", "e a mensalidade?"). */
export function perguntaValor(texto: string): boolean {
  const t = normalizar(texto);
  return (
    /\b(valor|valores|preco|precos|mensalidade|mensalidades|orcamento|anuidade)\b/.test(t) ||
    /\bquanto\b.*\b(fica|ficaria|vai ficar|custa|custaria|sai|seria|e|vou pagar|pago|paga|da)\b/.test(t) ||
    /\bquanto (e|fica|custa)\b/.test(t) ||
    /\b(custa|custo)\b/.test(t)
  );
}

/** Tocou o botão "Quero renovar" do modelo da rematrícula (ou escreveu isso). */
export function querRenovar(texto: string): boolean {
  return /^(eu )?quero renovar\b/.test(normalizar(texto));
}

/** Semelhança de 0 a 1 pela distância de edição (letras trocadas, faltando ou sobrando). */
export function semelhanca(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  let ant = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(ant[j] + 1, cur[j - 1] + 1, ant[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    ant = cur;
  }
  return 1 - ant[b.length] / Math.max(a.length, b.length);
}

const LIGACAO = new Set(["de", "da", "do", "das", "dos", "e"]);
// "o nome dele é ...", "minha filha se chama ..." etc.
const ENCHIMENTO = new Set([
  "o", "a", "os", "as", "nome", "dele", "dela", "do", "da", "meu", "minha", "filho", "filha", "filhos", "filhas",
  "e", "eh", "se", "chama", "aluno", "aluna", "sim", "oi", "ola", "bom", "boa", "dia", "tarde", "noite", "completo",
  "sao", "ele", "ela", "sou", "pai", "mae", "mamae", "papai", "responsavel", "de", "obrigado", "obrigada",
]);

const partes = (s: string) => normalizar(s).split(" ").filter((p) => p && !LIGACAO.has(p));

export interface Filho {
  id: number;
  nome: string;
}

/**
 * Filhos daquele número cujo nome o pai digitou. Vale (com no mínimo 90% de
 * letras certas): o nome completo; ou duas ou mais partes do nome (ex.:
 * "Maria Eduarda", "Maria Silva"), começando pelo primeiro nome; ou só o
 * primeiro nome, quando nenhum outro filho daquele número tem esse nome.
 * Aceita mais de um nome na mesma mensagem ("João e Maria").
 */
export function filhosCitados(texto: string, filhos: Filho[]): Filho[] {
  const t = normalizar(texto);
  if (!t) return [];
  const palavras = t.split(" ").filter((p) => p.length >= 2 && !ENCHIMENTO.has(p));
  if (!palavras.length) return [];
  const bate = (a: string, b: string) => semelhanca(a, b) >= 0.9 || (a.length >= 5 && b.length >= 5 && semelhanca(a, b) >= 0.8);
  const achados: (Filho & { pontos: number; primeiro: string })[] = [];
  for (const f of filhos) {
    const nome = partes(f.nome);
    if (!nome.length) continue;
    const completo = nome.join(" ");
    // nome completo (as palavras na ordem, com 90% de letras certas)
    const okCompleto = semelhanca(palavras.join(" "), completo) >= 0.9 || t.includes(completo);
    // primeiro nome + pelo menos mais uma parte do nome, em qualquer lugar da mensagem
    const iPrimeiro = palavras.findIndex((p) => semelhanca(p, nome[0]) >= 0.9);
    const outras = iPrimeiro >= 0 ? palavras.slice(iPrimeiro + 1, iPrimeiro + 6).filter((p) => nome.slice(1).some((n) => bate(p, n))) : [];
    const okPartes = iPrimeiro >= 0 && outras.length >= 1;
    // só o primeiro nome, se for único entre os filhos daquele número
    const mesmoPrimeiro = filhos.filter((g) => semelhanca(partes(g.nome)[0] ?? "", nome[0]) >= 0.9).length;
    const okPrimeiro = iPrimeiro >= 0 && mesmoPrimeiro === 1 && palavras.length <= 3;
    if (okCompleto || okPartes || okPrimeiro) {
      const pontos = okCompleto ? 99 : palavras.filter((p) => nome.some((n) => bate(p, n))).length;
      achados.push({ ...f, pontos, primeiro: nome[0] });
    }
  }
  // "Ana Beatriz Lima" com as irmãs Ana Clara Lima e Ana Beatriz Lima: fica só a que bate em mais partes.
  return achados
    .filter((f) => !achados.some((g) => g !== f && semelhanca(g.primeiro, f.primeiro) >= 0.9 && g.pontos > f.pontos))
    .map(({ id, nome }) => ({ id, nome }));
}
