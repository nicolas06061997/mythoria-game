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
- `three/arena.js` (appelé par `surroundings.js` pour Aurore) : gradins en fer à cheval (sièges colorés par tribune `SEATS`, allées-escaliers tous les 12 morceaux, muret avant + boucliers, créneaux, loge royale au fond), public instancié en 4 parties (corps, tête, cheveux/chapeau, bras qui se lèvent) + drapeaux, (`world.cheer(k)` sur fusion, Cœur, boss, fin), piliers + torches + braises, bannières couleur du monde, grande porte au fond, faille lumineuse et gouffre sous l'île, 1-2 dragons procéduraux qui tournent autour.
- Décor par monde : `three/surroundings.js` (`buildSurroundings`, appelé par `world.js`) : Aurore = arène (`buildArena` avec `noPit`), Sylve = arbres géants + cascade, Arcane = cristaux/runes/livres volants, Braise = volcans qui crachent, Givre = glaciers + aurore boréale, Ombres = paysage démoniaque (pics, tours aux fenêtres rouges, lune rouge, chauves-souris). Netteté : MSAA dans `createComposer` (look.js), pixel ratio jusqu'à 2 (`stage.js`, 1,5 sur petits téléphones).
- Graphismes (`stage.js`) : `GFX_LEVELS` auto/eco/moyen/haut/ultra (localStorage `myt_gfx`, choix dans Réglages) → `quality()` donne dpr, ombres, `shadowSize`, bloom, `msaa`, `low` (décor allégé), `lite` (héros). Auto = le plus beau selon le téléphone ; `PerfWatch` baisse la résolution si < 28 FPS et affiche les FPS (`myt_fps`).
- Menus : fond aux couleurs du monde (`body[data-world]`, étoiles + brume animées en CSS), entrée douce des écrans (`.screen.enter`). Royaume (`kingdomview.js`) : `kingdomBackdrop` (mer de nuages, îlots, dragon, oiseaux, lueurs) + bloom ; accueil (`showcase.js` mode home) : `backdrop()`. `dragons`/`flock` exportés par `surroundings.js` (option `cz`).
- Écran de chargement : `#splash` dans `index.html` (image `assets/loading/bg.webp` + dragons animés `fly.webp` = 12 images en colonne, étincelles, astuces, barre `window.__loader.set(%, texte)`), styles « Écran de chargement animé » dans `styles.css`. `main.js` précharge tous les héros + décor du monde puis lance `startApp` (min. 3,6 s, max. 30 s). Images fabriquées avec `poster.html?v=2&layer=bg|fly` (vrais modèles 3D, rendu par Playwright).
- Barres de vie des Sanctuaires : `.tplate` dans `battle.js` (`plates()`, suit la tour via `view.screenOf` : au-dessus de la tour ennemie, au pied de la tienne ; barre jaune « retard », clignote sous 30 %). En haut : seulement le chrono.
- Déblocage par rareté (`UNLOCKS`) : monde 1 = communs + 3 rares de départ, puis rares, épiques, légendaires (mondes 4-5), mythiques (monde 6). `owned()` = héros débloqués.
- Histoires des modes : `ui/story.js` (`story(id, ensuite)`, 1re fois seulement, `localStorage myt_seen`, narrateur Vael ; ids arene/royaume/campagne/survie/heros/evenement/tournoi ; `storyBtn` pour relire).
- Fluidité : `battleview` préchauffe les shaders de tous les héros du combat (★1 et ★3, gardés cachés) ; `freeTree` et les effets ne « disposent » plus les matériaux (sinon recompilation = saccade). Portraits gardés en Cache Storage (`warmPortraits`, au chargement). Test auto : `?speed=8&autoplay` (une IA joue pour toi, `window.__app.play/playHero`, `__battle.perf`).
- Accueil (`showcase.js` home) : autel magique `altar()` (runes, colonne de lumière, cristaux, cascade), le héros tourne seul.
- Style d'interface (14/11, d'après une maquette de l'utilisateur) : bloc « Style jeu mobile pro » en fin de `styles.css` (bleu royal `--b1..b4` + or, cadre doré, bannière parchemin `.home-world`, bouton `.btn-battle` orange bombé, tuiles/coffres bleus bombés, barre du bas bleue avec onglet actif doré). Icône `swords`. Accueil : paysage 3D (montagnes, forêt, château, rayons) dans `showcase.backdrop`, ciel `HS` par monde.
- Monde 1 (Aurore) = colisée cosmique (d'après une image de l'utilisateur) : ciel `nebulaDome()` (world.js, pas de gouffre ni d'îlots par défaut), sol de pierre + grande mosaïque dorée aux runes bleues (`groundTexture`, `cosmic`), pas d'herbe ni d'arbres, `buildArena(..., { a0: .70, a1: 2.30, tiers: 3, gate: false })`, bannières à blasons `bannerTex`, 6 stèles de runes, îles satellites + statue de dragon doré (`surroundings.aurore`). La consigne de combat se place sous la barre ennemie.
- Sanctuaires : `fortress()` dans `battleview.js` (remparts crénelés, 4 tours à toits bleus/rouges, cristaux, porte vers le Cœur) + temple au centre ; la tienne plus basse (`hk` 0,66) pour ne pas cacher le combat.
- Arènes peintes (`ARENA_ART` dans `battleview.js`, 1re : `assets/arenas/aurore.webp` = image de l’utilisateur nettoyée de son interface) : l’image est dessinée sous la 3D (`buildArt`, option `under` de `createComposer`), caméra `paintedCamera` calée sur l’image (paramètres trouvés par ajustement : fov, th, D, zt, off ; profondeur ×`k` via `zk` dans `toWorld/toSim`), socles du Cercle = ceux de l’image (`benchZ`, `benchX`). Décor 3D, forteresses, socles et base du Cœur cachés. Pour une nouvelle image : relever les points (centre, bords, tours, socles), refaire l’ajustement.
- Arène peinte vivante : shader du fond (`bgU` : public qui saute par cellules, + fort sur `artCheer`, runes/cristaux bleus qui pulsent, étoiles qui scintillent ; zones = ellipses/boîtes en pixels de l’image) + dragon 3D et poussière magique (`artUps`). Contours : épaisseur en uniform `olT` (un seul programme). `forceContextLoss` différé de 1,5 s (il bloquait les changements d’onglet).
- Combat : toucher un héros du Cercle (sélection, `select()`), puis toucher l'île = déploiement ; toucher un héros identique = fusion ; le glisser-déposer marche toujours.

## Concept et code
- Concept « Les Failles » (pas un clone de Clash Royale) : île flottante, 1 Sanctuaire par camp, Cœur de Mythe au centre (seuls les héros au sol le capturent), Cercle d'Invocation 5 socles (invoquer 2 éther, fusionner ★3, glisser sur l'île), 1 sortilège par deck (jauge d'Éveil). Détails et limites : `docs/ARCHITECTURE.md`.
- Règles partagées (futur serveur) `src/shared/` : `content.js` (26 héros, 4 sorts, 6 factions/mondes, UNLOCKS), `sim.js` (déterministe ; modes duel/campaign/survival, mods, bonus, botMana), `ai.js` (5 niveaux : think, mistake, mana…), `economy.js` (niveaux, coffres, boutique, missions, apparences), `kingdom.js`, `campaign.js` (30 étapes, 6 boss, événements, tournoi, vagues).
- Client `src/client/` : `battle.js`, `heromode.js`, `store.js` (sauvegarde `myt_profile_v2`), `audio.js`, `three/` (assets, procedural, world, fx, battleview, showcase, look, herofx, kingdomview, stage), `ui/` (app, progress, kingdom, modes, dom, icons).
- Modèles CC0 KayKit + Quaternius dans `assets/models/` (crédits : `CREDITS.md`).
- Jamais de faux joueurs : l'IA est toujours affichée « 🤖 IA ». Pas d'achats en argent réel. Phase 6 (amis, clans, chat, classements) et phase 3 (serveur) pas encore faites.
- Équilibrage vérifié par simulations IA contre IA et « joueur humain simplifié » contre chaque niveau d'IA.
