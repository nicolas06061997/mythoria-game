# MYTHORIA GUARDIAN

Agent de surveillance, de test et de réparation de MYTHORIA. Construit étape par étape (décision du 14/11/2026 :
abonnement Claude Max, branche d'essai obligatoire, notifications ntfy, réparations de bugs automatiques,
graphismes/gameplay seulement avec l'accord du propriétaire).

## Plan

| Étape | Contenu | État |
|---|---|---|
| 1 | Filet de sécurité : contrôleur automatique (le jeu est joué dans un vrai navigateur), vérifications du code, publication protégée, retour arrière automatique, contrôle toutes les heures | ✅ en place |
| 2 | Historique, suivi des problèmes (détecté → résolu), rapport quotidien (19 h 45), notifications ntfy — branche `guardian-data` | ✅ en place |
| 3 | Application « MYTHORIA Guardian » (`guardian/`, installable, séparée du jeu) : état, chiffres, équipe, problèmes, dernier contrôle + captures, historique, rapports, réglages | ✅ en place |
| 4 | Agent Claude planifié (tâches planifiées Claude Code, toutes les heures + grosse session quotidienne) : analyse, réparation sur branche d'essai, demandes d'autorisation | à faire |
| 5 | Discussion avec l'agent depuis le tableau de bord | à faire |
| 6 | Analyses avancées : équilibrage automatique, comparaison visuelle avec références, propositions graphiques avant/après | à faire |

## Comment une modification est publiée

```
branche d'essai (essai/… claude/… ccr-…)
   │  push
   ▼
GitHub Actions « Guardian »
   1. npm test (règles du jeu + vérifications du code)
   2. règle de version (le jeu a changé → la version doit changer)
   3. le contrôleur joue au jeu (téléphone + ordinateur)
   │  tout est vert ?  non → rien n'est publié (rapport + captures dans l'onglet Actions)
   ▼  oui
publication sur main  →  GitHub Pages met le site à jour
   │
   ▼
attente de la nouvelle version en ligne, puis contrôle du site en ligne
   │  cassé ? → git revert automatique + republication de la version précédente
   ▼
✅ publié et vérifié
```

## Ce que le contrôleur vérifie (guardian/check.mjs)

Sur un écran de téléphone (412×915, tactile) et d'ordinateur (1366×768) :

- chargement complet du jeu (temps mesuré, alerte au-delà de 15 s, échec au-delà de 35 s) ;
- premier lancement : choix du nom, récompense de connexion ;
- chaque onglet (Accueil, Héros, Boutique, Royaume, Clan) : capture, débordement horizontal, écran vide ;
- un combat complet joué par une IA (`?autoplay`), jusqu'à l'écran de résultat, avec mesure du temps de calcul par image ;
- 20 s de Mode Héros ;
- pendant tout le parcours : erreurs JavaScript, fichiers introuvables (HTTP 4xx/5xx).

Limite connue : les tests tournent sans carte graphique (SwiftShader) ; les FPS mesurés (≈ 3-4) ne
reflètent pas un vrai téléphone. Ils servent à repérer un effondrement, pas à juger la fluidité réelle.

## Lancer à la main

```
node guardian/check.mjs            # dossier local, contrôle complet (~10-15 min)
node guardian/check.mjs --quick    # sans combat ni Mode Héros
node guardian/check.mjs --url https://nicolas06061997.github.io/mythoria-game/ --quick
```

## L'application MYTHORIA Guardian

- Adresse : https://nicolas06061997.github.io/mythoria-game/guardian/ (bouton « Installer » / menu Chrome ⋮ → Installer).
- Fichiers : `guardian/index.html`, `app.js`, `app.css`, `sw.js` (hors ligne), `manifest.webmanifest`, `icons/`.
  Le service worker du jeu ignore `/guardian/` (chaque appli a le sien).
- Données : branche `guardian-data` (un seul commit, réécrit à chaque fois ; l'historique est dans les JSON),
  lue via raw.githubusercontent.com : `state.json`, `runs.json` (400 derniers contrôles), `events.json` (journal),
  `problems.json` (ouverts + résolus des 60 derniers jours), `reports/AAAA-MM-JJ.json`, `shots/*.jpg` (dernière série).
  Écrites par `guardian/record.mjs` via `guardian/save-data.sh` (5 essais si deux écritures en même temps).
- « Contrôle en cours » : API publique de GitHub (sans compte, toutes les 2 min).
- Test local : `python3 -m http.server 8000` puis `http://localhost:8000/guardian/?data=out/demo-data/`
  (fabriquer des données avec `GUARDIAN_NO_NOTIFY=1 node guardian/record.mjs controle --data guardian/out/demo-data`).

## Notifications (ntfy, gratuit)

Sujet : `mythoria-guardian-3c7943c185c1` (dans `.github/workflows/guardian.yml` et `guardian/record.mjs`).
Envoyées seulement si : nouveau problème bloquant, plus aucun problème, publication vérifiée, retour arrière,
modification bloquée, contrôleur planté (une fois), rapport du soir. Jamais pour un contrôle horaire normal.
