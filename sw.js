// Service worker de MYTHORIA : jeu disponible hors ligne + mises à jour immédiates.
// La version vient de index.html (data-version), passée dans l'adresse : sw.js?v=…
const VERSION = new URL(self.location.href).searchParams.get('v') || 'dev';
const CACHE = 'mythoria-' + VERSION;
const FILES = ['./', './index.html', './styles.css', './manifest.webmanifest', './icons/icon.svg', './assets/loading/bg.webp', './assets/loading/fly.webp', './assets/arenas/aurore.webp', './assets/arenas/sylve.webp', './assets/ui/home-scene.webp', './assets/ui/mode-arena.webp', './assets/ui/mode-camp.webp', './assets/ui/mode-surv.webp', './assets/ui/mode-event.webp', './assets/ui/mode-hero.webp', './assets/ui/mode-tourney.webp', './assets/ui/mode-play.webp', './assets/ui/frame-tl.webp', './assets/ui/frame-tr.webp', './assets/ui/frame-x.webp',
  './vendor/three.module.min.js', './vendor/addons/loaders/GLTFLoader.js', './vendor/addons/utils/SkeletonUtils.js', './vendor/addons/utils/BufferGeometryUtils.js',
  './src/client/main.js', './src/client/install.js', './src/client/ui/app.js', './src/client/ui/modeart.js', './src/client/ui/dom.js', './src/client/ui/icons.js', './src/client/battle.js',
  './src/client/store.js', './src/client/audio.js', './src/client/three/assets.js', './src/client/three/procedural.js', './src/client/three/world.js',
  './src/client/three/fx.js', './src/client/three/battleview.js', './src/client/three/stage.js', './src/client/three/showcase.js', './src/client/three/look.js', './src/client/three/arena.js', './src/client/three/surroundings.js', './src/client/three/herofx.js',
  './vendor/addons/postprocessing/EffectComposer.js', './vendor/addons/postprocessing/RenderPass.js', './vendor/addons/postprocessing/UnrealBloomPass.js', './vendor/addons/postprocessing/ShaderPass.js', './vendor/addons/postprocessing/OutputPass.js', './vendor/addons/postprocessing/Pass.js', './vendor/addons/postprocessing/MaskPass.js',
  './vendor/addons/shaders/CopyShader.js', './vendor/addons/shaders/LuminosityHighPassShader.js', './vendor/addons/shaders/OutputShader.js',
  './src/shared/content.js', './src/shared/economy.js', './src/shared/kingdom.js', './src/shared/campaign.js',
  './src/client/ui/progress.js', './src/client/ui/art.js', './src/client/ui/kingdom.js', './src/client/ui/modes.js', './src/client/ui/story.js', './src/client/three/kingdomview.js', './src/client/three/kingdomlife.js', './src/client/three/kingdompainted.js', './src/client/three/creatures.js', './src/shared/items.js', './src/client/ui/itemart.js', './assets/kingdom/island-hd.webp', './assets/kingdom/b-academie-0.webp', './assets/kingdom/b-academie-1.webp', './assets/kingdom/b-academie-2.webp', './assets/kingdom/b-caserne-0.webp', './assets/kingdom/b-caserne-1.webp', './assets/kingdom/b-caserne-2.webp', './assets/kingdom/b-tour-0.webp', './assets/kingdom/b-tour-1.webp', './assets/kingdom/b-tour-2.webp', './assets/kingdom/b-temple-0.webp', './assets/kingdom/b-temple-1.webp', './assets/kingdom/b-temple-2.webp', './assets/kingdom/b-marche-0.webp', './assets/kingdom/b-marche-1.webp', './assets/kingdom/b-marche-2.webp', './assets/kingdom/b-cristal-0.webp', './assets/kingdom/b-cristal-1.webp', './assets/kingdom/b-cristal-2.webp', './assets/kingdom/b-autel-0.webp', './assets/kingdom/b-autel-1.webp', './assets/kingdom/b-autel-2.webp', './src/client/heromode.js', './src/shared/sim.js', './src/shared/ai.js', './src/shared/rng.js', './src/client/intro.js', './src/client/tuto.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('mythoria-') && k !== CACHE && k !== 'mythoria-fonts' && k !== 'mythoria-models').map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Réseau d'abord (dernière version), copie locale si pas de connexion.
function networkFirst(req) {
  return fetch(req, { cache: 'no-cache' }).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return r;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r =>
    r || (req.mode === 'navigate' ? caches.match('./index.html') : Response.error())));
}
function fonts(req) {
  return caches.open('mythoria-fonts').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })));
}
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') { e.respondWith(fonts(req)); return; }
  if (url.origin !== location.origin) return;
  if (url.pathname.endsWith('/version.json')) return;
  if (url.pathname.includes('/guardian/')) return; // l'appli MYTHORIA Guardian a son propre service worker
  // Modèles 3D : copie locale d'abord (ils ne changent presque jamais ; nouveau nom de fichier si besoin).
  if (url.pathname.includes('/assets/models/')) { e.respondWith(caches.open('mythoria-models').then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; })))); return; }
  e.respondWith(networkFirst(req));
});
