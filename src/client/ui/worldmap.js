// MYTHORIA — Carte des Failles (Lot 1C, 19/11) : les 6 îles flottantes dans le cosmos, reliées par un chemin d'étoiles.
// Remplace la liste verticale des mondes. L'île où tu te trouves porte ton emblème ; le chemin s'illumine jusqu'à la Gloire atteinte ;
// les îles pas encore conquises restent dans la brume. Toucher une île = sa fiche (héros, faction, s'entraîner ici).
// Tout est dessiné en SVG (net partout, aucun fichier image, hors ligne).
import { WORLDS, FACTIONS, UNLOCKS, HERO, RARITIES } from '../../shared/content.js';
import { THEMES } from '../three/world.js';
import { h, sheet } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';

const OUT = '#070b2c';
const poly = (pts, fill, op = 1) => `<path d="M${pts}z" fill="${fill}"${op < 1 ? ` opacity="${op}"` : ''} stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`;
function mix(a, b, k) {
  const p = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * k).toString(16).padStart(2, '0')).join('');
}

// Décor posé sur chaque île (coordonnées de la boîte 0 0 160 140 ; dessus de l'île vers y = 58)
const DECOR = {
  aurore: () => `
    ${poly('62 58V34H98V58', '#ece6da')}${poly('80 58V34H98V58', '#cfc6b4')}
    ${poly('56 58V26H66V58', '#f4efe4')}${poly('94 58V26H104V58', '#ddd5c4')}
    ${poly('54 27L61 12 68 27', '#3d63d8')}${poly('92 27L99 12 106 27', '#2e4fb8')}${poly('72 35L80 16 88 35', '#3d63d8')}
    <path d="M61 12V6M99 12V6M80 16V8" stroke="#e9c877" stroke-width="1.6"/><path d="M80 8l7 2-7 2z" fill="#e9c877"/>
    <rect x="76" y="46" width="8" height="12" rx="4" fill="#5a3a1a" stroke="${OUT}" stroke-width="1.2"/>
    <rect x="59" y="38" width="4" height="5" fill="#ffd36a"/><rect x="97" y="38" width="4" height="5" fill="#ffd36a"/>`,
  sylve: () => {
    const tree = (x, y, r, c) => `<rect x="${x - 2.5}" y="${y}" width="5" height="${r}" fill="#6a4524" stroke="${OUT}" stroke-width="1.2"/><circle cx="${x}" cy="${y - r * .3}" r="${r}" fill="${c}" stroke="${OUT}" stroke-width="1.6"/><circle cx="${x - r * .35}" cy="${y - r * .6}" r="${r * .4}" fill="#9be38a" opacity=".55"/>`;
    const mush = (x, y) => `<rect x="${x - 1.5}" y="${y - 6}" width="3" height="6" fill="#e8f4ff"/><path d="M${x - 6} ${y - 5}a6 5 0 0112 0z" fill="#5fe0c8" stroke="${OUT}" stroke-width="1.2"/><circle cx="${x - 2}" cy="${y - 8}" r="1" fill="#fff"/><circle cx="${x + 2}" cy="${y - 7}" r="1" fill="#fff"/>`;
    return tree(56, 44, 15, '#3f9a48') + tree(100, 40, 17, '#358a40') + tree(78, 30, 19, '#4aa952') + mush(68, 60) + mush(92, 61) + mush(118, 58);
  },
  arcane: () => `
    ${poly('70 58L74 20 80 8 86 20 90 58', '#a98cff')}${poly('80 8L86 20 90 58 80 58', '#7a5ce0')}
    ${poly('52 58L55 36 60 28 65 36 66 58', '#c4b0ff')}${poly('96 58L98 40 103 32 108 40 110 58', '#8f74f0')}
    <ellipse cx="80" cy="16" rx="22" ry="5" fill="none" stroke="#9ff0ff" stroke-width="1.6" opacity=".9"/>
    <path d="M60 14l3 3M100 12l-3 3M80 1v4" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="80" cy="30" r="3" fill="#fff" opacity=".9"/>`,
  braise: () => `
    ${poly('48 58L72 18H88L112 58', '#5e4036')}${poly('80 18H88L112 58H86', '#3e2a24')}
    <path d="M72 18Q80 26 88 18L84 34Q80 30 76 36z" fill="#ff7a2a" stroke="${OUT}" stroke-width="1.2"/>
    <path d="M78 34Q74 46 70 58M84 32Q88 44 92 58" stroke="#ffb03a" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    <circle cx="80" cy="10" r="6" fill="#6a5a58" opacity=".7"/><circle cx="86" cy="3" r="5" fill="#6a5a58" opacity=".5"/>
    <circle cx="74" cy="14" r="2" fill="#ffd36a"/><circle cx="90" cy="12" r="1.6" fill="#ffd36a"/>`,
  givre: () => `
    ${poly('46 58L66 22 84 58', '#d8e8f8')}${poly('66 22L84 58H68', '#a8c4e4')}${poly('66 22L71 31 66 34 61 31', '#ffffff')}
    ${poly('74 58L96 14 120 58', '#e8f2fc')}${poly('96 14L120 58H98', '#b4cceb')}${poly('96 14L102 26 96 30 90 26', '#ffffff')}
    <path d="M112 34l6 0M115 31v6M112.8 31.8l4.4 4.4M117.2 31.8l-4.4 4.4" stroke="#9ff0ff" stroke-width="1.4" stroke-linecap="round"/>`,
  ombre: () => `
    ${poly('70 58V24L80 6 90 24V58', '#3a2e4e')}${poly('80 6L90 24V58H80', '#271f36')}
    ${poly('52 58V40L58 30 64 40V58', '#443858')}${poly('96 58V36L103 26 110 36V58', '#2e2540')}
    <rect x="77" y="30" width="6" height="8" rx="3" fill="#ff3a4a"/><rect x="56" y="44" width="4" height="5" fill="#ff3a4a"/><rect x="101" y="42" width="4" height="5" fill="#ff3a4a"/>
    <path d="M40 54Q60 46 80 54T120 52" fill="none" stroke="#b46bff" stroke-width="3" opacity=".45" stroke-linecap="round"/>
    <circle cx="118" cy="14" r="7" fill="#ff5a5a" opacity=".85"/>`,
};

