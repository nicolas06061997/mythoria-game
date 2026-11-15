// Ancienne adresse de MYTHORIA Guardian (déménagé vers …github.io/mythoria-guardian/) :
// ce service worker se retire tout seul et efface ses copies.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x.startsWith('guardian-')).map(x => caches.delete(x))))
    .then(() => self.registration.unregister())
    .then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url))));
});
