// MYTHORIA GUARDIAN — enregistre ce qui s'est réellement passé (pour le tableau de bord) et prévient le propriétaire.
//
//   node guardian/record.mjs controle    --data <dossier>        après un contrôle (lit guardian/out/results.json)
//   node guardian/record.mjs publication --data <dossier> --etat publie|retour|pas-en-ligne|bloque [--version v]
//   node guardian/record.mjs rapport     --data <dossier>        rapport quotidien
//
// Le dossier <dossier> est la branche « guardian-data » du dépôt (gérée par guardian/save-data.sh).
// Rien n'est inventé : chaque chiffre vient d'un contrôle ou d'une publication réellement effectués.
import { readFile, writeFile, mkdir, readdir, copyFile, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const KIND = args[0];
const opt = (k, d = null) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const DATA = opt('--data', join(ROOT, 'guardian', 'data'));
const env = process.env;
const REPO = env.GITHUB_REPOSITORY || 'nicolas06061997/mythoria-game';
const [OWNER, NAME] = REPO.split('/');
const GAME_URL = `https://${OWNER}.github.io/${NAME}/`;
const DASH_URL = GAME_URL + 'guardian/';
export const NTFY_TOPIC = env.NTFY_TOPIC || 'mythoria-guardian-3c7943c185c1';
const RUN_URL = env.GITHUB_RUN_ID ? `${env.GITHUB_SERVER_URL || 'https://github.com'}/${REPO}/actions/runs/${env.GITHUB_RUN_ID}` : null;
const EVENT = env.GITHUB_EVENT_NAME || 'manuel';
const BRANCH = env.GITHUB_REF_NAME || 'local';
const SHA = (env.GITHUB_SHA || '').slice(0, 7);
const NOW = new Date().toISOString();
const MAX_RUNS = 400, MAX_EVENTS = 600;

const readJSON = async (f, d) => { try { return JSON.parse(await readFile(join(DATA, f), 'utf8')); } catch (e) { return d; } };
const writeJSON = (f, v) => writeFile(join(DATA, f), JSON.stringify(v, null, 1));

// Les contrôles de main (toutes les heures, ou après publication) décrivent le jeu publié.
// Les contrôles des branches d'essai décrivent une modification pas encore publiée.
const isLive = () => BRANCH === 'main' || EVENT === 'schedule';
const TRIGGERS = { schedule: 'contrôle horaire', push: 'modification envoyée', workflow_dispatch: 'lancé à la main', manuel: 'lancé à la main' };

const AGENTS = [
  { id: 'testeur', name: 'Testeur', role: 'Joue au jeu toutes les heures (téléphone + ordinateur) et relève les problèmes.' },
  { id: 'gardien', name: 'Publication protégée', role: 'Ne publie une modification que si tout est vert, contrôle le site en ligne, revient en arrière si besoin.' },
  { id: 'rapporteur', name: 'Rapporteur', role: 'Écrit le rapport quotidien et envoie les notifications.' },
  { id: 'chef', name: 'Guardian (chef)', role: 'Discute avec toi et répartit le travail.', soon: true },
  { id: 'reparateur', name: 'Réparateur', role: 'Corrige les bugs détectés puis relance les tests.', soon: true },
  { id: 'graphiste', name: 'Graphiste', role: 'Repère ce qui est visuellement faible et propose des améliorations avant/après.', soon: true },
  { id: 'equilibreur', name: 'Équilibreur', role: 'Simule des milliers de combats pour repérer les héros trop forts ou trop faibles.', soon: true },
];

// Empreinte stable d'un problème (sans nombres variables : ports, durées…)
const fingerprint = p => [p.level, p.where, p.title, String(p.detail || '').replace(/https?:\/\/[^/\s]+/g, '').replace(/\d+(\.\d+)?/g, '#').slice(0, 160)].join('|');

async function notify(title, message, { priority = 3, tags = [] } = {}) {
  if (env.GUARDIAN_NO_NOTIFY) { console.log('[notification non envoyée]', title, '—', message); return; }
  try {
    const r = await fetch('https://ntfy.sh/', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic: NTFY_TOPIC, title, message: message.slice(0, 3500), priority, tags, click: DASH_URL }),
    });
    console.log('Notification', r.ok ? 'envoyée' : 'refusée (' + r.status + ')', ':', title);
  } catch (e) { console.log('Notification impossible :', e.message); }
}

