// MYTHORIA — IA d'entraînement. Elle utilise exactement les mêmes commandes qu'un joueur
// (invoquer, fusionner, déployer, sortilège), vérifiées par la simulation.
// Toujours affichée comme « IA » : jamais présentée comme un vrai joueur.

import { HERO, SPELL, MAX_STAR } from './content.js';
import { CY, HEART, SUMMON_COST, MYTH, check, sanctOf, inIsland, hazardAt, cmdrOf, sigKind } from './sim.js';
import { makeRng } from './rng.js';

// cmdr : chance d'appeler le Commandant plutôt que le sortilège quand l'Éveil est plein ;
// orders : chance de penser aux ordres tactiques à chaque décision (la Recrue n'en donne jamais) ;
// think : secondes entre deux décisions ; mana : vitesse de l'éther de l'IA ; mistake : chance d'agir au hasard / de rester passive.
export const AI_LEVELS = [
  { name: 'Recrue',    think: 3.6, merge: 0.1, defend: 0.35, heart: 0.15, spellSmart: 0.2, reserve: 0, mana: 0.6, mistake: 0.45, orders: 0.0, cmdr: 0.0 },
  { name: 'Soldat',    think: 3.1, merge: 0.3, defend: 0.5, heart: 0.3, spellSmart: 0.35, reserve: 0, mana: 0.68, mistake: 0.36, orders: 0.08, cmdr: 0.2 },
  { name: 'Capitaine', think: 2.8, merge: 0.45, defend: 0.6, heart: 0.45, spellSmart: 0.55, reserve: 0, mana: 0.72, mistake: 0.3, orders: 0.1, cmdr: 0.35 },
  { name: 'Champion',  think: 2.6, merge: 0.55, defend: 0.65, heart: 0.55, spellSmart: 0.7, reserve: 0, mana: 0.76, mistake: 0.25, orders: 0.13, cmdr: 0.5 },
  { name: 'Seigneur',  think: 2.2, merge: 0.7, defend: 0.8, heart: 0.7, spellSmart: 0.85, reserve: 0, mana: 0.84, mistake: 0.16, orders: 0.18, cmdr: 0.65 },
];

export function createBot(p, level = 1, seed = 7) {
  return { p, L: AI_LEVELS[Math.max(0, Math.min(AI_LEVELS.length - 1, level))], rng: makeRng(seed), wait: 1.5 };
}

const d2 = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const power = h => { const c = HERO[h.id]; return (c.hp + c.dmg * 6) * (c.count || 1) * [1, 1, 1.8, 3][h.star]; };

