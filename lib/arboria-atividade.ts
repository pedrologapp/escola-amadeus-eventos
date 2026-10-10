import type { Chave } from "@/lib/arboria-historia";

/**
 * Atividade ao vivo dos PAIS na Experiência Amadeus (10/10/2026).
 * 3 situações do dia a dia, 8 jeitos de resolver cada uma (um por inteligência, sem dizer o nome).
 * O celular embaralha as opções; o telão desenha o caminho de cada pai pelas 8 cores.
 */

export const SITUACOES: { pergunta: string; opcoes: Record<Chave, string> }[] = [
  {
    pergunta: "Você precisa lembrar 10 itens de compra, sem anotar. O que você faz?",
    opcoes: {
      ling: "Invento uma frase ou uma história com eles",
      log: "Separo por tipo e conto quantos são de cada",
      esp: "Imagino onde cada um fica na cozinha",
      mus: "Transformo a lista numa musiquinha",
      cor: "Vou contando nos dedos, um por um",
      nat: "Lembro pela cor, pelo cheiro e pela textura de cada coisa",
      inter: "Peço para alguém lembrar metade comigo",
      intra: "Penso no que eu realmente preciso; o resto eu deixo ir",
    },
  },
  {
    pergunta: "Chegou um móvel para montar e o manual sumiu. Você…",
    opcoes: {
      ling: "Procura um vídeo ou um texto que explique",
      log: "Separa e conta as peças e os parafusos antes",
      esp: "Olha a foto da caixa e imagina o móvel pronto",
      mus: "Coloca uma música e vai no ritmo",
      cor: "Começa a encaixar com as mãos e vai testando",
      nat: "Observa as peças e agrupa pelo formato",
      inter: "Chama alguém para montar junto",
      intra: "Respira, vê se está com paciência e escolhe a hora certa",
    },
  },
  {
    pergunta: "Alguém te pede o caminho até a sua casa. Você…",
    opcoes: {
      ling: "Explica com palavras, rua por rua",
      log: "Dá números: “três quarteirões, a segunda à direita”",
      esp: "Desenha um mapinha",
      mus: "Lembra do caminho pelos sons de cada trecho",
      cor: "Vai junto, mostrando com gestos",
      nat: "Usa a natureza: “depois da mangueira grande”",
      inter: "Manda a localização e fica no telefone ajudando",
      intra: "Lembra de como foi a primeira vez que você chegou lá",
    },
  },
];

// ordem e cores dos 8 ramos (as mesmas do telão)
export const RAMOS: { chave: Chave; nome: string; jeito: string; cor: string }[] = [
  { chave: "ling", nome: "Linguística", jeito: "as palavras", cor: "#60A5FA" },
  { chave: "log", nome: "Lógico-matemática", jeito: "a lógica e os números", cor: "#34D399" },
  { chave: "esp", nome: "Espacial", jeito: "as imagens", cor: "#A78BFA" },
  { chave: "mus", nome: "Musical", jeito: "os sons e o ritmo", cor: "#F87171" },
  { chave: "cor", nome: "Corporal", jeito: "o corpo e as mãos", cor: "#FBBF24" },
  { chave: "nat", nome: "Naturalista", jeito: "a observação", cor: "#A3E635" },
  { chave: "inter", nome: "Interpessoal", jeito: "as outras pessoas", cor: "#22D3EE" },
  { chave: "intra", nome: "Intrapessoal", jeito: "o que sente por dentro", cor: "#FB923C" },
];
