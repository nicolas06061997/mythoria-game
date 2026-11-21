// MYTHORIA — illustrations vectorielles de l'interface « fantastique cosmique » (15/11).
// Tout est dessiné en SVG : net à n'importe quelle taille d'écran, aucun fichier image.
// eclatSVG(couleur, lueur) · relicSVG() · battleSVG() · medalSVG() · isleSVG('a'|'b'|'c') · sparkSVG()

const OUT = '#070b2c';

const spark = (x, y, r, o = 1) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}z" fill="#fff" opacity="${o}"/>`;
// teinte plus claire (k > 0) ou plus sombre (k < 0)
function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), t = k < 0 ? 0 : 255, a = Math.abs(k);
  const c = [n >> 16, n >> 8 & 255, n & 255].map(v => Math.round(v + (t - v) * a));
  return '#' + ((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1);
}

// ---------- Éclats de Faille (remplacent les coffres, 19/11) : grand cristal à facettes fendu d'une faille lumineuse ----------
let EC_N = 0;
export function eclatSVG(color, glow) {
  const k = 'ec' + (EC_N++), l = shade(color, 0.5), d = shade(color, -0.5), dd = shade(color, -0.78);
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="${k}h" cx=".5" cy=".55" r=".5"><stop offset="0" stop-color="${glow}" stop-opacity=".8"/><stop offset=".5" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>
<linearGradient id="${k}a" x1="0" y1="0" x2=".7" y2="1"><stop offset="0" stop-color="${l}"/><stop offset=".45" stop-color="${color}"/><stop offset="1" stop-color="${d}"/></linearGradient>
<linearGradient id="${k}b" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}"/><stop offset="1" stop-color="${dd}"/></linearGradient>
<linearGradient id="${k}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="${glow}"/><stop offset="1" stop-color="#fff" stop-opacity=".2"/></linearGradient></defs>
<ellipse cx="50" cy="56" rx="47" ry="45" fill="url(#${k}h)"/>
<ellipse cx="51" cy="90" rx="27" ry="5.5" fill="#000" opacity=".35"/>
<path d="M21 89L16 63L27 49L36 66L33 89z" fill="url(#${k}b)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M27 49L36 66L24 69z" fill="${l}" opacity=".6"/>
<path d="M68 89L71 59L82 48L86 71L80 89z" fill="url(#${k}b)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/><path d="M82 48L86 71L74 66z" fill="${l}" opacity=".5"/>
<path d="M50 5L67 33L63 89L37 89L33 35z" fill="url(#${k}a)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M50 5L67 33L63 89L51 89L52 40z" fill="${dd}" opacity=".38"/><path d="M50 5L67 33L52 40L33 35z" fill="${l}" opacity=".55"/><path d="M33 35L52 40L51 89L37 89z" fill="#fff" opacity=".08"/>
<path d="M49 21L54 37L46 51L55 65L49 82" fill="none" stroke="${glow}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>
<path d="M49 21L54 37L46 51L55 65L49 82" fill="none" stroke="url(#${k}r)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
${spark(72, 20, 5.5)}${spark(25, 33, 3.6, .85)}${spark(84, 40, 2.6, .7)}</svg>`;
}

// ---------- Relique de conquête (médaillon de la jauge) ----------
export function relicSVG() {
  const runes = Array.from({ length: 12 }, (_, i) => { const a = i / 12 * Math.PI * 2, x = 50 + Math.cos(a) * 37, y = 50 + Math.sin(a) * 37; return `<path d="M${(x - 2).toFixed(1)} ${(y - 2.6).toFixed(1)}l2 2.6l2-2.6M${x.toFixed(1)} ${y.toFixed(1)}v2.8" stroke="#ffe7a6" stroke-width="1.2" fill="none" stroke-linecap="round" opacity=".85"/>`; }).join('');
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs>
<radialGradient id="rlB" cx=".5" cy=".38" r=".7"><stop offset="0" stop-color="#3a5fe0"/><stop offset=".6" stop-color="#16217a"/><stop offset="1" stop-color="#080c3a"/></radialGradient>
<linearGradient id="rlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6cc"/><stop offset=".45" stop-color="#f3c552"/><stop offset="1" stop-color="#9c6510"/></linearGradient>
<linearGradient id="rlC" x1="0" y1="0" x2=".6" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#9ff0ff"/><stop offset="1" stop-color="#2a7ee0"/></linearGradient></defs>
<circle cx="50" cy="50" r="44" fill="url(#rlB)" stroke="url(#rlG)" stroke-width="5"/>
<circle cx="50" cy="50" r="31" fill="none" stroke="#f3c552" stroke-width="1" opacity=".55"/>${runes}
<path d="M50 20L61 40L57 78L43 78L39 41z" fill="url(#rlC)" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
<path d="M50 20L61 40L57 78L50 78L51 44z" fill="#0b2a7a" opacity=".35"/><path d="M50 20L61 40L51 44L39 41z" fill="#fff" opacity=".5"/>
<path d="M49.5 32L52.5 44L47.5 54L52.5 66" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
${spark(70, 26, 4.5)}${spark(30, 66, 3, .8)}</svg>`;
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
