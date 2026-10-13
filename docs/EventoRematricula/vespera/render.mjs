// Renderiza vespera.html em vespera.png (1080 x 1350).
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const puppeteer = createRequire('C:/Users/pedro/OneDrive/Área de Trabalho/Meu Futuro/Agência IA/Conteudo/fabrica/x.js')('puppeteer-core');
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', args: ['--allow-file-access-from-files'] });
const pg = await b.newPage();
await pg.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });
await pg.goto(pathToFileURL(path.resolve('vespera.html')).href, { waitUntil: 'networkidle0' });
await pg.evaluate(async () => { await document.fonts.ready; });
await pg.screenshot({ path: 'vespera.png' });
await b.close();
console.log('ok');
