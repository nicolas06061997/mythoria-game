// MYTHORIA GUARDIAN — bot « Agent Anti-Triche » (hacker blanc).
// Le jeu n'a pas encore de serveur (phase 3) : il n'y a ni WebSocket ni API à attaquer, et un jeu qui tourne
// entièrement dans le navigateur ne peut pas empêcher quelqu'un de modifier sa propre partie.
// Ce bot vérifie donc ce qui PEUT l'être aujourd'hui :
//   1. cheatRules()  : les règles (src/shared/sim.js, futur code du serveur) refusent les actions interdites
//                      et corrigent les valeurs trafiquées ;
//   2. cheatSave()   : une sauvegarde trafiquée (localStorage) ne casse pas le jeu ; on note ce qui est accepté.
// « connu: true » = limite connue tant qu'il n'y a pas de serveur (notée, pas comptée comme problème).
import { createBattle, step, check, MANA_MAX, SUMMON_COST, TICK_RATE, W, H, sanctOf } from '../../src/shared/sim.js';
import { PLAYABLE, SPELLS, DECK_SIZE } from '../../src/shared/content.js';

export function cheatRules() {
  const T = [];
  const deck = PLAYABLE.slice(0, DECK_SIZE).map(c => c.id), spell = SPELLS[0].id;
  const fresh = () => createBattle({ seed: 7, decks: [deck, deck], spells: [spell, spell] });
  const refuse = (nom, s, cm) => { const err = check(s, cm); step(s, [cm]); const rej = s.ev.some(e => e.type === 'reject'); T.push({ nom, ok: !!err && rej, detail: err ? `refusé (« ${err} »)` : 'ACCEPTÉ par les règles' }); };

  let s = fresh(); s.players[0].mana = 0;
  refuse('Invoquer sans éther', s, { p: 0, t: 'summon' });
  s = fresh(); refuse('Sortilège sans jauge d’Éveil pleine', s, { p: 0, t: 'spell', x: W / 2, y: H / 2 });
  s = fresh(); const vide = s.players[0].bench.indexOf(null);
  if (vide >= 0) refuse('Déployer depuis un socle vide', s, { p: 0, t: 'deploy', slot: vide, x: W / 2, y: H - 4 });
  refuse('Déployer depuis un socle qui n’existe pas', s, { p: 0, t: 'deploy', slot: 99, x: W / 2, y: H - 4 });
  s = fresh(); step(s, [{ p: 0, t: 'summon' }]);
  const slot = s.players[0].bench.findIndex(Boolean);
  refuse('Déployer hors de l’île', s, { p: 0, t: 'deploy', slot, x: -50, y: 9999 });
  refuse('Déployer chez l’adversaire', s, { p: 0, t: 'deploy', slot, x: W / 2, y: 3 });
  refuse('Déployer avec des coordonnées invalides (NaN)', s, { p: 0, t: 'deploy', slot, x: NaN, y: NaN });
  refuse('Fusionner un héros avec lui-même', s, { p: 0, t: 'merge', a: slot, b: slot });
  refuse('Commande inventée (« gagner »)', s, { p: 0, t: 'gagner' });
  refuse('Joueur qui n’existe pas', s, { p: 7, t: 'summon' });

  // valeurs trafiquées « à la console »
  s = fresh(); s.players[0].mana = 9999; step(s, []);
  T.push({ nom: 'Éther trafiqué (9999)', ok: s.players[0].mana <= MANA_MAX, detail: s.players[0].mana <= MANA_MAX ? `ramené à ${MANA_MAX} dès l’image suivante` : `reste à ${s.players[0].mana}` });
  s = fresh(); s.players[0].eveil = 5000; step(s, []);
  T.push({ nom: 'Jauge d’Éveil trafiquée (5000)', ok: s.players[0].eveil <= 100, detail: s.players[0].eveil <= 100 ? 'ramenée à 100' : `reste à ${s.players[0].eveil}` });
  s = fresh(); sanctOf(s, 1).hp = 1; for (let i = 0; i < TICK_RATE; i++) step(s, []);
  T.push({ nom: 'PV du Sanctuaire ennemi mis à 1', ok: sanctOf(s, 1).hp > 1, connu: true, detail: sanctOf(s, 1).hp > 1 ? 'corrigé par les règles' : 'accepté (aucun serveur ne garde la vraie valeur)' });
  s = fresh(); s.players[1].mana = SUMMON_COST;
  T.push({ nom: 'Jouer à la place de l’adversaire', ok: !!check(s, { p: 1, t: 'summon' }), connu: true, detail: check(s, { p: 1, t: 'summon' }) ? 'refusé' : 'accepté (les règles ne savent pas qui envoie la commande : rôle du futur serveur)' });
  // même graine + mêmes commandes = même combat : c'est ce qui permettra au serveur de rejouer et vérifier une partie
  const run = () => { const b = fresh(); for (let i = 0; i < 400; i++) step(b, i % 60 === 0 ? [{ p: 0, t: 'summon' }, { p: 1, t: 'summon' }] : []); return JSON.stringify(b.ents.map(e => [e.id, Math.round(e.x * 1000), Math.round(e.hp)])); };
  T.push({ nom: 'Combat rejouable à l’identique (vérification future par le serveur)', ok: run() === run(), detail: 'même graine + mêmes commandes = même résultat' });
  return T;
}

