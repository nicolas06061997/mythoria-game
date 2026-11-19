// MYTHORIA — icônes des objets d'équipement (SVG, nettes partout) : itemIcon(id) / slotIcon(slot).
import { ITEMS } from '../../shared/items.js';
import { RARITIES } from '../../shared/content.js';

const P = { // dessins 64×64 ; G = dégradé métal/or, A = couleur d'accent de l'objet
  fang: '<path d="M22 10Q40 8 44 22L36 56Q33 60 30 56L20 24Q18 14 22 10z" fill="url(#G)" stroke="#2a2030" stroke-width="2"/><path d="M26 16Q36 15 38 23L33 46" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><circle cx="31" cy="20" r="4" fill="A"/>',
  ring: '<circle cx="32" cy="34" r="17" fill="none" stroke="url(#G)" stroke-width="8"/><circle cx="32" cy="34" r="17" fill="none" stroke="#2a2030" stroke-width="1.5" opacity=".5"/><path d="M24 14l8-8 8 8-8 8z" fill="A" stroke="#2a2030" stroke-width="2"/><path d="M28 13l4-4 3 3" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7"/>',
  blade: '<path d="M44 8l12 0 0 12-26 26-12-12z" fill="url(#G)" stroke="#2a2030" stroke-width="2"/><path d="M46 12L26 32" stroke="#fff" stroke-width="2" opacity=".6"/><path d="M14 38l12 12M18 42l-8 8" stroke="#6a3a1a" stroke-width="6" stroke-linecap="round"/><path d="M12 36l16 16" stroke="#e8b24a" stroke-width="4" stroke-linecap="round"/><circle cx="36" cy="22" r="3" fill="A"/><circle cx="42" cy="16" r="2.5" fill="A"/>',
  gauntlet: '<path d="M18 30V16q0-4 4-4t4 4v10V12q0-4 4-4t4 4v14V14q0-4 4-4t4 4v14q4-2 6 2l-6 14q-3 8-12 8h-4q-12 0-12-12z" fill="url(#G)" stroke="#2a2030" stroke-width="2"/><rect x="16" y="46" width="24" height="8" rx="3" fill="A" stroke="#2a2030" stroke-width="2"/>',
  ember: '<path d="M32 6q14 14 12 28 10-4 8-14 8 12 4 24-6 14-24 14T10 44q-2-12 8-20 0 8 6 10-4-14 8-28z" fill="A" stroke="#4a1a08" stroke-width="2"/><path d="M32 28q8 8 6 16-2 8-8 8t-8-8q0-6 6-8-1 5 2 6 2-8 2-14z" fill="#ffe08a"/>',
  bolt: '<path d="M38 4L16 36h14l-6 24 24-34H34z" fill="A" stroke="#1a2a5a" stroke-width="2" stroke-linejoin="round"/><path d="M36 10L22 32" stroke="#fff" stroke-width="2" opacity=".7"/><circle cx="14" cy="14" r="3" fill="#fff" opacity=".8"/><circle cx="52" cy="48" r="2.5" fill="#fff" opacity=".8"/>',
  pouch: '<path d="M32 10q-4 6 0 10M24 22h16l6 28q0 8-14 8T18 50z" fill="#a8743a" stroke="#3a2008" stroke-width="2"/><path d="M22 24h20" stroke="#6a3a10" stroke-width="3"/><circle cx="32" cy="38" r="6" fill="A" stroke="#3a2008" stroke-width="2"/><path d="M32 4v6" stroke="url(#G)" stroke-width="3"/>',
  feather: '<path d="M46 6Q20 14 14 44l-4 12 6-6Q44 44 46 6z" fill="A" stroke="#1a3a4a" stroke-width="2"/><path d="M42 12Q26 26 16 50" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/><path d="M36 18l-10 2M32 26l-10 2M28 34l-8 2" stroke="#fff" stroke-width="1.5" opacity=".5"/>',
  scale: '<path d="M32 6l20 10v18q0 16-20 24Q12 50 12 34V16z" fill="A" stroke="#1a3a2a" stroke-width="2"/><path d="M20 20q12 6 24 0M18 30q14 7 28 0M20 40q12 6 24 0" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/><path d="M32 6l20 10v18q0 16-20 24" fill="none" stroke="url(#G)" stroke-width="3"/>',
  hourglass: '<path d="M16 8h32M16 56h32" stroke="url(#G)" stroke-width="5" stroke-linecap="round"/><path d="M20 10q0 16 12 22-12 6-12 22h24q0-16-12-22 12-6 12-22z" fill="#e8f6ff" fill-opacity=".35" stroke="#2a3a5a" stroke-width="2"/><path d="M24 14q8 10 8 16 0-6 8-16zM22 52q2-10 10-14 8 4 10 14z" fill="A"/>',
  aegis: '<path d="M32 4l22 8q0 30-22 46Q10 42 10 12z" fill="url(#G)" stroke="#3a2404" stroke-width="2"/><path d="M32 12l14 5q0 22-14 32-14-10-14-32z" fill="#2a4aa8"/><circle cx="32" cy="28" r="7" fill="A"/><path d="M32 16v24M22 28h20" stroke="#fff3c0" stroke-width="2" opacity=".7"/>',
  leaf: '<path d="M14 50Q12 18 50 10q4 34-28 42z" fill="A" stroke="#1a4a1a" stroke-width="2"/><path d="M14 50Q28 34 46 16" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/><circle cx="20" cy="22" r="6" fill="#7ff3c0" stroke="#1a4a2a" stroke-width="2"/><path d="M18 20l2-2" stroke="#fff" stroke-width="2"/>',
};
const ACC = { fang: '#ff6a5a', ring: '#7ff3ff', blade: '#9fe8ff', gauntlet: '#b48cff', ember: '#ff8a2a', bolt: '#9ff3ff', pouch: '#ffd166', feather: '#bfefff', scale: '#5fd38d', hourglass: '#b48cff', aegis: '#ffd166', leaf: '#5fd38d' };
let N = 0;
export function itemIcon(id) {
  const it = ITEMS[id]; if (!it) return '';
  const k = 'ig' + (++N), rc = RARITIES[it.rar].color;
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#d8dceb"/><stop offset="1" stop-color="#7a809a"/></linearGradient>
<radialGradient id="${k}b" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${rc}" stop-opacity=".55"/><stop offset="1" stop-color="${rc}" stop-opacity="0"/></radialGradient></defs>
<circle cx="32" cy="32" r="30" fill="url(#${k}b)"/>${P[it.ic].replace(/url\(#G\)/g, `url(#${k})`).replace(/"A"/g, `"${ACC[it.ic]}"`)}</svg>`;
}
export function slotIcon(slot) {
  return slot === 'arme'
    ? '<svg viewBox="0 0 64 64"><path d="M44 10h10v10L28 46l-10-10z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><path d="M14 40l10 10M12 52l6-6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>'
    : '<svg viewBox="0 0 64 64"><path d="M32 8l18 8v14q0 16-18 24-18-8-18-24V16z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="32" cy="30" r="6" fill="none" stroke="currentColor" stroke-width="3"/></svg>';
}