async function load() {
  await mkdir(join(DATA, 'reports'), { recursive: true });
  await mkdir(join(DATA, 'shots'), { recursive: true });
  const state = await readJSON('state.json', {});
  state.since = state.since || NOW;
  state.schema = 1; state.gameUrl = GAME_URL; state.dashboardUrl = DASH_URL; state.ntfyTopic = NTFY_TOPIC; state.repo = REPO;
  state.counters = Object.assign({ checks: 0, liveChecks: 0, trialChecks: 0, problemsDetected: 0, problemsResolved: 0, publications: 0, rollbacks: 0, blocked: 0, reports: 0 }, state.counters || {});
  state.agents = AGENTS.map(a => ({ ...a, last: (state.agents || []).find(x => x.id === a.id)?.last || null, lastText: (state.agents || []).find(x => x.id === a.id)?.lastText || null }));
  return { state, runs: await readJSON('runs.json', []), events: await readJSON('events.json', []), problems: await readJSON('problems.json', []) };
}
async function save(D) {
  D.state.updatedAt = NOW;
  D.state.openProblems = D.problems.filter(p => p.status === 'ouvert').length;
  await writeJSON('state.json', D.state);
  await writeJSON('runs.json', D.runs.slice(0, MAX_RUNS));
  await writeJSON('events.json', D.events.slice(0, MAX_EVENTS));
  await writeJSON('problems.json', D.problems.filter(p => p.status === 'ouvert' || Date.now() - Date.parse(p.resolvedAt || p.lastSeen) < 60 * 864e5));
}
const event = (D, type, title, detail = '', extra = {}) => D.events.unshift({ at: NOW, type, title, detail, url: RUN_URL, ...extra });
const agentDone = (D, id, text) => { const a = D.state.agents.find(x => x.id === id); if (a) { a.last = NOW; a.lastText = text; } };

