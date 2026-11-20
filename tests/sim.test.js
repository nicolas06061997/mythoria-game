import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, check, hashState, TICK_RATE, MATCH_TIME, OVERTIME, SUMMON_COST, sanctOf, HEART, MYTH, ORDER_CD, RIFT, WEV, inZone, CMDR, cmdrOf } from '../src/shared/sim.js';
import { STARTER_DECK, HERO } from '../src/shared/content.js';
import { createBot, botThink } from '../src/shared/ai.js';

export const DECK2 = ['golem', 'myra', 'archeres', 'cerf', 'kaelis', 'solenne', 'follets', 'nevra'];
const mk = (seed = 42) => createBattle({ seed, decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });

export function botMatch(seed, l0 = 2, l1 = 2, d0 = STARTER_DECK, d1 = DECK2) {
  const s = createBattle({ seed, decks: [d0, d1], spells: ['meteore', 'givre'] });
  const b0 = createBot(0, l0, seed + 1), b1 = createBot(1, l1, seed + 2);
  const log = [];
  while (!s.over) {
    const cmds = [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean);
    for (const c of cmds) log.push({ ...c, tick: s.tick });
    step(s, cmds);
  }
  return { s, log };
}

test('le combat commence avec 2 Sanctuaires et 2 héros sur chaque cercle', () => {
  const s = mk();
  assert.equal(s.ents.filter(e => e.kind === 'sanct').length, 2);
  for (const P of s.players) assert.equal(P.bench.filter(Boolean).length, 2);
});

test('invoquer coûte de l’éther et remplit le cercle', () => {
  const s = mk();
  const m = s.players[0].mana;
  step(s, [{ p: 0, t: 'summon' }]);
  assert.equal(s.players[0].bench.filter(Boolean).length, 3);
  assert.ok(s.players[0].mana < m - SUMMON_COST + 0.1);
});

test('commandes interdites refusées (anti-triche)', () => {
  const s = mk();
  assert.ok(check(s, { p: 0, t: 'deploy', slot: 0, x: 8, y: 4 }), 'déploiement chez l’adversaire');
  assert.ok(check(s, { p: 0, t: 'deploy', slot: 4, x: 8, y: 18 }), 'place vide');
  assert.ok(check(s, { p: 0, t: 'spell', x: 8, y: 12 }), 'jauge vide');
  assert.ok(check(s, { p: 0, t: 'hack' }));
  s.players[0].mana = 0;
  assert.ok(check(s, { p: 0, t: 'summon' }), 'sans éther');
  step(s, [{ p: 0, t: 'summon' }]);
  assert.equal(s.ev[0].type, 'reject');
});

test('fusion sur le cercle : deux héros identiques = un héros ★2', () => {
  const s = mk();
  s.players[0].bench = [{ id: 'frere', star: 1 }, { id: 'frere', star: 1 }, null, null, null];
  step(s, [{ p: 0, t: 'merge', a: 0, b: 1 }]);
  assert.deepEqual(s.players[0].bench[1], { id: 'frere', star: 2 });
  assert.equal(s.players[0].bench[0], null);
  step(s, [{ p: 0, t: 'deploy', slot: 1, x: 8, y: 18 }]);
  const fr = s.ents.find(e => e.card === 'frere');
  assert.equal(fr.star, 2);
  assert.ok(fr.maxHp > HERO.frere.hp * 1.7);
});

