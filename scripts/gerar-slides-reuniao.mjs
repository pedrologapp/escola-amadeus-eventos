import fs from "node:fs";
import path from "node:path";

/**
 * Slides da Gislene (Infantil) e da Adriana (Fundamental 1 e 2) para a
 * Reunião de Abertura das Matrículas 2027.
 *
 * O conteúdo veio de docs/EventoRematricula/Slides_Gislene_Adriana.md.
 *
 * A tela do evento é 2x2, quadrada. Por isso cada slide é 1:1, e não 16:9:
 * num projetor quadrado, o 16:9 vira uma tarja com duas faixas pretas.
 *
 * Duas decisões de desenho que valem ser ditas:
 *
 * 1. As frases grandes são em serifa (Fraunces), que é a mesma família de
 *    títulos do folder digital. Sans em tudo ficava com cara de relatório.
 * 2. O conteúdo vive em cartões CREME sobre o azul. Cartão escuro sobre fundo
 *    escuro some no projetor; creme sobre azul tem o contraste de um impresso
 *    e é o que a última fileira consegue ler.
 *
 * Uso:  node scripts/gerar-slides-reuniao.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const LADO = "200mm"; // 200x200mm: na tela de 2m, cada milímetro vira 1cm

const raiz = path.join(import.meta.dirname, "..");

/* As imagens vão embutidas: o HTML abre em qualquer máquina, sem depender da
   pasta public estar do lado. */
