// Traço vivo: um desenho em linha aparece como se alguém o fizesse na hora.
// A imagem das linhas (transparente) é revelada "embaixo da caneta": os contornos vetorizados
// (saída de vetoriza.cjs) viram uma máscara que se desenha aos poucos.
// tracoVivo(svg, dados, imagem, { dur, pular: [[x0,y0,x1,y1], …] })
window.tracoVivo = function (svg, dados, imagem, op = {}) {
  const dur = op.dur || 5, ns = 'http://www.w3.org/2000/svg', id = 'tvm' + Math.random().toString(36).slice(2, 7);
  svg.setAttribute('viewBox', `0 0 ${dados.w} ${dados.h}`);
  svg.innerHTML = '';
  const area = (p) => (p.c[2] - p.c[0]) * (p.c[3] - p.c[1]);
  // ordem: primeiro as formas grandes (a estrutura), depois os detalhes de cima para baixo
  const grandes = [...dados.partes].sort((a, b) => area(b) - area(a)).slice(0, 10);
  const resto = dados.partes.filter((p) => !grandes.includes(p)).sort((a, b) => a.c[1] - b.c[1] || a.c[0] - b.c[0]);
  const defs = document.createElementNS(ns, 'defs'), mask = document.createElementNS(ns, 'mask');
  mask.setAttribute('id', id); mask.setAttribute('maskUnits', 'userSpaceOnUse');
  [...grandes, ...resto].forEach((p, i) => {
    const el = document.createElementNS(ns, 'path');
    const grande = i < grandes.length;
    const atraso = grande ? i * (dur * 0.3 / grandes.length) : dur * 0.3 + (i - grandes.length) * (dur * 0.65 / Math.max(1, resto.length));
    el.setAttribute('d', p.d); el.setAttribute('pathLength', '1');
    el.style.cssText = `fill:none;stroke:#fff;stroke-width:14;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1;animation:tvTraco ${grande ? 1.5 : .7}s ease ${atraso.toFixed(2)}s forwards`;
    mask.appendChild(el);
  });
  (op.pular || []).forEach((r) => { const rc = document.createElementNS(ns, 'rect'); rc.setAttribute('x', r[0]); rc.setAttribute('y', r[1]); rc.setAttribute('width', r[2] - r[0]); rc.setAttribute('height', r[3] - r[1]); rc.setAttribute('fill', '#000'); mask.appendChild(rc); });
  defs.appendChild(mask); svg.appendChild(defs);
  const img = document.createElementNS(ns, 'image');
  img.setAttribute('href', imagem); img.setAttribute('width', dados.w); img.setAttribute('height', dados.h);
  img.setAttribute('mask', `url(#${id})`); img.setAttribute('class', 'tv');
  svg.appendChild(img);
  if (!document.getElementById('tv-css')) {
    const st = document.createElement('style'); st.id = 'tv-css';
    st.textContent = '@keyframes tvTraco{to{stroke-dashoffset:0}}.tv{filter:drop-shadow(0 0 3px rgba(255,214,120,.8)) drop-shadow(0 0 1px rgba(255,214,120,.9))}';
    document.head.appendChild(st);
  }
};