async function controle() {
  const D = await load();
  let R = null;
  try { R = JSON.parse(await readFile(join(ROOT, 'guardian', 'out', 'results.json'), 'utf8')); } catch (e) {}
  const live = isLive();
  D.state.counters.checks++; D.state.counters[live ? 'liveChecks' : 'trialChecks']++;
  const trig = TRIGGERS[EVENT] || EVENT;

  if (!R) {
    // le contrôleur n'a même pas pu produire de rapport (plantage, panne de GitHub…)
    D.runs.unshift({ at: NOW, trigger: trig, branch: BRANCH, sha: SHA, live, ok: false, crashed: true, url: RUN_URL });
    event(D, 'erreur', "Le contrôleur n'a pas pu terminer", `Contrôle (${trig}, branche ${BRANCH}) interrompu avant la fin.`);
    agentDone(D, 'testeur', 'Contrôle interrompu');
    const prev = D.runs[1];
    if (!prev || !prev.crashed) await notify('⚠️ MYTHORIA Guardian', `Le contrôle (${trig}) n'a pas pu se terminer. Le jeu n'est peut-être pas en cause : détails dans le tableau de bord.`, { priority: 4, tags: ['warning'] });
    return save(D);
  }

  const blocking = R.problems.filter(p => p.level === 'bloquant');
  const stepsTotal = R.devices.reduce((n, d) => n + d.steps.length, 0), stepsOk = R.devices.reduce((n, d) => n + d.steps.filter(s => s.ok).length, 0);
  const run = {
    at: NOW, trigger: trig, branch: BRANCH, sha: SHA, live, ok: R.ok, quick: R.quick, version: R.version, durationS: R.durationS, url: RUN_URL,
    problems: blocking.length, warnings: R.problems.length - blocking.length, steps: [stepsOk, stepsTotal],
    tests: R.static.length ? [R.static.filter(s => s.ok).length, R.static.length] : null,
    metrics: Object.fromEntries(R.devices.map(d => [d.device, d.metrics])),
  };
  D.runs.unshift(run);
  agentDone(D, 'testeur', `${stepsOk}/${stepsTotal} étapes réussies${blocking.length ? ' · ' + blocking.length + ' problème(s)' : ''}`);

  if (live) {
    // ---- suivi des problèmes du jeu publié ----
    const seen = new Set(), opened = [], resolved = [];
    for (const p of R.problems) {
      const id = fingerprint(p); if (seen.has(id)) continue; seen.add(id);
      let P = D.problems.find(x => x.id === id);
      if (!P || P.status === 'résolu') {
        P = { id, level: p.level, where: p.where, title: p.title, detail: p.detail, firstSeen: NOW, lastSeen: NOW, seenCount: 1, status: 'ouvert', url: RUN_URL };
        D.problems = D.problems.filter(x => x.id !== id); D.problems.unshift(P); opened.push(P);
        if (p.level === 'bloquant') D.state.counters.problemsDetected++;
      } else { P.lastSeen = NOW; P.seenCount++; P.detail = p.detail; P.url = RUN_URL; }
    }
    // un contrôle rapide ne joue pas de combat : il ne peut pas déclarer résolu un problème de combat
    const coveredSteps = new Set(R.devices.flatMap(d => d.steps.map(s => s.name)));
    for (const P of D.problems) {
      if (P.status !== 'ouvert' || seen.has(P.id)) continue;
      if (R.quick && /Combat|Mode Héros/.test(P.title + P.detail) && ![...coveredSteps].some(n => /Combat|Mode Héros/.test(n))) continue;
      P.status = 'résolu'; P.resolvedAt = NOW; resolved.push(P);
      if (P.level === 'bloquant') D.state.counters.problemsResolved++;
    }
    for (const P of opened) event(D, P.level === 'bloquant' ? 'probleme' : 'surveillance', (P.level === 'bloquant' ? 'Problème détecté : ' : 'À surveiller : ') + P.title, `${P.where} — ${P.detail}`);
    for (const P of resolved) event(D, 'resolu', 'Problème résolu : ' + P.title, `${P.where} — n'apparaît plus au contrôle (${trig}).`);
    if (!opened.length && !resolved.length) event(D, R.ok ? 'controle' : 'probleme', R.ok ? 'Contrôle réussi' : 'Problème(s) toujours présent(s)', `${stepsOk}/${stepsTotal} étapes · ${trig} · version ${R.version || '?'}`, { quiet: true });
    D.state.status = R.ok ? 'ok' : 'probleme';
    D.state.lastCheck = { ...run, devices: R.devices.map(d => ({ id: d.device, label: d.label, metrics: d.metrics, steps: d.steps.map(s => ({ name: s.name, ok: s.ok, warn: s.warn || null, ms: s.ms, notes: s.notes, shots: [s.shot, s.shot2, s.shotStory].filter(Boolean).map(x => x.file.replace('.png', '.jpg')) })) })), static: R.static };
    if (R.version) D.state.liveVersion = R.version;
    // captures du jeu publié (seulement la dernière série, pour rester léger)
    const out = join(ROOT, 'guardian', 'out');
    const jpgs = (await readdir(out).catch(() => [])).filter(f => f.endsWith('.jpg'));
    if (jpgs.length) {
      for (const f of await readdir(join(DATA, 'shots')).catch(() => [])) await rm(join(DATA, 'shots', f));
      for (const f of jpgs) await copyFile(join(out, f), join(DATA, 'shots', f));
      D.state.shotsAt = NOW;
    }
    const newBlocking = opened.filter(p => p.level === 'bloquant');
    if (newBlocking.length) await notify(`⚠️ ${newBlocking.length} nouveau${newBlocking.length > 1 ? 'x' : ''} problème${newBlocking.length > 1 ? 's' : ''} dans MYTHORIA`, newBlocking.map(p => `• ${p.title} (${p.where})`).join('\n'), { priority: 4, tags: ['warning'] });
    const stillOpen = D.problems.filter(p => p.status === 'ouvert' && p.level === 'bloquant').length;
    const fixed = resolved.filter(p => p.level === 'bloquant').length;
    if (fixed && !stillOpen) await notify('✅ MYTHORIA va bien', `Plus aucun problème bloquant (${fixed} résolu${fixed > 1 ? 's' : ''}).`, { tags: ['white_check_mark'] });
  } else {
    // ---- contrôle d'une modification sur branche d'essai ----
    if (R.ok) event(D, 'essai', 'Modification contrôlée : tout est vert', `Branche ${BRANCH} (${SHA}) · ${stepsOk}/${stepsTotal} étapes · publication en cours.`);
    else {
      D.state.counters.blocked++;
      event(D, 'bloque', 'Modification bloquée : rien n\'a été publié', `Branche ${BRANCH} (${SHA}) · ` + blocking.map(p => p.title).join(' · '));
      await notify('🛑 Modification bloquée', `Une modification (branche ${BRANCH}) ne passait pas les tests : elle n'a PAS été publiée. Le jeu en ligne n'a pas changé.`, { priority: 3, tags: ['no_entry'] });
    }
  }
  return save(D);
}

