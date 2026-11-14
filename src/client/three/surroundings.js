// MYTHORIA — décor tout autour de l'île, propre à chaque monde :
// Aurore = arène de tournoi · Sylve = arbres géants · Arcane = cristaux et runes flottants
// Braise = volcans · Givre = glaciers et aurore boréale · Ombres = paysage démoniaque.
import * as THREE from 'three';
import { prop } from './assets.js';
import { buildProc, glowSprite, glowTexture } from './procedural.js';
import { buildArena } from './arena.js';

const flat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...o });
const glow = (color, k = 1.2, o = {}) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k, flatShading: true, roughness: 0.4, ...o });

// Positions sur un « fer à cheval » derrière et sur les côtés de l'île (ouvert vers la caméra).
function ring(EX, EZ, n, s0, s1, jitter = 0.08, a0 = Math.PI * 0.78, a1 = Math.PI * 2.22) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (a1 - a0) * (i + 0.5) / n + (Math.random() - 0.5) * jitter * 2, s = s0 + Math.random() * (s1 - s0);
    out.push({ x: Math.cos(a) * EX * s, z: Math.sin(a) * EZ * s, a, s });
  }
  return out;
}

// Gouffre sous l'île + faille lumineuse (tous les mondes)
function abyss(group, T, EX, EZ, ups) {
  const pit = new THREE.Mesh(new THREE.CircleGeometry(110, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.rock2).multiplyScalar(0.4) }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = -12; group.add(pit);
  const riftG = new THREE.RingGeometry(0.98, 1.2, 64, 1); riftG.scale(EX, EZ, 1);
  const rift = new THREE.Mesh(riftG, new THREE.MeshBasicMaterial({ color: T.partCol, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  rift.rotation.x = -Math.PI / 2; rift.position.y = -1.6; group.add(rift);
  const deep = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: T.lava || T.partCol, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }));
  deep.scale.set(EX * 1.6, EZ * 1.6, 1); deep.rotation.x = -Math.PI / 2; deep.position.y = -11.8; group.add(deep);
  ups.push((dt, t) => { rift.material.opacity = 0.22 + Math.sin(t * 1.3) * 0.08; deep.material.opacity = 0.16 + Math.sin(t * 0.8) * 0.06; });
}

// Dragons qui tournent autour
function dragons(group, ups, list) {
  const ds = list.map((o, i) => { const d = buildProc('dragon', { color: o.c, belly: o.b, horns: !!o.horns }); d.root.scale.setScalar(o.s || 2); d.play('run'); group.add(d.root); return { d, ...o }; });
  ups.push((dt, t) => { for (const o of ds) {
    const a = (o.ph || 0) + t * o.sp * o.dir, x = Math.cos(a) * o.r, z = Math.sin(a) * o.r * 0.75 - 8, y = o.h + Math.sin(t * 0.7 + (o.ph || 0)) * 1.5;
    o.d.root.position.set(x, y, z); o.d.root.rotation.y = Math.atan2(-Math.sin(a) * o.dir, Math.cos(a) * 0.75 * o.dir); o.d.root.rotation.z = -0.25 * o.dir; o.d.update(dt);
  } });
}

// Nuée (oiseaux, chauves-souris, livres) : une seule géométrie instanciée
function flock(group, ups, { n = 14, color = '#2a2030', r = 18, h = 9, sp = 0.25, size = 0.5, kind = 'bird', glowCol = null }) {
  let geo;
  if (kind === 'book') geo = new THREE.BoxGeometry(0.6, 0.12, 0.45);
  else { geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.2, -0.7, 0.1, -0.1, 0, 0, -0.3, 0, 0, 0.2, 0.7, 0.1, -0.1, 0, 0, -0.3], 3)); geo.computeVertexNormals(); }
  const mat = glowCol ? glow(glowCol, 0.8, { side: THREE.DoubleSide }) : flat(color, { side: THREE.DoubleSide });
  const m = new THREE.InstancedMesh(geo, mat, n); group.add(m);
  const B = Array.from({ length: n }, (_, i) => ({ off: Math.random() * 6.28, rr: r * (0.8 + Math.random() * 0.4), hh: h + (Math.random() - 0.5) * 3, ph: Math.random() * 6.28 }));
  const o = new THREE.Object3D();
  ups.push((dt, t) => { B.forEach((b, i) => {
    const a = b.off + t * sp; o.position.set(Math.cos(a) * b.rr, b.hh + Math.sin(t * 2 + b.ph) * 0.4, Math.sin(a) * b.rr * 0.7 - 10);
    o.rotation.set(kind === 'book' ? Math.sin(t + b.ph) * 0.4 : 0, -a, 0);
    const f = kind === 'book' ? 1 : 0.3 + Math.abs(Math.sin(t * 10 + b.ph)) * 0.9; o.scale.set(size, size * f, size); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
  }); m.instanceMatrix.needsUpdate = true; });
}

