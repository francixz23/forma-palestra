// Cache dei soli file dell'app. NON contiene i dati personali (IndexedDB).
const CACHE = 'forma-app-shell-v1-2';
const ASSETS = [
  './','./index.html','./styles.css','./app.js','./db.js','./planner.js',
  './manifest.webmanifest','./ai_bridge.js','./features.js','./catalog.js','./icons/icon-192.png','./icons/icon-512.png',
  './icons/icon-maskable-512.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('forma-app-shell-')&&k!==CACHE).map(k=>caches.delete(k)))),
    self.clients.claim()
  ]));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if(request.method!=='GET' || url.origin!==self.location.origin) return;
  event.respondWith((async () => {
    const cached=await caches.match(request);
    if(cached) return cached;
    try {
      const response=await fetch(request);
      if(response.ok) {
        const cache=await caches.open(CACHE);
        cache.put(request,response.clone());
      }
      return response;
    } catch(error) {
      if(request.mode==='navigate') return (await caches.match('./index.html')) || Response.error();
      return Response.error();
    }
  })());
});
