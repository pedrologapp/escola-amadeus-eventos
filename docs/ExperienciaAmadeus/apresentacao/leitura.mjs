// Versão de leitura para celular em pé: foto de cada tela + o texto dela, em letra grande.
// node leitura.mjs  →  leitura-fundamental.html e leitura-infantil.html (+ img/telas/)
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url';
const puppeteer = createRequire('C:/Users/pedro/OneDrive/Área de Trabalho/Meu Futuro/Agência IA/Conteudo/fabrica/x.js')('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
fs.mkdirSync('img/telas', { recursive: true });
for (const [deck, titulo] of [['fundamental', 'Fundamental 1 e 2'], ['infantil', 'Educação Infantil']]) {
  const n = (fs.readFileSync(`${deck}.html`, 'utf8').match(/<section class="s[ "]/g) || []).length;
  const telas = [];
  for (let i = 0; i < n; i++) {
    const pg = await b.newPage(); await pg.setViewport({ width: 1600, height: 900 });
    await pg.goto(pathToFileURL(path.resolve(`${deck}.html`)).href + `?shot=${i}`, { waitUntil: 'networkidle0' });
    await pg.evaluate(async () => { await document.fonts.ready; document.body.classList.add('clean'); }); await new Promise((r) => setTimeout(r, 300));
    const arq = `img/telas/${deck}-${String(i + 1).padStart(2, '0')}.jpg`;
    await pg.screenshot({ path: arq, type: 'jpeg', quality: 82 });
    // texto da tela, na ordem em que aparece (sem rótulos repetidos)
    const texto = await pg.evaluate(() => {
      const st = document.querySelector('.s .stage'); const out = [];
      st.querySelectorAll('.kicker, .small, h1, .h-xl, .h-l, .h-m, .body, .serie, .col, .mat, .av, .rec, .lista-g p, .pilula, .num, .pol p, .fonte').forEach((el) => {
        if (el.closest('.col, .mat, .av, .rec, .num') && !el.matches('.col, .mat, .av, .rec, .num')) return;
        const t = el.innerText.replace(/\s+\n/g, '\n').replace(/[ \t]+/g, ' ').trim();
        if (t && !out.includes(t)) out.push({ t, k: el.className.split(' ')[0] });
      });
      return out;
    });
    telas.push({ arq, texto }); await pg.close();
  }
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${titulo} · leitura</title>
<style>
*{box-sizing:border-box;margin:0} body{background:#0b1020;color:#f4f1ea;font:17px/1.5 -apple-system,"Segoe UI",Roboto,sans-serif;padding:16px 14px 60px}
h1{font-size:22px;line-height:1.2} .sub{color:#c9c3b6;font-size:14px;margin-top:4px}
.tela{margin-top:26px;background:#141a33;border-radius:16px;padding:12px 12px 16px}
.n{font-size:12px;font-weight:700;letter-spacing:.18em;color:#FFB000;text-transform:uppercase}
.tela img{display:block;width:100%;border-radius:10px;margin-top:8px}
.tela a{display:block}
.t{margin-top:12px} .t p{margin-top:8px;white-space:pre-line}
.k-kicker,.k-small,.k-fonte{font-size:13px;color:#FFB000;font-weight:700;letter-spacing:.06em}
.k-h-xl,.k-h-l,.k-h1{font-size:21px;font-weight:700;line-height:1.25}
.k-h-m{font-size:19px;font-weight:600}
.k-col,.k-mat,.k-av,.k-rec,.k-num,.k-pilula{background:#1d2547;border-radius:10px;padding:8px 10px}
.dica{margin-top:10px;font-size:13px;color:#9aa3b4}
</style></head><body>
<h1>Experiência Amadeus · ${titulo}</h1>
<p class="sub">Versão para ler no celular em pé. Toque na foto da tela para ampliar. Na apresentação, cada tela vai aparecendo por cliques.</p>
${telas.map((t, i) => `<section class="tela"><p class="n">Tela ${i + 1} de ${telas.length}</p><a href="${t.arq}" target="_blank"><img src="${t.arq}" alt="Tela ${i + 1}" loading="lazy"></a><div class="t">${t.texto.map((x) => `<p class="k-${x.k}">${esc(x.t)}</p>`).join('')}</div></section>`).join('\n')}
<p class="dica">Centro Educacional Amadeus · material da Geekie resumido para a Experiência Amadeus (10/10/2026).</p>
</body></html>`;
  fs.writeFileSync(`leitura-${deck}.html`, html); console.log(deck, telas.length);
}
await b.close();
