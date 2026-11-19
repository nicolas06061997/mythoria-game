// MYTHORIA — icônes vectorielles maison (SVG). icon('nom') renvoie un élément prêt à insérer.
const P = {
  close: '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="3" stroke-linecap="round" fill="none"/>',
  ether: '<path d="M12 2l6 8-6 12-6-12z" fill="url(#gE)" stroke="#2a0a50" stroke-width="1.2"/><path d="M12 2l2 8-2 12" fill="rgba(255,255,255,.35)"/>',
  summon: '<circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4.5l1.8 5.2 5.4.3-4.3 3.3 1.5 5.3L12 15.6l-4.4 3 1.5-5.3-4.3-3.3 5.4-.3z" fill="currentColor"/>',
  meteor: '<circle cx="14" cy="14" r="6" fill="#ff8a3d" stroke="#5a1a08" stroke-width="1.2"/><path d="M3 3l7 7M6 2l5 6M2 6l6 5" stroke="#ffd27a" stroke-width="2" stroke-linecap="round"/>',
  frost: '<path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7" stroke="#bff0ff" stroke-width="2.2" stroke-linecap="round"/><path d="M9 4l3 2 3-2M9 20l3-2 3 2" stroke="#bff0ff" stroke-width="1.8" fill="none" stroke-linecap="round"/>',
  sun: '<circle cx="12" cy="12" r="5" fill="#ffd166" stroke="#8a5a0a" stroke-width="1.2"/><g stroke="#ffd166" stroke-width="2" stroke-linecap="round"><path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"/></g>',
  lava: '<path d="M2 21c2-5 4-8 6-8 1.5 0 2 2 4 2s2.5-4 4-4c2 0 4 4 6 10z" fill="#ff5a1a" stroke="#5a1a08" stroke-width="1.1" stroke-linejoin="round"/><path d="M12 3c1.5 2.5 3 4 2 6.5-.6 1.5-2.4 1.5-3 0-.7-1.7.4-3.5 1-6.5z" fill="#ffd27a"/><circle cx="7" cy="7" r="1.4" fill="#ffb02e"/><circle cx="18" cy="6" r="1.1" fill="#ffb02e"/>',
  roots: '<path d="M12 2v9M12 11c-3 1-5 4-8 5M12 11c3 1 5 4 8 5M12 11v10M8 14c-1 3-1 5-3 7M16 14c1 3 1 5 3 7" stroke="#7fe08a" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M12 2c2 1 3 3 2 5-2 0-3-2-2-5z" fill="#d8ffb0"/>',
  curse: '<circle cx="12" cy="11" r="7.5" fill="#6a1aa0" stroke="#2a0a40" stroke-width="1.2"/><circle cx="9.2" cy="10.5" r="1.8" fill="#e0c0ff"/><circle cx="14.8" cy="10.5" r="1.8" fill="#e0c0ff"/><path d="M8.5 15.5h7M10 15.5v2.5M12 15.5v2.5M14 15.5v2.5" stroke="#e0c0ff" stroke-width="1.3"/><path d="M4 4l2.5 2.5M20 4l-2.5 2.5" stroke="#c08aff" stroke-width="1.6" stroke-linecap="round"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#bff8ff" stroke="#1a4a7a" stroke-width="1.2" stroke-linejoin="round"/>',
  swords: '<g stroke="#2a1a08" stroke-width="1.1" stroke-linejoin="round"><path d="M4 3l3 0 10 10-2 2L5 6z" fill="#e8eef8"/><path d="M20 3l-3 0L7 13l2 2L19 6z" fill="#d4dcea"/><path d="M5.5 15.5l3 3M15.5 18.5l3-3" stroke="#c8892a" stroke-width="2.6" stroke-linecap="round"/><circle cx="5" cy="19" r="1.6" fill="#ffd166"/><circle cx="19" cy="19" r="1.6" fill="#ffd166"/></g>',
  sword: '<path d="M14.5 3H21v6.5L10 20.5 3.5 14z" fill="url(#gS)" stroke="#2a2440" stroke-width="1.2"/><path d="M3 21l3.5-3.5M5 13l6 6" stroke="#ffd166" stroke-width="2.4" stroke-linecap="round"/>',
  heroes: '<circle cx="12" cy="7.5" r="4" fill="currentColor"/><path d="M4 21c0-4.5 3.6-7.5 8-7.5s8 3 8 7.5z" fill="currentColor"/><path d="M15.5 3.5l3-1.5-.5 3.5" fill="#ffd166"/>',
  shop: '<path d="M3 9h18v11H3z" fill="#b8763a" stroke="#4a2a10" stroke-width="1.2"/><path d="M2 5h20v4H2z" fill="#d89a52" stroke="#4a2a10" stroke-width="1.2"/><rect x="10" y="9" width="4" height="5" rx="1" fill="#ffd166" stroke="#4a2a10"/>',
  castle: '<path d="M3 21V9h3v2h2V9h3v2h2V9h3v2h2V9h3v12z" fill="#cfc6d8" stroke="#3a3050" stroke-width="1.2"/><path d="M10 21v-5a2 2 0 014 0v5" fill="#3a3050"/><path d="M12 3v5M12 3l4 1.5L12 6" stroke="#ff4f7b" stroke-width="1.6" fill="#ff4f7b"/>',
  clan: '<path d="M5 3h14v12l-7 6-7-6z" fill="currentColor"/><path d="M12 7l1.5 3 3 .4-2.2 2 .6 3-2.9-1.5-2.9 1.5.6-3-2.2-2 3-.4z" fill="#ffd166"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" fill="#e8d8b0" stroke="#5a4020" stroke-width="1.2"/><path d="M9 4v14M15 6v14" stroke="#5a4020" stroke-width="1"/><circle cx="17" cy="10" r="1.8" fill="#ff4f5e"/>',
  trophy: '<path d="M7 3h10v5a5 5 0 01-10 0z" fill="url(#gG)" stroke="#6a3a00" stroke-width="1.2"/><path d="M7 5H4a3 3 0 003 4M17 5h3a3 3 0 01-3 4" fill="none" stroke="#c98a12" stroke-width="1.8"/><path d="M10 13h4l1 4H9z" fill="#c98a12"/><rect x="7" y="17" width="10" height="3" rx="1" fill="#8a5a1a"/>',
  coin: '<circle cx="12" cy="12" r="9" fill="url(#gG)" stroke="#8a4a08" stroke-width="1.4"/><circle cx="12" cy="12" r="5.5" fill="none" stroke="#c98a12" stroke-width="1.4"/><path d="M12 8.5v7" stroke="#8a4a08" stroke-width="1.6"/>',
  gem: '<path d="M6 3h12l4 6-10 12L2 9z" fill="url(#gD)" stroke="#0a3a5a" stroke-width="1.2"/><path d="M2 9h20M8 3l4 18 4-18" stroke="rgba(255,255,255,.5)" stroke-width="1" fill="none"/>',
  gear: '<path d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2l1.6 2.6 3-.6.6 3 2.6 1.6-1.4 2.7 1.4 2.7-2.6 1.6-.6 3-3-.6L12 22l-1.6-2.6-3 .6-.6-3-2.6-1.6 1.4-2.7-1.4-2.7 2.6-1.6.6-3 3 .6z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2" fill="currentColor"/><path d="M8 10V7a4 4 0 018 0v3" fill="none" stroke="currentColor" stroke-width="2.4"/>',
  star: '<path d="M12 2l2.9 6.4 7 .7-5.2 4.7 1.5 6.9L12 17.3l-6.2 3.4 1.5-6.9L2 9.1l7-.7z" fill="#ffd166" stroke="#8a5a0a" stroke-width="1"/>',
  heart: '<path d="M12 21C5 15 2 11.5 2 8a5 5 0 0110-1 5 5 0 0110 1c0 3.5-3 7-10 13z" fill="currentColor"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>',
  book: '<path d="M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z" fill="currentColor" opacity=".9"/>',
  crystal: '<path d="M12 1l5 7-5 15-5-15z" fill="url(#gE)" stroke="#2a0a50" stroke-width="1"/><path d="M4 9l3 2-2 7-2-6zM20 9l-3 2 2 7 2-6z" fill="#b48cff" stroke="#2a0a50" stroke-width=".8"/>',
  shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor"/><path d="M16 8a5 5 0 010 8M18.5 5.5a8.5 8.5 0 010 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>',
  share: '<circle cx="18" cy="5" r="3" fill="currentColor"/><circle cx="6" cy="12" r="3" fill="currentColor"/><circle cx="18" cy="19" r="3" fill="currentColor"/><path d="M8.6 10.6l6.8-4M8.6 13.4l6.8 4" stroke="currentColor" stroke-width="2"/>',
  // icônes plates et lumineuses de la barre du bas (une seule couleur : currentColor)
  n_star: '<path d="M12 1.5c.9 5.6 3 7.7 9 9.5-6 1.8-8.1 3.9-9 9.5-.9-5.6-3-7.7-9-9.5 6-1.8 8.1-3.9 9-9.5z" fill="currentColor"/><circle cx="19" cy="4.5" r="1.2" fill="currentColor" opacity=".7"/><circle cx="5" cy="19" r="1" fill="currentColor" opacity=".6"/>',
  n_gem: '<path d="M12 2l7 9-7 11-7-11z" fill="currentColor" opacity=".45"/><path d="M12 2l7 9-7 11-7-11z M5 11h14 M12 2l-3 9 3 11 3-11z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>',
  n_hero: '<path d="M12 2.5c-4.4 0-7.5 3.3-7.5 7.8V19l4.5 2.5v-7l-2-1.5v-2.5h10V13l-2 1.5v7l4.5-2.5v-8.7c0-4.5-3.1-7.8-7.5-7.8z" fill="currentColor"/><path d="M12 1v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  n_crown: '<path d="M3 8l4.5 4L12 4l4.5 8L21 8l-1.8 10H4.8z" fill="currentColor"/><path d="M5 20.5h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="3" r="1.3" fill="currentColor"/><circle cx="2.8" cy="7" r="1.2" fill="currentColor"/><circle cx="21.2" cy="7" r="1.2" fill="currentColor"/>',
  n_shield: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="currentColor" opacity=".4"/><path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 7l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z" fill="currentColor"/>',
  install: '<path d="M12 3v12M7 10l5 5 5-5" stroke="currentColor" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M4 17v3h16v-3" stroke="currentColor" stroke-width="2.4" fill="none"/>',
};
const DEFS = '<defs><linearGradient id="gE" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4d0ff"/><stop offset="1" stop-color="#8a2fe0"/></linearGradient>' +
  '<linearGradient id="gG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset=".55" stop-color="#ffc23d"/><stop offset="1" stop-color="#d8861a"/></linearGradient>' +
  '<linearGradient id="gD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8fbff"/><stop offset="1" stop-color="#2aa0e0"/></linearGradient>' +
  '<linearGradient id="gS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa6bc"/></linearGradient></defs>';

let defsDone = false;
export function icon(name, cls = '') {
  if (!defsDone && typeof document !== 'undefined') {
    defsDone = true;
    const d = document.createElement('div');
    d.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
    d.innerHTML = '<svg width="0" height="0">' + DEFS + '</svg>';
    document.body.append(d);
  }
  const s = document.createElement('span');
  s.className = 'ic ' + cls;
  s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (P[name] || P.star) + '</svg>';
  return s;
}
