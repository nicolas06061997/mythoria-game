// MYTHORIA — 10 créatures construites par le code (19/11) : phénix, yéti, griffon, élémentaire d'orage, champignon géant,
// araignée des ombres, tortue de cristal, salamandre, hibou arcanique, spectre. Formes lisses (beaucoup de segments,
// ombrage doux), yeux lumineux, animations propres (vol, marche, attaque, mort). Même interface que procedural.js (ProcActor).
import * as THREE from 'three';
import { ProcActor, glowSprite } from './procedural.js';

const S = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
const G = (color, k = 1.6, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, roughness: 0.35, ...o });
const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.85, ...o });
const add = (p, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; p.add(m); return m; };
const grp = (p, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); p.add(g); return g; };
const sph = (r, w = 24, h = 18) => new THREE.SphereGeometry(r, w, h);
const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 8, 16);
const cone = (r, h, s = 16) => new THREE.ConeGeometry(r, h, s);
const eyes = (head, col, x, y, z, r = 0.05) => { for (const s of [-1, 1]) { add(head, sph(r * 1.35, 14, 10), S('#120a18'), s * x, y, z); add(head, sph(r, 14, 10), G(col, 2.4), s * x, y, z + r * 0.45); } };
const pulse = (t, f) => 0.5 + 0.5 * Math.sin(t * f);
// plume / pétale : forme plate arrondie
function feather(len, wid, mat) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.35, 0, len); s.quadraticCurveTo(-wid, len * 0.35, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10); const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
}
const atk = (st, d = 0.5) => Math.sin(Math.min(1, st / d) * Math.PI);
const dieSink = (root, st) => { root.position.y = -Math.min(0.8, st * 0.9); root.scale.setScalar(Math.max(0.01, 1 - st * 0.6)); };

// ---------------- Phénix ----------------
function phenix() {
  const root = new THREE.Group(), body = grp(root, 0, 1.5, 0);
  const F1 = G('#ff8a2a', 0.9, { side: THREE.DoubleSide }), F2 = G('#ffd25a', 1.2, { side: THREE.DoubleSide }), F3 = G('#ff3d2a', 0.8, { side: THREE.DoubleSide });
  const B = S('#ff7a2a', { emissive: '#ff4a10', emissiveIntensity: 0.5 }), Bk = S('#ffd27a', { emissive: '#ff9a2a', emissiveIntensity: 0.4 });
  const torso = add(body, sph(0.32), B); torso.scale.set(0.85, 0.85, 1.25);
  add(body, sph(0.24), Bk, 0, -0.06, 0.16).scale.set(0.8, 0.8, 0.9);
  const neck = grp(body, 0, 0.2, 0.28); add(neck, cap(0.12, 0.25), B, 0, 0.14, 0.04).rotation.x = 0.4;
  const head = grp(neck, 0, 0.36, 0.1); add(head, sph(0.17), B).scale.set(0.95, 0.95, 1.1);
  add(head, cone(0.06, 0.26), S('#ffcf3a', { metalness: 0.4, roughness: 0.3 }), 0, -0.03, 0.24).rotation.x = Math.PI / 2;
  eyes(head, '#fff2a0', 0.09, 0.05, 0.12, 0.035);
  const crest = []; for (let i = 0; i < 5; i++) { const f = feather(0.42 - i * 0.04, 0.07, i % 2 ? F2 : F1); f.position.set(0, 0.1, -0.04 - i * 0.02); f.rotation.set(-0.5 - i * 0.22, 0, 0); head.add(f); crest.push(f); }
  const wings = [];
  for (const sx of [-1, 1]) {
    const sh = grp(body, sx * 0.22, 0.1, 0.02), tip = grp(sh, sx * 0.55, 0.05, 0);
    add(sh, cap(0.06, 0.45), B, sx * 0.28, 0.02, 0).rotation.z = sx * Math.PI / 2;
    for (let i = 0; i < 7; i++) { const f = feather(0.62 - i * 0.03, 0.11, i % 3 === 0 ? F2 : F1); f.rotation.set(Math.PI / 2, 0, -sx * (1.2 + i * 0.12)); f.position.set(sx * (0.1 + i * 0.06), 0, -0.02); sh.add(f); }
    for (let i = 0; i < 6; i++) { const f = feather(0.8 - i * 0.05, 0.12, i % 2 ? F3 : F1); f.rotation.set(Math.PI / 2, 0, -sx * (1.45 + i * 0.16)); f.position.set(sx * i * 0.05, 0, 0); tip.add(f); }
    wings.push([sh, tip, sx]);
  }
  const tail = []; for (let i = 0; i < 5; i++) { const f = feather(1.0 - Math.abs(i - 2) * 0.12, 0.13, i === 2 ? F2 : i % 2 ? F3 : F1); f.position.set(0, -0.02, -0.32); f.rotation.set(-Math.PI / 2 - 0.25, (i - 2) * 0.22, 0); body.add(f); tail.push(f); }
  for (const sx of [-1, 1]) add(body, cap(0.03, 0.2), S('#6a3010'), sx * 0.1, -0.32, 0.05);
  const halo = glowSprite(0xff8a2a, 2.4); body.add(halo);
  const a = new ProcActor(root, 2.2);
  a.anim = (t, st, state) => {
    const ph = t * (state === 'run' ? 8 : 6);
    body.position.y = 1.5 + Math.sin(ph) * 0.1;
    for (const [sh, tip, sx] of wings) { sh.rotation.z = sx * (Math.sin(ph) * 0.65 + 0.15); tip.rotation.z = sx * Math.sin(ph - 0.8) * 0.45; }
    tail.forEach((f, i) => { f.rotation.y = (i - 2) * 0.22 + Math.sin(t * 3 + i) * 0.08; });
    crest.forEach((f, i) => { f.rotation.x = -0.5 - i * 0.22 + Math.sin(t * 5 + i) * 0.05; });
    halo.scale.setScalar(2.2 + Math.sin(t * 9) * 0.25);
    const k = state === 'attack' ? atk(st) : 0; neck.rotation.x = k * 0.6; head.rotation.x = -k * 0.3;
    if (state === 'death') dieSink(root, st);
  };
  return a;
}

