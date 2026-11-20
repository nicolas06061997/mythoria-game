// MYTHORIA — profil du joueur et progression.
// Sauvegardé sur ce téléphone (localStorage) en attendant le serveur (phase 3) : même interface ensuite.

import { STARTER_DECK, STARTER_SPELL, unlockedHeroes, unlockedSpells, worldFor, WORLDS, HERO, PLAYABLE, validateDeck } from '../shared/content.js';
import { upgradeCost, MAX_LEVEL, ECLATS, ECLAT_CYCLE, ECLAT_MAX, eclatType, rollEclat, purifyPerDay, CONQUEST_MAX, conquestPoints, conquestReward, dayKey, weekKey, dailyShop, makeMissions, LOGIN, SKINS, botHeroLevel } from '../shared/economy.js';
import { makeRng, shuffle } from '../shared/rng.js';
import { cmdrOk } from '../shared/sim.js';
import { SLOTS, gearBonus, itemsFor, itemById } from '../shared/items.js';
import { BUILDINGS, DECOS, newKingdom, canBuild, buildCost, buildTime, speedupGems, produced, kingdomBonus } from '../shared/kingdom.js';

const KEY = 'myt_profile_v2';
export const xpNeed = lvl => 60 + (lvl - 1) * 40;
const now = () => Date.now();

function defaults() {
  return {
    v: 4, name: 'Héros' + Math.floor(1000 + Math.random() * 9000), avatar: 'ecuyer',
    trophies: 0, best: 0, gold: 150, gems: 20, crystals: 0, stone: 100, xp: 0, lvl: 1,
    deck: STARTER_DECK.slice(), spell: STARTER_SPELL, stats: { w: 0, l: 0, d: 0, played: 0, hearts: 0 },
    hist: [], sound: true, created: now(),
    levels: {}, shards: {},
    eclats: [{ type: 'brut', seed: 1 }], eclatIdx: 0, seedN: 0, autel: { day: 0, used: 0 }, conquest: { pts: 0, n: 0 },
    missions: null, shop: null, login: { day: 0, streak: 0, pending: null },
    skins: { owned: [], eq: {} },
    equip: {}, forged: [], heroWins: {},
    kingdom: null, campaign: { done: 0, stars: {} }, records: { survival: 0, hero: 0, tournament: 0 },
  };
}

export function loadProfile() {
  let p = null;
  try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
  const d = defaults();
  if (!p || typeof p !== 'object') {
    try { const o = JSON.parse(localStorage.getItem('myt_profile_v1') || 'null'); if (o) Object.assign(d, { name: o.name || d.name, gold: o.gold || d.gold, gems: o.gems || d.gems, xp: o.xp || 0, lvl: o.lvl || 1 }); } catch (e) {}
    p = d;
  }
  const raw = p;
  p = { ...d, ...p, stats: { ...d.stats, ...(p.stats || {}) }, skins: { ...d.skins, ...(p.skins || {}) }, campaign: { ...d.campaign, ...(p.campaign || {}) }, records: { ...d.records, ...(p.records || {}) }, login: { ...d.login, ...(p.login || {}) } };
  migrateEclats(p, d, raw);
  if (validateDeck(p.deck, owned(p))) p.deck = STARTER_DECK.slice();
  if (!ownedSpells(p).includes(p.spell)) p.spell = STARTER_SPELL;
  if (!HERO[p.avatar]) p.avatar = 'ecuyer';
  if (!cmdrOk(p.commander) || !owned(p).includes(p.commander)) p.commander = defaultCommander(p); // Commandant (Lot 4)
  if (!p.kingdom || typeof p.kingdom !== 'object' || !p.kingdom.b) p.kingdom = newKingdom(now());
  if (!p.kingdom.b.autel) p.kingdom.b.autel = 1; // l'Autel des Failles est offert (sauvegardes d'avant le 19/11)
  if (!p.equip || typeof p.equip !== 'object') p.equip = {};
  for (const h in p.equip) if (!Array.isArray(p.equip[h]) || p.equip[h].some(x => x && !itemById(x))) p.equip[h] = [null, null];
  if (!Array.isArray(p.forged)) p.forged = []; if (!p.heroWins || typeof p.heroWins !== 'object') p.heroWins = {};
  delete p.items; delete p.itemSeq; delete p.itemStart;
  refreshDaily(p);
  finishJob(p);
  return p;
}

