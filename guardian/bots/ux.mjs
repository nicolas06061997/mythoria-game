// MYTHORIA GUARDIAN — bot « Inspecteur UX et Lisibilité » (+ superpositions pour le Testeur multi-écrans).
// Sur l'écran affiché, à partir des boîtes de délimitation (bounding boxes) :
//   horsEcran  : un texte visible sort de l'écran (à gauche / à droite) ;
//   coupe      : un texte est plus grand que sa boîte et se retrouve coupé (sans « … » voulu) ;
//   contraste  : texte trop peu contrasté sur son fond (rapport WCAG < 3) — fonds en image / 3D ignorés (non mesurables),
//                fond en dégradé : on garde la couleur du dégradé la plus favorable (pas de fausse alerte) ;
//   recouverts : un bouton est caché par un autre élément en son centre (on ne peut pas appuyer dessus).
export async function uxCheck(page, { minContrast = 3 } = {}) {
  return page.evaluate(({ minContrast }) => {
    const W = innerWidth, H = innerHeight;
    const rgba = s => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,/]+/).map(Number); return [r, g, b, a]; };
    const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
    const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const over = (top, bot) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + bot[i] * (1 - a)).concat(1); };
    const name = el => el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
    const shown = el => { const cs = getComputedStyle(el); return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.2; };
    // l'élément est-il réellement visible (pas coupé par un parent qui défile ou masque) ?
    const clipBox = el => { let x0 = 0, y0 = 0, x1 = W, y1 = H, scrollX = false;
      for (let p = el.parentElement; p; p = p.parentElement) { const cs = getComputedStyle(p);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') { const r = p.getBoundingClientRect(); x0 = Math.max(x0, r.left); y0 = Math.max(y0, r.top); x1 = Math.min(x1, r.right); y1 = Math.min(y1, r.bottom); }
        if (/auto|scroll/.test(cs.overflowX) && p.scrollWidth > p.clientWidth + 1) scrollX = true; }
      return { x0, y0, x1, y1, scrollX }; };
    // fond réel derrière un texte : on remonte les parents en mélangeant les fonds transparents
    const backdrop = el => { const layers = [];
      for (let p = el; p; p = p.parentElement) { const cs = getComputedStyle(p);
        if (p.tagName === 'CANVAS' || p.tagName === 'IMG' || p.tagName === 'VIDEO') return null;
        const bi = cs.backgroundImage;
        if (bi && bi !== 'none') { if (/url\(/.test(bi)) return null; const stops = (bi.match(/rgba?\([^)]+\)/g) || []).map(rgba).filter(c => c && c[3] > 0.5); if (!stops.length) return null; return { layers, bases: stops }; }
        const c = rgba(cs.backgroundColor); if (c && c[3] > 0) { layers.push(c); if (c[3] >= 0.99) return { layers: layers.slice(0, -1), bases: [c] }; } }
      return null; };

    const out = { textes: 0, boutons: 0, horsEcran: [], coupe: [], contraste: [], recouverts: [], nonMesures: 0 };
    const add = (k, key, v) => { if (!out[k].some(x => x.key === key)) out[k].push({ key, ...v }); };
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const txt = n.nodeValue.trim(); if (txt.length < 2) continue;
      const el = n.parentElement; if (!el || seen.has(el) || !shown(el) || el.closest('#splash, script, style, [aria-hidden="true"]')) continue; seen.add(el);
      const range = document.createRange(); range.selectNodeContents(n); const r = range.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const cb = clipBox(el);
      if (r.bottom < cb.y0 + 1 || r.top > cb.y1 - 1 || r.right < cb.x0 + 1 || r.left > cb.x1 - 1) continue; // pas à l'écran (liste qui défile…)
      out.textes++;
      const cs = getComputedStyle(el), label = txt.slice(0, 40);
      // 1. hors de l'écran (sauf dans une zone qui défile sur le côté : c'est voulu)
      if (!cb.scrollX && (r.right > W + 2 || r.left < -2)) add('horsEcran', name(el) + label, { element: name(el), texte: label, depasse: Math.round(Math.max(r.right - W, -r.left)) });
      // 2. texte coupé par sa propre boîte
      const clipped = /hidden|clip/.test(cs.overflowX + cs.overflowY) && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2);
      const voulu = cs.textOverflow === 'ellipsis' || (cs.webkitLineClamp && cs.webkitLineClamp !== 'none'); // « … » voulu par le jeu
      if (clipped && voulu) { /* raccourci proprement : rien à signaler */ }
      else if (clipped) add('coupe', name(el) + label, { element: name(el), texte: label, manque: Math.max(el.scrollWidth - el.clientWidth, el.scrollHeight - el.clientHeight) });
      else { // texte qui sort de la boîte de son parent direct (parent sans défilement)
        const p = el.parentElement, pr = p && p.getBoundingClientRect();
        if (pr && pr.width > 20 && !cb.scrollX && (r.right > pr.right + 4 || r.left < pr.left - 4) && r.width <= W) {
          const er = el.getBoundingClientRect();
          if (er.right <= pr.right + 4 && er.left >= pr.left - 4) add('coupe', name(el) + label, { element: name(el), texte: label, manque: Math.round(Math.max(r.right - pr.right, pr.left - r.left)) });
        }
      }
      // 3. contraste (texte avec contour ou ombre : lisible par construction, ignoré)
      const col = rgba(cs.color);
      if (!col || col[3] < 0.5) continue;
      if (cs.textShadow !== 'none' || parseFloat(cs.webkitTextStrokeWidth) > 0) continue;
      if (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') { out.nonMesures++; continue; } // texte peint en dégradé : sa couleur réelle n'est pas mesurable
      const bd = backdrop(el);
      if (!bd) { out.nonMesures++; continue; }
      let best = 0, bg = null;
      for (const base of bd.bases) { let c = base; for (let i = bd.layers.length - 1; i >= 0; i--) c = over(bd.layers[i], c); const k = ratio(over(col, c), c); if (k > best) { best = k; bg = c; } }
      if (best < minContrast) add('contraste', name(el) + label, { element: name(el), texte: label, rapport: +best.toFixed(2), taille: Math.round(parseFloat(cs.fontSize)) });
    }
    // 4. boutons recouverts
    for (const b of document.querySelectorAll('button, a[href], [role="button"], .btn, .nav-b')) {
      if (!shown(b) || b.disabled || getComputedStyle(b).pointerEvents === 'none') continue;
      const r = b.getBoundingClientRect(); if (r.width < 4 || r.height < 4) continue;
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, cb = clipBox(b);
      if (cx < cb.x0 || cx > cb.x1 || cy < cb.y0 || cy > cb.y1) continue; // pas visible pour l'instant
      out.boutons++;
      const top = document.elementFromPoint(cx, cy);
      if (!top || top === b || b.contains(top) || top.contains(b)) continue;
      if (top.closest('.sheet-back, .story, .toast, #inst, #upd')) continue; // fenêtre ouverte par-dessus : normal
      add('recouverts', name(b) + name(top), { element: name(b), texte: (b.textContent || '').trim().slice(0, 30), par: name(top) });
    }
    for (const k of ['horsEcran', 'coupe', 'contraste', 'recouverts']) out[k].forEach(x => delete x.key);
    out.contraste.sort((a, b) => a.rapport - b.rapport);
    return out;
  }, { minContrast });
}
