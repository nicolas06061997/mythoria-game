// MYTHORIA — simulation des combats « Les Failles ».
// Une île flottante ovale. Chaque camp a UN Sanctuaire. Au centre, le Cœur de Mythe :
// le camp qui le contrôle gagne de l'éther plus vite et remplit sa jauge d'Éveil (sortilège).
// Les héros sont invoqués au hasard sur un Cercle d'Invocation (5 places), fusionnés (★2, ★3)
// puis envoyés sur l'île. Ils combattent tout seuls.
//
// Déterministe : même graine + mêmes commandes = même combat (base de l'anti-triche en ligne).
// Pas de Math.sin/cos/random ici : seulement + - * / et sqrt.

import { HERO, SPELL, RARITIES, STAR_MULT, STAR_SIZE, MAX_STAR, levelMult, deckSynergies } from './content.js';

export const W = 16, H = 24, CX = 8, CY = 12, RX = 7.6, RY = 11.6;
export const TICK_RATE = 20, DT = 1 / TICK_RATE;
export const MATCH_TIME = 180, DOUBLE_AT = 120, OVERTIME = 60;
export const MANA_MAX = 10, MANA_START = 4, MANA_REGEN = 2.0; // secondes par point
export const SUMMON_COST = 2, BENCH = 5, EVEIL_TIME = 35;
export const HEART = { x: CX, y: CY, r: 2.6, rate: 0.45 };
export const SANCT = { hp: 12000, dmg: 100, hit: 0.85, range: 6.5, r: 1.7, splash: 1.0, y: [21.8, 2.2] };
const DEPLOY_TIME = 1.0, SIGHT = 5.5;
// Ordres tactiques (Lot 2, 20/11) : comportement de TOUS les héros d'un camp déjà sur l'île (et des suivants).
// heart = tenir le Cœur de Mythe ; assault = pousser vers le Sanctuaire adverse (comportement d'origine, ordre de départ) ;
// defend = se replier devant son Sanctuaire sans poursuivre au-delà de sa moitié.
export const ORDERS = ['heart', 'assault', 'defend'];
export const ORDER_CD = 1.5;          // secondes entre deux changements d'ordre
const DEF_R = 7.0, DEF_BACK = 3.4;
export const ORDER_FX = { defendArmor: 0.8, assaultSiege: 1.25 }; // Défense : -20 % de dégâts reçus dans sa moitié ; Assaut : +25 % contre Sanctuaires et bâtiments    // rayon de défense autour du point de repli ; recul du point de repli devant le Sanctuaire
// Décharge du Mythe : tenir le Cœur (au moins un de ses héros au sol dessus, aucun ennemi) MYTH.need secondes au total -> rayon qui frappe le Sanctuaire adverse
// (et les ennemis sur sa trajectoire), puis le compteur repart à zéro.
export const MYTH = { need: 30, sanctPct: 0.07, unitDmg: 400, width: 1.3 };
// Commandant (Lot 4, 20/11) : un héros en plus du deck. Éveil plein -> au choix le sortilège OU le Commandant,
// qui descend sur l'île 10 s, version ★3 de lui-même, dirigeable (commandes « cmove » quantifiées) avec une compétence signature (« csig ») une fois.
// Il ne compte pas dans les bonus de faction du deck et n'en reçoit pas.
export const CMDR = { life: 10, star: 2, power: 0.75, steerSpd: 1.15, sig: { wave: { r: 2.8, dmg: 2, stun: 1.0, push: 1.6 }, volley: { r: 6.5, n: 5, dmg: 2 }, heal: { r: 4, pct: 0.25 } } };
export const cmdrOk = id => { const c = HERO[id]; return !!(c && c.type === 'unit' && !c.kamikaze && (c.count || 1) === 1); };
export const sigKind = id => { const c = HERO[id]; return c.aura || c.heal ? 'heal' : c.range > 2 ? 'volley' : 'wave'; };
// Failles dynamiques (Lot 3, 20/11) : une vers 1:20-1:40, une autre au début de la prolongation, 15 s chacune, pour les deux camps.
export const RIFT = { dur: 15, r: 2.4, at: [80, 100], otDelay: 6, kinds: ['fureur', 'source', 'tempete'],
  fureur: 1.3,        // +30 % de dégâts pour les héros dedans
  source: 0.045,      // soin : 4,5 % de la vie max par seconde
  tempete: 2.4 };     // poussée vers l'extérieur (unités / s) + ralentissement
// Événement de monde (Lot 3) : toutes les ~30 s, annoncé 2 s avant, change de moitié d'île à chaque fois.
export const WEV = { first: 26, every: 30, warn: 2,
  givre:  { k: 'bourrasque', dur: 3, slow: 0.45, h: 2.6 },
  braise: { k: 'lave', dur: 6, dps: 0.035 },             // 3,5 % de la vie max / s sur un bord de l'île
  sylve:  { k: 'spores', dur: 6, heal: 0.04, r: 2.4 },
  aurore: { k: 'halo', dur: 4, shield: 0.15, r: 2.4 },   // bouclier = 15 % de la vie max (une fois par événement)
  arcane: { k: 'hate', dur: 6, k2: 1.3, r: 2.6 },        // déplacement et attaques 30 % plus rapides
  ombre:  { k: 'eclipse', dur: 4 } };                     // les Sanctuaires ne tirent plus

const sq = x => x * x;
const dist = (a, b) => Math.sqrt(sq(a.x - b.x) + sq(a.y - b.y));