// ---------------- Yéti ----------------
function yeti() {
  const root = new THREE.Group(), body = grp(root, 0, 0, 0);
  const Fu = S('#eef4fb', { roughness: 0.9 }), Fu2 = S('#d4e2ef', { roughness: 0.9 }), Sk = S('#7c93b0'), Ic = G('#9fe8ff', 0.6, { roughness: 0.1, transparent: true, opacity: 0.92 });
  const torso = add(body, sph(0.62), Fu, 0, 1.3, 0); torso.scale.set(1.1, 1.05, 0.85);
  add(body, sph(0.45), Fu2, 0, 1.2, 0.28).scale.set(0.95, 1.0, 0.6);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; add(body, cone(0.12, 0.3, 8), Fu, Math.cos(a) * 0.58, 1.55 + Math.sin(i * 1.7) * 0.15, Math.sin(a) * 0.45).rotation.set(Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); }
  const head = grp(body, 0, 1.95, 0.18); add(head, sph(0.32), Fu).scale.set(1, 0.92, 0.95);
  const face = add(head, sph(0.22), Sk, 0, -0.04, 0.17); face.scale.set(1.05, 0.85, 0.6);
  eyes(head, '#7ff3ff', 0.09, 0.03, 0.29, 0.04);
  const jaw = grp(head, 0, -0.12, 0.2); add(jaw, sph(0.13), Sk).scale.set(1.1, 0.5, 0.7);
  for (const s of [-1, 1]) { add(jaw, cone(0.022, 0.08, 8), S('#fff'), s * 0.06, 0.04, 0.07); const h = add(head, cone(0.07, 0.42, 12), Ic, s * 0.24, 0.24, -0.02); h.rotation.set(-0.3, 0, -s * 0.7); }
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = grp(body, s * 0.68, 1.6, 0.05); add(sh, sph(0.26), Fu);
    add(sh, cap(0.2, 0.5), Fu, 0, -0.42, 0); const fore = grp(sh, 0, -0.8, 0);
    add(fore, cap(0.19, 0.35), Fu2, 0, -0.18, 0.04); add(fore, sph(0.2), Sk, 0, -0.45, 0.08).scale.set(1, 0.8, 1.1);
    for (let k = 0; k < 3; k++) add(fore, cone(0.03, 0.1, 8), S('#2a3448'), (k - 1) * 0.08, -0.55, 0.2).rotation.x = 1.6;
    arms.push([sh, fore, s]);
  }
  const legs = []; for (const s of [-1, 1]) { const l = grp(body, s * 0.3, 0.75, 0); add(l, cap(0.22, 0.35), Fu, 0, -0.25, 0); add(l, sph(0.22), Sk, 0, -0.62, 0.1).scale.set(1, 0.5, 1.4); legs.push([l, s]); }
  for (let i = 0; i < 5; i++) add(body, cone(0.06, 0.35, 8), Ic, (i - 2) * 0.16, 1.75 + Math.abs(i - 2) * -0.06, -0.38).rotation.x = -0.6;
  const a = new ProcActor(root, 2.4);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk', w = t * 5.5;
    body.position.y = mv ? Math.abs(Math.sin(w)) * 0.07 : Math.sin(t * 1.6) * 0.025;
    for (const [l, s] of legs) l.rotation.x = mv ? Math.sin(w + (s > 0 ? 0 : Math.PI)) * 0.55 : 0;
    for (const [sh, fore, s] of arms) { sh.rotation.x = mv ? -Math.sin(w + (s > 0 ? 0 : Math.PI)) * 0.5 : Math.sin(t * 1.6) * 0.06; sh.rotation.z = s * 0.15; fore.rotation.x = -0.3; }
    if (state === 'attack') { const k = atk(st, 0.55); for (const [sh, fore] of arms) { sh.rotation.x = -2.6 * k; fore.rotation.x = -0.3 - k * 0.4; } body.rotation.x = k * 0.25; jaw.rotation.x = k * 0.5; } else { body.rotation.x = 0; jaw.rotation.x = 0.05 + pulse(t, 1.2) * 0.05; }
    head.rotation.y = Math.sin(t * 0.8) * 0.15;
    if (state === 'death') { body.rotation.x = -Math.min(1.5, st * 1.8); body.position.y = -Math.min(0.6, st); }
  };
  return a;
}