// Île flottante à facettes aux couleurs du monde + son décor
export function worldIsleSVG(key) {
  const T = THEMES[key] || THEMES.aurore, g = T.ground, r = T.rock, r2 = T.rock2;
  const top = g, top2 = mix(g, '#ffffff', 0.25), f1 = r, f2 = mix(r, r2, 0.5), f3 = r2, f4 = mix(r2, '#000000', 0.35);
  return `<svg viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="80" cy="60" rx="76" ry="22" fill="${T.skyBot}" opacity=".18"/>
${poly('8 60L40 48H120L152 62 118 74H42', top)}${poly('8 60L40 48H84L62 74H42', top2, 0.55)}
${poly('8 60L42 74 34 94 14 78', f2)}${poly('42 74H80L72 112 34 94', f1)}${poly('80 74H118L108 104 72 112', f2)}${poly('118 74L152 62 138 88 108 104', f3)}
${poly('34 94L72 112 66 132 48 112', f3)}${poly('72 112L108 104 92 126 66 132', f4)}
<path d="M8 60L40 48H120L152 62" fill="none" stroke="#fff" stroke-width="1.2" opacity=".35" stroke-linejoin="round"/>
${(DECOR[key] || DECOR.aurore)()}</svg>`;
}

// positions des îles sur la carte (x en %, de bas en haut)
const SPOTS = [[30, 0], [70, 1], [30, 2], [70, 3], [32, 4], [64, 5]];
const STEP = 200, PAD_T = 150, PAD_B = 130;

