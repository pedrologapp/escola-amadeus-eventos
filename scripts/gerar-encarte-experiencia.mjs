import fs from "node:fs";
import path from "node:path";

import {
  SEGMENTOS,
  PROGRAMAS,
  ESPORTES,
  ESPACOS,
} from "../lib/folder-config.ts";

/**
 * Encarte do convite da Experiência Amadeus. A4 retrato, uma página.
 *
 * O desenho segue a lógica da hero da Arena Arbória, com as duas trocas que
 * o Pedro pediu: fundo claro no lugar do escuro, e o azul do Amadeus no
 * lugar do turquesa. O que veio de lá não é a decoração, é a disciplina:
 *
 *   1. UMA cor de acento só. Na Arena é o turquesa; aqui é o azul #083078.
 *   2. Escala neutra com papel definido para cada tipo de texto.
 *   3. Tipografia do sistema, nome grande, tracking apertado.
 *
 * O título repete a forma do "ARENA ARBÓRIA": a primeira palavra menor em
 * cima e a segunda bem maior embaixo. A diferença de largura entre as duas
 * linhas é o que desenha o triângulo.
 *
 * A ordem da página foi definida pelo Pedro:
 *   nome · segmentos · fotos dos programas · espaços · convite · informações
 *
 * Uso: node scripts/gerar-encarte-experiencia.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const raiz = path.join(import.meta.dirname, "..");

function embutir(relativo, tipo = "png") {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:image/${tipo};base64,${dados}`;
}

const MARCA = embutir("public/folder/marca-30-anos.png");
const GLOBO = embutir("public/folder/marca-globo.png");

const EVENTO = { data: "10/10/2026", diaSemana: "sábado", hora: "14h" };

/* Nome curto de propósito: no quadro pequeno, nome comprido quebra em três
   linhas e some. O "foco" sobe a janela até a altura dos rostos, porque a
   foto é em pé e o quadro é deitado. */
function acharFoto(nome, lista) {
  const peca = lista.find((p) => p.nome === nome);
  if (!peca?.foto) throw new Error("sem foto: " + nome);
  return embutir(path.join("public", peca.foto.src), "webp");
}

const QUADROS = [
  { nome: "Projeto Arboria", foto: acharFoto("Projeto Arboria", PROGRAMAS), foco: "10%" },
  {
    nome: "Bilíngue",
    foto: acharFoto("Bilíngue - Evolutive English at School", PROGRAMAS),
    foco: "10%",
    perto: true,
  },
  { nome: "Socioemocional", foto: acharFoto("Educação Socioemocional", PROGRAMAS), foco: "6%" },
  { nome: "Robótica", foto: acharFoto("Sala Maker e Robótica", PROGRAMAS), foco: "14%" },
  { nome: "Ed. Financeira", foto: acharFoto("Educação Financeira", PROGRAMAS), foco: "30%" },
  { nome: "Esportes", foto: acharFoto("Ballet", ESPORTES), foco: "30%" },
];

const FONTE =
  '"SF Pro Display", "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