// ---------------- Griffon ----------------
function griffon() {
  const root = new THREE.Group(), body = grp(root, 0, 1.15, 0);
  const Go = S('#e8b24a', { metalness: 0.15 }), Gd = S('#b8823a'), Wh = S('#fff8ea'), Be = S('#ffcf3a', { metalness: 0.5, roughness: 0.3 }), Fw = S('#f6ecd6', { side: THREE.DoubleSide }), Fg = S('#e6b456', { side: THREE.DoubleSide });
  const torso = add(body, sph(0.45), Go); torso.scale.set(0.8, 0.78, 1.35);
  add(body, sph(0.36), Wh, 0, 0.12, 0.38).scale.set(0.95, 1.0, 0.8);
  const head = grp(body, 0, 0.5, 0.58); add(head, sph(0.22), Wh).scale.set(0.95, 1, 1.1);
  add(head, cone(0.08, 0.26), Be, 0, -0.05, 0.25).rotation.x = Math.PI / 2 + 0.35;
  eyes(head, '#ffb030', 0.11, 0.06, 0.14, 0.038);
  for (const s of [-1, 1]) { const tuft = feather(0.3, 0.06, Fw); tuft.position.set(s * 0.12, 0.12, -0.08); tuft.rotation.set(-1.2, 0, -s * 0.5); head.add(tuft); }
  const wings = [];
  for (const sx of [-1, 1]) {
    const sh = grp(body, sx * 0.26, 0.28, 0.2), tip = grp(sh, sx * 0.6, 0.12, -0.05);
    add(sh, cap(0.07, 0.5), Go, sx * 0.3, 0.06, 0).rotation.z = sx * 1.3;
    for (let i = 0; i < 6; i++) { const f = feather(0.6, 0.1, i % 2 ? Fg : Fw); f.rotation.set(Math.PI / 2, 0, -sx * (1.3 + i * 0.13)); f.position.set(sx * (0.08 + i * 0.08), 0.05, -0.05); sh.add(f); }
    for (let i = 0; i < 6; i++) { const f = feather(0.85 - i * 0.04, 0.12, i % 2 ? Fw : Fg); f.rotation.set(Math.PI / 2, 0, -sx * (1.5 + i * 0.15)); tip.add(f); }
    wings.push([sh, tip, sx]);
  }
  const legs = [];
  for (const [x, z, fr] of [[-0.22, 0.32, 1], [0.22, 0.32, 1], [-0.25, -0.32, 0], [0.25, -0.32, 0]]) {
    const th = grp(body, x, -0.2, z); add(th, cap(fr ? 0.08 : 0.11, 0.28), fr ? Be : Gd, 0, -0.22, 0);
    add(th, sph(fr ? 0.07 : 0.09), fr ? Be : Gd, 0, -0.48, 0.05).scale.set(1, 0.6, 1.4); legs.push([th, fr]);
  }
  const tail = []; let par = body; for (let i = 0; i < 5; i++) { const sg = grp(par, 0, i ? 0 : 0.05, i ? -0.16 : -0.55); add(sg, cap(0.05 - i * 0.006, 0.12), Go, 0, 0, -0.08).rotation.x = Math.PI / 2; tail.push(sg); par = sg; }
  add(par, sph(0.09), Gd, 0, 0, -0.18).scale.set(0.8, 0.8, 1.4);
  const a = new ProcActor(root, 2.0);
  a.anim = (t, st, state) => {
    const ph = t * (state === 'run' ? 7.5 : 5.5);
    body.position.y = 1.15 + Math.sin(ph) * 0.09;
    for (const [sh, tip, sx] of wings) { sh.rotation.z = sx * (Math.sin(ph) * 0.6 + 0.15); tip.rotation.z = sx * Math.sin(ph - 0.9) * 0.5; }
    for (const [th, fr] of legs) th.rotation.x = (fr ? 0.5 : 0.8) + Math.sin(ph) * 0.1;
    tail.forEach((sg, i) => { sg.rotation.y = Math.sin(t * 2.2 - i * 0.6) * 0.25; sg.rotation.x = 0.15; });
    const k = state === 'attack' ? atk(st, 0.45) : 0; head.rotation.x = k * 0.7; body.rotation.x = k * 0.3 + (state === 'run' ? 0.1 : 0);
    if (state === 'death') dieSink(root, st);
  };
  return a;
}

