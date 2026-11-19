// MYTHORIA — menus : accueil 3D, héros & deck, fiche de héros 3D, mondes, modes, résultats, profil.
import { HERO, PLAYABLE, SPELL, SPELLS, RARITIES, FACTIONS, WORLDS, UNLOCKS, SPELL_UNLOCKS, DECK_SIZE, STAR_MULT, deckSynergies, worldFor } from '../../shared/content.js';
import { AI_LEVELS } from '../../shared/ai.js';
import { loadProfile, saveProfile, resetProfile, owned, ownedSpells, worldOf, botLevelFor, botDeck, botSpell, botLevels, applyResult, xpNeed, heroLevel, canUpgrade, CHESTS, gearFor, heroItems, heroGear, equipItem, unequipItem, itemState, forgeItem, unlockedCount, heroWins } from '../store.js';
import { SLOTS, STAT_NAME, gearBonus, botGear, itemsFor, itemById } from '../../shared/items.js';
import { itemIcon } from './itemart.js';
import { battleSVG, medalSVG, isleSVG, sparkSVG } from './art.js';
import { modeIcon } from './modeart.js';
import { initProgress, chestRow, missionsButton, loginPopup, shopScreen, heroProgress, chestIcon } from './progress.js';
import { initKingdom, kingdomScreen, leaveKingdom } from './kingdom.js';
import { story } from './story.js';
import { initModes, openCampaign, playSurvival, playEvent, playTourney, currentEvent, eventWinsLeft } from './modes.js';
import { Battle, spellIcon } from '../battle.js';
import { HeroMode } from '../heromode.js';
import { doInstall } from '../install.js';
import { Showcase, portrait } from '../three/showcase.js';
import { webglOk, GFX_LEVELS, gfxChoice, setGfx, autoLevel, showFps, setShowFps } from '../three/stage.js';
import { THEMES } from '../three/world.js';
import { h, toast, sheet, confirmBox } from './dom.js';
import { icon } from './icons.js';
import { sfx, setSound, unlockAudio, playMusic, stopMusic, getVolumes, setVolumes } from '../audio.js';
import { playIntro } from '../intro.js';
import { tutoDone } from '../tuto.js';

let P, root, tab = 'battle', swapIn = null, filter = 'all', stage = null;
export const APP = { version: '' };

export function startApp(el, version) {
  root = el; APP.version = version; P = loadProfile(); saveProfile(P); setSound(P.sound);
  document.addEventListener('pointerdown', unlockAudio, { passive: true });
  if (!webglOk()) { root.innerHTML = '<div class="nogl"><div class="logo">MYTHORIA</div><p>Ton navigateur ne permet pas l’affichage 3D (WebGL). Ouvre le jeu dans Chrome à jour.</p></div>'; return; }
  initProgress({ P: () => P, render: () => render(), portraitImg });
  initKingdom({ P: () => P, render: () => render() });
  initModes({ P: () => P, render: () => render(), play: (m, l, w, x) => play(m, l, w, x) });
  // Saison 1 : la cinématique d'ouverture passe une fois (nouveaux et anciens joueurs), puis l'accueil
  playIntro().catch(() => {}).then(shown => {
    render();
    if (P.named) setTimeout(loginPopup, shown ? 500 : 900); else setTimeout(() => openWelcome(() => setTimeout(loginPopup, 500)), shown ? 300 : 700);
  });
  // prépare les portraits en arrière-plan
  setTimeout(() => P.deck.forEach(id => portrait(id)), 600);
}