// Sauvegarde trafiquée : le jeu doit s'ouvrir sans erreur. `open(page)` ouvre le jeu et attend l'écran d'accueil.
export async function cheatSave(ctx, open) {
  const page = await ctx.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(String(e.message || e).slice(0, 200)));
  const hack = { v: 3, name: '<img src=x onerror=alert(1)>', gold: 1e15, gems: -500, crystals: 'beaucoup', stone: null, xp: NaN, lvl: 999, trophies: 1e9,
    deck: ['inconnu', 'inconnu', 42, null], spell: 'triche', avatar: 'personne', levels: { inconnu: 99 }, chests: 'x', login: 7, stats: 'x', skins: [], campaign: null, records: 3, kingdom: { faux: true } };
  await page.addInitScript(v => { try { localStorage.setItem('myt_profile_v2', v); } catch (e) {} }, JSON.stringify(hack));
  const T = [];
  try {
    await open(page);
    const P = await page.evaluate(() => { const p = window.__app.P(); return { gold: p.gold, gems: p.gems, lvl: p.lvl, trophies: p.trophies, deck: p.deck, spell: p.spell, avatar: p.avatar, injected: !!document.querySelector('img[src="x"]') }; });
    T.push({ nom: 'Sauvegarde trafiquée : le jeu s’ouvre quand même', ok: !errors.length, detail: errors.length ? 'erreur : ' + errors[0] : 'aucune erreur' });
    T.push({ nom: 'Nom du joueur contenant du code', ok: !P.injected, detail: P.injected ? 'le code a été inséré dans la page' : 'affiché comme du texte' });
    T.push({ nom: 'Deck et sortilège inventés', ok: !P.deck.includes('inconnu') && P.spell !== 'triche' && P.avatar !== 'personne', detail: !P.deck.includes('inconnu') ? 'remplacés par le deck de départ' : 'acceptés' });
    const riche = P.gold >= 1e15 || P.trophies >= 1e9 || P.lvl >= 999;
    T.push({ nom: 'Or / trophées / niveau trafiqués', ok: !riche, connu: true, detail: riche ? `acceptés (or ${P.gold}, trophées ${P.trophies}, niveau ${P.lvl}) : la sauvegarde est sur le téléphone du joueur, sans serveur pour la vérifier` : 'corrigés' });
  } catch (e) {
    T.push({ nom: 'Sauvegarde trafiquée : le jeu s’ouvre quand même', ok: false, detail: 'le jeu ne s’ouvre plus : ' + (errors[0] || String(e.message).split('\n')[0]).slice(0, 200) });
  }
  await page.close();
  return T;
}
