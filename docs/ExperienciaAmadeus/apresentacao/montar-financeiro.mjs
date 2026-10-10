// Monta a apresentação do Financeiro da Experiência Amadeus (10/10/2026) a partir do deck da reunião de rematrícula
// (docs/EventoRematricula/deck): Amadeus 30 anos → vídeo do Manifesto → os programas → mensalidades e material → encerramento.
// Sem a história da Sônia. O deck era para o telão quadrado; aqui vira TV 16:9 do mesmo jeito que montar.mjs faz
// (medidas cqw → cqh, 30% maiores).
//   node montar-financeiro.mjs  →  financeiro.html (+ cópia em public/experiencia-geekie-ef881fab com assets e vídeo)
import fs from 'node:fs';

const deckDir = new URL('../../EventoRematricula/deck/', import.meta.url);
const deck = fs.readFileSync(new URL('index.html', deckDir), 'utf8');
const ini = deck.indexOf('<main>'), fim = deck.indexOf('</main>');
let topo = deck.slice(0, ini), pe = deck.slice(fim);

const ESC = 1.3;
const escala = (css) => css.replace(/(\d+(?:\.\d+)?)cq[wh]/g, (_, n) => +(n * ESC).toFixed(2) + 'cqh');
topo = topo.replace(/<style>[\s\S]*?<\/style>/g, escala);
const antes = topo;
topo = topo.replace(/\.stage \{ position: relative; width: var\(--side, min\(100vw, 100svh\)\); height: var\(--side, min\(100vw, 100svh\)\);/,
  '.stage { position: relative; width: min(100vw, calc(100svh * 16 / 9)); height: min(100svh, calc(100vw * 9 / 16));');
if (topo === antes) throw new Error('não achei a regra do .stage no deck');
topo = topo.replace(/<title>[^<]*<\/title>/, '<title>Experiência Amadeus · Financeiro</title>');

// as telas, na ordem em que aparecem no deck (inclusive as de vídeo)
const telas = [...deck.slice(ini, fim).matchAll(/<section class="s[^"]*"[^>]*>[\s\S]*?<\/section>/g)].map((m) => m[0]);
const texto = (t) => t.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const acha = (fn, nome) => { const k = telas.findIndex(fn); if (k < 0) throw new Error('tela não encontrada: ' + nome); return telas[k]; };
const escolhidas = [
  acha((t) => /data-block="abertura"/.test(t) && /30 anos/.test(texto(t)) && !/<video/.test(t), 'abertura 30 anos'),
  acha((t) => /O que fomos\./.test(texto(t)), '30 anos: o que fomos'),
  acha((t) => /data-block="manifesto"/.test(t), 'vídeo do manifesto'),
  acha((t) => /E vieram os programas/.test(texto(t)), 'programas'),
  acha((t) => /Agora, o que você vai investir/.test(texto(t)), 'mensalidades (abertura)'),
  acha((t) => /Matriculando até/.test(texto(t)) && /Mensalidades 2027/.test(texto(t)), 'mensalidades'),
  acha((t) => /Promocional/.test(texto(t)), 'tabela promocional'),
  acha((t) => /Material didático 2027/.test(texto(t)), 'material didático'),
  acha((t) => /Não desista de investir/.test(texto(t)), 'encerramento (Cortella)'),
];
// sem o nome de quem apresentou na reunião (rodapé) e, nas duas telas de tabela, sem o título pequeno de cima,
// que na TV 16:9 ficava por baixo do título grande
for (let i = 0; i < escolhidas.length; i++) {
  escolhidas[i] = escolhidas[i].replace(/data-label="[^"]*"/, 'data-label=""');
  if (/Promocional|Material didático Geekie/.test(texto(escolhidas[i]))) escolhidas[i] = escolhidas[i].replace(/\s*<div class="kicker[^"]*">[^<]*<\/div>/, '');
}
// elementos que o script do deck desenha em telas que ficaram de fora (escondidos, só para o script não quebrar)
const sobras = '<div hidden>' + ['anos', 'casas', 'oito', 'papel', 'plan', 'year'].map((id) => `<div id="${id}"></div>`).join('') + '</div>';
const html = topo + '<main>\n' + escolhidas.join('\n\n') + '\n' + sobras + '\n' + pe;
fs.writeFileSync(new URL('./financeiro.html', import.meta.url), html);
console.log('financeiro', escolhidas.length, 'telas');

// cópia online, ao lado das apresentações da Geekie (mesma pasta de fontes); assets e vídeo do deck
const pub = new URL('../../../public/experiencia-geekie-ef881fab/', import.meta.url);
fs.writeFileSync(new URL('financeiro.html', pub), html);
fs.mkdirSync(new URL('assets/programas/', pub), { recursive: true });
fs.mkdirSync(new URL('video/', pub), { recursive: true });
for (const a of ['marca-globo.png', 'marca-30-anos.png', 'logo-horizontal.png', ...fs.readdirSync(new URL('assets/programas/', deckDir)).map((f) => 'programas/' + f)])
  fs.copyFileSync(new URL('assets/' + a, deckDir), new URL('assets/' + a, pub));
fs.copyFileSync(new URL('video/manifesto.mp4', deckDir), new URL('video/manifesto.mp4', pub));
console.log('copiado para public/experiencia-geekie-ef881fab');
