// MYTHORIA — campagne (phase 7) : 6 chapitres (un par monde), 5 étapes chacun, un boss à la fin.
// Plus : événements de la semaine, tournoi contre l'IA, survie.
import { WORLDS, HERO, unlockedHeroes } from './content.js';
import { makeRng, shuffle } from './rng.js';

export const BOSSES = [
  { base: 'frere', name: 'Le Chevalier Noir', title: 'Gardien déchu de l’Aube', hp: 2200, dmg: 46, r: 1.15, scale: 2.0, skin: 'nuit',
    skills: [{ k: 'slam', every: 9, dmg: 53, r: 2.8 }, { k: 'summon', every: 13, id: 'ecuyer', n: 2 }],
    intro: 'Le Chevalier Noir a trahi l’Ordre de l’Aube. Il garde le pont du Royaume d’Aurore.' },
  { base: 'golem', name: 'Gorgoroth', title: 'Golem ancien de la Sylve', hp: 3400, dmg: 57, r: 1.4, scale: 1.9,
    skills: [{ k: 'slam', every: 8, dmg: 66, r: 3.2 }, { k: 'summon', every: 11, id: 'pousse', n: 3 }, { k: 'heal', every: 15, pct: 0.06 }],
    intro: 'Réveillé par une malédiction, Gorgoroth écrase tout ce qui pousse… sauf ses ronces.' },
  { base: 'vael', name: 'L’Archimage Déchu', title: 'Ancien rival de Vael', hp: 3900, dmg: 51, r: 1.1, scale: 2.0, skin: 'spectre', range: 5, proj: 'orb', splash: 1.6, spd: 0.8,
    skills: [{ k: 'fire', every: 7, dmg: 92 }, { k: 'freeze', every: 12, r: 3.4, t: 2 }],
    intro: 'Chassé de l’Académie, il revient avec des sorts interdits. Méfie-toi de ses météores.' },
  { base: 'ignar', name: 'Ignar l’Ancestral', title: 'Le Père de tous les dragons', hp: 5000, dmg: 57, r: 1.3, scale: 1.25, fly: true, range: 3.5, proj: 'fire', splash: 2, spd: 0.8,
    skills: [{ k: 'fire', every: 6, dmg: 106 }, { k: 'slam', every: 10, dmg: 70, r: 3.4 }],
    intro: 'Le vieux dragon s’est réveillé de mauvaise humeur. Des archers, vite !' },
  { base: 'jarl', name: 'Le Roi des Glaces', title: 'Seigneur de l’hiver éternel', hp: 5800, dmg: 66, r: 1.3, scale: 2.3, skin: 'givre',
    skills: [{ k: 'freeze', every: 9, r: 3.8, t: 2.5 }, { k: 'slam', every: 8, dmg: 75, r: 3.2 }, { k: 'summon', every: 14, id: 'jarl', n: 2 }],
    intro: 'Il a gelé la mer entière pour atteindre les Terres de Givre.' },
  { base: 'malakar', name: 'Malakar', title: 'Roi des Ombres (forme ultime)', hp: 7400, dmg: 73, r: 1.4, scale: 1.25,
    skills: [{ k: 'summon', every: 9, id: 'squelette', n: 3 }, { k: 'slam', every: 8, dmg: 79, r: 3.4 }, { k: 'heal', every: 14, pct: 0.06 }, { k: 'fire', every: 11, dmg: 99 }],
    intro: 'Le premier roi de Mythoria veut son trône. C’est le combat final.' },
];

const STAGE_NAMES = [
  ['Le pont des Écuyers', 'Les champs dorés', 'La garnison', 'Les remparts', 'Le Chevalier Noir'],
  ['L’orée du bois', 'Le lac aux lucioles', 'Le cercle de pierres', 'Le cœur de la forêt', 'Gorgoroth'],
  ['Les portes de l’Académie', 'La bibliothèque', 'La tour des runes', 'L’observatoire', 'L’Archimage Déchu'],
  ['La coulée de lave', 'Les forges', 'Le nid des dragonnets', 'Le cratère', 'Ignar l’Ancestral'],
  ['Le glacier bleu', 'Le village gelé', 'La forteresse de glace', 'Le trône d’hiver', 'Le Roi des Glaces'],
  ['Les ruines maudites', 'Le cimetière', 'La crypte', 'La salle du trône', 'Malakar'],
];