// ---- hasard reproductible stocké dans l'état ----
function rnd(s) {
  s.rng = (s.rng + 0x6D2B79F5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function inIsland(x, y, margin = 0) {
  return sq((x - CX) / (RX - margin)) + sq((y - CY) / (RY - margin)) <= 1;
}
function clampIsland(e) {
  const dx = (e.x - CX) / RX, dy = (e.y - CY) / RY, d = Math.sqrt(dx * dx + dy * dy);
  const lim = 1 - e.r / RX * 0.6;
  if (d > lim) { e.x = CX + dx / d * lim * RX; e.y = CY + dy / d * lim * RY; }
}

export function createBattle({ world = null, commanders = [null, null], seed = 1, decks, spells = ['meteore', 'meteore'], levels = [{}, {}], gear = [{}, {}], names = ['Joueur 1', 'Joueur 2'], mode = 'duel', boss = null, waves = null, mods = null, bonus = null, botMana = 0 }) {
  const s = {
    tick: 0, t: 0, seed, rng: (seed >>> 0) || 1, nextId: 1, ents: [], proj: [], pend: [], ev: [],
    over: false, winner: -1, reason: '', overtime: false, mode, mods: mods || {}, wave: 0, waveT: 6, wavesDef: waves,
    heart: { ctl: 0, owner: -1 },
    world, rift: null, riftN: 0, riftAt: 0, wev: null, wevN: 0, wevAt: WEV.first, wevSide: 1,
    players: [0, 1].map(p => ({
      name: names[p], mana: MANA_START, eveil: 0, bench: Array(BENCH).fill(null), deck: decks[p].slice(),
      spell: spells[p] || 'meteore', levels: levels[p] || {}, gear: gear[p] || {}, syn: deckSynergies(decks[p]).tiers, summons: 0, deployed: 0, fuses: 0, spells: 0, hearts: 0,
      order: 'assault', orderCd: 0, orders: 0, myth: 0, discharges: 0,
      cmdr: cmdrOk(commanders[p]) ? commanders[p] : null, cmdrId: 0, cmdrs: 0,
      bonus: (p === 0 && bonus) || (p === 1 && botMana ? { hp: 1, sanctDmg: 1, eveil: 1, mana: botMana } : { hp: 1, sanctDmg: 1, eveil: 1 }),
    })),
  };
  for (const p of [0, 1]) {
    s.ents.push({ id: s.nextId++, p, kind: 'sanct', x: CX, y: SANCT.y[p], px: CX, py: SANCT.y[p], hp: SANCT.hp, maxHp: SANCT.hp, invuln: mode === 'survival' && p === 1,
      dmg: Math.round(SANCT.dmg * s.players[p].bonus.sanctDmg), hit: SANCT.hit, cd: 0, range: SANCT.range, r: SANCT.r, tgt: 'any', proj: 'bolt', splash: SANCT.splash, star: 1, shield: 0, frozen: 0, slowT: 0, dead: false });
  }
  // Chaque camp commence avec 2 héros sur son cercle.
  for (const p of [0, 1]) for (let k = 0; k < 2; k++) summonHero(s, p);
  if (boss) spawnBoss(s, 1, boss, CX, 6.2);
  s.riftAt = RIFT.at[0] + rnd(s) * (RIFT.at[1] - RIFT.at[0]); s.wevSide = rnd(s) < 0.5 ? 1 : -1;
  s.ev = [];
  return s;
}

export const sanctOf = (s, p) => s.ents.find(e => e.kind === 'sanct' && e.p === p);

// ---------- Validation (anti-triche) ----------
export function deployOk(p, x, y) {
  if (!inIsland(x, y, 0.4)) return false;
  return p === 0 ? y >= CY + 0.8 : y <= CY - 0.8;
}

export function check(s, cm) {
  if (s.over) return 'Le combat est terminé.';
  const P = s.players[cm.p];
  if (!P) return 'Joueur inconnu.';
  switch (cm.t) {
    case 'summon':
      if (P.mana + 1e-9 < SUMMON_COST) return 'Pas assez d’éther.';
      if (!P.bench.includes(null)) return 'Cercle d’invocation plein.';
      return null;
    case 'merge': {
      const a = P.bench[cm.a], b = P.bench[cm.b];
      if (cm.a === cm.b || !a || !b) return 'Fusion impossible.';
      if (a.id !== b.id || a.star !== b.star) return 'Il faut deux héros identiques de même rang.';
      if (b.star >= MAX_STAR) return 'Rang maximum atteint.';
      return null;
    }
    case 'deploy': {
      const h = P.bench[cm.slot];
      if (!h) return 'Aucun héros ici.';
      if (!(cm.x >= 0 && cm.x <= W && cm.y >= 0 && cm.y <= H)) return 'Hors de l’île.';
      if (!deployOk(cm.p, cm.x, cm.y)) return 'Pose tes héros sur ta moitié de l’île.';
      return null;
    }
    case 'spell':
      if (P.eveil < 100 - 1e-6) return 'Jauge d’Éveil pas encore pleine.';
      if (!inIsland(cm.x, cm.y)) return 'Vise l’île.';
      return null;
    case 'commander':
      if (!P.cmdr) return 'Aucun Commandant.';
      if (P.eveil < 100 - 1e-6) return 'Jauge d’Éveil pas encore pleine.';
      if (cmdrOf(s, cm.p)) return 'Ton Commandant est déjà sur l’île.';
      if (!(cm.x >= 0 && cm.x <= W && cm.y >= 0 && cm.y <= H) || !deployOk(cm.p, cm.x, cm.y)) return 'Pose ton Commandant sur ta moitié de l’île.';
      return null;
    case 'cmove': {
      if (!cmdrOf(s, cm.p)) return 'Aucun Commandant sur l’île.';
      if (!Number.isInteger(cm.dx) || !Number.isInteger(cm.dy) || Math.abs(cm.dx) > 8 || Math.abs(cm.dy) > 8) return 'Direction invalide.';
      return null;
    }
    case 'csig': { const e = cmdrOf(s, cm.p); if (!e) return 'Aucun Commandant sur l’île.'; if (e.sigUsed) return 'Compétence déjà utilisée.'; return null; }
    case 'order':
      if (!ORDERS.includes(cm.o)) return 'Ordre inconnu.';
      if (P.order === cm.o) return 'C’est déjà l’ordre en cours.';
      if (P.orderCd > 1e-9) return 'Attends un instant avant de changer d’ordre.';
      return null;
  }
  return 'Commande inconnue.';
}

// ---------- Invocation ----------
function summonHero(s, p) {
  const P = s.players[p];
  const slot = P.bench.indexOf(null);
  if (slot < 0) return;
  let tot = 0;
  for (const id of P.deck) tot += RARITIES[HERO[id].rar].weight;
  let r = rnd(s) * tot, pick = P.deck[0];
  for (const id of P.deck) { r -= RARITIES[HERO[id].rar].weight; if (r <= 0) { pick = id; break; } }
  P.bench[slot] = { id: pick, star: s.mods.startStar || 1 };
  P.summons++;
  s.ev.push({ type: 'summon', p, slot, id: pick });
}

function apply(s, cm) {
  const P = s.players[cm.p];
  if (cm.t === 'summon') { P.mana -= SUMMON_COST; summonHero(s, cm.p); }
  else if (cm.t === 'merge') {
    P.bench[cm.b].star++; P.bench[cm.a] = null; P.fuses++;
    s.ev.push({ type: 'benchFuse', p: cm.p, slot: cm.b, star: P.bench[cm.b].star, id: P.bench[cm.b].id });
  } else if (cm.t === 'deploy') {
    const h = P.bench[cm.slot]; P.bench[cm.slot] = null; P.deployed++;
    deployHero(s, cm.p, h, cm.x, cm.y);
  } else if (cm.t === 'commander') {
    P.eveil = 0; P.cmdrs++;
    const e = spawn(s, cm.p, P.cmdr, cm.x, cm.y, CMDR.star, P.levels[P.cmdr] || 1, 0.6, true);
    e.cmdr = true; e.cmdrT = CMDR.life; e.steerX = 0; e.steerY = 0; e.sigUsed = false; P.cmdrId = e.id;
    s.ev.push({ type: 'cmdr', p: cm.p, id: e.id, card: P.cmdr, x: cm.x, y: cm.y });
  } else if (cm.t === 'cmove') {
    const e = cmdrOf(s, cm.p), L = Math.sqrt(cm.dx * cm.dx + cm.dy * cm.dy);
    e.steerX = L ? cm.dx / L : 0; e.steerY = L ? cm.dy / L : 0;
  } else if (cm.t === 'csig') {
    signature(s, cmdrOf(s, cm.p));
  } else if (cm.t === 'order') {
    P.order = cm.o; P.orderCd = ORDER_CD; P.orders++;
    s.ev.push({ type: 'order', p: cm.p, o: cm.o });
  } else if (cm.t === 'spell') {
    P.eveil = 0; P.spells++;
    const c = SPELL[P.spell];
    s.ev.push({ type: 'cast', p: cm.p, spell: P.spell, x: cm.x, y: cm.y, delay: c.delay || 0 });
    const n = c.strikes || 1;
    for (let k = 0; k < n; k++) s.pend.push({ at: s.tick + Math.round(((c.delay || 0) + k * 0.45) * TICK_RATE), p: cm.p, spell: P.spell, x: cm.x, y: cm.y, k });
  }
}

// ---------- Héros sur l'île ----------
function mults(s, p, c, noSyn) {
  const t = noSyn ? 0 : s.players[p].syn[c.fac] || 0;
  return {
    hp: c.fac === 'aube' ? [1, 1.08, 1.15][t] : 1,
    dmg: c.fac === 'arcane' ? [1, 1.08, 1.16][t] : 1,
    regen: c.fac === 'sylve' ? [0, 0.012, 0.025][t] : 0,
    atk: c.fac === 'braise' ? [1, 1.07, 1.14][t] : 1,
    slow: c.fac === 'givre' ? [0, 0.15, 0.25][t] : 0,
    steal: c.fac === 'ombre' ? [0, 0.08, 0.15][t] : 0,
  };
}

const NOGEAR = { dmg: 0, atk: 0, hp: 0, spd: 0 };
function applyStats(s, e) {
  const c = HERO[e.card], m = mults(s, e.p, c, e.cmdr), lv = levelMult(e.lvl), st = STAR_MULT[e.star];
  const g = (s.players[e.p].gear || {})[e.card] || NOGEAR; // objets équipés (bonus déjà plafonnés)
  const cp = e.cmdr ? CMDR.power : 1; // Commandant : projection un peu moins solide qu'un vrai ★2
  e.maxHp = Math.round(c.hp * m.hp * lv * st * cp * (1 + g.hp) * (e.bossHp ? 1 : s.players[e.p].bonus.hp));
  if (e.bossHp) e.maxHp = e.bossHp;
  e.dmg = e.bossDmg || Math.round(c.dmg * m.dmg * lv * st * cp * (1 + g.dmg));
  e.hit = c.hit / m.atk / (1 + g.atk);
  if (!e.bossHp) e.spd = (c.spd || 0) * (1 + g.spd);
  e.regen = m.regen;
  e.slowOn = Math.max(c.slow || 0, m.slow);
  e.steal = (c.lifesteal || 0) + m.steal;
  e.r = e.bossR || c.r * STAR_SIZE[e.star];
}

function spawn(s, p, id, x, y, star = 1, lvl = 1, deploy = DEPLOY_TIME, cmdr = false) {
  const c = HERO[id];
  const e = {
    id: s.nextId++, p, kind: c.type === 'building' ? 'building' : 'unit', card: id, lvl, star,
    x, y, px: x, py: y, hp: 0, maxHp: 0, cd: 0.3, spd: c.spd || 0, range: c.range, tgt: c.tgt,
    fly: !!c.fly, splash: c.splash || 0, proj: c.proj || null, shield: c.shield || 0, frozen: 0, slowT: 0,
    deploy, target: 0, retarget: 0, dead: false, life: c.life || 0,
    sumT: c.summon ? c.summon.every : 0, novaT: c.nova ? c.nova.every : 0,
    dashReady: !!c.dash, chargeReady: !!c.charge, moving: false, atkAnim: 0, faceX: 0, faceY: p === 0 ? -1 : 1, cmdr,
  };
  applyStats(s, e);
  e.hp = e.maxHp;
  s.ents.push(e);
  return e;
}

function deployHero(s, p, h, x, y) {
  const c = HERO[h.id], lvl = s.players[p].levels[h.id] || 1;
  s.ev.push({ type: 'deploy', p, card: h.id, star: h.star, x, y });
  // Fusion sur l'île : poser un héros sur un héros identique de même rang.
  if (c.count === 1) {
    const twin = s.ents.find(e => !e.dead && e.p === p && e.card === h.id && e.star === h.star && e.star < MAX_STAR && dist(e, { x, y }) <= 1.6);
    if (twin) {
      twin.star++; applyStats(s, twin); twin.hp = twin.maxHp; s.players[p].fuses++;
      s.ev.push({ type: 'fuse', id: twin.id, star: twin.star, x: twin.x, y: twin.y });
      return;
    }
  }
  const n = c.count || 1;
  for (let k = 0; k < n; k++) {
    let ox = 0, oy = 0;
    if (n === 2) ox = k ? 0.5 : -0.5;
    if (n === 3) { ox = [-0.6, 0.6, 0][k]; oy = [0.3, 0.3, -0.5][k]; }
    if (n === 4) { ox = [-0.5, 0.5, -0.5, 0.5][k]; oy = [0.4, 0.4, -0.4, -0.4][k]; }
    const e = spawn(s, p, h.id, x + ox, y + oy, h.star, lvl);
    clampIsland(e);
  }
}

// ---------- Dégâts ----------
function damage(s, t, amount, src) {
  if (t.dead || amount <= 0 || t.invuln) return;
  if (t.fly && src && src.proj) amount *= 1.35; // les tirs à distance sont efficaces contre les volants
  // Faille de Fureur : +30 % de dégâts pour les héros qui frappent depuis la faille
  if (src && src.kind === 'unit' && s.rift && s.rift.k === 'fureur' && dist(src, s.rift) <= s.rift.r) amount *= RIFT.fureur;
  // effets des ordres tactiques
  if (src && src.kind === 'unit' && t.kind !== 'unit' && orderOf(s, src) === 'assault') amount *= ORDER_FX.assaultSiege;
  if (t.kind === 'unit' && orderOf(s, t) === 'defend' && (t.p === 0 ? t.y > CY : t.y < CY)) amount *= ORDER_FX.defendArmor;
  amount = Math.round(amount);
  if (t.shield > 0) {
    const a = Math.min(t.shield, amount);
    t.shield -= a; amount -= a;
    if (t.shield <= 0) s.ev.push({ type: 'shieldBreak', id: t.id });
  }
  t.hp -= amount;
  s.ev.push({ type: 'hit', id: t.id, x: t.x, y: t.y, amount });
  if (src && src.steal && src.hp > 0) src.hp = Math.min(src.maxHp, src.hp + amount * src.steal);
  if (src && src.slowOn && t.kind === 'unit') t.slowT = Math.max(t.slowT, 2), t.slowK = Math.max(t.slowK || 0, src.slowOn);
  if (t.hp <= 0) kill(s, t);
}

function kill(s, t) {
  if (t.dead) return;
  t.dead = true; t.hp = 0;
  s.ev.push({ type: 'die', id: t.id, kind: t.kind, card: t.card, p: t.p, x: t.x, y: t.y });
  if (t.kind === 'sanct') return finish(s, 1 - t.p, s.mode === 'survival' ? 'survival' : 'sanct');
  if (t.boss) s.ev.push({ type: 'bossDown', id: t.id, x: t.x, y: t.y });
  const c = t.card && HERO[t.card];
  if (c && c.death) for (let k = 0; k < c.death.n; k++) { const e = spawn(s, t.p, c.death.id, t.x + (k ? 0.55 : -0.55), t.y, 1, t.lvl, 0.3); clampIsland(e); }
}

function areaDamage(s, p, x, y, radius, dmg, sanctPct, src) {
  for (const e of s.ents) {
    if (e.dead || e.p === p) continue;
    if (dist(e, { x, y }) <= radius + e.r * 0.5) damage(s, e, e.kind === 'sanct' ? dmg * sanctPct : dmg, src);
  }
}

function finish(s, winner, reason) {
  if (s.over) return;
  s.over = true; s.winner = winner; s.reason = reason;
  s.ev.push({ type: 'end', winner, reason });
}

// ---------- Ciblage ----------
function canTarget(e, t) {
  if (t.dead || t.p === e.p) return false;
  if (e.tgt === 'buildings') return t.kind !== 'unit';
  if (e.tgt === 'ground' && t.fly) return false;
  return true;
}
const gap = (a, b) => dist(a, b) - a.r - b.r;

// Ordre suivi par un héros (les bâtiments et les boss gardent leur comportement)
function orderOf(s, e) { return e.kind === 'unit' && !e.boss ? s.players[e.p].order : 'assault'; }
// Point de repli devant son Sanctuaire
function defPoint(e) { return { x: CX, y: e.p === 0 ? SANCT.y[0] - DEF_BACK : SANCT.y[1] + DEF_BACK }; }
// Point où se rend un héros sans ennemi en vue (Cœur ou repli), un peu écarté selon son numéro pour ne pas s'empiler
function orderDest(s, e) {
  const o = orderOf(s, e); if (o === 'assault') return null;
  const ox = ((e.id * 37) % 7 - 3) * 0.42, oy = ((e.id * 53) % 5 - 2) * 0.32;
  if (o === 'heart') return { x: HEART.x + ox, y: HEART.y + oy + (e.p === 0 ? 0.4 : -0.4) };
  const d = defPoint(e); return { x: d.x + ox * 1.4, y: d.y + oy };
}
function acquire(s, e) {
  let best = null, bd = Infinity;
  const isStatic = e.kind !== 'unit';
  const sight = isStatic ? e.range : Math.max(SIGHT, e.range + 1);
  const o = orderOf(s, e), dp = o === 'defend' ? defPoint(e) : null;
  for (const t of s.ents) {
    if (!canTarget(e, t)) continue;
    const d = gap(e, t);
    // en défense : seulement les ennemis proches du point de repli (ou à portée immédiate)
    if (dp && d > e.range && dist(t, dp) > DEF_R) continue;
    if (d <= sight && d < bd) { bd = d; best = t; }
  }
  if (!best && !isStatic && o === 'assault') {
    for (const t of s.ents) {
      if (t.dead || t.p === e.p || t.kind === 'unit') continue;
      const d = dist(e, t);
      if (d < bd) { bd = d; best = t; }
    }
  }
  return best;
}

function attack(s, e, t) {
  const c = e.card ? HERO[e.card] : null;
  e.atkAnim = 0.35;
  let dmg = e.dmg;
  if (e.bonus) { dmg *= 2; e.bonus = false; }
  s.ev.push({ type: 'attack', id: e.id, tid: t.id, x: e.x, y: e.y, tx: t.x, ty: t.y });
  if (c && c.kamikaze) {
    areaDamage(s, e.p, t.x, t.y, 0.9, dmg, 1, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: 0.9, kind: 'fire' });
    kill(s, e);
    return;
  }
  if (c && c.chain) {
    const pts = [{ x: e.x, y: e.y }], hit = new Set();
    let cur = t, d = dmg;
    for (let k = 0; k < c.chain && cur; k++) {
      damage(s, cur, d, e); hit.add(cur.id); pts.push({ x: cur.x, y: cur.y });
      d *= 0.75;
      let nb = null, nd = 2.6;
      for (const o of s.ents) if (!hit.has(o.id) && canTarget(e, o)) { const dd = dist(cur, o); if (dd < nd) { nd = dd; nb = o; } }
      cur = nb;
    }
    s.ev.push({ type: 'zap', pts });
    return;
  }
  if (e.proj) {
    if (c && c.multi) {
      // Volée : jusqu'à `multi` cibles différentes à portée
      const others = s.ents.filter(o => o !== t && canTarget(e, o) && gap(e, o) <= e.range).sort((a, b) => dist(e, a) - dist(e, b)).slice(0, c.multi - 1);
      for (const o of others) s.proj.push({ x: e.x, y: e.y, tid: o.id, tx: o.x, ty: o.y, spd: 13, dmg, splash: 0, p: e.p, kind: e.proj, src: e.id, fly: e.fly, id: s.nextId++ });
    }
    s.proj.push({ x: e.x, y: e.y, tid: t.id, tx: t.x, ty: t.y, spd: e.proj === 'fire' ? 8 : e.proj === 'arrow' ? 13 : 10,
      dmg, splash: e.splash, p: e.p, kind: e.proj, src: e.id, fly: e.fly, id: s.nextId++ });
    return;
  }
  if (e.splash) { areaDamage(s, e.p, t.x, t.y, e.splash, dmg, 1, e); s.ev.push({ type: 'cleave', x: t.x, y: t.y, r: e.splash, kind: c ? c.fac : '' }); }
  else damage(s, t, dmg, e);
}

// ---------- Boucle d'un tick ----------
export function step(s, cmds = []) {
  if (s.over) return s;
  s.ev = [];
  for (const cm of cmds) {
    const err = check(s, cm);
    if (err) { s.ev.push({ type: 'reject', p: cm.p, err }); continue; }
    apply(s, cm);
  }
  const dt = DT;
  updateHeart(s, dt);
  fieldTick(s, dt);
  if (s.mode === 'survival') waveTick(s, dt);
  for (const [p, P] of s.players.entries()) {
    const bonus = s.heart.owner === p ? 1.35 : 1;
    P.mana = Math.min(MANA_MAX, P.mana + (s.t >= DOUBLE_AT && s.mode !== 'survival' ? 2 : 1) * bonus * (s.mods.mana || 1) * (P.bonus.mana || 1) / MANA_REGEN * dt);
    if (P.orderCd > 0) P.orderCd = Math.max(0, P.orderCd - dt);
    P.eveil = Math.min(100, P.eveil + 100 / EVEIL_TIME * (s.heart.owner === p ? 1.6 : 1) * (s.mods.eveil || 1) * P.bonus.eveil * dt);
  }
  for (const sp of s.pend) if (sp.at <= s.tick) castSpell(s, sp);
  s.pend = s.pend.filter(sp => sp.at > s.tick);

  for (const e of s.ents) { e.px = e.x; e.py = e.y; e.moving = false; }

  for (const e of s.ents) {
    if (e.dead) continue;
    if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.frozen > 0) { e.frozen -= dt; continue; }
    if (e.slowT > 0) { e.slowT -= dt; if (e.slowT <= 0) e.slowK = 0; }
    if (e.deploy > 0) { e.deploy -= dt; if (e.deploy <= 0) onLand(s, e); continue; }
    if (e.cmdr) {
      e.cmdrT -= dt;
      if (e.cmdrT <= 0) { e.dead = true; s.ev.push({ type: 'cmdrEnd', p: e.p, id: e.id, x: e.x, y: e.y }); continue; }
      if (e.steerX || e.steerY) {
        // dirigé par le joueur : il avance dans la direction donnée et frappe ce qui est à portée, sans poursuivre
        const sp = e.spd * CMDR.steerSpd * (e.slowK ? 1 - e.slowK : 1) * dt;
        e.x += e.steerX * sp; e.y += e.steerY * sp; clampIsland(e); e.moving = true; e.faceX = e.steerX; e.faceY = e.steerY;
        if (e.cd > 0) e.cd -= dt;
        let best = null, bd = Infinity;
        for (const t of s.ents) { if (!canTarget(e, t)) continue; const g = gap(e, t); if (g <= e.range && g < bd) { bd = g; best = t; } }
        if (best && e.cd <= 0) { attack(s, e, best); e.cd = e.hit; }
        continue;
      }
    }
    if (e.kind === 'sanct' && s.wev && s.wev.on && s.wev.k === 'eclipse') { if (e.cd > 0) e.cd -= dt; continue; } // Éclipse : les Sanctuaires ne tirent plus
    const c = e.card ? HERO[e.card] : null;
    const hk = e.haste ? WEV.arcane.k2 : 1;
    if (e.regen && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * e.regen * dt);
    if (e.kind === 'building' && e.life) { e.hp -= e.maxHp / e.life * dt; if (e.hp <= 0) { kill(s, e); continue; } }
    if (c && c.aura) for (const o of s.ents) if (!o.dead && o.p === e.p && o.kind === 'unit' && o !== e && dist(o, e) <= c.aura.radius) o.hp = Math.min(o.maxHp, o.hp + c.aura.heal * STAR_MULT[e.star] * dt);
    if (c && c.summon) {
      e.sumT -= dt;
      if (e.sumT <= 0) {
        e.sumT = c.summon.every;
        for (let k = 0; k < c.summon.n; k++) { const m = spawn(s, e.p, c.summon.id, e.x + (k ? 0.7 : -0.7), e.y + (e.p === 0 ? 0.5 : -0.5), 1, e.lvl, 0.6); clampIsland(m); }
        s.ev.push({ type: 'conjure', id: e.id, x: e.x, y: e.y, fac: c.fac });
      }
    }
    if (c && c.nova) {
      e.novaT -= dt;
      if (e.novaT <= 0) {
        let any = false;
        for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= c.nova.radius) any = true;
        if (any) {
          e.novaT = c.nova.every;
          for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= c.nova.radius) o.frozen = Math.max(o.frozen, c.nova.freeze);
          s.ev.push({ type: 'nova', id: e.id, x: e.x, y: e.y, r: c.nova.radius });
        } else e.novaT = 0.5;
      }
    }

    if (e.boss) bossTick(s, e, dt);
    let t = e.target ? s.ents.find(o => o.id === e.target) : null;
    e.retarget -= dt;
    if (!t || t.dead || !canTarget(e, t) || e.retarget <= 0 || (e.kind !== 'unit' && gap(e, t) > e.range)) {
      t = acquire(s, e); e.retarget = 0.25; e.target = t ? t.id : 0;
    }
    if (e.cd > 0) e.cd -= dt * (e.slowK ? 1 - e.slowK : 1) * hk;
    if (!t) {
      // aucun ennemi à combattre : rejoindre le point de l'ordre (Cœur ou repli)
      const dst = e.kind === 'unit' ? orderDest(s, e) : null;
      if (dst) {
        const mx = dst.x - e.x, my = dst.y - e.y, md = Math.sqrt(mx * mx + my * my);
        if (md > 0.35) { const stp = Math.min(md, e.spd * (e.slowK ? 1 - e.slowK : 1) * hk * dt); e.x += mx / md * stp; e.y += my / md * stp; e.moving = true; e.faceX = mx / md; e.faceY = my / md; }
      }
      continue;
    }
    const dx = t.x - e.x, dy = t.y - e.y, dd = Math.sqrt(dx * dx + dy * dy) || 1;
    e.faceX = dx / dd; e.faceY = dy / dd;
    const g = gap(e, t);
    if (g <= e.range) {
      if (e.chargeReady) { e.chargeReady = false; e.bonus = true; }
      if (e.cd <= 0) { attack(s, e, t); e.cd = e.hit; }
    } else if (e.kind === 'unit') {
      if (e.dashReady && c.dash && g <= c.dash && g > 1.2) {
        const k = (dd - e.r - t.r - 0.3) / dd;
        s.ev.push({ type: 'dash', id: e.id, x0: e.x, y0: e.y, x1: e.x + dx * k, y1: e.y + dy * k });
        e.x += dx * k; e.y += dy * k; e.dashReady = false; e.bonus = true; e.cd = 0;
        continue;
      }
      const sp = e.spd * (e.slowK ? 1 - e.slowK : 1) * hk * (e.chargeReady && dd < 6 ? 1.8 : 1);
      const stp = Math.min(dd, sp * dt);
      e.x += dx / dd * stp; e.y += dy / dd * stp; e.moving = true;
    }
  }

  updateProjectiles(s, dt);
  separate(s);
  s.ents = s.ents.filter(e => !e.dead || e.kind === 'sanct');
  s.tick++;
  s.t = s.tick * DT;
  checkTime(s);
  return s;
}