export function botThink(bot, s, dt) {
  bot.wait -= dt;
  if (bot.wait > 0 || s.over) return null;
  bot.wait = bot.L.think * (0.7 + bot.rng() * 0.6);
  const p = bot.p, P = s.players[p], L = bot.L, home = p === 0 ? 1 : -1;
  if (bot.rng() < L.mistake) {
    // erreur volontaire : ne rien faire, ou poser un héros n'importe où
    if (bot.rng() < 0.5) return null;
    const k = P.bench.findIndex(Boolean); if (k < 0) return null;
    const cm = { p, t: 'deploy', slot: k, x: 2 + bot.rng() * 12, y: p === 0 ? CY + 2 + bot.rng() * 8 : CY - 2 - bot.rng() * 8 };
    return check(s, cm) ? null : cm;
  }
  const ok = cm => (check(s, cm) ? null : cm);
  const mySide = y => (p === 0 ? y > CY + 0.9 : y < CY - 0.9);
  const enemies = s.ents.filter(e => !e.dead && e.p !== p && e.kind === 'unit');
  const mine = s.ents.filter(e => !e.dead && e.p === p && e.kind === 'unit');
  const sanct = sanctOf(s, p);

  // 0) Commandant sur l'île : compétence signature quand elle sert (Lot 4)
  const C = cmdrOf(s, p);
  if (C && !C.sigUsed) {
    const k = sigKind(C.card), near = r => enemies.filter(e => d2(e, C) <= r * r).length;
    if ((k === 'wave' && near(2.6) >= 2) || (k === 'volley' && near(6) >= 2) || (k === 'heal' && mine.filter(e => d2(e, C) < 16 && e.hp < e.maxHp * 0.6).length >= 2) || C.cmdrT < 1.5) { const cm = ok({ p, t: 'csig' }); if (cm) return cm; }
  }
  // 1) Éveil plein : Commandant (selon le niveau) ou sortilège
  if (P.eveil >= 100 && P.cmdr && L.cmdr && bot.rng() < L.cmdr) {
    const danger = enemies.filter(e => d2(e, sanct) < 64).sort((a, b) => d2(a, sanct) - d2(b, sanct))[0];
    const x = danger ? danger.x : 8 + (bot.rng() - 0.5) * 3, y = danger ? danger.y + home * 1.5 : CY + home * 1.4;
    const cy = p === 0 ? clamp(y, CY + 1.2, 21) : clamp(y, 3, CY - 1.2);
    const cm = ok({ p, t: 'commander', x: clamp(x, 2, 14), y: cy }); if (cm) return cm;
  }
  if (P.eveil >= 100) {
    const sp = SPELL[P.spell];
    if (sp.heal) {
      if (mine.length >= 2) { const c = best(mine, 3); if (c.n >= 2) return ok({ p, t: 'spell', x: c.x, y: c.y }); }
    } else if (enemies.length) {
      const c = best(enemies, sp.radius);
      const danger = enemies.some(e => d2(e, sanct) < 49);
      if (c.n >= 3 || danger || bot.rng() > L.spellSmart) return ok({ p, t: 'spell', x: c.x, y: c.y });
    }
  }
  // 1 bis) Ordre tactique (mêmes ordres que le joueur) : défendre si le Sanctuaire est menacé,
  // tenir le Cœur quand on a du monde sur l'île, pousser quand on domine. Plus l'IA est forte, plus elle y pense.
  if (L.orders && mine.length && P.orderCd <= 0 && bot.rng() < L.orders) {
    const near = enemies.filter(e => d2(e, sanct) < 64).length, guard = mine.filter(e => d2(e, sanct) < 64).length;
    const H = s.heart, myHeart = H.owner === p;
    let want = P.order;
    // le Cœur est l'objectif principal ; défendre si le Sanctuaire est menacé ; pousser seulement en net avantage
    if (near >= 2 && near > guard) want = 'defend';
    else if (mine.length >= enemies.length + 4 || (s.t > 150 && sanct.hp / sanct.maxHp < sanctOf(s, 1 - p).hp / sanctOf(s, 1 - p).maxHp - 0.1)) want = 'assault';
    else want = 'heart';
    if (want !== P.order) { const cm = ok({ p, t: 'order', o: want }); if (cm) return cm; }
  }
  // 2) Fusion sur le cercle
  if (bot.rng() < L.merge) {
    for (let a = 0; a < P.bench.length; a++) for (let b = 0; b < P.bench.length; b++) {
      const A = P.bench[a], B = P.bench[b];
      if (a !== b && A && B && A.id === B.id && A.star === B.star && B.star < MAX_STAR) return ok({ p, t: 'merge', a, b });
    }
  }
  const bench = P.bench.map((h, i) => (h ? { ...h, slot: i } : null)).filter(Boolean);
  const place = (h, x, y) => {
    x = clamp(x, 1.5, 14.5);
    y = p === 0 ? clamp(y, CY + 1.2, 22) : clamp(y, 2, CY - 1.2);
    if (!inIsland(x, y, 0.6)) x = 8 + (x - 8) * 0.6;
    // éviter la lave et la Faille-Tempête (Lot 3) : essayer de l'autre côté, puis plus au centre
    if (hazardAt(s, x, y)) { const alt = [[16 - x, y], [8, y], [8 + (x - 8) * 0.3, y + home * 1.5]].find(([ax, ay]) => !hazardAt(s, ax, ay) && inIsland(ax, ay, 0.6)); if (alt) [x, y] = alt; }
    return ok({ p, t: 'deploy', slot: h.slot, x, y });
  };

  // 3) Défense : ennemis dans ma moitié
  const threats = enemies.filter(e => mySide(e.y)).sort((a, b) => d2(a, sanct) - d2(b, sanct));
  if (threats.length && bench.length && bot.rng() < L.defend) {
    const th = threats[0], air = threats.some(e => e.fly);
    const cands = bench.filter(h => HERO[h.id].tgt !== 'buildings' && (!air || HERO[h.id].tgt === 'any'));
    const pick = (cands.length ? cands : bench).sort((a, b) => power(b) - power(a))[0];
    const c = HERO[pick.id];
    const back = c.range > 2 ? 3.5 : 1.8;
    const cmd = place(pick, th.x + (bot.rng() - 0.5), th.y + home * back);
    if (cmd) return cmd;
  }
  // 4) Cœur de Mythe : y envoyer quelqu'un si personne n'y est
  const atHeart = mine.some(e => d2(e, HEART) < 9);
  if (!atHeart && s.heart.owner !== p && bench.length && bot.rng() < L.heart) {
    const pick = bench.filter(h => HERO[h.id].tgt !== 'buildings').sort((a, b) => power(b) - power(a))[0];
    if (pick) { const cmd = place(pick, 8 + (bot.rng() - 0.5) * 3, CY + home * 1.4); if (cmd) return cmd; }
  }
  // 5) Invoquer
  if (P.bench.includes(null) && P.mana >= SUMMON_COST + (bench.length >= 3 ? L.reserve : 0)) return ok({ p, t: 'summon' });
  // 5 bis) Cercle plein sans fusion possible et éther au maximum : recycler le héros le plus faible
  if (!P.bench.includes(null) && P.mana >= 9.5 && !bench.some(a => bench.some(b => a !== b && a.id === b.id && a.star === b.star && a.star < MAX_STAR)) && bot.rng() < L.merge) {
    const low = bench.slice().sort((a, b) => power(a) - power(b))[0];
    return ok({ p, t: 'recycle', slot: low.slot });
  }
  // 6) Attaque : cercle plein ou héros puissant prêt
  if (bench.length >= 4 || bench.some(h => h.star >= 2)) {
    const pick = bench.sort((a, b) => power(b) - power(a))[0];
    const tank = HERO[pick.id].hp >= 1300;
    return place(pick, 8 + (bot.rng() - 0.5) * 5, CY + home * (tank ? 3 : 1.5));
  }
  return null;
}

function best(list, r) {
  let bx = list[0].x, by = list[0].y, bn = 0;
  for (const a of list) {
    let n = 0, sx = 0, sy = 0;
    for (const b of list) if (d2(a, b) <= r * r) { n++; sx += b.x; sy += b.y; }
    if (n > bn) { bn = n; bx = sx / n; by = sy / n; }
  }
  return { x: bx, y: by, n: bn };
}
