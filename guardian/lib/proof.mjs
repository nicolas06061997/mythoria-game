// MYTHORIA GUARDIAN — Preuve visuelle : plus jamais d'erreur « aveugle ».
// Quand une étape échoue (ex. waitForSelector qui dépasse son délai), on photographie tout de suite l'écran
// et on range l'image avec le détail de l'erreur. Le fichier (JPEG léger) part dans shots/ de guardian-data
// et s'affiche dans l'onglet « Problèmes » de l'appli (champ « shot » du problème).
import { join } from 'node:path';

export async function proof(page, e, { out, name }) {
  const msg = String((e && e.message) || e);
  const file = `${name}.jpg`;
  const saved = await page.screenshot({ path: join(out, file), type: 'jpeg', quality: 62, timeout: 10000 }).then(() => true, () => false);
  const sel = msg.match(/locator\('((?:[^'\\]|\\.)+)'\)/) || msg.match(/waiting for selector "([^"]+)"/);
  const ecran = await page.evaluate(() => {
    const m = document.querySelector('main'), top = document.querySelector('.sheet-back, .story:not(.off), .welcome, .battle, .result');
    return (m ? 'main.' + String(m.className).trim().split(/\s+/).join('.') : 'aucun écran') + (top ? ' + ' + String(top.className).trim().split(/\s+/)[0] : '');
  }).catch(() => 'page fermée');
  return {
    type: (e && e.name) || 'Error',
    message: msg.split('\n')[0].slice(0, 200),
    selector: sel ? sel[1] : null,
    ecran, url: (() => { try { return page.url(); } catch (x) { return null; } })(),
    at: new Date().toISOString(),
    shot: saved ? file : null,
  };
}

// Texte court ajouté aux notes de l'étape (lisible par un non-développeur).
export const proofNote = p => `Échec : ${p.message}${p.selector ? ` (élément attendu : ${p.selector})` : ''} · écran affiché : ${p.ecran}${p.shot ? ' · capture enregistrée' : ''}.`;
