// Traço vivo: um desenho em linha aparece como se alguém o fizesse na hora.
// A imagem das linhas (transparente) é revelada "embaixo da caneta": os contornos vetorizados
// (saída de vetoriza.cjs) viram uma máscara que se desenha aos poucos.
// tracoVivo(svg, dados, imagem, { dur, pular: [[x0,y0,x1,y1], …], cores: [[0,'#cor'], [1,'#cor']], ajuste })
//   cores: degradê de cima para baixo aplicado às linhas (céu azul, prédio quente, grama verde…).
window.tracoVivo = function (svg, dados, imagem, op = {}) {
  const dur = op.dur || 5, ns = 'http://www.w3.org/2000/svg', id = 'tv' + Math.random().toString(36).slice(2, 7);
  const el = (n, a = {}) => { const e = document.createElementNS(ns, n); for (const k in a) e.setAttribute(k, a[k]); return e; };
  svg.setAttribute('viewBox', `0 0 ${dados.w} ${dados.h}`); svg.setAttribute('preserveAspectRatio', op.ajuste || 'xMidYMid slice');
  svg.innerHTML = '';
  const area = (p) => (p.c[2] - p.c[0]) * (p.c[3] - p.c[1]);
  // ordem: primeiro as formas grandes (a estrutura), depois os detalhes de cima para baixo
  const grandes = [...dados.partes].sort((a, b) => area(b) - area(a)).slice(0, 10);
  const resto = dados.partes.filter((p) => !grandes.includes(p)).sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0]);
  const defs = el('defs');
  const revela = el('mask', { id: id + 'r', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: dados.w, height: dados.h });
  [...grandes, ...resto].forEach((p, i) => {
    const grande = i < grandes.length;
    const atraso = grande ? i * (dur * 0.3 / grandes.length) : dur * 0.3 + (i - grandes.length) * (dur * 0.65 / Math.max(1, resto.length));
    const pa = el('path', { d: p.d, pathLength: 1 });
    pa.style.cssText = `fill:none;stroke:#fff;stroke-width:14;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:tvTraco ${grande ? 1.5 : .7}s ease ${atraso.toFixed(2)}s forwards`;
    revela.appendChild(pa);
  });
  (op.pular || []).forEach((r) => revela.appendChild(el('rect', { x: r[0], y: r[1], width: r[2] - r[0], height: r[3] - r[1], fill: '#000' })));
  defs.appendChild(revela);
  const grupo = el('g', { mask: `url(#${id}r)`, class: 'tv' });
  if (op.cores) {
    // as linhas viram máscara e um degradê colorido aparece só onde há linha
    const linhas = el('mask', { id: id + 'l', maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: dados.w, height: dados.h });
    linhas.appendChild(el('image', { href: imagem, width: dados.w, height: dados.h }));
    const grad = el('linearGradient', { id: id + 'g', x1: 0, y1: 0, x2: 0, y2: 1 });
    op.cores.forEach(([o, c]) => grad.appendChild(el('stop', { offset: o, 'stop-color': c })));
    defs.appendChild(linhas); defs.appendChild(grad);
    grupo.appendChild(el('rect', { width: dados.w, height: dados.h, fill: `url(#${id}g)`, mask: `url(#${id}l)` }));
  } else {
    grupo.appendChild(el('image', { href: imagem, width: dados.w, height: dados.h }));
  }
  svg.appendChild(defs); svg.appendChild(grupo);
  if (!document.getElementById('tv-css')) {
    const st = document.createElement('style'); st.id = 'tv-css';
    st.textContent = '@keyframes tvTraco{to{stroke-dashoffset:0}}.tv{filter:drop-shadow(0 0 3px rgba(255,255,255,.45)) drop-shadow(0 0 1px rgba(255,255,255,.6))}';
    document.head.appendChild(st);
  }
};
