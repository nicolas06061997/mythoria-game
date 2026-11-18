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
  lock(k) {
    return wrap(glow(k + 'h', '#7f8cff'), `<circle cx="50" cy="50" r="40" fill="url(#${k}h)" opacity=".4"/><rect x="28" y="44" width="44" height="36" rx="6" fill="#4c4e7a" stroke="#1a1a3a" stroke-width="2"/><path d="M36 44V34Q36 20 50 20Q64 20 64 34V44" stroke="#6a6c9a" stroke-width="7" fill="none"/><circle cx="50" cy="60" r="5" fill="#1a1a3a"/><path d="M48 62H52L53 72H47z" fill="#1a1a3a"/>`);
  },
};
export function modeIcon(id) { return (ICONS[id] || ICONS.lock)(uid()); }

// ---------- Paysages de fond (400×100, coupés selon la largeur) ----------
const trees = (col, base, n, seed, hMin, hMax) => {
  let s = seed, out = '';
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) {
    const x = 120 + i * (290 / n) + r() * 14, w = 5 + r() * 9, ht = hMin + r() * (hMax - hMin);
    out += `<path d="M${x} ${base}L${x + w * .2} ${base - ht}L${x + w * .8} ${base - ht}L${x + w} ${base}z" fill="${col}"/>`;
    out += `<ellipse cx="${x + w / 2}" cy="${base - ht + 4}" rx="${16 + r() * 14}" ry="${9 + r() * 6}" fill="${col}"/><ellipse cx="${x + w / 2 + 10}" cy="${base - ht + 14}" rx="${10 + r() * 8}" ry="${6 + r() * 4}" fill="${col}"/>`;
  }
  return out;
};
const motes = (seed, c, n = 14) => {
  let s = seed, out = '';
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) out += `<circle cx="${150 + r() * 250}" cy="${r() * 100}" r="${.6 + r() * 1.4}" fill="${c}" opacity="${.4 + r() * .6}"/>`;
  return out;
};
const scene = (k, defs, body) => `<svg viewBox="0 0 400 100" preserveAspectRatio="xMaxYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>${defs}
<linearGradient id="${k}fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0a1238" stop-opacity=".92"/><stop offset=".42" stop-color="#0a1238" stop-opacity=".55"/><stop offset=".7" stop-color="#0a1238" stop-opacity=".05"/><stop offset="1" stop-color="#0a1238" stop-opacity="0"/></linearGradient>
<filter id="${k}bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.2"/></filter></defs>
${body}<rect width="400" height="100" fill="url(#${k}fade)"/></svg>`;

