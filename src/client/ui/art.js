// MYTHORIA — illustrations vectorielles de l'interface « fantastique cosmique » (15/11).
// Tout est dessiné en SVG : net à n'importe quelle taille d'écran, aucun fichier image.
// chestSVG(type) · battleSVG() · medalSVG() · isleSVG('a'|'b'|'c') · sparkSVG()

const OUT = '#070b2c';

// ---------- Coffres astraux ----------
const CH = {
  bois:       { m: ['#fbe6bd', '#cf9a5c', '#7a4f24'], b: ['#3d68e0', '#1b2f92', '#0d1654'], gem: ['#fff6d8', '#e9c877', '#a8742a'], lock: 'ring', glow: '#9fd0ff' },
  argent:     { m: ['#ffffff', '#b4bfdc', '#58648e'], b: ['#3f7af0', '#1a3aa6', '#0c1a5c'], gem: ['#ffffff', '#8fe9ff', '#2a8ee0'], lock: 'gem', glow: '#bfe9ff' },
  or:         { m: ['#fff3bd', '#ecb94a', '#94610f'], b: ['#8a56ea', '#3d1f9a', '#1a0c54'], gem: ['#ffffff', '#9af0ff', '#2a9ae0'], lock: 'gem', glow: '#d9b8ff' },
  magique:    { m: ['#f0d6ff', '#a877ea', '#54289a'], b: ['#35d0d8', '#2a55b8', '#1c1668'], gem: ['#ffffff', '#ff9aec', '#b030c0'], lock: 'gem', glow: '#8ff6ff', neb: 1 },
  legendaire: { m: ['#fffbe0', '#ffc94a', '#b55f08'], b: ['#ff7a4a', '#b0204a', '#4a0c40'], gem: ['#ffffff', '#ffe98a', '#f09a1a'], lock: 'gem', glow: '#ffe9a0', neb: 1 },
};
const STARS = [[30, 30, .9], [44, 24, .6], [58, 33, 1], [66, 26, .55], [38, 42, .5], [29, 68, .8], [40, 78, .55], [62, 66, .9], [69, 80, .6], [33, 84, .5], [56, 84, .5], [92, 60, .7], [98, 72, .5], [94, 32, .6]];
const spark = (x, y, r, o = 1) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="#fff" opacity="${o}"/>`;

export function chestSVG(type) {
  const c = CH[type] || CH.bois, k = 'ch' + (CH[type] ? type : 'bois');
  const lidF = 'M12 52C12 31 18 21 26 18.500L97 18.500C90 21 84 31 84 52z'.replace(/\.500/g, '.5');
  const cap = 'M84 52C84 31 90 21 97 18.500C104 17 108 27 108 44z'.replace(/\.500/g, '.5');
  const lock = c.lock === 'ring'
    ? `<circle cx="48" cy="53" r="9" fill="url(#${k}m)" stroke="${OUT}" stroke-width="1.4"/><circle cx="48" cy="53" r="5.2" fill="${c.m[2]}"/><circle cx="48" cy="53" r="3.4" fill="url(#${k}g)"/><circle cx="46.800" cy="51.800" r="1.100" fill="#fff" opacity=".9"/>`.replace(/\.(\d)00/g, '.$1')
    : `<path d="M48 39L58 53 48 68 38 53z" fill="url(#${k}m)" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/><path d="M48 43.500L54.500 53 48 63 41.500 53z" fill="url(#${k}g)"/><path d="M48 43.500L54.500 53 48 53z" fill="#fff" opacity=".55"/><path d="M48 53L41.500 53 48 63z" fill="#000" opacity=".12"/>`.replace(/\.500/g, '.5');
  return `<svg viewBox="0 0 120 104" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="${k}m" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.m[0]}"/><stop offset=".45" stop-color="${c.m[1]}"/><stop offset="1" stop-color="${c.m[2]}"/></linearGradient>
