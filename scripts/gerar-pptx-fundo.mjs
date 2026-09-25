import path from "node:path";
import PptxGenJS from "pptxgenjs";

/**
 * Um .pptx em branco já com o fundo do Amadeus aplicado.
 *
 * O fundo entra como SLIDE MASTER, e não como imagem colada em cada slide.
 * A diferença importa: com master, todo slide novo que a pessoa criar no
 * PowerPoint já nasce com o fundo certo, e ninguém arrasta a imagem sem
 * querer no meio da edição.
 *
 * Vai com quatro slides prontos, todos vazios, só para não abrir num
 * arquivo sem nada.
 *
 * O pptxgenjs NÃO está nas dependências do site. Antes de rodar:
 *
 *     mkdir ferramenta && cd ferramenta && npm init -y && npm i pptxgenjs
 *     node <caminho>/scripts/gerar-pptx-fundo.mjs <pasta-dos-fundos> <saida>
 */

const [, , pastaFundos, saida] = process.argv;

const FORMATOS = [
  {
    arquivo: "Fundo_Slides_Amadeus_1x1.pptx",
    imagem: "Fundo_Slides_Amadeus_1x1.png",
    largura: 200 / 25.4, // o quadrado da tela 2x2 do evento
    altura: 200 / 25.4,
    titulo: "Amadeus - fundo quadrado",
  },
  {
    arquivo: "Fundo_Slides_Amadeus_16x9.pptx",
    imagem: "Fundo_Slides_Amadeus_16x9.png",
    largura: 13.333, // 16:9 padrão, para tela comum
    altura: 7.5,
    titulo: "Amadeus - fundo 16:9",
  },
];

for (const f of FORMATOS) {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "AMADEUS", width: f.largura, height: f.altura });
  pptx.layout = "AMADEUS";
  pptx.title = f.titulo;
  pptx.company = "Centro Educacional Amadeus";

  pptx.defineSlideMaster({
    title: "FUNDO_AMADEUS",
    background: { path: path.join(pastaFundos, f.imagem) },
  });

  for (let i = 0; i < 4; i++) pptx.addSlide({ masterName: "FUNDO_AMADEUS" });

  await pptx.writeFile({ fileName: path.join(saida, f.arquivo) });
  console.log(f.arquivo, "- 4 slides vazios, fundo no master");
}