async function publication() {
  const D = await load();
  const etat = opt('--etat'), v = opt('--version') || '?';
  if (etat === 'publie') {
    D.state.counters.publications++; D.state.liveVersion = v; D.state.lastPublication = { at: NOW, version: v, sha: SHA, url: RUN_URL };
    event(D, 'publication', 'Nouvelle version publiée et vérifiée en ligne', `Version ${v}${SHA ? ' (' + SHA + ')' : ''}.`);
    agentDone(D, 'gardien', 'Version ' + v + ' publiée et vérifiée');
    await notify('🚀 MYTHORIA mis à jour', `La version ${v} est en ligne et a passé le contrôle.`, { tags: ['rocket'] });
  } else if (etat === 'retour') {
    D.state.counters.rollbacks++;
    event(D, 'retour', 'Retour arrière automatique', `La version ${v} était cassée une fois en ligne : la version précédente a été remise.`);
    agentDone(D, 'gardien', 'Retour arrière (version ' + v + ' cassée)');
    await notify('↩️ Retour arrière automatique', `La version ${v} ne fonctionnait pas en ligne : l'ancienne version a été remise automatiquement. Ton jeu reste jouable.`, { priority: 5, tags: ['rotating_light'] });
  } else if (etat === 'pas-en-ligne') {
    event(D, 'surveillance', 'Publication lente', `La version ${v} a été envoyée mais GitHub Pages ne l'affichait pas encore après 10 min.`);
    agentDone(D, 'gardien', 'Publication envoyée, mise en ligne lente');
  } else if (etat === 'bloque') {
    event(D, 'bloque', 'Publication refusée', opt('--raison', 'La branche d\'essai n\'était pas à jour avec main.'));
    agentDone(D, 'gardien', 'Publication refusée');
  }
  return save(D);
}

// Rapport quotidien : uniquement à partir des contrôles et publications enregistrés sur les dernières 24 h.
async function rapport() {
  const D = await load();
  const since = Date.now() - 864e5, day = NOW.slice(0, 10);
  const runs = D.runs.filter(r => Date.parse(r.at) >= since), evs = D.events.filter(e => Date.parse(e.at) >= since);
  const live = runs.filter(r => r.live), okLive = live.filter(r => r.ok).length;
  const count = t => evs.filter(e => e.type === t).length;
  const open = D.problems.filter(p => p.status === 'ouvert');
  const loads = live.map(r => r.metrics?.telephone?.loadMs).filter(Boolean);
  const rep = {
    date: day, at: NOW,
    checks: runs.length, liveChecks: live.length, liveOk: okLive, trialChecks: runs.length - live.length,
    detected: evs.filter(e => e.type === 'probleme' && !e.quiet).map(e => e.title.replace(/^Problème détecté : /, '')),
    resolved: evs.filter(e => e.type === 'resolu').map(e => e.title.replace(/^Problème résolu : /, '')),
    publications: count('publication'), rollbacks: count('retour'), blocked: count('bloque'),
    open: open.map(p => ({ title: p.title, where: p.where, level: p.level, since: p.firstSeen })),
    loadPhoneS: loads.length ? +(loads.reduce((a, b) => a + b, 0) / loads.length / 1000).toFixed(1) : null,
    version: D.state.liveVersion || null,
    next: open.length ? ['Corriger les problèmes encore ouverts (' + open.length + ').'] : ['Continuer la surveillance horaire.'],
  };
  rep.next.push("Mise en service des agents Claude (Réparateur, Graphiste, Équilibreur) : étape 4 du plan.");
  await writeJSON(`reports/${day}.json`, rep);
  const idx = await readJSON('reports/index.json', []);
  await writeJSON('reports/index.json', [day, ...idx.filter(d => d !== day)].slice(0, 120));
  D.state.counters.reports++; D.state.lastReport = day;
  event(D, 'rapport', 'Rapport quotidien', `${rep.liveChecks} contrôles du jeu (${okLive} réussis) · ${rep.detected.length} problème(s) détecté(s) · ${rep.resolved.length} résolu(s) · ${rep.publications} publication(s).`);
  agentDone(D, 'rapporteur', 'Rapport du ' + day);
  const msg = [
    `${rep.liveChecks} contrôles du jeu en 24 h : ${okLive} réussis.`,
    `Problèmes détectés : ${rep.detected.length} · résolus : ${rep.resolved.length} · encore ouverts : ${open.length}.`,
    `Publications : ${rep.publications}${rep.rollbacks ? ' · retours arrière : ' + rep.rollbacks : ''}${rep.blocked ? ' · modifications bloquées : ' + rep.blocked : ''}.`,
    rep.loadPhoneS ? `Chargement sur téléphone (test) : ${rep.loadPhoneS} s en moyenne.` : '',
  ].filter(Boolean).join('\n');
  await notify(`📋 Rapport du jour — ${open.length ? '⚠️ ' + open.length + ' problème(s) ouvert(s)' : 'tout va bien'}`, msg, { priority: open.length ? 4 : 2, tags: ['clipboard'] });
  return save(D);
}

const K = { controle, publication, rapport }[KIND];
if (!K) { console.error('Usage : node guardian/record.mjs controle|publication|rapport --data <dossier>'); process.exit(2); }
await mkdir(DATA, { recursive: true });
await K();
console.log('Guardian : enregistré (' + KIND + ') dans', DATA);
