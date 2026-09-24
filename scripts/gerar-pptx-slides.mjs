import fs from "node:fs";
import path from "node:path";
import PptxGenJS from "pptxgenjs";

/* Monta o .pptx a partir dos PNGs que já saem do gerador dos slides.
   Cada slide é a imagem inteira, sangrando de borda a borda, no mesmo
   200x200mm (7,874 polegadas) do PDF. */

const [, , pastaSlides, saida] = process.argv;
const LADO = 200 / 25.4; // 200mm em polegadas

const DECKS = [
  { prefixo: "gislene", arquivo: "Slides_Gislene_Infantil", titulo: "Gislene Sátiro - Educação Infantil" },
  { prefixo: "adriana", arquivo: "Slides_Adriana_Fundamental", titulo: "Adriana Alves - Fundamental 1 e 2" },
];

for (const deck of DECKS) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "QUADRADO", width: LADO, height: LADO });
  pptx.layout = "QUADRADO";
  pptx.title = deck.titulo;
  pptx.company = "Centro Educacional Amadeus";

  const imagens = fs
    .readdirSync(pastaSlides)
    .filter((f) => f.startsWith(deck.prefixo + "-") && f.endsWith(".png"))
    .sort((a, b) => Number(a.match(/-(\d+)\./)[1]) - Number(b.match(/-(\d+)\./)[1]));

  for (const img of imagens) {
    const slide = pptx.addSlide();
    slide.background = { color: "05060C" };
    slide.addImage({
      path: path.join(pastaSlides, img),
      x: 0,
      y: 0,
      w: LADO,
      h: LADO,
    });
  }

  const destino = path.join(saida, deck.arquivo + ".pptx");
  await pptx.writeFile({ fileName: destino });
  console.log(deck.arquivo + ".pptx", imagens.length, "slides", "(" + imagens.join(", ") + ")");
}
