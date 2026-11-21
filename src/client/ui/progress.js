// MYTHORIA — écrans de progression : boutique, Éclats de Faille et Autel, jauge de conquête, missions, connexion, amélioration, apparences.
import { HERO, RARITIES, FACTIONS, SPELL } from '../../shared/content.js';
import { SKINS, ECLATS, ECLAT_ORDER, CONQUEST_MAX, CONQUEST_CYCLE, purifyPerDay, autelBonus, MAX_LEVEL } from '../../shared/economy.js';
import { saveProfile, owned, heroLevel, canUpgrade, upgradeHero, purify, purifyLeft, purifyMax, autelLevel, eclatCounts, conquestReady, claimConquest, shopOffers, buy, skinsFor, missionsReady, claimMission, claimLogin, maxHeroLevel } from '../store.js';
import { h, toast, sheet } from './dom.js';
import { icon } from './icons.js';
import { sfx } from '../audio.js';
import { sparkSVG, eclatSVG, relicSVG } from './art.js';

let C; // contexte : { P(), render(), portraitImg(id) }
export function initProgress(ctx) { C = ctx; }

// Éclat de Faille dessiné en SVG (net partout) ; la couleur suit la sorte d'Éclat
export function eclatIcon(type, cls = '') {
  const T = ECLATS[type] || ECLATS.brut;
  const s = h('span', { class: 'eclat-ic ' + cls, style: { '--ec': T.color, '--eg': T.glow } }); s.innerHTML = eclatSVG(T.color, T.glow);
  return s;
}
function relicIcon(cls = '') { const s = h('span', { class: 'relic-ic ' + cls }); s.innerHTML = relicSVG(); return s; }
const fmt = sec => { sec = Math.max(0, Math.ceil(sec)); const hh = Math.floor(sec / 3600), mm = Math.floor(sec % 3600 / 60), ss = sec % 60; return hh ? hh + ' h ' + String(mm).padStart(2, '0') : mm ? mm + ' min ' + String(ss).padStart(2, '0') : ss + ' s'; };

function rewardChips(r) {
  const out = [];
  if (r.gold) out.push(h('span', { class: 'rchip' }, icon('coin'), '+' + r.gold));
  if (r.gems) out.push(h('span', { class: 'rchip' }, icon('gem'), '+' + r.gems));
  if (r.crystals) out.push(h('span', { class: 'rchip' }, icon('crystal'), '+' + r.crystals));
  if (r.stone) out.push(h('span', { class: 'rchip' }, '🪨 +' + r.stone));
  if (r.eclat && ECLATS[r.eclat]) out.push(h('span', { class: 'rchip' }, eclatIcon(r.eclat, 'xs'), ECLATS[r.eclat].name));
  return out;
}