// ---------- Bienvenue : choisir son nom au premier lancement ----------
const NAME_A = ['Aube', 'Braise', 'Givre', 'Lune', 'Rune', 'Orage', 'Sylve', 'Ombre', 'Étoile', 'Fer', 'Cristal', 'Tempête'];
const NAME_B = ['lame', 'cœur', 'garde', 'chasseur', 'mage', 'loup', 'flamme', 'bouclier', 'croc', 'vent', 'roi', 'reine'];
const randomName = () => NAME_A[Math.floor(Math.random() * NAME_A.length)] + NAME_B[Math.floor(Math.random() * NAME_B.length)];
function cleanName(v) { return v.replace(/[<>&"']/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }
function openWelcome(done) {
  const input = h('input', { class: 'inp big', maxlength: 16, placeholder: 'Ton nom de héros', value: '', autocomplete: 'off', enterkeyhint: 'done' });
  const err = h('small', { class: 'w-err' });
  const go = () => {
    const v = cleanName(input.value);
    if (v.length < 3) { err.textContent = 'Il faut au moins 3 lettres.'; input.focus(); return; }
    P.name = v; P.named = true; saveProfile(P); sfx('fuse');
    page.classList.add('off'); setTimeout(() => page.remove(), 400);
    render(); toast('Bienvenue dans Mythoria, ' + v + ' !'); done && done();
  };
  input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  const page = h('div', { class: 'welcome' },
    h('div', { class: 'logo' }, 'MYTHORIA'),
    h('p', { class: 'w-intro' }, 'Les Failles se sont ouvertes sur les six royaumes. Mythoria a besoin d’un nouveau héros…'),
    h('label', {}, 'Comment t’appelles-tu dans le jeu ?'),
    input, err,
    h('button', { class: 'btn ghost small', onclick: () => { input.value = randomName(); err.textContent = ''; sfx('click'); } }, '🎲 Choisir un nom au hasard'),
    h('button', { class: 'btn big gold', onclick: go }, 'Commencer l’aventure'),
    h('small', { class: 'muted' }, 'Tu pourras le changer plus tard en touchant ton portrait en haut à gauche.'));
  document.body.append(page);
  setTimeout(() => input.focus(), 400);
}

// ---------- Cadre ----------
let lastTab = null;
function render() {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  root.innerHTML = '';
  try { document.body.dataset.world = worldFor(P.trophies).key; } catch (e) {}
  playMusic('menu'); // ambiance douce des menus (D-20261117-1)
  root.append(topBar(), h('main', { class: 'screen s-' + tab + (tab !== lastTab ? ' enter' : '') }, screen()), navBar());
  lastTab = tab;
}

function portraitImg(id, cls = 'pt') {
  const img = h('img', { class: cls + ' loading', alt: HERO[id].name });
  portrait(id).then(u => { if (u) { img.src = u; img.classList.remove('loading'); } });
  return img;
}

function topBar() {
  const need = xpNeed(P.lvl);
  // Barre « astrale » (maquette) : capsule à pointes (trophées · cristal central · or + gemmes) et bandeau dessous (profil, niveau, réglages)
  return h('header', { class: 'topbar' },
    h('div', { class: 'tb-core' },
      h('div', { class: 'res' },
        h('span', { class: 'pill p-tro' }, icon('n_star'), P.trophies),
        h('button', { class: 'tb-gem', onclick: () => { sfx('click'); tab = 'shop'; swapIn = null; render(); }, 'aria-label': 'Boutique' }, svgEl('md', medalSVG()), h('i', {})),
        h('span', { class: 'pill p-gold' }, icon('coin'), P.gold),
        h('span', { class: 'pill p-gems' }, icon('gem'), P.gems)),
      h('div', { class: 'tb-sub' },
        h('button', { class: 'me', onclick: openProfile, 'aria-label': 'Profil' },
          h('div', { class: 'avatar' }, portraitImg(P.avatar, 'av-img')),
          h('div', { class: 'me-txt' }, h('b', {}, P.name))),
        h('div', { class: 'xp' }, h('span', { class: 'lvl' }, P.lvl), h('div', { class: 'xpbar' }, h('i', { style: { width: (P.xp / need * 100) + '%' } }))),
        h('button', { class: 'gear', onclick: openSettings, 'aria-label': 'Réglages' }, icon('gear')))));
}

const TABS = [['shop', 'n_gem', 'Boutique'], ['heroes', 'n_hero', 'Héros'], ['battle', 'n_star', 'Combat'], ['kingdom', 'n_crown', 'Royaume'], ['clan', 'n_shield', 'Clan']];
function navBar() {
  return h('nav', { class: 'nav' }, TABS.map(([id, ic, nm]) =>
    h('button', { class: 'nav-b' + (tab === id ? ' on' : '') + (id === 'battle' ? ' mid' : ''), onclick: () => { sfx('click'); tab = id; swapIn = null; render(); } },
      icon(ic), h('small', {}, nm))));
}

function screen() {
  if (tab === 'battle') return homeScreen();
  if (tab === 'heroes') return heroesScreen();
  if (tab === 'shop') return shopScreen();
  if (tab === 'kingdom') return kingdomScreen();
  if (tab === 'clan') return soon('clan', 'Clans & Amis', 6, ['Créer ou rejoindre un clan', 'Chat du clan', 'Dons de héros', 'Guerres de clans', 'Combats amicaux', 'Classements mondial, par pays et des clans']);
}

function soon(ic, title, phase, items) {
  return h('section', { class: 'soon' },
    h('div', { class: 'soon-ic' }, icon(ic)), h('h2', {}, title),
    h('p', { class: 'soon-tag' }, 'En construction — phase ' + phase + ' du plan'),
    h('ul', {}, items.map(i => h('li', {}, i))),
    h('p', { class: 'muted' }, 'Rien n’est simulé : cette partie s’ouvrira quand elle fonctionnera pour de vrai.'));
}

// ---------- Accueil ----------
function homeScreen() {
  const w = worldOf(P), next = WORLDS[w.id + 1];
  const prog = next ? (P.trophies - w.trophies) / (next.trophies - w.trophies) : 1;
  const fav = HERO[P.avatar] || HERO.ecuyer;
  const T = THEMES[w.key];
  const el = h('section', { class: 'home' },
    h('div', { class: 'home-stage', style: { '--sky1': T.skyTop, '--sky2': T.skyBot } },
      cosmosBack(), h('img', { class: 'home-art', src: 'assets/ui/home-scene.webp', alt: '', draggable: 'false' }), cosmosFront(),
      h('div', { class: 'home-world' }, h('small', {}, 'Monde ' + (w.id + 1) + ' / ' + WORLDS.length), h('b', {}, w.name)),
      h('button', { class: 'home-hero', onclick: () => openHero(fav.id) },
        h('span', { class: 'rar', style: { '--rc': RARITIES[fav.rar].color } }, RARITIES[fav.rar].name),
        h('b', {}, fav.name), h('small', {}, fav.title)),
      h('div', { class: 'home-prog' },
        next ? [h('div', { class: 'tbar' }, h('i', { style: { width: prog * 100 + '%' } })), h('small', {}, icon('trophy'), P.trophies + ' / ' + next.trophies + ' → ' + next.name)]
          : h('small', {}, 'Tu as atteint le dernier monde !'))),
    h('button', { class: 'btn-battle', onclick: openModes }, h('i', { class: 'bb-aura' }), h('i', { class: 'bb-rays' }), svgEl('bb-art', battleSVG()), h('i', { class: 'bb-glow' }), h('i', { class: 'bb-shine' }), battleSparks(), h('b', {}, 'COMBATTRE'), h('small', {}, 'Mode Arène • ' + AI_LEVELS[botLevelFor(P)].name)),
    chestRow(),
    h('div', { class: 'home-row' },
      tile('map', 'Mondes', WORLDS.filter(x => P.trophies >= x.trophies).length + ' / 6', openWorlds),
      tile('heroes', 'Héros', owned(P).length + ' / ' + PLAYABLE.length, () => { tab = 'heroes'; render(); }),
      missionsButton(),
      tile('book', 'Règles', 'Comment jouer', openHowTo)),
    h('p', { class: 'muted center small' }, 'Progression sauvegardée sur ce téléphone · vrais adversaires en ligne : phase 3'));
  // scène peinte de la maquette de l'utilisateur (assets/ui/home-scene.webp, agrandie ×4 et rendue nette) à la place du héros 3D
  return el;
}
// ---------- Décor vivant de l'accueil (calques CSS autour du héros 3D, voir « Décor cosmique » dans styles.css) ----------
function svgEl(cls, svg, style) { const e = h('span', { class: cls, style: style || {} }); e.innerHTML = svg; return e; }
const rnd = (a, b) => a + Math.random() * (b - a);
function cosmosBack() {
  const stars = [], N = 46;
  for (let i = 0; i < N; i++) { const z = rnd(1, 2.6); stars.push(h('i', { class: 'star', style: { left: rnd(1, 99) + '%', top: rnd(1, 92) + '%', width: z + 'px', height: z + 'px', animationDuration: rnd(1.6, 4.5) + 's', animationDelay: -rnd(0, 4) + 's' } })); }
  const big = [[12, 9], [86, 16], [70, 5], [30, 47], [93, 58], [6, 70], [56, 12]].map(([x, y], i) => svgEl('bstar', sparkSVG(), { left: x + '%', top: y + '%', animationDuration: (2.2 + i * .45) + 's', animationDelay: -i * .7 + 's' }));
  const au = n => h('div', { class: 'au a' + n }, h('i', {}));
  return h('div', { class: 'cosmos', 'aria-hidden': 'true' },
    h('i', { class: 'neb n1' }), h('i', { class: 'neb n2' }), h('i', { class: 'neb n3' }), stars, big,
    au(1), au(2), au(3), au(4),
    h('i', { class: 'shoot sh1' }), h('i', { class: 'shoot sh2' }),
    svgEl('isl far f1', isleSVG('a')), svgEl('isl far f2', isleSVG('c')), svgEl('isl far f3', isleSVG('b')), svgEl('isl far f4', isleSVG('c')),
    svgEl('isl i1', isleSVG('a')), svgEl('isl i2', isleSVG('b')),
    [1, 2, 3, 4, 5, 6].map(n => svgEl('isl sh s' + n, isleSVG('c'))),
    h('i', { class: 'halo' }), h('i', { class: 'rays' }));
}
// Bouton COMBATTRE vivant : étincelles qui s'allument tour à tour sur le cadre, éclat du cristal, poussières qui montent
const BB_SPARKS = [[12, 30, 11], [30, 27, 9], [70, 27, 10], [88, 31, 12], [96.5, 54, 10], [86, 79, 9], [64, 81, 11], [36, 81, 9], [14, 79, 11], [3.5, 54, 10], [7.2, 54, 15], [92.8, 54, 15], [41, 17, 9], [59, 17, 9], [50, 88, 12]];
function battleSparks() {
  const out = BB_SPARKS.map(([x, y, z], i) => svgEl('bb-spark', sparkSVG(), { left: x + '%', top: y + '%', width: z + 'px', height: z + 'px', animationDuration: (1.7 + (i * 37 % 13) / 10) + 's', animationDelay: -(i * 53 % 29) / 10 + 's' }));
  out.push(h('i', { class: 'bb-flare' }));
  for (let i = 0; i < 7; i++) out.push(h('i', { class: 'bb-mote', style: { left: (12 + i * 12.5) + '%', animationDuration: (2.6 + (i * 7 % 5) * .45) + 's', animationDelay: -(i * 11 % 9) * .4 + 's' } }));
  return out;
}
function cosmosFront() {
  const motes = [];
  for (let i = 0; i < 9; i++) { const z = rnd(1.5, 3); motes.push(h('i', { class: 'mote', style: { left: rnd(4, 96) + '%', width: z + 'px', height: z + 'px', animationDuration: rnd(6, 13) + 's', animationDelay: -rnd(0, 13) + 's', '--dx': rnd(-26, 26) + 'px' } })); }
  return h('div', { class: 'cosmos front', 'aria-hidden': 'true' }, motes, svgEl('isl sh g1', isleSVG('c')), svgEl('isl sh g2', isleSVG('c')));
}
function tile(ic, title, sub, fn) { return h('button', { class: 'tile', onclick: () => { sfx('click'); fn(); } }, icon(ic), h('b', {}, title), h('small', {}, sub)); }

// ---------- Modes ----------
function openModes() {
  sfx('click');
  const lvl = botLevelFor(P), w = worldOf(P), ev = currentEvent();
  const T = P.tourney || { round: 0 };
  let s;
  const go = fn => () => { s.close(); fn(); };
  const list = h('div', { class: 'mf-list' },
    mcard('arena', 'Arène', 'Contre l’IA ' + AI_LEVELS[lvl].name + ' dans « ' + w.name + ' » · trophées, or et coffres', go(() => story('arene', () => (!tutoDone() && !(P.hist && P.hist.length)) ? play('training', 0, w, { tuto: true, title: 'Tutoriel' }) : play('arena', lvl, w)))),
    mcard('camp', 'Campagne', 'L’histoire de Mythoria, 30 étapes et 6 boss · étape ' + Math.min(30, P.campaign.done + 1) + '/30', go(() => story('campagne', openCampaign))),
    mcard('surv', 'Survie · Défense du Royaume', 'Résiste aux vagues de monstres et de boss · record : vague ' + (P.records.survival || 0), go(() => story('survie', playSurvival))),
    mcard('event', 'Événement : ' + ev.name, ev.desc + ' · ' + eventWinsLeft(P) + ' récompenses restantes aujourd’hui', go(() => story('evenement', playEvent))),
    mcard('hero', 'Mode Héros', 'Dirige toi-même un héros (joystick) contre des vagues de monstres · record : vague ' + (P.records.hero || 0), go(() => story('heros', pickHero))),
    mcard('tourney', 'Tournoi (contre l’IA)', '3 manches de plus en plus dures · manche ' + (T.round + 1) + '/3 · tournois gagnés : ' + (P.records.tournament || 0), go(() => story('tournoi', playTourney))),
    h('div', { class: 'mc-box mc-train' },
      h('div', { class: 'mt-head' }, svgEl('mt-ic', modeIcon('train')), h('div', {}, h('b', {}, 'Entraînement'), h('small', {}, 'Choisis le niveau de l’IA · sans trophées'))),
      h('div', { class: 'mt-pills' }, AI_LEVELS.map((L, i) => h('button', { class: 'pill-lvl' + (i === lvl ? ' on' : ''), onclick: () => { sfx('click'); s.close(); play('training', i, w); } }, (i + 1) + '. ' + L.name)))),
    h('div', { class: 'mc-box mc-lock' },
      svgEl('mt-ic', modeIcon('lock')),
      h('div', { class: 'grow' }, h('b', {}, 'Duel en ligne · 2 contre 2'), h('small', {}, 'Contre de vrais joueurs. Jamais de faux joueurs.')),
      h('span', { class: 'm-phase' }, 'Phase 3')));
  s = sheet(h('div', { class: 'modes mf' },
    h('div', { class: 'mf-head' }, h('h3', {}, 'Choisis Ton Combat'),
      h('button', { class: 'mf-x', 'aria-label': 'Fermer', onclick: () => { sfx('click'); s.close(); } }, h('img', { src: 'assets/ui/frame-x.webp', alt: '', draggable: 'false' }))),
    list));
  s.box.classList.add('mframe');
  s.box.append(...['tl', 'tr', 'bl', 'br'].map(c => h('img', { class: 'mf-c ' + c, src: 'assets/ui/frame-' + (c[1] === 'l' ? 'tl' : 'tr') + '.webp', alt: '', draggable: 'false' })));
  // la barre du bas du jeu reste visible et utilisable (Boutique, Héros, Royaume, Clan) : la fenêtre s'arrête au-dessus
  const nav = document.querySelector('nav.nav'), back = s.box.parentElement;
  if (nav && back) { back.style.bottom = nav.offsetHeight + 'px'; nav.addEventListener('click', () => s.close(), { once: true, capture: true }); }
  requestAnimationFrame(() => list.querySelectorAll('.mc-txt').forEach(fitText));
}
// Cartes des modes = illustrations de la maquette de l'utilisateur (assets/ui/mode-*.webp : texte peint effacé, vrai texte par-dessus).
// [largeur, hauteur, haut du bouton en %] ; le bouton « Jouer » (mode-play.webp) se pose exactement sur celui de l'image.
const MC = { arena: [964, 238, 26.47], camp: [964, 238, 26.47], surv: [964, 259, 31.27], event: [964, 299, 32.44], hero: [964, 260, 30.38], tourney: [964, 238, 26.47] };
function mcard(id, title, desc, onPlay) {
  const [w, hh, bt] = MC[id];
  return h('div', { class: 'mc mc-' + id, style: { '--ar': (w / hh).toFixed(4), '--bt': bt + '%' } },
    h('i', { class: 'mc-halo' }),
    id === 'tourney' ? svgEl('mc-ic', modeIcon('tourney')) : null,
    id === 'event' ? h('i', { class: 'mc-flash' }) : null,
    h('div', { class: 'mc-txt' }, h('b', {}, title), h('small', {}, desc)),
    h('button', { class: 'mc-play', 'aria-label': 'Jouer : ' + title, onclick: () => { sfx('click'); onPlay(); } }, h('img', { src: 'assets/ui/mode-play.webp', alt: 'Jouer', draggable: 'false' })));
}
// rétrécit le texte d'une carte tant qu'il dépasse (noms de monde ou d'événement plus longs)
function fitText(el) {
  let k = 1;
  while (el.scrollHeight > el.clientHeight + 1 && k > .7) { k -= .04; el.style.setProperty('--fk', k.toFixed(2)); }
}

window.__app = { play: (...a) => play(...a), playHero: id => playHero(id), openHero: id => openHero(id), P: () => P, WORLDS };
function play(modeId, level, world, extra = {}) {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  const tro = modeId === 'arena' ? P.trophies : Math.max(P.trophies, world.trophies);
  const seed = (Math.random() * 1e9) | 0;
  const oppDeck = extra.oppDeck || botDeck(tro, seed, world.fac);
  const holder = h('div', { class: 'battle-holder' });
  document.body.append(holder); document.body.classList.add('in-battle');
  new Battle(holder, {
    deck: P.deck.slice(), spell: P.spell, oppDeck, oppSpell: botSpell(tro, seed), botLevel: level, world, myName: P.name, mode: modeId,
    levels: { ...P.levels }, oppLevels: extra.oppLevels || botLevels(oppDeck, tro), skins: { ...P.skins.eq },
    gear: gearFor(P, P.deck), oppGear: extra.oppGear || botGear(oppDeck, tro),
    simMode: extra.simMode, tuto: extra.tuto, boss: extra.boss, waves: extra.waves, mods: extra.mods, bonus: extra.bonus, title: extra.title,
    onEnd: r => { holder.remove(); document.body.classList.remove('in-battle'); if (extra.onResult) r = extra.onResult(r) || r; showResult(r); },
  });
}

// ---------- Mode Héros ----------
function pickHero() {
  const list = owned(P);
  const s = sheet(h('div', { class: 'modes' }, h('h3', {}, 'Choisis ton héros'), h('p', { class: 'muted' }, 'Glisse à gauche pour bouger, bouton Attaque à droite, Super quand le cercle est plein. Les niveaux de tes héros comptent.'),
    h('div', { class: 'coll-grid' }, list.map(id => heroCard(HERO[id], { onclick: () => { s.close(); playHero(id); } })))));
}
function playHero(id) {
  if (stage) { stage.dispose(); stage = null; }
  leaveKingdom();
  const holder = h('div', { class: 'battle-holder' });
  document.body.append(holder); document.body.classList.add('in-battle');
  new HeroMode(holder, { heroId: id, level: heroLevel(P, id), world: worldOf(P), skin: P.skins.eq[id], onEnd: r => {
    holder.remove(); document.body.classList.remove('in-battle');
    const rec = r.wave > (P.records.hero || 0);
    if (rec) P.records.hero = r.wave;
    showResult({ mode: 'hero', result: 'hero', wave: r.wave, opp: '', myHp: 0, oppHp: 0, note: r.kills + ' monstres vaincus' + (rec ? ' · nouveau record !' : ''), reward: { gold: r.kills * 2 + r.wave * 10, crystals: r.wave >= 5 ? r.wave * 2 : 0 } });
  } });
}

// ---------- Résultat ----------
// Explique comment le combat s'est fini (D-20261116-1) : au chrono, c'est le Sanctuaire le moins abîmé qui gagne.
function endWhy(r) {
  if (r.result !== 'win' && r.result !== 'loss' && r.result !== 'draw') return '';
  const a = r.myHp * 100, b = r.oppHp * 100;
  let pa = Math.round(a), pb = Math.round(b);
  if (pa === pb && a !== b) { pa = a.toFixed(1).replace('.', ','); pb = b.toFixed(1).replace('.', ','); }
  const cmp = 'ton Sanctuaire ' + pa + ' % contre ' + pb + ' %';
  if (r.reason === 'sanct') return r.result === 'win' ? 'Sanctuaire ennemi détruit !' : 'Ton Sanctuaire a été détruit.';
  if (r.reason === 'time') return 'Fin du temps : ' + cmp + '. Le Sanctuaire le moins abîmé gagne.';
  if (r.reason === 'overtime') return 'Prolongation : ' + cmp + '. Le premier qui prend l’avantage gagne.';
  if (r.reason === 'draw') return 'Fin de la prolongation : les deux Sanctuaires sont à égalité.';
  return '';
}
function showResult(r) {
  const rew = applyResult(P, r);
  const title = r.result === 'survival' || r.result === 'hero' ? 'Vague ' + (r.wave || 0) : r.result === 'win' ? 'Victoire !' : r.result === 'loss' ? 'Défaite' : 'Égalité';
  const bar = (v, cls) => h('div', { class: 'rbar ' + cls }, h('i', { style: { width: Math.round(v * 100) + '%' } }), h('span', {}, Math.round(v * 100) + ' %'));
  const page = h('div', { class: 'result ' + r.result },
    h('h1', {}, title),
    h('div', { class: 'rvs' },
      r.result === 'hero' ? h('div', {}, h('b', {}, P.name), h('small', {}, 'Vagues'), h('b', {}, r.wave)) : h('div', {}, h('b', {}, P.name), h('small', {}, 'Ton Sanctuaire'), bar(r.myHp, 'blue')),
      r.result === 'survival' || r.result === 'hero' ? h('div', {}, h('b', {}, r.result === 'hero' ? 'Mode Héros' : 'Survie'), h('small', {}, 'Record'), h('b', {}, 'Vague ' + (r.result === 'hero' ? P.records.hero : P.records.survival || 0))) : h('div', {}, h('b', {}, '🤖 ' + r.opp), h('small', {}, 'Sanctuaire ennemi'), bar(r.oppHp, 'red'))),
    endWhy(r) ? h('p', { class: 'rwhy' }, endWhy(r)) : null,
    r.note ? h('div', { class: 'banner-good' }, r.note) : null,
    rew.extra ? h('div', { class: 'rchips' }, Object.entries(rew.extra).filter(([k, v]) => v).map(([k, v]) => h('span', { class: 'rchip' }, k === 'gold' ? icon('coin') : k === 'gems' ? icon('gem') : k === 'crystals' ? icon('crystal') : k === 'chest' ? chestIcon(v, 'xs') : '', k === 'chest' ? CHESTS[v].name : '+' + v))) : null,
    r.reason === 'forfeit' ? h('p', { class: 'muted' }, 'Abandon') : r.heart ? h('p', { class: 'muted' }, '✦ Tu tenais le Cœur de Mythe à la fin : +10 or') : null,
    h('div', { class: 'rewards' },
      r.mode === 'arena' ? h('div', { class: 'rw' }, icon('trophy'), h('b', {}, (rew.trophies >= 0 ? '+' : '') + rew.trophies), h('small', {}, 'trophées')) : h('div', { class: 'rw' }, icon('summon'), h('b', {}, { training: 'Entraînement', campaign: 'Campagne', survival: 'Survie', event: 'Événement', tourney: 'Tournoi', hero: 'Mode Héros' }[r.mode] || 'Mode'), h('small', {}, 'sans trophées')),
      h('div', { class: 'rw' }, icon('coin'), h('b', {}, '+' + rew.gold), h('small', {}, 'or')),
      h('div', { class: 'rw' }, icon('star'), h('b', {}, '+' + rew.xp), h('small', {}, 'expérience'))),
    rew.chest ? h('div', { class: 'banner-good row gap' }, chestIcon(rew.chest, 'xs'), CHESTS[rew.chest].name + ' gagné !') : (r.mode === 'arena' && r.result === 'win' ? h('p', { class: 'muted' }, 'Emplacements de coffres pleins : ouvre-en un pour en gagner d’autres.') : null),
    rew.lvlUp ? h('div', { class: 'banner-good' }, 'Niveau ' + P.lvl + ' ! +10 gemmes') : null,
    rew.newWorld ? h('div', { class: 'banner-good' }, 'Nouveau monde : ' + rew.newWorld.name + ' !') : null,
    rew.newHeroes.length ? h('div', { class: 'newcards' }, h('b', {}, 'Nouveaux héros débloqués !'), h('div', { class: 'mini-row' }, rew.newHeroes.map(id => h('div', { class: 'mini', style: { '--rc': RARITIES[HERO[id].rar].color } }, portraitImg(id), h('small', {}, HERO[id].name))))) : null,
    rew.newSpells.length ? h('div', { class: 'banner-good' }, 'Nouveau sortilège : ' + rew.newSpells.map(id => SPELL[id].name).join(', ')) : null,
    h('button', { class: 'btn big gold', onclick: () => { page.remove(); render(); } }, 'Continuer'));
  document.body.append(page);
  if (rew.gold) setTimeout(() => sfx('coin'), 300);
}

// ---------- Héros & deck ----------
function heroesScreen() {
  const own = owned(P), ownS = ownedSpells(P);
  const facs = ['all', 'aube', 'arcane', 'sylve', 'braise', 'givre', 'ombre', 'neutre'];
  const list = PLAYABLE.filter(c => filter === 'all' || c.fac === filter).sort((a, b) => (own.includes(b.id) - own.includes(a.id)) || RARITIES[b.rar].order - RARITIES[a.rar].order);
  const worldOfHero = id => WORLDS.find(w => (UNLOCKS[w.id] || []).includes(id));
  return h('section', { class: 'heroes' },
    h('div', { class: 'panel deck-panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Ton deck'), h('small', { class: 'muted' }, '8 héros + 1 sortilège')),
      swapIn ? h('div', { class: 'swap-hint' }, 'Touche le héros à remplacer par ', h('b', {}, HERO[swapIn].name), h('button', { class: 'btn small ghost', onclick: () => { swapIn = null; render(); } }, 'Annuler')) : null,
      h('div', { class: 'deck-grid' + (swapIn ? ' swapping' : '') }, P.deck.map((id, i) => heroCard(HERO[id], {
        onclick: () => { if (swapIn) { P.deck[i] = swapIn; swapIn = null; saveProfile(P); sfx('click'); toast('Deck mis à jour ✓'); render(); } else openHero(id); },
      }))),
      h('button', { class: 'spell-slot', onclick: () => openSpells(ownS) },
        h('span', { class: 'sp-ic' }, icon(spellIcon(P.spell))),
        h('div', {}, h('small', {}, 'Sortilège (jauge d’Éveil)'), h('b', {}, SPELL[P.spell].name), h('em', {}, SPELL[P.spell].desc)),
        h('span', { class: 'chev' }, '›')),
      synergyChips(P.deck)),
    h('div', { class: 'panel' },
      h('div', { class: 'row between' }, h('h3', {}, 'Collection'), h('small', { class: 'muted' }, own.length + ' / ' + PLAYABLE.length)),
      h('div', { class: 'filters' }, facs.map(f => h('button', { class: 'fchip' + (filter === f ? ' on' : ''), style: { '--fc': f === 'all' ? '#ffd166' : FACTIONS[f].color }, onclick: () => { filter = f; render(); } }, f === 'all' ? 'Tous' : FACTIONS[f].short))),
      h('div', { class: 'coll-grid' }, list.map(c => {
        const lock = !own.includes(c.id);
        return heroCard(c, { lock, inDeck: P.deck.includes(c.id), sub: lock ? worldOfHero(c.id).name : null, onclick: () => openHero(c.id) });
      }))));
}

function heroCard(c, { lock, inDeck, sub, onclick } = {}) {
  return h('button', { class: 'hcard r-' + c.rar + (lock ? ' lock' : '') + (inDeck ? ' indeck' : ''), style: { '--rc': RARITIES[c.rar].color, '--fc': FACTIONS[c.fac].color }, onclick },
    h('div', { class: 'hc-bg' }), portraitImg(c.id),
    h('span', { class: 'hc-fac' }),
    h('div', { class: 'hc-name' }, h('b', {}, c.name), h('small', {}, c.title)),
    lock ? h('span', { class: 'hc-lock' }, icon('lock'), h('small', {}, sub)) : null);
}

function synergyChips(deck) {
  const s = deckSynergies(deck);
  return h('div', { class: 'chips' }, Object.keys(s.counts).sort((a, b) => s.counts[b] - s.counts[a]).map(f => {
    const F = FACTIONS[f], t = s.tiers[f];
    return h('span', { class: 'chip' + (t ? ' on' : ''), style: { '--fc': F.color } }, F.short + ' ' + s.counts[f] + (t ? ' · ' + F.bonus[t - 1] : ' · 3 = bonus'));
  }));
}

function openSpells(ownS) {
  const s = sheet(h('div', { class: 'spells' }, h('h3', {}, 'Choisis ton sortilège'),
    h('p', { class: 'muted' }, 'La jauge d’Éveil se remplit pendant le combat (2× plus vite si tu tiens le Cœur de Mythe). Pleine : touche le bouton puis l’île.'),
    SPELLS.map(sp => {
      const has = ownS.includes(sp.id), w = WORLDS.find(x => (SPELL_UNLOCKS[x.id] || []).includes(sp.id));
      return h('button', { class: 'sp-row' + (P.spell === sp.id ? ' on' : '') + (has ? '' : ' locked'), onclick: () => { if (!has) return toast('Se débloque dans « ' + w.name + ' »'); P.spell = sp.id; saveProfile(P); s.close(); render(); } },
        h('span', { class: 'sp-ic' }, icon(spellIcon(sp.id))), h('div', {}, h('b', {}, sp.name), h('small', {}, has ? sp.desc : 'Débloqué dans « ' + w.name + ' »')));
    })));
}

// ---------- Fiche de héros (3D) ----------
const TGT = { ground: 'Au sol', any: 'Sol et air', buildings: 'Bâtiments' };
function openHero(id) {
  sfx('click');
  const c = HERO[id], own = owned(P).includes(id), inDeck = P.deck.includes(id), F = FACTIONS[c.fac], R = RARITIES[c.rar];
  const max = { hp: 3600, dps: 260, spd: 2.4, range: 6 };
  const LV = Math.pow(1.1, heroLevel(P, id) - 1);
  const GB = own ? heroGear(P, id) : { dmg: 0, atk: 0, hp: 0, spd: 0 };
  const dps = Math.round(c.dmg * LV * (1 + GB.dmg) * (1 + GB.atk) / c.hit * (c.count || 1));
  const plus = v => v ? h('i', { class: 'g-plus' }, ' ' + pct(v)) : null;
  const statBar = (k, v, m, txt) => h('div', { class: 'sbar' }, h('small', {}, k), h('div', { class: 'sb' }, h('i', { style: { width: Math.min(100, v / m * 100) + '%' } })), h('b', {}, txt));
  const cv = h('canvas', { class: 'hd-3d' });
  let sc = null;
  const close = () => { if (sc) sc.dispose(); page.remove(); };
  const page = h('div', { class: 'hero-detail', style: { '--rc': R.color, '--fc': F.color } },
    h('div', { class: 'hd-stage' }, cv,
      h('button', { class: 'hd-close', onclick: close }, icon('close')),
      h('div', { class: 'hd-anims' },
        h('button', { onclick: () => sc && sc.play('attack') }, 'Attaque'),
        h('button', { onclick: () => sc && sc.play('cast') }, 'Pouvoir'),
        h('button', { onclick: () => sc && sc.play('cheer') }, 'Victoire')),
      h('small', { class: 'hd-drag' }, 'Glisse pour tourner')),
    h('div', { class: 'hd-body' },
      h('div', { class: 'hd-title' }, h('h2', {}, c.name), h('small', {}, c.title)),
      h('div', { class: 'chips' }, h('span', { class: 'chip on', style: { '--fc': R.color } }, R.name), h('span', { class: 'chip on', style: { '--fc': F.color } }, F.name),
        c.fly ? h('span', { class: 'chip on', style: { '--fc': '#9fd8ff' } }, 'Volant') : null, (c.count || 1) > 1 ? h('span', { class: 'chip on', style: { '--fc': '#c0c8d8' } }, '×' + c.count) : null),
      h('p', { class: 'lore' }, '« ' + c.lore + ' »'),
      h('div', { class: 'ability' }, h('span', { class: 'ab-ic' }, icon('star')), h('div', {}, h('b', {}, c.ability[0]), h('small', {}, c.ability[1]))),
      h('div', { class: 'sbars' },
        statBar('Vie', c.hp * LV * (1 + GB.hp) * (c.count || 1), max.hp, [Math.round(c.hp * LV * (1 + GB.hp)) + ((c.count || 1) > 1 ? ' ×' + c.count : ''), plus(GB.hp)]),
        statBar('Dégâts / s', dps, max.dps, [dps + (c.splash ? ' (zone)' : ''), plus(GB.dmg + GB.atk)]),
        c.type === 'unit' ? statBar('Vitesse', c.spd, max.spd, c.spd >= 1.8 ? 'Très rapide' : c.spd >= 1.4 ? 'Rapide' : c.spd >= 1 ? 'Moyenne' : 'Lente') : statBar('Durée', c.life, 60, c.life + ' s'),
        statBar('Portée', c.range, max.range, c.range <= 1.2 ? 'Mêlée' : c.range + ' cases'),
        h('div', { class: 'sbar' }, h('small', {}, 'Cible'), h('b', { class: 'wide' }, TGT[c.tgt]))),
      own ? gearBlock(id, () => { close(); openHero(id); }) : null,
      heroProgress(id, () => { close(); openHero(id); render(); }),
      h('div', { class: 'evo' }, h('h4', {}, 'Évolution en combat'),
        h('div', { class: 'evo-row' }, [1, 2, 3].map(st => h('div', { class: 'evo-st' }, h('b', {}, '★'.repeat(st)), h('small', {}, '×' + STAR_MULT[st] + ' puissance')))),
        h('p', { class: 'muted' }, 'Sur le Cercle d’Invocation, glisse un héros sur un héros identique de même rang pour le faire évoluer.')),
      !own ? h('p', { class: 'tip lock' }, 'Se débloque dans le monde « ' + WORLDS.find(w => (UNLOCKS[w.id] || []).includes(id)).name + ' »')
        : inDeck ? h('div', { class: 'row gap' }, h('button', { class: 'btn ghost grow', onclick: () => { P.avatar = id; saveProfile(P); toast('Héros favori ✓'); close(); render(); } }, 'Mettre en vedette'), h('span', { class: 'tip grow' }, '✓ Dans ton deck'))
          : h('div', { class: 'row gap' }, h('button', { class: 'btn ghost', onclick: () => { P.avatar = id; saveProfile(P); toast('Héros favori ✓'); close(); render(); } }, 'Vedette'), h('button', { class: 'btn big gold grow', onclick: () => { swapIn = id; tab = 'heroes'; close(); render(); } }, 'Mettre dans le deck'))));
  document.body.append(page);
  requestAnimationFrame(() => { if (stage) stage.spin = 0; sc = new Showcase(cv, { world: worldOf(P).key, heroId: id, mode: 'hero', skin: P.skins.eq[id] }); });
}

// ---------- Équipement : 2 emplacements par héros (Arme, Talisman) ----------
const pct = v => '+' + Math.round(v * 100) + ' %';
const bonusTxt = b => Object.entries(b).filter(([, v]) => v).map(([k, v]) => pct(v) + ' ' + STAT_NAME[k].toLowerCase()).join(' · ');
function itemEl(id, cls = '') { const it = itemById(id), e = h('span', { class: 'it-ic ' + cls, style: { '--rc': RARITIES[it.rar].color } }); e.innerHTML = itemIcon(id); return e; }
function gearBlock(id, reopen) {
  const ids = heroItems(P, id), g = heroGear(P, id), tot = bonusTxt(g), all = itemsFor(id), n = unlockedCount(P, id);
  return h('div', { class: 'gear-box' },
    h('div', { class: 'gb-head' }, h('h4', {}, 'Équipement'), h('small', {}, tot || 'Aucun bonus pour l’instant')),
    h('div', { class: 'gb-slots' }, SLOTS.map((S, i) => {
      const it = ids[i] && itemById(ids[i]);
      return h('button', { class: 'gb-slot' + (it ? ' full' : ''), style: it ? { '--rc': RARITIES[it.rar].color } : {}, onclick: () => { sfx('click'); openBag(id, i, reopen); } },
        it ? itemEl(it.id) : h('span', { class: 'gb-empty' }, '+'),
        h('div', { class: 'gb-txt' }, h('small', {}, it ? S.name + ' · ' + it.type : S.name), h('b', {}, it ? it.name : 'Vide'), h('em', {}, it ? bonusTxt(it.b) : S.hint)));
    })),
    h('div', { class: 'gb-coll' }, h('small', {}, 'Collection de ' + HERO[id].name + ' · ' + n + ' / 10'),
      h('div', { class: 'gb-grid' }, all.map(it => { const st = itemState(P, it.id), e = itemEl(it.id, 'sm' + (st.ok ? '' : ' locked')); e.title = it.name; e.onclick = () => { sfx('click'); openBag(id, it.slot === 'arme' ? 0 : 1, reopen); }; return e; }))),
    h('p', { class: 'gb-note' }, 'Débloque ses objets en le faisant monter de niveau et en gagnant avec lui, ou forge-les avec des cristaux. Bonus plafonnés : l’IA a des objets du même niveau.'));
}
function openBag(hero, slot, reopen) {
  const S = SLOTS[slot], cur = (P.equip[hero] || [])[slot];
  const list = itemsFor(hero).filter(it => it.slot === S.id);
  const base = heroGear(P, hero), other = heroItems(P, hero).filter((x, i) => i !== slot && x);
  let s;
  const row = it => {
    const st = itemState(P, it.id), mine = it.id === cur, after = gearBonus([...other, it.id]);
    const diff = Object.keys(STAT_NAME).filter(k => Math.abs(after[k] - base[k]) > 1e-6).map(k => h('span', { class: after[k] > base[k] ? 'up' : 'down' }, (after[k] > base[k] ? '▲ ' : '▼ ') + STAT_NAME[k] + ' ' + pct(base[k]) + ' → ' + pct(after[k])));
    const act = mine ? h('button', { class: 'btn small ghost', onclick: () => { unequipItem(P, hero, slot); sfx('click'); s.close(); reopen(); } }, 'Retirer')
      : st.ok ? h('button', { class: 'btn small gold', onclick: () => { equipItem(P, hero, it.id); sfx('fuse'); toast(it.name + ' équipé ✓'); s.close(); reopen(); } }, 'Équiper')
      : h('button', { class: 'btn small forge' + (P.crystals >= it.forge ? '' : ' off'), onclick: () => { const e = forgeItem(P, it.id); if (e) return toast(e, 'bad'); sfx('fuse'); toast(it.name + ' forgé ✓'); s.close(); openBag(hero, slot, reopen); } }, h('span', {}, 'Forger'), h('small', {}, icon('crystal'), it.forge));
    return h('div', { class: 'bag-row' + (mine ? ' on' : '') + (st.ok ? '' : ' locked'), style: { '--rc': RARITIES[it.rar].color } }, itemEl(it.id, st.ok ? '' : 'locked'),
      h('div', { class: 'bag-txt' }, h('b', {}, it.name), h('small', { class: 'irar' }, it.type + ' · ' + RARITIES[it.rar].name + ' · ' + bonusTxt(it.b)), h('em', {}, it.desc),
        st.ok ? (diff.length && !mine ? h('div', { class: 'bag-diff' }, diff) : null)
          : h('div', { class: 'bag-lock' }, h('small', {}, icon('lock'), ' ' + st.txt + (st.now ? ' · ' + st.now : '')), h('div', { class: 'bag-bar' }, h('i', { style: { width: Math.round(st.prog * 100) + '%' } })))),
      act);
  };
  s = sheet(h('div', { class: 'bag' }, h('h3', {}, S.name + ' de ' + HERO[hero].name), h('p', { class: 'muted' }, S.hint + ' · tes cristaux : ' + P.crystals),
    h('div', { class: 'bag-list' }, list.map(row))));
}

// ---------- Mondes ----------
function openWorlds() {
  const page = h('div', { class: 'worlds' },
    h('div', { class: 'w-head' }, h('h2', {}, 'Les Mondes de Mythoria'), h('button', { class: 'hd-close', onclick: () => page.remove() }, icon('close'))),
    WORLDS.map(w => {
      const T = THEMES[w.key], open = P.trophies >= w.trophies;
      return h('div', { class: 'wcard' + (open ? '' : ' locked'), style: { '--s1': T.skyTop, '--s2': T.skyBot, '--g': T.ground, '--fc': FACTIONS[w.fac].color } },
        h('div', { class: 'w-art' }, h('div', { class: 'w-isle' }), h('span', { class: 'w-n' }, w.id + 1)),
        h('div', { class: 'w-txt' }, h('b', {}, w.name), h('small', {}, w.tag),
          h('div', { class: 'w-meta' }, h('span', { class: 'chip on', style: { '--fc': FACTIONS[w.fac].color } }, FACTIONS[w.fac].name), open ? h('span', { class: 'chip on', style: { '--fc': '#7dff9a' } }, 'Ouvert') : h('span', { class: 'chip' }, icon('trophy'), w.trophies)),
          h('div', { class: 'mini-row' }, (UNLOCKS[w.id] || []).slice(0, 5).map(id => h('div', { class: 'mini sm', style: { '--rc': RARITIES[HERO[id].rar].color } }, portraitImg(id)))),
          open ? h('button', { class: 'btn small gold', onclick: () => { page.remove(); trainingIn(w); } }, 'S’entraîner ici') : null));
    }));
  document.body.append(page);
}
function trainingIn(w) {
  const s = sheet(h('div', { class: 'modes' }, h('h3', {}, w.name), h('p', { class: 'muted' }, 'Entraînement (sans trophées). Choisis le niveau de l’IA :'),
    h('div', { class: 'lvls' }, AI_LEVELS.map((L, i) => h('button', { class: 'btn', onclick: () => { s.close(); play('training', i, w); } }, (i + 1) + '. ' + L.name)))));
}

// ---------- Profil, réglages, aide ----------
function openProfile() {
  sfx('click');
  const input = h('input', { class: 'inp', maxlength: 16, value: P.name });
  const st = P.stats, rate = st.played ? Math.round(st.w / st.played * 100) : 0;
  const s = sheet(h('div', { class: 'profile' },
    h('h3', {}, 'Ton profil'),
    h('label', {}, 'Pseudo'), h('div', { class: 'row gap' }, input, h('button', { class: 'btn gold', onclick: () => {
      const v = cleanName(input.value);
      if (v.length < 3) return toast('3 caractères minimum', 'bad');
      P.name = v; P.named = true; saveProfile(P); toast('Pseudo enregistré ✓'); s.close(); render();
    } }, 'OK')),
    h('label', {}, 'Héros favori (avatar)'),
    h('div', { class: 'avatars' }, owned(P).map(id => h('button', { class: 'av' + (P.avatar === id ? ' on' : ''), onclick: () => { P.avatar = id; saveProfile(P); s.close(); render(); } }, portraitImg(id)))),
    h('div', { class: 'stats' }, [['Niveau', P.lvl], ['Trophées', P.trophies], ['Record', P.best], ['Combats (arène)', st.played], ['Victoires', st.w + ' (' + rate + ' %)'], ['Cœurs tenus', st.hearts]]
      .map(([k, v]) => h('div', { class: 'st' }, h('small', {}, k), h('b', {}, v)))),
    h('h4', {}, 'Historique'),
    P.hist.length ? h('div', { class: 'hist' }, P.hist.slice(0, 15).map(x => h('div', { class: 'hrow ' + x.result },
      h('span', {}, x.result === 'win' ? '✅' : x.result === 'loss' ? '❌' : '➖'),
      h('span', { class: 'grow' }, (x.mode === 'arena' ? 'Arène' : 'Entraînement') + ' · 🤖 ' + x.opp),
      h('span', { class: 'muted' }, x.myHp + '% / ' + x.oppHp + '%'),
      h('span', {}, x.mode === 'arena' ? (x.trophies >= 0 ? '+' : '') + x.trophies : '')))) : h('p', { class: 'muted' }, 'Aucun combat pour l’instant.'),
    h('p', { class: 'muted' }, 'Compte en ligne (changer de téléphone sans rien perdre) : phase 3.')));
}


function openSettings() {
  sfx('click');
  const s = sheet(h('div', { class: 'settings' },
    h('h3', {}, 'Réglages'),
    h('button', { class: 'btn ghost wide', onclick: () => { P.sound = !P.sound; setSound(P.sound); saveProfile(P); s.close(); openSettings(); } }, icon('sound'), P.sound ? ' Son : activé' : ' Son : coupé'),
    ...['m', 's'].map(k => { const V = getVolumes(); return h('label', { class: 'vol' }, h('span', {}, k === 'm' ? '🎵 Musique' : '🔊 Bruitages'), h('input', { type: 'range', min: 0, max: 100, value: Math.round(V[k] * 100), oninput: e => { const W = getVolumes(); W[k] = e.target.value / 100; setVolumes(W.m, W.s); }, onchange: () => k === 's' && sfx('coin') })); }),
    h('h4', {}, '🎨 Graphismes'),
    h('div', { class: 'gfx' }, GFX_LEVELS.map(l => h('button', { class: 'gfxb' + (gfxChoice() === l.id ? ' on' : ''), onclick: () => { setGfx(l.id); sfx('click'); s.close(); openSettings(); render(); toast('Graphismes : ' + l.name + (l.id === 'auto' ? ' (' + GFX_LEVELS.find(x => x.id === autoLevel()).name + ')' : '')); } }, l.name))),
    h('p', { class: 'muted small' }, (GFX_LEVELS.find(l => l.id === gfxChoice()) || GFX_LEVELS[0]).desc + (gfxChoice() === 'auto' ? ' Sur ce téléphone : ' + GFX_LEVELS.find(x => x.id === autoLevel()).name + '.' : '') + ' S’applique au prochain écran 3D (combat, menu).'),
    h('button', { class: 'btn ghost wide', onclick: () => { setShowFps(!showFps()); s.close(); openSettings(); } }, showFps() ? '📈 Compteur d’images (FPS) : affiché' : '📈 Compteur d’images (FPS) : caché'),
    h('h4', {}, '⚙️ Général'),
    h('button', { class: 'btn ghost wide', onclick: install }, icon('install'), ' Installer le jeu sur l’écran d’accueil'),
    h('button', { class: 'btn ghost wide', onclick: share }, icon('share'), ' Partager le jeu'),
    h('button', { class: 'btn ghost wide', onclick: () => { s.close(); if (stage) { stage.dispose(); stage = null; } stopMusic(); playIntro({ force: true }).then(() => render()); } }, icon('play'), ' Revoir l’introduction (Saison 1)'),
    h('button', { class: 'btn ghost wide', onclick: () => { s.close(); play('training', 0, worldOf(P), { tuto: true, title: 'Tutoriel' }); } }, icon('play'), ' Revoir le tutoriel'),
    h('button', { class: 'btn ghost wide', onclick: openRoadmap }, icon('map'), ' Le plan du jeu'),
    h('button', { class: 'btn ghost wide', onclick: () => window.__checkUpdate && window.__checkUpdate(true) }, icon('summon'), ' Chercher une mise à jour'),
    h('button', { class: 'btn red wide', onclick: async () => { if (await confirmBox('Effacer toute ta progression sur ce téléphone ?', 'Tout effacer')) { resetProfile(); P = loadProfile(); s.close(); render(); toast('Progression effacée'); } } }, 'Recommencer à zéro'),
    h('p', { class: 'muted center' }, 'MYTHORIA · version ' + APP.version),
    h('p', { class: 'muted center small' }, 'Modèles 3D : KayKit (Kay Lousberg) et Quaternius, licence CC0. Moteur 3D : three.js.')));
}
function install() { doInstall(); }
async function share() {
  const url = location.href.split('#')[0].split('?')[0];
  if (navigator.share) { try { await navigator.share({ title: 'MYTHORIA', text: 'Viens jouer à MYTHORIA avec moi !', url }); } catch (e) {} }
  else { try { await navigator.clipboard.writeText(url); toast('Lien copié ✓'); } catch (e) { toast(url); } }
}
function openHowTo() {
  sheet(h('div', { class: 'howto' },
    h('h3', {}, 'Comment jouer'),
    h('ol', {},
      h('li', {}, h('b', {}, 'But : '), 'détruire le Sanctuaire ennemi (au fond de l’île). Sinon, au bout de 3 minutes, gagne celui dont le Sanctuaire a le plus de vie.'),
      h('li', {}, h('b', {}, 'Invoquer : '), 'le bouton « Invoquer » (2 éther) fait apparaître un héros au hasard de ton deck sur ton Cercle d’Invocation (5 places, devant l’île). Les héros rares sortent moins souvent.'),
      h('li', {}, h('b', {}, 'Fusionner : '), 'glisse un héros sur un héros identique de même rang : il évolue en ★2, puis ★3 (beaucoup plus fort).'),
      h('li', {}, h('b', {}, 'Envoyer au combat : '), 'touche un héros du Cercle puis touche ta moitié de l’île (zone bleue), ou fais-le glisser. Il se bat tout seul.'),
      h('li', {}, h('b', {}, 'Cœur de Mythe : '), 'le cristal au centre. Si tes héros au sol sont seuls à côté, tu le captures : +35 % d’éther et jauge d’Éveil plus rapide. Les volants ne capturent pas.'),
      h('li', {}, h('b', {}, 'Volants : '), 'les tirs à distance (archers, mages, tours) leur font +35 % de dégâts.'),
      h('li', {}, h('b', {}, 'Sortilège : '), 'quand la jauge d’Éveil est pleine, touche le bouton rond à gauche puis l’île.'),
      h('li', {}, h('b', {}, 'Synergies : '), '3 héros d’une même faction dans ton deck = bonus, 5 = gros bonus.')),
    h('p', { class: 'muted' }, 'Astuce : garde deux places libres sur ton Cercle pour pouvoir fusionner.')));
}
function openRoadmap() {
  const ph = [
    ['1', 'Fondation', 'Architecture, menus, interface mobile', 'ok'],
    ['2', 'Premier vrai jeu', 'Héros 3D animés, invocation, fusion, Cœur de Mythe, 6 mondes, IA', 'ok'],
    ['3', 'Multijoueur', 'Comptes, serveur, matchmaking, vrais adversaires, sauvegarde en ligne', 'next'],
    ['4', 'Royaume', 'Ton île : construction, ressources, défense', ''],
    ['5', 'Progression', 'Niveaux de héros, apparences, coffres, boutique équitable', ''],
    ['6', 'Communauté', 'Amis, clans, chat, tournois, classements', ''],
    ['7', 'Extension', 'Campagne, boss, survie, événements', ''],
  ];
  sheet(h('div', { class: 'roadmap' }, h('h3', {}, 'Le plan de MYTHORIA'),
    ph.map(([n, t, d, st]) => h('div', { class: 'ph ' + st }, h('span', { class: 'phn' }, st === 'ok' ? '✓' : n), h('div', {}, h('b', {}, 'Phase ' + n + ' — ' + t), h('small', {}, d))))));
}
