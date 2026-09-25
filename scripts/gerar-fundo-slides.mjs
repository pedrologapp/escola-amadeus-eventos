import fs from "node:fs";
import path from "node:path";

/**
 * O fundo dos slides, limpo, sem nenhum texto.
 *
 * Serve para o PowerPoint: a pessoa aplica essa imagem como fundo do slide
 * e escreve por cima do jeito dela, mantendo a mesma cara das peças da
 * reunião.
 *
 * Sai em 1:1 (200x200mm), que é o formato da tela 2x2 do evento, e também
 * em 16:9, para o caso de a apresentação acontecer numa tela comum.
 *
 * Uso: node scripts/gerar-fundo-slides.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const raiz = path.join(import.meta.dirname, "..");

const GLOBO =
  "data:image/png;base64," +
  fs.readFileSync(path.join(raiz, "public/folder/marca-globo.png")).toString("base64");

/* As duas medidas. O quadrado é o do evento; o deitado é reserva. */
const FORMATOS = [
  { nome: "Fundo_Slides_Amadeus_1x1", largura: "200mm", altura: "200mm" },
  { nome: "Fundo_Slides_Amadeus_16x9", largura: "338.7mm", altura: "190.5mm" },
];

function montar({ largura, altura }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Fundo</title>
<style>
  @page{ size:${largura} ${altura}; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#05060C}
  .fundo{
    width:${largura};height:${altura};position:relative;overflow:hidden;
    background:
      radial-gradient(115% 70% at 50% 8%, #16224A 0%, #0A0D18 58%, #05060C 100%);
  }
  /* a marca ao fundo, no mesmo tom dos slides prontos */
  .agua{
    position:absolute;right:-8%;bottom:-14%;width:76%;
    opacity:.055;filter:grayscale(1) brightness(2.4);
  }
</style>
</head>
<body>
  <div class="fundo"><img class="agua" src="${GLOBO}" alt=""></div>
</body>
</html>`;
}

for (const formato of FORMATOS) {
  fs.writeFileSync(path.join(saida, formato.nome + ".html"), montar(formato));
  console.log(formato.nome + ".html", formato.largura, "x", formato.altura);
}