// ---------------- Élémentaire d'orage ----------------
function orage() {
  const root = new THREE.Group(), body = grp(root, 0, 1.25, 0);
  const Cr = G('#b8a8ff', 0.7, { roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.94, flatShading: true }), Co = G('#e8fbff', 2.6), Rk = S('#4a4870', { flatShading: true });
  const core = add(body, new THREE.IcosahedronGeometry(0.22, 1), Co); const hl = glowSprite(0x9ff3ff, 1.8); body.add(hl);
  const chest = add(body, new THREE.OctahedronGeometry(0.42, 0), Cr); chest.scale.set(1, 1.3, 0.8);
  const head = grp(body, 0, 0.72, 0); add(head, new THREE.OctahedronGeometry(0.22, 0), Cr).scale.y = 1.3; eyes(head, '#ffffff', 0.08, 0.02, 0.15, 0.035);
  const crown = []; for (let i = 0; i < 5; i++) { const c = add(head, new THREE.OctahedronGeometry(0.05, 0), Co, Math.cos(i * 1.256) * 0.24, 0.24, Math.sin(i * 1.256) * 0.24); c.scale.y = 2; crown.push(c); }
  const hands = [];
  for (const s of [-1, 1]) { const h = grp(body, s * 0.65, 0.1, 0.1); add(h, new THREE.OctahedronGeometry(0.17, 0), Cr).scale.y = 1.5; add(h, new THREE.OctahedronGeometry(0.09, 0), Rk, 0, 0.25, 0); h.add(glowSprite(0xb8a8ff, 0.7)); hands.push([h, s]); }
  const shards = []; for (let i = 0; i < 9; i++) { const sh = add(body, new THREE.OctahedronGeometry(0.06 + (i % 3) * 0.025, 0), i % 2 ? Cr : Rk); sh.scale.y = 1.8; shards.push([sh, i]); }
  const tailS = []; for (let i = 0; i < 4; i++) { const tsh = add(body, new THREE.OctahedronGeometry(0.15 - i * 0.03, 0), Cr, 0, -0.5 - i * 0.2, 0); tsh.scale.y = 1.4; tailS.push(tsh); }
  // éclairs entre les mains et le cœur
  const arcMat = new THREE.LineBasicMaterial({ color: '#e8fbff', transparent: true, opacity: 0.9 }), arcs = [];
  for (let i = 0; i < 2; i++) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3)); const l = new THREE.Line(g, arcMat); body.add(l); arcs.push(l); }
  const a = new ProcActor(root, 2.1);
  a.anim = (t, st, state) => {
    body.position.y = 1.25 + Math.sin(t * 2.2) * 0.1;
    core.scale.setScalar(1 + Math.sin(t * 9) * 0.12); hl.scale.setScalar(1.6 + Math.sin(t * 13) * 0.3);
    chest.rotation.y = t * 0.8; head.rotation.y = Math.sin(t * 1.2) * 0.3;
    crown.forEach((c, i) => { c.position.y = 0.24 + Math.sin(t * 4 + i) * 0.04; });
    shards.forEach(([sh, i]) => { const an = t * (0.9 + (i % 3) * 0.3) + i * 0.7, r = 0.6 + (i % 3) * 0.12; sh.position.set(Math.cos(an) * r, Math.sin(t * 2 + i) * 0.35, Math.sin(an) * r); sh.rotation.y = an * 2; });
    tailS.forEach((s, i) => { s.position.x = Math.sin(t * 3 - i * 0.8) * 0.06 * (i + 1); s.rotation.y = t * (1 + i); });
    const k = state === 'attack' || state === 'cast' ? atk(st, 0.5) : 0;
    for (const [h, s] of hands) { h.position.set(s * (0.65 - k * 0.25), 0.1 + Math.sin(t * 2.5 + s) * 0.06 + k * 0.35, 0.1 + k * 0.4); h.rotation.y = t * 2 * s; }
    arcs.forEach((l, j) => { const h = hands[j][0], p = l.geometry.attributes.position; for (let q = 0; q < 8; q++) { const u = q / 7; p.setXYZ(q, h.position.x * u + (Math.random() - 0.5) * 0.12 * Math.sin(u * Math.PI), h.position.y * u + (Math.random() - 0.5) * 0.12 * Math.sin(u * Math.PI), h.position.z * u); } p.needsUpdate = true; l.visible = Math.random() < 0.55 + k * 0.4; });
    if (state === 'death') dieSink(root, st);
  };
  return a;
}

// ---------------- Champignon géant ----------------
function champi() {
  const root = new THREE.Group(), body = grp(root, 0, 0, 0);
  const St = S('#f3e6cf'), St2 = S('#e2cfae'), Cp = S('#4fc2a0', { emissive: '#1a6a5a', emissiveIntensity: 0.25 }), Dt = G('#d8fff0', 1.4), Gi = S('#bde8d6');
  const stem = add(body, new THREE.CylinderGeometry(0.3, 0.42, 1.0, 24), St, 0, 0.75, 0);
  add(body, new THREE.TorusGeometry(0.3, 0.07, 10, 24), St2, 0, 1.0, 0).rotation.x = Math.PI / 2;
  const capG = grp(body, 0, 1.35, 0);
  const capM = add(capG, new THREE.SphereGeometry(0.72, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), Cp); capM.scale.set(1, 0.65, 1);
  add(capG, new THREE.CylinderGeometry(0.72, 0.45, 0.06, 32), Gi, 0, 0, 0);
  for (let i = 0; i < 16; i++) { const a = i * 2.39, r = 0.18 + (i % 5) * 0.11, y = Math.sqrt(Math.max(0, 1 - (r / 0.72) ** 2)) * 0.46; add(capG, sph(0.045 + (i % 3) * 0.02, 12, 8), Dt, Math.cos(a) * r, y + 0.01, Math.sin(a) * r).scale.y = 0.5; }
  eyes(body, '#ffe9a0', 0.12, 1.05, 0.36, 0.045);
  add(body, new THREE.TorusGeometry(0.06, 0.018, 8, 16, Math.PI), S('#5a3a2a'), 0, 0.92, 0.38).rotation.z = Math.PI;
  const arms = []; for (const s of [-1, 1]) { const sh = grp(body, s * 0.33, 0.95, 0); add(sh, cap(0.07, 0.35), St2, s * 0.05, -0.2, 0); add(sh, sph(0.09), St2, s * 0.08, -0.43, 0); arms.push([sh, s]); }
  const legs = []; for (const s of [-1, 1]) { const l = grp(body, s * 0.18, 0.3, 0); add(l, cap(0.1, 0.15), St2, 0, -0.12, 0); add(l, sph(0.12), St2, 0, -0.27, 0.06).scale.set(1, 0.5, 1.3); legs.push([l, s]); }
  const spores = []; for (let i = 0; i < 6; i++) { const sp = add(body, sph(0.035, 8, 6), Dt); spores.push([sp, i]); }
  const a = new ProcActor(root, 2.0);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk', w = t * 7;
    body.rotation.z = mv ? Math.sin(w) * 0.07 : Math.sin(t * 1.8) * 0.03;
    body.position.y = mv ? Math.abs(Math.sin(w)) * 0.06 : 0;
    for (const [l, s] of legs) l.rotation.x = mv ? Math.sin(w + (s > 0 ? 0 : Math.PI)) * 0.6 : 0;
    for (const [sh, s] of arms) sh.rotation.z = s * (0.3 + Math.sin(t * 2 + s) * 0.08);
    capG.scale.set(1 + Math.sin(t * 2) * 0.02, 1 - Math.sin(t * 2) * 0.03, 1 + Math.sin(t * 2) * 0.02);
    const k = state === 'attack' || state === 'cast' ? atk(st, 0.5) : 0; capG.position.y = 1.35 - k * 0.15; capG.rotation.x = k * 0.2;
    spores.forEach(([sp, i]) => { const u = (t * 0.35 + i / 6) % 1; sp.position.set(Math.cos(i * 2 + t) * (0.4 + u * 0.4), 1.6 + u * 0.9, Math.sin(i * 2 + t) * (0.4 + u * 0.4)); sp.scale.setScalar(1 - u); });
    if (state === 'death') dieSink(root, st);
  };
  return a;
}

