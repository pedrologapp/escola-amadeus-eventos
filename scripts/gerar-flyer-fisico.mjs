import fs from "node:fs";
import path from "node:path";

import {
  VALORES,
  SEGMENTOS,
  PROGRAMAS,
  ESPORTES,
  ESPACOS,
  PRAZO_ANTECIPADA,
  DESCONTO_FIDELIDADE,
  DIA_FIDELIDADE,
} from "../lib/folder-config.ts";

/**
 * Encarte impresso das Matrículas 2027. A4 retrato, frente e verso.
 *
 * Os valores são importados do folder-config, o mesmo arquivo que alimenta
 * eventos.escolaamadeus.com/folder. É de propósito: o encarte e o site não
 * podem divergir de preço, e o QR leva de um para o outro.
 *
 * A frente é o convite e o poema da escola. O verso é o investimento e a
 * lista do que tem. Quem quiser mais que isso aponta a câmera.
 *
 * Uso: node scripts/gerar-flyer-fisico.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const raiz = path.join(import.meta.dirname, "..");

function embutir(relativo, tipo = "png") {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:image/${tipo};base64,${dados}`;
}

const LOGO = embutir("public/folder/logo-horizontal.png");
const QR = embutir("public/materiais/qr-folder.png");

/* O poema é da escola: está no encarte do ano passado e dá nome ao vídeo do
   manifesto ("Cada aluno do Amadeus tem..."). */
const POEMA = [
  ["Mil maneiras de ", "sorrir", ","],
  ["Mil formas de ", "perguntar", " “por quê?”,"],
  ["Mil jeitos de ", "descobrir", " o mundo,"],
  ["Mil ritmos para ", "crescer", "."],
];

const POEMA2 = [
  ["Temos mil ouvidos para ", "escutar", ","],
  ["Mil olhos para ", "observar", ","],
  ["Mil corações para ", "acolher", ","],
  ["Mil modos de ", "cuidar", "."],
];

const URL_FOLDER = "eventos.escolaamadeus.com/folder";

/* -------------------------------------------------------------------- css */