const CSS = `
  @page{ size:A4; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}

  :root{
    --bg:#FAF7F0;
    --ink:#0B1A3A;
    --prosa:#33405C;
    --ink2:#7C87A0;
    --mut:#9BA4B8;
    --acc:#083078;   /* o azul do Amadeus, a única cor de acento */
    --ouro:#FFB000;
  }

  body{font-family:${FONTE};-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    background:var(--bg);color:var(--ink);
    display:flex;flex-direction:column;align-items:center;
    padding:12mm 15mm 10mm;text-align:center;
  }
  .agua{
    position:absolute;left:50%;bottom:-96mm;width:270mm;
    transform:translateX(-50%);opacity:.055;z-index:0;
  }
  .folha > *:not(.agua){position:relative;z-index:1}

  .marca{width:25mm;height:auto}

  .rotulo{
    margin-top:7mm;font-size:8pt;font-weight:700;letter-spacing:.28em;
    text-transform:uppercase;color:var(--mut);
  }

  /* O triângulo: "Experiência" em cima, menor, e "AMADEUS" embaixo, bem
     maior. A diferença de largura entre as duas linhas é o desenho. */
  .nome{margin-top:3mm;line-height:.88;color:var(--acc)}
  .nome .um{display:block;font-size:23pt;font-weight:600;letter-spacing:.03em}
  .nome .dois{display:block;font-size:60pt;font-weight:800;letter-spacing:-.045em}

  .fio{width:16mm;height:1.1mm;background:var(--ouro);border-radius:1mm;margin-top:6mm}

  .segmentos{margin-top:6mm;display:flex;gap:2.5mm;justify-content:center;flex-wrap:wrap}
  .segmento{
    border:.35mm solid rgba(8,48,120,.28);border-radius:99mm;
    padding:2.2mm 6mm;font-size:10pt;font-weight:700;color:var(--acc);
  }

  .quadros{
    margin-top:6mm;width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;
  }
  .quadro{position:relative;height:41mm;border-radius:4mm;overflow:hidden;background:#0B1733}
  .quadro img{width:100%;height:100%;object-fit:cover;display:block}
  .quadro .veu{
    position:absolute;inset:0;
    background:linear-gradient(180deg,
      rgba(7,11,24,.04) 0%, rgba(7,11,24,.34) 42%,
      rgba(7,11,24,.8) 72%, rgba(7,11,24,.95) 100%);
  }
  .quadro .nome-q{
    position:absolute;left:4mm;right:4mm;bottom:3.5mm;
    font-size:9.6pt;font-weight:700;line-height:1.1;color:#FFFFFF;
    text-shadow:0 .3mm 1mm rgba(0,0,0,.5);
  }

  .espacos{margin-top:7mm;max-width:168mm}
  .espacos .titulo{
    font-size:8pt;font-weight:700;letter-spacing:.24em;
    text-transform:uppercase;color:var(--mut);
  }
  .espacos .lista{
    margin-top:2.5mm;font-size:10.5pt;font-weight:600;line-height:1.6;color:var(--prosa);
  }

  .convite{
    margin-top:auto;width:100%;border-radius:6mm;
    background:var(--acc);color:#FFFFFF;padding:8mm 8mm 7mm;
  }
  .convite .chamada{font-size:16pt;font-weight:700;letter-spacing:-.015em;line-height:1.3}
  .convite .chamada b{color:var(--ouro);font-weight:800}
  .convite .quando{margin-top:6mm;display:flex;align-items:stretch;justify-content:center}
  .convite .bloco{padding:0 9mm}
  .convite .bloco + .bloco{border-left:.4mm solid rgba(255,255,255,.28)}
  .convite .valor{display:block;font-size:23pt;font-weight:800;letter-spacing:-.03em;line-height:1}
  .convite .rot{
    display:block;margin-top:2mm;font-size:8pt;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:rgba(255,255,255,.66);
  }

  .rodape{
    margin-top:6mm;width:100%;display:flex;align-items:flex-end;
    justify-content:space-between;gap:6mm;text-align:left;
  }
  .rodape .escola{font-size:10pt;font-weight:700;color:var(--ink);line-height:1.5}
  .rodape .escola span{display:block;font-size:8.8pt;font-weight:500;color:var(--ink2)}
  .rodape .zap{text-align:right;font-size:10.5pt;font-weight:700;color:var(--ink);line-height:1.5}
  .rodape .zap span{
    display:block;font-size:8pt;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;color:var(--mut);
  }
`;

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const quadro = (q) => `
        <div class="quadro">
          <img src="${q.foto}" alt="${esc(q.nome)}" style="object-position:50% ${q.foco}${
            q.perto ? ";transform:scale(1.35);transform-origin:62% 26%" : ""
          }">
          <span class="veu"></span>
          <span class="nome-q">${esc(q.nome)}</span>
        </div>`;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Experiência Amadeus - 10 de outubro</title>
<style>${CSS}</style>
</head>
<body>

  <section class="folha">
    <img class="agua" src="${GLOBO}" alt="">

    <img class="marca" src="${MARCA}" alt="Centro Educacional Amadeus - 30 anos">

    <p class="rotulo">Você e sua família são nossos convidados</p>
    <h1 class="nome"><span class="um">Experiência</span><span class="dois">AMADEUS</span></h1>
    <span class="fio"></span>

    <div class="segmentos">
      ${SEGMENTOS.map((s) => `<span class="segmento">${esc(s.nome)}</span>`).join("")}
    </div>

    <div class="quadros">
      ${QUADROS.map(quadro).join("")}
    </div>

    <div class="espacos">
      <p class="titulo">Nossos espaços</p>
      <p class="lista">${ESPACOS.map((e) => esc(e.nome)).join(" &middot; ")}</p>
    </div>

    <div class="convite">
      <p class="chamada">
        Venha viver um dia dentro da nossa escola,<br>
        <b>junto com seu filho ou sua filha.</b>
      </p>
      <div class="quando">
        <span class="bloco">
          <span class="valor">${EVENTO.data}</span>
          <span class="rot">${EVENTO.diaSemana}</span>
        </span>
        <span class="bloco">
          <span class="valor">${EVENTO.hora}</span>
          <span class="rot">na escola</span>
        </span>
      </div>
    </div>

    <div class="rodape">
      <span class="escola">
        Centro Educacional Amadeus
        <span>São Gonçalo do Amarante, RN</span>
      </span>
      <span class="zap">
        <span>Fale com a secretaria</span>
        (84) 9 8145-0229
      </span>
    </div>
  </section>

</body>
</html>`;

fs.writeFileSync(path.join(saida, "Encarte_Experiencia_Amadeus.html"), html);
console.log("Encarte_Experiencia_Amadeus.html montado");
