// Tests des ajouts du 19/11 : recyclage, rôles, ★3, nouveaux sorts, reliques, mode équilibré, replays, statistiques.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, step, check, hashState, TICK_RATE, SANCT, sanctOf } from '../src/shared/sim.js';
import { STARTER_DECK, HERO, PLAYABLE, SPELLS, ROLES, FACTIONS, deckRoles, FAIR_LEVEL } from '../src/shared/content.js';
import { createBot, botThink } from '../src/shared/ai.js';
import { RELICS, relicChoices, dailyChallenge, dailyScore } from '../src/shared/campaign.js';

const D2 = ['golem', 'myra', 'archeres', 'cerf', 'kaelis', 'solenne', 'follets', 'nevra'];
const mk = o => createBattle({ seed: 7, decks: [STARTER_DECK, D2], spells: ['meteore', 'givre'], ...o });
const run = (s, n) => { for (let i = 0; i < n && !s.over; i++) step(s); };

test('chaque héros a un rôle connu, chaque faction a un sort', () => {
  for (const c of PLAYABLE) assert.ok(ROLES[c.role], c.id);
  for (const f of Object.keys(FACTIONS).filter(f => f !== 'neutre')) assert.ok(SPELLS.some(s => s.fac === f), f);
  assert.equal(deckRoles(['archeres', 'elwyn', 'frimas', 'osseuse']).tiers.tireur, 2);
});

test('recycler un socle rend 1 éther', () => {
  const s = mk(); const P = s.players[0];
  P.mana = 3; const id = P.bench[0].id;
  step(s, [{ p: 0, t: 'recycle', slot: 0 }]);
  assert.equal(P.bench[0], null);
  assert.ok(P.mana > 3.99 && P.mana < 4.1);
  assert.ok(s.ev.some(e => e.type === 'recycle' && e.id === id));
  assert.ok(check(s, { p: 0, t: 'recycle', slot: 0 }), 'socle vide refusé');
});

test('Ordre de l’Aube : bouclier d’arrivée et capture du Cœur plus rapide', () => {
  const aube = ['ecuyer', 'frere', 'solenne', 'griffon', 'archeres', 'jarl', 'brann', 'osseuse'];
  const s = createBattle({ seed: 3, decks: [aube, D2] });
  s.players[0].bench[0] = { id: 'ecuyer', star: 1 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  const e = s.ents.find(o => o.card === 'ecuyer' && o.p === 0);
  assert.ok(e.shield >= Math.round(e.maxHp * 0.12) - 1);
  const s2 = mk(); s2.players[0].bench[0] = { id: 'ecuyer', star: 1 };
  step(s2, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 13 }]);
  run(s, TICK_RATE * 2.5); run(s2, TICK_RATE * 2.5);
  assert.ok(s.heart.ctl > s2.heart.ctl, 'capture plus rapide');
});

test('★3 : effet d’apparition et ricochet du Tireur', () => {
  const s = mk();
  s.players[0].bench[0] = { id: 'frere', star: 3 };
  step(s, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 16 }]);
  let seen = false;
  for (let i = 0; i < TICK_RATE * 2; i++) { step(s); if (s.ev.some(e => e.type === 'star3' && e.role === 'gardien')) seen = true; }
  assert.ok(seen);
  const t = mk(); t.players[0].bench[0] = { id: 'frimas', star: 3 };
  step(t, [{ p: 0, t: 'deploy', slot: 0, x: 8, y: 14 }]);
  assert.equal(t.ents.find(e => e.card === 'frimas').s3, 'tireur');
});

