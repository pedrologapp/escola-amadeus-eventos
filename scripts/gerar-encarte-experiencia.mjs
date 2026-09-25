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
 * Agora é a Arena Arbória de verdade: fundo escuro #08080C, a escala neutra
 * dela e uma cor de acento só. Onde a Arena usa o turquesa para "ARBÓRIA",
 * aqui entra o dourado do Amadeus para "AMADEUS".
 *
 * A marca ocupa o topo inteiro, sem caixa em volta, como na Arena: o efeito
 * vem do tamanho e do aperto entre as letras, não de moldura. "Experiência"
 * é dimensionado para começar um pouco antes do M do AMADEUS, e é essa
 * diferença de largura que desenha a pirâmide.
 *
 * Contraste sobre o #08080C, conferido: dourado 10,91:1, branco 17,96:1,
 * e a escala de cinzas da Arena vai de 12,11:1 a 5,77:1. Todos passam.
 * O azul da marca dá 1,62:1 e por isso NÃO pode aparecer aqui: é o motivo
 * de o logo ser a versão 3D, que tem contorno claro em volta das letras.
 *
 * Uso: node scripts/gerar-encarte-experiencia.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const raiz = path.join(import.meta.dirname, "..");

function embutir(relativo, tipo = "png") {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:image/${tipo};base64,${dados}`;
}

const GLOBO = embutir("public/folder/marca-globo.png");
const LOGO = embutir("docs/EventoRematricula/3D LOGO AMADEUS 30 ANOS.png");
const QR_ZAP = embutir("public/materiais/qr-experiencia-whatsapp.png");
const QR_MAPA = embutir("public/materiais/qr-experiencia-mapa.png");

const EVENTO = { data: "10/10/2026", diaSemana: "sábado", hora: "14h" };
const ENDERECO = {
  rua: "Av. Benedito Santana, 09",
  bairro: "Amarante, São Gonçalo do Amarante · RN",
  cep: "CEP 59296-515 · (84) 9 8145-0229",
};

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

  /* a escala da Arena, com o dourado no lugar do turquesa */
  :root{
    --bg:#08080C;
    --ink:#F3F2F8;
    --prosa:#E6E5EE;
    --gancho:#C9C8D6;
    --ink2:#A6A5B8;
    --mut:#8A8899;
    --acc:#FFB000;
  }

  body{font-family:${FONTE};-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    background:var(--bg);color:var(--ink);
    display:flex;flex-direction:column;align-items:center;
    padding:14mm 14mm 10mm;text-align:center;
  }
  .agua{
    position:absolute;left:50%;bottom:-96mm;width:270mm;
    transform:translateX(-50%);opacity:.07;z-index:0;
  }
  .folha > *:not(.agua){position:relative;z-index:1}

  /* ------------------------------------------------------------- a marca
     Sem caixa: o peso vem do corpo e do aperto, como na Arena. */
  .nome{line-height:.82;width:100%}
  .nome .um{
    display:block;font-size:60pt;font-weight:600;letter-spacing:-.016em;color:var(--ink);
  }
  .nome .dois{
    display:block;font-size:100pt;font-weight:800;letter-spacing:-.052em;
    background:linear-gradient(160deg, #FFE08C 0%, #FFB000 46%, #ED8A00 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }

  /* ---------------------------------------------------------- o convite */
  .chamada{
    margin-top:9mm;max-width:160mm;
    font-size:14.5pt;font-weight:600;line-height:1.35;color:var(--gancho);
  }
  .chamada b{color:var(--acc);font-weight:800}

  .quando{margin-top:7mm;display:flex;align-items:stretch;justify-content:center}
  .quando .bloco-h{padding:0 9mm}
  .quando .bloco-h + .bloco-h{border-left:.4mm solid rgba(243,242,248,.2)}
  .quando .valor{
    display:block;font-size:24pt;font-weight:800;letter-spacing:-.03em;
    line-height:1;color:var(--ink);
  }
  .quando .rot{
    display:block;margin-top:2mm;font-size:8pt;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:var(--mut);
  }

  /* segmentos: só os nomes, sem cápsula em volta */
  .segmentos{
    margin-top:7mm;font-size:10.5pt;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;color:var(--ink2);
  }
  .segmentos i{font-style:normal;color:var(--acc);margin:0 3mm}

  .quadros{
    margin-top:6mm;width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;
  }
  .quadro{position:relative;height:45mm;border-radius:4mm;overflow:hidden;background:#111119}
  .quadro img{width:100%;height:100%;object-fit:cover;display:block}
  .quadro .veu{
    position:absolute;inset:0;
    background:linear-gradient(180deg,
      rgba(8,8,12,.06) 0%, rgba(8,8,12,.34) 42%,
      rgba(8,8,12,.8) 72%, rgba(8,8,12,.96) 100%);
  }
  .quadro .nome-q{
    position:absolute;left:4mm;right:4mm;bottom:4mm;
    font-size:10pt;font-weight:700;line-height:1.1;color:#FFFFFF;
    text-shadow:0 .3mm 1mm rgba(0,0,0,.6);
  }

  .espacos{margin-top:6mm;max-width:168mm}
  .espacos .titulo{
    font-size:8pt;font-weight:700;letter-spacing:.24em;
    text-transform:uppercase;color:var(--mut);
  }
  .espacos .lista{
    margin-top:2.5mm;font-size:10pt;font-weight:600;line-height:1.55;color:var(--prosa);
  }

  /* --------------------------------------------- a marca, onde é, e o QR */
  .acao{
    margin-top:auto;width:100%;display:flex;align-items:center;gap:6mm;
    border-top:.4mm solid rgba(243,242,248,.16);padding-top:7mm;text-align:left;
  }
  /* o selo acompanha a altura do bloco ao lado, do "onde é" até o cep */
  .acao .selo{height:26mm;width:auto;flex:0 0 auto}
  .endereco{flex:1}
  .endereco .titulo{
    font-size:8pt;font-weight:700;letter-spacing:.24em;
    text-transform:uppercase;color:var(--mut);
  }
  .endereco .escola{
    margin-top:2.5mm;font-size:11.5pt;font-weight:800;color:var(--ink);line-height:1.3;
  }
  .endereco .linha{margin-top:1.5mm;font-size:10pt;font-weight:600;color:var(--prosa);line-height:1.45}
  .endereco .cep{margin-top:1mm;font-size:9.2pt;font-weight:500;color:var(--ink2)}

  .codigos{display:flex;gap:5mm;flex:0 0 auto}
  .codigo{width:25mm;text-align:center}
  /* O QR guarda o próprio fundo claro, e não leva arredondamento: cantos
     redondos comem a zona de silêncio, que é o que o leitor usa para achar
     os três quadrados de canto. */
  .codigo img{width:26mm;height:26mm;display:block}
  .codigo span{
    display:block;margin-top:2mm;font-size:7.2pt;font-weight:700;
    letter-spacing:.1em;text-transform:uppercase;color:var(--mut);line-height:1.3;
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

    <h1 class="nome"><span class="um">EXPERIÊNCIA</span><span class="dois">AMADEUS</span></h1>

    <p class="chamada">
      Venha viver um dia dentro da nossa escola,<br>
      <b>junto com seu filho ou sua filha.</b>
    </p>

    <div class="quando">
      <span class="bloco-h">
        <span class="valor">${EVENTO.data}</span>
        <span class="rot">${EVENTO.diaSemana}</span>
      </span>
      <span class="bloco-h">
        <span class="valor">${EVENTO.hora}</span>
        <span class="rot">na escola</span>
      </span>
    </div>

    <p class="segmentos">${SEGMENTOS.map((s) => esc(s.nome)).join("<i>·</i>")}</p>

    <div class="quadros">
      ${QUADROS.map(quadro).join("")}
    </div>

    <div class="espacos">
      <p class="titulo">Nossos espaços</p>
      <p class="lista">${ESPACOS.map((e) => esc(e.nome)).join(" &middot; ")}</p>
    </div>

    <div class="acao">
      <img class="selo" src="${LOGO}" alt="Centro Educacional Amadeus - 30 anos">
      <div class="endereco">
        <p class="titulo">Onde é</p>
        <p class="escola">Centro Educacional Amadeus</p>
        <p class="linha">${esc(ENDERECO.rua)}<br>${esc(ENDERECO.bairro)}</p>
        <p class="cep">${esc(ENDERECO.cep)}</p>
      </div>
      <div class="codigos">
        <span class="codigo">
          <img src="${QR_ZAP}" alt="QR para confirmar presença no WhatsApp">
          <span>Confirmar<br>presença</span>
        </span>
        <span class="codigo">
          <img src="${QR_MAPA}" alt="QR para abrir o mapa">
          <span>Como<br>chegar</span>
        </span>
      </div>
    </div>
  </section>

</body>
</html>`;

fs.writeFileSync(path.join(saida, "Encarte_Experiencia_Amadeus.html"), html);
console.log("Encarte_Experiencia_Amadeus.html montado");
