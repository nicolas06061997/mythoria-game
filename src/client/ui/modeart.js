// MYTHORIA — illustrations de l'écran « Choisis ton combat » (18/11, d'après la maquette de l'utilisateur).
// Les cartes principales utilisent les images de la maquette (assets/ui/mode-*.webp) ; ici, les icônes SVG
// des cartes qui n'y figurent pas : modeIcon('tourney' | 'train' | 'lock') (les autres ids restent disponibles).

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
