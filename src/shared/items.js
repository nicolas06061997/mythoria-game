// MYTHORIA — objets d'équipement (19/11) : 2 emplacements par héros (Arme + Talisman).
// Bonus en pourcentage, plafonnés (MAX par caractéristique) pour que l'Arène reste juste ;
// l'IA reçoit des objets du même niveau que le joueur (botGear).
export const SLOTS = [
  { id: 'arme', name: 'Arme', hint: 'Dégâts et vitesse d’attaque' },
  { id: 'talisman', name: 'Talisman', hint: 'Vie et vitesse de déplacement' },
];
// b : bonus (dmg = dégâts, atk = vitesse d'attaque, hp = vie, spd = vitesse) en fraction
export const ITEMS = {
  croc:      { slot: 'arme', rar: 'commun', name: 'Croc de fer', ic: 'fang', b: { dmg: 0.04 }, desc: 'Une dent de fer forgée en pointe.' },
  cadence:   { slot: 'arme', rar: 'commun', name: 'Bracelet de cadence', ic: 'ring', b: { atk: 0.04 }, desc: 'Il cliquette à chaque coup, de plus en plus vite.' },
  runelame:  { slot: 'arme', rar: 'rare', name: 'Lame runique', ic: 'blade', b: { dmg: 0.07 }, desc: 'Ses runes brillent quand l’ennemi approche.' },
  gantelet:  { slot: 'arme', rar: 'rare', name: 'Gantelet vif', ic: 'gauntlet', b: { atk: 0.07 }, desc: 'Plus léger qu’une plume, plus dur que la pierre.' },
  braise:    { slot: 'arme', rar: 'epique', name: 'Cœur de braise', ic: 'ember', b: { dmg: 0.10 }, desc: 'Une braise d’Ignar qui ne s’éteint jamais.' },
  orage:     { slot: 'arme', rar: 'epique', name: 'Fil d’orage', ic: 'bolt', b: { dmg: 0.06, atk: 0.05 }, desc: 'Un éclair enroulé comme une corde.' },
  cuir:      { slot: 'talisman', rar: 'commun', name: 'Amulette de cuir', ic: 'pouch', b: { hp: 0.05 }, desc: 'Cousue par une grand-mère d’Aurore. Elle porte chance.' },
  plume:     { slot: 'talisman', rar: 'commun', name: 'Plume du vent', ic: 'feather', b: { spd: 0.06 }, desc: 'Tombée d’un griffon en plein vol.' },
  ecaille:   { slot: 'talisman', rar: 'rare', name: 'Écaille de wyrm', ic: 'scale', b: { hp: 0.09 }, desc: 'Aucune lame n’a jamais réussi à la rayer.' },
  sablier:   { slot: 'talisman', rar: 'rare', name: 'Sablier d’éther', ic: 'hourglass', b: { spd: 0.10 }, desc: 'Le sable y coule à l’envers.' },
  egide:     { slot: 'talisman', rar: 'epique', name: 'Égide de l’Aube', ic: 'aegis', b: { hp: 0.12 }, desc: 'Le bouclier sacré de la première paladine.' },
  seve:      { slot: 'talisman', rar: 'epique', name: 'Sève éternelle', ic: 'leaf', b: { hp: 0.07, spd: 0.06 }, desc: 'Une goutte du plus vieil arbre de la Sylve.' },
};
export const ITEM_MAX = { dmg: 0.12, atk: 0.10, hp: 0.14, spd: 0.12 };
export const STAT_NAME = { dmg: 'Dégâts', atk: 'Vitesse d’attaque', hp: 'Vie', spd: 'Vitesse' };

// Bonus total d'une liste d'objets (ids), plafonné
export function gearBonus(ids) {
  const o = { dmg: 0, atk: 0, hp: 0, spd: 0 };
  for (const id of ids || []) { const it = ITEMS[id]; if (it) for (const k in it.b) o[k] += it.b[k]; }
  for (const k in o) o[k] = Math.min(ITEM_MAX[k], o[k]);
  return o;
}
// Objet tiré d'un coffre (ou rien). rng : fonction 0..1
const DROP = { bois: [0.25, 0, 0], argent: [0.5, 0.15, 0], or: [0.8, 0.35, 0.05], magique: [1, 0.55, 0.15], legendaire: [1, 0.7, 0.35] };
export function rollItem(rng, chest) {
  const [p, rare, epic] = DROP[chest] || DROP.bois;
  if (rng() >= p) return null;
  const x = rng(), rar = x < epic ? 'epique' : x < epic + rare ? 'rare' : 'commun';
  const list = Object.keys(ITEMS).filter(id => ITEMS[id].rar === rar);
  return list[Math.floor(rng() * list.length)];
}
// Objets de l'IA : même niveau que le joueur (selon les trophées), le même pour tous ses héros
export function botGear(deck, trophies) {
  const t = trophies >= 850 ? ['braise', 'egide'] : trophies >= 300 ? ['runelame', 'ecaille'] : trophies >= 120 ? ['croc', 'cuir'] : [];
  const b = gearBonus(t), o = {};
  if (t.length) for (const id of deck) o[id] = b;
  return o;
}