function updateHeart(s, dt) {
  let a = 0, b = 0;
  for (const e of s.ents) if (!e.dead && e.kind === 'unit' && !e.fly && e.deploy <= 0 && dist(e, HEART) <= HEART.r) { if (e.p === 0) a++; else b++; }
  const H0 = s.heart, before = H0.owner;
  if (a && !b) H0.ctl = Math.min(1, H0.ctl + HEART.rate * dt);
  else if (b && !a) H0.ctl = Math.max(-1, H0.ctl - HEART.rate * dt);
  if (H0.ctl >= 0.999) H0.owner = 0;
  else if (H0.ctl <= -0.999) H0.owner = 1;
  else if ((H0.owner === 0 && H0.ctl <= 0) || (H0.owner === 1 && H0.ctl >= 0)) H0.owner = -1;
  if (H0.owner !== before) { s.ev.push({ type: 'heart', owner: H0.owner }); if (H0.owner >= 0) s.players[H0.owner].hearts++; }
  // Décharge du Mythe : temps de contrôle cumulé
  const active = H0.owner === 0 ? a > 0 && !b : H0.owner === 1 ? b > 0 && !a : false;
  if (active && !s.over) {
    const P = s.players[H0.owner];
    P.myth += dt;
    if (P.myth >= MYTH.need - 1e-9) { P.myth = 0; discharge(s, H0.owner); }
  }
}
// Rayon du Mythe : part du Cœur, frappe le Sanctuaire adverse et les ennemis sur sa trajectoire
function discharge(s, p) {
  const tgt = sanctOf(s, 1 - p), x0 = HEART.x, y0 = HEART.y, x1 = tgt.x, y1 = tgt.y;
  const vx = x1 - x0, vy = y1 - y0, L2 = vx * vx + vy * vy || 1;
  s.players[p].discharges++;
  s.ev.push({ type: 'discharge', p, x0, y0, x1, y1 });
  for (const e of s.ents) {
    if (e.dead || e.p === p || e.kind === 'sanct') continue;
    const u = Math.max(0, Math.min(1, ((e.x - x0) * vx + (e.y - y0) * vy) / L2));
    const dx = e.x - (x0 + vx * u), dy = e.y - (y0 + vy * u);
    if (Math.sqrt(dx * dx + dy * dy) <= MYTH.width + e.r * 0.5) damage(s, e, MYTH.unitDmg, null);
  }
  if (!tgt.dead) damage(s, tgt, tgt.maxHp * MYTH.sanctPct, null);
}

