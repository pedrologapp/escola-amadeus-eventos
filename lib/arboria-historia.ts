// A história do Arboria de cada criança (Experiência Amadeus, 10/10/2026).
//
// A criança sai da escola com a bolsa vazia, passa pelos 8 mundos do universo da idade dela
// (Arboria/Lore/BIBLIA-3-UNIVERSOS.md) e volta para a escola com a bolsa cheia.
// Em cada mundo, um balão de fala no jeito da idade conta o que ela encontrou.
//
// Regra da bíblia: nada de rótulo. Toda criança passa pelos 8 mundos; as respostas do pai na
// atividade só trocam a fala do mundo correspondente ("eu inventei um jogo novo!"), nunca viram
// "o ponto forte" dela. Nas falas, nenhum nome técnico (inteligência, árvore, dimensão).

export const SERIES = [
  "Maternal II", "Maternal III", "Grupo IV", "Grupo V",
  "1º ano", "2º ano", "3º ano", "4º ano", "5º ano",
  "6º ano", "7º ano", "8º ano", "9º ano",
] as const;

export type Chave = "ling" | "log" | "esp" | "mus" | "cor" | "nat" | "inter" | "intra";
export type Universo = "infantil" | "herois" | "talentos" | "casas";

export function universoDaSerie(serie: string): Universo {
  const i = SERIES.indexOf(serie as (typeof SERIES)[number]);
  if (i < 0 || i <= 3) return "infantil";
  if (i <= 5) return "herois";
  if (i <= 8) return "talentos";
  return "casas";
}

// A atividade: 6 situações do dia a dia. Cada opção aponta um mundo (Chave).
export const ATIVIDADE: { pergunta: string; opcoes: { texto: string; chave: Chave }[] }[] = [
  { pergunta: "Num dia livre em casa, {nome} prefere…", opcoes: [
    { texto: "inventar histórias e conversar", chave: "ling" },
    { texto: "montar, contar, descobrir como funciona", chave: "log" },
    { texto: "desenhar e construir com blocos", chave: "esp" },
    { texto: "cantar, batucar ou dançar", chave: "mus" },
  ] },
  { pergunta: "No parque, {nome}…", opcoes: [
    { texto: "corre, pula e escala tudo", chave: "cor" },
    { texto: "fica observando bichos e plantas", chave: "nat" },
    { texto: "chama os amigos pra brincar junto", chave: "inter" },
    { texto: "brinca no seu próprio mundinho", chave: "intra" },
  ] },
  { pergunta: "Quando algo dá errado, {nome}…", opcoes: [
    { texto: "explica com palavras o que aconteceu", chave: "ling" },
    { texto: "quer entender o porquê", chave: "log" },
    { texto: "procura alguém para conversar", chave: "inter" },
    { texto: "fica quietinho(a), pensando", chave: "intra" },
  ] },
  { pergunta: "Numa viagem, o que mais chama a atenção de {nome}?", opcoes: [
    { texto: "as músicas no caminho", chave: "mus" },
    { texto: "os animais, as pedras e as plantas", chave: "nat" },
    { texto: "os caminhos, as placas e os mapas", chave: "esp" },
    { texto: "poder correr, nadar e se mexer", chave: "cor" },
  ] },
  { pergunta: "Um presente que {nome} amaria ganhar:", opcoes: [
    { texto: "um livro cheio de histórias", chave: "ling" },
    { texto: "um quebra-cabeça ou jogo de desafio", chave: "log" },
    { texto: "um instrumento musical", chave: "mus" },
    { texto: "uma bola ou uma bicicleta", chave: "cor" },
  ] },
  { pergunta: "Com os amigos, {nome} costuma…", opcoes: [
    { texto: "organizar a brincadeira", chave: "inter" },
    { texto: "criar coisas com as mãos", chave: "esp" },
    { texto: "colecionar e separar coisas", chave: "nat" },
    { texto: "dizer como está se sentindo", chave: "intra" },
  ] },
];

