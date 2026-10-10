import type { Chave } from "@/lib/arboria-historia";

/**
 * Atividade ao vivo dos PAIS na Experiência Amadeus (10/10/2026), a das 15 palavras:
 * 1ª rodada: a TV mostra 15 palavras, somem, e cada pai marca no celular as que lembra.
 * Depois a TV mostra 8 formas de guardar palavras (uma por inteligência, com exemplo); o pai escolhe a que mais gostou.
 * 2ª rodada: outras 15 palavras, agora usando a forma escolhida.
 * Ninguém vê o resultado de ninguém: a TV mostra só quantos pais escolheram cada forma.
 */

// cada rodada: as 15 que aparecem na TV + 15 parecidas que só aparecem no celular, para confundir
export const RODADAS: { palavras: string[]; parecidas: string[] }[] = [
  {
    palavras: ["bola", "janela", "girafa", "chave", "bolo", "guarda-chuva", "violão", "foguete", "cadeira", "abacaxi", "sapato", "relógio", "lua", "tesoura", "bicicleta"],
    parecidas: ["porta", "elefante", "cadeado", "pão", "chapéu", "piano", "avião", "mesa", "banana", "meia", "despertador", "sol", "faca", "patinete", "almofada"],
  },
  {
    palavras: ["pente", "cavalo", "livro", "morango", "ponte", "tambor", "vela", "escada", "peixe", "travesseiro", "nuvem", "martelo", "laranja", "trem", "colher"],
    parecidas: ["escova", "burro", "caderno", "uva", "túnel", "flauta", "lanterna", "banco", "tartaruga", "cobertor", "chuva", "serrote", "limão", "ônibus", "garfo"],
  },
];

// as 8 formas de guardar (ordem e cores dos 8 ramos, as mesmas do telão)
export const FORMAS: { chave: Chave; nome: string; titulo: string; como: string; exemplo: string; cor: string }[] = [
  { chave: "ling", nome: "Linguística", titulo: "Inventar uma história", cor: "#60A5FA",
    como: "Junte as palavras numa história curta, mesmo que seja maluca.", exemplo: "“A girafa chutou a bola até a lua, e ela caiu na cadeira.”" },
  { chave: "log", nome: "Lógico-matemática", titulo: "Agrupar e contar", cor: "#34D399",
    como: "Separe por tipo e guarde quantas são de cada grupo.", exemplo: "“Comidas: bolo e abacaxi, são 2. Bichos: girafa, 1. Coisas da casa: janela, cadeira, chave…”" },
  { chave: "esp", nome: "Espacial", titulo: "Espalhar pela casa", cor: "#A78BFA",
    como: "Imagine um caminho pela sua casa e deixe cada palavra num lugar.", exemplo: "“A bola na porta, a girafa no sofá, a lua na janela do quarto…”" },
  { chave: "mus", nome: "Musical", titulo: "Cantar no ritmo", cor: "#F87171",
    como: "Encaixe as palavras no ritmo de uma música que você conhece.", exemplo: "“Bo-la, ja-ne-la, gi-ra-fa…” no ritmo do “Parabéns pra você”." },
  { chave: "cor", nome: "Corporal", titulo: "Fazer um gesto", cor: "#FBBF24",
    como: "Faça um movimento pequeno para cada palavra, com as mãos ou o corpo.", exemplo: "Um chute para a bola, o pescoço esticado para a girafa, uma tesoura com os dedos…" },
  { chave: "nat", nome: "Naturalista", titulo: "Sentir cada coisa", cor: "#A3E635",
    como: "Pense na cor, no cheiro, na textura ou no bicho de cada uma.", exemplo: "O abacaxi espinhento e cheiroso, a lua branca e fria, o bolo quentinho…" },
  { chave: "inter", nome: "Interpessoal", titulo: "Lembrar de alguém", cor: "#22D3EE",
    como: "Ligue cada palavra a uma pessoa que você conhece.", exemplo: "“Meu filho com a bola, minha mãe com a tesoura, meu pai com o violão…”" },
  { chave: "intra", nome: "Intrapessoal", titulo: "Ligar a uma lembrança sua", cor: "#FB923C",
    como: "Ligue cada palavra a um momento que você viveu.", exemplo: "“A bicicleta que eu ganhei aos 8 anos, o bolo do meu casamento…”" },
];

/** As 30 palavras de uma rodada, misturadas sempre do mesmo jeito (para todos verem a mesma grade). */
export function grade(r: number) {
  const todas = [...RODADAS[r].palavras, ...RODADAS[r].parecidas];
  return todas.map((p, i) => ({ p, k: Math.sin((i + 1) * (r + 3) * 12.9898) * 43758.5453 % 1 })).sort((a, b) => a.k - b.k).map((x) => x.p);
}