function onLand(s, e) {
  const c = HERO[e.card];
  s.ev.push({ type: 'land', id: e.id, x: e.x, y: e.y });
  if (c && c.roar) {
    areaDamage(s, e.p, e.x, e.y, c.roar.radius, c.roar.dmg * STAR_MULT[e.star], 0.3, e);
    s.ev.push({ type: 'boom', x: e.x, y: e.y, r: c.roar.radius, kind: 'roar' });
  }
}

function castSpell(s, sp) {
  const c = SPELL[sp.spell], lv = 1, m = { dmg: 1 };
  let x = sp.x, y = sp.y;
  if (c.strikes) { const o = [[0, 0], [-1, 0.8], [1, -0.7]][sp.k % 3]; x += o[0]; y += o[1]; }
  s.ev.push({ type: 'spell', spell: sp.spell, fx: c.fx, x, y, r: c.strikes ? c.radius * 0.6 : c.radius, p: sp.p });
  const r = c.strikes ? c.radius * 0.6 : c.radius;
  if (c.dmg) areaDamage(s, sp.p, x, y, r, sp.bossDmg || c.dmg * m.dmg * lv, c.sanctPct || 0.3, null);
  if (c.freeze) for (const e of s.ents) if (!e.dead && e.p !== sp.p && dist(e, { x, y }) <= r + e.r * 0.5) e.frozen = Math.max(e.frozen, c.freeze);
  if (c.heal) for (const e of s.ents) if (!e.dead && e.p === sp.p && e.kind !== 'sanct' && dist(e, { x, y }) <= r + e.r * 0.5) {
    e.hp = Math.min(e.maxHp, e.hp + c.heal * lv); e.shield += Math.round(c.shieldAdd * lv);
  }
}