// Coffres (avant le 19/11) → Éclats de Faille ; contrôle des valeurs (sauvegarde abîmée ou modifiée)
function migrateEclats(p, d, raw) {
  const num = (v, a = 0) => Number.isFinite(v) ? v : a;
  if (!Array.isArray(raw.eclats)) {
    p.eclats = Array.isArray(p.chests) ? p.chests.filter(c => c && eclatType(c.type)).map(c => ({ type: eclatType(c.type), seed: num(c.seed, 1) | 0 })) : d.eclats;
    p.eclatIdx = num(p.chestIdx);
  }
  delete p.chests; delete p.chestIdx;
  p.eclats = p.eclats.filter(e => e && ECLATS[e.type]).map(e => ({ type: e.type, seed: num(e.seed, 1) | 0 })).slice(0, ECLAT_MAX);
  p.eclatIdx = Math.max(0, num(p.eclatIdx)); p.seedN = Math.max(0, num(p.seedN));
  if (!p.autel || typeof p.autel !== 'object') p.autel = { ...d.autel };
  p.autel = { day: num(p.autel.day), used: Math.max(0, num(p.autel.used)) };
  if (!p.conquest || typeof p.conquest !== 'object') p.conquest = { ...d.conquest };
  p.conquest = { pts: Math.min(CONQUEST_MAX, Math.max(0, num(p.conquest.pts))), n: Math.max(0, num(p.conquest.n)) };
  for (const m of [...(p.missions?.list || []), ...(p.missions?.wlist || [])]) {
    if (m.k === 'chest') { m.k = 'purify'; m.txt = 'Purifie ' + m.n + ' Éclats de Faille'; }
    if (m.reward && m.reward.chest) { m.reward.eclat = eclatType(m.reward.chest); delete m.reward.chest; }
  }
  if (p.login && p.login.pending && p.login.pending.chest) p.login.pending = { eclat: eclatType(p.login.pending.chest) };
}
// graine reproductible par joueur (le futur serveur pourra refaire les mêmes tirages)
function nextSeed(p) { p.seedN = (p.seedN || 0) + 1; return ((p.created || 1) % 2147483647 + Math.imul(p.seedN, 2654435761)) >>> 0; }

// Commandant (Lot 4) : héros débloqué, unité seule (pas de groupe, pas de kamikaze) ; par défaut le héros favori, sinon le plus rare du deck
export const commanderChoices = p => owned(p).filter(cmdrOk);
export function defaultCommander(p) {
  const ch = commanderChoices(p); if (!ch.length) return null;
  if (ch.includes(p.avatar)) return p.avatar;
  const inDeck = (p.deck || []).filter(id => ch.includes(id));
  return inDeck[0] || ch[0];
}
// Commandant de l'IA : un héros débloqué au même niveau de Gloire, choisi par la graine
export function botCommander(trophies, seed) { const ch = unlockedHeroes(trophies).filter(cmdrOk); return ch.length ? ch[seed % ch.length] : null; }

export function saveProfile(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {} }
export function resetProfile() { try { localStorage.removeItem(KEY); localStorage.removeItem('myt_profile_v1'); } catch (e) {} }

export const owned = p => unlockedHeroes(p.trophies);
export const ownedSpells = p => unlockedSpells(p.trophies);
export const worldOf = p => worldFor(p.trophies);
export const heroLevel = (p, id) => p.levels[id] || 1;