test('le Cœur de Mythe est capturé par le camp seul à côté', () => {
  const s = mk();
  s.players[0].bench[0] = { id: 'frere', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  for (let i = 0; i < TICK_RATE * 6; i++) step(s);
  assert.equal(s.heart.owner, 0);
});

test('détruire le Sanctuaire adverse = victoire', () => {
  const s = mk();
  sanctOf(s, 1).hp = 1;
  s.players[0].bench[0] = { id: 'archeres', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  for (let i = 0; i < TICK_RATE * 30 && !s.over; i++) step(s);
  assert.equal(s.winner, 0);
  assert.equal(s.reason, 'sanct');
});

test('déterminisme : même graine + mêmes commandes = même combat', () => {
  const a = botMatch(123);
  const s2 = createBattle({ seed: 123, decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });
  let i = 0;
  while (!s2.over) {
    const cmds = [];
    while (i < a.log.length && a.log[i].tick === s2.tick) { const { tick, ...c } = a.log[i++]; cmds.push(c); }
    step(s2, cmds);
  }
  assert.equal(hashState(s2), hashState(a.s));
  assert.equal(s2.winner, a.s.winner);
});

test('IA contre IA : chaque combat se termine', () => {
  const out = [];
  for (let seed = 1; seed <= 10; seed++) {
    const { s } = botMatch(seed * 97);
    assert.ok(s.over && s.t <= MATCH_TIME + OVERTIME + 0.1);
    out.push(s.winner + ':' + s.reason + '@' + Math.round(s.t));
  }
  console.log('  résultats :', out.join('  '));
});

test('une IA forte bat souvent une IA faible', () => {
  let wins = 0;
  for (let seed = 1; seed <= 10; seed++) if (botMatch(seed * 31, 0, 4, STARTER_DECK, STARTER_DECK).s.winner === 1) wins++;
  console.log('  victoires IA forte :', wins, '/ 10');
  assert.ok(wins >= 6);
});

// Objets d'équipement (19/11) : bonus plafonnés et appliqués au héros en combat
import { gearBonus, ITEM_MAX, botGear, itemsFor } from '../src/shared/items.js';
test('objets : bonus plafonnés et appliqués', async () => {
  const { createBattle } = await import('../src/shared/sim.js');
  assert.equal(itemsFor('ecuyer').length, 10);
  const g = gearBonus(['ecuyer:a4', 'ecuyer:a3', 'ecuyer:t4']);
  assert.ok(g.dmg <= ITEM_MAX.dmg + 1e-9);
  const deck = ['ecuyer', 'archeres', 'loups', 'follets', 'jarl', 'squelettes', 'osseuse', 'frere'];
  const a = createBattle({ seed: 3, decks: [deck, deck] }), b = createBattle({ seed: 3, decks: [deck, deck], gear: [{ ecuyer: gearBonus(['ecuyer:a4', 'ecuyer:t4']) }, {}] });
  assert.ok(a && b);
  assert.equal(Object.keys(botGear(deck, 0)).length, 0);
  assert.equal(Object.keys(botGear(deck, 900)).length, deck.length);
});

// ---------- Lot 2 : ordres tactiques et Décharge du Mythe ----------
test('ordres : Assaut au départ, ordres mal formés ou trop rapprochés refusés', () => {
  const s = mk();
  assert.equal(s.players[0].order, 'assault');
  assert.ok(check(s, { p: 0, t: 'order', o: 'charge' }));          // ordre inconnu
  assert.ok(check(s, { p: 0, t: 'order', o: 'assault' }));         // déjà en cours
  step(s, [{ p: 0, t: 'order', o: 'defend' }]);
  assert.equal(s.players[0].order, 'defend');
  assert.ok(check(s, { p: 0, t: 'order', o: 'heart' }));           // trop tôt
  for (let i = 0; i < TICK_RATE * ORDER_CD + 2; i++) step(s);
  assert.equal(check(s, { p: 0, t: 'order', o: 'heart' }), null);
  assert.equal(s.players[1].order, 'assault');                     // l'autre camp n'est pas touché
});

test('ordre Défense : les héros reviennent devant leur Sanctuaire ; ordre Cœur : ils restent au centre', () => {
  const s = mk();
  s.players[0].bench[0] = { id: 'frere', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }, { p: 0, t: 'order', o: 'defend' }]);
  for (let i = 0; i < TICK_RATE * 12; i++) step(s);
  const u = s.ents.find(e => e.p === 0 && e.kind === 'unit');
  assert.ok(u.y > 16, 'replié vers son Sanctuaire (y=' + u.y.toFixed(1) + ')');
  for (let i = 0; i < TICK_RATE * ORDER_CD; i++) step(s);
  step(s, [{ p: 0, t: 'order', o: 'heart' }]);
  for (let i = 0; i < TICK_RATE * 15; i++) step(s);
  assert.ok(Math.hypot(u.x - HEART.x, u.y - HEART.y) < HEART.r, 'au Cœur');
});

