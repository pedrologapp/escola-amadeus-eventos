import fs from "node:fs";
import path from "node:path";

import { SEGMENTOS } from "../lib/folder-config.ts";

/**
 * Cartaz da Experiência Amadeus: "o convite da criança". A4 retrato, uma página.
 *
 * O cartaz é uma cartinha da criança para a mãe e o pai, pedindo para conhecer
 * a "minha futura escola": a Experiência é para famílias novatas, então a
 * criança ainda não estuda aqui. Letra de criança, desenhos em traço e a data
 * circulada no calendário. Sem os programas: só o convite, a data e os dois QR.
 *
 * Os outros convites (escuro, caderno, ingresso) continuam nos seus geradores.
 *
 * Uso: node scripts/gerar-experiencia-convite.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const raiz = path.join(import.meta.dirname, "..");

function embutir(relativo, tipo) {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:${tipo};base64,${dados}`;
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const LOGO = embutir("public/folder/marca-30-anos.png", "image/png");
const QR_ZAP = embutir("public/materiais/qr-experiencia-whatsapp.png", "image/png");
const QR_MAPA = embutir("public/materiais/qr-experiencia-mapa.png", "image/png");
const FRAUNCES = embutir("docs/EventoRematricula/deck/fonts/fraunces.woff2", "font/woff2");
const FRAUNCES_IT = embutir("docs/EventoRematricula/deck/fonts/fraunces-italic.woff2", "font/woff2");
const CAVEAT = embutir("docs/EventoRematricula/deck/fonts/caveat.woff2", "font/woff2");

const EVENTO = { dia: "17", mes: "Outubro", ano: "2026", diaSemana: "sábado", hora: "14h" };
const ENDERECO = {
  rua: "Av. Benedito Santana, 09 · Amarante",
  bairro: "São Gonçalo do Amarante · RN",
  cep: "CEP 59296-515 · (84) 9 8145-0229",
};

/* Desenhos de criança, em traço: sol, a família de mãos dadas e a escola. */
const DESENHO = `
  <svg class="desenho" viewBox="0 0 200 92" aria-hidden="true">
    <g class="sol">
      <circle cx="176" cy="18" r="9"/>
      <path d="M176 3v-3M176 36v-3M161 18h-3M194 18h-3M165 7l-2-2M187 29l2 2M187 7l2-2M165 29l-2 2"/>
    </g>
    <g class="chao"><path d="M4 86c30-3 60 2 96-1s70 2 96-1"/></g>
    <g class="escola">
      <path d="M126 86V52h52v34M122 54l30-22 30 22"/>
      <path d="M146 86V70h12v16M132 60h8v7h-8zM164 60h8v7h-8z"/>
      <path d="M152 32V16l12 4-12 4"/>
    </g>
    <g class="familia">
      <circle cx="30" cy="36" r="6"/><path d="M30 42v22M30 64l-6 20M30 64l6 20M30 48l-10 10M30 48l12 8"/>
      <path d="M24 34c2-6 10-7 13-1"/>
      <circle cx="62" cy="38" r="6"/><path d="M62 44v20M62 64l-6 20M62 64l6 20M62 50l-8 6M62 50l12 8"/>
      <path d="M55 60h14l-3-12h-8z"/>
      <circle cx="90" cy="52" r="5"/><path d="M90 57v14M90 71l-5 13M90 71l5 13M90 61l-9-4M90 61l8 5"/>
      <path d="M86 49c2-3 7-3 9 0"/>
    </g>
    <g class="coracao"><path d="M104 34c-3-5-11-3-10 3 1 5 10 10 10 10s9-5 10-10c1-6-7-8-10-3z"/></g>
  </svg>`;