// ---------- Missions, boutique, connexion : renouvelés chaque jour ----------
export function refreshDaily(p) {
  const d = dayKey(), w = weekKey();
  if (!p.missions) p.missions = { day: d, list: makeMissions(d, false), week: w, wlist: makeMissions(w * 31, true) };
  if (p.missions.day !== d) { p.missions.day = d; p.missions.list = makeMissions(d, false); }
  if (p.missions.week !== w) { p.missions.week = w; p.missions.wlist = makeMissions(w * 31, true); }
  if (!p.shop || p.shop.day !== d) p.shop = { day: d, bought: [] };
  if (p.login.day !== d) {
    const yesterday = dayKey(now() - 86400000);
    p.login.streak = p.login.day === yesterday ? (p.login.streak % 7) + 1 : 1;
    p.login.day = d; p.login.pending = LOGIN[p.login.streak - 1];
  }
}
export function track(p, k, n = 1) {
  for (const m of [...(p.missions?.list || []), ...(p.missions?.wlist || [])]) if (m.k === k && !m.claimed) m.prog = Math.min(m.n, m.prog + n);
}

// Donne une récompense { gold, gems, crystals, stone, eclat, shards:{id:n} } ; renvoie l'Éclat ajouté éventuel.
export function give(p, r) {
  if (!r) return null;
  p.gold += r.gold || 0; p.gems += r.gems || 0; p.crystals += r.crystals || 0; p.stone += r.stone || 0;
  for (const id in r.shards || {}) p.shards[id] = (p.shards[id] || 0) + r.shards[id];
  const t = eclatType(r.eclat || r.chest); // « chest » : anciennes récompenses enregistrées
  if (t) return addEclat(p, t) || (p.gold += 15, null);
  return null;
}

// ---------- Améliorer un héros ----------
export function maxHeroLevel(p) { return Math.min(MAX_LEVEL, 3 + (p.kingdom?.b?.academie || 0)); }
export function canUpgrade(p, id) {
  const lvl = heroLevel(p, id), c = upgradeCost(id, lvl);
  if (!c) return { ok: false, why: 'Niveau maximum', c };
  if (lvl >= maxHeroLevel(p)) return { ok: false, why: 'Améliore l’Académie de ton Royaume pour dépasser le niveau ' + maxHeroLevel(p), c };
  if ((p.shards[id] || 0) < c.shards) return { ok: false, why: 'Pas assez de fragments', c };
  if (p.gold < c.gold) return { ok: false, why: 'Pas assez d’or', c };
  if (p.crystals < c.crystals) return { ok: false, why: 'Pas assez de cristaux', c };
  return { ok: true, c };
}
export function upgradeHero(p, id) {
  const r = canUpgrade(p, id); if (!r.ok) return r;
  p.shards[id] -= r.c.shards; p.gold -= r.c.gold; p.crystals -= r.c.crystals;
  p.levels[id] = heroLevel(p, id) + 1; p.xp += 4 + p.levels[id] * 2;
  track(p, 'upgrade'); levelUp(p); saveProfile(p);
  return { ok: true, lvl: p.levels[id] };
}

// ---------- Éclats de Faille et Autel ----------
export function addEclat(p, type) {
  if (p.eclats.length >= ECLAT_MAX) return null;
  const e = { type, seed: nextSeed(p) }; p.eclats.push(e); return e;
}
export const autelLevel = p => p.kingdom?.b?.autel || 1;
export const purifyMax = p => purifyPerDay(autelLevel(p));
export const purifyLeft = p => Math.max(0, purifyMax(p) - (p.autel.day === dayKey() ? p.autel.used : 0));
export const eclatCounts = p => p.eclats.reduce((o, e) => (o[e.type] = (o[e.type] || 0) + 1, o), {});
// Purifie un Éclat (de la sorte demandée, sinon le plus précieux) : récompense tout de suite.
export function purify(p, type) {
  if (!p.eclats.length) return { err: 'Aucun Éclat à purifier : gagne des combats en Arène.' };
  if (!purifyLeft(p)) return { err: 'L’Autel a assez purifié pour aujourd’hui. Reviens demain, ou améliore l’Autel dans ton Royaume.' };
  let i = type ? p.eclats.findIndex(e => e.type === type) : -1;
  if (i < 0) i = p.eclats.reduce((b, e, k) => ECLATS[e.type].shards > ECLATS[p.eclats[b].type].shards ? k : b, 0);
  const e = p.eclats.splice(i, 1)[0];
  if (p.autel.day !== dayKey()) p.autel = { day: dayKey(), used: 0 };
  p.autel.used++;
  const r = rollEclat(e.type, e.seed, owned(p), autelLevel(p));
  give(p, r); track(p, 'purify'); saveProfile(p);
  return { type: e.type, ...r };
}
// Jauge de conquête pleine : la Relique se récupère tout de suite.
export const conquestReady = p => p.conquest.pts >= CONQUEST_MAX;
export function claimConquest(p) {
  if (!conquestReady(p)) return null;
  const r = conquestReward(p.conquest.n, nextSeed(p), owned(p));
  p.conquest.pts -= CONQUEST_MAX; p.conquest.n++;
  give(p, r); saveProfile(p);
  return r;
}