// ---------------- Araignée des ombres ----------------
function araignee() {
  const root = new THREE.Group(), body = grp(root, 0, 0.62, 0);
  const Bk = S('#2a1e3a', { roughness: 0.4 }), Bk2 = S('#3e2a58', { roughness: 0.35 }), Pu = G('#c070ff', 1.6), Fa = S('#d8c8e8', { roughness: 0.3 });
  const abd = add(body, sph(0.42), Bk); abd.position.set(0, 0.12, -0.42); abd.scale.set(1, 0.85, 1.2);
  for (let i = 0; i < 3; i++) add(abd, sph(0.07, 12, 8), Pu, 0, 0.35 - i * 0.05, 0.1 - i * 0.22).scale.set(1.5, 0.4, 1);
  const tho = add(body, sph(0.27), Bk2); tho.scale.set(1, 0.8, 1.15);
  const head = grp(body, 0, 0.04, 0.28); add(head, sph(0.17), Bk2).scale.set(1, 0.85, 1);
  for (const [x, y, r] of [[-0.07, 0.07, 0.04], [0.07, 0.07, 0.04], [-0.12, 0.02, 0.028], [0.12, 0.02, 0.028], [-0.035, 0.12, 0.022], [0.035, 0.12, 0.022]]) add(head, sph(r, 10, 8), Pu, x, y, 0.14);
  const fangs = []; for (const s of [-1, 1]) { const f = grp(head, s * 0.06, -0.08, 0.12); add(f, cone(0.03, 0.14, 10), Fa, 0, -0.06, 0.02).rotation.x = Math.PI - 0.3; fangs.push([f, s]); }
  const legs = [];
  for (let i = 0; i < 4; i++) for (const s of [-1, 1]) {
    const hip = grp(body, s * 0.22, 0.02, 0.18 - i * 0.14); hip.rotation.y = s * (0.5 - i * 0.35) + (s < 0 ? Math.PI : 0);
    const up = grp(hip, 0, 0, 0); add(up, cap(0.035, 0.42), Bk2, 0.25, 0.14, 0).rotation.z = -1.0;
    const lo = grp(up, 0.48, 0.3, 0); add(lo, cap(0.028, 0.55), Bk, 0.16, -0.27, 0).rotation.z = 0.55; add(lo, cone(0.03, 0.08, 8), Pu, 0.32, -0.56, 0).rotation.z = Math.PI;
    legs.push([up, lo, i, s]);
  }
  const a = new ProcActor(root, 1.4);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk', w = t * 11;
    body.position.y = 0.62 + (mv ? Math.abs(Math.sin(w * 2)) * 0.03 : Math.sin(t * 2) * 0.015);
    for (const [up, lo, i, s] of legs) { const p = w + i * 1.6 + (s > 0 ? 0 : Math.PI); up.rotation.z = mv ? Math.max(0, Math.sin(p)) * 0.35 : Math.sin(t * 1.5 + i) * 0.03; up.rotation.y = mv ? Math.cos(p) * 0.25 : 0; lo.rotation.z = mv ? -Math.max(0, Math.sin(p)) * 0.2 : 0; }
    abd.rotation.x = Math.sin(t * 2.5) * 0.06;
    const k = state === 'attack' ? atk(st, 0.4) : 0; body.rotation.x = -k * 0.35; for (const [f, s] of fangs) f.rotation.z = s * (0.1 + k * 0.6);
    if (state === 'death') { for (const [up] of legs) up.rotation.z = Math.min(1.2, st * 2); body.position.y = Math.max(0.2, 0.62 - st); }
  };
  return a;
}

