/* Motor das apresentações. Controles:
   → ↓ espaço PageDown clique: avança (primeiro os passos da tela, depois a próxima)
   ← ↑ PageUp: volta · Home: início · End: fim · F: tela cheia · H: esconde barra e dica
   ?shot=N&at=K mostra só a tela N no passo K, sem animação (para conferir em imagem). */
(() => {
  const q = new URLSearchParams(location.search);
  const shot = q.get('shot'), atParam = q.get('at');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- desenhos em traço (todos no quadro 48x44) ----------
  const ICONS = {
    notebook: '<rect x="9" y="8" width="30" height="20" rx="2"/><path d="M4 33h40l-3 4H7z"/><path class="c2" d="M15 22l5-5 4 4 7-7"/>',
    rede: '<circle cx="24" cy="8" r="3.5"/><circle cx="8" cy="30" r="3.5"/><circle cx="40" cy="30" r="3.5"/><circle class="c2" cx="24" cy="24" r="4"/><path d="M24 11.5v8.5M11 28l9.5-3M37 28l-9.5-3M11.5 31.5l9-.5"/>',
    engrenagem: '<circle cx="24" cy="22" r="7"/><path d="M24 6v5M24 33v5M8 22h5M35 22h5M12.7 10.7l3.5 3.5M31.8 29.8l3.5 3.5M12.7 33.3l3.5-3.5M31.8 14.2l3.5-3.5"/><circle class="c2" cx="24" cy="22" r="2"/>',
    livro: '<path d="M24 11c-5-3-11-3-17-1v24c6-2 12-2 17 1 5-3 11-3 17-1V10c-6-2-12-2-17 1z"/><path class="c2" d="M24 11v24"/>',
    lei: '<path d="M12 4h18l7 7v29H12z"/><path d="M30 4v7h7"/><path class="c2" d="M17 18h14M17 24h14M17 30h9"/>',
    simulador: '<rect x="5" y="6" width="38" height="24" rx="2"/><path d="M18 36h12M24 30v6"/><path class="c2" d="M14 23a10 10 0 0 1 20 0"/><path d="M24 23l5-6"/>',
    vr: '<path d="M6 16c0-3 2-5 5-5h26c3 0 5 2 5 5v8c0 3-2 5-5 5h-7l-3-4h-6l-3 4h-7c-3 0-5-2-5-5z"/><circle class="c2" cx="15" cy="20" r="3"/><circle class="c2" cx="33" cy="20" r="3"/>',
    nuvem: '<path d="M14 32h21a8 8 0 0 0 0-16 11 11 0 0 0-21-2 8 8 0 0 0 0 18z"/><path class="c2" d="M20 26l4-4 4 4M24 22v9"/>',
    pessoas: '<circle cx="24" cy="12" r="5"/><path d="M14 36c0-7 4-11 10-11s10 4 10 11"/><circle class="c2" cx="9" cy="17" r="3.5"/><circle class="c2" cx="39" cy="17" r="3.5"/><path class="c2" d="M3 33c0-5 2-8 6-8M45 33c0-5-2-8-6-8"/>',
    lapis: '<path d="M30 7l8 8-20 20H10v-8z"/><path d="M26 11l8 8"/><path class="c2" d="M6 40h36"/>',
    video: '<rect x="4" y="8" width="40" height="28" rx="3"/><path class="c2" d="M20 16v12l10-6z"/>',
    escudo: '<path d="M24 4l16 6v11c0 10-7 17-16 20C15 38 8 31 8 21V10z"/><path class="c2" d="M17 22l5 5 9-10"/>',
    balanca: '<path d="M24 6v32M14 40h20M10 12h28"/><path class="c2" d="M10 12l-6 12h12zM38 12l-6 12h12z"/>',
    lupa: '<circle cx="20" cy="19" r="11"/><path d="M28 27l12 12"/><path class="c2" d="M15 19h10M20 14v10"/>',
    escola: '<path d="M6 20L24 8l18 12"/><path d="M10 18v20h28V18"/><path class="c2" d="M20 38v-9h8v9"/><path d="M24 8V3l6 2-6 2"/>',
    capelo: '<path d="M4 17l20-9 20 9-20 9z"/><path d="M12 21v9c4 4 20 4 24 0v-9"/><path class="c2" d="M42 18v11"/>',
    lampada: '<path d="M17 28a11 11 0 1 1 14 0v5H17z"/><path d="M19 37h10M21 41h6"/><path class="c2" d="M24 14v8M21 19l3 3 3-3"/>',
    grafico: '<path d="M6 6v34h36"/><path class="c2" d="M12 30l8-9 7 6 11-14"/><circle cx="38" cy="13" r="2"/>',
    wifi: '<path d="M6 17a26 26 0 0 1 36 0M11 23a18 18 0 0 1 26 0M16 29a10 10 0 0 1 16 0"/><circle class="c2" cx="24" cy="35" r="2.5"/>',
    maos: '<path d="M6 30l8-8c2-2 5-2 7 0l3 3 3-3c2-2 5-2 7 0l8 8"/><path class="c2" d="M14 30l10 9 10-9"/><circle cx="24" cy="10" r="4"/>',
    alvo: '<circle cx="24" cy="22" r="16"/><circle cx="24" cy="22" r="9"/><circle class="c2" cx="24" cy="22" r="2.5"/><path d="M24 22l14-14M34 8h4v4"/>',
    pergunta: '<circle cx="24" cy="22" r="17"/><path class="c2" d="M18 17a6 6 0 1 1 8 6c-2 1-2 2-2 4"/><circle cx="24" cy="32" r="1"/>',
    fabrica: '<path d="M4 40V20l10 6v-6l10 6v-6l10 6V8h8v32z"/><path class="c2" d="M10 34h4M20 34h4M30 34h4"/>',
    robo: '<rect x="10" y="12" width="28" height="22" rx="4"/><path d="M24 12V6"/><circle cx="24" cy="5" r="2"/><circle class="c2" cx="18" cy="22" r="2.5"/><circle class="c2" cx="30" cy="22" r="2.5"/><path d="M18 29h12M6 20v8M42 20v8"/>',
    celular: '<rect x="14" y="4" width="20" height="36" rx="3"/><path d="M21 35h6"/><path class="c2" d="M18 12h12M18 17h12M18 22h7"/>',
    ciclo: '<path d="M38 18a15 15 0 0 0-27-5M10 26a15 15 0 0 0 27 5"/><path class="c2" d="M11 5v8h8M37 39v-8h-8"/>',
    curriculo: '<rect x="8" y="5" width="32" height="36" rx="2"/><path d="M15 5V2h18v3"/><path class="c2" d="M14 15h20M14 22h20M14 29h13"/><circle cx="33" cy="32" r="3"/>',
    coracao: '<path d="M24 38S7 28 7 17a8.5 8.5 0 0 1 17-2 8.5 8.5 0 0 1 17 2c0 11-17 21-17 21z"/>',
    seta: '<path d="M4 22h36"/><path class="c2" d="M32 14l8 8-8 8"/>'
  };
  document.querySelectorAll('svg[data-icon]').forEach(sv => {
    sv.setAttribute('viewBox', '0 0 48 44'); sv.setAttribute('aria-hidden', 'true'); sv.classList.add('ic');
    sv.innerHTML = ICONS[sv.dataset.icon] || '';
    sv.querySelectorAll('rect, path, circle').forEach((el, i) => { el.setAttribute('pathLength', '1'); el.classList.add('draw'); el.style.setProperty('--d', `calc(var(--dd, 0s) + ${i * 0.12}s)`); });
  });

  // ---------- palavras que sobem ----------
  document.querySelectorAll('[data-split]').forEach(root => {
    let n = 0;
    const walk = node => [...node.childNodes].forEach(ch => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.textContent = part; inner.style.setProperty('--i', n++);
          w.appendChild(inner); frag.appendChild(w);
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && !ch.matches('svg')) walk(ch);
    });
    walk(root);
  });

  // ---------- telas e passos ----------
  let secs = [...document.querySelectorAll('.s')];
  if (shot !== null) {
    secs.forEach((s, j) => { if (j !== +shot) s.remove(); });
    secs = [secs[+shot]];
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation:none!important}#hint,#prog{display:none}';
    document.head.appendChild(st);
  }
  const steps = s => [...s.querySelectorAll('.r')];
  secs.forEach(s => { s.max = Math.max(0, ...steps(s).map(r => +r.dataset.step || 0)); s.at = 0; });

  function apply(s, k) {
    s.at = k; s.dataset.at = k;
    steps(s).forEach(r => {
      const a = +r.dataset.step || 0, u = r.dataset.until;
      r.classList.toggle('in', a <= k && (u === undefined || k <= +u));
      // "apaga": itens anteriores ficam mais fracos quando o foco anda (data-foco na tela)
      if (s.hasAttribute('data-foco')) r.classList.toggle('apaga', r.classList.contains('dim') && a < k);
    });
    const total = secs.length;
    document.getElementById('prog').style.width = `${((secs.indexOf(s) + (s.max ? k / s.max : 1)) / total) * 100}%`;
  }

  // bolinhas: uma por tela
  const dots = document.createElement('nav'); dots.id = 'dots';
  if (shot === null) {
    secs.forEach((s, i) => { const b = document.createElement('button'); b.title = 'Tela ' + (i + 1); b.addEventListener('click', e => { e.stopPropagation(); go(i); }); dots.appendChild(b); });
    document.body.appendChild(dots);
  }
  let cur = -1;
  function go(i, back = false) {
    if (i < 0 || i >= secs.length) return;
    const old = secs[cur];
    if (old && old !== secs[i]) apply(old, 0);
    cur = i;
    const s = secs[i];
    s.scrollIntoView({ behavior: reduced || shot !== null ? 'auto' : 'smooth' });
    const start = shot !== null ? (atParam !== null ? +atParam : s.max) : back ? s.max : 0;
    setTimeout(() => apply(s, start), shot !== null ? 0 : 60);
    location.hash = `t${i + 1}`;
    [...dots.children].forEach((d, n) => d.classList.toggle("on", n === i));
  }
  const next = () => { const s = secs[cur]; if (s.at < s.max) apply(s, s.at + 1); else go(cur + 1); };
  const prev = () => { const s = secs[cur]; if (s.at > 0) apply(s, s.at - 1); else go(cur - 1, true); };

  addEventListener('keydown', e => {
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); next(); }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); prev(); }
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(secs.length - 1);
    else if (e.key === 'f' || e.key === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
    else if (e.key === 'h' || e.key === 'H') document.body.classList.toggle('limpo');
  });
  addEventListener('click', e => { if (!e.target.closest('a,button')) next(); });
  // roda do mouse: um passo por gesto
  let trava = 0;
  addEventListener('wheel', e => { e.preventDefault(); const t = Date.now(); if (t - trava < 650) return; trava = t; e.deltaY > 0 ? next() : prev(); }, { passive: false });
  // cursor some parado
  let idle; addEventListener('mousemove', () => { document.body.classList.remove('idle'); clearTimeout(idle); idle = setTimeout(() => document.body.classList.add('idle'), 2500); });

  // ---------- poeira laranja no fundo ----------
  const cv = document.querySelector('#bg canvas');
  if (cv && shot === null && !reduced) {
    const ctx = cv.getContext('2d');
    const P = Array.from({ length: 46 }, () => ({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 1.8, v: .00006 + Math.random() * .00018, a: Math.random() * 6 }));
    const tam = () => { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; };
    tam(); addEventListener('resize', tam);
    (function loop(t) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      P.forEach(p => {
        p.y -= p.v; if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        const x = (p.x + Math.sin(t / 4000 + p.a) * .01) * cv.width, y = p.y * cv.height;
        ctx.beginPath(); ctx.arc(x, y, p.r * devicePixelRatio, 0, 7);
        ctx.fillStyle = `rgba(244,160,106,${.25 + .25 * Math.sin(t / 900 + p.a)})`; ctx.fill();
      });
      requestAnimationFrame(loop);
    })(0);
  }

  // ?teste: anda por todos os passos de todas as telas e escreve o resultado no título
  if (q.get('teste') !== null) {
    addEventListener('error', e => { document.title = `ERRO ${e.message}`; });
    document.fonts.ready.then(() => {
      go(0);
      let cliques = 0;
      try {
        for (let i = 0; i < 2000 && !(cur === secs.length - 1 && secs[cur].at === secs[cur].max); i++) { next(); cliques++; }
        const passos = secs.reduce((n, s) => n + s.max, 0);
        document.title = `OK telas=${secs.length} passos=${passos} cliques=${cliques} fim=${cur + 1}`;
      } catch (e) { document.title = `ERRO ${e.message}`; }
    });
    return;
  }

  const inicio = shot !== null ? 0 : Math.max(0, (parseInt(location.hash.replace('#t', ''), 10) || 1) - 1);
  document.fonts.ready.then(() => go(Math.min(inicio, secs.length - 1)));
})();