const CSS = `
  @page{ size:A4; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:"DM Sans","Segoe UI",Arial,sans-serif;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }
  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    page-break-after:always;display:flex;flex-direction:column;
  }
  .folha:last-child{page-break-after:auto}

  .serifa{font-family:Fraunces,Georgia,serif;font-optical-sizing:auto;font-weight:600;letter-spacing:-.02em}

  /* --------------------------------------------------------------- frente */
  .frente{
    background:
      radial-gradient(95% 55% at 50% 0%, #1B2A58 0%, rgba(27,42,88,0) 62%),
      radial-gradient(130% 90% at 50% 112%, #0E1B3E 0%, rgba(14,27,62,0) 55%),
      #070B18;
    color:#FAF7F0;padding:16mm 17mm 14mm;align-items:center;text-align:center;
  }
  .frente .logo{width:104mm;height:auto}
  .frente .chamada{
    margin-top:13mm;font-size:9.4pt;font-weight:700;letter-spacing:.3em;
    text-transform:uppercase;color:#E8B44C;
  }
  .frente h1{margin-top:5mm;font-size:30pt;line-height:1.06;color:#FAF7F0}
  .frente h1 em{font-style:normal;color:#E8B44C;display:block}

  .poema{
    margin-top:11mm;font-size:13.5pt;font-weight:500;line-height:1.82;
    color:rgba(250,247,240,.82);
  }
  .poema b{color:#E8B44C;font-weight:700}
  .virada{
    margin:9mm 0 8mm;font-family:Fraunces,Georgia,serif;font-weight:600;
    font-size:21pt;color:#FAF7F0;letter-spacing:-.02em;
  }
  .fecho-poema{
    margin-top:9mm;font-family:Fraunces,Georgia,serif;font-weight:600;
    font-size:18pt;line-height:1.3;letter-spacing:-.02em;color:#FAF7F0;
  }
  .fecho-poema span{color:#E8B44C}

  /* o QR é o motivo de o papel existir: ele abre o folder inteiro */
  .qr-bloco{
    margin-top:auto;display:flex;align-items:center;gap:8mm;
    background:rgba(250,247,240,.06);border:.4mm solid rgba(232,180,76,.35);
    border-radius:8mm;padding:7mm 8mm;text-align:left;width:100%;
  }
  .qr-bloco img{width:32mm;height:32mm;border-radius:3mm;background:#fff;padding:2mm;flex:0 0 auto}
  .qr-bloco > span{flex:1}
  .qr-bloco .titulo{display:block;font-size:15pt;font-weight:800;line-height:1.2;color:#FAF7F0}
  .qr-bloco .texto{display:block;margin-top:2.5mm;font-size:10.5pt;line-height:1.45;color:rgba(250,247,240,.68)}
  .qr-bloco .url{display:block;margin-top:3mm;font-size:10pt;font-weight:700;color:#E8B44C}

  /* ---------------------------------------------------------------- verso */
  .verso{background:#FAF7F0;color:#17223D;padding:13mm 15mm 11mm}
  .verso .etiqueta{
    font-size:8.6pt;font-weight:800;letter-spacing:.26em;
    text-transform:uppercase;color:#B9862F;
  }
  .verso h2{margin-top:3mm;font-size:24pt;line-height:1.04;color:#17223D}

  .tabela{margin-top:6mm;border-top:.5mm solid rgba(23,34,61,.16)}
  .linha{
    display:flex;align-items:center;gap:5mm;
    padding:4.4mm 0;border-bottom:.35mm solid rgba(23,34,61,.12);
  }
  .linha .etapa{flex:1.25;font-size:13pt;font-weight:800;color:#17223D;line-height:1.2}
  .linha .etapa small{display:block;margin-top:1mm;font-size:9pt;font-weight:600;color:#7B8599}
  .linha .celula{flex:1;text-align:right}
  .celula .rotulo{
    display:block;font-size:7.4pt;font-weight:800;letter-spacing:.1em;
    text-transform:uppercase;color:#9AA3B4;
  }
  .celula .valor{display:block;margin-top:1.4mm;font-size:13.5pt;font-weight:800;color:#48546F}
  .celula.forte .rotulo{color:#B9862F}
  .celula.forte .valor{font-size:16pt;color:#17223D}
  .cabecalho .celula .rotulo{color:#7B8599}

  .aviso{
    margin-top:6mm;display:flex;gap:4mm;align-items:flex-start;
    font-size:10pt;line-height:1.45;color:#48546F;
  }
  .aviso b{color:#17223D}

  .material{margin-top:7mm;background:#FFFFFF;border:.4mm solid rgba(23,34,61,.14);border-radius:7mm;padding:7mm 8mm}
  .material h3{font-size:15pt;color:#17223D}
  .material .sub{margin-top:2mm;font-size:10pt;color:#7B8599;line-height:1.4}
  .material .itens{margin-top:5mm;display:flex;flex-direction:column;gap:3.4mm}
  .material .item{display:flex;align-items:baseline;gap:4mm;font-size:11.5pt}
  .material .item .nome{flex:1;font-weight:700;color:#17223D}
  .material .item .antes{font-size:10pt;color:#9AA3B4;text-decoration:line-through}
  .material .item .agora{font-weight:800;color:#B9862F;font-size:13pt}

  .tem{margin-top:7mm}
  .tem h3{font-size:15pt;color:#17223D}
  .tem .grade{
    margin-top:4.5mm;display:flex;flex-wrap:wrap;gap:2.2mm;
  }
  .chip{
    border:.35mm solid rgba(23,34,61,.18);border-radius:99mm;
    padding:2.2mm 4.4mm;font-size:9.4pt;font-weight:600;color:#48546F;
    background:#FFFFFF;
  }
  .chip.ouro{border-color:rgba(185,134,47,.45);color:#8A6420;background:rgba(232,180,76,.1)}

  .rodape{
    margin-top:auto;padding-top:6mm;border-top:.5mm solid rgba(23,34,61,.16);
    display:flex;align-items:flex-end;gap:6mm;
  }
  .rodape .marca{flex:1;font-size:11pt;font-weight:800;color:#17223D;line-height:1.5}
  .rodape .marca span{display:block;font-size:9.5pt;font-weight:500;color:#7B8599}
  .rodape .zap{text-align:right;font-size:11pt;font-weight:800;color:#17223D;line-height:1.5}
  .rodape .zap span{display:block;font-size:9pt;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#B9862F}
`;

/* --------------------------------------------------------------- montagem */

const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const verso = (linhas) =>
  linhas
    .map(([antes, forte, depois]) => `${esc(antes)}<b>${esc(forte)}</b>${esc(depois)}`)
    .join("<br>");

function linhaValores(seg) {
  const v = VALORES[seg.id];
  if (!v) return "";
  return `
      <div class="linha">
        <span class="etapa">${esc(seg.nome)}</span>
        <span class="celula"><span class="rotulo">Mensalidade</span><span class="valor">${esc(v.cheia.mensal)}</span></span>
        <span class="celula"><span class="rotulo">Até ${esc(PRAZO_ANTECIPADA)}</span><span class="valor">${esc(v.antecipada.mensal)}</span></span>
        <span class="celula forte"><span class="rotulo">Fidelidade</span><span class="valor">${esc(v.melhor.mensal)}</span></span>
      </div>`;
}

