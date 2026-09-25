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
 * A marca é a opção A: bloco azul no topo, "Experiência" em creme e
 * "AMADEUS" em dourado. O dourado da marca só funciona aí: sobre o creme
 * ele dá 1,71:1 de contraste e some; sobre o azul dá 6,73:1.
 *
 * TRÊS CORREÇÕES FUNCIONAIS, além do desenho:
 *
 *   1. ENDEREÇO. O convite existe para atrair quem ainda não conhece a
 *      escola, e essa família não sabe onde ela fica. Entra o endereço
 *      completo, com QR que abre o mapa.
 *   2. O QUE FAZER DEPOIS DE LER. Antes a peça terminava num telefone em
 *      cinza claro no rodapé. Agora tem QR do WhatsApp com mensagem pronta,
 *      que é o que transforma interesse em confirmação, e dá para medir.
 *   3. CONTRASTE DOS TEXTOS PEQUENOS. O cinza-azulado #9BA4B8 dava 2,34:1
 *      sobre o creme, abaixo do mínimo de 4,5:1, logo nos textos em caixa
 *      alta espaçada, que já são os mais difíceis. Virou #5A6478, 5,56:1.
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
const QR_ZAP = embutir("public/materiais/qr-experiencia-whatsapp.png");
const QR_MAPA = embutir("public/materiais/qr-experiencia-mapa.png");

const EVENTO = { data: "10/10/2026", diaSemana: "sábado", hora: "14h" };
const ENDERECO = {
  rua: "Av. Benedito Santana, 09",
  bairro: "Amarante, São Gonçalo do Amarante · RN",
  cep: "CEP 59296-515",
};

function acharFoto(nome, lista) {
  const peca = lista.find((p) => p.nome === nome);
  if (!peca?.foto) throw new Error("sem foto: " + nome);
  return embutir(path.join("public", peca.foto.src), "webp");
}

