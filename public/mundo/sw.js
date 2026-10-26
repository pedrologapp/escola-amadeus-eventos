// O service worker do app Arboria (PWA, 26/10/2026). Só na versão publicada (/mundo).
//  - A página (index.html) vem sempre da rede quando há rede (assim cada publicação nova chega na próxima abertura); sem rede, a guardada.
//  - O resto (o código com nome de versão em assets/, modelos, texturas, vídeo, música) fica guardado na primeira vez e depois abre do tablet.
//  - Cada publicação troca a VERSAO (o build escreve a data aqui): o service worker novo assume sozinho e apaga o que era da versão anterior,
//    para o tablet não misturar modelos velhos com o código novo.
//  - Nada da API (/api) nem de outros endereços (o tempo real) passa por aqui.
const VERSAO = '202610261730', CACHE = 'arboria-' + VERSAO;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k.startsWith('arboria-') && k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', (e) => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || !u.pathname.startsWith(new URL('./', self.registration.scope).pathname) || u.pathname.includes('/api/')) return;
  if (r.mode === 'navigate' || u.pathname.endsWith('/') || u.pathname.endsWith('.html') || u.pathname.endsWith('sw.js')) {
    e.respondWith(fetch(r).then((res) => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then((k) => k.put(r, c)); } return res; }).catch(() => caches.match(r).then((x) => x || caches.match('./index.html'))));
    return;
  }
  if (r.headers.has('range')) return;   // o vídeo pede pedaços: deixa com o navegador
  e.respondWith(caches.open(CACHE).then(async (k) => {
    const x = await k.match(r); if (x) return x;
    const res = await fetch(r); if (res.ok && res.status === 200) k.put(r, res.clone()); return res;
  }));
});
