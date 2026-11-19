// MYTHORIA — équipement (19/11) : chaque héros a SES 10 objets (5 armes, 5 talismans), 2 portés à la fois.
// Noms tirés du héros (classe, famille, nom) ; bonus modestes et plafonnés (ITEM_MAX) ; l'IA reçoit des objets
// du même niveau que le joueur (botGear). Déblocage : progression du héros (niveau, victoires) ou forge (cristaux).
import { HERO, HEROES } from './content.js';

export const SLOTS = [
  { id: 'arme', name: 'Arme', hint: 'Dégâts et vitesse d’attaque' },
  { id: 'talisman', name: 'Talisman', hint: 'Vie et vitesse de déplacement' },
];
export const ITEM_MAX = { dmg: 0.12, atk: 0.10, hp: 0.14, spd: 0.12 };
export const STAT_NAME = { dmg: 'Dégâts', atk: 'Vitesse d’attaque', hp: 'Vie', spd: 'Vitesse' };
export const IRAR = ['commun', 'rare', 'rare', 'epique', 'legendaire'];
// bonus par rang (0 = commun … 4 = légendaire au nom du héros)
const B_ARME = [{ dmg: 0.03 }, { dmg: 0.05 }, { atk: 0.05 }, { dmg: 0.06, atk: 0.03 }, { dmg: 0.08, atk: 0.04 }];
const B_TAL = [{ hp: 0.04 }, { hp: 0.06 }, { spd: 0.06 }, { hp: 0.07, spd: 0.04 }, { hp: 0.09, spd: 0.05 }];
// conditions de déblocage par rang : lvl = niveau du héros, win = victoires avec le héros dans le deck ; forge = cristaux
export const UNLOCK = {
  arme: [{}, { lvl: 3 }, { win: 10 }, { lvl: 6 }, { win: 40 }],
  talisman: [{}, { win: 5 }, { lvl: 4 }, { win: 25 }, { lvl: 8 }],
};
export const FORGE = [0, 40, 40, 120, 300];

