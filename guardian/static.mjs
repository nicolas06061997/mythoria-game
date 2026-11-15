// MYTHORIA GUARDIAN — vérifications du code sans navigateur (rapides, sûres).
// Utilisé par check.mjs et par les tests (npm test).
import { readFile, readdir, access } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const run = promisify(execFile);

async function walk(dir, ext, out = []) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) await walk(p, ext, out); else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const exists = p => access(p).then(() => true, () => false);

export async function staticChecks(ROOT) {
  const R = [];
  const add = (name, ok, detail = '', level = 'bloquant') => R.push({ name, ok, detail: ok ? '' : detail, level });
  const html = await readFile(join(ROOT, 'index.html'), 'utf8');
  const sw = await readFile(join(ROOT, 'sw.js'), 'utf8');

  // 1. version identique dans index.html et version.json (sinon les mises à jour automatiques se trompent)
  let ver = null;
  try { ver = JSON.parse(await readFile(join(ROOT, 'version.json'), 'utf8')); add('version.json est valide', true); }
  catch (e) { add('version.json est valide', false, String(e.message)); }
  const hv = (html.match(/data-version="([^"]+)"/) || [])[1];
  add('Même version dans index.html et version.json', !!ver && hv === ver.v, `index.html=${hv} · version.json=${ver && ver.v}`);
  add('Format de version AAAA-MM-JJ.n', /^\d{4}-\d{2}-\d{2}\.\d+$/.test(hv || ''), `version « ${hv} »`);

  // 2. le jeu hors ligne : chaque fichier JS du jeu doit être dans FILES de sw.js, et chaque fichier listé doit exister
  const js = (await walk(join(ROOT, 'src'), '.js')).map(p => relative(ROOT, p).split('\\').join('/'));
  const missing = js.filter(f => !sw.includes(`'./${f}'`));
  add('Tous les fichiers JS sont dans le mode hors ligne (sw.js)', !missing.length, 'absents : ' + missing.join(', '));
  const listed = [...(sw.match(/const FILES = \[([\s\S]*?)\];/) || ['', ''])[1].matchAll(/'\.\/([^']*)'/g)].map(m => m[1]).filter(Boolean);
  const gone = []; for (const f of listed) if (!(await exists(join(ROOT, f)))) gone.push(f);
  add('Tous les fichiers listés dans sw.js existent', !gone.length, 'introuvables : ' + gone.join(', '));

  // 3. syntaxe de chaque fichier JS (une seule faute = écran noir pour tout le monde)
  const bad = [];
  for (const f of js) { try { await run(process.execPath, ['--check', join(ROOT, f)]); } catch (e) { bad.push(f + ' : ' + String(e.stderr || e.message).split('\n').find(l => /Error/.test(l))); } }
  add('Aucune faute de syntaxe dans le code', !bad.length, bad.join(' | '));

  // 3 bis. scripts du Guardian (l'appli tableau de bord est dans le dépôt mythoria-guardian)
  const gbad = [];
  for (const f of ['guardian/check.mjs', 'guardian/record.mjs', 'guardian/static.mjs', 'guardian/sw.js', 'guardian/balance.mjs']) {
    try { await run(process.execPath, ['--check', join(ROOT, f)]); } catch (e) { gbad.push(f + ' : ' + String(e.stderr || e.message).split('\n').find(l => /Error/.test(l))); }
  }
  add('Aucune faute de syntaxe dans les scripts du Guardian', !gbad.length, gbad.join(' | '));

  // 4. fichiers de three.js de l'import map
  const im = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  try {
    const map = JSON.parse(im[1]).imports; const lost = [];
    for (const [k, v] of Object.entries(map)) if (!k.endsWith('/') && !(await exists(join(ROOT, v)))) lost.push(v);
    add('Bibliothèque 3D (three.js) présente', !lost.length, 'introuvable : ' + lost.join(', '));
  } catch (e) { add('Import map lisible', false, String(e.message)); }

  // 5. manifeste de l'appli (installation) + icônes
  try {
    const man = JSON.parse(await readFile(join(ROOT, 'manifest.webmanifest'), 'utf8')); const lost = [];
    for (const i of man.icons || []) if (!(await exists(join(ROOT, i.src.replace(/^\.\//, ''))))) lost.push(i.src);
    add("Manifeste d'installation valide et icônes présentes", !lost.length, 'icônes introuvables : ' + lost.join(', '));
  } catch (e) { add("Manifeste d'installation valide", false, String(e.message)); }

  return R;
}