function updateProjectiles(s, dt) {
  for (const pr of s.proj) {
    const t = s.ents.find(o => o.id === pr.tid && !o.dead);
    if (t) { pr.tx = t.x; pr.ty = t.y; }
    const dx = pr.tx - pr.x, dy = pr.ty - pr.y, d = Math.sqrt(dx * dx + dy * dy), stp = pr.spd * dt;
    if (d <= stp + 0.15) {
      pr.done = true;
      const src = s.ents.find(o => o.id === pr.src) || { p: pr.p };
      if (pr.splash) { areaDamage(s, pr.p, pr.tx, pr.ty, pr.splash, pr.dmg, 1, src); s.ev.push({ type: 'boom', x: pr.tx, y: pr.ty, r: pr.splash, kind: pr.kind }); }
      else if (t) damage(s, t, pr.dmg, src);
      s.ev.push({ type: 'impact', x: pr.tx, y: pr.ty, kind: pr.kind });
    } else { pr.x += dx / d * stp; pr.y += dy / d * stp; }
  }
  s.proj = s.proj.filter(p => !p.done);
}

function separate(s) {
  const L = s.ents.filter(e => !e.dead);
  for (let i = 0; i < L.length; i++) {
    const a = L[i];
    for (let j = i + 1; j < L.length; j++) {
      const b = L[j];
      if (a.fly !== b.fly) continue;
      const am = a.kind === 'unit' && a.deploy <= 0, bm = b.kind === 'unit' && b.deploy <= 0;
      if (!am && !bm) continue;
      const dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy, min = (a.r + b.r) * 0.9;
      if (d2 >= min * min) continue;
      let d = Math.sqrt(d2), nx = 1, ny = 0;
      if (d > 1e-6) { nx = dx / d; ny = dy / d; } else { nx = a.id % 2 ? 1 : -1; d = 0; }
      const push = min - d;
      if (am && bm) { a.x -= nx * push / 2; a.y -= ny * push / 2; b.x += nx * push / 2; b.y += ny * push / 2; }
      else if (am) { a.x -= nx * push; a.y -= ny * push; }
      else { b.x += nx * push; b.y += ny * push; }
    }
  }
  for (const e of L) if (e.kind === 'unit') clampIsland(e);
}

