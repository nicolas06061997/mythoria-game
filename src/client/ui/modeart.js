// MYTHORIA — illustrations de l'écran « Choisis ton combat » (18/11, d'après la maquette de l'utilisateur).
// Tout en SVG (net partout, aucun fichier image) : modeIcon(id) = grande icône peinte à gauche,
// modeScene(id) = paysage de fond de la carte, frameCorner() = coin doré à gemmes du cadre.
// ids : arena, camp, surv, event, hero, tourney, train, lock

let N = 0;
const uid = () => 'ma' + (++N);
const sp = (x, y, r, o = 1, c = '#fff') => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="${c}" opacity="${o}"/>`;
const gold = k => `<linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".35" stop-color="#f1c45a"/><stop offset=".7" stop-color="#b47a1e"/><stop offset="1" stop-color="#6e4208"/></linearGradient>`;
const glow = (k, c) => `<radialGradient id="${k}"><stop offset="0" stop-color="${c}" stop-opacity=".8"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
const wrap = (defs, body) => `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${body}</svg>`;

// ---------- Grandes icônes ----------
const ICONS = {
  arena(k) { // épée d'argent, garde dorée, gemme bleue
    return wrap(gold(k + 'g') + glow(k + 'h', '#bfe6ff') +
      `<linearGradient id="${k}b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#c9d4ea"/><stop offset=".51" stop-color="#7f8cab"/><stop offset="1" stop-color="#4c5774"/></linearGradient>` +
      `<radialGradient id="${k}j" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#7fe0ff"/><stop offset="1" stop-color="#1a4fb8"/></radialGradient>`,
      `<circle cx="58" cy="40" r="40" fill="url(#${k}h)"/>
<g transform="rotate(45 50 50) translate(50 50) scale(1.12 1.08) translate(-50 -50)">
<path d="M43.5 4L56.5 4 57.5 62 42.5 62z" fill="url(#${k}b)" stroke="#2a3048" stroke-width="1.2" stroke-linejoin="round" transform="translate(0 0)"/>
<path d="M43.5 6L50 -4 56.5 6z" fill="#eef3ff" stroke="#2a3048" stroke-width="1.2" stroke-linejoin="round"/>
<path d="M49.4 4L50.6 4 50.6 58 49.4 58z" fill="#fff" opacity=".7"/>
<path d="M32 60Q50 66 68 60L70 66Q50 73 30 66z" fill="url(#${k}g)" stroke="#4a2c04" stroke-width="1.2" stroke-linejoin="round"/>
<circle cx="50" cy="65" r="5.2" fill="url(#${k}j)" stroke="#4a2c04" stroke-width="1"/>
<rect x="46" y="70" width="8" height="18" rx="2" fill="#6b3a1a" stroke="#2c1606" stroke-width="1"/>
<path d="M46 74H54M46 78H54M46 82H54" stroke="#3a1e0a" stroke-width="1"/>
<circle cx="50" cy="92" r="5" fill="url(#${k}g)" stroke="#4a2c04" stroke-width="1"/></g>
${sp(24, 26, 6)}${sp(80, 76, 3.5, .8)}`);
  },
  camp(k) { // grimoire de cuir, carte sur la couverture
    return wrap(gold(k + 'g') +
      `<linearGradient id="${k}c" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a5612e"/><stop offset=".6" stop-color="#6e3816"/><stop offset="1" stop-color="#3e1c08"/></linearGradient>
<linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbeec4"/><stop offset="1" stop-color="#d7b878"/></linearGradient>`,
      `<path d="M20 22L80 16 84 80 24 88z" fill="#f3e3bb" stroke="#3e1c08" stroke-width="1.4"/>
<path d="M16 18L76 12 80 76 20 84z" fill="url(#${k}c)" stroke="#2a1204" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M16 18L22 17 26 83 20 84z" fill="#2a1204" opacity=".45"/>
<path d="M30 26L70 22 72 66 33 70z" fill="url(#${k}m)" stroke="#6b4a1a" stroke-width="1.2"/>
<path d="M36 34Q44 30 50 36T64 34Q66 44 58 48T42 58Q34 52 38 44z" fill="#7fb35a" opacity=".85"/>
<path d="M52 40Q58 46 54 54" stroke="#3f7fc0" stroke-width="2" fill="none"/>
<path d="M40 52L44 48M41 48L43 52" stroke="#a02818" stroke-width="1.6"/>
<path d="M44 46Q52 50 60 42" stroke="#7a3a10" stroke-width="1" stroke-dasharray="2 2" fill="none"/>
<path d="M16 18L26 17 24 26 17 27z" fill="url(#${k}g)" stroke="#4a2c04"/><path d="M76 12L66 13 68 22 77 21z" fill="url(#${k}g)" stroke="#4a2c04"/>
<path d="M20 84L30 83 29 74 19 75z" fill="url(#${k}g)" stroke="#4a2c04"/><path d="M80 76L70 77 70 68 79 67z" fill="url(#${k}g)" stroke="#4a2c04"/>
<path d="M58 80L58 94 62 90 66 94 66 79z" fill="#2f63b8" stroke="#12285a"/>`);
  },
  surv(k) { // bouclier doré à arête centrale
    return wrap(gold(k + 'g') + glow(k + 'h', '#ffd98a') +
      `<linearGradient id="${k}d" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2b8"/><stop offset=".48" stop-color="#d9a33c"/><stop offset=".52" stop-color="#9a6214"/><stop offset="1" stop-color="#5a3404"/></linearGradient>`,
      `<circle cx="50" cy="48" r="44" fill="url(#${k}h)" opacity=".55"/>
<path d="M50 6Q66 14 86 14Q88 60 50 94Q12 60 14 14Q34 14 50 6z" fill="url(#${k}g)" stroke="#3e2404" stroke-width="2" stroke-linejoin="round"/>
<path d="M50 14Q63 20 78 20Q78 58 50 84Q22 58 22 20Q37 20 50 14z" fill="url(#${k}d)" stroke="#6e4208" stroke-width="1.2"/>
<path d="M50 14L50 84" stroke="#fff6cf" stroke-width="1.6" opacity=".8"/>
<path d="M28 24Q40 22 50 16" stroke="#fff" stroke-width="2" fill="none" opacity=".6" stroke-linecap="round"/>
${sp(70, 26, 5)}`);
  },
  event(k) { // étoile à 8 branches, cœur violet, éclairs
    return wrap(glow(k + 'h', '#c58bff') +
      `<linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b9c6ff"/><stop offset="1" stop-color="#5a46c8"/></linearGradient>
<radialGradient id="${k}c"><stop offset="0" stop-color="#fff"/><stop offset=".3" stop-color="#ff9cf2"/><stop offset=".7" stop-color="#8a3ae0"/><stop offset="1" stop-color="#2a1270"/></radialGradient>`,
      `<circle cx="50" cy="50" r="48" fill="url(#${k}h)"/>
<path d="M70 4L60 26 68 26 56 46" stroke="#9ff3ff" stroke-width="2" fill="none" stroke-linejoin="round"/>
<path d="M8 74L26 64 22 70 40 62" stroke="#9ff3ff" stroke-width="1.6" fill="none" stroke-linejoin="round"/>
<path d="M50 4L58 42 96 50 58 58 50 96 42 58 4 50 42 42z" fill="url(#${k}s)" stroke="#241466" stroke-width="1.4" stroke-linejoin="round"/>
<path d="M50 22L54 46 78 50 54 54 50 78 46 54 22 50 46 46z" fill="#3a2aa0" opacity=".9" transform="rotate(45 50 50)"/>
<path d="M50 22L54 46 78 50 54 54 50 78 46 54 22 50 46 46z" fill="url(#${k}s)" stroke="#241466" stroke-width="1" transform="rotate(45 50 50)" opacity=".85"/>
<circle cx="50" cy="50" r="11" fill="url(#${k}c)" stroke="#f1c45a" stroke-width="2"/>
${sp(46, 46, 4)}${sp(84, 18, 4, .9)}${sp(16, 22, 3, .7)}`);
  },
  hero(k) { // médaillon violet, silhouette dorée
    return wrap(gold(k + 'g') + glow(k + 'h', '#b98aff') +
      `<radialGradient id="${k}p" cx=".4" cy=".3"><stop offset="0" stop-color="#9a6af0"/><stop offset=".7" stop-color="#4a1fa0"/><stop offset="1" stop-color="#21094e"/></radialGradient>`,
      `<circle cx="50" cy="48" r="48" fill="url(#${k}h)" opacity=".6"/>
<path d="M50 84L58 96 50 92 42 96z" fill="url(#${k}g)" stroke="#4a2c04"/>
<circle cx="50" cy="46" r="38" fill="url(#${k}g)" stroke="#3e2404" stroke-width="1.6"/>
<circle cx="50" cy="46" r="31" fill="url(#${k}p)" stroke="#6e4208" stroke-width="1.4"/>
<circle cx="50" cy="35" r="10" fill="url(#${k}g)"/>
<path d="M30 66Q32 48 50 48Q68 48 70 66Q60 72 50 72Q40 72 30 66z" fill="url(#${k}g)"/>
<path d="M30 30Q38 18 52 17" stroke="#fff" stroke-width="2" fill="none" opacity=".35" stroke-linecap="round"/>`);
  },
  tourney(k) { // coupe dorée
    return wrap(gold(k + 'g') + glow(k + 'h', '#ffe08a'),
      `<circle cx="50" cy="44" r="44" fill="url(#${k}h)" opacity=".6"/>
<path d="M28 18H16Q14 40 34 46M72 18H84Q86 40 66 46" stroke="url(#${k}g)" stroke-width="6" fill="none"/>
<path d="M26 12H74Q74 52 50 60Q26 52 26 12z" fill="url(#${k}g)" stroke="#3e2404" stroke-width="1.8" stroke-linejoin="round"/>
<path d="M34 16Q34 40 46 52" stroke="#fff6cf" stroke-width="3" fill="none" opacity=".6" stroke-linecap="round"/>
<path d="M45 60H55L57 74H43z" fill="url(#${k}g)" stroke="#3e2404" stroke-width="1.4"/>
<path d="M32 74H68L72 88H28z" fill="url(#${k}g)" stroke="#3e2404" stroke-width="1.6" stroke-linejoin="round"/>
<path d="M40 79H60V84H40z" fill="#6e3816"/>
<circle cx="50" cy="30" r="6" fill="#5ad0ff" stroke="#3e2404" stroke-width="1.2"/>${sp(48, 28, 2.4)}${sp(80, 60, 4, .8)}`);
  },
  train(k) { // cible et flèche
    return wrap(gold(k + 'g') + glow(k + 'h', '#9fd0ff'),
      `<circle cx="46" cy="54" r="44" fill="url(#${k}h)" opacity=".5"/>
<circle cx="46" cy="54" r="36" fill="url(#${k}g)" stroke="#3e2404" stroke-width="1.6"/>
<circle cx="46" cy="54" r="29" fill="#2b4aa8"/><circle cx="46" cy="54" r="21" fill="#f4ead0"/>
<circle cx="46" cy="54" r="13" fill="#c0302a"/><circle cx="46" cy="54" r="5.5" fill="url(#${k}g)"/>
<path d="M47 53L88 12" stroke="#5a3010" stroke-width="3"/><path d="M47 53L56 50 50 47z" fill="#ccd6ee" stroke="#2a3048"/>
<path d="M80 10L92 4 88 16 96 20 84 24 88 12z" fill="#e8f0ff" stroke="#2a3048" stroke-width="1"/>`);
  },
  lock(k) { // cadenas métallique
    return wrap(glow(k + 'h', '#9aa8ff') + `<linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#b9c0da"/><stop offset="1" stop-color="#4a5070"/></linearGradient><linearGradient id="${k}a" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8ecff"/><stop offset=".5" stop-color="#8a92b4"/><stop offset="1" stop-color="#4a5070"/></linearGradient>`,
      `<circle cx="50" cy="56" r="40" fill="url(#${k}h)" opacity=".35"/><path d="M34 46V33Q34 16 50 16Q66 16 66 33V46" stroke="#1a1c34" stroke-width="11" fill="none"/><path d="M34 46V33Q34 16 50 16Q66 16 66 33V46" stroke="url(#${k}a)" stroke-width="7" fill="none"/>
<rect x="24" y="44" width="52" height="42" rx="8" fill="url(#${k}m)" stroke="#1a1c34" stroke-width="2.4"/><rect x="28" y="48" width="44" height="6" rx="3" fill="#fff" opacity=".35"/>
<circle cx="50" cy="63" r="6" fill="#1e2038"/><path d="M47 65H53L54.5 76H45.5z" fill="#1e2038"/>`);
  },
};
export function modeIcon(id) { return (ICONS[id] || ICONS.lock)(uid()); }