const CSS = `
  @font-face{font-family:Fraunces;src:url(${FRAUNCES}) format("woff2");font-weight:100 900;font-style:normal}
  @font-face{font-family:Fraunces;src:url(${FRAUNCES_IT}) format("woff2");font-weight:100 900;font-style:italic}
  @font-face{font-family:Caveat;src:url(${CAVEAT}) format("woff2");font-weight:400 700}
  @page{size:A4;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:"DM Sans","Segoe UI",Arial,sans-serif;color:#1A2240;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .folha{width:210mm;height:297mm;position:relative;overflow:hidden;padding:12mm 14mm 11mm;display:flex;flex-direction:column;
    background:radial-gradient(120% 70% at 50% 30%,#FFFDF7 0%,#FAF4E6 100%)}

  .topo{display:flex;align-items:center;justify-content:space-between}
  .topo img{width:24mm}
  .selo{transform:rotate(4deg);background:#FFB000;color:#083078;font-weight:800;font-size:11pt;letter-spacing:.18em;
    text-transform:uppercase;padding:2.6mm 6mm;border-radius:1.5mm;box-shadow:0 1mm 2.5mm rgba(8,48,120,.18)}

  /* o bilhete: folha de caderno arrancada, escrita à caneta azul */
  .bilhete{position:relative;margin:5mm 3mm 0;padding:12mm 12mm 6mm 22mm;transform:rotate(-1.6deg);
    background:
      linear-gradient(90deg,transparent 15mm,rgba(226,110,110,.6) 15mm 15.4mm,transparent 15.4mm),
      repeating-linear-gradient(180deg,#FFFFFF 0 9.4mm,#CFDCEE 9.4mm 9.7mm);
    background-position:0 3.2mm;background-color:#fff;
    box-shadow:0 2mm 5mm rgba(26,34,64,.16);
    -webkit-mask:radial-gradient(circle at 50% 0,transparent 1.3mm,#000 1.4mm) 0 0/5mm 100% repeat-x;
            mask:radial-gradient(circle at 50% 0,transparent 1.3mm,#000 1.4mm) 0 0/5mm 100% repeat-x}
  .bilhete .fita{position:absolute;top:-2mm;right:18mm;width:26mm;height:8mm;transform:rotate(6deg);background:rgba(127,178,230,.8);
    background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.3) 0 1.2mm,transparent 1.2mm 2.4mm)}
  .mao{font-family:Caveat,cursive;color:#1D4FA0;line-height:9.7mm}
  .mao.a{font-size:30pt;font-weight:700}
  .mao.b{font-size:34pt;font-weight:600}
  .mao.b u{text-decoration:none;background:linear-gradient(transparent 62%,rgba(255,192,64,.75) 62% 88%,transparent 88%);padding:0 1mm}
  .desenho{display:block;width:100%;height:auto;margin-top:3mm;overflow:visible}
  .desenho g{fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.5}
  .desenho .sol{stroke:#FFB000;stroke-width:1.8}
  .desenho .chao{stroke:#5F9683}
  .desenho .escola{stroke:#083078}
  .desenho .familia{stroke:#1D4FA0}
  .desenho .coracao{stroke:#E0524C;fill:rgba(224,82,76,.18)}
  .assina{margin-top:2mm;font-family:Caveat,cursive;font-size:18pt;color:#1D4FA0;display:flex;align-items:baseline;gap:3mm}
  .assina i{flex:0 0 60mm;border-bottom:.4mm dashed #9DB2D3;height:6mm}

  /* o calendário e o convite */
  .quando{margin-top:8mm;display:grid;grid-template-columns:48mm 1fr;gap:9mm;align-items:center}
  .cal{background:#fff;border-radius:3mm;overflow:hidden;box-shadow:0 1.6mm 4mm rgba(26,34,64,.18);text-align:center;transform:rotate(2deg)}
  .cal .m{background:#083078;color:#FAF7F0;font-size:10.5pt;font-weight:800;letter-spacing:.24em;text-transform:uppercase;padding:3mm 0 2.6mm;position:relative}
  .cal .m::before,.cal .m::after{content:"";position:absolute;top:-1.4mm;width:3mm;height:5mm;border-radius:1.5mm;background:#C9D3E3}
  .cal .m::before{left:12mm} .cal .m::after{right:12mm}
  .cal .d{position:relative;font:700 44pt/1 Fraunces,serif;color:#083078;padding:4mm 0 0}
  .cal .d svg{position:absolute;left:50%;top:50%;width:34mm;height:21mm;transform:translate(-50%,-42%);overflow:visible}
  .cal .d svg path{fill:none;stroke:#FFB000;stroke-width:2;stroke-linecap:round}
  .cal .s{font-size:10pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#3B4A6B;padding:4mm 0 4mm}
  .convite .k{font-size:9pt;font-weight:800;letter-spacing:.3em;text-transform:uppercase;color:#B07800}
  .convite h1{margin-top:1.5mm;font:700 34pt/.98 Fraunces,serif;letter-spacing:-.03em;color:#083078}
  .convite h1 em{font-style:italic;font-weight:600}
  .convite .h{margin-top:2.5mm;font:600 16pt Fraunces,serif;color:#083078}
  .convite p.t{margin-top:2.5mm;font-size:11.5pt;line-height:1.45;color:#3B4A6B}
  .convite p.t b{color:#083078}
  .segs{margin-top:3.5mm;margin-bottom:5mm;display:flex;flex-wrap:wrap;gap:1.8mm}
  .segs span{font-size:9pt;font-weight:800;padding:1.3mm 3.2mm;border-radius:10mm;background:#fff;border:.4mm solid #083078;color:#083078}

  .rodape{margin-top:auto;display:flex;align-items:center;gap:6mm;padding:5mm 6mm;border:.5mm dashed #083078;border-radius:3mm;background:#fff}
  .onde{flex:1}
  .onde .t{font-size:8.4pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:#B07800}
  .onde .e{margin-top:1.4mm;font:600 14pt/1.15 Fraunces,serif;color:#083078}
  .onde .l{margin-top:1.2mm;font-size:9.8pt;line-height:1.45;color:#3B4A6B}
  .onde .c{margin-top:1mm;font-size:9pt;font-weight:700;color:#083078}
  .codigo{display:flex;flex-direction:column;align-items:center;gap:1.6mm;font-size:8.2pt;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#083078;text-align:center;line-height:1.2}
  .codigo img{width:23mm;height:23mm}
`;

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Experiência Amadeus - 17 de outubro</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700;9..40,800&display=swap">
<style>${CSS}</style>
</head>
<body>
  <section class="folha">
    <div class="topo">
      <img src="${LOGO}" alt="Centro Educacional Amadeus - 30 anos">
      <span class="selo">Convite</span>
    </div>

    <div class="bilhete">
      <span class="fita"></span>
      <p class="mao a">Mãe, pai:</p>
      <p class="mao b">no sábado, vamos conhecer</p>
      <p class="mao b"><u>a minha futura escola</u>?</p>
      <p class="mao a">Eu quero muito ir!</p>
      ${DESENHO}
      <p class="assina">Com carinho, <i></i></p>
    </div>

    <div class="quando">
      <div class="cal">
        <p class="m">${esc(EVENTO.mes)} ${esc(EVENTO.ano)}</p>
        <p class="d">${esc(EVENTO.dia)}<svg viewBox="0 0 100 70" preserveAspectRatio="none"><path d="M60 5C30 2 5 14 6 36s28 32 52 30 38-16 36-34S76 2 42 9"/></svg></p>
        <p class="s">${esc(EVENTO.diaSemana)}</p>
      </div>
      <div class="convite">
        <p class="k">Você está convidado</p>
        <h1>Experiência <em>Amadeus</em></h1>
        <p class="h">Sábado, 17 de outubro, às ${esc(EVENTO.hora)}, na escola</p>
        <p class="t">Venha viver um dia dentro da nossa escola, <b>junto com seu filho ou sua filha,</b> e sentir na prática um pouco do que ele vai viver aqui.</p>
        <div class="segs">${SEGMENTOS.map((s) => `<span>${esc(s.nome)}</span>`).join("")}</div>
      </div>
    </div>

    <div class="rodape">
      <div class="onde">
        <p class="t">Onde é</p>
        <p class="e">Centro Educacional Amadeus</p>
        <p class="l">${esc(ENDERECO.rua)}<br>${esc(ENDERECO.bairro)}</p>
        <p class="c">${esc(ENDERECO.cep)}</p>
      </div>
      <span class="codigo"><img src="${QR_ZAP}" alt="QR para confirmar presença no WhatsApp">Confirmar<br>presença</span>
      <span class="codigo"><img src="${QR_MAPA}" alt="QR para abrir o mapa">Como<br>chegar</span>
    </div>
  </section>
</body>
</html>`;

fs.writeFileSync(path.join(saida, "Encarte_Experiencia_Amadeus_Convite.html"), html);
console.log("Encarte_Experiencia_Amadeus_Convite.html montado");