export const CHAPTERS = WORLDS.map((w, c) => ({
  world: w, boss: BOSSES[c],
  stages: STAGE_NAMES[c].map((name, i) => ({
    n: c * 5 + i, name, boss: i === 4,
    ai: Math.max(0, Math.min(3, Math.floor(c * 0.6 + i * 0.3)) - (i === 4 ? 1 : 0)),
    lvl: 1 + Math.round(c * 1.0 + i * 0.15),
    reward: i === 4 ? { gold: 200 + c * 150, gems: 15 + c * 5, chest: c >= 3 ? 'legendaire' : 'magique' } : { gold: 60 + c * 40 + i * 10, crystals: c >= 2 ? 10 + c * 5 : 0 },
  })),
}));
export const stageOf = n => CHAPTERS[Math.floor(n / 5)]?.stages[n % 5];

// Deck d'un adversaire : héros du monde (faction) + héros débloqués à ce stade.
export function enemyDeck(worldId, seed) {
  const w = WORLDS[worldId], rng = makeRng(seed);
  const pool = shuffle(unlockedHeroes(w.trophies).slice(), rng);
  const deck = pool.filter(id => HERO[id].fac === w.fac).slice(0, 4);
  for (const id of pool) if (deck.length < 8 && !deck.includes(id)) deck.push(id);
  return deck;
}

// ---------- Événements de la semaine ----------
export const EVENTS = [
  { key: 'ether', name: 'Tempête d’éther', desc: 'L’éther coule à flots : +60 % d’éther pour tout le monde.', mods: { mana: 1.6 } },
  { key: 'fusion', name: 'Fusion céleste', desc: 'Tous les héros invoqués arrivent directement en ★2.', mods: { startStar: 2 } },
  { key: 'eveil', name: 'Éveil ardent', desc: 'Les jauges d’Éveil se remplissent 2,5× plus vite : pluie de sortilèges !', mods: { eveil: 2.5 } },
  { key: 'chaos', name: 'Chaos des Failles', desc: 'Éther +30 % et héros ★2 dès l’invocation.', mods: { mana: 1.3, startStar: 2 } },
];
export const eventOf = week => EVENTS[((week % EVENTS.length) + EVENTS.length) % EVENTS.length];
export const EVENT_REWARD = { gold: 90, crystals: 15 };
export const EVENT_WINS_PER_DAY = 5;

// ---------- Tournoi contre l'IA (3 manches) ----------
export const TOURNEY = { rounds: 3, reward: [{ gold: 80 }, { gold: 160, gems: 5 }, { gold: 300, gems: 15, chest: 'magique' }] };

// ---------- Survie : vagues selon le monde ----------
export function survivalWaves(worldId) {
  const w = WORLDS[worldId];
  const pools = { aube: ['ecuyer', 'squelette', 'pousse'], sylve: ['loups', 'pousse', 'archeres'], arcane: ['apprenti', 'squelette', 'pousse'], braise: ['follets', 'brann', 'squelette'], givre: ['jarl', 'frimas', 'squelette'], ombre: ['squelettes', 'osseuse', 'squelette'] };
  return { pool: pools[w.fac] || ['squelette'], lvl: 1 + worldId, bosses: BOSSES.slice(0, worldId + 1).map(b => ({ ...b, hp: Math.round(b.hp * 0.5) })) };
}