const ratio = (s, p) => { const e = sanctOf(s, p); return Math.max(0, e.hp) / e.maxHp; };
function checkTime(s) {
  if (s.over || s.mode === 'survival') return;
  const a = ratio(s, 0), b = ratio(s, 1);
  if (s.t >= MATCH_TIME && !s.overtime) {
    if (Math.abs(a - b) >= 0.01) return finish(s, a > b ? 0 : 1, 'time');
    s.overtime = true; s.ev.push({ type: 'overtime' });
    if (s.riftN < 2) s.riftAt = s.t + RIFT.otDelay; // 2e faille : au début de la prolongation
  }
  if (s.overtime && Math.abs(a - b) >= 0.01) return finish(s, a > b ? 0 : 1, 'overtime');
  if (s.t >= MATCH_TIME + OVERTIME) finish(s, -1, 'draw');
}

export function timeLeft(s) { return s.overtime ? MATCH_TIME + OVERTIME - s.t : MATCH_TIME - s.t; }

export function hashState(s) {
  let h = 2166136261;
  const add = n => { h ^= Math.round(n * 1000) | 0; h = Math.imul(h, 16777619) >>> 0; };
  add(s.tick);
  for (const e of s.ents) { add(e.id); add(e.x); add(e.y); add(e.hp); }
  if (s.rift) { add(s.rift.x); add(s.rift.y); add(s.rift.end); } if (s.wev) { add(s.wev.at); add(s.wev.on ? 1 : 0); }
  for (const P of s.players) { add(P.mana); add(P.eveil); add(P.myth); add(ORDERS.indexOf(P.order)); for (const b of P.bench) add(b ? b.star * 7 + b.id.length : 0); }
  return h.toString(16);
}

