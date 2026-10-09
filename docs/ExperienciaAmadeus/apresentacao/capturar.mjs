// Foto de cada tela (último passo) em _telas/<deck>-NN.png  ·  node capturar.mjs infantil fundamental
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { pathToFileURL } from 'node:url';
const puppeteer = createRequire('C:/Users/pedro/OneDrive/Área de Trabalho/Meu Futuro/Agência IA/Conteudo/fabrica/x.js')('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
fs.mkdirSync('_telas', { recursive: true });
const erros = [];
for (const deck of process.argv.slice(2)) {
  const n = (fs.readFileSync(`${deck}.html`, 'utf8').match(/<section class="s[ "]/g) || []).length;
  for (let i = 0; i < n; i++) {
    const pg = await b.newPage(); await pg.setViewport({ width: 1280, height: 720 });
    pg.on('pageerror', (e) => erros.push(`${deck} ${i}: ${e.message}`));
    await pg.goto(pathToFileURL(path.resolve(`${deck}.html`)).href + `?shot=${i}`, { waitUntil: 'networkidle0' });
    await pg.evaluate(async () => { await document.fonts.ready; }); await new Promise((r) => setTimeout(r, 300));
    await pg.screenshot({ path: `_telas/${deck}-${String(i).padStart(2, '0')}.png` }); await pg.close();
  }
}
await b.close(); console.log('ok', erros.length ? erros : 'sem erros');