async function bigProps(group, list, pos, { tint, scale = [3, 4.5] } = {}) {
  for (const p of pos) {
    try { const n = list[Math.floor(Math.random() * list.length)]; const o = await prop(n, { scale: scale[0] + Math.random() * (scale[1] - scale[0]), tint }); o.position.set(p.x, p.y || -0.3, p.z); o.rotation.y = Math.random() * 6.28; group.add(o); } catch (e) {}
  }
}

// Falaise rocheuse continue derrière (bloque le vide)
function cliffs(group, EX, EZ, color, color2, { h = 7, s0 = 1.35, n = 26, spikes = false } = {}) {
  const mat = flat(color), mat2 = flat(color2);
  for (const p of ring(EX, EZ, n, s0, s0 + 0.25, 0.03)) {
    const hh = h * (0.6 + Math.random() * 0.8), w = 2.4 + Math.random() * 2;
    const g = spikes ? new THREE.ConeGeometry(w * 0.5, hh * 1.4, 5) : new THREE.CylinderGeometry(w * 0.35, w * 0.6, hh, 6);
    const m = new THREE.Mesh(g, Math.random() < 0.5 ? mat : mat2); m.position.set(p.x, hh * (spikes ? 0.7 : 0.5) - 1.5, p.z); m.rotation.set((Math.random() - 0.5) * 0.15, Math.random() * 6, (Math.random() - 0.5) * 0.15); m.castShadow = false; group.add(m);
  }
}