// ---------- Commandant (Lot 4) ----------
export function cmdrOf(s, p) { const id = s.players[p].cmdrId; return id ? s.ents.find(e => e.id === id && !e.dead) || null : null; }
function signature(s, e) {
  e.sigUsed = true;
  const k = sigKind(e.card), S = CMDR.sig;
  s.ev.push({ type: 'csig', p: e.p, id: e.id, k, x: e.x, y: e.y });
  if (k === 'heal') { for (const o of s.ents) if (!o.dead && o.p === e.p && o.kind === 'unit' && dist(o, e) <= S.heal.r) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * S.heal.pct); return; }
  if (k === 'volley') {
    const tg = s.ents.filter(o => canTarget(e, o) && o.kind !== 'sanct' && dist(o, e) <= S.volley.r).sort((a, b) => dist(a, e) - dist(b, e)).slice(0, S.volley.n);
    for (const o of tg) s.proj.push({ x: e.x, y: e.y, tid: o.id, tx: o.x, ty: o.y, spd: 14, dmg: e.dmg * S.volley.dmg, splash: 0, p: e.p, kind: e.proj || 'arrow', src: e.id, fly: e.fly, id: s.nextId++ });
    return;
  }
  for (const o of s.ents) {
    if (o.dead || o.p === e.p || o.kind !== 'unit') continue;
    const d = dist(o, e); if (d > S.wave.r + o.r * 0.5) continue;
    damage(s, o, e.dmg * S.wave.dmg, e); if (o.dead || o.boss) continue;
    o.frozen = Math.max(o.frozen, S.wave.stun);
    const k2 = S.wave.push / (d || 1); o.x += (o.x - e.x) * k2; o.y += (o.y - e.y) * k2; clampIsland(o);
  }
}

// ---------- Failles dynamiques et événements de monde (Lot 3) ----------
// zone : { shape: 'circle', x, y, r } | { shape: 'band', y0, y1 } | { shape: 'side', side } | { shape: 'all' }
export function inZone(z, x, y) {
  if (!z) return false;
  if (z.shape === 'circle') return sq(x - z.x) + sq(y - z.y) <= z.r * z.r;
  if (z.shape === 'band') return y >= z.y0 && y <= z.y1;
  if (z.shape === 'side') return z.side < 0 ? x < CX - RX * 0.55 : x > CX + RX * 0.55;
  return z.shape === 'all';
}
// une zone touche-t-elle la faille ? (pour ne jamais les superposer : lisibilité)
function overlapsRift(s, z) {
  const R = s.rift; if (!R || !z) return false;
  if (z.shape === 'circle') return dist(z, R) < z.r + R.r + 0.8;
  if (z.shape === 'band') return R.y + R.r + 0.6 > z.y0 && R.y - R.r - 0.6 < z.y1;
  if (z.shape === 'side') return z.side < 0 ? R.x - R.r < CX - RX * 0.55 + 0.6 : R.x + R.r > CX + RX * 0.55 - 0.6;
  return false;
}
// zone dangereuse (l'IA évite d'y poser ses héros)
export function hazardAt(s, x, y) {
  if (s.rift && s.rift.k === 'tempete' && dist({ x, y }, s.rift) <= s.rift.r + 0.5) return true;
  return !!(s.wev && s.wev.k === 'lave' && inZone(s.wev.zone, x, y));
}
function riftOpen(s) {
  s.riftN++;
  const k = RIFT.kinds[Math.floor(rnd(s) * RIFT.kinds.length)];
  let x = CX, y = CY;
  for (let tries = 0; tries < 12; tries++) {
    x = CX + (rnd(s) - 0.5) * 8; y = CY + (rnd(s) - 0.5) * 6.4;
    if (!inIsland(x, y, RIFT.r + 0.4)) continue;
    const z = s.wev && s.wev.zone; // pas sur l'événement de monde en cours
    if (z && (z.shape === 'circle' ? dist({ x, y }, z) < z.r + RIFT.r + 0.8 : z.shape === 'band' ? y + RIFT.r + 0.6 > z.y0 && y - RIFT.r - 0.6 < z.y1 : z.shape === 'side' ? inZone(z, x - RIFT.r, y) || inZone(z, x + RIFT.r, y) : false)) continue;
    break;
  }
  s.rift = { k, x, y, r: RIFT.r, end: s.t + RIFT.dur, n: s.riftN };
  s.ev.push({ type: 'rift', k, x, y, r: RIFT.r, dur: RIFT.dur, n: s.riftN });
}
function wevZone(s, def, side) {
  const cyHalf = y => CY + side * y;
  if (def.k === 'bourrasque') { for (let i = 0; i < 6; i++) { const yc = cyHalf(1.8 + rnd(s) * 3.4), z = { shape: 'band', y0: yc - def.h / 2, y1: yc + def.h / 2 }; if (!overlapsRift(s, z)) return z; } return { shape: 'band', y0: cyHalf(4.5) - def.h / 2, y1: cyHalf(4.5) + def.h / 2 }; }
  if (def.k === 'lave') { let z = { shape: 'side', side }; if (overlapsRift(s, z)) z = { shape: 'side', side: -side }; return z; }
  if (def.k === 'eclipse') return { shape: 'all' };
  for (let i = 0; i < 8; i++) { const z = { shape: 'circle', x: CX + (rnd(s) - 0.5) * 7, y: cyHalf(2.2 + rnd(s) * 4.6), r: def.r }; if (inIsland(z.x, z.y, def.r * 0.6) && !overlapsRift(s, z)) return z; }
  return { shape: 'circle', x: CX, y: cyHalf(4), r: def.r };
}
function fieldTick(s, dt) {
  if (s.over) return;
  // Failles
  if (!s.rift && s.riftN < 2 && s.riftAt && s.t >= s.riftAt) { s.riftAt = 0; riftOpen(s); }
  const R = s.rift;
  if (R && s.t >= R.end) { s.rift = null; s.ev.push({ type: 'riftEnd', n: R.n }); }
  else if (R) for (const e of s.ents) {
    if (e.dead || e.kind !== 'unit' || e.deploy > 0) continue;
    const d = dist(e, R); if (d > R.r) continue;
    if (R.k === 'source') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * RIFT.source * dt);
    else if (R.k === 'tempete' && !e.boss) { const k = RIFT.tempete * dt / (d || 1); e.x += (e.x - R.x) * k; e.y += (e.y - R.y) * k; if (!d) e.x += RIFT.tempete * dt; clampIsland(e); e.slowT = Math.max(e.slowT, 0.3); e.slowK = Math.max(e.slowK || 0, 0.3); }
  }
  // Événement de monde
  const def = s.world && WEV[s.world];
  for (const e of s.ents) e.haste = false;
  if (!def) return;
  let W = s.wev;
  if (!W && s.t >= s.wevAt - WEV.warn) {
    const side = s.wevN % 2 ? -s.wevSide : s.wevSide;
    W = s.wev = { k: def.k, at: s.wevAt, end: s.wevAt + def.dur, on: false, zone: wevZone(s, def, side), n: ++s.wevN };
    s.ev.push({ type: 'wevWarn', k: W.k, zone: W.zone, at: W.at, n: W.n });
  }
  if (!W) return;
  if (!W.on && s.t >= W.at) { W.on = true; s.ev.push({ type: 'wev', k: W.k, zone: W.zone, dur: def.dur, n: W.n }); }
  if (W.on && s.t >= W.end) { s.ev.push({ type: 'wevEnd', k: W.k, n: W.n }); s.wev = null; s.wevAt = W.at + WEV.every; return; }
  if (!W.on) return;
  W.tick = (W.tick || 0) + dt; const pulse = W.tick >= 0.5; if (pulse) W.tick -= 0.5;
  for (const e of s.ents) {
    if (e.dead || e.kind !== 'unit' || e.deploy > 0 || !inZone(W.zone, e.x, e.y)) continue;
    if (W.k === 'bourrasque') { e.slowT = Math.max(e.slowT, 0.25); e.slowK = Math.max(e.slowK || 0, def.slow); }
    else if (W.k === 'lave') { if (pulse) damage(s, e, e.maxHp * def.dps * 0.5, null); }
    else if (W.k === 'spores') e.hp = Math.min(e.maxHp, e.hp + e.maxHp * def.heal * dt);
    else if (W.k === 'halo' && e.halo !== W.n) { e.halo = W.n; e.shield = Math.max(e.shield || 0, Math.round(e.maxHp * def.shield)); s.ev.push({ type: 'halo', id: e.id }); }
    else if (W.k === 'hate') e.haste = true;
  }
}

