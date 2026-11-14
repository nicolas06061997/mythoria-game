// MYTHORIA — installer le jeu comme une vraie appli + mises à jour automatiques
// (même fonctionnement que les autres jeux : bouton vert « Installer », installation en un appui
// quand Chrome le permet, sinon explications selon le navigateur ; nouvelle version = sauvegarde + rechargement).
import { h, sheet, toast } from './ui/dom.js';

let DIP = null; // l'invitation d'installation de Chrome
export const isApp = () => matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || navigator.standalone === true;

function browser() {
  const u = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(u) || (/Macintosh/.test(u) && 'ontouchend' in document)) return 'ios';
  if (/SamsungBrowser/.test(u)) return 'samsung';
  if (/HuaweiBrowser|HMSCore/.test(u)) return 'huawei';
  if (/MiuiBrowser|XiaoMi/.test(u)) return 'mi';
  if (/Firefox|FxiOS/.test(u)) return 'firefox';
  if (/OPR\/|Opera/.test(u)) return 'opera';
  if (/EdgA|Edg\//.test(u)) return 'edge';
  if (/Chrome/.test(u)) return 'chrome';
  return 'autre';
}
const BNAME = { ios: 'Safari', samsung: 'Samsung Internet', huawei: 'le navigateur Huawei', mi: 'le navigateur Xiaomi', firefox: 'Firefox', opera: 'Opera', edge: 'Edge', chrome: 'Chrome', autre: 'ton navigateur' };
const BSTEPS = {
  ios: ['Appuie sur Partager ⬆️ en bas de l’écran.', 'Choisis « Sur l’écran d’accueil ».', 'Appuie sur Ajouter.'],
  samsung: ['Appuie sur l’icône ⬇️ Installer dans la barre d’adresse (si elle est là).', 'Sinon : ☰ Menu → « Ajouter la page à » → « Écran d’accueil ».'],
  firefox: ['Appuie sur ⋮ (le menu).', 'Choisis « Installer » ou « Ajouter à l’écran d’accueil ».'],
  opera: ['Appuie sur ⋮.', 'Choisis « Ajouter à… » → « Écran d’accueil ».'],
  edge: ['Appuie sur ⋯ en bas.', 'Choisis « Ajouter au téléphone ».'],
  chrome: ['Appuie sur ⋮ en haut à droite.', 'Choisis « Installer l’application » (ou « Ajouter à l’écran d’accueil »).', 'Si tu ne le vois pas encore, joue une minute puis réessaie : Chrome le propose après un petit moment.'],
  huawei: ['Appuie sur ☰ Menu.', 'Choisis « Ajouter à l’écran d’accueil ».'],
  mi: ['Appuie sur ☰ Menu.', 'Choisis « Ajouter à l’écran d’accueil ».'],
  autre: ['Ouvre le menu du navigateur (☰ ou ⋮).', 'Choisis « Installer » ou « Ajouter à l’écran d’accueil ».'],
};

let banner;
function showInst(force) {
  if (isApp()) return;
  let no = 0; try { no = +sessionStorage.getItem('myt_noinst') || 0; } catch (e) {}
  if (no && !force) return;
  banner.querySelector('span').textContent = DIP ? '📲 Installer le jeu (1 appui)' : '📲 Installer le jeu';
  banner.classList.add('on');
}
function promptDip() {
  if (!DIP) return false;
  const d = DIP; d.prompt();
  d.userChoice.then(c => { if (c.outcome === 'accepted') banner.classList.remove('on'); }).catch(() => {});
  DIP = null; return true;
}
export function doInstall() {
  if (promptDip()) return;
  const b = browser(), android = /Android/i.test(navigator.userAgent);
  const s = sheet(h('div', { class: 'settings install' },
    h('h3', {}, '📲 Installer MYTHORIA'),
    h('p', {}, 'Tu utilises ', h('b', {}, BNAME[b]), '.', b === 'chrome' ? '' : ' Ce navigateur ne permet pas d’installer en un seul appui, voici comment faire :'),
    h('ol', { class: 'steps' }, BSTEPS[b].map(t => h('li', {}, t))),
    android && b !== 'chrome' ? [h('a', { class: 'btn big gold', href: 'intent://' + location.host + location.pathname + '#Intent;scheme=https;package=com.android.chrome;end' }, '🌐 Ouvrir le jeu dans Chrome'),
      h('p', { class: 'muted' }, 'Dans Chrome, le bouton 📲 installe le jeu en un seul appui.')] : null,
    DIP ? h('button', { class: 'btn big gold', onclick: () => { s.close(); promptDip(); } }, '📲 Installer maintenant') : null,
    h('p', { class: 'muted' }, 'Une fois installé, MYTHORIA s’ouvre en plein écran depuis ton écran d’accueil, comme tes autres applis, et se met à jour tout seul.'),
    h('button', { class: 'btn big ghost', onclick: () => s.close() }, 'OK')));
}

export function initInstall() {
  banner = h('div', { id: 'inst' }, h('span', { onclick: doInstall }, '📲 Installer le jeu'),
    h('button', { 'aria-label': 'Fermer', onclick: () => { banner.classList.remove('on'); try { sessionStorage.setItem('myt_noinst', '1'); } catch (e) {} } }, '✕'));
  document.body.append(banner);
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); DIP = e; showInst(true); });
  addEventListener('appinstalled', () => { banner.classList.remove('on'); DIP = null; toast('📲 Jeu installé ! Il est sur ton écran d’accueil.'); });
  setTimeout(() => showInst(), 2500);
}

// ---------- Mises à jour automatiques ----------
let SWR = null, UPD = null, APPV = 'dev';
const busy = () => document.body.classList.contains('in-battle'); // jamais pendant un combat
function chkUpd(man) {
  fetch('version.json?' + Date.now(), { cache: 'no-store' }).then(r => (r.ok ? r.json() : null)).then(j => {
    if (!j || !j.v || j.v === APPV) { if (man) toast('Le jeu est à jour ✓'); return; }
    UPD = j; try { SWR && SWR.update(); } catch (e) {}
    tryUpd();
  }).catch(() => { if (man) toast('Pas de connexion'); });
}
function tryUpd() {
  if (!UPD) return;
  let done = ''; try { done = sessionStorage.getItem('myt_upd') || ''; } catch (e) {}
  if (done === UPD.v) { // déjà rechargé une fois pour cette version : on laisse le bouton de secours
    const bar = document.getElementById('upd'); bar.querySelector('small').textContent = UPD.notes || ''; bar.classList.add('on'); return;
  }
  if (busy()) return;
  try { sessionStorage.setItem('myt_upd', UPD.v); } catch (e) {}
  toast('🔄 Mise à jour du jeu… ' + (UPD.notes || ''));
  UPD = null;
  setTimeout(() => location.reload(), 1400);
}
export function initUpdates(version) {
  APPV = version;
  window.__checkUpdate = chkUpd;
  document.getElementById('updBtn').addEventListener('click', () => { try { SWR && SWR.update(); } catch (e) {} setTimeout(() => location.reload(), 300); });
  if ('serviceWorker' in navigator) addEventListener('load', () => { navigator.serviceWorker.register('sw.js?v=' + version).then(r => { SWR = r; }).catch(() => {}); });
  setInterval(() => chkUpd(false), 3 * 60e3);
  setTimeout(() => chkUpd(false), 1500);
  setInterval(tryUpd, 2000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) chkUpd(false); });
}
