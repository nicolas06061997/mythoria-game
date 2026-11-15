// MYTHORIA GUARDIAN — bot « Directeur Artistique » : cohérence visuelle des menus.
// Relève la couleur réelle (calculée par le navigateur) des fonds, textes, bordures et icônes des boutons,
// cartes et pastilles affichés, et la compare à la charte :
//   charte = variables CSS du jeu (--gold, --b1…) + guardian/bots/charte.json (liste de couleurs autorisées).
// Limite : ne voit que l'interface HTML. La scène 3D (canvas) n'est pas analysée.
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const TARGETS = 'button, .btn, .nav-b, .pill, .avatar, .sheet, [class*="card"], button svg, .nav-b svg';
export const loadCharte = async () => { try { return JSON.parse(await readFile(join(HERE, 'charte.json'), 'utf8')); } catch (e) { return { tolerance: 12, couleurs: [] }; } };

// Renvoie { palette, verifiees, vues: [hex…], horsCharte: [{ couleur, propriete, element, plusProche, ecart, fois }] }
export async function artCheck(page, charte) {
  return page.evaluate(({ tolerance, extra, targets }) => {
    const toRgb = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).map(Number); return a < 0.5 ? null : [r, g, b]; };
    const hexRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
    const hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
    const palette = new Set(extra.map(h => hex(hexRgb(h))));
    for (const sh of document.styleSheets) {
      let rules; try { rules = sh.cssRules; } catch (e) { continue; }
      for (const r of rules) if (r.style) for (const p of r.style) if (p.startsWith('--')) { const v = r.style.getPropertyValue(p).trim(); if (/^#[0-9a-f]{3,8}$/i.test(v)) palette.add(hex(hexRgb(v))); }
    }
    const pal = [...palette].map(hexRgb);
    const nearest = c => { let best = 1e9, at = [0, 0, 0]; for (const p of pal) { const d = Math.hypot(c[0] - p[0], c[1] - p[1], c[2] - p[2]); if (d < best) { best = d; at = p; } } return { d: Math.round(best), hex: hex(at) }; };
    const bad = new Map(), vues = new Set(); let checked = 0;
    for (const el of document.querySelectorAll(targets)) {
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.2) continue;
      const svg = el instanceof SVGElement;
      const props = svg ? { icone: cs.fill, trait: cs.stroke } : { fond: cs.backgroundColor, texte: cs.color };
      if (!svg && parseFloat(cs.borderTopWidth) > 0) props.bordure = cs.borderTopColor;
      for (const [prop, val] of Object.entries(props)) {
        const c = toRgb(val); if (!c) continue; checked++; vues.add(hex(c));
        const n = nearest(c); if (n.d <= tolerance) continue;
        const cls = svg ? '' : String(el.className || '').trim().split(/\s+/).filter(Boolean).slice(0, 3).join('.');
        const sel = el.tagName.toLowerCase() + (cls ? '.' + cls : '');
        const k = hex(c) + '|' + prop + '|' + sel;
        if (!bad.has(k)) bad.set(k, { couleur: hex(c), propriete: prop, element: sel, plusProche: n.hex, ecart: n.d, fois: 0 });
        bad.get(k).fois++;
      }
    }
    return { palette: palette.size, verifiees: checked, vues: [...vues], horsCharte: [...bad.values()].sort((a, b) => b.ecart - a.ecart) };
  }, { tolerance: charte.tolerance ?? 12, extra: charte.couleurs || [], targets: TARGETS });
}