// ---------- Boss (campagne) ----------
// def : { base (héros servant de modèle), name, hp, dmg, hit, range, spd, r, scale, skills: [{ k, every, ... }] }
export function spawnBoss(s, p, def, x, y) {
  const e = spawn(s, p, def.base, x, y, 1, 1, 2.0);
  e.boss = def; e.bossHp = def.hp; e.bossDmg = def.dmg; e.bossR = def.r || 1.1;
  e.hit = def.hit || 1.6; e.spd = def.spd || 0.7; e.range = def.range || 1.3; e.tgt = def.tgt || 'any'; e.splash = def.splash || 1.4;
  e.fly = !!def.fly; e.proj = def.proj || null;
  applyStats(s, e); e.hp = e.maxHp; e.hit = def.hit || 1.6; e.range = def.range || 1.3;
  e.skillT = (def.skills || []).map(k => k.every * 0.6);
  s.ev.push({ type: 'boss', id: e.id, name: def.name });
  return e;
}
function bossTick(s, e, dt) {
  const def = e.boss;
  (def.skills || []).forEach((k, i) => {
    e.skillT[i] -= dt;
    if (e.skillT[i] > 0) return;
    e.skillT[i] = k.every;
    if (k.k === 'slam') { areaDamage(s, e.p, e.x, e.y, k.r || 3, k.dmg, 0.25, e); s.ev.push({ type: 'bossSkill', k: 'slam', id: e.id, x: e.x, y: e.y, r: k.r || 3 }); }
    else if (k.k === 'summon') { for (let n = 0; n < (k.n || 2); n++) { const m = spawn(s, e.p, k.id, e.x + (n % 2 ? 1 : -1) * (0.8 + n * 0.3), e.y + 0.8, 1, k.lvl || 1, 0.6); clampIsland(m); } s.ev.push({ type: 'bossSkill', k: 'summon', id: e.id, x: e.x, y: e.y }); }
    else if (k.k === 'freeze') { for (const o of s.ents) if (!o.dead && o.p !== e.p && o.kind === 'unit' && dist(o, e) <= (k.r || 3.5)) o.frozen = Math.max(o.frozen, k.t || 2); s.ev.push({ type: 'bossSkill', k: 'freeze', id: e.id, x: e.x, y: e.y, r: k.r || 3.5 }); }
    else if (k.k === 'heal') { e.hp = Math.min(e.maxHp, e.hp + e.maxHp * (k.pct || 0.08)); s.ev.push({ type: 'bossSkill', k: 'heal', id: e.id, x: e.x, y: e.y }); }
    else if (k.k === 'fire') { const tgt = s.ents.filter(o => !o.dead && o.p !== e.p && o.kind !== 'sanct'); const t = tgt.length ? tgt[Math.floor(rnd(s) * tgt.length)] : sanctOf(s, 1 - e.p); s.pend.push({ at: s.tick + 20, p: e.p, spell: 'meteore', x: t.x, y: t.y, k: 0, bossDmg: k.dmg }); s.ev.push({ type: 'cast', p: e.p, spell: 'meteore', x: t.x, y: t.y, delay: 1 }); }
  });
  if (!e.raged && e.hp < e.maxHp * 0.5) { e.raged = true; e.hit *= 0.7; e.spd *= 1.25; s.ev.push({ type: 'bossSkill', k: 'rage', id: e.id, x: e.x, y: e.y }); }
}

// ---------- Survie : vagues de monstres ----------
// wavesDef : { pool: [ids], boss: (n) => def | null, lvl: base }
function waveTick(s, dt) {
  s.waveT -= dt;
  const alive = s.ents.some(e => !e.dead && e.p === 1 && e.kind === 'unit');
  if (!alive && s.waveT > 4) s.waveT = 4; // vague vaincue : la suivante arrive vite
  if (s.waveT > 0) return;
  s.wave++;
  const W = s.wavesDef || { pool: ['squelette', 'pousse'], lvl: 1 };
  const n = Math.min(14, 2 + Math.floor(s.wave * 1.3)), lvl = (W.lvl || 1) + Math.floor(s.wave / 3);
  for (let k = 0; k < n; k++) {
    const id = W.pool[Math.floor(rnd(s) * W.pool.length)];
    const e = spawn(s, 1, id, 3 + rnd(s) * 10, 2.5 + rnd(s) * 3.5, s.wave >= 8 && rnd(s) < 0.25 ? 2 : 1, lvl, 1.0);
    clampIsland(e);
  }
  if (s.wave % 5 === 0 && W.bosses) { const d = W.bosses[(s.wave / 5 - 1) % W.bosses.length]; spawnBoss(s, 1, { ...d, hp: Math.round(d.hp * (0.6 + s.wave * 0.08)) }, CX, 4); }
  s.waveT = 26;
  s.ev.push({ type: 'wave', n: s.wave });
}