// ======================================================================
const BUILDERS = {
  // ---------- Royaume d'Aurore : arène de tournoi ----------
  async aurore(g, T, EX, EZ, ups, low) {
    const arena = buildArena(g, T, 'aurore', EX, EZ, { low, noPit: true });
    ups.push((dt, t) => arena.update(dt, t));
    dragons(g, ups, [{ c: '#e8b04a', b: '#fff0b8', horns: true, s: 2.2, r: 23, h: 10, sp: 0.11, dir: 1 }]);
    if (!low) flock(g, ups, { n: 12, color: '#f4f0e8', r: 20, h: 12, sp: 0.3, size: 0.5 });
    return { cheer: k => arena.cheer(k) };
  },

  // ---------- Sylve Enchantée : arbres géants millénaires ----------
  async sylve(g, T, EX, EZ, ups, low) {
    cliffs(g, EX, EZ, '#3f5a3a', '#2f4a2c', { h: 5, s0: 1.5, n: 18 });
    // troncs géants faits main + feuillages
    const bark = flat('#5a3a22'), leafA = flat('#3f9a4a'), leafB = flat('#2f7a3c'), leafC = flat('#5fba5a');
    for (const p of ring(EX, EZ, low ? 7 : 10, 1.18, 1.42, 0.05)) {
      const tree = new THREE.Group(), H = 9 + Math.random() * 5;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.6, H, 8), bark); trunk.position.y = H / 2 - 1; tree.add(trunk);
      for (let r = 0; r < 4; r++) { const root = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.4, 5), bark); const a = r * 1.57 + Math.random(); root.position.set(Math.cos(a) * 1.4, -0.4, Math.sin(a) * 1.4); root.rotation.set(Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1); tree.add(root); }
      for (let k = 0; k < 6; k++) { const s = 2.4 + Math.random() * 1.8; const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), [leafA, leafB, leafC][k % 3]); c.position.set((Math.random() - 0.5) * 4, H - 1 + Math.random() * 2.5, (Math.random() - 0.5) * 4); tree.add(c); }
      tree.position.set(p.x, -0.4, p.z); g.add(tree);
    }
    await bigProps(g, ['BirchTree_Autumn_1', 'CommonTree_3', 'Willow_Dead_1'], ring(EX, EZ, low ? 4 : 7, 1.6, 1.9, 0.1), { scale: [3.5, 5] });
    // champignons lumineux géants
    const stem = flat('#efe6d0'), caps = [glow('#7fe0ff', 0.9), glow('#c08aff', 0.9), glow('#8fff9a', 0.8)];
    for (const p of ring(EX, EZ, low ? 6 : 10, 1.2, 1.32, 0.1)) {
      const s = 0.8 + Math.random() * 1.2, m = new THREE.Group();
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.15 * s, 0.25 * s, 1.4 * s, 6), stem); st.position.y = 0.7 * s; m.add(st);
      const cp = new THREE.Mesh(new THREE.SphereGeometry(0.75 * s, 8, 5, 0, Math.PI * 2, 0, 1.5), caps[Math.floor(Math.random() * 3)]); cp.position.y = 1.4 * s; m.add(cp);
      m.position.set(p.x, -0.3, p.z); g.add(m);
    }
    // cascade au fond
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(4, 12, 1, 8), new THREE.MeshBasicMaterial({ color: '#bff4ff', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    fall.position.set(0, 3, -EZ * 1.55); g.add(fall);
    const foam = glowSprite(0xdffaff, 6); foam.position.set(0, -2.5, -EZ * 1.5); g.add(foam);
    ups.push((dt, t) => { fall.material.opacity = 0.45 + Math.sin(t * 6) * 0.08; foam.scale.setScalar(6 + Math.sin(t * 8) * 0.4); });
    flock(g, ups, { n: low ? 8 : 16, color: '#f0f8e8', r: 19, h: 11, sp: 0.35, size: 0.45 });
    if (!low) dragons(g, ups, [{ c: '#4caf6a', b: '#d8ffb0', s: 1.7, r: 22, h: 12, sp: 0.12, dir: -1 }]);
  },

  // ---------- Académie Arcane : cristaux et runes flottants ----------
  async arcane(g, T, EX, EZ, ups, low) {
    cliffs(g, EX, EZ, '#4a4280', '#2e2860', { h: 6, s0: 1.45, n: 20 });
    const cry = [glow('#8ff6ff', 1.1, { transparent: true, opacity: 0.92 }), glow('#c8a8ff', 1.1, { transparent: true, opacity: 0.92 }), glow('#ff9ff0', 0.9, { transparent: true, opacity: 0.9 })];
    const spires = [];
    for (const p of ring(EX, EZ, low ? 7 : 11, 1.15, 1.45, 0.06)) {
      const s = 1 + Math.random() * 1.6, m = new THREE.Mesh(new THREE.OctahedronGeometry(0.9 * s, 0), cry[Math.floor(Math.random() * 3)]);
      m.scale.y = 3.2; const y = 2.5 + Math.random() * 5; m.position.set(p.x, y, p.z); g.add(m); spires.push({ m, y, ph: Math.random() * 6 });
      const base = new THREE.Mesh(new THREE.DodecahedronGeometry(1.1 * s, 0), flat('#6a6488')); base.position.set(p.x, y - 3.3 * s, p.z); g.add(base); spires.push({ m: base, y: y - 3.3 * s, ph: spires[spires.length - 1].ph });
    }
    const rings = [];
    for (let k = 0; k < (low ? 2 : 3); k++) {
      const r = new THREE.Mesh(new THREE.TorusGeometry(4 + k * 2.5, 0.12, 6, 64), glow(['#8ff6ff', '#c8a8ff', '#ffd166'][k], 1.4));
      r.position.set((k - 1) * 9, 9 + k * 2, -EZ * 1.35); g.add(r); rings.push(r);
    }
    const portal = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#b48cff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    portal.position.set(0, 7, -EZ * 1.45); g.add(portal);
    const prt = new THREE.Mesh(new THREE.TorusGeometry(4.4, 0.45, 8, 48), flat('#3a3060', { metalness: 0.3 })); prt.position.copy(portal.position); g.add(prt);
    await bigProps(g, ['Wonder_SecondAge_Level1'], [{ x: -EX * 1.35, z: -EZ * 0.9, y: 3 }, { x: EX * 1.35, z: -EZ * 0.9, y: 4 }], { scale: [1.2, 1.5] });
    ups.push((dt, t) => {
      spires.forEach(o => { o.m.position.y = o.y + Math.sin(t * 0.8 + o.ph) * 0.5; o.m.rotation.y += dt * 0.3; });
      rings.forEach((r, i) => { r.rotation.x = t * (0.3 + i * 0.1); r.rotation.y = t * (0.2 - i * 0.07); });
      portal.rotation.z = t * 0.8; portal.material.opacity = 0.7 + Math.sin(t * 2) * 0.15;
    });
    flock(g, ups, { n: low ? 8 : 14, kind: 'book', glowCol: '#ffe9b0', r: 16, h: 8, sp: 0.2, size: 1.2 });
    dragons(g, ups, [{ c: '#8a5ad8', b: '#e0d0ff', s: 1.8, r: 23, h: 12, sp: 0.1, dir: 1 }]);
  },

  // ---------- Pics des Dragons : volcans ----------
  async braise(g, T, EX, EZ, ups, low) {
    cliffs(g, EX, EZ, '#3a2a24', '#241814', { h: 7, s0: 1.3, n: 24, spikes: true });
    const rock = flat('#6a4434'), lavaM = glow('#ff7a1a', 2.4);
    const vents = [];
    for (const p of [{ x: -EX * 0.85, z: -EZ * 1.2, s: 1.1 }, { x: EX * 0.9, z: -EZ * 1.18, s: 1 }, { x: EX * 0.05, z: -EZ * 1.5, s: 1.4 }]) {
      const H = 15 * p.s, v = new THREE.Mesh(new THREE.CylinderGeometry(2 * p.s, 9 * p.s, H, 9), rock); v.position.set(p.x, H / 2 - 3, p.z); g.add(v);
      const cr = new THREE.Mesh(new THREE.CircleGeometry(1.9 * p.s, 9), lavaM); cr.rotation.x = -Math.PI / 2; cr.position.set(p.x, H - 2.95, p.z); g.add(cr);
      for (let k = 0; k < 3; k++) { const fl = new THREE.Mesh(new THREE.BoxGeometry(1.1 * p.s, H * 0.75, 0.4), lavaM); const a = k * 2.1 + 0.4; fl.position.set(p.x + Math.cos(a) * 3.5 * p.s, H * 0.45 - 3, p.z + Math.sin(a) * 3.5 * p.s); fl.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45); g.add(fl); }
      const gl = glowSprite(0xff7a2a, 8 * p.s); gl.position.set(p.x, H - 2, p.z); g.add(gl);
      vents.push({ x: p.x, y: H - 2.5, z: p.z, s: p.s, gl, next: Math.random() * 4 });
    }
    // fumée et éruptions
    const n = low ? 60 : 120, sg = new THREE.BufferGeometry(), sp = new Float32Array(n * 3), P = [];
    for (let i = 0; i < n; i++) { const v = vents[i % vents.length]; P.push({ v: i % vents.length, life: Math.random(), x: v.x, y: v.y, z: v.z, vx: 0, vy: 1, vz: 0 }); }
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const smoke = new THREE.Points(sg, new THREE.PointsMaterial({ size: 2.2, map: glowTexture(), color: '#ff8a4a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(smoke);
    ups.push((dt, t) => {
      for (const v of vents) { v.next -= dt; v.gl.scale.setScalar(8 * v.s + Math.sin(t * 5) * 0.6); if (v.next <= 0) { v.next = 3 + Math.random() * 4; v.burst = 1; } if (v.burst) v.burst = Math.max(0, v.burst - dt); }
      P.forEach((p, i) => {
        const v = vents[p.v]; p.life += dt * (0.25 + (v.burst ? 0.8 : 0));
        if (p.life > 1) { p.life = 0; p.x = v.x; p.y = v.y; p.z = v.z; const sp2 = v.burst ? 6 : 1.2; p.vx = (Math.random() - 0.5) * sp2; p.vy = 2 + Math.random() * (v.burst ? 9 : 2); p.vz = (Math.random() - 0.5) * sp2; }
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= dt * (v.burst ? 4 : 0.2);
        sp[i * 3] = p.x ?? v.x; sp[i * 3 + 1] = p.y ?? v.y; sp[i * 3 + 2] = p.z ?? v.z;
      });
      sg.attributes.position.needsUpdate = true;
    });
    await bigProps(g, ['CommonTree_Dead_2', 'Rock_3'], ring(EX, EZ, low ? 5 : 9, 1.25, 1.4, 0.1), { tint: '#4a3a34', scale: [1.6, 2.6] });
    dragons(g, ups, [{ c: '#c4263c', b: '#ffcf70', horns: true, s: 2.4, r: 24, h: 11, sp: 0.1, dir: 1 }, { c: '#ff7a3d', b: '#ffd27a', s: 1.5, r: 19, h: 8, sp: 0.16, dir: -1, ph: 2.5 }].slice(0, low ? 1 : 2));
  },

  // ---------- Terres de Givre : glaciers et aurore boréale ----------
  async givre(g, T, EX, EZ, ups, low) {
    cliffs(g, EX, EZ, '#cfe6f6', '#9fc6e6', { h: 8, s0: 1.35, n: 24, spikes: true });
    const ice = glow('#bfefff', 0.35, { transparent: true, opacity: 0.85, roughness: 0.1 });
    for (const p of ring(EX, EZ, low ? 8 : 12, 1.22, 1.4, 0.06)) {
      const grp = new THREE.Group();
      for (let k = 0; k < 3; k++) { const s = 0.6 + Math.random() * 1.1, m = new THREE.Mesh(new THREE.OctahedronGeometry(s, 0), ice); m.scale.y = 3 + Math.random() * 2; m.position.set((Math.random() - 0.5) * 2, s * 2, (Math.random() - 0.5) * 2); m.rotation.z = (Math.random() - 0.5) * 0.6; grp.add(m); }
      grp.position.set(p.x, -0.4, p.z); g.add(grp);
    }
    await bigProps(g, ['PineTree_Snow_1', 'PineTree_Snow_3'], ring(EX, EZ, low ? 6 : 10, 1.45, 1.8, 0.08), { scale: [3, 4.5] });
    // aurore boréale
    const ribbons = [];
    for (let k = 0; k < (low ? 2 : 3); k++) {
      const geo = new THREE.PlaneGeometry(60, 9, 40, 1);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: ['#6fffb0', '#7fd8ff', '#c08aff'][k], transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.position.set(0, 16 + k * 3, -EZ * 1.9 - k * 4); g.add(m); ribbons.push({ m, base: geo.attributes.position.array.slice(), k });
    }
    ups.push((dt, t) => { for (const r of ribbons) { const a = r.m.geometry.attributes.position; for (let i = 0; i < a.count; i++) { const x = r.base[i * 3]; a.setZ(i, Math.sin(x * 0.15 + t * 0.6 + r.k) * 3); a.setY(i, r.base[i * 3 + 1] + Math.sin(x * 0.1 + t * 0.4) * 1.5); } a.needsUpdate = true; r.m.material.opacity = 0.16 + Math.sin(t * 0.7 + r.k) * 0.07; } });
    dragons(g, ups, [{ c: '#6fb8e8', b: '#eaf8ff', horns: true, s: 2.1, r: 23, h: 11, sp: 0.1, dir: -1 }]);
  },

  // ---------- Royaume des Ombres : paysage démoniaque ----------
  async ombre(g, T, EX, EZ, ups, low) {
    cliffs(g, EX, EZ, '#1e1828', '#2a1e38', { h: 9, s0: 1.4, n: 26, spikes: true });
    // pics d'obsidienne aux arêtes violettes
    const obs = flat('#14101c', { roughness: 0.3, metalness: 0.3 }), edge = glow('#b46bff', 1.4);
    for (const p of ring(EX, EZ, low ? 9 : 14, 1.22, 1.4, 0.07)) {
      const H = 3 + Math.random() * 5, m = new THREE.Mesh(new THREE.ConeGeometry(0.7 + Math.random() * 0.6, H, 4), obs); m.position.set(p.x, H / 2 - 0.4, p.z); m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4); g.add(m);
      const e = new THREE.Mesh(new THREE.ConeGeometry(0.12, H * 0.8, 4), edge); e.position.copy(m.position); e.rotation.copy(m.rotation); e.position.y += 0.2; g.add(e);
    }
    await bigProps(g, ['CommonTree_Dead_2', 'Willow_Dead_1'], ring(EX, EZ, low ? 5 : 8, 1.35, 1.6, 0.1), { tint: '#3a3048', scale: [3, 4.2] });
    // braseros de feu violet
    const fires = [];
    for (const p of ring(EX, EZ, 8, 1.16, 1.16, 0.02)) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.25, 1.4, 6), flat('#2a2234', { metalness: 0.5 })); b.position.set(p.x, 0.4, p.z); g.add(b);
      const f = glowSprite(0xb46bff, 1.3); f.position.set(p.x, 1.6, p.z); g.add(f); fires.push(f);
    }
    // tours gothiques en ruine aux fenêtres rouges
    for (const p of [{ x: -EX * 1.45, z: -EZ * 1.0 }, { x: EX * 1.5, z: -EZ * 1.05 }, { x: -EX * 0.6, z: -EZ * 1.6 }, { x: EX * 0.7, z: -EZ * 1.65 }]) {
      const H = 10 + Math.random() * 6, tw = new THREE.Group();
      { const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.9, H, 7), flat('#2e2638')); m.position.y = H / 2 - 2; tw.add(m); }
      { const m = new THREE.Mesh(new THREE.ConeGeometry(2, 4.5, 7), flat('#1a1424')); m.position.y = H + 0.2; tw.add(m); }
      for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.8, 0.1), glow('#ff3a4a', 2)); w.position.set(0, 2 + k * 2.6, 1.6); tw.add(w); }
      tw.position.set(p.x, 0, p.z); tw.rotation.y = Math.atan2(-p.x, -p.z); g.add(tw);
    }
    // lune rouge
    const moon = new THREE.Mesh(new THREE.CircleGeometry(5, 40), new THREE.MeshBasicMaterial({ color: '#ff5a5a', fog: false })); moon.position.set(EX * 0.9, 22, -EZ * 2.6); g.add(moon);
    const halo = glowSprite(0xff3a3a, 22); halo.position.copy(moon.position); halo.material.opacity = 0.5; g.add(halo);
    // âmes errantes
    const wisps = [];
    for (let k = 0; k < (low ? 6 : 12); k++) { const w = glowSprite(0xc08aff, 0.9); g.add(w); wisps.push({ w, a: Math.random() * 6.28, r: EX * (1.1 + Math.random() * 0.3), h: 1 + Math.random() * 4, sp: 0.1 + Math.random() * 0.2 }); }
    ups.push((dt, t) => {
      fires.forEach((f, i) => f.scale.setScalar(2 + Math.sin(t * 11 + i * 2) * 0.3));
      wisps.forEach(o => { o.a += o.sp * dt; o.w.position.set(Math.cos(o.a) * o.r, o.h + Math.sin(t * 2 + o.a) * 0.6, Math.sin(o.a) * o.r * EZ / EX); });
      halo.material.opacity = 0.45 + Math.sin(t * 0.8) * 0.08;
    });
    flock(g, ups, { n: low ? 10 : 22, color: '#120c18', r: 18, h: 9, sp: 0.5, size: 0.55 });
    dragons(g, ups, [{ c: '#2a1e3a', b: '#c08aff', horns: true, s: 2.3, r: 24, h: 12, sp: 0.09, dir: 1 }]);
  },
};

export async function buildSurroundings(group, T, key, EX, EZ, { low = false } = {}) {
  const ups = [];
  abyss(group, T, EX, EZ, ups);
  const f = BUILDERS[key] || BUILDERS.aurore;
  const extra = (await f(group, T, EX, EZ, ups, low)) || {};
  return { update(dt, t) { for (const u of ups) u(dt, t); }, cheer: extra.cheer || (() => {}) };
}