/* Nome curto de propósito: no quadro pequeno, nome comprido quebra em três
   linhas e some. O "foco" sobe a janela até a altura dos rostos, porque a
   foto é em pé e o quadro é deitado. */
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
    --mut:#5A6478;  /* 5,56:1 sobre o creme. O #9BA4B8 anterior dava 2,34:1 */
    --acc:#083078;
  }

  body{font-family:${FONTE};-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    background:var(--bg);color:var(--ink);
    display:flex;flex-direction:column;align-items:center;
    padding:11mm 14mm 9mm;text-align:center;
  }
  .agua{
    position:absolute;left:50%;bottom:-96mm;width:270mm;
    transform:translateX(-50%);opacity:.05;z-index:0;
  }
  .folha > *:not(.agua){position:relative;z-index:1}

  /* ------------------------------------------------------------- a marca
     A palavra de cima é dimensionada para começar um pouco antes do M do
     AMADEUS: é essa diferença de largura que desenha a pirâmide.
     O azul e o dourado são degradê, não chapado, pra cor não ficar lisa. */
  .marca-evento{
    width:100%;border-radius:7mm;padding:9mm 8mm 10mm;
    background:linear-gradient(145deg, #0C3F94 0%, #083078 46%, #051C4E 100%);
  }
  .nome{line-height:.84;text-align:center}
  .nome .um{
    display:block;font-size:43.5pt;font-weight:600;letter-spacing:-.012em;
    color:#EEF1F8;
  }
  .nome .dois{
    display:block;font-size:60pt;font-weight:800;letter-spacing:-.045em;
    background:linear-gradient(160deg, #FFD978 0%, #FFB000 42%, #F08A00 100%);
    -webkit-background-clip:text;background-clip:text;color:transparent;
  }

  /* ---------------------------------------------------------- o convite */
  .chamada{
    margin-top:8mm;max-width:158mm;
    font-size:15pt;font-weight:700;line-height:1.3;letter-spacing:-.015em;color:var(--ink);
  }
  .chamada b{color:var(--acc);font-weight:800}

  .quando{margin-top:6mm;display:flex;align-items:stretch;justify-content:center}
  .quando .bloco-h{padding:0 9mm}
  .quando .bloco-h + .bloco-h{border-left:.4mm solid rgba(11,26,58,.18)}
  .quando .valor{
    display:block;font-size:23pt;font-weight:800;letter-spacing:-.03em;
    line-height:1;color:var(--acc);
  }
  .quando .rot{
    display:block;margin-top:2mm;font-size:8pt;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:var(--mut);
  }

  /* --------------------------------------------------------- o conteúdo */
  .segmentos{margin-top:7mm;display:flex;gap:2.5mm;justify-content:center;flex-wrap:wrap}
  .segmento{
    border:.35mm solid rgba(8,48,120,.3);border-radius:99mm;
    padding:2mm 5.5mm;font-size:9.6pt;font-weight:700;color:var(--acc);
  }

  .quadros{
    margin-top:6mm;width:100%;display:grid;grid-template-columns:repeat(3,1fr);gap:3mm;
  }
  .quadro{position:relative;height:45mm;border-radius:4mm;overflow:hidden;background:#0B1733}
  .quadro img{width:100%;height:100%;object-fit:cover;display:block}
  .quadro .veu{
    position:absolute;inset:0;
    background:linear-gradient(180deg,
      rgba(7,11,24,.04) 0%, rgba(7,11,24,.34) 42%,
      rgba(7,11,24,.8) 72%, rgba(7,11,24,.95) 100%);
  }
  .quadro .nome-q{
    position:absolute;left:4mm;right:4mm;bottom:4mm;
    font-size:10pt;font-weight:700;line-height:1.1;color:#FFFFFF;
    text-shadow:0 .3mm 1mm rgba(0,0,0,.5);
  }

  .espacos{margin-top:6mm;max-width:168mm}
  .espacos .titulo{
    font-size:8pt;font-weight:700;letter-spacing:.24em;
    text-transform:uppercase;color:var(--mut);
  }
  .espacos .lista{
    margin-top:2.5mm;font-size:10pt;font-weight:600;line-height:1.55;color:var(--prosa);
  }

  /* ------------------------------------------------- onde é e o que fazer
     Os dois QR ficam lado a lado, cada um com o seu rótulo: um resolve
     "onde fica" e o outro resolve "como eu confirmo". */
  .acao{
    margin-top:auto;width:100%;display:flex;align-items:center;gap:7mm;
    border-top:.4mm solid rgba(11,26,58,.16);padding-top:7mm;text-align:left;
  }
  .endereco{flex:1}
  .endereco .titulo{
    font-size:8pt;font-weight:700;letter-spacing:.24em;
    text-transform:uppercase;color:var(--mut);
  }
  .endereco .escola{
    margin-top:2.5mm;font-size:12pt;font-weight:800;color:var(--ink);line-height:1.3;
  }
  .endereco .linha{margin-top:1.5mm;font-size:10.5pt;font-weight:600;color:var(--prosa);line-height:1.45}
  .endereco .cep{margin-top:1mm;font-size:9.6pt;font-weight:500;color:var(--mut)}

  .codigos{display:flex;gap:6mm}
  .codigo{width:26mm;text-align:center}
  .codigo img{width:26mm;height:26mm;display:block}
  .codigo span{
    display:block;margin-top:2mm;font-size:7.4pt;font-weight:700;
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

    <div class="marca-evento">
      <h1 class="nome"><span class="um">Experiência</span><span class="dois">AMADEUS</span></h1>
    </div>

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

    <div class="acao">
      <div class="endereco">
        <p class="titulo">Onde é</p>
        <p class="escola">Centro Educacional Amadeus</p>
        <p class="linha">${esc(ENDERECO.rua)}<br>${esc(ENDERECO.bairro)}</p>
        <p class="cep">${esc(ENDERECO.cep)} &middot; (84) 9 8145-0229</p>
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
