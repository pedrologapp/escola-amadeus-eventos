import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";

/**
 * Monta os .pptx a partir dos PNGs que saem do gerador dos slides.
 *
 * Sai um arquivo ÚNICO com as três falas na ordem da reunião, que é o que
 * vai ser projetado no dia, e também um arquivo por pessoa, para quem
 * quiser ensaiar só a sua parte.
 *
 * Cada slide é a imagem inteira, sangrando de borda a borda, no mesmo
 * 200x200mm do PDF. Imagem e não caixa de texto: assim a fonte não troca
 * nem nada se desloca na máquina do dia, que é o risco real de levar
 * PowerPoint para um evento.
 *
 * O pptxgenjs NÃO está nas dependências do site, porque ele só serve para
 * gerar material e não tem nada a ver com a aplicação. Antes de rodar:
 *
 *     mkdir ferramenta && cd ferramenta && npm init -y && npm i pptxgenjs
 *     node <caminho>/scripts/gerar-pptx-slides.mjs <pasta-dos-png> <saida>
 *
 * Uso: node scripts/gerar-pptx-slides.mjs <pasta-dos-png> <pasta-de-saida>
 */

const [, , pastaSlides, saida] = process.argv;
const LADO = 200 / 25.4; // 200mm em polegadas

/* A ordem aqui é a ordem da projeção no dia. */
const FALAS = [
  { prefixo: "graca", titulo: "Maria das Graças - Abertura" },
  { prefixo: "gislene", titulo: "Gislene Sátiro - Educação Infantil" },
  { prefixo: "adriana", titulo: "Adriana Alves - Fundamental 1 e 2" },
];

const AVULSOS = {
  graca: "Slides_Graca_Abertura",
  gislene: "Slides_Gislene_Infantil",
  adriana: "Slides_Adriana_Fundamental",
};

function imagensDe(prefixo) {
  return fs
    .readdirSync(pastaSlides)
    .filter((f) => f.startsWith(prefixo + "-") && f.endsWith(".png"))
    .sort((a, b) => Number(a.match(/-(\d+)\./)[1]) - Number(b.match(/-(\d+)\./)[1]));
}

function novaApresentacao(titulo) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "QUADRADO", width: LADO, height: LADO });
  pptx.layout = "QUADRADO";
  pptx.title = titulo;
  pptx.company = "Centro Educacional Amadeus";
  return pptx;
}

function acrescentar(pptx, imagens) {
  for (const img of imagens) {
    const slide = pptx.addSlide();
    slide.background = { color: "05060C" };
    slide.addImage({ path: path.join(pastaSlides, img), x: 0, y: 0, w: LADO, h: LADO });
  }
}

/* ---------------------------------------------------- o arquivo único */

const completo = novaApresentacao("Reunião de Matrículas 2027 - falas da escola");
let total = 0;
for (const fala of FALAS) {
  const imagens = imagensDe(fala.prefixo);
  acrescentar(completo, imagens);
  total += imagens.length;
  console.log("  " + fala.prefixo.padEnd(9), imagens.length, "slides");
}
await completo.writeFile({
  fileName: path.join(saida, "Slides_Reuniao_Completo.pptx"),
});
console.log("Slides_Reuniao_Completo.pptx", total, "slides, na ordem da reunião");

/* ------------------------------------------------- um por pessoa também */

for (const fala of FALAS) {
  const pptx = novaApresentacao(fala.titulo);
  acrescentar(pptx, imagensDe(fala.prefixo));
  await pptx.writeFile({ fileName: path.join(saida, AVULSOS[fala.prefixo] + ".pptx") });
  console.log(AVULSOS[fala.prefixo] + ".pptx");
}