// ---------- Expédition (roguelike court, 19/11) ----------
// 5 combats d'affilée ; après chaque victoire, le joueur choisit 1 relique parmi 3. Une défaite termine l'expédition.
// Les reliques sont appliquées par la simulation (sim.js, option `relics`).
export const RELICS = {
  onde:     { name: 'Onde de fusion',   icon: '💥', desc: 'Tes héros fusionnés (★2 et ★3) créent une onde de choc en arrivant sur l’île.' },
  coeur:    { name: 'Cœur vorace',      icon: '❤️‍🔥', desc: 'Le Cœur de Mythe te donne +100 % d’éther… mais draine la vie de ceux qui le tiennent.' },
  reserve:  { name: 'Réserve d’éther',  icon: '💧', desc: 'Tu commences chaque combat avec 3 éther de plus.' },
  sagesse:  { name: 'Grimoire d’Éveil', icon: '📖', desc: 'Ta jauge d’Éveil se remplit 40 % plus vite.' },
  egide:    { name: 'Égide de l’Aube',  icon: '🛡', desc: 'Tous tes héros arrivent avec un bouclier de 15 % de leur vie.' },
  fureur:   { name: 'Lame de fureur',   icon: '⚔️', desc: 'Tes héros font +15 % de dégâts.' },
  vigueur:  { name: 'Sève de vigueur',  icon: '🌿', desc: 'Tes héros ont +15 % de vie.' },
  alchimie: { name: 'Alchimie',         icon: '⚗️', desc: 'Recycler un socle rend 2 éther au lieu de 1.' },
  etoile:   { name: 'Étoile filante',   icon: '🌠', desc: '1 invocation sur 5 arrive directement en ★2.' },
  rempart:  { name: 'Rempart sacré',    icon: '🏯', desc: 'Ton Sanctuaire a +20 % de vie.' },
  vampire:  { name: 'Calice sanglant',  icon: '🍷', desc: 'Tous tes héros volent 8 % des dégâts qu’ils infligent.' },
  celerite: { name: 'Bottes de célérité', icon: '🪽', desc: 'Tes héros bougent et frappent 12 % plus vite.' },
};
export const EXPE = {
  stages: 5,
  // niveau d'IA (ajouté à la base du monde) et niveau des héros ennemis pour chaque combat
  ai: [0, 0, 1, 1, 2], lvl: [0, 1, 1, 2, 3],
  reward: [{ gold: 40 }, { gold: 60 }, { gold: 90, crystals: 10 }, { gold: 120, crystals: 15 }, { gold: 250, gems: 15, chest: 'magique' }],
  names: ['Les Failles extérieures', 'Le pont brisé', 'La forêt de cristal', 'Le gouffre hurlant', 'Le Gardien de la Faille'],
};
// 3 reliques au hasard (déterministe), sans celles déjà possédées
export function relicChoices(seed, have = []) {
  const pool = Object.keys(RELICS).filter(k => !have.includes(k));
  return shuffle(pool, makeRng(seed)).slice(0, 3);
}

// ---------- Défi du jour (graine fixe, 19/11) ----------
// Le même pour tout le monde le même jour : deck imposé, adversaire et graine du combat identiques, mode équilibré.
// Le score se partage par simple message (pas besoin de serveur).
const DAILY_KINDS = [
  { k: 'boss',  name: 'Chasse au boss',     desc: s => 'Abats ' + s.boss.name + ' et son Sanctuaire en moins de ' + s.limit + ' secondes.' },
  { k: 'blitz', name: 'Blitz',              desc: s => 'Détruis le Sanctuaire ennemi en moins de ' + s.limit + ' secondes.' },
  { k: 'mur',   name: 'Mur infranchissable', desc: s => 'Gagne en gardant au moins ' + s.minHp + ' % de vie à ton Sanctuaire.' },
];
export function dailyChallenge(day) {
  const rng = makeRng(day * 7919 + 17);
  const kind = DAILY_KINDS[Math.floor(rng() * DAILY_KINDS.length)];
  const all = PLAYABLE_IDS();
  const deck = shuffle(all.slice(), rng).slice(0, 8);
  const opp = shuffle(all.slice(), rng).slice(0, 8);
  const spells = ['meteore', 'givre', 'benediction', 'foudre', 'eruption', 'racines', 'malediction'];
  const d = { day, kind: kind.k, name: kind.name, seed: (day * 2654435761) >>> 0, deck, oppDeck: opp,
    spell: spells[Math.floor(rng() * spells.length)], oppSpell: spells[Math.floor(rng() * spells.length)],
    ai: 2 + Math.floor(rng() * 2), world: Math.floor(rng() * WORLDS.length), level: 5 };
  if (kind.k === 'boss') { d.boss = BOSSES[Math.floor(rng() * 3)]; d.limit = 150; }
  if (kind.k === 'blitz') d.limit = 120;
  if (kind.k === 'mur') d.minHp = 60;
  d.desc = kind.desc(d);
  return d;
}
// score : plus il reste de temps et de vie, mieux c'est
export function dailyScore(d, r) {
  if (r.result !== 'win') return 0;
  if (d.kind === 'mur' && r.myHp * 100 < d.minHp) return 0;
  const left = Math.max(0, (d.limit || 180) - r.time);
  return Math.round(1000 + left * 10 + r.myHp * 1000);
}
const PLAYABLE_IDS = () => Object.values(HERO).filter(c => !c.token).map(c => c.id);