// ---------------- Tortue de cristal ----------------
function tortue() {
  const root = new THREE.Group(), body = grp(root, 0, 0.45, 0);
  const Sk = S('#6fae7a'), Sk2 = S('#5a9466'), Sh = S('#4a6a5a', { roughness: 0.5 }), Cr = G('#8ff6ff', 0.8, { roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.93, flatShading: true }), Rm = S('#c8b88a');
  const shell = add(body, new THREE.SphereGeometry(0.62, 32, 18, 0, Math.PI * 2, 0, Math.PI / 2), Sh, 0, 0.05, 0); shell.scale.set(1, 0.75, 1.15);
  add(body, new THREE.TorusGeometry(0.62, 0.06, 10, 32), Rm, 0, 0.05, 0).rotation.x = Math.PI / 2;
  add(body, new THREE.CylinderGeometry(0.6, 0.55, 0.12, 32), S('#d8c89a'), 0, 0, 0).scale.z = 1.15;
  const crys = []; for (let i = 0; i < 9; i++) { const a = i * 2.39, r = i ? 0.2 + (i % 3) * 0.12 : 0; const c = add(body, new THREE.OctahedronGeometry(0.1 + (i ? 0 : 0.06), 0), Cr, Math.cos(a) * r, 0.05 + Math.sqrt(Math.max(0, 1 - (r / 0.62) ** 2)) * 0.465 + 0.06, Math.sin(a) * r * 1.1); c.scale.y = 2.4 - r; c.rotation.z = Math.cos(a) * r * 0.8; crys.push(c); }
  const head = grp(body, 0, 0.12, 0.72); add(head, cap(0.12, 0.18), Sk, 0, 0, 0.05).rotation.x = Math.PI / 2; add(head, sph(0.17), Sk, 0, 0.05, 0.2).scale.set(1, 0.85, 1.1);
  eyes(head, '#e8fff0', 0.09, 0.1, 0.32, 0.03);
  const legs = []; for (const [x, z] of [[-0.5, 0.42], [0.5, 0.42], [-0.5, -0.42], [0.5, -0.42]]) { const l = grp(body, x, -0.05, z); add(l, cap(0.12, 0.15), Sk2, 0, -0.15, 0); add(l, sph(0.13), Sk, 0, -0.3, 0.04).scale.set(1, 0.5, 1.2); legs.push([l, x, z]); }
  const tl = add(body, cone(0.08, 0.25, 12), Sk2, 0, 0, -0.75); tl.rotation.x = -Math.PI / 2 - 0.2;
  const halo = glowSprite(0x8ff6ff, 1.2); halo.position.y = 0.7; body.add(halo);
  const a = new ProcActor(root, 1.4);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk', w = t * 5;
    body.position.y = 0.45 + (mv ? Math.abs(Math.sin(w)) * 0.025 : 0); body.rotation.z = mv ? Math.sin(w) * 0.04 : 0;
    for (const [l, x, z] of legs) l.rotation.x = mv ? Math.sin(w + (x * z > 0 ? 0 : Math.PI)) * 0.45 : 0;
    head.position.z = 0.72 + Math.sin(t * 1.2) * 0.03; halo.scale.setScalar(1.1 + pulse(t, 2) * 0.3);
    crys.forEach((c, i) => { c.material.emissiveIntensity = 0.6 + pulse(t + i, 2.5) * 0.6; });
    const k = state === 'attack' ? atk(st, 0.45) : 0; head.position.z += k * 0.2; head.rotation.x = -k * 0.3;
    if (state === 'death') { head.position.z = 0.72 - Math.min(0.5, st); for (const [l] of legs) l.scale.setScalar(Math.max(0.01, 1 - st)); body.position.y = Math.max(0.15, 0.45 - st * 0.4); }
  };
  return a;
}