<linearGradient id="${k}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.b[0]}"/><stop offset=".55" stop-color="${c.b[1]}"/><stop offset="1" stop-color="${c.b[2]}"/></linearGradient>
<linearGradient id="${k}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.gem[0]}"/><stop offset=".5" stop-color="${c.gem[1]}"/><stop offset="1" stop-color="${c.gem[2]}"/></linearGradient>
<radialGradient id="${k}n" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="${c.glow}" stop-opacity=".75"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0"/></radialGradient>
<clipPath id="${k}c"><path d="${lidF}"/><path d="M12 52H84V92H12z"/><path d="${cap}"/><path d="M84 52L108 44V83L84 92z"/></clipPath></defs>
<ellipse cx="60" cy="95" rx="50" ry="6" fill="#000" opacity=".38"/>
<g stroke="${OUT}" stroke-width="2.600" stroke-linejoin="round" fill="${OUT}"><path d="${lidF}"/><path d="${cap}"/><path d="M12 52H84V92H12z"/><path d="M84 52L108 44V83L84 92z"/></g>
<path d="M12 52H84V92H12z" fill="url(#${k}b)"/><path d="${lidF}" fill="url(#${k}b)"/>
<path d="M84 52L108 44V83L84 92z" fill="url(#${k}b)"/><path d="${cap}" fill="url(#${k}b)"/>
<g clip-path="url(#${k}c)">
${c.neb ? `<ellipse cx="46" cy="34" rx="30" ry="16" fill="url(#${k}n)"/><ellipse cx="54" cy="76" rx="26" ry="14" fill="url(#${k}n)" opacity=".7"/>` : `<ellipse cx="46" cy="30" rx="30" ry="12" fill="url(#${k}n)" opacity=".45"/>`}
<path d="M84 18V92L108 83V17z" fill="#04071e" opacity=".34"/>
<path d="M26 19L97 19 95 23 22 24z" fill="#fff" opacity=".22"/>
<g fill="#fff">${STARS.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
${spark(52, 28, 3.4)}${spark(34, 74, 2.6, .9)}${spark(66, 73, 3, .95)}${spark(96, 48, 2.4, .8)}
${type === 'bois' || !CH[type] ? '<path d="M30 34L40 27 52 31 62 25 68 30" fill="none" stroke="#fff" stroke-width=".8" opacity=".75"/><path d="M28 72L38 80 50 76" fill="none" stroke="#fff" stroke-width=".7" opacity=".6"/>' : ''}
</g>
<g fill="url(#${k}m)" stroke="${OUT}" stroke-width="1.400" stroke-linejoin="round">
<path d="M12 92V52C12 31 18 21 26 18.500L36 18.500C28 21 22 31 22 52V92z"/>
<path d="M74 92V52C74 31 80 21 87 18.500L97 18.500C90 21 84 31 84 52V92z"/>
<path d="M84 52C84 31 90 21 97 18.500C104 17 108 27 108 44L103.500 45.500C103.500 31 100.500 24 97.500 24.500C93 25.500 88.500 34 88.500 50.500z"/>
<path d="M103.500 45.500L108 44V83L103.500 84.700z"/>
<path d="M12 48.500H84V56.500H12z"/><path d="M84 48.500L108 40.500V47.500L84 56.500z"/>
<path d="M12 86.500H84V92H12z"/><path d="M84 86.500L108 77.500V83L84 92z"/>
<path d="M10 90H25L23.500 98H12z"/><path d="M71 90H86L84.500 98H73z"/><path d="M99 84.500L109.500 80.500 108.500 87.500 101 91z"/>
</g>
<g fill="none" stroke="#fff" stroke-linecap="round"><path d="M14.500 50C14.500 34 19 24.500 26 21" stroke-width="1.300" opacity=".75"/><path d="M76.500 50C76.500 34 81 24.500 88 21" stroke-width="1.300" opacity=".75"/><path d="M14 50H82" stroke-width="1" opacity=".7"/><path d="M14 88H82" stroke-width=".8" opacity=".45"/></g>
<g fill="${c.m[2]}"><circle cx="17" cy="66" r="1.300"/><circle cx="17" cy="78" r="1.300"/><circle cx="79" cy="66" r="1.300"/><circle cx="79" cy="78" r="1.300"/><circle cx="17" cy="38" r="1.200"/><circle cx="79" cy="38" r="1.200"/></g>
${lock}</svg>`.replace(/(\d)\.(\d)00\b/g, '$1.$2');
}

// ---------- Plaque du bouton COMBATTRE (le texte reste du vrai texte, posé dessus) ----------
export function battleSVG() {
  const fl = 'M0 0C8 -1 13 -6 12 -12C11 -17 5 -17 5 -12C5 -9 9 -9 9 -12M0 0C8 1 13 6 12 12C11 17 5 17 5 12C5 9 9 9 9 12M0 0H22M22 0C17 -3 16 -8 20 -11M22 0C17 3 16 8 20 11M-10 0L-4 -4 2 0 -4 4z';
  return `<svg viewBox="0 0 360 156" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none"><defs>
<linearGradient id="btG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3c4"/><stop offset=".3" stop-color="#eec46a"/><stop offset=".62" stop-color="#a8762a"/><stop offset=".85" stop-color="#f0c968"/><stop offset="1" stop-color="#7f5418"/></linearGradient>
<linearGradient id="btB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a62c4"/><stop offset=".46" stop-color="#1f3a92"/><stop offset=".54" stop-color="#14256c"/><stop offset="1" stop-color="#1c3688"/></linearGradient>
<radialGradient id="btL" cx=".5" cy="1" r=".6"><stop offset="0" stop-color="#7fe9ff" stop-opacity=".75"/><stop offset="1" stop-color="#7fe9ff" stop-opacity="0"/></radialGradient>
<linearGradient id="btC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#8fe9ff"/><stop offset="1" stop-color="#1f6ee0"/></linearGradient></defs>
<path d="M132 138L180 154 228 138 214 124H146z" fill="url(#btG)" stroke="${OUT}" stroke-width="1.500" stroke-linejoin="round"/>
<path d="M170 132L180 126 190 132 180 146z" fill="url(#btC)" stroke="${OUT}" stroke-width="1"/>
<path d="M6 84L36 44H324L354 84 324 124H36z" fill="url(#btG)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<path d="M15 84L40 51H320L345 84 320 117H40z" fill="${OUT}"/>
<path d="M18 84L41.500 53.500H318.500L342 84 318.500 114.500H41.500z" fill="url(#btB)"/>
<path d="M18 84L41.500 53.500H318.500L342 84 318.500 114.500H41.500z" fill="url(#btL)"/>
<path d="M44 56H316L330 74Q180 62 30 74z" fill="#fff" opacity=".2"/>
<path d="M25 84L45 58.500H315L335 84 315 109.500H45z" fill="none" stroke="#f4dc98" stroke-width="1" opacity=".75"/>
<g fill="none" stroke="#f6e7b8" stroke-width="1.500" stroke-linecap="round" stroke-linejoin="round" opacity=".92"><path d="${fl}" transform="translate(48 84)"/><path d="${fl}" transform="translate(312 84) scale(-1 1)"/></g>
<g stroke="${OUT}" stroke-width="1.300" stroke-linejoin="round"><path d="M14 84L26 72 38 84 26 96z" fill="url(#btG)"/><path d="M20 84L26 78 32 84 26 90z" fill="url(#btC)"/><path d="M322 84L334 72 346 84 334 96z" fill="url(#btG)"/><path d="M328 84L334 78 340 84 334 90z" fill="url(#btC)"/></g>
<path d="M98 47Q140 44 156 31L180 2 204 31Q220 44 262 47L246 57Q206 55 192 44L180 66 168 44Q154 55 114 57z" fill="url(#btG)" stroke="${OUT}" stroke-width="1.800" stroke-linejoin="round"/>
<path d="M126 50Q150 48 162 38M234 50Q210 48 198 38" fill="none" stroke="#fff" stroke-width="1" opacity=".6"/>
<path d="M180 12L192 34 180 58 168 34z" fill="url(#btC)" stroke="${OUT}" stroke-width="1.300" stroke-linejoin="round"/>
<path d="M180 12L192 34H180z" fill="#fff" opacity=".6"/><path d="M168 34H180V58z" fill="#0a2a8a" opacity=".28"/><path d="M180 34H192L180 58z" fill="#0a2a8a" opacity=".12"/>
</svg>`.replace(/(\d)\.(\d)00\b/g, '$1.$2');
}

// ---------- Médaillon du cristal (barre du haut) ----------
export function medalSVG() {
  return `<svg viewBox="0 0 72 76" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="mdG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".5" stop-color="#e2b65c"/><stop offset="1" stop-color="#8f6420"/></linearGradient>
<radialGradient id="mdB" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="#3558c8"/><stop offset=".7" stop-color="#101c62"/><stop offset="1" stop-color="#070b2c"/></radialGradient>
<linearGradient id="mdC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#bdf3ff"/><stop offset="1" stop-color="#4a9cf0"/></linearGradient></defs>
<path d="M36 1L40 6.500 36 12 32 6.500z" fill="url(#mdG)" stroke="${OUT}" stroke-width=".8"/>
<circle cx="36" cy="42" r="32" fill="${OUT}"/><circle cx="36" cy="42" r="30.500" fill="url(#mdG)"/><circle cx="36" cy="42" r="26.500" fill="${OUT}"/><circle cx="36" cy="42" r="25.500" fill="url(#mdB)"/>
<circle cx="36" cy="42" r="30.500" fill="none" stroke="#fff" stroke-width=".7" opacity=".5"/>
<g fill="none" stroke="#e9c877" stroke-linecap="round"><circle cx="36" cy="42" r="21" stroke-width=".7" opacity=".55"/><path d="M19 54A21 21 0 0 1 22 26" stroke-width="1.300"/><path d="M48 23A22 22 0 0 1 57 46" stroke-width="1.300"/><path d="M36 21V26M36 58V63M15 42H20M52 42H57" stroke-width=".9" opacity=".8"/></g>
<circle cx="22" cy="26" r="1.800" fill="#e9c877"/><circle cx="57" cy="46" r="1.500" fill="#e9c877"/>
<g fill="#fff"><circle cx="24" cy="50" r=".7"/><circle cx="49" cy="31" r=".8"/><circle cx="47" cy="55" r=".6"/><circle cx="27" cy="33" r=".5"/></g>
<path d="M36 24L47 41 36 61 25 41z" fill="url(#mdC)" stroke="#eafcff" stroke-width=".6" stroke-linejoin="round"/>
<path d="M36 24L47 41H36z" fill="#fff" opacity=".65"/><path d="M25 41H36V61z" fill="#1a4ab0" opacity=".3"/><path d="M36 41H47L36 61z" fill="#1a4ab0" opacity=".14"/><path d="M36 24L31.500 41 36 61" fill="none" stroke="#fff" stroke-width=".5" opacity=".6"/>
</svg>`.replace(/(\d)\.(\d)00\b/g, '$1.$2');
}

// ---------- Îles flottantes (roche à facettes) ----------
const R = { top: '#7482d2', top2: '#5560b4', f1: '#3d4796', f2: '#2c3478', f3: '#1f255e', f4: '#141842', rim: '#a8e6ff' };
const poly = (pts, f, o = 1) => `<path d="M${pts}z" fill="${f}"${o < 1 ? ` opacity="${o}"` : ''}/>`;
export function isleSVG(kind = 'a') {
  if (kind === 'b') return `<svg viewBox="0 0 110 140" xmlns="http://www.w3.org/2000/svg">
${poly('62 46V12L70 3 78 12V46', R.f1)}${poly('62 46V12L70 3V46', R.top2)}${poly('78 46V24L86 20 90 26V48', R.f2)}${poly('78 46V24L86 20V47', R.f1)}
${poly('46 46V30L52 26 56 31V46', R.f2)}${poly('14 50V38L21 34 26 40V50', R.f1)}${poly('14 50V38L21 34V50', R.top2)}${poly('28 50V43L33 41 36 44V50', R.f2)}
${poly('4 54L30 44H82L106 56 76 68H26', R.top)}${poly('4 54L30 44H60L44 68H26', R.top2, .55)}
${poly('4 54L26 68 20 88 8 70', R.f2)}${poly('26 68H52L46 104 20 88', R.f1)}${poly('52 68H76L72 96 46 104', R.f2)}${poly('76 68L106 56 96 80 72 96', R.f3)}
${poly('20 88L46 104 44 122 30 102', R.f3)}${poly('46 104L72 96 62 120 52 136 44 122', R.f4)}${poly('72 96L96 80 84 104 62 120', R.f4)}
<path d="M4 54L30 44H82L106 56" fill="none" stroke="${R.rim}" stroke-width="1.200" opacity=".7" stroke-linejoin="round"/><path d="M62 46V12L70 3 78 12" fill="none" stroke="${R.rim}" stroke-width="1" opacity=".6"/>
<path d="M4 54L8 70 20 88 30 102 44 122 52 136" fill="none" stroke="${R.rim}" stroke-width=".9" opacity=".35"/></svg>`.replace(/(\d)\.(\d)00\b/g, '$1.$2');
  if (kind === 'c') return `<svg viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">${poly('3 10L16 4 36 9 26 16H10', R.top)}${poly('3 10L10 16 8 28', R.f2)}${poly('10 16H26L20 40 8 28', R.f1)}${poly('26 16L36 9 30 28 20 40', R.f3)}${poly('8 28L20 40 18 48', R.f4)}<path d="M3 10L16 4 36 9" fill="none" stroke="${R.rim}" stroke-width="1" opacity=".6"/></svg>`;
  return `<svg viewBox="0 0 120 96" xmlns="http://www.w3.org/2000/svg">
${poly('22 22V14L28 11 32 15V22', R.f1)}${poly('84 24V17L89 15 92 18V25', R.f2)}
${poly('4 26L34 16 86 18 116 28 88 38H30', R.top)}${poly('4 26L34 16 62 17 50 38H30', R.top2, .55)}
${poly('4 26L30 38 24 58 10 42', R.f2)}${poly('30 38H60L54 74 24 58', R.f1)}${poly('60 38H88L80 64 54 74', R.f2)}${poly('88 38L116 28 104 48 80 64', R.f3)}
${poly('24 58L54 74 50 92 36 72', R.f3)}${poly('54 74L80 64 66 84 50 92', R.f4)}
<path d="M4 26L34 16 86 18 116 28" fill="none" stroke="${R.rim}" stroke-width="1.200" opacity=".7" stroke-linejoin="round"/><path d="M4 26L10 42 24 58 36 72 50 92" fill="none" stroke="${R.rim}" stroke-width=".9" opacity=".35"/></svg>`.replace(/(\d)\.(\d)00\b/g, '$1.$2');
}

// petite étoile à 4 branches (décor)
export function sparkSVG() { return `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">${spark(10, 10, 9)}</svg>`; }
