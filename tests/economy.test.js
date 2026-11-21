// Éclats de Faille, Autel des Failles et jauge de conquête (remplacent les coffres à minuteur, 19/11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ECLATS, ECLAT_CYCLE, OLD_CHEST, eclatType, rollEclat, purifyPerDay, autelBonus, conquestPoints, conquestReward, CONQUEST_MAX, MISSION_POOL, LOGIN, dailyShop, makeMissions } from '../src/shared/economy.js';
import { CHAPTERS, TOURNEY } from '../src/shared/campaign.js';
import { BUILDINGS, BUILD_ORDER, newKingdom } from '../src/shared/kingdom.js';
import { unlockedHeroes } from '../src/shared/content.js';

const owned = unlockedHeroes(2000);

test('un Éclat purifié donne toujours le même contenu pour la même graine', () => {
  for (const t of Object.keys(ECLATS)) {
    const a = rollEclat(t, 12345, owned), b = rollEclat(t, 12345, owned);
    assert.deepEqual(a, b, t);
    assert.ok(a.gold > 0 && Object.keys(a.shards).length > 0, t);
  }
});

test('l’Autel améliore le contenu sans changer le tirage des héros', () => {
  const a = rollEclat('dore', 77, owned, 1), b = rollEclat('dore', 77, owned, 10);
  assert.ok(b.gold > a.gold && b.crystals >= a.crystals);
  assert.deepEqual(Object.keys(a.shards), Object.keys(b.shards));
  assert.equal(purifyPerDay(1), 4); assert.equal(purifyPerDay(10), 13);
  assert.equal(autelBonus(1), 1);
});

test('les Éclats mythiques contiennent un héros légendaire ou mythique', () => {
  for (let s = 1; s < 30; s++) {
    const r = rollEclat('mythe', s, owned);
    assert.ok(Object.keys(r.shards).length > 0);
  }
});

test('les anciens coffres deviennent des Éclats, plus aucun coffre dans les règles', () => {
  for (const [old, t] of Object.entries(OLD_CHEST)) { assert.ok(ECLATS[t], old); assert.equal(eclatType(old), t); }
  assert.ok(ECLAT_CYCLE.every(t => ECLATS[t]));
  assert.ok(!MISSION_POOL.some(m => m.k === 'chest'));
  assert.ok(!LOGIN.some(r => r.chest) && LOGIN.some(r => r.eclat));
  for (const ch of CHAPTERS) for (const st of ch.stages) assert.ok(!st.reward.chest && (!st.reward.eclat || ECLATS[st.reward.eclat]));
  assert.ok(!TOURNEY.reward.some(r => r.chest));
  assert.ok(!dailyShop(20261119, owned).some(o => o.kind === 'chest'));
  assert.ok(!makeMissions(5, true).some(m => m.reward.chest));
});

test('jauge de conquête : l’Arène la remplit, l’entraînement non', () => {
  assert.equal(conquestPoints('arena', 'win', false), 12);
  assert.equal(conquestPoints('arena', 'win', true), 16);
  assert.ok(conquestPoints('arena', 'loss') > 0 && conquestPoints('arena', 'draw') > conquestPoints('arena', 'loss'));
  assert.equal(conquestPoints('training', 'win'), 0);
  assert.equal(conquestPoints('campaign', 'loss'), 0);
  const r = conquestReward(0, 9, owned);
  assert.ok(r.relic && ECLATS[r.type] && r.gems >= 5);
  assert.ok(CONQUEST_MAX / conquestPoints('arena', 'win') <= 10); // une Relique toutes les ~8 victoires
});

test('l’Autel des Failles est un bâtiment offert dès le départ', () => {
  assert.ok(BUILDINGS.autel && BUILD_ORDER.includes('autel'));
  assert.equal(newKingdom(0).b.autel, 1);
});

test('profil : les coffres d’une ancienne sauvegarde deviennent des Éclats', async () => {
  const mem = {};
  globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
  mem.myt_profile_v2 = JSON.stringify({ v: 3, name: 'Test', trophies: 50, chests: [{ type: 'or', seed: 5, start: 1, end: 2 }, null, { type: 'legendaire', seed: 8, start: 0, end: 0 }, null], chestIdx: 7,
    missions: { day: 1, list: [{ k: 'chest', n: 2, prog: 1, reward: { gems: 5 }, claimed: false, txt: 'Ouvre 2 coffres' }], week: 1, wlist: [] },
    login: { day: 1, streak: 5, pending: { chest: 'argent' } }, kingdom: { b: { chateau: 2, mine: 1 }, last: {}, job: null, deco: [] } });
  const S = await import('../src/client/store.js');
  const p = S.loadProfile();
  assert.equal(p.chests, undefined);
  assert.deepEqual(p.eclats.map(e => e.type), ['dore', 'mythe']);
  assert.equal(p.eclatIdx, 7);
  assert.equal(p.kingdom.b.autel, 1);
  assert.ok(p.conquest.pts === 0 && p.autel.used === 0);
  // une sauvegarde abîmée ne casse rien
  mem.myt_profile_v2 = JSON.stringify({ eclats: 'x', conquest: 'x', autel: 5, kingdom: { faux: true } });
  const q = S.loadProfile();
  assert.ok(Array.isArray(q.eclats) && q.kingdom.b.autel === 1 && q.conquest.pts === 0);
  // purifier : récompense immédiate, limite par jour
  const n = q.eclats.length + 6;
  for (let i = 0; i < 6; i++) S.addEclat(q, 'brut');
  let ok = 0; for (let i = 0; i < n; i++) if (!S.purify(q).err) ok++;
  assert.equal(ok, S.purifyMax(q));
  // conquête : une victoire en Arène remplit la jauge et donne un Éclat
  const before = q.eclats.length;
  const rew = S.applyResult(q, { result: 'win', mode: 'arena', myHp: 1, oppHp: 0, heart: true, stats: {} });
  assert.equal(rew.conquest, 16); assert.ok(rew.eclat && q.eclats.length === before + 1);
  q.conquest.pts = CONQUEST_MAX; const rel = S.claimConquest(q);
  assert.ok(rel && rel.relic && q.conquest.pts === 0 && q.conquest.n === 1);
});