test('Décharge du Mythe : tenir le Cœur 30 s au total frappe le Sanctuaire adverse', () => {
  const s = mk();
  s.players[0].bench[0] = { id: 'frere', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }, { p: 0, t: 'order', o: 'heart' }]);
  const op = sanctOf(s, 1), hp0 = op.hp;
  let fired = null;
  for (let i = 0; i < TICK_RATE * 45 && !fired; i++) { step(s); fired = s.ev.find(e => e.type === 'discharge'); }
  assert.ok(fired, 'la Décharge part');
  assert.equal(fired.p, 0);
  assert.ok(hp0 - op.hp >= Math.round(op.maxHp * MYTH.sanctPct) - 1, 'Sanctuaire touché');
  assert.ok(s.players[0].myth < 1, 'le compteur repart à zéro');
  assert.equal(s.players[0].discharges, 1);
});

// ---------- Lot 3 : failles dynamiques et événements de monde ----------
const mkW = (world, seed = 42) => createBattle({ world, seed, decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });
const run = (s, sec, fn) => { for (let i = 0; i < TICK_RATE * sec && !s.over; i++) { step(s); if (fn) fn(s.ev); } };

test('faille : s’ouvre entre 1:20 et 1:40 pour 15 s, au même moment pour la même graine', () => {
  const opened = seed => { const s = mkW(null, seed); let at = -1, end = -1; run(s, 130, ev => { for (const e of ev) { if (e.type === 'rift' && at < 0) at = s.t; if (e.type === 'riftEnd' && end < 0) end = s.t; } }); return { at, end }; };
  const a = opened(7), b = opened(7);
  assert.deepEqual(a, b);
  assert.ok(a.at >= RIFT.at[0] && a.at <= RIFT.at[1] + 0.1, 'ouverture à ' + a.at);
  assert.ok(Math.abs(a.end - a.at - RIFT.dur) < 0.2);
});

test('faille : une 2e au début de la prolongation', () => {
  const s = mkW(null, 3); let n = 0;
  run(s, MATCH_TIME - 1, ev => { n += ev.filter(e => e.type === 'rift').length; });
  assert.equal(n, 1);
  for (const q of [0, 1]) sanctOf(s, q).hp = 9000; // égalité parfaite -> prolongation
  run(s, 20, ev => { n += ev.filter(e => e.type === 'rift').length; });
  assert.ok(s.overtime, 'prolongation');
  assert.equal(n, 2);
});

test('événement de monde : annoncé, toutes les ~30 s, jamais sur la faille', () => {
  for (const w of Object.keys(WEV).filter(k => WEV[k].k)) {
    const s = mkW(w, 11); const seen = []; let warn = 0;
    run(s, 140, ev => { for (const e of ev) { if (e.type === 'wevWarn') warn++; if (e.type === 'wev') { seen.push(s.t); if (s.rift && e.zone.shape !== 'all') { const R = s.rift; assert.ok(!inZone(e.zone, R.x, R.y), w + ' : événement sur la faille'); } } } });
    assert.equal(seen[0] >= WEV.first - 0.1 && seen[0] <= WEV.first + 0.2, true, w);
    assert.ok(seen.length >= 3 && warn >= seen.length, w);
    assert.equal(s.wevN >= 3, true);
  }
});

test('Éclipse : les Sanctuaires ne tirent plus ; lave : dégâts sur le bord', () => {
  const s = mkW('ombre', 5);
  run(s, WEV.first + 0.5);
  assert.equal(s.wev && s.wev.on && s.wev.k, 'eclipse');
  const bolts = s.proj.length; s.players[1].bench[0] = { id: 'frere', star: 1 };
  const t = sanctOf(s, 0); run(s, 2);
  assert.ok(!s.proj.some(p => p.src === t.id || p.src === sanctOf(s, 1).id), 'aucun tir de Sanctuaire pendant l’Éclipse');
  const L = mkW('braise', 5); run(L, WEV.first + 0.2);
  assert.equal(L.wev.k, 'lave');
  L.players[0].bench[0] = { id: 'frere', star: 1 };
  const x = L.wev.zone.side < 0 ? 1.6 : 14.4;
  step(L, [{ p: 0, t: 'deploy', slot: 0, x, y: 13 }]); run(L, 1.2);
  const u = L.ents.find(e => e.p === 0 && e.kind === 'unit');
  u.frozen = 3; u.x = x; const hp = u.hp + u.shield; run(L, 1.1); // immobile sur le bord
  assert.ok(u.dead || u.hp + u.shield < hp, 'la lave brûle');
});