// ---------- Conquête et Autel (sur l'accueil, à la place des coffres) ----------
export function conquestRow() {
  const P = C.P(), pts = P.conquest.pts, full = conquestReady(P), k = Math.min(1, pts / CONQUEST_MAX);
  const next = ECLATS[CONQUEST_CYCLE[P.conquest.n % CONQUEST_CYCLE.length]];
  const R = 46, L = 2 * Math.PI * R;
  const ring = h('span', { class: 'cq-ring' }); ring.innerHTML = `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${R}" class="bg"/><circle cx="50" cy="50" r="${R}" class="fg" style="stroke-dasharray:${L};stroke-dashoffset:${L * (1 - k)}"/></svg>`;
  const n = P.eclats.length, left = purifyLeft(P), counts = eclatCounts(P);
  const best = ECLAT_ORDER.slice().reverse().find(t => counts[t]) || 'brut';
  const row = h('div', { class: 'conq' },
    h('button', { class: 'cq-tile cq-conquest' + (full ? ' ready' : ''), onclick: () => full ? claimRelic() : explainConquest() },
      h('span', { class: 'cq-med' }, ring, relicIcon()),
      h('span', { class: 'cq-txt' }, h('small', {}, 'Conquête'), h('b', {}, full ? 'RELIQUE !' : pts + ' / ' + CONQUEST_MAX), h('em', {}, full ? 'Touche pour la prendre' : 'Relique : Éclat ' + next.name.replace('Éclat ', '')))),
    h('button', { class: 'cq-tile cq-autel' + (n && left ? ' ready' : ''), onclick: openAutel },
      h('span', { class: 'cq-ec' }, n ? eclatIcon(best) : eclatIcon('brut', 'ghost'), n ? h('i', { class: 'cq-n' }, n) : null),
      h('span', { class: 'cq-txt' }, h('small', {}, 'Autel'), h('b', {}, n ? (n > 1 ? n + ' Éclats' : '1 Éclat') : 'Aucun Éclat'), h('em', {}, n ? (left ? 'Purifier · ' + left + ' / ' + purifyMax(P) : 'Revient demain') : 'Gagne en Arène'))));
  row.append(conqLife());
  return row;
}
// Décor vivant : étoiles qui scintillent au-dessus, poussières dorées qui montent
const CQ_STARS = [[25, 3, 16], [51, 9, 13], [65, 2, 18], [88, 5, 15], [6, 30, 10], [42, 26, 9], [96, 34, 9], [31, 47, 7], [80, 44, 8]];
function conqLife() {
  const fx = h('div', { class: 'cq-fx', 'aria-hidden': 'true' });
  CQ_STARS.forEach(([x, y, z], i) => { const e = h('span', { class: 'cq-star', style: { left: x + '%', top: y + '%', width: z + 'px', height: z + 'px', animationDuration: (1.6 + (i * 37 % 11) / 10) + 's', animationDelay: -(i * 7 % 13) / 5 + 's' } }); e.innerHTML = sparkSVG(); fx.append(e); });
  for (let i = 0; i < 10; i++) fx.append(h('i', { class: 'cq-mote', style: { left: (4 + i * 9.6) + '%', animationDuration: (3 + (i * 7 % 5) * .5) + 's', animationDelay: -(i * 11 % 9) * .45 + 's' } }));
  return fx;
}
function explainConquest() {
  sfx('click');
  const P = C.P();
  sheet(h('div', { class: 'cq-sheet' }, relicIcon('big'), h('h3', {}, 'Jauge de conquête'),
    h('p', {}, 'Chaque combat en Arène fait avancer ta conquête des Failles : victoire +12, et +4 de plus si tu tiens le Cœur de Mythe à la fin ; égalité +5, défaite +3. Les victoires en Campagne, Événement et Tournoi comptent +6.'),
    h('p', { class: 'tip' }, 'Jauge pleine (' + CONQUEST_MAX + ') : une Relique de conquête tout de suite, sans attendre. Prochaine : ' + ECLATS[CONQUEST_CYCLE[P.conquest.n % CONQUEST_CYCLE.length]].name + ' + 5 gemmes.'),
    h('div', { class: 'shardbar' }, h('i', { style: { width: Math.min(100, P.conquest.pts / CONQUEST_MAX * 100) + '%' } }), h('span', {}, P.conquest.pts + ' / ' + CONQUEST_MAX))));
}
function claimRelic() {
  const r = claimConquest(C.P()); if (!r) return;
  reveal(r, 'Relique de conquête');
}
// L'Autel des Failles (bâtiment du Royaume) : purifier les Éclats, tout de suite
export function openAutel() {
  sfx('click');
  const P = C.P(), lvl = autelLevel(P), counts = eclatCounts(P), left = purifyLeft(P);
  const types = ECLAT_ORDER.filter(t => counts[t]).reverse();
  const s = sheet(h('div', { class: 'autel-sheet' },
    h('h3', {}, 'Autel des Failles · niveau ' + lvl),
    h('p', { class: 'muted' }, 'Les combats arrachent des Éclats aux Failles. L’Autel les purifie et libère ce qu’ils contiennent : or, cristaux, gemmes et fragments de héros.'),
    h('div', { class: 'au-left' + (left ? '' : ' none') }, h('b', {}, left + ' / ' + purifyMax(P)), h('small', {}, 'purifications restantes aujourd’hui')),
    types.length ? h('div', { class: 'au-list' }, types.map(t => h('div', { class: 'au-row', style: { '--ec': ECLATS[t].color } },
      eclatIcon(t), h('div', { class: 'au-t' }, h('b', {}, ECLATS[t].name + ' ×' + counts[t]), h('small', {}, 'Environ ' + Math.round(ECLATS[t].shards * autelBonus(lvl)) + ' fragments' + (ECLATS[t].legend ? ', dont un héros légendaire ou mythique' : ''))),
      h('button', { class: 'btn small ' + (left ? 'gold' : 'ghost'), onclick: () => { const r = purify(P, t); if (r.err) return toast(r.err, 'bad'); s.close(); reveal(r); } }, 'Purifier'))))
      : h('p', { class: 'tip' }, 'Aucun Éclat pour l’instant : chaque victoire en Arène en rapporte un.'),
    h('p', { class: 'muted small' }, 'Améliore l’Autel dans ton Royaume : +1 purification par jour (niveau suivant : ' + purifyPerDay(lvl + 1) + ') et des Éclats 6 % plus riches à chaque niveau. Réserve : ' + P.eclats.length + ' / 20 Éclats.')), { onClose: () => C.render() });
}
function reveal(r, title) {
  if (!r) return;
  sfx('fuse');
  const s = sheet(h('div', { class: 'reward-open' },
    r.relic ? relicIcon('big pop') : eclatIcon(r.type, 'big pop'), h('h3', {}, title || ECLATS[r.type].name + ' purifié'),
    h('div', { class: 'rchips' }, rewardChips(r)),
    h('div', { class: 'shard-grid' }, Object.entries(r.shards).map(([id, n]) => h('div', { class: 'shard', style: { '--rc': RARITIES[HERO[id].rar].color } }, C.portraitImg(id), h('b', {}, '×' + n), h('small', {}, HERO[id].name)))),
    h('button', { class: 'btn big gold', onclick: () => { s.close(); C.render(); } }, 'Super !')));
}