// ---------------- Salamandre ----------------
function salamandre() {
  const root = new THREE.Group(), body = grp(root, 0, 0.32, 0);
  const Sk = S('#e0532a', { roughness: 0.45 }), Be = S('#ffc06a'), Sp = G('#ffcf3a', 1.8), Fl = G('#ff9a2a', 1.6, { transparent: true, opacity: 0.85 });
  const segs = []; let par = body;
  for (let i = 0; i < 4; i++) { const g = grp(par, 0, 0, i ? -0.24 : 0.1); const s = add(g, sph(0.2 - i * 0.015), Sk); s.scale.set(1, 0.7, 1.3); add(g, sph(0.12, 12, 8), Be, 0, -0.07, 0.02).scale.set(1, 0.5, 1.2); add(g, cone(0.045, 0.16, 10), Sp, 0, 0.14, 0).rotation.x = -0.3; segs.push(g); par = g; }
  for (let i = 0; i < 5; i++) { const g = grp(par, 0, 0, -0.2); add(g, sph(0.13 - i * 0.022), Sk).scale.set(1, 0.7, 1.4); segs.push(g); par = g; }
  const flame = add(par, cone(0.08, 0.3, 12), Fl, 0, 0.05, -0.15); flame.rotation.x = -Math.PI / 2 - 0.6;
  const head = grp(body, 0, 0.04, 0.38); add(head, sph(0.17), Sk).scale.set(1, 0.7, 1.3); add(head, sph(0.12), Sk, 0, -0.02, 0.15).scale.set(1, 0.6, 1.2);
  eyes(head, '#fff2a0', 0.1, 0.08, 0.08, 0.04);
  const jaw = grp(head, 0, -0.06, 0.04); add(jaw, sph(0.12), Be, 0, -0.02, 0.12).scale.set(0.95, 0.35, 1.2);
  const fire = glowSprite(0xff8a2a, 0.01); fire.position.set(0, 0, 0.45); head.add(fire);
  const legs = []; for (const [gi, x] of [[0, -1], [0, 1], [2, -1], [2, 1]]) { const l = grp(segs[gi], x * 0.17, -0.05, 0); add(l, cap(0.04, 0.15), Sk, x * 0.1, -0.06, 0).rotation.z = x * 1.0; add(l, sph(0.05), Be, x * 0.2, -0.15, 0.03).scale.set(1.2, 0.4, 1.3); legs.push([l, x, gi]); }
  const a = new ProcActor(root, 0.9);
  a.anim = (t, st, state) => {
    const mv = state === 'run' || state === 'walk', w = t * (mv ? 13 : 2.2);
    segs.forEach((g, i) => { g.rotation.y = Math.sin(w - i * 0.7) * (mv ? 0.22 : 0.08); });
    for (const [l, x, gi] of legs) l.rotation.x = mv ? Math.sin(w + (gi ? Math.PI : 0) + (x > 0 ? 0 : Math.PI)) * 0.7 : 0;
    flame.scale.set(1, 1 + Math.sin(t * 15) * 0.25, 1);
    const k = state === 'attack' ? atk(st, 0.4) : 0; jaw.rotation.x = 0.05 + k * 0.6; head.rotation.x = -k * 0.25; fire.scale.setScalar(k * 0.9 + 0.001);
    head.rotation.y = Math.sin(t * 1.3) * 0.2;
    if (state === 'death') { body.rotation.z = Math.min(Math.PI, st * 3); body.position.y = 0.32 + Math.min(0.1, st * 0.2); }
  };
  return a;
}

// ---------------- Hibou arcanique ----------------
function hibou() {
  const root = new THREE.Group(), body = grp(root, 0, 1.4, 0);
  const Fe = S('#6a5aa8'), Fe2 = S('#9a8ad8'), Be = S('#f2e6c8'), Fw = S('#7a6ab8', { side: THREE.DoubleSide }), Fw2 = S('#b6a8ff', { side: THREE.DoubleSide, emissive: '#6a4aff', emissiveIntensity: 0.3 }), Ru = G('#7ff3ff', 2);
  const torso = add(body, sph(0.32), Fe); torso.scale.set(1, 1.15, 0.95);
  add(body, sph(0.24), Be, 0, -0.05, 0.14).scale.set(0.95, 1.1, 0.7);
  const head = grp(body, 0, 0.42, 0.02); add(head, sph(0.26), Fe).scale.set(1.1, 0.95, 1);
  for (const s of [-1, 1]) { add(head, new THREE.CircleGeometry(0.11, 24), Be, s * 0.1, 0.02, 0.24).rotation.y = s * 0.2; const tuft = feather(0.22, 0.05, Fw2); tuft.position.set(s * 0.17, 0.17, 0.02); tuft.rotation.set(-0.2, 0, -s * 0.4); head.add(tuft); }
  eyes(head, '#7ff3ff', 0.1, 0.03, 0.25, 0.055);
  add(head, cone(0.03, 0.09, 10), S('#e8b24a'), 0, -0.06, 0.27).rotation.x = Math.PI / 2 + 0.6;
  add(body, new THREE.TorusGeometry(0.13, 0.012, 8, 24), Ru, 0, 0.0, 0.25);
  const wings = [];
  for (const sx of [-1, 1]) {
    const sh = grp(body, sx * 0.24, 0.12, 0), tip = grp(sh, sx * 0.4, 0, 0);
    for (let i = 0; i < 5; i++) { const f = feather(0.48, 0.1, i % 2 ? Fw2 : Fw); f.rotation.set(Math.PI / 2, 0, -sx * (1.25 + i * 0.12)); f.position.set(sx * i * 0.07, 0, 0); sh.add(f); }
    for (let i = 0; i < 5; i++) { const f = feather(0.6 - i * 0.04, 0.1, i % 2 ? Fw : Fw2); f.rotation.set(Math.PI / 2, 0, -sx * (1.45 + i * 0.16)); tip.add(f); }
    wings.push([sh, tip, sx]);
  }
  for (let i = 0; i < 3; i++) { const f = feather(0.42, 0.09, Fw); f.position.set(0, -0.2, -0.2); f.rotation.set(-Math.PI / 2 - 0.7, (i - 1) * 0.3, 0); body.add(f); }
  const book = grp(body, 0, -0.45, 0.1); add(book, new THREE.BoxGeometry(0.22, 0.04, 0.16), S('#5a2a1a'), 0, 0, 0); add(book, new THREE.BoxGeometry(0.2, 0.05, 0.14), S('#f4ead0'), 0, 0.01, 0);
  for (const s of [-1, 1]) add(body, cap(0.025, 0.12), S('#e8b24a'), s * 0.08, -0.38, 0.08);
  const runes = []; for (let i = 0; i < 3; i++) { const r = add(body, new THREE.TorusGeometry(0.06, 0.01, 6, 16), Ru); runes.push([r, i]); }
  const a = new ProcActor(root, 1.9);
  a.anim = (t, st, state) => {
    const ph = t * 6.5;
    body.position.y = 1.4 + Math.sin(ph) * 0.07;
    for (const [sh, tip, sx] of wings) { sh.rotation.z = sx * (Math.sin(ph) * 0.6 + 0.2); tip.rotation.z = sx * Math.sin(ph - 0.8) * 0.4; }
    head.rotation.y = Math.sin(t * 0.7) * 0.5; head.rotation.z = Math.sin(t * 0.5) * 0.12;
    runes.forEach(([r, i]) => { const an = t * 1.5 + i * 2.09; r.position.set(Math.cos(an) * 0.55, 0.1 + Math.sin(t * 2 + i) * 0.1, Math.sin(an) * 0.55); r.rotation.set(t, an, 0); });
    const k = state === 'attack' || state === 'cast' ? atk(st, 0.45) : 0; body.rotation.x = k * 0.3; for (const [sh, , sx] of wings) sh.rotation.z += sx * k * 0.6;
    if (state === 'death') dieSink(root, st);
  };
  return a;
}

