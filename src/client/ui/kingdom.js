// MYTHORIA — écran du Royaume (phase 4).
import { BUILDINGS, BUILD_ORDER, DECOS, DECO_SLOTS, buildCost, buildTime, speedupGems, produced, perHour, canBuild } from '../../shared/kingdom.js';
const affordable = (P, id) => { const K = P.kingdom, l = K.b[id] || 0; if (canBuild(K, id)) return false; const c = buildCost(id, l + 1); return P.gold >= c.gold && P.stone >= c.stone; };
import { startBuild, speedup, collectAll, buyDeco, finishJob, worldOf, maxHeroLevel } from '../store.js';
import { buildingPicture } from '../three/kingdomview.js';
import { KingdomPainted } from '../three/kingdompainted.js';
import { h, toast, sheet } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

let C, view = null, tick = null;
import { story, storyBtn } from './story.js';
export function initKingdom(ctx) { C = ctx; }
export function leaveKingdom() { if (view) { view.dispose(); view = null; } clearInterval(tick); }

const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return hh ? hh + ' h ' + String(mm).padStart(2, '0') : mm ? mm + ' min ' + String(ss).padStart(2, '0') : ss + ' s'; };
const resName = { gold: 'or', stone: 'pierre', crystals: 'cristaux' };
const resIc = { gold: () => icon('coin'), stone: () => h('span', { class: 'ic' }, '🪨'), crystals: () => icon('crystal') };

function effectText(id, lvl) {
  const P = C.P();
  if (id === 'chateau') return 'Niveau maximum des autres bâtiments : ' + lvl;
  if (BUILDINGS[id].prod) return '+' + perHour(P.kingdom, id) + ' ' + resName[BUILDINGS[id].prod] + ' / heure (stockage 8 h)';
  if (id === 'academie') return 'Héros jusqu’au niveau ' + maxHeroLevel(P);
  if (id === 'caserne') return '+' + 4 * lvl + ' % de vie pour tes héros (hors Arène)';
  if (id === 'tour') return 'Sanctuaire +' + 8 * lvl + ' % de dégâts (hors Arène)';
  if (id === 'temple') return 'Jauge d’Éveil +' + 5 * lvl + ' % plus rapide (hors Arène)';
  if (id === 'marche') return '+' + 5 * lvl + ' % d’or gagné en combat';
  return '';
}