// ---------- Missions ----------
export function missionsButton() {
  const n = missionsReady(C.P());
  return h('button', { class: 'tile', onclick: openMissions }, icon('star'), h('b', {}, 'Missions'), h('small', {}, n ? n + ' à récupérer' : 'du jour'), n ? h('span', { class: 'badge' }, n) : null);
}
function openMissions() {
  sfx('click');
  const P = C.P();
  const row = m => h('div', { class: 'mis' + (m.claimed ? ' done' : '') },
    h('div', { class: 'mis-t' }, h('b', {}, m.txt), h('div', { class: 'tbar' }, h('i', { style: { width: (m.prog / m.n * 100) + '%' } })), h('small', {}, m.prog + ' / ' + m.n)),
    m.claimed ? h('span', { class: 'ok' }, '✓') : h('button', { class: 'btn small ' + (m.prog >= m.n ? 'gold' : 'ghost'), onclick: () => { if (m.prog < m.n) return toast('Pas encore terminé'); claimMission(P, m); sfx('coin'); s.close(); openMissions(); } }, rewardChips(m.reward)));
  const s = sheet(h('div', { class: 'missions' }, h('h3', {}, 'Missions du jour'), P.missions.list.map(row),
    h('h4', {}, 'Missions de la semaine'), P.missions.wlist.map(row),
    h('p', { class: 'muted' }, 'Nouvelles missions chaque jour à minuit, et chaque lundi pour la semaine.')), { onClose: () => C.render() });
}

// ---------- Connexion ----------
export function loginPopup() {
  const P = C.P(); if (!P.login.pending) return;
  const day = P.login.streak;
  const s = sheet(h('div', { class: 'login' }, h('h3', {}, 'Récompense de connexion'),
    h('div', { class: 'days' }, [0, 1, 2, 3, 4, 5, 6].map(k => h('div', { class: 'day' + (k + 1 < day ? ' past' : k + 1 === day ? ' today' : '') }, h('small', {}, 'Jour ' + (k + 1)), rewardChips(LOGIN_[k])))),
    h('button', { class: 'btn big gold', onclick: () => { claimLogin(P); sfx('coin'); s.close(); C.render(); } }, 'Récupérer')));
}
import { LOGIN as LOGIN_ } from '../../shared/economy.js';