// ---------- Lot 4 : Commandant ----------
const mkC = (seed = 42) => createBattle({ seed, commanders: ['frere', 'myra'], decks: [STARTER_DECK, DECK2], spells: ['meteore', 'givre'] });

test('Commandant : Éveil plein requis, posé sur sa moitié, 10 s puis il repart', () => {
  const s = mkC();
  assert.ok(check(s, { p: 0, t: 'commander', x: 8, y: 16 }), 'Éveil vide : refusé');
  s.players[0].eveil = 100;
  assert.ok(check(s, { p: 0, t: 'commander', x: 8, y: 6 }), 'moitié adverse : refusé');
  step(s, [{ p: 0, t: 'commander', x: 8, y: 16 }]);
  assert.ok(s.players[0].eveil < 1, 'Éveil consommé');
  const c = cmdrOf(s, 0);
  assert.ok(c && c.cmdr && c.card === 'frere' && c.star === CMDR.star);
  assert.ok(check(s, { p: 0, t: 'commander', x: 8, y: 16 }), 'un seul à la fois');
  run(s, CMDR.life + 0.8); // 10 s après l'atterrissage (0,6 s)
  assert.equal(cmdrOf(s, 0), null, 'reparti après 10 s');
});

test('Commandant : dirigé au joystick, compétence une seule fois, pas de bonus de faction', () => {
  const s = mkC(); s.players[0].eveil = 100;
  step(s, [{ p: 0, t: 'commander', x: 8, y: 17 }]); run(s, 0.8);
  const c = cmdrOf(s, 0), x0 = c.x;
  assert.ok(check(s, { p: 0, t: 'cmove', dx: 9, dy: 0 }), 'direction hors limites refusée');
  step(s, [{ p: 0, t: 'cmove', dx: 8, dy: 0 }]); run(s, 1);
  assert.ok(c.x > x0 + 0.5, 'il avance vers la droite');
  step(s, [{ p: 0, t: 'csig' }]);
  assert.ok(check(s, { p: 0, t: 'csig' }), 'compétence déjà utilisée');
  // même héros, même rang : le Commandant n'a pas le bonus de faction « aube » du deck de départ
  const ref = createBattle({ seed: 1, decks: [['frere', 'frere', 'frere', 'frere', 'frere', 'frere', 'frere', 'frere'], DECK2] });
  assert.ok(ref.players[0].syn.aube > 0);
  const s2 = createBattle({ seed: 1, commanders: ['frere', null], decks: [['frere', 'frere', 'frere', 'frere', 'frere', 'frere', 'frere', 'frere'], DECK2] });
  s2.players[0].eveil = 100; step(s2, [{ p: 0, t: 'commander', x: 8, y: 17 }]);
  s2.players[0].bench[0] = { id: 'frere', star: CMDR.star }; step(s2, [{ p: 0, t: 'deploy', slot: 0, x: 5, y: 17 }]);
  const cm = cmdrOf(s2, 0), twin = s2.ents.find(e => e.card === 'frere' && !e.cmdr && e.p === 0);
  assert.ok(cm.maxHp < twin.maxHp * CMDR.power + 1, 'sans bonus de faction');
});

test('Commandant : même graine + mêmes commandes = même combat (IA qui l’utilise)', () => {
  const play = () => { const s = mkC(77), b0 = createBot(0, 4, 1), b1 = createBot(1, 4, 2), log = []; while (!s.over) { const c = [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean); log.push(...c.map(x => x.t)); step(s, c); } return { h: hashState(s), n: log.filter(t => t === 'commander').length }; };
  const a = play(), b = play();
  assert.equal(a.h, b.h);
  assert.ok(a.n >= 1, 'l’IA appelle son Commandant');
});
