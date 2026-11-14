# MYTHORIA (dépôt mythoria-game)

Jeu mobile de stratégie fantastique 3D (PWA, Chrome Android), publié par GitHub Pages depuis `main` :
https://nicolas06061997.github.io/mythoria-game/
(L'ancienne adresse https://nicolas06061997.github.io/La-Fine-Crasse/mythoria/ redirige ici depuis le 14/11 ; l'historique vient du dossier `mythoria/` de La-Fine-Crasse.)

L'utilisateur parle français et n'est pas développeur : réponses courtes, en français, étape par étape.
Cahier des charges du 13/11/2026 ; plan en 7 phases : `docs/ROADMAP.md` ; reste à faire : `docs/A-FAIRE.md`.

## À chaque modification
1. Changer `data-version` dans `index.html` **et** `v` dans `version.json` (même valeur `AAAA-MM-JJ.n`, + `notes` courtes).
2. Nouveau fichier JS → l'ajouter à `FILES` dans `sw.js`.
3. `npm test` puis commit + push sur `main` (Pages publie en 2-3 min).

## Lancer / tester
- `python3 -m http.server 8000` puis `http://localhost:8000/`. Pas de build. three.js r160 dans `vendor/` (import map dans index.html).
- Tests : `npm test` (node --test). Navigateur sans écran : chromium avec `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, `serviceWorkers:'block'` ; `?speed=4` accélère ; `window.__battle` (`send({p:0,t:'summon'|'merge'|'deploy'|'spell',...})`), `window.__hero` (Mode Héros).

## Installation et mises à jour (comme les autres jeux)
- `src/client/install.js` : bouton vert `#inst` (« Installer le jeu », `beforeinstallprompt` = 1 appui dans Chrome, sinon explications selon le navigateur, bouton « Ouvrir dans Chrome » sur Android), `appinstalled`.
- Mises à jour : `version.json` vérifié toutes les 3 min et au retour sur l'appli ; nouvelle version → rechargement automatique (jamais pendant un combat : `body.in-battle`), une seule fois par version (`sessionStorage` `myt_upd`), sinon bandeau de secours `#upd`.

## Arène et commandes (14/11)
- `three/arena.js` (appelé par `world.js`) : gradins en fer à cheval ouverts vers la caméra, public instancié qui saute (`world.cheer(k)` sur fusion, Cœur, boss, fin), piliers + torches + braises, bannières couleur du monde, grande porte au fond, faille lumineuse et gouffre sous l'île, 1-2 dragons procéduraux qui tournent autour.
- Décor par monde : `three/surroundings.js` (`buildSurroundings`, appelé par `world.js`) : Aurore = arène (`buildArena` avec `noPit`), Sylve = arbres géants + cascade, Arcane = cristaux/runes/livres volants, Braise = volcans qui crachent, Givre = glaciers + aurore boréale, Ombres = paysage démoniaque (pics, tours aux fenêtres rouges, lune rouge, chauves-souris). Netteté : MSAA dans `createComposer` (look.js), pixel ratio jusqu'à 2 (`stage.js`, 1,5 sur petits téléphones).
- Graphismes (`stage.js`) : `GFX_LEVELS` auto/eco/moyen/haut/ultra (localStorage `myt_gfx`, choix dans Réglages) → `quality()` donne dpr, ombres, `shadowSize`, bloom, `msaa`, `low` (décor allégé), `lite` (héros). Auto = le plus beau selon le téléphone ; `PerfWatch` baisse la résolution si < 28 FPS et affiche les FPS (`myt_fps`).
- Combat : toucher un héros du Cercle (sélection, `select()`), puis toucher l'île = déploiement ; toucher un héros identique = fusion ; le glisser-déposer marche toujours.

## Concept et code
- Concept « Les Failles » (pas un clone de Clash Royale) : île flottante, 1 Sanctuaire par camp, Cœur de Mythe au centre (seuls les héros au sol le capturent), Cercle d'Invocation 5 socles (invoquer 2 éther, fusionner ★3, glisser sur l'île), 1 sortilège par deck (jauge d'Éveil). Détails et limites : `docs/ARCHITECTURE.md`.
- Règles partagées (futur serveur) `src/shared/` : `content.js` (26 héros, 4 sorts, 6 factions/mondes, UNLOCKS), `sim.js` (déterministe ; modes duel/campaign/survival, mods, bonus, botMana), `ai.js` (5 niveaux : think, mistake, mana…), `economy.js` (niveaux, coffres, boutique, missions, apparences), `kingdom.js`, `campaign.js` (30 étapes, 6 boss, événements, tournoi, vagues).
- Client `src/client/` : `battle.js`, `heromode.js`, `store.js` (sauvegarde `myt_profile_v2`), `audio.js`, `three/` (assets, procedural, world, fx, battleview, showcase, look, herofx, kingdomview, stage), `ui/` (app, progress, kingdom, modes, dom, icons).
- Modèles CC0 KayKit + Quaternius dans `assets/models/` (crédits : `CREDITS.md`).
- Jamais de faux joueurs : l'IA est toujours affichée « 🤖 IA ». Pas d'achats en argent réel. Phase 6 (amis, clans, chat, classements) et phase 3 (serveur) pas encore faites.
- Équilibrage vérifié par simulations IA contre IA et « joueur humain simplifié » contre chaque niveau d'IA.
