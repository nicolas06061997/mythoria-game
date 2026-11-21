// MYTHORIA — icônes des objets (SVG nets) : itemIcon(id). Forme selon le type d'objet, couleur d'accent selon la
// famille du héros, halo et métal selon la rareté (légendaire = or).
import { itemById } from '../../shared/items.js';
import { HERO, RARITIES } from '../../shared/content.js';

const S = 'stroke="#1c1428" stroke-width="2" stroke-linejoin="round"';
const P = {
  blade: `<path d="M44 6h14v14L30 48 16 34z" fill="url(#M)" ${S}/><path d="M50 10L26 34" stroke="#fff" stroke-width="2" opacity=".55"/><path d="M12 36l16 16" stroke="url(#O)" stroke-width="6" stroke-linecap="round"/><path d="M16 46l-8 8" stroke="#5a3418" stroke-width="6" stroke-linecap="round"/><circle cx="22" cy="42" r="4" fill="A" ${S}/>`,
  axe: `<path d="M18 56L46 14" stroke="#6a3a18" stroke-width="6" stroke-linecap="round"/><path d="M38 8q18 0 20 18-10-2-16 2-4-10-10-12z" fill="url(#M)" ${S}/><path d="M42 12q10 2 12 12" stroke="#fff" stroke-width="2" fill="none" opacity=".6"/><circle cx="20" cy="53" r="4" fill="A" ${S}/>`,
  gauntlet: `<path d="M18 30V16q0-4 4-4t4 4v10V12q0-4 4-4t4 4v14V14q0-4 4-4t4 4v14q4-2 6 2l-6 14q-3 8-12 8h-4q-12 0-12-12z" fill="url(#M)" ${S}/><rect x="16" y="46" width="24" height="8" rx="3" fill="A" ${S}/>`,
  bow: `<path d="M18 6q30 26 0 52" fill="none" stroke="url(#O)" stroke-width="6" stroke-linecap="round"/><path d="M18 6v52" stroke="#e8e4d8" stroke-width="1.5"/><path d="M14 32h40" stroke="#6a3a18" stroke-width="3"/><path d="M54 32l-8-5v10z" fill="url(#M)" ${S}/><path d="M16 32l-6-4m6 4l-6 4" stroke="A" stroke-width="3"/>`,
  quiver: `<path d="M20 18h24l-4 40H24z" fill="#8a5428" ${S}/><path d="M20 26h24" stroke="url(#O)" stroke-width="4"/><path d="M26 18L22 4M32 18V2M38 18l4-14" stroke="#e8e4d8" stroke-width="2"/><path d="M22 4l-3 4h6zM32 2l-3 4h6zM42 4l-3 4h6z" fill="A"/>`,
  staff: `<path d="M20 58L42 16" stroke="#6a3a18" stroke-width="5" stroke-linecap="round"/><path d="M42 16q-6-8 2-12 8 4 6 12-4 4-8 0z" fill="url(#O)" ${S}/><circle cx="46" cy="10" r="6" fill="A" ${S}/><circle cx="44" cy="8" r="2" fill="#fff"/>`,
  book: `<path d="M10 14q12-4 22 2 10-6 22-2v38q-12-4-22 2-10-6-22-2z" fill="#4a2a6a" ${S}/><path d="M32 16v38" stroke="url(#O)" stroke-width="3"/><path d="M14 18q9-2 15 2v30q-6-4-15-2z" fill="#f4ead0"/><path d="M35 20q6-4 15-2v30q-9-2-15 2z" fill="#f4ead0"/><circle cx="42" cy="32" r="5" fill="A"/><path d="M18 26h8M18 32h8M18 38h7" stroke="#8a7a5a" stroke-width="1.5"/>`,
  orb: `<path d="M20 52h24l-4 8H24z" fill="url(#O)" ${S}/><circle cx="32" cy="30" r="20" fill="A" ${S}/><circle cx="32" cy="30" r="20" fill="url(#G)" opacity=".55"/><circle cx="25" cy="22" r="6" fill="#fff" opacity=".7"/>`,
  claw: `<path d="M16 54q-2-26 18-44-6 22 2 34zM28 56q2-24 22-38-8 20-4 32zM40 58q8-18 20-24-8 16-8 26z" fill="url(#M)" ${S}/><path d="M18 50q2-18 12-30" stroke="#fff" stroke-width="1.5" fill="none" opacity=".6"/><circle cx="34" cy="56" r="4" fill="A"/>`,
  fang: `<path d="M22 8Q40 6 44 22L36 56Q33 60 30 56L20 24Q18 14 22 8z" fill="url(#M)" ${S}/><path d="M26 14Q36 13 38 22L33 46" fill="none" stroke="#fff" stroke-width="2" opacity=".6"/><circle cx="31" cy="20" r="4" fill="A"/>`,
  horn: `<path d="M14 56Q10 22 44 6q-14 18-8 36 2 10-6 16z" fill="url(#M)" ${S}/><path d="M18 50q0-12 8-20M22 40q4-8 12-14" stroke="A" stroke-width="3" fill="none"/>`,
  gem: `<path d="M32 4l20 18-20 38-20-38z" fill="A" ${S}/><path d="M32 4l20 18H12zM12 22l20 38 8-38z" fill="#fff" opacity=".3"/><path d="M22 22l10-18 10 18" fill="none" stroke="#fff" stroke-width="1.5" opacity=".7"/>`,
  rune: `<path d="M14 8h36l6 24-6 24H14L8 32z" fill="#5a5878" ${S}/><path d="M32 16v32M22 24l10 8 10-8M24 44l8-8 8 8" stroke="A" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  ember: `<path d="M32 6q14 14 12 28 10-4 8-14 8 12 4 24-6 14-24 14T10 44q-2-12 8-20 0 8 6 10-4-14 8-28z" fill="A" ${S}/><path d="M32 28q8 8 6 16-2 8-8 8t-8-8q0-6 6-8-1 5 2 6 2-8 2-14z" fill="#ffe08a"/>`,
  collar: `<circle cx="32" cy="30" r="18" fill="none" stroke="#6a3a18" stroke-width="7"/><circle cx="32" cy="30" r="18" fill="none" stroke="url(#O)" stroke-width="2"/><path d="M26 46h12l-6 12z" fill="A" ${S}/>`,
  scale: `<path d="M32 6l20 10v18q0 16-20 24Q12 50 12 34V16z" fill="A" ${S}/><path d="M20 20q12 6 24 0M18 30q14 7 28 0M20 40q12 6 24 0" stroke="#fff" stroke-width="2" fill="none" opacity=".45"/><path d="M32 6l20 10v18q0 16-20 24" fill="none" stroke="url(#O)" stroke-width="3"/>`,
  feather: `<path d="M46 6Q20 14 14 44l-4 12 6-6Q44 44 46 6z" fill="A" ${S}/><path d="M42 12Q26 26 16 50" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/><path d="M36 18l-10 2M32 26l-10 2M28 34l-8 2" stroke="#fff" stroke-width="1.5" opacity=".5"/>`,
  totem: `<rect x="20" y="8" width="24" height="48" rx="4" fill="#7a5030" ${S}/><path d="M20 24h24M20 40h24" stroke="#4a2a10" stroke-width="2"/><circle cx="27" cy="16" r="3" fill="A"/><circle cx="37" cy="16" r="3" fill="A"/><path d="M26 32h12M28 48h8" stroke="A" stroke-width="3"/><path d="M14 20l6 4M50 20l-6 4" stroke="url(#O)" stroke-width="4"/>`,
  heart: `<path d="M32 56Q6 38 10 20q4-12 16-10 4 1 6 6 2-5 6-6 12-2 16 10 4 18-22 36z" fill="A" ${S}/><path d="M18 18q4-4 8 0" stroke="#fff" stroke-width="3" fill="none" opacity=".6"/>`,
  amulet: `<path d="M14 6q18 18 36 0" fill="none" stroke="url(#O)" stroke-width="3"/><circle cx="32" cy="36" r="16" fill="url(#O)" ${S}/><circle cx="32" cy="36" r="10" fill="A" ${S}/><circle cx="28" cy="32" r="3" fill="#fff" opacity=".7"/>`,
  ring: `<circle cx="32" cy="36" r="17" fill="none" stroke="url(#O)" stroke-width="8"/><circle cx="32" cy="36" r="17" fill="none" stroke="#1c1428" stroke-width="1.2" opacity=".5"/><path d="M24 16l8-10 8 10-8 8z" fill="A" ${S}/>`,
  boots: `<path d="M14 8h16v28l18 8q6 4 4 12H14z" fill="#7a4a28" ${S}/><path d="M14 46h38" stroke="url(#O)" stroke-width="4"/><path d="M14 16h16" stroke="A" stroke-width="4"/><path d="M48 20l8-6M44 14l6-8" stroke="A" stroke-width="2.5" stroke-linecap="round"/>`,
  cape: `<path d="M20 8h24l10 48q-22 6-44 0z" fill="A" ${S}/><path d="M22 8q10 8 20 0" fill="none" stroke="url(#O)" stroke-width="4"/><path d="M30 18l-4 34M38 18l4 34" stroke="#000" stroke-width="1.5" opacity=".2"/><circle cx="32" cy="12" r="4" fill="url(#O)" ${S}/>`,
  crown: `<path d="M8 50l4-30 12 12 8-20 8 20 12-12 4 30z" fill="url(#O)" ${S}/><path d="M10 50h44v6H10z" fill="url(#O)" ${S}/><circle cx="32" cy="40" r="5" fill="A" ${S}/><circle cx="18" cy="42" r="3" fill="A"/><circle cx="46" cy="42" r="3" fill="A"/>`,
};
const FACC = { aube: '#ffd166', sylve: '#5fd38d', arcane: '#b48cff', braise: '#ff7a3d', givre: '#8fe8ff', ombre: '#c070ff', neutre: '#e8c27a' };
let N = 0;
export function itemIcon(id) {
  const it = itemById(id); if (!it) return '';
  const k = 'ig' + (++N), rc = RARITIES[it.rar].color, acc = FACC[HERO[it.hero].fac] || '#ffd166';
  const gold = it.rar === 'legendaire' || it.rar === 'epique';
  const M = gold ? ['#fff6d0', '#f2c95a', '#9a6214'] : ['#ffffff', '#cfd6ea', '#6a7090'];
  return `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><defs>
<linearGradient id="${k}m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${M[0]}"/><stop offset=".45" stop-color="${M[1]}"/><stop offset="1" stop-color="${M[2]}"/></linearGradient>
<linearGradient id="${k}o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#e2ae42"/><stop offset="1" stop-color="#8a5a10"/></linearGradient>
<radialGradient id="${k}g" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<radialGradient id="${k}b" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="${rc}" stop-opacity=".6"/><stop offset="1" stop-color="${rc}" stop-opacity="0"/></radialGradient></defs>
<circle cx="32" cy="32" r="30" fill="url(#${k}b)"/>${(P[it.ic] || P.gem).replace(/url\(#M\)/g, `url(#${k}m)`).replace(/url\(#O\)/g, `url(#${k}o)`).replace(/url\(#G\)/g, `url(#${k}g)`).replace(/"A"/g, `"${acc}"`)}</svg>`;
}