function classOf(c) {
  const m = c.model || {};
  if (c.type === 'building') return 'construct';
  if (m.proc || m.beast) return 'beast';
  if (/Mage/.test(m.glb || '')) return 'mage';
  if ((c.range || 0) >= 3) return 'ranged';
  return 'melee';
}
const NOUN = {
  melee: [['Lame', 'blade'], ['Épée', 'blade'], ['Hache', 'axe'], ['Gantelet', 'gauntlet'], ['Glaive', 'blade']],
  ranged: [['Arc', 'bow'], ['Carquois', 'quiver'], ['Arbalète', 'bow'], ['Gantelet', 'gauntlet'], ['Arc long', 'bow']],
  mage: [['Baguette', 'staff'], ['Grimoire', 'book'], ['Orbe', 'orb'], ['Sceptre', 'staff'], ['Bâton', 'staff']],
  beast: [['Griffes', 'claw'], ['Crocs', 'fang'], ['Serres', 'claw'], ['Corne', 'horn'], ['Dard', 'fang']],
  construct: [['Noyau', 'orb'], ['Prisme', 'gem'], ['Rune', 'rune'], ['Cristal', 'gem'], ['Foyer', 'ember']],
};
const TNOUN = {
  beast: [['Collier', 'collar'], ['Écailles', 'scale'], ['Plume', 'feather'], ['Totem', 'totem'], ['Cœur', 'heart']],
  other: [['Amulette', 'amulet'], ['Anneau', 'ring'], ['Bottes', 'boots'], ['Cape', 'cape'], ['Couronne', 'crown']],
};
const EPI_UNUSED = {
  aube: ['de l’Aurore', 'du Soleil Levant', 'du Premier Rayon'], sylve: ['des Ronces', 'du Vieux Chêne', 'de la Sève Ancienne'],
  arcane: ['des Arcanes', 'des Étoiles', 'de la Faille Astrale'], braise: ['de Braise', 'du Volcan', 'du Cœur d’Ignar'],
  givre: ['du Givre', 'des Neiges Éternelles', 'de la Reine des Glaces'], ombre: ['des Ombres', 'du Tombeau', 'du Roi Déchu'],
  neutre: ['des Forges', 'du Siège', 'des Titans'],
};
const OWNER = { loups: 'de la Meute', squelettes: 'des Os-Errants', follets: 'des Feux-Follets', salamandre: 'des Ysquilles', archeres: 'de Lys & Faye', tourelle: 'de l’Obélisque', belier: 'de Fracas' };
const of = c => OWNER[c.id] || (/^[AEIOUYÉÈÊÂÎÔH]/i.test(c.name) ? 'd’' : 'de ') + c.name;
// noms propres inventés (uniques dans tout le jeu), au son de chaque famille
const SYL = {
  aube: [['Sol', 'Aur', 'Lumi', 'Clar', 'Héli', 'Orif', 'Séra', 'Aubr'], ['aniel', 'ance', 'ys', 'ion', 'aël', 'ine', 'elle', 'and']],
  sylve: [['Syl', 'Ronc', 'Mous', 'Verd', 'Folw', 'Ély', 'Fern', 'Brum'], ['wen', 'ice', 'ane', 'dor', 'ith', 'iel', 'ale', 'ombre']],
  arcane: [['Astr', 'Myr', 'Sél', 'Vey', 'Orl', 'Zéph', 'Céle', 'Ith'], ['oria', 'anis', 'ys', 'eth', 'ion', 'ine', 'aë', 'ax']],
  braise: [['Pyr', 'Cendr', 'Ign', 'Braz', 'Flam', 'Tiz', 'Vulc', 'Ard'], ['ade', 'or', 'ys', 'ane', 'ex', 'eline', 'iss', 'orn']],
  givre: [['Givr', 'Fris', 'Neiv', 'Bor', 'Cryst', 'Hiv', 'Glas', 'Ysk'], ['ane', 'al', 'eth', 'ys', 'ra', 'or', 'ïa', 'ild']],
  ombre: [['Nyx', 'Mor', 'Umbr', 'Vel', 'Nox', 'Sép', 'Drak', 'Fun'], ['ane', 'oth', 'ys', 'ra', 'ith', 'ul', 'esse', 'ark']],
  neutre: [['Ferr', 'Roc', 'Gran', 'Tit', 'Forg', 'Bast', 'Murm', 'Brisc'], ['ane', 'or', 'ys', 'ion', 'ade', 'eth', 'ail', 'ond']],
};
const USED = new Set();
const hash = str => { let x = 2166136261; for (const ch of str) x = Math.imul(x ^ ch.charCodeAt(0), 16777619); return x >>> 0; };
function properName(fac, seed) {
  const [A, B] = SYL[fac] || SYL.neutre;
  const V = /[aeiouyéèëïàâîô]/i;
  for (let t = 0; t < 200; t++) {
    const v = hash(seed + ':' + t), a = A[v % A.length], b = B[(v >>> 8) % B.length], n = a + b;
    // sonorités maladroites refusées : deux voyelles ou la même lettre à la jointure
    if ((V.test(a.slice(-1)) && V.test(b[0])) || a.slice(-1).toLowerCase() === b[0].toLowerCase()) continue;
    if (!USED.has(n)) { USED.add(n); return n; }
  }
  return A[0] + B[0];
}
const FAMILY = { aube: 'l’Ordre de l’Aube', sylve: 'le Peuple de Sylve', arcane: 'le Cercle Arcanique', braise: 'le Clan de la Braise', givre: 'le Serment du Givre', ombre: 'la Légion des Ombres', neutre: 'les nains des Forges' };
const DESC = [
  'Simple et solide, parfait pour débuter.',
  'Forgé dans les ateliers de sa famille.',
  'Un objet rare, transmis de héros en héros.',
  'On dit qu’il a changé le cours d’une bataille.',
  'L’objet légendaire qui porte son nom.',
];
const CACHE = new Map();
// noms : commun = simple ; rare / épique = nom propre unique entre guillemets ; légendaire = au nom du héros
function nameOf(c, noun, k, slot) {
  if (k === 0) return noun + (slot === 'arme' ? ' de Fer' : ' de Voyage');
  if (k === 4) return noun + ' ' + of(c);
  return noun + ' « ' + properName(c.fac, c.id + slot + k) + ' »';
}
function descOf(c, k) { return k === 0 ? DESC[0] : k === 4 ? DESC[4] : k === 3 ? DESC[3] : 'Forgé par ' + (FAMILY[c.fac] || FAMILY.neutre) + '.'; }
// Les 10 objets d'un héros : [arme0, talisman0, arme1, talisman1, …] ; id = « héros:a2 » ou « héros:t4 »
export function itemsFor(hero) {
  if (CACHE.has(hero)) return CACHE.get(hero);
  const c = HERO[hero]; if (!c) return [];
  const cl = classOf(c), tn = cl === 'beast' ? TNOUN.beast : TNOUN.other, out = [];
  for (let k = 0; k < 5; k++) {
    const [an, aic] = NOUN[cl][k], [tnn, tic] = tn[k];
    out.push({ id: hero + ':a' + k, hero, slot: 'arme', k, rar: IRAR[k], ic: aic, b: B_ARME[k], name: nameOf(c, an, k, 'arme'), desc: descOf(c, k), unlock: UNLOCK.arme[k], forge: FORGE[k] });
    out.push({ id: hero + ':t' + k, hero, slot: 'talisman', k, rar: IRAR[k], ic: tic, b: B_TAL[k], name: nameOf(c, tnn, k, 'talisman'), desc: descOf(c, k), unlock: UNLOCK.talisman[k], forge: FORGE[k] });
  }
  CACHE.set(hero, out); return out;
}
export function itemById(id) { if (!id) return null; const h = id.split(':')[0]; return itemsFor(h).find(x => x.id === id) || null; }
export function gearBonus(ids) {
  const o = { dmg: 0, atk: 0, hp: 0, spd: 0 };
  for (const id of ids || []) { const it = itemById(id); if (it) for (const k in it.b) o[k] += it.b[k]; }
  for (const k in o) o[k] = Math.min(ITEM_MAX[k], o[k]);
  return o;
}
// Objets de l'IA : même niveau que le joueur (selon les trophées)
export function botGear(deck, trophies) {
  const k = trophies >= 1200 ? 4 : trophies >= 850 ? 3 : trophies >= 300 ? 1 : trophies >= 120 ? 0 : -1;
  const o = {}; if (k < 0) return o;
  const b = gearBonus([]); for (const s in B_ARME[k]) b[s] += B_ARME[k][s]; for (const s in B_TAL[k]) b[s] += B_TAL[k][s];
  for (const id of deck) o[id] = b;
  return o;
}
export const ALL_ITEMS_COUNT = () => HEROES.filter(c => !c.token).length * 10;

// noms fixés une fois pour toutes dans l'ordre des héros (le même sur tous les téléphones)
for (const c of HEROES) if (!c.token) itemsFor(c.id);
