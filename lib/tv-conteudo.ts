/**
 * O conteúdo pronto das telas automáticas da TV (Pedro, 16/11/2026: "quero do 1 ao 9 implantado").
 * Gira sozinho, um por dia (pelo dia do ano), sem ninguém precisar digitar. Para pôr mais, é só aumentar a lista.
 */

/** Desafio Amadeus: a pergunta aparece e, uns segundos depois, a resposta. */
export const DESAFIOS: { p: string; r: string }[] = [
  { p: "Qual é o maior planeta do Sistema Solar?", r: "Júpiter" },
  { p: "Quantas patas tem uma aranha?", r: "Oito" },
  { p: "Qual é o maior oceano do mundo?", r: "O Oceano Pacífico" },
  { p: "Quantos dias tem um ano bissexto?", r: "366 dias" },
  { p: "Qual é a capital do Rio Grande do Norte?", r: "Natal" },
  { p: "Qual é o animal terrestre mais rápido?", r: "O guepardo" },
  { p: "Quantos lados tem um hexágono?", r: "Seis" },
  { p: "Qual planeta é conhecido como planeta vermelho?", r: "Marte" },
  { p: "Quem pintou a Mona Lisa?", r: "Leonardo da Vinci" },
  { p: "Qual é o maior mamífero do mundo?", r: "A baleia-azul" },
  { p: "Quantos ossos tem o corpo de um adulto?", r: "206" },
  { p: "Qual é o rio mais volumoso do mundo?", r: "O Rio Amazonas" },
  { p: "Quanto é 7 vezes 8?", r: "56" },
  { p: "Qual é o gás que as plantas soltam na fotossíntese?", r: "O oxigênio" },
  { p: "Quantas pontas tem uma estrela-do-mar comum?", r: "Cinco" },
  { p: "Em que ano o Brasil ficou independente?", r: "Em 1822" },
  { p: "Qual é o menor planeta do Sistema Solar?", r: "Mercúrio" },
  { p: "Quantos minutos tem uma hora e meia?", r: "90 minutos" },
  { p: "Qual é a estrela mais próxima da Terra?", r: "O Sol" },
  { p: "Quantas cores tem o arco-íris?", r: "Sete" },
  { p: "Qual é o órgão que bombeia o sangue pelo corpo?", r: "O coração" },
  { p: "Qual é o maior país da América do Sul?", r: "O Brasil" },
  { p: "Quanto é a metade de 150?", r: "75" },
  { p: "Qual é o idioma oficial do Brasil?", r: "O português" },
  { p: "Que animal é conhecido como o rei da selva?", r: "O leão" },
  { p: "Quantos jogadores um time de futebol tem em campo?", r: "Onze" },
  { p: "Qual é a capital do Brasil?", r: "Brasília" },
  { p: "A água ferve a quantos graus Celsius, ao nível do mar?", r: "100 °C" },
  { p: "Qual é o satélite natural da Terra?", r: "A Lua" },
  { p: "Quantos segundos tem um minuto?", r: "60" },
  { p: "Qual é a forma da Terra?", r: "Quase uma esfera, um pouco achatada nos polos" },
  { p: "Que instrumento tem teclas brancas e pretas?", r: "O piano" },
  { p: "Quanto é 12 mais 19?", r: "31" },
  { p: "Qual é o animal que muda de cor para se esconder?", r: "O camaleão" },
  { p: "Quantos meses do ano têm 31 dias?", r: "Sete" },
  { p: "Qual é o maior deserto quente do mundo?", r: "O Saara" },
  { p: "Quem escreveu o Sítio do Picapau Amarelo?", r: "Monteiro Lobato" },
  { p: "Qual é o nome do nosso planeta?", r: "Terra" },
  { p: "Quantas horas tem um dia?", r: "24 horas" },
  { p: "Qual é a ave que não voa e vive na Antártida?", r: "O pinguim" },
  { p: "Quanto é 100 dividido por 4?", r: "25" },
  { p: "Que parte da planta fica embaixo da terra?", r: "A raiz" },
  { p: "Qual é o metal líquido em temperatura ambiente?", r: "O mercúrio" },
  { p: "Qual é a praia mais famosa de Natal?", r: "Ponta Negra, com o Morro do Careca" },
  { p: "Quantas pernas tem um inseto?", r: "Seis" },
  { p: "Qual é o maior osso do corpo humano?", r: "O fêmur, na coxa" },
  { p: "Qual é o resultado de 9 x 9?", r: "81" },
  { p: "Qual é a árvore símbolo do Brasil?", r: "O pau-brasil" },
  { p: "Quantas vogais tem o nosso alfabeto?", r: "Cinco: A, E, I, O, U" },
  { p: "Qual é o planeta com os anéis mais famosos?", r: "Saturno" },
  { p: "Quantas semanas tem um ano?", r: "52 semanas" },
  { p: "Qual é o animal que tem tromba?", r: "O elefante" },
  { p: "De onde vem a energia da usina hidrelétrica?", r: "Da força da água" },
  { p: "Quanto é 25 mais 25 mais 25?", r: "75" },
  { p: "Qual é o maior cajueiro do mundo e onde fica?", r: "Em Pirangi, no Rio Grande do Norte" },
  { p: "Qual sentido usamos com o nariz?", r: "O olfato" },
  { p: "Quantos centímetros tem um metro?", r: "100 centímetros" },
  { p: "Qual é a cor que se forma misturando azul e amarelo?", r: "Verde" },
  { p: "Quem foi o primeiro homem a pisar na Lua?", r: "Neil Armstrong, em 1969" },
  { p: "Quantos zeros tem o número mil?", r: "Três" },
];

