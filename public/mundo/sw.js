// (25/11/2026, Pedro: "pode tirar do ar esse mundo") o Mundo do Arboria está em pausa.
// Este service worker substitui o do jogo: apaga tudo o que estava guardado nos tablets, se desliga e recarrega as abas na página de pausa.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: 'window' })) c.navigate(c.url);
  })());
});
