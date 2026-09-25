import fs from "node:fs";
import path from "node:path";

import {
  VALORES,
  SEGMENTOS,
  PROGRAMAS,
  ESPORTES,
  ESPACOS,
  COMUNICACAO,
  BOLHAS_DENTRO,
  BOLHAS_FORA,
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
 * A frente é o compilado do que a escola tem, em fotos. O verso é o
 * investimento. Quem quiser mais que isso aponta a câmera do celular.
 *
 * Uso: node scripts/gerar-flyer-fisico.mjs <pasta-de-saida>
 */

const saida = process.argv[2] ?? ".";
const capa = process.argv[3] ?? "fotos"; // "fotos" ou "constelacao"
const raiz = path.join(import.meta.dirname, "..");

function embutir(relativo, tipo = "png") {
  const dados = fs.readFileSync(path.join(raiz, relativo)).toString("base64");
  return `data:image/${tipo};base64,${dados}`;
}

/* A marca dos 30 anos é a versão para fundo claro. O logo horizontal tem o
   "AMADEUS" em creme e sumiria no bege. */
const LOGO = embutir("public/folder/marca-30-anos.png");
const GLOBO = embutir("public/folder/marca-globo.png"); // só a marca d'água
const QR = embutir("public/materiais/qr-folder.png");

/* Os seis quadros da frente. A foto vem do mesmo arquivo que o folder
   digital usa, então o papel e a tela mostram a mesma escola. */
function acharFoto(nome, lista) {
  const peca = lista.find((p) => p.nome === nome);
  if (!peca || !peca.foto) throw new Error("sem foto: " + nome);
  return peca.foto.src;
}

/**
 * O quadro é deitado e quase toda foto nossa é em pé, então o corte come a
 * altura. Com o corte no meio, sobra chão e some rosto. O "foco" puxa a
 * janela para cima da foto, que é onde estão os rostos. A porcentagem é
 * object-position: 0% encosta no topo da imagem, 50% é o meio.
 */
const QUADROS = [
  { nome: "Projeto Arboria", legenda: "As oito inteligências de Howard Gardner", foto: acharFoto("Projeto Arboria", PROGRAMAS), foco: "8%" },
  { nome: "Bilíngue", legenda: "Aulas inteiramente em inglês, com o Evolutive", foto: acharFoto("Bilíngue - Evolutive English at School", PROGRAMAS), foco: "8%", perto: { escala: 1.35, origem: "62% 26%" } },
  { nome: "Socioemocional", legenda: "Aprender a lidar com o que se sente", foto: acharFoto("Educação Socioemocional", PROGRAMAS), foco: "6%" },
  { nome: "Sala Maker e Robótica", legenda: "Do 1º ao 9º ano, pondo a mão na massa", foto: acharFoto("Sala Maker e Robótica", PROGRAMAS), foco: "14%" },
  { nome: "Educação Financeira", legenda: "Criança que entende dinheiro cedo decide melhor depois", foto: acharFoto("Educação Financeira", PROGRAMAS), foco: "30%" },
  { nome: "Esportes", legenda: "Karatê, futsal, vôlei e ballet", foto: acharFoto("Ballet", ESPORTES), foco: "30%" },
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
  /* A mesma silhueta dos slides. No bege ela entra escura e bem apagada:
     serve de textura, não pode disputar com o texto nem sujar a impressão. */
  .agua{
    position:absolute;right:-52mm;bottom:-58mm;width:190mm;
    opacity:.05;filter:grayscale(1) brightness(.35);
  }
  .folha > *:not(.agua){position:relative;z-index:1}
  .folha:last-child{page-break-after:auto}

  .serifa{font-family:Fraunces,Georgia,serif;font-optical-sizing:auto;font-weight:600;letter-spacing:-.02em}

  /* --------------------------------------------------------------- frente
     Bege dos dois lados: o papel inteiro na mesma cor, e os quadros de foto
     é que fazem o contraste. */
  .frente{background:#FAF7F0;color:#17223D;padding:13mm 14mm 11mm}
  .topo-frente{display:flex;align-items:center;justify-content:space-between;gap:6mm}
  /* aqui vai a marca dos 30 anos, que é a versão feita para fundo claro */
  .topo-frente .logo{width:26mm;height:auto}
  .topo-frente .selo{
    text-align:right;font-size:8.2pt;font-weight:800;letter-spacing:.2em;
    text-transform:uppercase;color:#B9862F;line-height:1.7;
  }
  .topo-frente .selo span{display:block;color:#9AA3B4}

  .frente h1{margin-top:6mm;font-size:29pt;line-height:1.04;color:#17223D}
  .frente h1 em{font-style:normal;color:#B9862F}
  .frente .linha-fina{
    margin-top:3.5mm;font-size:11pt;font-weight:500;line-height:1.45;
    color:#5A657F;max-width:150mm;
  }
  .frente .linha-fina b{color:#17223D;font-weight:700}

  /* o compilado: seis quadros, foto com o nome por cima */
  .quadros{margin-top:6mm;display:grid;grid-template-columns:1fr 1fr;gap:3.5mm}
  .quadro{
    position:relative;height:38.5mm;border-radius:5mm;overflow:hidden;
    background:#0B1733;
  }
  .quadro img{width:100%;height:100%;object-fit:cover;display:block}
  .quadro .veu{
    position:absolute;inset:0;
    background:linear-gradient(180deg, rgba(7,11,24,.12) 0%, rgba(7,11,24,.52) 48%, rgba(7,11,24,.9) 100%);
  }
  .quadro .texto{position:absolute;left:6mm;right:6mm;bottom:5mm}
  .quadro .nome{display:block;font-size:13pt;font-weight:800;line-height:1.1;color:#FAF7F0}
  .quadro .legenda{display:block;margin-top:1.6mm;font-size:8.6pt;font-weight:500;line-height:1.3;color:rgba(250,247,240,.78)}

  /* a novidade do ano tem faixa própria */
  .faixa-geekie{
    margin-top:3.5mm;display:flex;align-items:center;gap:6mm;
    background:rgba(232,180,76,.16);border:.4mm solid rgba(185,134,47,.42);
    border-radius:5mm;padding:5.5mm 7mm;
  }
  .faixa-geekie .rot{
    font-size:7.6pt;font-weight:800;letter-spacing:.2em;text-transform:uppercase;
    color:#B9862F;white-space:nowrap;
  }
  .faixa-geekie .txt{flex:1;font-size:10.5pt;font-weight:600;line-height:1.35;color:#17223D}
  .faixa-geekie .txt b{color:#8A6420}

  .lista-espacos{
    margin-top:4mm;font-size:9.6pt;font-weight:600;line-height:1.7;color:#5A657F;
  }
  .lista-espacos b{color:#B9862F;font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:8pt}

  /* Sem caixa: o QR já tem o fundo bege da página, então ele e o texto ficam
     soltos, apoiados só num fio. */
  .qr-bloco{
    margin-top:auto;display:flex;align-items:center;gap:7mm;width:100%;
    padding-top:6mm;border-top:.4mm solid rgba(23,34,61,.16);
  }
  .qr-bloco img{width:30mm;height:30mm;flex:0 0 auto}
  .qr-bloco > span{flex:1}
  .qr-bloco .titulo{display:block;font-size:13.5pt;font-weight:800;line-height:1.2;color:#17223D}
  .qr-bloco .texto{display:block;margin-top:2mm;font-size:9.8pt;line-height:1.42;color:#5A657F}
  .qr-bloco .url{display:block;margin-top:2.5mm;font-size:9.6pt;font-weight:700;color:#B9862F}


  /* ------------------------------------------------------- constelação
     No folder digital ela vive sobre o azul. Aqui o papel é bege, então as
     bolhas viram brancas com fio fino, e as três etapas ficam sólidas em
     azul pra se destacarem das outras catorze. */
  .capa-constelacao{justify-content:space-between}
  .constelacao{
    position:relative;width:100%;height:176mm;margin:auto 0;
    flex:0 0 auto;
  }
  .constelacao .anel{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    border-radius:50%;border:.3mm solid rgba(23,34,61,.14);
  }
  .bolha{position:absolute;left:50%;top:50%}
  .miolo-bolha{
    display:flex;flex-direction:column;width:100%;height:100%;
    align-items:center;justify-content:center;
    border-radius:50%;text-align:center;line-height:1.14;padding:0 2mm;
    background:#FFFFFF;border:.3mm solid rgba(23,34,61,.16);
    font-size:8.6pt;font-weight:700;color:#17223D;
  }
  .bolha.miuda .miolo-bolha{font-size:7.6pt}
  .bolha.dentro .miolo-bolha{
    background:#17223D;border-color:#17223D;color:#FAF7F0;
    font-size:9.4pt;font-weight:800;
  }
  .miolo-bolha span{display:block}

  .centro{
    position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
    width:64mm;text-align:center;
  }
  .centro .convite{
    display:block;font-size:23pt;line-height:1.1;color:#17223D;
  }
  .capa-constelacao .qr-bloco{margin-top:auto}

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
/* A foto do quadro entra embutida: o HTML precisa abrir sozinho na gráfica. */
function quadro(q) {
  const dados = embutir(path.join("public", q.foto), "webp");
  return `
        <div class="quadro">
          <img src="${dados}" alt="${esc(q.nome)}" style="object-position:50% ${q.foco}${
            q.perto ? `;transform:scale(${q.perto.escala});transform-origin:${q.perto.origem}` : ""
          }">
          <span class="veu"></span>
          <span class="texto">
            <span class="nome">${esc(q.nome)}</span>
            <span class="legenda">${esc(q.legenda)}</span>
          </span>
        </div>`;
}

const chips = [
  ...PROGRAMAS.map((p) => ({ nome: p.nome, ouro: true })),
  ...ESPORTES.map((p) => ({ nome: p.nome })),
  ...ESPACOS.map((p) => ({ nome: p.nome })),
  { nome: "Agenda digital com a família" },
];

/* ------------------------------------------------------------- as capas
   Duas versões do mesmo encarte, escolhidas pelo segundo argumento:
   "fotos" mostra o compilado em quadros, "constelacao" traz o desenho da
   capa do folder digital. O verso é o mesmo nas duas. */

function frenteFotos() {
  return `  <section class="folha frente">
    <img class="agua" src="${GLOBO}" alt="">
    <div class="topo-frente">
      <img class="logo" src="${LOGO}" alt="Centro Educacional Amadeus">
      <span class="selo">Matrículas<span>2027</span></span>
    </div>

    <h1 class="serifa">Isso é o <em>Amadeus.</em></h1>
    <p class="linha-fina">
      Tem criança vivendo cada uma dessas coisas hoje, nesta escola.
      <b>Ano que vem, uma delas pode ser a sua.</b>
    </p>

    <div class="quadros">
      ${QUADROS.map(quadro).join("")}
    </div>

    <div class="faixa-geekie">
      <span class="rot">Novidade 2027</span>
      <span class="txt">O material didático passa a ser o <b>Geekie</b>. Continua sendo livro, com uma parte digital junto, e toda semana a família recebe um retorno de como a criança foi.</span>
    </div>

    <p class="lista-espacos"><b>Nossos espaços</b><br>${ESPACOS.map((e) => esc(e.nome)).join(" &middot; ")}</p>

    <div class="qr-bloco">
      <img src="${QR}" alt="QR do folder digital">
      <span>
        <span class="titulo">A escola inteira, no seu celular.</span>
        <span class="texto">Aponte a câmera para o código: cada programa com foto e explicação, os vídeos das etapas e os valores por segmento.</span>
        <span class="url">${esc(URL_FOLDER)}</span>
      </span>
    </div>
  </section>
`;
}

/* ------------------------------------------------------- a constelação
   Mesmo desenho da capa do folder digital: um anel com as etapas por dentro
   e um anel com tudo o que a escola tem por fora. A geometria veio do
   app/folder/folder-cliente.tsx, com o anel de dentro mais aberto, porque
   aqui o miolo carrega uma frase e não a marca. */
const D = 168; // diâmetro da constelação, em mm
const RAIO_DENTRO = 0.275;
const RAIO_FORA = 0.432;
const TAM_DENTRO = 0.125;
const TAM_FORA = 0.152;

function angulos(quantidade, deslocamento) {
  const passo = 360 / quantidade;
  return Array.from({ length: quantidade }, (_, i) => deslocamento + i * passo);
}

function bolha(rotulo, linhas, angulo, raio, tamanho, dentro) {
  const lado = D * tamanho;
  const partes = linhas ?? [rotulo];
  const maior = Math.max(...partes.map((x) => x.length));
  const corpo = partes.map((x) => `<span>${esc(x)}</span>`).join("");
  return `
        <span class="bolha${dentro ? " dentro" : ""}${maior > 9 ? " miuda" : ""}" style="width:${lado.toFixed(
          2,
        )}mm;height:${lado.toFixed(2)}mm;margin:${(-lado / 2).toFixed(2)}mm 0 0 ${(-lado / 2).toFixed(
          2,
        )}mm;transform:rotate(${angulo}deg) translate(${(D * raio).toFixed(2)}mm) rotate(${-angulo}deg)">
          <span class="miolo-bolha">${corpo}</span>
        </span>`;
}

function frenteConstelacao() {
  const dentro = angulos(BOLHAS_DENTRO.length, -90)
    .map((a, i) => bolha(BOLHAS_DENTRO[i].rotulo, null, a, RAIO_DENTRO, TAM_DENTRO, true))
    .join("");
  const fora = angulos(BOLHAS_FORA.length, 0)
    .map((a, i) => bolha(BOLHAS_FORA[i].rotulo, BOLHAS_FORA[i].linhas, a, RAIO_FORA, TAM_FORA, false))
    .join("");
  const anelDentro = (D * RAIO_DENTRO * 2).toFixed(1);
  const anelFora = (D * RAIO_FORA * 2).toFixed(1);

  return `  <section class="folha frente capa-constelacao">
    <img class="agua" src="${GLOBO}" alt="">
    <div class="topo-frente">
      <img class="logo" src="${LOGO}" alt="Centro Educacional Amadeus">
      <span class="selo">Matrículas<span>2027</span></span>
    </div>

    <div class="constelacao">
      <span class="anel" style="width:${anelDentro}mm;height:${anelDentro}mm"></span>
      <span class="anel" style="width:${anelFora}mm;height:${anelFora}mm"></span>
      ${dentro}
      ${fora}
      <span class="centro">
        <span class="convite serifa">Faça parte<br>de tudo isso!</span>
      </span>
    </div>

    <div class="qr-bloco">
      <img src="${QR}" alt="QR do folder digital">
      <span>
        <span class="titulo">A escola inteira, no seu celular.</span>
        <span class="texto">Aponte a câmera para o código: cada programa com foto e explicação, os vídeos das etapas e os valores por segmento.</span>
        <span class="url">${esc(URL_FOLDER)}</span>
      </span>
    </div>
  </section>
`;
}

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Centro Educacional Amadeus - Matrículas 2027</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,500;9..40,600;9..40,700;9..40,800&family=Fraunces:opsz,wght@9..144,600&display=swap">
<style>${CSS}</style>
</head>
<body>

  ${capa === "constelacao" ? frenteConstelacao() : frenteFotos()}
  <section class="folha verso">
    <img class="agua" src="${GLOBO}" alt="">
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

const nome =
  "Flyer_Matriculas_2027" + (capa === "constelacao" ? "_Constelacao" : "") + ".html";
fs.writeFileSync(path.join(saida, nome), html);
console.log(nome, "montado");