/** Palavra do dia em inglês. */
export const PALAVRAS: { en: string; pt: string; ex: string }[] = [
  { en: "Friend", pt: "amigo, amiga", ex: "She is my best friend." },
  { en: "Book", pt: "livro", ex: "I love this book." },
  { en: "School", pt: "escola", ex: "My school is great." },
  { en: "Happy", pt: "feliz", ex: "I am happy today." },
  { en: "Water", pt: "água", ex: "Drink water every day." },
  { en: "Sun", pt: "sol", ex: "The sun is hot." },
  { en: "Family", pt: "família", ex: "I love my family." },
  { en: "Tree", pt: "árvore", ex: "The tree is tall." },
  { en: "Learn", pt: "aprender", ex: "We learn together." },
  { en: "Dream", pt: "sonho, sonhar", ex: "Follow your dream." },
  { en: "Beach", pt: "praia", ex: "Natal has beautiful beaches." },
  { en: "Teacher", pt: "professor, professora", ex: "My teacher is kind." },
  { en: "Music", pt: "música", ex: "I listen to music." },
  { en: "Star", pt: "estrela", ex: "Look at that star!" },
  { en: "Moon", pt: "lua", ex: "The moon is bright tonight." },
  { en: "Color", pt: "cor", ex: "What is your favorite color?" },
  { en: "Heart", pt: "coração", ex: "Put your heart into it." },
  { en: "Brave", pt: "corajoso, corajosa", ex: "Be brave!" },
  { en: "Kind", pt: "gentil", ex: "Be kind to everyone." },
  { en: "Play", pt: "brincar, jogar", ex: "Let's play outside." },
  { en: "Draw", pt: "desenhar", ex: "I like to draw animals." },
  { en: "Sing", pt: "cantar", ex: "We sing a song." },
  { en: "Run", pt: "correr", ex: "I run very fast." },
  { en: "Bird", pt: "pássaro", ex: "The bird can fly." },
  { en: "Flower", pt: "flor", ex: "This flower smells good." },
  { en: "Rain", pt: "chuva", ex: "I like the sound of rain." },
  { en: "Morning", pt: "manhã", ex: "Good morning!" },
  { en: "Thank you", pt: "obrigado, obrigada", ex: "Thank you for your help." },
  { en: "Please", pt: "por favor", ex: "Can you help me, please?" },
  { en: "Smile", pt: "sorriso, sorrir", ex: "Your smile is beautiful." },
  { en: "Idea", pt: "ideia", ex: "That is a great idea!" },
  { en: "World", pt: "mundo", ex: "The world is big." },
  { en: "Animal", pt: "animal", ex: "The dog is my favorite animal." },
  { en: "Apple", pt: "maçã", ex: "An apple a day." },
  { en: "House", pt: "casa", ex: "Welcome to my house." },
  { en: "Window", pt: "janela", ex: "Open the window, please." },
  { en: "Strong", pt: "forte", ex: "You are strong." },
  { en: "Question", pt: "pergunta", ex: "I have a question." },
  { en: "Answer", pt: "resposta", ex: "What is the answer?" },
  { en: "Together", pt: "juntos, juntas", ex: "We are better together." },
  { en: "Read", pt: "ler", ex: "I read every night." },
  { en: "Write", pt: "escrever", ex: "Write your name here." },
  { en: "Listen", pt: "ouvir, escutar", ex: "Listen to the teacher." },
  { en: "Share", pt: "dividir, compartilhar", ex: "Let's share the cake." },
  { en: "Help", pt: "ajudar, ajuda", ex: "Can I help you?" },
  { en: "Sky", pt: "céu", ex: "The sky is blue." },
  { en: "Sea", pt: "mar", ex: "The sea is calm today." },
  { en: "Butterfly", pt: "borboleta", ex: "A butterfly is on the flower." },
  { en: "Curious", pt: "curioso, curiosa", ex: "Stay curious!" },
  { en: "Proud", pt: "orgulhoso, orgulhosa", ex: "I am proud of you." },
];

