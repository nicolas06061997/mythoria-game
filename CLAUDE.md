# MYTHORIA (dépôt mythoria-game)

Jeu mobile de stratégie fantastique 3D (PWA, Chrome Android), publié par GitHub Pages depuis `main` :
https://nicolas06061997.github.io/mythoria-game/
(Ancienne adresse : https://nicolas06061997.github.io/La-Fine-Crasse/mythoria/ — dossier `mythoria/` du dépôt La-Fine-Crasse, d'où vient l'historique.)

L'utilisateur parle français et n'est pas développeur : réponses courtes, en français, étape par étape.
Cahier des charges du 13/11/2026 ; plan en 7 phases : `docs/ROADMAP.md` ; reste à faire : `docs/A-FAIRE.md`.

## À chaque modification
1. Changer `data-version` dans `index.html` **et** `v` dans `version.json` (même valeur `AAAA-MM-JJ.n`, + `notes` courtes).
2. Nouveau fichier JS → l'ajouter à `FILES` dans `sw.js`.
3. `npm test` puis commit + push sur `main` (Pages publie en 2-3 min).

## Lancer / tester
- `python3 -m http.server 8000` puis `http://localhost:8000/`. Pas de build. three.js r160 dans `vendor/` (import map dans index.html).
- Tests : `npm test` (node --test). Navigateur sans écran : chromium avec `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, `serviceWorkers:'block'` ; `?speed=4` accélère ; `window.__battle` (`send({p:0,t:'summon'|'merge'|'deploy'|'spell',...})`), `window.__hero` (Mode Héros).

## Concept et code
- Concept « Les Failles » (pas un clone de Clash Royale) : île flottante, 1 Sanctuaire par camp, Cœur de Mythe au centre (seuls les héros au sol le capturent), Cercle d'Invocation 5 socles (invoquer 2 éther, fusionner ★3, glisser sur l'île), 1 sortilège par deck (jauge d'Éveil). Détails et limites : `docs/ARCHITECTURE.md`.
- Règles partagées (futur serveur) `src/shared/` : `content.js` (26 héros, 4 sorts, 6 factions/mondes, UNLOCKS), `sim.js` (déterministe ; modes duel/campaign/survival, mods, bonus, botMana), `ai.js` (5 niveaux : think, mistake, mana…), `economy.js` (niveaux, coffres, boutique, missions, apparences), `kingdom.js`, `campaign.js` (30 étapes, 6 boss, événements, tournoi, vagues).
- Client `src/client/` : `battle.js`, `heromode.js`, `store.js` (sauvegarde `myt_profile_v2`), `audio.js`, `three/` (assets, procedural, world, fx, battleview, showcase, look, herofx, kingdomview, stage), `ui/` (app, progress, kingdom, modes, dom, icons).
- Modèles CC0 KayKit + Quaternius dans `assets/models/` (crédits : `CREDITS.md`).
- Jamais de faux joueurs : l'IA est toujours affichée « 🤖 IA ». Pas d'achats en argent réel. Phase 6 (amis, clans, chat, classements) et phase 3 (serveur) pas encore faites.
- Équilibrage vérifié par simulations IA contre IA et « joueur humain simplifié » contre chaque niveau d'IA.
