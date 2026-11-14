// MYTHORIA GUARDIAN — contrôleur automatique du jeu.
// Ouvre le vrai jeu dans Chromium (format téléphone + ordinateur) et joue comme un nouveau joueur :
// chargement, choix du nom, récompense, chaque onglet, un combat complet (une IA joue), le Mode Héros.
// Relève : erreurs JavaScript, fichiers manquants, temps de chargement, fluidité (FPS), débordements,
// écrans vides. Écrit guardian/out/results.json + captures d'écran.
//
//   node guardian/check.mjs                → teste le dossier local (petit serveur intégré)
//   node guardian/check.mjs --url https://… → teste le site en ligne (contrôle après publication)
//   --quick                                 → sans combat ni Mode Héros (plus rapide)
// Code de sortie : 0 = aucun problème bloquant, 1 = au moins un problème bloquant.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { join, extname, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticChecks } from './static.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'guardian', 'out');
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const QUICK = args.includes('--quick');
const REMOTE = opt('--url');

// Seuils (au-delà = problème). Les tests tournent sans carte graphique : les FPS sont bien plus bas
// que sur un vrai téléphone, on ne surveille donc que les effondrements.
// Les machines gratuites de GitHub sont ~2× plus lentes qu'un téléphone récent pour la 3D sans carte graphique.
const LIMITS = { loadWarn: 30000, loadFail: 60000, fpsWarn: 2, battleMs: 300000 };

// Messages sans gravité (propres à l'environnement de test, pas au jeu).
const IGNORE = [/Service Worker registration blocked/i, /GPU stall due to ReadPixels/i, /Automatic fallback to software WebGL/i,
  /WebGL.*(software|SwiftShader)/i, /fonts\.(googleapis|gstatic)\.com/i];

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav' };

function serve() {
  return new Promise(res => {
    const srv = createServer(async (req, rsp) => {
      try {
        let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
        if (p.endsWith('/')) p += 'index.html';
        const f = normalize(join(ROOT, p));
        if (!f.startsWith(ROOT)) throw new Error('hors du dossier');
        const s = await stat(f); if (!s.isFile()) throw new Error('pas un fichier');
        rsp.writeHead(200, { 'content-type': MIME[extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
        rsp.end(await readFile(f));
      } catch (e) { rsp.writeHead(404); rsp.end('introuvable'); }
    });
    srv.listen(0, '127.0.0.1', () => res(srv));
  });
}

const DEVICES = [
  { id: 'telephone', label: 'Téléphone (412×915)', ctx: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 } },
  { id: 'ordinateur', label: 'Ordinateur (1366×768)', ctx: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 } },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// FPS mesurés dans la page pendant `ms` millisecondes.
const measureFps = (page, ms) => page.evaluate(ms => new Promise(r => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else r(Math.round(n * 10000 / (performance.now() - t0)) / 10); };
  requestAnimationFrame(f);
}), ms);

