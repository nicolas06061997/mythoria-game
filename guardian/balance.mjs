// MYTHORIA GUARDIAN — outil de l'Équilibreur : des centaines de combats IA contre IA avec la vraie simulation du jeu.
// Pour chaque héros : taux de victoire des decks qui le contiennent (même IA des deux côtés, decks tirés au hasard).
// Déterministe (graines fixes) : deux lancements donnent les mêmes chiffres.
//
//   node guardian/balance.mjs            → 600 combats (≈ 1-2 min)
//   node guardian/balance.mjs --n 2000   → plus précis
// Sortie : guardian/out/balance.json + résumé à l'écran. Ne modifie rien.
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBattle, step, TICK_RATE } from '../src/shared/sim.js';
import { createBot, botThink } from '../src/shared/ai.js';
import { PLAYABLE, SPELLS, DECK_SIZE } from '../src/shared/content.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const N = Number(args[args.indexOf('--n') + 1]) || 600;
const LEVEL = Number(args[args.indexOf('--niveau') + 1]) || 2;

let seed = 20261115;
const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
const pick = (arr, k) => { const a = arr.slice(), out = []; while (out.length < k) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]); return out; };

const ids = PLAYABLE.map(c => c.id), spells = SPELLS.map(s => s.id);
const stat = Object.fromEntries(ids.map(id => [id, { games: 0, wins: 0, draws: 0 }]));
const sp = Object.fromEntries(spells.map(id => [id, { games: 0, wins: 0, draws: 0 }]));
let draws = 0, firstWins = 0, totalTicks = 0;
const t0 = Date.now();

for (let g = 0; g < N; g++) {
  const decks = [pick(ids, DECK_SIZE), pick(ids, DECK_SIZE)], sps = [spells[Math.floor(rnd() * spells.length)], spells[Math.floor(rnd() * spells.length)]];
  const s = createBattle({ seed: 1000 + g, decks, spells: sps });
  const b = [createBot(0, LEVEL, 5000 + g), createBot(1, LEVEL, 9000 + g)];
  let guard = TICK_RATE * 60 * 6;
  while (!s.over && guard-- > 0) step(s, [botThink(b[0], s, 1 / TICK_RATE), botThink(b[1], s, 1 / TICK_RATE)].filter(Boolean));
  totalTicks += s.tick;
  const w = s.over ? s.winner : null; // null/undefined = égalité
  if (w !== 0 && w !== 1) draws++; else if (w === 0) firstWins++;
  for (const p of [0, 1]) {
    for (const id of decks[p]) { const S = stat[id]; S.games++; if (w === p) S.wins++; else if (w !== 0 && w !== 1) S.draws++; }
    const S = sp[sps[p]]; S.games++; if (w === p) S.wins++; else if (w !== 0 && w !== 1) S.draws++;
  }
}

// taux de victoire (une égalité compte pour une demi-victoire) + marge d'erreur à 95 %
const rate = S => { const r = (S.wins + S.draws / 2) / Math.max(1, S.games); return { ...S, rate: +(r * 100).toFixed(1), marge: +(196 * Math.sqrt(r * (1 - r) / Math.max(1, S.games))).toFixed(1) }; };
const heroes = ids.map(id => { const c = PLAYABLE.find(x => x.id === id); return { id, name: c.name, rar: c.rar, ...rate(stat[id]) }; }).sort((a, b) => b.rate - a.rate);
// les raretés n'ont pas la même puissance (voulu) : chaque héros est comparé à la moyenne de SA rareté
const rarAvg = {};
for (const h of heroes) (rarAvg[h.rar] = rarAvg[h.rar] || []).push(h.rate);
for (const k in rarAvg) rarAvg[k] = +(rarAvg[k].reduce((a, b) => a + b, 0) / rarAvg[k].length).toFixed(1);
for (const h of heroes) h.ecart = +(h.rate - rarAvg[h.rar]).toFixed(1);
const spellRes = spells.map(id => ({ id, ...rate(sp[id]) })).sort((a, b) => b.rate - a.rate);
// « hors norme » seulement si l'écart à la moyenne de sa rareté dépasse 7 points ET la marge d'erreur
const outliers = heroes.filter(h => Math.abs(h.ecart) > Math.max(7, h.marge));
const res = {
  at: new Date().toISOString(), matches: N, aiLevel: LEVEL, seconds: Math.round((Date.now() - t0) / 1000),
  draws, firstPlayerWinRate: +((firstWins + draws / 2) / N * 100).toFixed(1), avgMatchS: Math.round(totalTicks / N / TICK_RATE),
  heroes, rarityAverage: rarAvg, spells: spellRes, tooStrong: outliers.filter(h => h.ecart > 0).map(h => h.id), tooWeak: outliers.filter(h => h.ecart < 0).map(h => h.id),
};
await mkdir(join(ROOT, 'guardian', 'out'), { recursive: true });
await writeFile(join(ROOT, 'guardian', 'out', 'balance.json'), JSON.stringify(res, null, 1));
console.log(`Équilibrage : ${N} combats IA (niveau ${LEVEL}) en ${res.seconds} s · durée moyenne ${res.avgMatchS} s · égalités ${draws} · joueur du bas gagne ${res.firstPlayerWinRate} %`);
console.log('Moyenne par rareté : ' + Object.entries(rarAvg).map(([k, v]) => `${k} ${v} %`).join(' · '));
console.log('Héros (taux de victoire des decks qui le contiennent, ± marge, écart à sa rareté) :');
for (const h of heroes) console.log(`  ${h.rate.toFixed(1).padStart(5)} % ±${String(h.marge).padStart(4)}  (${h.ecart >= 0 ? '+' : ''}${h.ecart})  ${h.name} [${h.rar}]${res.tooStrong.includes(h.id) ? '  ⬆ trop fort ?' : res.tooWeak.includes(h.id) ? '  ⬇ trop faible ?' : ''}`);
console.log('Sorts : ' + spellRes.map(s => `${s.id} ${s.rate} %`).join(' · '));
