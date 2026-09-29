// Ilustrações da Semana da Criança no estilo "desenho de criança com giz de cera"
// (mesmo estilo do site das fotos de infância, /criancaamadeus): cada traço tem pathLength=1
// e, com a classe .anima no <svg>, vai se desenhando sozinho; o filtro "giz" treme a borda.
// Sem .anima o desenho aparece pronto (banner, encarte, impressão).
(function () {
  const C = { azul: '#1D4FA0', mar: '#083078', ama: '#FFB000', ver: '#E0524C', verde: '#3FA66B', ros: '#E86FA6', rox: '#8A63D2', lar: '#F28C28', cel: '#2BA3D6', mar2: '#8A5A2B' };
  const circ = (cx, cy, r) => `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0`;
  const elip = (cx, cy, rx, ry) => `M${cx - rx} ${cy} a${rx} ${ry} 0 1 0 ${2 * rx} 0 a${rx} ${ry} 0 1 0 ${-2 * rx} 0`;
  const est = (x, y, r) => `M${x} ${y - r} v${2 * r} M${x - r} ${y} h${2 * r}`; // estrelinha em cruz
  const f = (cor, a = '2E') => cor + a; // preenchimento clarinho da mesma cor
  let n = 0;

  // t: [d, cor, largura?, preenchimento?]
  function desenho(vb, t, rotulo = '') {
    const id = 'giz' + (++n);
    let s = '';
    t.forEach(([d, cor, w = 5, fill], i) => {
      s += `<path d="${d}" pathLength="1" stroke="${cor}" stroke-width="${w}" fill="${fill || 'none'}" class="${fill ? 'tr pr' : 'tr'}" style="--d:${(i * .16).toFixed(2)}s"/>`;
    });
    return `<svg class="giz" viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${rotulo}">
      <defs><filter id="${id}" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${n % 7 + 2}"/><feDisplacementMap in="SourceGraphic" scale="2.6"/></filter></defs>
      <g filter="url(#${id})" fill="none" stroke-linecap="round" stroke-linejoin="round">${s}</g></svg>`;
  }

  // CSS do efeito (a página inclui uma vez): ILU.css
  const css = `.giz .tr{stroke-dasharray:1;stroke-dashoffset:0}
    .giz.anima .tr{stroke-dashoffset:1;animation:giz-desenha .7s ease-out forwards;animation-delay:var(--d)}
    .giz.anima .pr{fill-opacity:0;animation:giz-desenha .7s ease-out forwards,giz-pinta .6s ease-out forwards;animation-delay:var(--d),calc(var(--d) + .5s)}
    @keyframes giz-desenha{to{stroke-dashoffset:0}} @keyframes giz-pinta{to{fill-opacity:1}}
    @media (prefers-reduced-motion:reduce){.giz.anima .tr,.giz.anima .pr{animation:none;stroke-dashoffset:0;fill-opacity:1}}`;

  const ILU = {
    C, css,

    // capa: bandeirinhas, sol, arco-íris, duas crianças de mãos dadas com balões
    capa: () => desenho('0 0 360 230', [
      ['M10 206 C90 196 180 214 260 202 S340 200 352 206', C.verde, 5],
      ['M34 176 C40 104 130 100 140 170', C.ver, 6],
      ['M48 178 C54 122 122 118 128 172', C.ama, 6],
      ['M62 180 C68 140 112 138 116 176', C.azul, 6],
      [circ(318, 98, 22), C.ama, 5, f(C.ama, '40')],
      ['M318 64v-8 M318 132v8 M284 98h-8 M352 98h6 M294 74l-6-6 M342 74l6-6 M294 122l-6 6 M342 122l6 6', C.ama, 4],
      [circ(200, 128, 13), C.mar, 5, '#FFE3C866'],
      ['M200 141 V172 M200 172 L188 200 M200 172 L212 200 M200 150 L182 162 M200 150 L226 158', C.ros, 5],
      [circ(254, 124, 13), C.mar, 5, '#FFE3C866'],
      ['M254 137 V170 M254 170 L242 200 M254 170 L266 200 M254 146 L228 158 M254 146 L276 132', C.cel, 5],
      ['M195 126 h0.1 M205 126 h0.1 M195 133 q5 5 10 0 M249 122 h0.1 M259 122 h0.1 M249 129 q5 5 10 0', C.mar, 3.5],
      ['M188 116 q12 -14 24 0 M242 112 q12 -12 24 0', C.lar, 4],
      ['M276 132 C280 110 290 90 296 70', C.mar, 2],
      [elip(298, 56, 13, 16), C.ver, 4, f(C.ver, '44')],
      ['M182 162 C176 130 170 110 164 88', C.mar, 2],
      [elip(162, 74, 12, 15), C.rox, 4, f(C.rox, '44')],
      [est(24, 110, 7) + est(150, 100, 6) + est(340, 170, 6), C.ama, 3.5],
    ], 'Desenho de crianças de mãos dadas com balões, sol, arco-íris e bandeirinhas'),

    // 07/10 brinquedo não estruturado: caixa de papelão que vira casinha + rolinho + tampinhas + colher
    caixa: () => desenho('0 0 220 200', [
      ['M16 184 C70 178 150 190 206 182', C.verde, 4],
      ['M40 92 H140 V176 H40 Z', C.mar2, 5, '#D9A06455'],
      ['M40 92 L22 64 L112 64 L140 92', C.mar2, 5, '#E8B77E55'],
      ['M140 92 L160 66 L112 64', C.mar2, 5],
      ['M66 176 V140 H92 V176', C.ver, 4],
      ['M104 110 h22 v20 h-22 z M115 110 v20 M104 120 h22', C.azul, 4],
      ['M58 64 L90 36 L122 64', C.ver, 5],
      ['M156 176 V112 h24 v64 z', C.cel, 5, f(C.cel, '40')],
      [elip(168, 112, 12, 5), C.cel, 4],
      [circ(22, 170, 9) + circ(46, 180, 7), C.ros, 4, f(C.ros, '55')],
      [circ(198, 172, 8), C.ama, 4, f(C.ama, '66')],
      ['M190 150 L210 108', C.mar2, 6],
      [elip(212, 100, 7, 11), C.mar2, 4, '#C9955E66'],
      [est(34, 28, 7) + est(190, 36, 6), C.ama, 3.5],
    ], 'Desenho de caixa de papelão virando casinha, rolinho e tampinhas'),

    // 08/10 cineminha: balde de pipoca + claquete
    cinema: () => desenho('0 0 220 200', [
      ['M10 70 L84 48 L94 84 L20 106 Z', C.mar, 5, '#08307833'],
      ['M8 64 L82 42 M24 58 L34 74 M46 52 L56 68 M68 46 L78 62', C.mar, 4],
      ['M74 90 C60 74 76 56 92 66 C94 46 122 44 128 62 C138 46 164 54 160 74 C176 72 180 92 164 96', C.ama, 5, '#FFF3D0'],
      ['M78 96 H164 L152 186 H90 Z', C.ver, 5, '#FFFFFF'],
      ['M96 96 L104 186 M120 96 L121 186 M144 96 L138 186', C.ver, 8],
      [circ(98, 70, 5) + circ(130, 66, 5) + circ(150, 80, 4), C.ama, 3],
      [est(186, 36, 8) + est(200, 120, 6) + est(30, 150, 6), C.ama, 3.5],
    ], 'Desenho de balde de pipoca e claquete de cinema'),

    // 09/10 baile à fantasia: coroa + máscara + confete
    fantasia: () => desenho('0 0 220 200', [
      ['M62 70 L72 30 L94 56 L110 22 L126 56 L148 30 L158 70 Z', C.ama, 5, f(C.ama, '55')],
      [circ(72, 26, 5) + circ(110, 18, 5) + circ(148, 26, 5), C.ros, 4],
      ['M24 118 C22 90 64 90 84 100 C98 106 104 112 110 114 C116 112 122 106 136 100 C156 90 198 90 196 118 C194 152 150 156 128 138 C120 132 114 128 110 128 C106 128 100 132 92 138 C70 156 26 152 24 118 Z', C.rox, 5, f(C.rox, '44')],
      [elip(66, 120, 16, 11) + elip(154, 120, 16, 11), C.mar, 4, '#FFFFFF'],
      ['M196 110 C212 96 212 80 204 66', C.ros, 4],
      [circ(40, 176, 4) + circ(80, 186, 4) + circ(150, 184, 4) + circ(186, 172, 4), C.cel, 4],
      ['M60 164 l8 6 M120 170 l6 -8 M168 160 l8 4', C.ver, 4],
      [est(26, 40, 8) + est(196, 36, 7), C.ros, 3.5],
    ], 'Desenho de coroa e máscara de baile à fantasia'),

    // educação financeira: cofrinho
    cofrinho: () => desenho('0 0 220 200', [
      ['M16 186 C70 180 150 192 206 184', C.verde, 4],
      [circ(146, 30, 16), C.ama, 5, f(C.ama, '66')],
      ['M146 22 v16 M140 26 q6 -6 12 0 q-12 6 0 10 q6 4 12 -2', C.mar2, 3],
      [elip(108, 120, 72, 54), C.ros, 5, f(C.ros, '40')],
      ['M64 84 L56 58 L84 74', C.ros, 5, f(C.ros, '55')],
      ['M92 70 H128', C.mar, 6],
      [elip(182, 122, 14, 18), C.ros, 5, '#FFFFFF'],
      ['M178 116 h0.1 M178 128 h0.1 M146 102 h0.1', C.mar, 6],
      ['M60 168 V186 M88 172 V188 M128 172 V188 M156 168 V186', C.ros, 7],
      ['M36 112 c-16 -4 -14 -20 -2 -18 c8 2 4 12 -2 8', C.ros, 4],
      ['M136 138 q10 8 20 0', C.mar, 4],
    ], 'Desenho de cofrinho de porquinho com moeda'),

    // 14/10 culminância: ursinho + presente
    presente: () => desenho('0 0 220 200', [
      ['M12 186 C70 180 150 192 208 184', C.verde, 4],
      [circ(58, 50, 14) + circ(112, 50, 14), C.mar2, 5, '#D9A06466'],
      [circ(85, 82, 38), C.mar2, 5, '#D9A06466'],
      [elip(85, 98, 17, 12), C.mar2, 4, '#FFFFFF'],
      ['M72 74 h0.1 M98 74 h0.1 M85 94 h0.1', C.mar, 7],
      ['M78 104 q7 6 14 0', C.mar, 3.5],
      [elip(85, 156, 36, 28), C.mar2, 5, '#D9A06466'],
      ['M114 118 h82 v66 h-82 z', C.azul, 5, f(C.azul, '33')],
      ['M108 104 h94 v18 h-94 z', C.azul, 5, f(C.azul, '55')],
      ['M155 104 V184', C.ama, 8],
      ['M155 104 C132 78 124 102 155 104 C186 78 194 102 155 104', C.ama, 5],
      ['M22 30 c-10 -10 -24 6 -8 18 l10 8 l10 -8 c16 -12 2 -28 -8 -18', C.ver, 4, f(C.ver, '44')],
      [est(200, 50, 8) + est(26, 130, 6), C.ama, 3.5],
    ], 'Desenho de ursinho de pelúcia ao lado de um presente'),

    // 15/10 Viva Park: roda-gigante + escorregador
    parque: () => desenho('0 0 220 200', [
      ['M0 180 C60 160 130 186 220 170', C.verde, 5, f(C.verde, '33')],
      ['M44 176 L76 84 L108 176', C.mar, 5],
      [circ(76, 84, 50), C.azul, 5],
      ['M76 34 V134 M26 84 H126 M41 49 L111 119 M111 49 L41 119', C.azul, 3],
      [circ(76, 34, 7), C.ver, 4, f(C.ver, '66')], [circ(126, 84, 7), C.ama, 4, f(C.ama, '66')],
      [circ(76, 134, 7), C.ros, 4, f(C.ros, '66')], [circ(26, 84, 7), C.cel, 4, f(C.cel, '66')],
      [circ(111, 49, 6) + circ(41, 119, 6), C.lar, 4, f(C.lar, '66')],
      ['M144 174 V108 M176 108 V174 M144 128 H176 M144 150 H176', C.mar2, 5],
      ['M138 110 L160 84 L182 110 Z', C.ver, 5, f(C.ver, '44')],
      ['M176 116 C196 126 206 150 212 172', C.ama, 8],
      [est(190, 30, 8) + est(150, 50, 5), C.ama, 3.5],
    ], 'Desenho de roda-gigante e escorregador'),

    // fim: arco-íris com nuvens e corações
    arco: () => desenho('0 0 220 140', [
      ['M24 116 C28 20 192 20 196 116', C.ver, 8],
      ['M40 116 C44 42 176 42 180 116', C.ama, 8],
      ['M56 116 C60 62 160 62 164 116', C.verde, 8],
      ['M72 116 C76 82 144 82 148 116', C.azul, 8],
      ['M8 124 c-8 -16 12 -28 22 -18 c4 -16 28 -14 30 2 c12 -2 16 16 4 18 z', C.cel, 4, '#FFFFFF'],
      ['M160 124 c-8 -16 12 -28 22 -18 c4 -16 28 -14 30 2 c12 -2 16 16 4 18 z', C.cel, 4, '#FFFFFF'],
      ['M110 14 c-6 -8 -18 2 -8 12 l8 6 l8 -6 c10 -10 -2 -20 -8 -12', C.ros, 4, f(C.ros, '55')],
    ], 'Desenho de arco-íris entre nuvens'),

    sol: () => desenho('0 0 200 200', [
      [circ(100, 100, 48), C.ama, 6, f(C.ama, '40')],
      ['M100 34v-22 M100 166v22 M34 100h-22 M166 100h22 M54 54l-14-14 M146 54l14-14 M54 146l-14 14 M146 146l14 14', C.ama, 6],
      ['M84 92 h0.1 M116 92 h0.1', C.mar, 9],
      ['M80 112 q20 18 40 0', C.mar, 5],
      [circ(72, 110, 6) + circ(128, 110, 6), C.ros, 4, f(C.ros, '66')],
    ], 'Desenho de sol sorrindo'),

    nuvem: () => desenho('0 0 200 100', [
      ['M40 84 c-26 0 -28 -34 -4 -36 c0 -30 44 -34 52 -8 c10 -22 50 -16 48 12 c26 -4 34 30 10 32 z', C.cel, 4, '#FFFFFF'],
    ], ''),

    bandeirinhas(w = 1000, h = 70, qtd = 14) {
      const cores = [C.ver, C.ama, C.azul, C.verde, C.lar, C.rox, C.cel, C.ros];
      const y = x => 8 + Math.sin((x / w) * Math.PI) * (h * .3);
      const t = [[`M0 8 Q${w / 2} ${8 + h * .6} ${w} 8`, C.mar, 2.5]];
      const passo = w / qtd;
      for (let i = 0; i < qtd; i++) {
        const x0 = i * passo + 6, x1 = x0 + passo - 12, xm = (x0 + x1) / 2;
        t.push([`M${x0.toFixed(1)} ${y(x0).toFixed(1)} L${xm.toFixed(1)} ${(y(xm) + h * .55).toFixed(1)} L${x1.toFixed(1)} ${y(x1).toFixed(1)}`, cores[i % cores.length], 4, cores[i % cores.length] + '55']);
      }
      return desenho(`0 0 ${w} ${h}`, t, '');
    },

    coracao: (x, y, s, cor) => `<path transform="translate(${x} ${y}) scale(${s})" d="M0 6C-10-8-26 4-14 16L0 28 14 16C26 4 10-8 0 6Z" fill="${cor}"/>`,
  };
  window.ILU = ILU;
})();