export function openWorldMap({ P, portraitImg, onTrain }) {
  sfx('click');
  const glory = P.trophies, cur = WORLDS.reduce((c, w) => glory >= w.trophies ? w.id : c, 0);
  const H = PAD_T + PAD_B + STEP * (WORLDS.length - 1);
  const pos = w => { const [x, k] = SPOTS[w.id]; return { x, y: H - PAD_B - k * STEP }; };
  // chemin d'étoiles : une courbe par segment ; lumière = part de la Gloire déjà atteinte vers l'île suivante
  const seg = WORLDS.slice(0, -1).map(w => {
    const a = pos(w), b = pos(WORLDS[w.id + 1]), my = (a.y + b.y) / 2;
    const d = `M${a.x} ${a.y} C${a.x} ${my} ${b.x} ${my} ${b.x} ${b.y}`;
    const next = WORLDS[w.id + 1], k = Math.max(0, Math.min(1, (glory - w.trophies) / (next.trophies - w.trophies)));
    return { d, k };
  });
  const svg = `<svg class="wm-path" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">
    ${seg.map(s => `<path d="${s.d}" class="wp-base" vector-effect="non-scaling-stroke"/>`).join('')}
    ${seg.map(s => s.k > 0 ? `<path d="${s.d}" pathLength="1" class="wp-lit" style="stroke-dasharray:${s.k} 1" vector-effect="non-scaling-stroke"/>` : '').join('')}
    ${seg.map(s => s.k > 0 ? `<path d="${s.d}" pathLength="1" class="wp-core" style="stroke-dasharray:${s.k} 1" vector-effect="non-scaling-stroke"/>` : '').join('')}</svg>`;
  const stars = Array.from({ length: 70 }, (_, i) => h('i', { class: 'wm-st', style: { left: (i * 37 % 100) + (i % 3) * .3 + '%', top: (i * 53 % 100) + '%', animationDelay: -(i % 9) * .5 + 's', width: (1 + i % 3) + 'px', height: (1 + i % 3) + 'px' } }));
  const isles = WORLDS.map(w => {
    const p = pos(w), open = glory >= w.trophies, here = w.id === cur, F = FACTIONS[w.fac];
    const art = h('span', { class: 'wm-art' }); art.innerHTML = worldIsleSVG(w.key);
    return h('button', { class: 'wm-isle' + (open ? ' open' : ' locked') + (here ? ' here' : ''), style: { left: p.x + '%', top: p.y + 'px', '--fc': F.color, '--d': (w.id * 0.7) + 's' }, onclick: () => worldSheet(w) },
      h('span', { class: 'wm-halo' }), art,
      here ? h('span', { class: 'wm-me' }, portraitImg(P.avatar, 'av-img')) : null,
      !open ? h('span', { class: 'wm-mist' }) : null,
      h('span', { class: 'wm-tag' }, h('small', {}, 'Monde ' + (w.id + 1)), h('b', {}, w.name),
        h('em', {}, open ? (here ? 'Tu es ici' : 'Conquis ✓') : [icon('n_star'), ' ' + w.trophies + ' Gloire'])));
  });
  const scroller = h('div', { class: 'wm-scroll' }, h('div', { class: 'wm-map', style: { height: H + 'px' } }, stars, h('i', { class: 'wm-neb n1' }), h('i', { class: 'wm-neb n2' }), h('i', { class: 'wm-neb n3' }), svgEl(svg), isles));
  const next = WORLDS[cur + 1];
  const page = h('div', { class: 'wmap' },
    h('div', { class: 'wm-head' }, h('div', {}, h('h2', {}, 'Carte des Failles'), h('small', {}, next ? glory + ' / ' + next.trophies + ' Gloire → ' + next.name : 'Les six mondes sont conquis !')),
      h('button', { class: 'hd-close', onclick: () => close(), 'aria-label': 'Fermer' }, icon('close'))),
    scroller);
  const close = () => { page.classList.add('off'); setTimeout(() => page.remove(), 250); };
  document.body.append(page);
  // l'île actuelle au milieu de l'écran
  requestAnimationFrame(() => { scroller.scrollTop = Math.max(0, pos(WORLDS[cur]).y - scroller.clientHeight * 0.55); });

  function worldSheet(w) {
    sfx('click');
    const open = glory >= w.trophies, F = FACTIONS[w.fac];
    const art = h('span', { class: 'wm-art big' }); art.innerHTML = worldIsleSVG(w.key);
    const s = sheet(h('div', { class: 'wm-sheet', style: { '--fc': F.color } }, art,
      h('small', { class: 'muted' }, 'Monde ' + (w.id + 1) + ' / ' + WORLDS.length), h('h3', {}, w.name), h('p', { class: 'muted' }, w.tag),
      h('div', { class: 'w-meta' }, h('span', { class: 'chip on', style: { '--fc': F.color } }, F.name),
        open ? h('span', { class: 'chip on', style: { '--fc': '#7dff9a' } }, w.id === cur ? 'Tu es ici' : 'Conquis') : h('span', { class: 'chip' }, icon('n_star'), ' ' + w.trophies + ' Gloire')),
      h('h4', {}, open ? 'Héros de ce monde' : 'Héros à libérer'),
      h('div', { class: 'mini-row' }, (UNLOCKS[w.id] || []).map(id => h('div', { class: 'mini sm', style: { '--rc': RARITIES[HERO[id].rar].color } }, portraitImg(id)))),
      open ? h('button', { class: 'btn big gold', onclick: () => { s.close(); close(); onTrain(w); } }, 'S’entraîner ici')
        : h('p', { class: 'tip' }, 'Encore ' + (w.trophies - glory) + ' Gloire : gagne en Arène pour conquérir cette île.')));
  }
}
function svgEl(svg) { const e = h('div', { class: 'wm-svg' }); e.innerHTML = svg; return e; }