// ---------- Boutique ----------
export const shopOffers = p => dailyShop(p.shop.day, owned(p));
export function buy(p, offer) {
  if (p.shop.bought.includes(offer.id)) return 'Déjà acheté aujourd’hui.';
  const pr = offer.price || {};
  if ((pr.gold || 0) > p.gold) return 'Pas assez d’or.';
  if ((pr.gems || 0) > p.gems) return 'Pas assez de gemmes.';
  if (offer.kind === 'skin' && p.skins.owned.includes(offer.hero + ':' + offer.skin)) return 'Tu as déjà cette apparence.';
  p.gold -= pr.gold || 0; p.gems -= pr.gems || 0;
  if (offer.kind === 'gift') give(p, offer.reward);
  if (offer.kind === 'shards') give(p, { shards: { [offer.hero]: offer.n } });
  if (offer.kind === 'eclat') offer.got = { type: offer.eclat, ...rollEclat(offer.eclat, nextSeed(p), owned(p), autelLevel(p)) }, give(p, offer.got); // déjà purifié
  if (offer.kind === 'crystals') give(p, { crystals: offer.n });
  if (offer.kind === 'skin') { p.skins.owned.push(offer.hero + ':' + offer.skin); p.skins.eq[offer.hero] = offer.skin; }
  p.shop.bought.push(offer.id); saveProfile(p); return null;
}
export const skinOf = (p, id) => p.skins.eq[id] || null;
export const skinsFor = (p, id) => p.skins.owned.filter(s => s.startsWith(id + ':')).map(s => s.split(':')[1]);

// ---------- IA ----------
export function botLevelFor(p) {
  const w = worldOf(p), next = WORLDS[w.id + 1];
  const prog = next ? (p.trophies - w.trophies) / (next.trophies - w.trophies) : 1;
  return Math.min(4, Math.floor(w.id * 0.8) + (prog > 0.5 ? 1 : 0));
}
export function botDeck(trophies, seed, fac) {
  const rng = makeRng(seed);
  const pool = shuffle(unlockedHeroes(trophies).slice(), rng);
  const deck = pool.filter(id => HERO[id].fac === fac).slice(0, 4);
  const C = Object.fromEntries(PLAYABLE.map(c => [c.id, c]));
  const take = f => { const id = pool.find(i => !deck.includes(i) && f(C[i])); if (id && deck.length < 8) deck.push(id); };
  take(c => c.tgt === 'buildings');
  take(c => c.tgt === 'any' && c.range > 2);
  take(c => c.hp >= 1200);
  for (const id of pool) if (deck.length < 8 && !deck.includes(id)) deck.push(id);
  return deck;
}
export function botSpell(trophies, seed) { const s = unlockedSpells(trophies); return s[seed % s.length]; }
export function botLevels(deck, trophies) { const l = botHeroLevel(trophies), o = {}; for (const id of deck) o[id] = l; return o; }

function levelUp(p) {
  let up = false;
  while (p.xp >= xpNeed(p.lvl)) { p.xp -= xpNeed(p.lvl); p.lvl++; up = true; p.gems += 10; }
  return up;
}

