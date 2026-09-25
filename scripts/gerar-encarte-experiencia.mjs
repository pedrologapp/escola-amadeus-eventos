import fs from "node:fs";
import path from "node:path";

/**
 * Encarte da Experiência Amadeus. A4 retrato, uma página.
 *
 * O desenho segue a lógica da hero da Arena Arbória, que o Pedro pediu como
 * referência, com duas trocas que ele pediu: fundo claro no lugar do escuro,
 * e o azul do Amadeus no lugar do turquesa.
 *
 * O que veio da Arena não é a decoração, é a disciplina:
 *
 *   1. UMA cor de acento só. Na Arena é o turquesa; aqui é o azul #083078.
 *      Todo o resto é escala neutra. Peça com duas ou três cores brigando
 *      é o que faz um encarte parecer amador.
 *   2. Escala de cinzas com papel definido: texto principal, prosa, gancho,
 *      secundário e rótulo. Cada um tem o seu tom, nada é "meio cinza".
 *   3. Tipografia do sistema, sem webfont. Nome grande, tracking apertado.
 *
 * A marca da escola entra como silhueta ao fundo, do jeito que está nas
 * outras peças, e não há nenhum elemento solto na página.
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
const FOTO = embutir("public/materiais/experiencia-familia.jpg", "jpeg");

const EVENTO = {
  data: "10/10/2026",
  diaSemana: "sábado",
  hora: "14h",
};

/* A pilha do sistema, igual à da Arena: nada de webfont, e a peça é impressa
   de qualquer jeito, então o que vale é o desenho da Segoe UI no Windows. */
const FONTE =
  '"SF Pro Display", "Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif';

const CSS = `
  @page{ size:A4; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}

  :root{
    --bg:#FAF7F0;      /* fundo claro, o mesmo bege das outras peças */
    --ink:#0B1A3A;     /* texto principal, azul quase preto */
    --prosa:#33405C;   /* corpo de texto */
    --gancho:#5A6782;  /* a frase de chamada */
    --ink2:#7C87A0;    /* secundário */
    --mut:#9BA4B8;     /* rótulos pequenos */
    --acc:#083078;     /* o azul do Amadeus, a única cor de acento */
    --ouro:#FFB000;    /* o amarelo da marca, em doses pequenas */
  }

  body{font-family:${FONTE};-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    background:var(--bg);color:var(--ink);
    display:flex;flex-direction:column;
    padding:15mm 16mm 12mm;text-align:center;
  }
  .agua{
    position:absolute;left:50%;bottom:-96mm;width:270mm;
    transform:translateX(-50%);opacity:.055;z-index:0;
  }
  .folha > *:not(.agua){position:relative;z-index:1}

  .marca{width:29mm;height:auto;align-self:center}

  .rotulo{
    margin-top:9mm;font-size:8.4pt;font-weight:700;letter-spacing:.28em;
    text-transform:uppercase;color:var(--mut);
  }

  h1{
    margin-top:4mm;font-size:46pt;font-weight:800;line-height:.96;
    letter-spacing:-.035em;color:var(--acc);
  }
  h1 span{display:block}

  .fio{
    width:18mm;height:1.1mm;background:var(--ouro);border-radius:1mm;
    align-self:center;margin-top:7mm;
  }

  .chamada{
    margin-top:7mm;align-self:center;max-width:132mm;
    font-size:13pt;font-weight:500;line-height:1.5;color:var(--gancho);
  }
  .chamada b{font-weight:700;color:var(--ink)}

  .foto{
    margin-top:9mm;width:100%;border-radius:6mm;overflow:hidden;
    line-height:0;
  }
  .foto img{width:100%;height:72mm;object-fit:cover;object-position:50% 48%}

  /* A data é o dado que o pai precisa levar da folha, então ela é o segundo
     maior elemento da página, depois do nome. */
  .quando{
    margin-top:9mm;display:flex;align-items:stretch;justify-content:center;
    gap:0;align-self:center;
  }
  .quando .bloco{padding:0 11mm;text-align:center}
  .quando .bloco + .bloco{border-left:.4mm solid rgba(11,26,58,.14)}
  .quando .valor{
    display:block;font-size:26pt;font-weight:800;letter-spacing:-.03em;
    line-height:1;color:var(--ink);
  }
  .quando .rot{
    display:block;margin-top:2.5mm;font-size:8.6pt;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;color:var(--mut);
  }

  .texto{
    margin-top:9mm;align-self:center;max-width:152mm;
    font-size:11.5pt;line-height:1.55;color:var(--prosa);
  }

  .chamado{
    margin-top:auto;align-self:center;width:100%;max-width:150mm;
    background:var(--acc);color:#FFFFFF;border-radius:5mm;
    padding:6mm 8mm;font-size:15pt;font-weight:700;letter-spacing:-.01em;
  }

  .rodape{
    margin-top:7mm;display:flex;align-items:flex-end;justify-content:space-between;
    gap:6mm;text-align:left;
    padding-top:6mm;border-top:.4mm solid rgba(11,26,58,.14);
  }
  .rodape .escola{font-size:10.5pt;font-weight:700;color:var(--ink);line-height:1.5}
  .rodape .escola span{display:block;font-size:9pt;font-weight:500;color:var(--ink2)}
  .rodape .zap{text-align:right;font-size:11pt;font-weight:700;color:var(--ink);line-height:1.5}
  .rodape .zap span{
    display:block;font-size:8.4pt;font-weight:700;letter-spacing:.14em;
    text-transform:uppercase;color:var(--mut);
  }
`;

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
    <h1><span>Experiência</span><span>Amadeus</span></h1>
    <span class="fio"></span>

    <p class="chamada">
      Um sábado para você viver, <b>junto com seu filho ou sua filha</b>,
      um dia dentro da nossa escola.
    </p>

    <div class="foto">
      <img src="${FOTO}" alt="Mãe abraçando a filha antes da escola">
    </div>

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

    <p class="texto">
      Neste dia vocês vão ver de perto o que seu filho ou sua filha vive aqui
      todos os dias: as aulas, os espaços, os projetos e o jeito Amadeus de
      cuidar de cada aluno.
    </p>

    <p class="chamado">Venha conhecer a nossa escola!</p>

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