test('nouveaux sorts : racines immobilisent, éruption brûle, malédiction affaiblit', () => {
  const s = createBattle({ seed: 9, decks: [STARTER_DECK, D2], spells: ['racines', 'meteore'] });
  s.players[1].bench[0] = { id: 'golem', star: 1 };
  step(s, [{ p: 1, t: 'deploy', slot: 0, x: 8, y: 9 }]);
  run(s, TICK_RATE * 1.5);
  s.players[0].eveil = 100;
  const g = s.ents.find(e => e.card === 'golem');
  step(s, [{ p: 0, t: 'spell', x: g.x, y: g.y }]);
  assert.ok(g.rootT > 3);
  const y0 = g.y; run(s, TICK_RATE); assert.ok(Math.abs(g.y - y0) < 0.01, 'ne bouge plus');
  const b = createBattle({ seed: 9, decks: [STARTER_DECK, D2], spells: ['eruption', 'meteore'] });
  b.players[0].eveil = 100; step(b, [{ p: 0, t: 'spell', x: 8, y: 6 }]);
  assert.equal(b.zones.length, 1); run(b, TICK_RATE * 6); assert.equal(b.zones.length, 0);
  const c = createBattle({ seed: 9, decks: [STARTER_DECK, D2], spells: ['malediction', 'meteore'] });
  c.players[1].bench[0] = { id: 'golem', star: 1 };
  step(c, [{ p: 1, t: 'deploy', slot: 0, x: 8, y: 9 }]); run(c, TICK_RATE * 1.5);
  const g2 = c.ents.find(e => e.card === 'golem'); c.players[0].eveil = 100;
  step(c, [{ p: 0, t: 'spell', x: g2.x, y: g2.y }]);
  assert.ok(g2.curseT > 5);
});

test('reliques : réserve d’éther et rempart sacré', () => {
  const s = mk({ relics: ['reserve', 'rempart'] });
  assert.ok(s.players[0].mana >= 7);
  assert.equal(sanctOf(s, 0).maxHp, Math.round(SANCT.hp * 1.2));
  assert.equal(sanctOf(s, 1).maxHp, SANCT.hp);
  assert.equal(relicChoices(1, ['onde']).length, 3);
  assert.ok(!relicChoices(1, ['onde']).includes('onde'));
  for (const k of relicChoices(4)) assert.ok(RELICS[k]);
});

test('mode équilibré : niveaux plafonnés, bonus et reliques ignorés', () => {
  const s = mk({ fair: true, levels: [{ ecuyer: 12 }, {}], bonus: { hp: 2, sanctDmg: 2, eveil: 2 }, relics: ['reserve'] });
  assert.equal(s.players[0].levels.ecuyer, FAIR_LEVEL);
  assert.equal(s.players[0].bonus.hp, 1);
  assert.equal(s.players[0].relics.length, 0);
});

test('temps limite (Défi du jour) : défaite quand il est dépassé', () => {
  const s = mk({ mods: { limit: 5 } });
  run(s, TICK_RATE * 6);
  assert.ok(s.over); assert.equal(s.winner, 1); assert.equal(s.reason, 'limit');
  const d = dailyChallenge(20261119);
  assert.deepEqual(d, dailyChallenge(20261119), 'le même défi pour tout le monde');
  assert.equal(d.deck.length, 8);
  assert.equal(dailyScore(d, { result: 'loss', time: 30, myHp: 1 }), 0);
});

test('replay : rejouer la graine + les commandes redonne exactement le même combat', () => {
  const params = { seed: 555, decks: [STARTER_DECK, D2], spells: ['eruption', 'racines'] };
  const s = createBattle(params), b0 = createBot(0, 3, 1), b1 = createBot(1, 3, 2), log = [];
  while (!s.over) { const cmds = [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean); for (const c of cmds) log.push({ ...c, tick: s.tick }); step(s, cmds); }
  const r = createBattle(JSON.parse(JSON.stringify(params))); let i = 0;
  while (!r.over) { const cmds = []; while (i < log.length && log[i].tick === r.tick) { const { tick, ...c } = log[i++]; cmds.push(c); } step(r, cmds); }
  assert.equal(hashState(r), hashState(s)); assert.equal(r.winner, s.winner);
  assert.ok(JSON.stringify(log).length < 20000, 'quelques kilo-octets');
});

test('statistiques de fin de combat remplies', () => {
  const s = createBattle({ seed: 77, decks: [STARTER_DECK, D2], spells: ['meteore', 'givre'] });
  const b0 = createBot(0, 3, 1), b1 = createBot(1, 3, 2);
  while (!s.over) step(s, [botThink(b0, s, 1 / TICK_RATE), botThink(b1, s, 1 / TICK_RATE)].filter(Boolean));
  const st = Object.values(s.players[0].st);
  assert.ok(st.length > 2);
  assert.ok(st.reduce((a, r) => a + r.dmg, 0) > 1000);
  assert.ok(st.reduce((a, r) => a + r.taken, 0) > 0);
});