function itemMaterial(seg) {
  const v = VALORES[seg.id];
  if (!v) return "";
  return v.material
    .map(
      (m) => `
        <div class="item">
          <span class="nome">${esc(m.rotulo)}</span>
          ${m.promo ? `<span class="antes">12x ${esc(m.parcela)}</span>` : ""}
          <span class="agora">12x ${esc(m.promo ? m.promo.parcela : m.parcela)}</span>
        </div>`,
    )
    .join("");
}

/* Os quatro canais da agenda entram como um chip só: listados um a um eles
   ocupam uma linha inteira do papel para dizer a mesma coisa. */
const chips = [
  ...PROGRAMAS.map((p) => ({ nome: p.nome, ouro: true })),
  ...ESPORTES.map((p) => ({ nome: p.nome })),
  ...ESPACOS.map((p) => ({ nome: p.nome })),
  { nome: "Agenda digital com a família" },
];

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Centro Educacional Amadeus - Matrículas 2027</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700;9..40,800&family=Fraunces:opsz,wght@9..144,600&display=swap">
<style>${CSS}</style>
</head>
<body>

  <section class="folha frente">
    <img class="logo" src="${LOGO}" alt="Centro Educacional Amadeus">

    <p class="chamada">Matrículas 2027 &middot; 30 anos</p>
    <h1 class="serifa">Cada aluno do Amadeus<em>tem...</em></h1>

    <p class="poema">${verso(POEMA)}</p>
    <p class="virada">E nós?</p>
    <p class="poema">${verso(POEMA2)}</p>

    <p class="fecho-poema">
      Porque aqui, cada aluno importa.<br>
      Não um pouco. Não às vezes.<br>
      <span>Sempre. Completamente. Para sempre.</span>
    </p>

    <div class="qr-bloco">
      <img src="${QR}" alt="QR do folder digital">
      <span>
        <span class="titulo">A escola inteira, no seu celular.</span>
        <span class="texto">Aponte a câmera para o código e veja os programas, os esportes, os espaços e os valores de cada etapa.</span>
        <span class="url">${esc(URL_FOLDER)}</span>
      </span>
    </div>
  </section>

  <section class="folha verso">
    <p class="etiqueta">Investimento 2027</p>
    <h2 class="serifa">Doze parcelas, três condições.</h2>

    <div class="tabela">
      <div class="linha cabecalho" style="padding-bottom:2mm;border-bottom:none">
        <span class="etapa"></span>
        <span class="celula"><span class="rotulo">Valor cheio</span></span>
        <span class="celula"><span class="rotulo">Matriculando antes</span></span>
        <span class="celula forte"><span class="rotulo">Pagando em dia</span></span>
      </div>
      ${SEGMENTOS.map(linhaValores).join("")}
    </div>

    <p class="aviso">
      <b>A Mensalidade Fidelidade vale sempre.</b> São ${esc(DESCONTO_FIDELIDADE)}
      a menos no mês para quem paga até o dia ${esc(DIA_FIDELIDADE)}, em qualquer
      das condições acima.
    </p>

    <div class="material">
      <h3 class="serifa">Material didático Geekie</h3>
      <p class="sub">
        Comprado à parte, uma vez no ano. Os valores abaixo são os de quem
        matricula ou renova até ${esc(PRAZO_ANTECIPADA)}. Os tablets são
        adquiridos pela escola: nenhuma família compra aparelho.
      </p>
      <div class="itens">
        ${SEGMENTOS.map(itemMaterial).join("")}
      </div>
    </div>

    <div class="tem">
      <h3 class="serifa">E tudo isso está incluído.</h3>
      <div class="grade">
        ${chips.map((c) => `<span class="chip${c.ouro ? " ouro" : ""}">${esc(c.nome)}</span>`).join("")}
      </div>
    </div>

    <div class="rodape">
      <span class="marca">
        Centro Educacional Amadeus
        <span>São Gonçalo do Amarante, RN &middot; 30 anos</span>
      </span>
      <span class="zap">
        <span>Fale com a secretaria</span>
        (84) 9 8145-0229
      </span>
    </div>
  </section>

</body>
</html>`;

fs.writeFileSync(path.join(saida, "Flyer_Matriculas_2027.html"), html);
console.log("Flyer_Matriculas_2027.html montado");
