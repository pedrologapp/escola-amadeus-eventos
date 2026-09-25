import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/**
 * Exporta cada slide como PNG.
 *
 * Por que um arquivo por slide, e não um print só da página inteira:
 * o Chrome tem limite de 16384px por lado na superfície do screenshot. Seis
 * slides de 200mm em 4x dão 18144px de altura, e tudo que passa do limite
 * volta como fundo chapado. Foi assim que os últimos slides saíram pretos.
 *
 * Uso: node scripts/exportar-slides-png.mjs <pasta-dos-html> <pasta-de-saida> <temp>
 */

const [, , pastaHtml, saida, temp] = process.argv;

const CHROME =
  process.env.CHROME ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const ESCALA = 4; // 200mm em 4x = 3024px de lado
const LADO_CSS = 756; // 200mm a 96dpi

const DECKS = {
  Slides_Graca_Abertura: "graca",
  Slides_Gislene_Infantil: "gislene",
  Slides_Adriana_Fundamental: "adriana",
};

fs.mkdirSync(temp, { recursive: true });

for (const [arquivo, nome] of Object.entries(DECKS)) {
  const html = fs.readFileSync(path.join(pastaHtml, arquivo + ".html"), "utf8");

  const cabeca = html.slice(0, html.indexOf("<body>") + "<body>".length);
  const miolo = html.slice(
    html.indexOf("<body>") + "<body>".length,
    html.indexOf("</body>"),
  );

  // cada <section class="slide"> vira um arquivo
  const partes = miolo
    .split('<section class="slide">')
    .slice(1)
    .map((p) => '<section class="slide">' + p.slice(0, p.lastIndexOf("</section>") + "</section>".length));

  partes.forEach((parte, i) => {
    const avulso = path.join(temp, `${nome}-${i}.html`);
    fs.writeFileSync(avulso, `${cabeca}\n${parte}\n</body></html>`);

    execFileSync(CHROME, [
      "--headless",
      "--disable-gpu",
      "--hide-scrollbars",
      `--force-device-scale-factor=${ESCALA}`,
      `--window-size=${LADO_CSS},${LADO_CSS}`,
      `--screenshot=${path.join(saida, `${nome}-${i}.png`)}`,
      "file:///" + avulso.replace(/\\/g, "/"),
    ]);
  });

  console.log(nome, partes.length, "slides exportados");
}
