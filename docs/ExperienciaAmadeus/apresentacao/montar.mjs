// Monta as apresentações da Experiência Amadeus (sáb 10/10/2026) a partir do motor da skill apresentacao-imersiva,
// adaptado para TV 16:9: palco 16:9 e todas as medidas em cqh (1cqh = 1% da altura da TV), o mesmo tamanho
// de letra do telão quadrado da reunião de rematrícula.
//   node montar.mjs  →  infantil.html e fundamental.html (telas em telas-infantil.html / telas-fundamental.html)
import fs from 'node:fs';
import os from 'node:os';

const modelo = fs.readFileSync(`${os.homedir()}/.claude/skills/apresentacao-imersiva/modelo/index.html`, 'utf8');
const ini = modelo.indexOf('<main>'), fim = modelo.indexOf('</main>');
let topo = modelo.slice(0, ini), pe = modelo.slice(fim);

// medidas: cqw (lado do quadrado) → cqh (altura da TV)
// e tudo 30% maior que no telão, porque é uma TV na sala
const ESC = 1.3;
const escala = (css) => css.replace(/(\d+(?:\.\d+)?)cq[wh]/g, (_, n) => +(n * ESC).toFixed(2) + 'cqh');
topo = topo.replace(/<style>[\s\S]*?<\/style>/, escala);
topo = topo.replace(/\.stage \{ position: relative; width: var\(--side, min\(100vw, 100svh\)\); height: var\(--side, min\(100vw, 100svh\)\);/,
  '.stage { position: relative; width: min(100vw, calc(100svh * 16 / 9)); height: min(100svh, calc(100vw * 9 / 16));');
if (!topo.includes('calc(100svh * 16 / 9)')) throw new Error('não achei a regra do .stage no modelo');
const extra = escala(fs.readFileSync(new URL('./estilo.css', import.meta.url), 'utf8'));
topo = topo.replace('</style>', extra + '\n</style>');
pe = pe.replace('→ avança · ← volta · F tela cheia · T teste do telão · H esconde isto', '→ avança · ← volta · F tela cheia · H esconde isto');

// O Fundamental usa a mesma abertura do Infantil (telas 0 a 5) e a mesma tela final de espera.
const infantil = fs.readFileSync(new URL('./telas-infantil.html', import.meta.url), 'utf8');
const secoes = infantil.split(/(?=<!-- \d+ · )/);
const abertura = secoes.slice(1, 7).join('').replace('Experiência Amadeus · Educação Infantil 2027', 'Experiência Amadeus · Fundamental 1 e 2 · 2027');
const esperaFinal = secoes[secoes.length - 1];
const fundamental = abertura + fs.readFileSync(new URL('./telas-fundamental-parte.html', import.meta.url), 'utf8') + '\n' + esperaFinal;

for (const [arq, titulo] of [['infantil', 'Experiência Amadeus · Educação Infantil'], ['fundamental', 'Experiência Amadeus · Fundamental 1 e 2']]) {
  const telas = arq === 'infantil' ? infantil : fundamental;
  const html = topo.replace(/<title>[^<]*<\/title>/, `<title>${titulo}</title>`) + '<main>\n' + telas + '\n' + pe;
  fs.writeFileSync(new URL(`./${arq}.html`, import.meta.url), html);
  console.log(arq, (telas.match(/<section /g) || []).length, 'telas');
}
