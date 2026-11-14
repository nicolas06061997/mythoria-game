// MYTHORIA — point d'entrée du jeu dans le navigateur.
// Écran de chargement : on charge vraiment les héros et le décor avant d'ouvrir le jeu.
import { startApp } from './ui/app.js';
import { initInstall, initUpdates } from './install.js';
import { preload, prop } from './three/assets.js';
import { THEMES } from './three/world.js';
import { HEROES, worldFor } from '../shared/content.js';
import { loadProfile } from './store.js';
import { warmPortraits } from './three/showcase.js';
import { PLAYABLE } from '../shared/content.js';

const APPV = document.documentElement.dataset.version || 'dev';
const L = window.__loader || { set() {}, stop() {} };
const wait = ms => new Promise(r => setTimeout(r, ms));
const t0 = performance.now();

async function load() {
  L.set(4, 'Ouverture des Failles…');
  try { await Promise.race([document.fonts.ready, wait(2500)]); } catch (e) {}
  L.set(10, 'Réveil des héros…');
  const ids = HEROES.map(c => c.id);
  await preload(ids, k => L.set(10 + k * 72, k < 0.5 ? 'Réveil des héros…' : 'Les héros enfilent leur armure…'));
  L.set(84, 'Construction du monde…');
  let key = 'aurore'; try { key = worldFor(loadProfile().trophies || 0).key; } catch (e) {}
  const T = THEMES[key] || THEMES.aurore, names = ['Temple_SecondAge_Level3', ...T.props.map(p => p[0])];
  let n = 0; await Promise.all(names.map(nm => prop(nm).catch(() => {}).then(() => L.set(84 + (++n / names.length) * 4))));
  L.set(88, 'Portraits des héros…');
  await warmPortraits(PLAYABLE.map(c => c.id), APPV, k => L.set(88 + k * 7));
}

initInstall();          // bouton « Installer le jeu » (comme les autres jeux)
initUpdates(APPV);      // mises à jour automatiques
// si le réseau est très lent, on ouvre quand même le jeu au bout de 30 s
Promise.race([load().catch(e => console.warn('chargement', e)), wait(30000)]).then(async () => {
  L.set(96, 'Prêt !');
  startApp(document.getElementById('app'), APPV);
  const rest = 3600 - performance.now(); if (rest > 0) await wait(rest); // laisser voir l'écran un instant
  L.set(100, 'C’est parti !'); await wait(450);
  L.stop();
  const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); setTimeout(() => sp.remove(), 650); }
});