/**
 * Inteligência do dia: as 8 do Arboria, uma por dia, com o que é em palavras simples e algo para experimentar hoje
 * (a ideia de "viver cada uma", sem rotular ninguém: todo mundo tem as 8). Nomes e cores das Casas: lib/casas.ts.
 */
export const INTELIGENCIAS_TV: { nome: string; cor: string; oque: string; hoje: string }[] = [
  { nome: "Linguística", cor: "#60A5FA", oque: "A inteligência das palavras: falar, ler, escrever e contar histórias.", hoje: "Conte para alguém, com detalhes, a melhor parte do seu dia." },
  { nome: "Lógico-Matemática", cor: "#34D399", oque: "A inteligência dos números e do raciocínio: contar, comparar e descobrir o porquê.", hoje: "Conte quantos degraus tem a escada que você mais usa." },
  { nome: "Espacial", cor: "#A78BFA", oque: "A inteligência das imagens: enxergar formas, cores, caminhos e lugares na cabeça.", hoje: "Desenhe o caminho da sua casa até a escola." },
  { nome: "Musical", cor: "#F87171", oque: "A inteligência dos sons: perceber ritmos, melodias e o barulho do mundo.", hoje: "Feche os olhos e conte quantos sons diferentes você escuta." },
  { nome: "Corporal-Cinestésica", cor: "#FBBF24", oque: "A inteligência do corpo: se mexer, construir com as mãos e se expressar com gestos.", hoje: "Conte uma história só com gestos, sem falar nada." },
  { nome: "Naturalista", cor: "#A3E635", oque: "A inteligência da natureza: observar bichos, plantas, o céu e o tempo.", hoje: "Repare numa planta da escola: a cor, o cheiro e a forma das folhas." },
  { nome: "Interpessoal", cor: "#22D3EE", oque: "A inteligência das pessoas: entender os outros, conversar e trabalhar junto.", hoje: "Pergunte a um colega como foi o dia dele e escute de verdade." },
  { nome: "Intrapessoal", cor: "#FB923C", oque: "A inteligência de si mesmo: perceber o que sente, o que quer e do que gosta.", hoje: "Pense em uma coisa que te deixou feliz hoje e por quê." },
];

/** O tempo: os códigos da Open-Meteo (WMO) em palavras e o ícone da TV. */
export function tempoEmPalavras(codigo: number): { txt: string; icone: "sol" | "nuvem" | "chuva" } {
  if (codigo === 0) return { txt: "Céu limpo", icone: "sol" };
  if (codigo <= 2) return { txt: "Sol com algumas nuvens", icone: "sol" };
  if (codigo === 3) return { txt: "Nublado", icone: "nuvem" };
  if (codigo <= 48) return { txt: "Neblina", icone: "nuvem" };
  if (codigo <= 57) return { txt: "Garoa", icone: "chuva" };
  if (codigo <= 67) return { txt: "Chuva", icone: "chuva" };
  if (codigo <= 82) return { txt: "Pancadas de chuva", icone: "chuva" };
  return { txt: "Chuva com trovoadas", icone: "chuva" };
}

/** Uma dica curta para o dia, pelo tempo. */
export function dicaDoTempo(max: number, chuva: number): string {
  if (chuva >= 60) return "Dia de chuva: leve o guarda-chuva!";
  if (max >= 31) return "Dia quente: leve a garrafinha de água!";
  if (chuva >= 30) return "Pode chover: bom ter um guarda-chuva por perto.";
  return "Bom dia para aprender!";
}