// ---------- Paysages de fond (400×100, coupés selon la largeur, peints en couches + grain) ----------
const rng = seed => { let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };
// arbre « peint » : tronc courbe avec racines + houppier en grappes de cercles
const tree = (x, base, ht, w, col, leaf, r) => {
  const b = x + (r() - .5) * 8;
  let o = `<path d="M${x - w * 1.6} ${base}Q${x - w * .5} ${base - 6} ${x - w * .5} ${base - 14}L${b - w * .3} ${base - ht}L${b + w * .3} ${base - ht}L${x + w * .5} ${base - 14}Q${x + w * .5} ${base - 6} ${x + w * 1.8} ${base}z" fill="${col}"/>`;
  if (leaf) for (let i = 0; i < 6; i++) o += `<circle cx="${b + (r() - .5) * 46}" cy="${base - ht + (r() - .3) * 16}" r="${8 + r() * 12}" fill="${leaf}"/>`;
  return o;
};
const forest = (seed, n, x0, x1, base, hMin, hMax, w, col, leaf) => {
  const r = rng(seed); let o = '';
  for (let i = 0; i < n; i++) o += tree(x0 + (i + r() * .6) * ((x1 - x0) / n), base, hMin + r() * (hMax - hMin), w * (.7 + r() * .6), col, leaf, r);
  return o;
};
const dots = (seed, n, x0, y0, x1, y1, c, rmin, rmax, op = 1) => {
  const r = rng(seed); let o = '';
  for (let i = 0; i < n; i++) o += `<circle cx="${(x0 + r() * (x1 - x0)).toFixed(1)}" cy="${(y0 + r() * (y1 - y0)).toFixed(1)}" r="${(rmin + r() * (rmax - rmin)).toFixed(2)}" fill="${c}" opacity="${(op * (.45 + r() * .55)).toFixed(2)}"/>`;
  return o;
};
const rays = (k, cx, c, op) => `<g filter="url(#${k}bl)" opacity="${op}" fill="${c}"><path d="M${cx - 14} -5L${cx - 70} 105H${cx - 40}L${cx - 4} -5z"/><path d="M${cx + 2} -5L${cx - 8} 105H${cx + 18}L${cx + 12} -5z"/><path d="M${cx + 18} -5L${cx + 50} 105H${cx + 74}L${cx + 26} -5z"/></g>`;
const bolt = (d, w) => `<path d="${d}" stroke="#8ff4ff" stroke-width="${w * 4}" opacity=".22" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#bdfbff" stroke-width="${w * 1.8}" opacity=".7" fill="none" stroke-linejoin="round"/><path d="${d}" stroke="#fff" stroke-width="${w * .7}" fill="none" stroke-linejoin="round"/>`;
const scene = (k, defs, body) => `<svg viewBox="0 0 400 100" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
<filter id="${k}bl" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.4"/></filter>
<filter id="${k}bb" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="7"/></filter>
<filter id="${k}gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".9 .6" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .9 0"/></filter>
<linearGradient id="${k}fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#070b22" stop-opacity=".94"/><stop offset=".38" stop-color="#070b22" stop-opacity=".62"/><stop offset=".66" stop-color="#070b22" stop-opacity=".12"/><stop offset="1" stop-color="#070b22" stop-opacity="0"/></linearGradient>
<linearGradient id="${k}vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity=".25"/><stop offset=".3" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient></defs>
${body}<rect width="400" height="100" filter="url(#${k}gr)" opacity=".10" style="mix-blend-mode:overlay"/><rect width="400" height="100" fill="url(#${k}vg)"/><rect width="400" height="100" fill="url(#${k}fade)"/></svg>`;
const sky = (k, a, b, c) => `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".55" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;

const SCENES = {
  arena(k) { // forêt enchantée : brume turquoise, troncs géants, fleurs violettes lumineuses
    return scene(k, sky(k, '#5fb3ad', '#2a6f78', '#0f2c3a') + glow(k + 'l', '#eafff6') + glow(k + 'p', '#d27bff'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<ellipse cx="292" cy="30" rx="80" ry="58" fill="url(#${k}l)" opacity=".85"/>
<g filter="url(#${k}bl)" opacity=".75">${forest(3, 9, 150, 410, 100, 70, 95, 4, '#4f9a96', '#5aa7a0')}</g>
${rays(k, 292, '#f2fff8', .22)}
<g filter="url(#${k}bb)" fill="#cff4ea" opacity=".35"><ellipse cx="300" cy="78" rx="110" ry="10"/></g>
${forest(11, 5, 170, 420, 104, 90, 125, 8, '#173f45', '#1d4d50')}
${forest(19, 3, 200, 430, 106, 110, 130, 13, '#0b2328', null)}
<path d="M140 92Q210 84 280 90T420 86V100H140z" fill="#0c2226"/>
<ellipse cx="300" cy="90" rx="60" ry="14" fill="url(#${k}p)" opacity=".45"/>
${dots(5, 26, 200, 82, 400, 99, '#d58bff', .8, 2.2)}${dots(7, 12, 210, 84, 400, 98, '#ffb6f0', .6, 1.4)}${dots(9, 14, 160, 10, 400, 80, '#eafff4', .4, 1.2, .8)}`);
  },
  camp(k) { // forêt d'automne dorée, chemin de lumière
    return scene(k, sky(k, '#b9822e', '#6a3e12', '#22120a') + glow(k + 'l', '#ffe3a0'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<ellipse cx="320" cy="44" rx="86" ry="60" fill="url(#${k}l)" opacity=".9"/>
<g filter="url(#${k}bl)" opacity=".8">${forest(7, 8, 150, 410, 100, 65, 95, 4, '#8a5a20', '#a36a24')}</g>
${rays(k, 320, '#fff0c0', .25)}
${forest(2, 5, 165, 420, 104, 90, 125, 8, '#3a2008', '#4a2a0c')}
${forest(23, 3, 190, 430, 106, 110, 130, 13, '#1c0e04', null)}
<path d="M140 94Q230 86 300 92T420 90V100H140z" fill="#1a0e04"/>
<path d="M290 100Q300 90 318 86Q330 84 326 80" stroke="#ffd98a" stroke-width="6" fill="none" opacity=".35" filter="url(#${k}bl)"/>
${dots(13, 22, 170, 10, 400, 95, '#ffd27a', .5, 1.6)}${dots(17, 10, 200, 30, 400, 90, '#ff9a3a', .8, 1.8, .8)}`);
  },
  surv(k) { // remparts sur la falaise, orage
    return scene(k, sky(k, '#56607a', '#2a3248', '#10131e') + glow(k + 'f', '#cfe0ff'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<ellipse cx="360" cy="18" rx="60" ry="30" fill="url(#${k}f)" opacity=".5"/>
<g filter="url(#${k}bb)" fill="#7a849c" opacity=".7"><ellipse cx="240" cy="10" rx="80" ry="14"/><ellipse cx="350" cy="6" rx="70" ry="13"/><ellipse cx="300" cy="30" rx="60" ry="8" fill="#3a4258"/></g>
${bolt('M372 -2L360 22 368 23 352 50 360 51 348 70', 1)}
<g filter="url(#${k}bl)" fill="#2a3044" opacity=".9"><path d="M150 100L190 70 230 78 270 66 300 100z"/></g>
<path d="M200 100L230 80 330 82 360 100z" fill="#141826"/>
<g fill="#161a28"><path d="M236 84V56H244V50H250V56H258V42L265 30 272 42V56H292V38H298V32H306V38H312V84z"/><path d="M312 84V60H322V52H328V60H342V84z"/>
<path d="M236 56h6v-4h4v4h6v-4h4v4h6" stroke="#161a28" stroke-width="2"/></g>
<g fill="#ffb84a"><rect x="262" y="46" width="3" height="5"/><rect x="301" y="46" width="3" height="5"/><rect x="326" y="66" width="3" height="4"/><rect x="246" y="66" width="3" height="4"/></g>
<g fill="#ffb84a" opacity=".35" filter="url(#${k}bl)"><circle cx="263" cy="48" r="5"/><circle cx="302" cy="48" r="5"/></g>
<g stroke="#c8d4ff" stroke-width=".6" opacity=".22">${Array.from({ length: 26 }, (_, i) => `<path d="M${150 + i * 10} ${(i * 37) % 70}l-4 16"/>`).join('')}</g>`);
  },
  event(k) { // tempête d'éther : nébuleuse violette, éclairs cyan
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a20a8"/><stop offset=".5" stop-color="#8a44e8"/><stop offset="1" stop-color="#3048b8"/></linearGradient>` + glow(k + 'l', '#ffa8f4') + glow(k + 'c', '#8ff4ff'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<g filter="url(#${k}bb)"><ellipse cx="320" cy="20" rx="70" ry="26" fill="url(#${k}l)" opacity=".8"/><ellipse cx="250" cy="86" rx="90" ry="22" fill="#2a1470"/><ellipse cx="370" cy="92" rx="80" ry="18" fill="#3a1a80"/><ellipse cx="200" cy="40" rx="50" ry="20" fill="#b46af0" opacity=".5"/></g>
<ellipse cx="300" cy="50" rx="60" ry="40" fill="url(#${k}c)" opacity=".3"/>
${bolt('M300 -2L288 22 298 24 282 50 296 51 276 82', 1.1)}${bolt('M380 8L366 30 376 32 356 58', .8)}${bolt('M215 -2L228 18 220 22 236 42', .5)}
${dots(21, 30, 160, 2, 400, 98, '#ffffff', .4, 1.3)}${dots(25, 8, 200, 10, 400, 90, '#9ff6ff', .9, 1.8)}`);
  },
  hero(k) { // arène magique de nuit, colonnes, cercle de runes
    return scene(k, sky(k, '#4a2a98', '#221868', '#0c0a30') + glow(k + 'l', '#ff70dc') + glow(k + 'c', '#7fe8ff'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<ellipse cx="300" cy="8" rx="120" ry="34" fill="url(#${k}l)" opacity=".45"/>
<g filter="url(#${k}bl)" fill="#2a1e78" opacity=".9">${[180, 215, 250].map(x => `<rect x="${x}" y="34" width="10" height="66"/>`).join('')}</g>
<g fill="#110b3c">${[270, 320, 360, 398].map((x, i) => `<rect x="${x}" y="${22 + (i % 2) * 6}" width="13" height="80"/><rect x="${x - 3}" y="${19 + (i % 2) * 6}" width="19" height="5"/><rect x="${x - 3}" y="${90}" width="19" height="6"/>`).join('')}</g>
<path d="M140 100Q260 80 420 92V100z" fill="#0a0828"/>
<ellipse cx="310" cy="90" rx="80" ry="12" fill="url(#${k}c)" opacity=".5"/>
<ellipse cx="310" cy="90" rx="74" ry="10" fill="none" stroke="#9ff0ff" stroke-width="1.2" opacity=".9"/><ellipse cx="310" cy="90" rx="56" ry="7" fill="none" stroke="#c9a2ff" stroke-width=".9" stroke-dasharray="3 2.5"/>
<g fill="#b69aff">${[[262, 70], [356, 72], [380, 60]].map(([x, y]) => `<path d="M${x} ${y}l4 -12 4 12 -4 6z" opacity=".85"/>`).join('')}</g>
${dots(31, 22, 170, 4, 400, 90, '#e2d4ff', .4, 1.3)}`);
  },
  tourney(k) { // salle d'honneur dorée, bannières royales, torches
    return scene(k, sky(k, '#8a6020', '#45300c', '#1c1004') + glow(k + 'l', '#ffe08a') + glow(k + 't', '#ff9a3a'),
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<ellipse cx="315" cy="50" rx="80" ry="56" fill="url(#${k}l)" opacity=".7"/>
${rays(k, 315, '#fff0c0', .2)}
<g fill="#2a1a06">${[214, 262, 352, 398].map(x => `<rect x="${x}" y="6" width="15" height="94"/><rect x="${x - 3}" y="88" width="21" height="8"/>`).join('')}</g>
${[[232, '#9a1a2a'], [300, '#1a3a9a'], [372, '#9a1a2a']].map(([x, c]) => `<path d="M${x} 4H${x + 20}V46L${x + 10} 38 ${x} 46z" fill="${c}" stroke="#f1c45a" stroke-width="1.2"/><path d="M${x + 10} 14l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#f1c45a"/>`).join('')}
${[[221, 44], [270, 44], [360, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="12" fill="url(#${k}t)" opacity=".7"/><path d="M${x} ${y - 6}q3 4 0 7q-3 -3 0 -7z" fill="#ffd27a"/>`).join('')}
<path d="M140 96Q260 90 420 94V100H140z" fill="#140a02"/>${dots(41, 18, 180, 4, 400, 95, '#ffe8a8', .4, 1.4)}`);
  },
  train(k) { // cour d'entraînement au crépuscule
    return scene(k, sky(k, '#34589a', '#182e62', '#0a1434') + glow(k + 'l', '#9fd0ff'),
      `<rect width="400" height="100" fill="url(#${k}s)"/><ellipse cx="320" cy="30" rx="70" ry="40" fill="url(#${k}l)" opacity=".4"/>
<g fill="#0c1a40">${[262, 322, 378].map(x => `<rect x="${x - 1.5}" y="50" width="3" height="50"/><rect x="${x - 14}" y="58" width="28" height="3"/><ellipse cx="${x}" cy="66" rx="7" ry="11"/><circle cx="${x}" cy="48" r="6"/>`).join('')}</g>
<path d="M140 94Q260 88 420 92V100H140z" fill="#08102a"/>${dots(51, 14, 170, 4, 400, 90, '#bfe0ff', .4, 1.2)}`);
  },
  lock(k) {
    return scene(k, sky(k, '#1c2050', '#121540', '#0a0c28'), `<rect width="400" height="100" fill="url(#${k}s)"/>${dots(61, 16, 150, 4, 400, 96, '#8a90c8', .4, 1.1)}`);
  },
};
export function modeScene(id) { return (SCENES[id] || SCENES.lock)(uid()); }

// ---------- Coin du cadre (doré, volutes, gemmes) ----------
export function frameCorner() {
  const k = uid();
  return `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><defs>${gold(k + 'g')}
<radialGradient id="${k}b" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#8fe9ff"/><stop offset="1" stop-color="#1a4fb8"/></radialGradient>
<radialGradient id="${k}v" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#d59aff"/><stop offset="1" stop-color="#5a1ab0"/></radialGradient></defs>
<path d="M4 58V18Q4 4 18 4H58" stroke="url(#${k}g)" stroke-width="4" fill="none"/>
<path d="M10 58V22Q10 10 22 10H58" stroke="#b47a1e" stroke-width="1.2" fill="none"/>
<path d="M14 40Q8 30 16 24Q24 20 22 30Q20 34 16 32M40 14Q30 8 24 16Q20 24 30 22Q34 20 32 16" stroke="url(#${k}g)" stroke-width="2.4" fill="none" stroke-linecap="round"/>
<path d="M14 2L24 12 14 22 4 12z" fill="url(#${k}g)" stroke="#4a2c04" stroke-width="1"/>
<path d="M14 6L20 12 14 18 8 12z" fill="url(#${k}b)"/>
<circle cx="4" cy="40" r="3.4" fill="url(#${k}v)" stroke="#4a2c04" stroke-width=".8"/><circle cx="40" cy="4" r="3.4" fill="url(#${k}v)" stroke="#4a2c04" stroke-width=".8"/>
${sp(12, 9, 2.2, .9)}</svg>`;
}