function embutir(relativo) {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:image/png;base64,${dados}`;
}

const LOGO = embutir("public/folder/logo-horizontal.png"); // 1600px, feito para fundo escuro
const GLOBO = embutir("public/folder/marca-globo.png"); // só a marca d'água, sai a 6% de opacidade

/* -------------------------------------------------------------- conteúdo */

const GISLENE = {
  arquivo: "Slides_Gislene_Infantil",
  titulo: "Gislene Sátiro - Educação Infantil",
  etiquetaPadrao: "Educação Infantil",
  slides: [
    {
      tipo: "abertura",
      nome: "Gislene Sátiro",
      cargo: "Coordenadora do Infantil",
    },
    {
      tipo: "dialogo",
      etiqueta: "Educação Infantil",
      pergunta: "“O que você fez hoje na escola?”",
      resposta: "“Nada.”",
    },
    {
      tipo: "frase",
      etiqueta: "Por que mudamos",
      frase: "Criança de 3 anos não precisa de mais tarefa.",
      destaque: "Precisa de mais pergunta.",
      nota:
        "Por isso a escolha foi a Coleção Rios. As rotinas de pensamento dela vêm das pesquisas do Project Zero, da Universidade Harvard.",
    },
    {
      tipo: "cartoes",
      etiqueta: "Como isso vira aula",
      cartoes: [
        { texto: "“O que podemos explorar dentro de uma cozinha?”" },
        { texto: "“O que um rosto pode comunicar?”" },
        { texto: "“Como podemos cuidar dos animais?”" },
      ],
      nota: "Cada uma dessas perguntas ocupa um mês inteiro de investigação.",
    },
    {
      tipo: "cartoes",
      etiqueta: "O que você vai ver em casa",
      cartoes: [
        {
          titulo: "O Diário de Bordo",
          texto:
            "O caderno em que só o seu filho escreve. No fim do ano, ele vai para casa.",
        },
        {
          titulo: "O Portfólio",
          texto: "Fotos e registros do que ele fez, ao longo do ano inteiro.",
        },
      ],
    },
    {
      tipo: "fecho",
      frase: "A escola deixa de ser",
      destaque: "uma caixa fechada.",
    },
  ],
};

const ADRIANA = {
  arquivo: "Slides_Adriana_Fundamental",
  titulo: "Adriana Alves - Fundamental 1 e 2",
  etiquetaPadrao: "Fundamental 1 e 2",
  slides: [
    {
      tipo: "abertura",
      nome: "Adriana Alves",
      cargo: "Coordenadora Pedagógica",
      cargo2: "Fundamental 1 e Fundamental 2",
    },
    {
      tipo: "dialogo",
      etiqueta: "Fundamental 1 e 2",
      pergunta: "Quando você descobre que seu filho não entendeu?",
      resposta: "No boletim. E aí o bimestre já acabou.",
    },
    {
      tipo: "frase",
      etiqueta: "Por que mudamos",
      frase: "A gente quis enxergar o erro",
      destaque: "na semana em que ele acontece.",
      nota:
        "Não foi trocar de livro por trocar. Foi para o professor agir enquanto ainda dá tempo.",
    },
    {
      tipo: "colunas",
      etiqueta: "Não é igual para todo mundo",
      colunas: [
        {
          titulo: "Do 1º ao 5º ano",
          texto:
            "O livro é a base. Quem usa a plataforma é o professor, para preparar e enriquecer a aula.",
        },
        {
          titulo: "Do 6º ao 9º ano",
          texto:
            "Cada matéria tem o seu livro. E toda semana a plataforma monta uma lista de estudo a partir dos erros do aluno.",
        },
      ],
      nota: "Dois alunos da mesma turma recebem listas diferentes.",
    },
    {
      tipo: "relatorio",
      etiqueta: "O que você vai ver em casa",
      chamada: "Toda sexta-feira",
      texto: "Um relatório do seu filho, no seu e-mail.",
      itens: [
        "O que ele recebeu na semana",
        "O que entregou",
        "Como foi em cada matéria",
      ],
    },
    {
      tipo: "fecho",
      frase: "Você vai acompanhar o ano inteiro.",
      destaque: "Não só o resultado dele.",
    },
  ],
};

/* ------------------------------------------------------------------ css */

const CSS = `
  @page{ size:${LADO} ${LADO}; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:"DM Sans","Segoe UI",Arial,sans-serif;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
    background:#05060C;
  }

  .slide{
    width:${LADO};height:${LADO};position:relative;overflow:hidden;
    page-break-after:always;
    background:
      radial-gradient(100% 62% at 50% 0%, #1B2A58 0%, rgba(27,42,88,0) 64%),
      radial-gradient(140% 100% at 50% 118%, #0E1B3E 0%, rgba(14,27,62,0) 58%),
      #070B18;
    display:flex;flex-direction:column;
    padding:20mm 19mm 16mm;color:#FAF7F0;
  }
  .slide:last-child{page-break-after:auto}

  /* marca d'água: dá profundidade sem competir com o texto */
  .agua{
    position:absolute;right:-42mm;bottom:-46mm;width:150mm;
    opacity:.055;filter:grayscale(1) brightness(2.4);
  }

  /* ------------------------------------------------------------ cabeçalho */
  .topo{
    position:relative;z-index:1;
    display:flex;align-items:baseline;justify-content:space-between;gap:8mm;
  }
  .etiqueta{
    font-size:12.5pt;font-weight:700;letter-spacing:.26em;
    text-transform:uppercase;color:#E8B44C;
  }
  .indice{
    font-size:11pt;font-weight:700;letter-spacing:.18em;
    color:rgba(250,247,240,.34);
  }

  .corpo{position:relative;z-index:1;flex:1;display:flex;flex-direction:column;justify-content:center}

  /* ----------------------------------------------------------- tipografia */
  .serifa{
    font-family:Fraunces,Georgia,serif;font-optical-sizing:auto;
    font-weight:600;letter-spacing:-.018em;
  }
  .declaracao{font-size:40pt;line-height:1.12}
  .declaracao .ouro{color:#E8B44C;display:block}

  .pergunta{font-size:35pt;line-height:1.14;color:#FAF7F0}
  .resposta{
    margin-top:11mm;padding-left:8mm;border-left:1.6mm solid #E8B44C;
    font-size:35pt;line-height:1.14;color:#E8B44C;
  }

  .nota{
    margin-top:10mm;font-size:13.5pt;font-weight:500;line-height:1.5;
    color:rgba(250,247,240,.58);max-width:140mm;
  }

  /* --------------------------------------------------------------- cartões
     Creme sobre azul: é o contraste que sobrevive a um projetor de escola. */
  .pilha{display:flex;flex-direction:column;gap:6mm}
  .cartao{
    background:#FAF7F0;border-radius:8mm;padding:8mm 9mm;
    border-top:1.4mm solid #E8B44C;
  }
  .cartao h3{
    font-family:Fraunces,Georgia,serif;font-weight:600;letter-spacing:-.02em;
    font-size:23pt;line-height:1.1;color:#17223D;
  }
  .cartao h3 + p{margin-top:4mm}
  .cartao p{font-size:17.5pt;font-weight:500;line-height:1.36;color:#48546F}
  .cartao .destaque{
    font-family:Fraunces,Georgia,serif;font-weight:600;letter-spacing:-.02em;
    font-size:21pt;line-height:1.18;color:#17223D;
  }

  .colunas{display:flex;gap:7mm;align-items:stretch}
  .colunas .cartao{flex:1;display:flex;flex-direction:column}
  .colunas h3{
    font-family:"DM Sans",sans-serif;font-weight:800;font-size:14.5pt;
    letter-spacing:.14em;text-transform:uppercase;color:#B9862F;
  }
  .colunas p{margin-top:6mm;font-size:18pt;font-weight:600;color:#17223D;line-height:1.3}

  /* ------------------------------------------------------------- relatório */
  .selo{
    display:inline-flex;align-self:flex-start;align-items:center;gap:4mm;
    background:#E8B44C;color:#17223D;border-radius:99mm;
    padding:4.5mm 9mm;font-size:15pt;font-weight:800;letter-spacing:.14em;
    text-transform:uppercase;
  }
  .frase-relatorio{
    margin-top:9mm;font-family:Fraunces,Georgia,serif;font-weight:600;
    font-size:33pt;line-height:1.14;letter-spacing:-.02em;
  }
  .marcadores{margin-top:12mm;display:flex;flex-direction:column;gap:5.5mm}
  .marcador{
    display:flex;align-items:center;gap:5mm;
    font-size:18pt;font-weight:600;color:rgba(250,247,240,.86);
  }
  .ponto{width:3.2mm;height:3.2mm;border-radius:50%;background:#E8B44C;flex:0 0 auto}

  /* -------------------------------------------------------------- abertura */
  .abertura{align-items:center;text-align:center}
  .abertura .logo{width:118mm;height:auto;display:block}
  .abertura .nome{
    margin-top:19mm;font-family:Fraunces,Georgia,serif;font-weight:600;
    font-size:49pt;line-height:1;letter-spacing:-.025em;color:#FAF7F0;
  }
  .abertura .fio{
    margin-top:10mm;width:24mm;height:.8mm;border-radius:1mm;background:#E8B44C;
  }
  .abertura .cargo{
    margin-top:10mm;font-size:15.5pt;font-weight:700;letter-spacing:.2em;
    text-transform:uppercase;color:#E8B44C;line-height:1.75;
  }
  .abertura .cargo span{display:block;color:rgba(232,180,76,.74)}

  /* ---------------------------------------------------------------- rodapé */
  .rodape{
    position:relative;z-index:1;
    display:flex;align-items:center;gap:6mm;
    font-size:10.5pt;font-weight:700;letter-spacing:.2em;text-transform:uppercase;
    color:rgba(232,180,76,.6);
  }
  .risco{flex:1;height:.3mm;background:rgba(232,180,76,.22)}
`;

/* ---------------------------------------------------------------- montagem */

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function montarSlide(s, etiquetaPadrao, i, total) {
  const etiqueta = s.etiqueta ?? etiquetaPadrao;
  let corpo = "";

  if (s.tipo === "abertura") {
    const segunda = s.cargo2 ? `<span>${esc(s.cargo2)}</span>` : "";
    corpo = `
      <img class="logo" src="${LOGO}" alt="Centro Educacional Amadeus">
      <p class="nome serifa">${esc(s.nome)}</p>
      <span class="fio"></span>
      <p class="cargo">${esc(s.cargo)}${segunda}</p>`;
  }

  if (s.tipo === "dialogo") {
    corpo = `
      <p class="pergunta serifa">${esc(s.pergunta)}</p>
      <p class="resposta serifa">${esc(s.resposta)}</p>`;
  }

  if (s.tipo === "frase" || s.tipo === "fecho") {
    corpo = `<p class="declaracao serifa">${esc(s.frase)}<span class="ouro">${esc(
      s.destaque,
    )}</span></p>`;
  }

  if (s.tipo === "cartoes") {
    corpo = `<div class="pilha">${s.cartoes
      .map((c) =>
        c.titulo
          ? `<div class="cartao"><h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p></div>`
          : `<div class="cartao"><p class="destaque">${esc(c.texto)}</p></div>`,
      )
      .join("")}</div>`;
  }

  if (s.tipo === "colunas") {
    corpo = `<div class="colunas">${s.colunas
      .map(
        (c) =>
          `<div class="cartao"><h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p></div>`,
      )
      .join("")}</div>`;
  }

  if (s.tipo === "relatorio") {
    corpo = `
      <span class="selo">${esc(s.chamada)}</span>
      <p class="frase-relatorio">${esc(s.texto)}</p>
      <div class="marcadores">${s.itens
        .map((t) => `<p class="marcador"><span class="ponto"></span>${esc(t)}</p>`)
        .join("")}</div>`;
  }

  const nota = s.nota ? `<p class="nota">${esc(s.nota)}</p>` : "";
  const limpo = s.tipo === "abertura" || s.tipo === "fecho";
  const topo = limpo
    ? ""
    : `<div class="topo">
      <span class="etiqueta">${esc(etiqueta)}</span>
      <span class="indice">${String(i).padStart(2, "0")} / ${String(total - 1).padStart(2, "0")}</span>
    </div>`;

  return `  <section class="slide">
    <img class="agua" src="${GLOBO}" alt="">
    ${topo}
    <div class="corpo${s.tipo === "abertura" ? " abertura" : ""}">
      ${corpo}
      ${nota}
    </div>
    <div class="rodape"><span>Amadeus 30 anos</span><span class="risco"></span><span>Matrículas 2027</span></div>
  </section>`;
}

function montarDeck(deck) {
  const total = deck.slides.length;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(deck.titulo)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,700;9..40,800&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap">
<style>${CSS}</style>
</head>
<body>
${deck.slides
  .map((s, i) => montarSlide(s, deck.etiquetaPadrao, i, total))
  .join("\n")}
</body>
</html>`;
}

for (const deck of [GISLENE, ADRIANA]) {
  fs.writeFileSync(path.join(saida, deck.arquivo + ".html"), montarDeck(deck));
  console.log(deck.arquivo + ".html", deck.slides.length, "slides");
}