const SCENES = {
  arena(k) { // forêt enchantée de Sylve
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f8a8c"/><stop offset=".55" stop-color="#1f5560"/><stop offset="1" stop-color="#10283a"/></linearGradient>${glow(k + 'l', '#d8fff2')}`,
      `<rect width="400" height="100" fill="url(#${k}s)"/><ellipse cx="300" cy="18" rx="90" ry="50" fill="url(#${k}l)" opacity=".7"/>
<path d="M285 0L250 100H275L300 0zM320 0L320 100H338L330 0z" fill="#e8fff4" opacity=".09"/>
<g filter="url(#${k}bl)">${trees('#2e6d6a', 104, 9, 3, 70, 110)}</g>${trees('#16393f', 104, 7, 11, 80, 120)}
<path d="M120 92Q200 84 260 90T400 86V100H120z" fill="#0f2a2c"/>${motes(5, '#c79aff', 10)}${motes(9, '#e8fff0', 10)}`);
  },
  camp(k) { // forêt dorée de la campagne
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8a5a1c"/><stop offset=".6" stop-color="#4a2c0e"/><stop offset="1" stop-color="#20120a"/></linearGradient>${glow(k + 'l', '#ffd98a')}`,
      `<rect width="400" height="100" fill="url(#${k}s)"/><ellipse cx="330" cy="40" rx="80" ry="55" fill="url(#${k}l)" opacity=".75"/>
<g filter="url(#${k}bl)">${trees('#5a3810', 104, 8, 7, 70, 110)}</g>${trees('#2a1606', 104, 6, 2, 85, 120)}
<path d="M120 94Q220 86 300 92T400 90V100H120z" fill="#1a0e04"/>${motes(13, '#ffe0a0', 14)}`);
  },
  surv(k) { // château sous l'orage
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5468"/><stop offset=".6" stop-color="#252c3c"/><stop offset="1" stop-color="#11141e"/></linearGradient>`,
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<g filter="url(#${k}bl)" fill="#6a7488" opacity=".6"><ellipse cx="250" cy="12" rx="70" ry="16"/><ellipse cx="350" cy="8" rx="60" ry="14"/></g>
<path d="M368 0L356 26 364 26 350 52" stroke="#dfe9ff" stroke-width="1.6" fill="none" opacity=".9"/>
<path d="M368 0L356 26 364 26 350 52" stroke="#a9c4ff" stroke-width="5" fill="none" opacity=".25"/>
<g fill="#1a1e2a"><path d="M240 100V58H250V50H256V58H266V44L272 34 278 44V58H300V40H306V34H312V40H318V100z"/><path d="M318 100V64H330V54H336V64H350V100z"/>
<path d="M200 100L220 74 236 82 250 100z"/></g>
<g fill="#ffb84a" opacity=".85"><rect x="270" y="50" width="3" height="5"/><rect x="309" y="52" width="3" height="5"/><rect x="333" y="70" width="3" height="4"/></g>
<g stroke="#c8d4ff" stroke-width=".6" opacity=".25">${Array.from({ length: 22 }, (_, i) => `<path d="M${150 + i * 12} ${(i * 37) % 60}l-4 14"/>`).join('')}</g>`);
  },
  event(k) { // tempête d'éther violette
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a2ab8"/><stop offset=".5" stop-color="#7a3ad8"/><stop offset="1" stop-color="#2a3a9a"/></linearGradient>${glow(k + 'l', '#ff9cf2')}`,
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<g filter="url(#${k}bl)"><ellipse cx="260" cy="80" rx="80" ry="22" fill="#2a1a6a"/><ellipse cx="370" cy="88" rx="70" ry="18" fill="#3a1a7a"/><ellipse cx="320" cy="20" rx="60" ry="22" fill="url(#${k}l)" opacity=".7"/></g>
<g stroke-linejoin="round" fill="none"><path d="M300 0L288 22 298 24 282 50 296 50 276 80" stroke="#7ff6ff" stroke-width="5" opacity=".3"/><path d="M300 0L288 22 298 24 282 50 296 50 276 80" stroke="#e9ffff" stroke-width="1.6"/>
<path d="M380 10L366 30 376 32 356 56" stroke="#7ff6ff" stroke-width="4" opacity=".3"/><path d="M380 10L366 30 376 32 356 56" stroke="#e9ffff" stroke-width="1.2"/>
<path d="M200 0L214 18 206 22 222 40" stroke="#b9f8ff" stroke-width="1" opacity=".6"/></g>${motes(21, '#ffffff', 18)}`);
  },
  hero(k) { // arène de nuit, cercle magique
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a8a"/><stop offset=".6" stop-color="#1c1660"/><stop offset="1" stop-color="#0c0a30"/></linearGradient>${glow(k + 'l', '#ff6ad8')}`,
      `<rect width="400" height="100" fill="url(#${k}s)"/><ellipse cx="300" cy="10" rx="110" ry="30" fill="url(#${k}l)" opacity=".35"/>
<g fill="#120c40">${[200, 240, 300, 350, 390].map((x, i) => `<rect x="${x}" y="${20 + (i % 2) * 8}" width="12" height="80"/><rect x="${x - 3}" y="${18 + (i % 2) * 8}" width="18" height="5"/>`).join('')}</g>
<ellipse cx="300" cy="90" rx="90" ry="12" fill="none" stroke="#7fe0ff" stroke-width="1.4" opacity=".8"/><ellipse cx="300" cy="90" rx="70" ry="8" fill="none" stroke="#b98aff" stroke-width="1" stroke-dasharray="4 3" opacity=".8"/>
<ellipse cx="300" cy="90" rx="90" ry="12" fill="#7fe0ff" opacity=".12" filter="url(#${k}bl)"/>${motes(31, '#d9c8ff', 14)}`);
  },
  tourney(k) { // salle d'or, bannières
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5418"/><stop offset=".6" stop-color="#3e2808"/><stop offset="1" stop-color="#1c1004"/></linearGradient>${glow(k + 'l', '#ffe08a')}`,
      `<rect width="400" height="100" fill="url(#${k}s)"/><ellipse cx="310" cy="50" rx="70" ry="50" fill="url(#${k}l)" opacity=".6"/>
<g fill="#2a1a06">${[220, 270, 350, 395].map(x => `<rect x="${x}" y="10" width="14" height="90"/>`).join('')}</g>
<g>${[[240, '#8a1a2a'], [320, '#1a3a8a'], [372, '#8a1a2a']].map(([x, c]) => `<path d="M${x} 6H${x + 18}V44L${x + 9} 36 ${x} 44z" fill="${c}" stroke="#e9b84a" stroke-width="1"/><circle cx="${x + 9}" cy="20" r="4" fill="#e9b84a"/>`).join('')}</g>${motes(41, '#ffe8a8', 14)}`);
  },
  train(k) { // cour d'entraînement, mannequins
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a4a8a"/><stop offset=".6" stop-color="#162a5a"/><stop offset="1" stop-color="#0a1434"/></linearGradient>`,
      `<rect width="400" height="100" fill="url(#${k}s)"/>
<g fill="#0c1a40">${[260, 320, 375].map(x => `<rect x="${x - 1.5}" y="50" width="3" height="50"/><rect x="${x - 14}" y="58" width="28" height="3"/><ellipse cx="${x}" cy="66" rx="7" ry="11"/><circle cx="${x}" cy="48" r="6"/>`).join('')}</g>
<path d="M120 94Q240 88 400 92V100H120z" fill="#08102a"/>${motes(51, '#bfe0ff', 10)}`);
  },
  lock(k) {
    return scene(k, `<linearGradient id="${k}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c2050"/><stop offset="1" stop-color="#0c0f2c"/></linearGradient>`, `<rect width="400" height="100" fill="url(#${k}s)"/>${motes(61, '#8a90c8', 10)}`);
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