// ---------- Résultat d'un combat ----------
// r : { result, mode, myHp, oppHp, heart, stats:{deployed,fuses,spells,hearts}, opp, world, reward? }
export function applyResult(p, r) {
  const before = worldOf(p).id, beforeOwned = owned(p), beforeSp = ownedSpells(p);
  const rew = { trophies: 0, gold: 0, xp: 0, lvlUp: false, newWorld: null, newHeroes: [], newSpells: [], eclat: null, eclatFull: false, conquest: 0, extra: null };
  const ranked = r.mode === 'arena';
  const margin = Math.round(((r.myHp || 0) - (r.oppHp || 0)) * 10);
  if (r.result === 'win') { rew.trophies = ranked ? 26 + Math.max(0, Math.min(8, margin)) : 0; rew.gold = ranked ? 25 + (r.heart ? 10 : 0) : 8; rew.xp = ranked ? 24 : 8; }
  else if (r.result === 'loss') { rew.trophies = ranked ? -Math.min(p.trophies, 15) : 0; rew.gold = ranked ? 8 : 2; rew.xp = ranked ? 10 : 4; }
  else { rew.gold = ranked ? 12 : 3; rew.xp = ranked ? 14 : 5; }
  if (r.reward) { rew.extra = r.reward; give(p, r.reward); }
  if (r.result === 'win' && r.mode !== 'training' && Array.isArray(r.deck)) for (const h of r.deck) p.heroWins[h] = (p.heroWins[h] || 0) + 1;
  p.trophies += rew.trophies; p.best = Math.max(p.best, p.trophies);
  p.gold += rew.gold; p.xp += rew.xp;
  rew.lvlUp = levelUp(p);
  if (ranked && r.result === 'win') {
    const type = ECLAT_CYCLE[p.eclatIdx % ECLAT_CYCLE.length];
    if (addEclat(p, type)) { rew.eclat = type; p.eclatIdx++; } else { rew.eclatFull = true; p.gold += 15; rew.gold += 15; }
  }
  rew.conquest = conquestPoints(r.mode, r.result, r.heart);
  p.conquest.pts = Math.min(CONQUEST_MAX, p.conquest.pts + rew.conquest);
  if (ranked) {
    p.stats.played++; if (r.heart) p.stats.hearts++;
    if (r.result === 'win') p.stats.w++; else if (r.result === 'loss') p.stats.l++; else p.stats.d++;
    if (r.result === 'win') track(p, 'win');
  }
  track(p, 'play');
  const st = r.stats || {};
  track(p, 'deploy', st.deployed || 0); track(p, 'fuse', st.fuses || 0); track(p, 'spell', st.spells || 0); track(p, 'heart', st.hearts || 0);
  p.hist.unshift({ at: now(), mode: r.mode, opp: r.opp, result: r.result, myHp: Math.round((r.myHp || 0) * 100), oppHp: Math.round((r.oppHp || 0) * 100), trophies: rew.trophies, world: r.world });
  p.hist = p.hist.slice(0, 30);
  const after = worldOf(p).id;
  if (after > before) rew.newWorld = WORLDS[after];
  rew.newHeroes = owned(p).filter(id => !beforeOwned.includes(id));
  rew.newSpells = ownedSpells(p).filter(id => !beforeSp.includes(id));
  // un nouveau héros débloqué arrive avec quelques fragments
  for (const id of rew.newHeroes) p.shards[id] = (p.shards[id] || 0);
  saveProfile(p);
  return rew;
}
export const missionsReady = p => [...(p.missions?.list || []), ...(p.missions?.wlist || [])].filter(m => m.prog >= m.n && !m.claimed).length;
export function claimMission(p, m) { if (m.claimed || m.prog < m.n) return null; m.claimed = true; const c = give(p, m.reward); saveProfile(p); return c; }
export function claimLogin(p) { const r = p.login.pending; if (!r) return null; p.login.pending = null; give(p, r); saveProfile(p); return r; }
export { SKINS, ECLATS, CONQUEST_MAX, upgradeCost, MAX_LEVEL };

