// Linha branca (gerada) → caminhos SVG separados, para o traço vivo se desenhar.  node vetoriza.cjs entrada.png saida.json
const Jimp = require('jimp'); const potrace = require('potrace'); const fs = require('fs');
const [entrada, saida] = process.argv.slice(2);
(async () => {
  const img = await Jimp.read(entrada); img.greyscale().invert(); // as linhas ficam pretas para o potrace
  const buf = await img.getBufferAsync(Jimp.MIME_PNG);
  potrace.trace(buf, { threshold: 128, turdSize: 6, optTolerance: 0.4 }, (err, svg) => {
    if (err) throw err;
    const d = (svg.match(/ d="([^"]+)"/) || [])[1] || '';
    // separa cada contorno (cada "M") e agrupa os furos com o contorno de fora pela ordem
    const partes = d.split(/(?=M)/).map((p) => p.trim()).filter(Boolean);
    const caixa = (p) => { const n = p.match(/-?\d+(\.\d+)?/g).map(Number); const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; };
    const lista = partes.map((p) => ({ d: p, c: caixa(p) }));
    fs.writeFileSync(saida, JSON.stringify({ w: img.bitmap.width, h: img.bitmap.height, partes: lista }));
    console.log('contornos', lista.length);
  });
})();