async function runDevice(browser, base, dev) {
  const R = { device: dev.id, label: dev.label, steps: [], errors: [], warnings: 0, failedRequests: [], metrics: {} };
  const ctx = await browser.newContext({ ...dev.ctx, serviceWorkers: 'block', locale: 'fr-FR' });
  const page = await ctx.newPage();
  let step = 'chargement';
  const err = (kind, text) => { text = String(text).slice(0, 400); if (IGNORE.some(r => r.test(text))) return; if (!R.errors.some(e => e.text === text)) R.errors.push({ kind, step, text }); };
  page.on('console', m => { if (m.type() === 'error') err('console', m.text()); else if (m.type() === 'warning') R.warnings++; });
  page.on('pageerror', e => err('exception', (e.stack || e.message || e)));
  // ERR_ABORTED = téléchargement interrompu volontairement (pas un fichier manquant) : seulement compté
  R.aborted = 0;
  page.on('requestfailed', r => { const u = r.url(), why = r.failure()?.errorText || ''; if (/ERR_ABORTED/.test(why)) { R.aborted++; return; } if (!IGNORE.some(x => x.test(u))) R.failedRequests.push({ step, url: u, why }); });
  page.on('response', r => { if (r.status() >= 400 && !IGNORE.some(x => x.test(r.url()))) R.failedRequests.push({ step, url: r.url(), why: 'HTTP ' + r.status() }); });

  const shot = async name => {
    const file = `${dev.id}-${name}.png`;
    const buf = await page.screenshot({ path: join(OUT, file) }).catch(() => null);
    // copie légère (JPEG) pour le tableau de bord
    await page.screenshot({ path: join(OUT, file.replace('.png', '.jpg')), type: 'jpeg', quality: 62 }).catch(() => {});
    // une capture presque uniforme se compresse énormément : signe d'un écran noir/vide
    const area = dev.ctx.viewport.width * dev.ctx.viewport.height;
    const blank = buf ? buf.length < area * 0.02 : true;
    return { file, blank };
  };
  // ferme les fenêtres (sheets) restées ouvertes : toucher le fond sombre, comme un joueur
  const closeSheets = async () => {
    // histoires de Vael (1re visite d'un mode) : on les lit jusqu'au bout avec « Suivant », comme un joueur
    for (let i = 0; i < 8 && await page.locator('.story:not(.off)').count(); i++) {
      await page.locator('.story:not(.off) .st-btns .btn.gold').click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(700);
    }
    for (let i = 0; i < 4 && await page.locator('.sheet-back').count(); i++) {
      await page.locator('.sheet-back').last().click({ position: { x: 8, y: 8 }, timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(800);
    }
  };
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const doStep = async (name, fn) => {
    step = name; const t = Date.now(); const before = R.errors.length;
    const S = { name, ok: true, ms: 0, notes: [] };
    try { await fn(S); } catch (e) { S.ok = false; S.notes.push('Échec : ' + String(e.message || e).split('\n')[0].slice(0, 200)); }
    S.ms = Date.now() - t; S.newErrors = R.errors.length - before; if (S.newErrors) S.ok = false;
    R.steps.push(S); return S;
  };

  const q = '?speed=8&autoplay&guardian=1';
  await doStep('Chargement du jeu', async S => {
    const t0 = Date.now();
    await page.goto(base + q, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => !document.getElementById('splash') && document.querySelector('#app > *'), null, { timeout: LIMITS.loadFail + 10000 });
    const ms = Date.now() - t0; R.metrics.loadMs = ms;
    S.notes.push(`Jeu ouvert en ${(ms / 1000).toFixed(1)} s (dont 3,6 s minimum d'écran de chargement voulu).`);
    if (ms > LIMITS.loadFail) throw new Error('chargement beaucoup trop long');
    if (ms > LIMITS.loadWarn) S.warn = 'Chargement long';
  });
  if (!R.steps[0].ok && !R.metrics.loadMs) { await ctx.close(); return R; }

  await doStep('Premier lancement (nom + récompense)', async S => {
    const inp = page.locator('.welcome input');
    await inp.waitFor({ timeout: 8000 });
    S.shot = await shot('bienvenue');
    await inp.fill('Gardien'); await inp.press('Enter');
    await page.waitForSelector('.welcome', { state: 'detached', timeout: 20000 });
    const claim = page.locator('.sheet .login button');
    await claim.waitFor({ timeout: 20000 }); S.shot2 = await shot('recompense'); await claim.click();
    await page.waitForSelector('.sheet-back', { state: 'detached', timeout: 20000 });
  });

  for (const [id, nm] of [['battle', 'Accueil'], ['heroes', 'Héros'], ['shop', 'Boutique'], ['kingdom', 'Royaume'], ['clan', 'Clan'], ['battle', 'Retour accueil']]) {
    await doStep('Onglet ' + nm, async S => {
      const idx = { shop: 0, heroes: 1, battle: 2, kingdom: 3, clan: 4 }[id];
      await closeSheets();
      await page.locator('nav.nav .nav-b').nth(idx).click();
      await page.waitForSelector('main.s-' + id, { timeout: 8000 });
      await sleep(id === 'kingdom' || id === 'battle' ? 2500 : 1000);
      if (await page.locator('.story:not(.off)').count()) { S.shotStory = await shot(id + '-histoire'); S.notes.push("Histoire de Vael affichée et lue jusqu'au bout."); }
      await closeSheets();
      if (await overflow()) { S.ok = false; S.notes.push("La page déborde sur le côté (défilement horizontal)."); }
      if (nm !== 'Retour accueil') {
        S.shot = await shot(id);
        if (S.shot.blank) { S.ok = false; S.notes.push('Capture presque vide (écran noir ?).'); }
      }
      if (id === 'kingdom' || id === 'battle') { const f = await measureFps(page, 3000); S.notes.push(`Fluidité : ${f} FPS (sans carte graphique).`); R.metrics['fps_' + id] = f; }
    });
  }

  if (!QUICK) {
    await doStep('Combat complet (une IA joue pour toi)', async S => {
      await page.evaluate(() => { const a = window.__app; a.play('training', 2, a.WORLDS[0]); });
      await page.waitForFunction(() => window.__battle && window.__battle.started, null, { timeout: 90000 });
      await sleep(4000); S.shot = await shot('combat');
      if (S.shot.blank) { S.ok = false; S.notes.push('Capture du combat presque vide.'); }
      const f = await measureFps(page, 4000); R.metrics.fps_combat = f; S.notes.push(`Fluidité en combat : ${f} FPS (sans carte graphique).`);
      if (f < LIMITS.fpsWarn) S.warn = 'Combat très saccadé';
      const t0 = Date.now();
      await page.waitForSelector('.result', { timeout: LIMITS.battleMs });
      const info = await page.evaluate(() => { const b = window.__battle, p = b && b.perf; return { result: document.querySelector('.result')?.className, perf: p && { frames: p.n, avgMs: p.n ? +(p.sum / p.n).toFixed(1) : 0, maxMs: +p.max.toFixed(1), slow: p.slow } }; });
      R.metrics.battle = info.perf; R.metrics.battleMs = Date.now() - t0;
      S.notes.push(`Combat terminé (${(info.result || '').replace('result', '').trim() || '?'}) après ${Math.round((Date.now() - t0) / 1000)} s.`);
      if (info.perf) S.notes.push(`Calcul par image : moyenne ${info.perf.avgMs} ms, pire ${info.perf.maxMs} ms.`);
      S.shot2 = await shot('resultat');
      // revenir à l'accueil
      const back = page.locator('.result button').last();
      if (await back.count()) { await back.click().catch(() => {}); await page.waitForSelector('.result', { state: 'detached', timeout: 15000 }).catch(() => {}); }
      await closeSheets();
    });

    await doStep('Mode Héros (20 s)', async S => {
      await page.evaluate(() => { const a = window.__app, P = a.P(); a.playHero(P.deck[0]); });
      await page.waitForFunction(() => window.__hero, null, { timeout: 90000 });
      await sleep(5000); S.shot = await shot('heros');
      if (S.shot.blank) { S.ok = false; S.notes.push('Capture du Mode Héros presque vide.'); }
      const f = await measureFps(page, 4000); R.metrics.fps_heros = f; S.notes.push(`Fluidité : ${f} FPS (sans carte graphique).`);
      // on bouge un peu le héros au clavier/joystick n'est pas nécessaire : on vérifie qu'il tourne sans erreur
      await sleep(10000);
    });
  }
  await ctx.close();
  return R;
}

// L'appli MYTHORIA Guardian (tableau de bord) : s'ouvre, lit les données, aucune erreur, installable.
async function runDashboard(browser, base) {
  const R = { device: 'guardian', label: 'Appli Guardian (téléphone)', steps: [], errors: [], warnings: 0, failedRequests: [], metrics: {} };
  const ctx = await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, locale: 'fr-FR' });
  const page = await ctx.newPage();
  page.on('pageerror', e => R.errors.push({ kind: 'exception', step: 'Appli Guardian', text: String(e.message || e).slice(0, 400) }));
  page.on('console', m => { if (m.type() === 'error' && !/api\.github\.com|rate limit|403/i.test(m.text())) R.errors.push({ kind: 'console', step: 'Appli Guardian', text: m.text().slice(0, 400) }); });
  const S = { name: 'Ouverture du tableau de bord', ok: true, ms: 0, notes: [] }; const t = Date.now();
  try {
    const url = base + 'guardian/';
    const rsp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    if (!rsp || !rsp.ok()) throw new Error('page introuvable (HTTP ' + (rsp && rsp.status()) + ')');
    await page.waitForSelector('.status', { timeout: 20000 });
    await page.waitForFunction(() => !/Chargement/.test(document.querySelector('.brand small')?.textContent || 'Chargement'), null, { timeout: 20000 }).catch(() => {});
    const info = await page.evaluate(async () => {
      const man = document.querySelector('link[rel=manifest]')?.href;
      const m = man ? await fetch(man).then(r => r.ok ? r.json() : null).catch(() => null) : null;
      const sw = await fetch('sw.js').then(r => r.ok).catch(() => false);
      return { title: document.querySelector('.status h1')?.textContent, offline: !!document.querySelector('.offline'), manifest: !!(m && m.icons && m.icons.length), name: m && m.name, sw };
    });
    S.notes.push(`Affiche : « ${info.title} ».`);
    if (!info.manifest) { S.ok = false; S.notes.push("Manifeste d'installation illisible."); }
    if (!info.sw) { S.ok = false; S.notes.push('Mode hors ligne (sw.js) introuvable.'); }
    if (info.offline) { S.ok = false; S.notes.push('Les données du Guardian ne se chargent pas (affichage hors ligne).'); }
    for (const [i, n] of [[1, 'Problèmes'], [2, 'Contrôle'], [3, 'Historique'], [0, 'Accueil']]) { await page.locator('.nav button').nth(i).click(); await page.waitForTimeout(400); }
    S.notes.push('Les 4 onglets s’ouvrent.');
    if (await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) { S.ok = false; S.notes.push('La page déborde sur le côté.'); }
  } catch (e) { S.ok = false; S.notes.push('Échec : ' + String(e.message || e).split('\n')[0].slice(0, 200)); }
  S.ms = Date.now() - t; if (R.errors.length) S.ok = false; R.steps.push(S);
  await ctx.close();
  return R;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const started = new Date();
  const statik = REMOTE ? [] : await staticChecks(ROOT);
  let srv = null, base = REMOTE;
  if (!base) { srv = await serve(); base = `http://127.0.0.1:${srv.address().port}/`; }
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const devices = [];
  try { for (const d of DEVICES) devices.push(await runDevice(browser, base, d)); devices.push(await runDashboard(browser, base)); }
  finally { await browser.close(); if (srv) srv.close(); }

  // Liste des problèmes, triés par gravité : bloquant (le jeu est cassé) / à surveiller.
  const problems = [];
  for (const s of statik) if (!s.ok) problems.push({ level: s.level || 'bloquant', where: 'code', title: s.name, detail: s.detail });
  for (const D of devices) {
    for (const S of D.steps) {
      if (!S.ok) problems.push({ level: 'bloquant', where: D.label, title: S.name, detail: S.notes.join(' ') });
      else if (S.warn) problems.push({ level: 'à surveiller', where: D.label, title: S.warn, detail: S.notes.join(' ') });
    }
    for (const e of D.errors) problems.push({ level: 'bloquant', where: D.label, title: 'Erreur JavaScript (' + e.step + ')', detail: e.text });
    const seen = new Set();
    for (const f of D.failedRequests) { if (seen.has(f.url)) continue; seen.add(f.url); problems.push({ level: 'bloquant', where: D.label, title: 'Fichier introuvable (' + f.step + ')', detail: f.url + ' — ' + f.why }); }
  }
  const html = REMOTE ? null : await readFile(join(ROOT, 'index.html'), 'utf8');
  const version = REMOTE ? null : (html.match(/data-version="([^"]+)"/) || [])[1];
  const res = {
    tool: 'MYTHORIA GUARDIAN — contrôleur', target: REMOTE || 'dossier local', version, quick: QUICK,
    startedAt: started.toISOString(), durationS: Math.round((Date.now() - started) / 1000),
    ok: !problems.some(p => p.level === 'bloquant'), problems, static: statik, devices,
  };
  await writeFile(join(OUT, 'results.json'), JSON.stringify(res, null, 2));
  await writeFile(join(OUT, 'summary.md'), summary(res));
  console.log(summary(res));
  process.exit(res.ok ? 0 : 1);
}