// ---------- Royaume ----------
export function finishJob(p) {
  const K = p.kingdom; if (!K || !K.job || now() < K.job.end) return false;
  const id = K.job.id;
  if (BUILDINGS[id].prod) { const got = produced(K, id, now()); if (got) give(p, { [BUILDINGS[id].prod]: got }); K.last[id] = now(); }
  K.b[id] = K.job.to; K.job = null; p.xp += 10 + K.b[id] * 4; levelUp(p); saveProfile(p);
  return id;
}
export function startBuild(p, id) {
  const K = p.kingdom, e = canBuild(K, id); if (e) return e;
  const to = (K.b[id] || 0) + 1, c = buildCost(id, to);
  if (p.gold < c.gold) return 'Pas assez d’or (' + c.gold + ').';
  if (p.stone < c.stone) return 'Pas assez de pierre (' + c.stone + ').';
  p.gold -= c.gold; p.stone -= c.stone;
  if (BUILDINGS[id].prod && !K.last[id]) K.last[id] = now();
  K.job = { id, to, end: now() + buildTime(id, to) * 1000 };
  saveProfile(p); return null;
}
export function speedup(p) {
  const K = p.kingdom; if (!K.job) return null;
  const g = speedupGems((K.job.end - now()) / 1000); if (p.gems < g) return 'Pas assez de gemmes.';
  p.gems -= g; K.job.end = now(); finishJob(p); return null;
}
export function collectAll(p) {
  const K = p.kingdom, got = {};
  for (const id of ['mine', 'carriere', 'cristal']) {
    if (K.job && K.job.id === id) continue;
    const n = produced(K, id, now()); if (n > 0) { got[BUILDINGS[id].prod] = n; K.last[id] = now(); }
  }
  if (Object.keys(got).length) { give(p, got); track(p, 'collect'); saveProfile(p); }
  return got;
}
export function buyDeco(p, slot, id) {
  const d = DECOS[id]; if (p.gold < d.price) return 'Pas assez d’or.';
  p.gold -= d.price; p.kingdom.deco[slot] = id; saveProfile(p); return null;
}
export const bonusOf = p => kingdomBonus(p.kingdom);

// ---------- Équipement : chaque héros a ses 10 objets ; 2 portés (Arme, Talisman) ----------
export const heroWins = (p, h) => p.heroWins[h] || 0;
// état d'un objet : { ok, txt (condition), prog 0..1 }
export function itemState(p, id) {
  const it = itemById(id); if (!it) return { ok: false, txt: '', prog: 0 };
  if (!owned(p).includes(it.hero)) return { ok: false, txt: 'Débloque d’abord ce héros', prog: 0 };
  if (p.forged.includes(id)) return { ok: true, txt: 'Forgé', prog: 1 };
  const u = it.unlock;
  if (u.lvl) { const l = heroLevel(p, it.hero); return { ok: l >= u.lvl, txt: 'Héros niveau ' + u.lvl, prog: Math.min(1, l / u.lvl), now: 'niveau ' + l }; }
  if (u.win) { const w = heroWins(p, it.hero); return { ok: w >= u.win, txt: u.win + ' victoires avec ce héros', prog: Math.min(1, w / u.win), now: w + ' / ' + u.win }; }
  return { ok: true, txt: 'Disponible', prog: 1 };
}
export const unlockedCount = (p, h) => itemsFor(h).filter(it => itemState(p, it.id).ok).length;
export function forgeItem(p, id) {
  const it = itemById(id), st = itemState(p, id); if (!it || st.ok) return 'Déjà débloqué';
  if (!owned(p).includes(it.hero)) return 'Débloque d’abord ce héros';
  if (p.crystals < it.forge) return 'Pas assez de cristaux (' + it.forge + ' nécessaires)';
  p.crystals -= it.forge; p.forged.push(id); saveProfile(p); return null;
}
export function equipItem(p, hero, id) {
  const it = itemById(id); if (!it || it.hero !== hero || !itemState(p, id).ok) return;
  const e = p.equip[hero] || (p.equip[hero] = [null, null]); e[it.slot === 'arme' ? 0 : 1] = id; saveProfile(p);
}
export function unequipItem(p, hero, slot) { if (p.equip[hero]) { p.equip[hero][slot] = null; saveProfile(p); } }
export const heroItems = (p, hero) => (p.equip[hero] || [null, null]).map(x => x && itemById(x) ? x : null);
export const heroGear = (p, hero) => gearBonus(heroItems(p, hero).filter(Boolean));
export function gearFor(p, deck) { const o = {}; for (const id of deck) { const g = heroGear(p, id); if (g.dmg || g.atk || g.hp || g.spd) o[id] = g; } return o; }
