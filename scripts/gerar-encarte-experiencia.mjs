import fs from "node:fs";

/* Monta o encarte da Experiência Amadeus. O desenho segue o encarte da
   reunião de rematrículas (fundo escuro, faixa clara com a logo, tipografia
   grande), mas trocando a paleta pela da arte que a escola já tinha feito:
   azul #002050, amarelo #FFC020 e branco. */

const sc = process.argv[2];
const [logo] = JSON.parse(fs.readFileSync(sc + "/uris.json", "utf8"));
const foto = JSON.parse(fs.readFileSync(sc + "/foto.json", "utf8"));

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Experiência Amadeus - 10 de outubro</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700;9..40,800&display=swap">
<style>
  @page{ size:A4; margin:0 }
  *{box-sizing:border-box;margin:0;padding:0}
  body{
    font-family:"DM Sans","Segoe UI",Arial,sans-serif;
    -webkit-print-color-adjust:exact;print-color-adjust:exact;
  }

  .folha{
    width:210mm;height:297mm;position:relative;overflow:hidden;
    background:
      radial-gradient(120% 60% at 50% 100%, #063A86 0%, rgba(6,58,134,0) 62%),
      linear-gradient(180deg, #002050 0%, #001536 100%);
    display:flex;flex-direction:column;
  }

  /* raios do canto, na mesma ideia dos riscos amarelos da arte original */
  .raio{position:absolute;background:#FFC020;border-radius:2mm;opacity:.9}
  .r1{top:64mm;left:9mm;width:3mm;height:13mm;transform:rotate(18deg)}
  .r2{top:59mm;left:17mm;width:3mm;height:8mm;transform:rotate(-12deg)}
  .r3{top:76mm;left:11mm;width:3mm;height:6mm;transform:rotate(42deg)}
  .r4{top:62mm;right:9mm;width:3mm;height:13mm;transform:rotate(-18deg)}
  .r5{top:57mm;right:17mm;width:3mm;height:8mm;transform:rotate(12deg)}
  .r6{top:74mm;right:11mm;width:3mm;height:6mm;transform:rotate(-42deg)}

  /* faixa clara: a logo dos 30 anos foi feita para fundo claro */
  .barra{
    background:#FFFFFF;padding:9mm 0 8mm;
    display:flex;justify-content:center;
    border-bottom:1.1mm solid #FFC020;
  }
  .barra img{height:30mm;width:auto}

  .miolo{
    flex:1;padding:10mm 17mm 0;
    display:flex;flex-direction:column;align-items:center;text-align:center;
  }

  .convite{
    font-size:8.4pt;font-weight:800;letter-spacing:.3em;
    text-transform:uppercase;color:#FFC020;
  }

  h1{
    margin-top:5mm;font-size:33pt;font-weight:800;
    line-height:1.04;letter-spacing:-.035em;color:#FFFFFF;
  }
  h1 em{font-style:normal;color:#FFC020;display:block}

  .chamada{
    margin-top:7mm;font-size:13pt;font-weight:500;line-height:1.5;
    color:rgba(255,255,255,.82);max-width:128mm;
  }
  .chamada b{font-weight:800;color:#FFFFFF}

  /* cartão da data: o dado que o pai precisa levar da folha */
  .quando{
    margin-top:9mm;width:100%;max-width:154mm;
    background:#FFFFFF;border-radius:7mm;
    display:flex;align-items:stretch;overflow:hidden;
    box-shadow:0 0 0 1.1mm rgba(255,192,32,.85);
  }
  .quando > div{
    flex:1;padding:7mm 4mm;display:flex;flex-direction:column;
    align-items:center;justify-content:center;gap:1.5mm;
  }
  .quando .divisa{flex:0 0 .5mm;background:rgba(0,32,80,.14);padding:0}
  .rotulo{
    font-size:7.6pt;font-weight:800;letter-spacing:.22em;
    text-transform:uppercase;color:#7A5310;
  }
  .valor{
    font-size:21pt;font-weight:800;letter-spacing:-.03em;
    line-height:1;color:#002050;
  }
  .valor small{display:block;margin-top:2mm;font-size:11pt;font-weight:700;letter-spacing:0}

  /* A foto e o texto andam lado a lado: sozinho, o parágrafo deixava um vazio
     no meio da folha. A foto saiu da própria arte que a escola já tinha. */
  .bloco{
    margin-top:9mm;width:100%;max-width:154mm;
    display:flex;align-items:center;gap:7mm;text-align:left;
  }
  .bloco figure{
    flex:0 0 62mm;height:78mm;border-radius:6mm;overflow:hidden;
    box-shadow:0 0 0 1mm rgba(255,192,32,.5);
  }
  .bloco img{width:100%;height:100%;object-fit:cover;display:block}
  .texto{
    flex:1;align-self:center;font-size:11.5pt;line-height:1.58;
    color:rgba(255,255,255,.8);
  }
  .texto mark{background:rgba(255,192,32,.22);color:#FFC020;font-weight:800;padding:0 1mm;border-radius:1mm}

  .chamado{
    margin-top:9mm;margin-bottom:7mm;width:100%;max-width:154mm;
    background:#FFC020;border-radius:6mm;padding:6.5mm 6mm;
    font-size:16.5pt;font-weight:800;letter-spacing:-.02em;color:#002050;
  }

  .rodape{
    background:rgba(0,0,0,.22);border-top:.5mm solid rgba(255,192,32,.4);
    padding:6mm 17mm;text-align:center;
  }
  .rodape .escola{
    font-size:9pt;font-weight:800;letter-spacing:.2em;
    text-transform:uppercase;color:#FFC020;
  }
  .rodape .lugar{
    margin-top:2.5mm;font-size:9.5pt;font-weight:500;color:rgba(255,255,255,.62);
  }
</style>
</head>
<body>

  <div class="folha">
    <span class="raio r1"></span><span class="raio r2"></span><span class="raio r3"></span>
    <span class="raio r4"></span><span class="raio r5"></span><span class="raio r6"></span>

    <div class="barra">
      <img src="${logo}" alt="Centro Educacional Amadeus - 30 anos">
    </div>

    <div class="miolo">
      <p class="convite">Voc&ecirc; e seu filho s&atilde;o nossos convidados</p>

      <h1>Venha viver a<em>Experi&ecirc;ncia Amadeus!</em></h1>

      <p class="chamada">
        Um s&aacute;bado para voc&ecirc; viver <b>junto com seu filho ou sua filha</b>
        um dia dentro da nossa escola.
      </p>

      <div class="quando">
        <div>
          <span class="rotulo">Quando</span>
          <span class="valor">10/10/2026<small>s&aacute;bado</small></span>
        </div>
        <div class="divisa"></div>
        <div>
          <span class="rotulo">Que horas</span>
          <span class="valor">14h<small>na escola</small></span>
        </div>
      </div>

      <div class="bloco">
        <figure><img src="${foto}" alt="M&atilde;e levando o filho para a escola"></figure>
        <p class="texto">
          Neste dia voc&ecirc;s v&atilde;o <mark>vivenciar na pr&aacute;tica</mark> um
          pouco do que seu filho ou sua filha vive aqui todos os dias: as aulas,
          os espa&ccedil;os, os projetos e o jeito Amadeus de cuidar de cada aluno.
        </p>
      </div>

      <p class="chamado">Venha conhecer a nossa escola!</p>
    </div>

    <div class="rodape">
      <p class="escola">Centro Educacional Amadeus &middot; 30 anos</p>
      <p class="lugar">S&atilde;o Gon&ccedil;alo do Amarante, RN</p>
    </div>
  </div>

</body>
</html>`;

fs.writeFileSync(sc + "/experiencia-amadeus.html", html);
console.log("html montado", (fs.statSync(sc + "/experiencia-amadeus.html").size / 1024 / 1024).toFixed(2) + " MB");