function summary(r) {
  const L = [`# MYTHORIA GUARDIAN — contrôle du ${r.startedAt.slice(0, 16).replace('T', ' ')} (UTC)`, '',
    `Cible : ${r.target}${r.version ? ' · version ' + r.version : ''} · durée ${r.durationS} s`, '',
    r.ok ? '## ✅ Aucun problème bloquant' : `## ❌ ${r.problems.filter(p => p.level === 'bloquant').length} problème(s) bloquant(s)`, ''];
  for (const p of r.problems) L.push(`- **${p.level}** · ${p.where} · ${p.title} — ${p.detail}`);
  if (r.static.length) { L.push('', '### Vérifications du code'); for (const s of r.static) L.push(`- ${s.ok ? '✅' : '❌'} ${s.name}${s.ok ? '' : ' — ' + s.detail}`); }
  for (const D of r.devices) {
    L.push('', `### ${D.label}`);
    for (const S of D.steps) L.push(`- ${S.ok ? (S.warn ? '⚠️' : '✅') : '❌'} ${S.name} (${(S.ms / 1000).toFixed(1)} s)${S.notes.length ? ' — ' + S.notes.join(' ') : ''}`);
  }
  return L.join('\n') + '\n';
}

main().catch(e => { console.error('Le contrôleur a planté :', e); process.exit(2); });