export interface Mundo {
  chave: Chave;
  lugar: string;
  fundo: string;      // imagem em /arboria/fundos/ (Casas: desenhadas em código, a cor vem de "cor")
  cor: string;        // a cor da Casa, assinatura do lugar
  fala: string;       // {nome} = primeiro nome
  brilho: string;     // fala quando o pai marcou essa situação na atividade
  item: string;       // o que entra na bolsa
  itemNome: string;
}

export interface UniversoInfo {
  titulo: string;           // como a viagem se chama
  bolsa: string;            // como a bolsa se chama
  abertura: string;         // fala na escola, antes de sair
  chegada: string;          // fala de volta à escola
  mundos: Mundo[];
}

const COR: Record<Chave, string> = {
  ling: "#1E3A8A", log: "#047857", esp: "#7C3AED", mus: "#7F1D1D", cor: "#B8860B", nat: "#78350F", inter: "#0891B2", intra: "#EA580C",
};

export const UNIVERSOS: Record<Universo, UniversoInfo> = {
  infantil: {
    titulo: "A viagem da Nave Vagalume",
    bolsa: "bolsinha mágica",
    abertura: "Oi! Eu sou {nome}! Essa é a minha escola. Hoje eu vou subir na Nave Vagalume e visitar oito planetinhas! Minha bolsinha tá vazia… vamos?",
    chegada: "Voltei pra minha escola! Olha a minha bolsinha: tá cheinha de coisas que eu encontrei!",
    mundos: [
      { chave: "ling", lugar: "Planeta-Concha", fundo: "inf-linguistico", cor: COR.ling, item: "🫧", itemNome: "uma bolha-palavra",
        fala: "Aqui as palavras viram bolhas! O Lulu perdeu o chapéu e eu ajudei ele a contar como era.",
        brilho: "Aqui as palavras viram bolhas! Eu inventei uma história tão bonita que virou passarinho de papel!" },
      { chave: "log", lugar: "Planeta dos Cubinhos", fundo: "inf-logico", cor: COR.log, item: "🧊", itemNome: "um cubinho de encaixar",
        fala: "Os tatuzinhos andam em fila: vermelho, amarelo, vermelho… e apareceu um azul! Eu descobri o que aconteceu.",
        brilho: "Eu contei todos os tatuzinhos: um, dois, três… e descobri por que a fila mudou!" },
      { chave: "esp", lugar: "Planeta de Fita", fundo: "inf-espacial", cor: COR.esp, item: "⭐", itemNome: "uma estrela de massinha",
        fala: "Aqui dá pra andar de ponta-cabeça! O Dobrinha queria passar no buraco de estrela e eu ajudei ele a virar estrela.",
        brilho: "Eu desenhei o caminho do planeta inteirinho e ninguém se perdeu!" },
      { chave: "mus", lugar: "Planeta-Tambor", fundo: "inf-musical", cor: COR.mus, item: "🥁", itemNome: "um tamborzinho",
        fala: "Quando chove aqui, a chuva toca música! Eu ensinei o Bumbo a tocar baixinho pro bebê dormir.",
        brilho: "Eu cantei e batuquei, e o planeta inteiro dançou comigo!" },
      { chave: "cor", lugar: "Planeta-Trampolim", fundo: "inf-corporal", cor: COR.cor, item: "🧱", itemNome: "um bloquinho da torre",
        fala: "Tudo aqui pula! A torre dos Pulantes caiu três vezes… eu empilhei devagar e ela ficou em pé!",
        brilho: "Eu pulei, escalei e equilibrei… e a torre ficou em pé!" },
      { chave: "nat", lugar: "Planeta das Gavetinhas", fundo: "inf-naturalista", cor: COR.nat, item: "🐚", itemNome: "uma conchinha",
        fala: "Caiu tudo da gaveta! Eu separei as pedrinhas, as conchas e as penas, cada uma no seu lugar.",
        brilho: "Eu olhei bem de pertinho e achei uma pedrinha diferente de todas!" },
      { chave: "inter", lugar: "Planeta das Duas Luas", fundo: "inf-interpessoal", cor: COR.inter, item: "💛", itemNome: "uma pulseira da amizade",
        fala: "A Fifi e o Tato queriam o mesmo balanço. Eu ajudei os dois a combinar!",
        brilho: "Eu chamei todo mundo pra brincar junto e ninguém ficou de fora!" },
      { chave: "intra", lugar: "Planetinha do Pôr do Sol", fundo: "inf-intrapessoal", cor: COR.intra, item: "🪞", itemNome: "um espelhinho do lago",
        fala: "O Calminho ficou vermelhinho. Eu respirei bem devagar com ele, até ele ficar calminho de novo.",
        brilho: "Eu fiquei olhando o lago-espelho e descobri o que eu tava sentindo." },
    ],
  },
  herois: {
    titulo: "A Academia de Super-heróis",
    bolsa: "cinto de herói",
    abertura: "Eu sou {nome}, herói da Academia! A Pressa, aquela nuvem travessa, tá fazendo todo mundo agir sem pensar na Vila Faísca. Meu cinto tá vazio… hora da missão!",
    chegada: "Missão cumprida! Voltei pra minha escola com o cinto cheio. E aprendi o golpe mais forte de todos: a Pausa.",
    mundos: [
      { chave: "ling", lugar: "Torre do Eco", fundo: "her-torre-do-eco", cor: COR.ling, item: "📣", itemNome: "o megafone do eco",
        fala: "Na Torre do Eco, as palavras viram objetos! Eu criei a frase que fez a cidade parar de jogar lixo no rio.",
        brilho: "Eu inventei uma frase tão boa que o eco repetiu três vezes!" },
      { chave: "log", lugar: "Usina do Porquê", fundo: "her-usina-do-porque", cor: COR.log, item: "⚙️", itemNome: "uma engrenagem",
        fala: "A máquina dava 2, 4, 6… e de repente 9! Eu descobri o erro e os robôs voltaram a funcionar.",
        brilho: "Eu expliquei a regra da máquina e os robôs bateram palmas!" },
      { chave: "esp", lugar: "Cidade Dobrável", fundo: "her-cidade-dobravel", cor: COR.esp, item: "🗺️", itemNome: "o mapa dobrável",
        fala: "A casa do Origa virou de ponta-cabeça e a porta foi parar no teto! Eu desenhei o caminho até ela.",
        brilho: "Eu montei a cidade de papel de novo, dobra por dobra!" },
      { chave: "mus", lugar: "Estação do Compasso", fundo: "her-estacao-do-compasso", cor: COR.mus, item: "🎶", itemNome: "o apito do compasso",
        fala: "O trem 3 corria mais que os outros. Eu bati o ritmo certinho e ele voltou pro trilho!",
        brilho: "Eu inventei um ritmo novo e todos os trens seguiram!" },
      { chave: "cor", lugar: "Canteiro Dourado", fundo: "her-canteiro-dourado", cor: COR.cor, item: "🧤", itemNome: "a luva de herói",
        fala: "O guindaste só obedece aos movimentos do corpo! Eu encaixei o último bloco sem derrubar nada.",
        brilho: "Eu fiz o movimento perfeito e o guindaste dançou comigo!" },
      { chave: "nat", lugar: "Museu das Mil Gavetas", fundo: "her-museu-das-mil-gavetas", cor: COR.nat, item: "🔍", itemNome: "a lupa do curador",
        fala: "Chegaram dez pedrinhas que pareciam iguais. Com a lupa, eu achei as diferentes!",
        brilho: "Eu descobri um fóssil escondido na última gaveta!" },
      { chave: "inter", lugar: "Porto dos Recados", fundo: "her-porto-dos-recados", cor: COR.inter, item: "✉️", itemNome: "um recado salvo do mar",
        fala: "O bilhete da Nina caiu no mar e ela achou que o amigo esqueceu dela. Eu ajudei os dois a se entenderem.",
        brilho: "Eu juntei a turma toda e a gente resolveu junto!" },
      { chave: "intra", lugar: "Farol de Dentro", fundo: "her-farol-de-dentro", cor: COR.intra, item: "🔦", itemNome: "a lanterna do farol",
        fala: "No Farol, a luz muda de cor com o que eu sinto. Eu parei, pensei… e escolhi o que fazer.",
        brilho: "Eu fiquei quietinho no farol e descobri o que meu coração queria." },
    ],
  },
  talentos: {
    titulo: "A Agência Bússola",
    bolsa: "mochila de agente",
    abertura: "Agente {nome}, se apresentando. O mundo de Orbe tem oito regiões com problemas que nenhum adulto apressado resolveu. Mochila vazia, passaporte em branco. Missão aceita.",
    chegada: "De volta à base: a minha escola. Mochila cheia e oito carimbos no passaporte. Missão boa é a que a gente pensa antes de agir.",
    mundos: [
      { chave: "ling", lugar: "Arquipélago de Tinta", fundo: "tal-arquipelago-de-tinta", cor: COR.ling, item: "🖋️", itemNome: "a pena das Lontras-Escribas",
        fala: "Missão: uma carta de 30 palavras para reabrir o porto. Pensei em cada palavra. O porto abriu.",
        brilho: "Escrevi a carta mais convincente do arquipélago. As Lontras pediram uma cópia." },
      { chave: "log", lugar: "Planalto das Engrenagens", fundo: "tal-planalto-das-engrenagens", cor: COR.log, item: "⚙️", itemNome: "uma engrenagem de bronze",
        fala: "Uma vila recebe água a cada 3 dias e a outra a cada 4. Diziam que nunca juntas. Provei que no 12º dia, sim.",
        brilho: "Montei o cálculo e as Corujas-Relojoeiras conferiram: estava certo." },
      { chave: "esp", lugar: "Cordilheira Invertida", fundo: "tal-cordilheira-invertida", cor: COR.esp, item: "🧭", itemNome: "a bússola invertida",
        fala: "Montanhas de ponta-cabeça. Virei o mapa, tracei a rota e encontrei a caverna.",
        brilho: "Desenhei um mapa novo da cordilheira. Os Morcegos-Cartógrafos adotaram." },
      { chave: "mus", lugar: "Desfiladeiro dos Ecos", fundo: "tal-desfiladeiro-dos-ecos", cor: COR.mus, item: "🎼", itemNome: "a partitura do eco",
        fala: "A represa só abre com o ritmo certo. Uma batida chegava atrasada. Achei qual era e acertei.",
        brilho: "Criei um ritmo novo e a represa abriu na primeira tentativa." },
      { chave: "cor", lugar: "Dunas Douradas de Kalu", fundo: "tal-dunas-douradas-de-kalu", cor: COR.cor, item: "⛵", itemNome: "um navio de areia em miniatura",
        fala: "O mastro caía quando o vento virava. Na segunda tentativa, mudei a base. Ficou de pé.",
        brilho: "Construí o mastro mais firme das dunas, com as minhas mãos." },
      { chave: "nat", lugar: "Cavernas do Inventário", fundo: "tal-cavernas-do-inventario", cor: COR.nat, item: "💎", itemNome: "um cristal raro",
        fala: "Um objeto não cabia em prateleira nenhuma. Fiz perguntas a ele e criei uma prateleira nova.",
        brilho: "Classifiquei uma coleção inteira que estava misturada há cem anos." },
      { chave: "inter", lugar: "Costa das Mil Bandeiras", fundo: "tal-costa-das-mil-bandeiras", cor: COR.inter, item: "🚩", itemNome: "uma bandeira da Costa",
        fala: "Gaivotas e caranguejos queriam o mesmo cais. Ouvi os dois antes de propor. Ninguém saiu perdendo.",
        brilho: "Reuni o Conselho das Marés e todo mundo foi ouvido." },
      { chave: "intra", lugar: "Mirante do Entardecer", fundo: "tal-mirante-do-entardecer", cor: COR.intra, item: "🌅", itemNome: "um pôr do sol guardado",
        fala: "Errei uma missão e quis desistir. A Guardiã Raposa só me fez perguntas… e eu entendi o que eu sentia.",
        brilho: "No silêncio do mirante, descobri o que eu faria diferente amanhã." },
    ],
  },
  casas: {
    titulo: "As 8 Casas",
    bolsa: "Jornada",
    abertura: "Eu sou {nome}. No Fundamental 2, a escola tem oito Casas, oito torres. Neste ano eu vou entrar em cada uma. Minha Jornada começa em branco.",
    chegada: "Voltei. Mesma escola, outra pessoa. A minha Jornada está cheia: é o mapa de quem eu sou e de quem eu quero ser.",
    mundos: [
      { chave: "ling", lugar: "Torre da Linguística", fundo: "", cor: COR.ling, item: "📝", itemNome: "um texto meu",
        fala: "Aprendi a desmontar um texto bom, peça por peça. Depois escrevi o meu.",
        brilho: "Escrevi um texto que fez a turma inteira mudar de opinião." },
      { chave: "log", lugar: "Torre da Lógico-Matemática", fundo: "", cor: COR.log, item: "📐", itemNome: "uma prova que eu fiz",
        fala: "Descobri que provar é bem mais forte do que achar.",
        brilho: "Resolvi um problema que parecia sem saída e expliquei o caminho." },
      { chave: "esp", lugar: "Torre da Espacial", fundo: "", cor: COR.esp, item: "🧊", itemNome: "um modelo que eu criei",
        fala: "Olhei o mesmo problema de outro ângulo, e ele mudou de tamanho.",
        brilho: "Projetei uma solução que ninguém tinha imaginado." },
      { chave: "mus", lugar: "Torre da Musical", fundo: "", cor: COR.mus, item: "🎧", itemNome: "uma faixa minha",
        fala: "Entendi por que uma música mexe com a gente. E fiz uma.",
        brilho: "Compus algo que a Casa inteira cantou junto." },
      { chave: "cor", lugar: "Torre da Corporal-Cinestésica", fundo: "", cor: COR.cor, item: "🏀", itemNome: "um gesto treinado",
        fala: "Treinei um movimento até ele virar meu.",
        brilho: "Superei um limite do meu corpo que eu achava impossível." },
      { chave: "nat", lugar: "Torre da Naturalista", fundo: "", cor: COR.nat, item: "🌿", itemNome: "um padrão da natureza",
        fala: "Observei de perto, classifiquei e encontrei o padrão escondido.",
        brilho: "Investiguei um fenômeno real e cheguei a uma conclusão minha." },
      { chave: "inter", lugar: "Torre da Interpessoal", fundo: "", cor: COR.inter, item: "🤝", itemNome: "um acordo do grupo",
        fala: "Liderei um grupo sem precisar mandar em ninguém.",
        brilho: "Juntei pessoas que pensavam diferente num projeto só." },
      { chave: "intra", lugar: "Torre da Intrapessoal", fundo: "", cor: COR.intra, item: "🧭", itemNome: "uma página sobre mim",
        fala: "Escrevi na minha Jornada quem eu sou e quem eu quero ser.",
        brilho: "Entendi uma coisa sobre mim que eu nunca tinha percebido." },
    ],
  },
};

export const primeiroNome = (n: string) => {
  const p = n.trim().split(/\s+/)[0] ?? "";
  return p.charAt(0).toLocaleUpperCase("pt-BR") + p.slice(1).toLocaleLowerCase("pt-BR");
};

// Boneco da biblioteca (fundo transparente): /arboria/bonecos/<universo>-<genero>-<pele>-<cabelo>.webp
export const bonecoPadrao = (u: Universo, genero: string, pele: string, cabelo: string) => `/arboria/bonecos/${u}-${genero}-${pele}-${cabelo}.webp`;
