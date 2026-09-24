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
 * Uso:  node scripts/gerar-slides-reuniao.mjs <pasta-de-saida>
 * Depois é só imprimir os HTML em PDF pelo Chrome headless.
 */

const saida = process.argv[2] ?? ".";
const LADO = "200mm"; // 200x200mm: projetado numa tela de 2m, cada mm vira 1cm

/* -------------------------------------------------------------- conteúdo */

const GISLENE = {
  arquivo: "Slides_Gislene_Infantil",
  titulo: "Gislene - Educação Infantil",
  etiquetaPadrao: "Educação Infantil",
  slides: [
    {
      tipo: "dialogo",
      etiqueta: "Educação Infantil",
      linhas: ["“O que você fez hoje na escola?”", "“Nada.”"],
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
      tipo: "lista",
      etiqueta: "Como isso vira aula",
      itens: [
        "“O que podemos explorar dentro de uma cozinha?”",
        "“O que um rosto pode comunicar?”",
        "“Como podemos cuidar dos animais?”",
      ],
      nota: "Cada uma dessas perguntas ocupa um mês inteiro de investigação.",
    },
    {
      tipo: "blocos",
      etiqueta: "O que você vai ver em casa",
      blocos: [
        {
          titulo: "O Diário de Bordo",
          texto:
            "O caderno em que só o seu filho escreve. No fim do ano, ele vai para casa.",
        },
        {
          titulo: "O Portfólio",
          texto:
            "Fotos e registros do que ele fez, ao longo do ano inteiro.",
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
  titulo: "Adriana - Fundamental 1 e 2",
  etiquetaPadrao: "Fundamental 1 e 2",
  slides: [
    {
      tipo: "dialogo",
      etiqueta: "Fundamental 1 e 2",
      linhas: [
        "Quando você descobre que seu filho não entendeu?",
        "No boletim. E aí o bimestre já acabou.",
      ],
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

/* ----------------------------------------------------------------- folha */

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
      radial-gradient(115% 70% at 50% 8%, #16224A 0%, #0A0D18 58%, #05060C 100%);
    display:flex;flex-direction:column;
    padding:22mm 20mm 18mm;color:#FAF7F0;
  }
  .slide:last-child{page-break-after:auto}

  .etiqueta{
    font-size:13pt;font-weight:800;letter-spacing:.24em;
    text-transform:uppercase;color:#E8B44C;
  }

  .corpo{flex:1;display:flex;flex-direction:column;justify-content:center}

  /* uma ideia por slide: o texto grande é sempre o que a última fileira lê */
  .grande{font-size:40pt;font-weight:800;line-height:1.1;letter-spacing:-.03em}
  .grande .ouro{color:#E8B44C;display:block}
  .media{font-size:31pt;font-weight:800;line-height:1.16;letter-spacing:-.025em}

  .nota{
    margin-top:12mm;font-size:15pt;font-weight:500;line-height:1.45;
    color:rgba(250,247,240,.6);max-width:145mm;
  }

  /* diálogo: a pergunta em branco, a resposta em dourado */
  .fala{font-size:36pt;font-weight:800;line-height:1.14;letter-spacing:-.03em}
  .fala + .fala{margin-top:9mm;color:#E8B44C}

  /* lista de perguntas de investigação */
  .itens{display:flex;flex-direction:column;gap:7mm}
  .item{
    border-left:1.4mm solid #E8B44C;padding-left:7mm;
    font-size:25pt;font-weight:700;line-height:1.2;letter-spacing:-.02em;
  }

  /* dois blocos empilhados */
  .blocos{display:flex;flex-direction:column;gap:9mm}
  .bloco{
    background:rgba(250,247,240,.06);border:.5mm solid rgba(250,247,240,.14);
    border-radius:9mm;padding:10mm 11mm;
  }
  .bloco h3{font-size:24pt;font-weight:800;color:#E8B44C;letter-spacing:-.02em}
  .bloco p{margin-top:4mm;font-size:19pt;font-weight:500;line-height:1.34;color:rgba(250,247,240,.84)}

  /* duas colunas lado a lado */
  .colunas{display:flex;gap:8mm;align-items:stretch}
  .coluna{
    flex:1;background:rgba(250,247,240,.06);border:.5mm solid rgba(250,247,240,.14);
    border-radius:9mm;padding:10mm 9mm;
  }
  .coluna h3{
    font-size:16pt;font-weight:800;letter-spacing:.1em;text-transform:uppercase;
    color:#E8B44C;
  }
  .coluna p{margin-top:6mm;font-size:19pt;font-weight:600;line-height:1.3}

  /* o relatório de sexta */
  .chamada{font-size:38pt;font-weight:800;letter-spacing:-.03em;color:#E8B44C}
  .sub{margin-top:5mm;font-size:26pt;font-weight:700;line-height:1.2;letter-spacing:-.02em}
  .marcadores{margin-top:11mm;display:flex;flex-direction:column;gap:5mm}
  .marcador{display:flex;align-items:center;gap:5mm;font-size:19pt;font-weight:600;color:rgba(250,247,240,.84)}
  .ponto{width:3.5mm;height:3.5mm;border-radius:50%;background:#E8B44C;flex:0 0 auto}

  .rodape{
    display:flex;align-items:center;gap:5mm;
    font-size:11pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;
    color:rgba(232,180,76,.72);
  }
  .risco{flex:1;height:.4mm;background:rgba(232,180,76,.28)}
`;

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function montarSlide(s, etiquetaPadrao) {
  const etiqueta = s.etiqueta ?? etiquetaPadrao;
  let corpo = "";

  if (s.tipo === "dialogo") {
    corpo = s.linhas.map((l) => `<p class="fala">${esc(l)}</p>`).join("\n");
  }

  if (s.tipo === "frase" || s.tipo === "fecho") {
    corpo = `<p class="grande">${esc(s.frase)}<span class="ouro">${esc(s.destaque)}</span></p>`;
  }

  if (s.tipo === "lista") {
    corpo = `<div class="itens">${s.itens
      .map((i) => `<p class="item">${esc(i)}</p>`)
      .join("")}</div>`;
  }

  if (s.tipo === "blocos") {
    corpo = `<div class="blocos">${s.blocos
      .map((b) => `<div class="bloco"><h3>${esc(b.titulo)}</h3><p>${esc(b.texto)}</p></div>`)
      .join("")}</div>`;
  }

  if (s.tipo === "colunas") {
    corpo = `<div class="colunas">${s.colunas
      .map((c) => `<div class="coluna"><h3>${esc(c.titulo)}</h3><p>${esc(c.texto)}</p></div>`)
      .join("")}</div>`;
  }

  if (s.tipo === "relatorio") {
    corpo = `
      <p class="chamada">${esc(s.chamada)}</p>
      <p class="sub">${esc(s.texto)}</p>
      <div class="marcadores">${s.itens
        .map((i) => `<p class="marcador"><span class="ponto"></span>${esc(i)}</p>`)
        .join("")}</div>`;
  }

  const nota = s.nota ? `<p class="nota">${esc(s.nota)}</p>` : "";
  const topo =
    s.tipo === "fecho" ? "" : `<p class="etiqueta">${esc(etiqueta)}</p>`;

  return `  <section class="slide">
    ${topo}
    <div class="corpo">
      ${corpo}
      ${nota}
    </div>
    <div class="rodape"><span>Amadeus 30 anos</span><span class="risco"></span><span>Matrículas 2027</span></div>
  </section>`;
}

function montarDeck(deck) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>${esc(deck.titulo)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap">
<style>${CSS}</style>
</head>
<body>
${deck.slides.map((s) => montarSlide(s, deck.etiquetaPadrao)).join("\n")}
</body>
</html>`;
}

for (const deck of [GISLENE, ADRIANA]) {
  const arquivo = path.join(saida, deck.arquivo + ".html");
  fs.writeFileSync(arquivo, montarDeck(deck));
  console.log(deck.arquivo + ".html", deck.slides.length, "slides");
}