// ---------------- Spectre ----------------
function spectre() {
  const root = new THREE.Group(), body = grp(root, 0, 1.25, 0);
  const Gh = G('#c8d4ff', 0.7, { transparent: true, opacity: 0.78, roughness: 0.2 }), Rb = S('#4a3e7a', { transparent: true, opacity: 0.95, emissive: '#2a1a5a', emissiveIntensity: 0.3 }), Ch = M('#8a8aa0'), La = G('#7fffb0', 2.2);
  const robe = add(body, new THREE.ConeGeometry(0.42, 1.3, 32, 6, true), Rb, 0, -0.35, 0); robe.material.side = THREE.DoubleSide;
  const pos = robe.geometry.attributes.position, base = Float32Array.from(pos.array);
  add(body, sph(0.3), Rb, 0, 0.22, 0).scale.set(1, 0.8, 0.9);
  const hood = grp(body, 0, 0.5, 0.02); add(hood, new THREE.SphereGeometry(0.27, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), Rb).rotation.x = -0.25;
  add(hood, sph(0.18), Gh, 0, -0.04, 0.06).scale.set(1, 1.05, 0.9);
  eyes(hood, '#7fffb0', 0.07, 0.0, 0.2, 0.035);
  const arms = [];
  for (const s of [-1, 1]) { const sh = grp(body, s * 0.3, 0.25, 0.05); add(sh, new THREE.ConeGeometry(0.1, 0.5, 16, 1, true), Rb, 0, -0.22, 0).material.side = THREE.DoubleSide; const hand = add(sh, sph(0.07), Gh, 0, -0.5, 0.02); for (let k = 0; k < 3; k++) add(sh, cap(0.012, 0.08), Gh, (k - 1) * 0.03, -0.58, 0.04); arms.push([sh, s, hand]); }
  const lantern = grp(arms[1][0], 0, -0.62, 0.05); add(lantern, new THREE.CylinderGeometry(0.06, 0.07, 0.14, 12), M('#4a4a5a'), 0, -0.1, 0); add(lantern, sph(0.05), La, 0, -0.1, 0); lantern.add(glowSprite(0x7fffb0, 0.6)); lantern.children[2].position.y = -0.1;
  const chain = []; for (let i = 0; i < 6; i++) { const c = add(body, new THREE.TorusGeometry(0.035, 0.01, 6, 12), Ch); chain.push([c, i]); }
  const a = new ProcActor(root, 2.0);
  a.anim = (t, st, state) => {
    body.position.y = 1.25 + Math.sin(t * 2) * 0.12;
    for (let i = 0; i < pos.count; i++) { const y = base[i * 3 + 1]; const k = Math.max(0, (-y - 0.1) / 0.55); pos.setX(i, base[i * 3] * (1 + Math.sin(t * 4 + i * 0.7) * 0.08 * k)); pos.setZ(i, base[i * 3 + 2] * (1 + Math.cos(t * 3.5 + i) * 0.08 * k) - k * 0.08 * (state === 'run' ? 2 : 1)); }
    pos.needsUpdate = true;
    for (const [sh, s] of arms) { sh.rotation.x = Math.sin(t * 1.8 + s) * 0.15 - 0.2; sh.rotation.z = s * 0.15; }
    lantern.rotation.z = Math.sin(t * 2.4) * 0.3;
    chain.forEach(([c, i]) => { c.position.set(-0.28 + i * 0.1, -0.1 - Math.sin(i / 5 * Math.PI) * 0.15 + Math.sin(t * 3 + i) * 0.02, 0.3); c.rotation.y = i % 2 ? Math.PI / 2 : 0; });
    hood.rotation.x = Math.sin(t * 1.3) * 0.08;
    const k = state === 'attack' ? atk(st, 0.45) : 0; arms[0][0].rotation.x = -0.2 - k * 2.0; body.rotation.x = k * 0.25;
    Gh.opacity = 0.7 + pulse(t, 3) * 0.15;
    if (state === 'death') { root.position.y = Math.min(1.2, st * 1.2); root.scale.setScalar(Math.max(0.01, 1 - st * 0.8)); }
  };
  return a;
}

export const CREATURES = { phenix, yeti, griffon, orage, champi, araignee, tortue, salamandre, hibou, spectre };