export function kingdomScreen() {
  setTimeout(() => story('royaume'), 500);
  const P = C.P(); finishJob(P);
  const K = P.kingdom;
  const cv = h('canvas', { class: 'k-3d' }), labels = h('div', { class: 'k-labels' });
  const ready = () => ['mine', 'carriere', 'cristal'].reduce((n, id) => n + produced(K, id, Date.now()), 0);
  const collectBtn = h('button', { class: 'btn gold k-collect', onclick: () => {
    const got = collectAll(P); const parts = Object.entries(got).map(([k, v]) => '+' + v + ' ' + resName[k]);
    if (!parts.length) return toast('Rien à récolter pour l’instant');
    sfx('coin'); toast(parts.join(' · ')); C.render();
  } }, 'Récolter');
  const badges = () => Object.fromEntries(BUILD_ORDER.map(id => [id, affordable(P, id) ? ((K.b[id] || 0) ? 'up' : 'plus') : null]));
  const upd = () => {
    finishJob(P);
    collectBtn.textContent = 'Récolter (' + ready() + ')';
    if (view) view.setBadges(badges());
  };
  const best = BUILD_ORDER.find(id => affordable(P, id));
  const el = h('section', { class: 'kingdom' },
    h('div', { class: 'k-stage painted' }, cv, labels,
      h('div', { class: 'k-res' }, h('span', {}, icon('coin'), P.gold), h('span', {}, '🪨 ', P.stone), h('span', {}, icon('crystal'), P.crystals)),
      collectBtn,
      storyBtn('royaume', '📖')),
    K.job ? h('div', { class: 'panel k-job' }, h('b', {}, '🔨 ' + BUILDINGS[K.job.id].name + ' → niveau ' + K.job.to), h('small', { class: 'jt' }, ''),
      h('button', { class: 'btn small ghost', onclick: () => { const e = speedup(P); if (e) return toast(e, 'bad'); sfx('fuse'); C.render(); } }, 'Terminer : ', icon('gem'), speedupGems((K.job.end - Date.now()) / 1000))) : null,
    h('div', { class: 'panel k-panel' }, h('h3', {}, 'Bâtiments'),
      h('div', { class: 'k-cards' }, BUILD_ORDER.map(id => {
        const l = K.b[id] || 0, b = BUILDINGS[id], img = h('img', { class: 'kc-img', alt: '' }), ok = affordable(P, id), job = K.job && K.job.id === id;
        buildingPicture(id, Math.max(1, l)).then(u => { if (u) img.src = u; });
        return h('button', { class: 'kc' + (l ? '' : ' empty') + (ok ? ' ok' : ''), onclick: () => openBuilding(id) },
          h('div', { class: 'kc-txt' }, h('b', {}, b.name), h('small', {}, job ? '🔨 En construction' : l ? 'Niveau ' + l + ' / ' + b.max : 'À construire'), h('em', {}, l ? effectText(id, l) : b.desc)),
          img, ok ? h('span', { class: 'kc-up' }, l ? '⬆' : '+') : null);
      })),
      best ? h('button', { class: 'k-cta', onclick: () => openBuilding(best) }, h('small', {}, BUILDINGS[best].name + ' · ', icon('coin'), buildCost(best, (K.b[best] || 0) + 1).gold, ' · 🪨 ', buildCost(best, (K.b[best] || 0) + 1).stone), h('b', {}, (K.b[best] ? 'AMÉLIORER' : 'CONSTRUIRE') + ' LE ROYAUME')) : null),
    h('div', { class: 'panel' }, h('h3', {}, 'Décorations'), h('p', { class: 'muted' }, 'Pour embellir ton île (sans effet en combat).'),
      h('div', { class: 'deco-row' }, Array.from({ length: DECO_SLOTS }, (_, i) => h('button', { class: 'deco' + (K.deco[i] ? ' on' : ''), onclick: () => openDeco(i) }, K.deco[i] ? DECOS[K.deco[i]].name : '+')))),
    h('p', { class: 'muted center' }, 'Les bonus du Royaume comptent en Campagne, en Survie et en Défense, jamais en Arène : l’Arène reste équitable.'));
  requestAnimationFrame(() => {
    if (!cv.isConnected) return;
    view = new KingdomPainted(cv, labels, worldOf(P).key, id => openBuilding(id));
    view.sync(K).then(() => view && view.setBadges(badges()));
    upd();
    clearInterval(tick);
    tick = setInterval(() => { if (!cv.isConnected) return clearInterval(tick); const jobBefore = K.job; upd(); const jt = el.querySelector('.jt'); if (jt && K.job) jt.textContent = 'Fin dans ' + fmt((K.job.end - Date.now()) / 1000); if (jobBefore && !K.job) { sfx('fuse'); toast('Construction terminée !'); C.render(); } }, 1000);
  });
  return el;
}

function openBuilding(id) {
  sfx('click');
  const P = C.P(), K = P.kingdom, b = BUILDINGS[id], l = K.b[id] || 0, to = l + 1;
  const err = canBuild(K, id), cost = l < b.max ? buildCost(id, to) : null;
  const s = sheet(h('div', { class: 'k-sheet' },
    h('h3', {}, b.name + (l ? ' — niveau ' + l : '')),
    h('p', {}, b.desc),
    l ? h('p', { class: 'tip' }, effectText(id, l)) : null,
    cost ? h('div', { class: 'k-cost' }, h('b', {}, l ? 'Améliorer au niveau ' + to : 'Construire'),
      h('div', { class: 'rchips' }, h('span', { class: 'rchip' }, icon('coin'), cost.gold), h('span', { class: 'rchip' }, '🪨 ' + cost.stone), h('span', { class: 'rchip' }, '⏱ ' + fmt(buildTime(id, to)))),
      err ? h('p', { class: 'muted' }, err) : null,
      h('button', { class: 'btn big ' + (err ? 'ghost' : 'gold'), onclick: () => { const e = startBuild(P, id); if (e) return toast(e, 'bad'); sfx('deploy'); s.close(); C.render(); } }, l ? 'Améliorer' : 'Construire'))
      : h('p', { class: 'tip' }, 'Niveau maximum atteint !')));
}

function openDeco(i) {
  const P = C.P();
  const s = sheet(h('div', { class: 'k-sheet' }, h('h3', {}, 'Choisis une décoration'),
    Object.entries(DECOS).map(([id, d]) => h('button', { class: 'sp-row', onclick: () => { const e = buyDeco(P, i, id); if (e) return toast(e, 'bad'); sfx('coin'); s.close(); C.render(); } },
      h('div', {}, h('b', {}, d.name), h('small', {}, d.price + ' or'))))));
}