// ---------- Boutique ----------
export function shopScreen() {
  const P = C.P(), offers = shopOffers(P);
  const card = o => {
    const bought = P.shop.bought.includes(o.id);
    let art, title, sub;
    if (o.kind === 'gift') { art = h('div', { class: 'of-art gift' }, icon('star')); title = o.name; sub = 'Gratuit, une fois par jour'; }
    else if (o.kind === 'shards') { const c = HERO[o.hero]; art = h('div', { class: 'of-art', style: { '--rc': RARITIES[c.rar].color } }, C.portraitImg(o.hero)); title = '×' + o.n + ' fragments'; sub = c.name + ' · ' + RARITIES[c.rar].name; }
    else if (o.kind === 'eclat') { art = h('div', { class: 'of-art' }, eclatIcon(o.eclat, 'big')); title = ECLATS[o.eclat].name; sub = 'Déjà purifié : contenu tout de suite'; }
    else if (o.kind === 'crystals') { art = h('div', { class: 'of-art' }, icon('crystal')); title = '×' + o.n + ' cristaux'; sub = 'Pour les niveaux 6 à 10'; }
    else if (o.kind === 'skin') { const c = HERO[o.hero]; art = h('div', { class: 'of-art', style: { '--rc': SKINS[o.skin].glow } }, C.portraitImg(o.hero)); title = 'Apparence ' + SKINS[o.skin].name; sub = c.name + ' (sans effet sur la puissance)'; }
    const price = o.price ? (o.price.gold ? [icon('coin'), o.price.gold] : [icon('gem'), o.price.gems]) : ['Gratuit'];
    return h('div', { class: 'offer' + (bought ? ' sold' : '') }, art, h('b', {}, title), h('small', {}, sub),
      h('button', { class: 'btn small ' + (bought ? 'ghost' : 'gold'), onclick: () => {
        if (bought) return;
        const e = buy(P, o); if (e) return toast(e, 'bad');
        sfx('coin'); toast('Acheté ✓');
        if (o.kind === 'eclat' && o.got) { C.render(); return reveal(o.got); }
        C.render();
      } }, bought ? 'Acheté' : price));
  };
  const tomorrow = new Date(); tomorrow.setHours(24, 0, 0, 0);
  return h('section', { class: 'shop' },
    h('div', { class: 'panel' }, h('div', { class: 'row between' }, h('h3', {}, 'Boutique du jour'), h('small', { class: 'muted' }, 'Renouvelée dans ' + fmt((tomorrow - Date.now()) / 1000))),
      h('div', { class: 'offers' }, offers.map(card))),
    h('div', { class: 'panel' }, h('h3', {}, 'Tes ressources'),
      h('div', { class: 'res-grid' },
        h('div', {}, icon('coin'), h('b', {}, P.gold), h('small', {}, 'Or : améliorer les héros, construire')),
        h('div', {}, icon('gem'), h('b', {}, P.gems), h('small', {}, 'Gemmes : Éclats, apparences, accélérer')),
        h('div', {}, icon('crystal'), h('b', {}, P.crystals), h('small', {}, 'Cristaux : héros niveaux 6 à 10')),
        h('div', {}, h('span', { class: 'ic' }, '🪨'), h('b', {}, P.stone), h('small', {}, 'Pierre : bâtiments du Royaume')))),
    h('p', { class: 'muted center' }, 'MYTHORIA est équitable : aucun achat en argent réel, tout se gagne en jouant. Les gemmes ne donnent jamais de puissance en combat.'));
}

// ---------- Fiche de héros : niveau, amélioration, apparences ----------
export function heroProgress(id, onChange) {
  const P = C.P(), c = HERO[id], lvl = heroLevel(P, id), own = owned(P).includes(id);
  if (!own) return null;
  const st = canUpgrade(P, id), cost = st.c, have = P.shards[id] || 0;
  const box = h('div', { class: 'hprog' },
    h('div', { class: 'row between' }, h('h4', {}, 'Niveau ' + lvl + ' / ' + MAX_LEVEL), h('small', { class: 'muted' }, 'Puissance ×' + Math.pow(1.1, lvl - 1).toFixed(2))),
    cost ? h('div', { class: 'shardbar' }, h('i', { style: { width: Math.min(100, have / cost.shards * 100) + '%' } }), h('span', {}, have + ' / ' + cost.shards + ' fragments')) : h('p', { class: 'tip' }, 'Niveau maximum atteint !'),
    cost ? h('button', { class: 'btn big ' + (st.ok ? 'gold' : 'ghost'), onclick: () => {
      const r = upgradeHero(P, id); if (!r.ok) return toast(r.why, 'bad');
      sfx('fuse'); toast(c.name + ' passe niveau ' + r.lvl + ' !'); onChange();
    } }, 'Améliorer : ', icon('coin'), cost.gold, cost.crystals ? [' ', icon('crystal'), cost.crystals] : null) : null,
    st.ok || !cost ? null : h('small', { class: 'muted' }, st.why),
    h('small', { class: 'muted' }, 'Fragments : dans les Éclats de Faille (Autel du Royaume) et la boutique. Niveau maximum actuel : ' + maxHeroLevel(P) + ' (monte avec l’Académie du Royaume).'));
  const sk = skinsFor(P, id);
  const skins = (c.model.glb || c.model.beast) ? h('div', { class: 'hskins' }, h('h4', {}, 'Apparences'),
    h('div', { class: 'skin-row' },
      h('button', { class: 'skin' + (!P.skins.eq[id] ? ' on' : ''), onclick: () => { delete P.skins.eq[id]; saveProfile(P); onChange(); } }, 'Classique'),
      sk.map(k => h('button', { class: 'skin' + (P.skins.eq[id] === k ? ' on' : ''), style: { '--sc': SKINS[k].glow }, onclick: () => { P.skins.eq[id] = k; saveProfile(P); onChange(); } }, SKINS[k].name))),
    sk.length ? null : h('small', { class: 'muted' }, 'Une apparence différente est proposée chaque jour dans la boutique.')) : null;
  return h('div', {}, box, skins);
}
