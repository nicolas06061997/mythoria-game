// MYTHORIA — l'Arène des Failles : gradins de pierre autour de l'île, public animé qui réagit,
// piliers, torches, bannières, grande porte, faille lumineuse sous l'île, dragons qui volent autour.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { buildProc, glowSprite, glowTexture } from './procedural.js';

const DRAGON_COL = {
  aurore: ['#e8b04a', '#fff0b8'], sylve: ['#4caf6a', '#d8ffb0'], arcane: ['#8a5ad8', '#e0d0ff'],
  braise: ['#c4263c', '#ffcf70'], givre: ['#6fb8e8', '#eaf8ff'], ombre: ['#3a2a50', '#c08aff'],
};
const CROWD = ['#d84a4a', '#3d8ad8', '#e8c040', '#5ab85a', '#a060d0', '#e08a40', '#f0f0f0', '#4a4a5a'];

// Ellipse de l'île (doit correspondre à world.js)
export function buildArena(group, T, key, EX, EZ, { low = false } = {}) {
  const ups = [];
  const A0 = Math.PI * 0.80, A1 = Math.PI * 2.20; // gradins en fer à cheval, ouverts vers la caméra
  const TIERS = 5, S0 = 1.13, DS = 0.11, H = 0.85, Y0 = -0.35, SEG = 72;
  const P = (s, a) => [Math.cos(a) * EX * s, Math.sin(a) * EZ * s];

  // ---------- Gradins ----------
  const pos = [], col = [], idx = [];
  const c1 = new THREE.Color(T.rock), c2 = new THREE.Color(T.rock2), cTop = new THREE.Color(T.path);
  const quad = (a, b, c, d, color) => { const n = pos.length / 3; for (const v of [a, b, c, d]) { pos.push(...v); col.push(color.r, color.g, color.b); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  for (let k = 0; k < TIERS; k++) {
    const si = S0 + k * DS, so = si + DS, y = Y0 + (k + 1) * H, yb = Y0 + k * H;
    const ctop = cTop.clone().lerp(c1, 0.35 + (k % 2) * 0.25), crise = c1.clone().lerp(c2, k / TIERS);
    for (let i = 0; i < SEG; i++) {
      const a = A0 + (A1 - A0) * i / SEG, b = A0 + (A1 - A0) * (i + 1) / SEG;
      const [xa, za] = P(si, a), [xb, zb] = P(si, b), [xa2, za2] = P(so, a), [xb2, zb2] = P(so, b);
      quad([xa, y, za], [xa2, y, za2], [xb2, y, zb2], [xb, y, zb], ctop);   // marche
      quad([xa, yb, za], [xa, y, za], [xb, y, zb], [xb, yb, zb], crise);    // contremarche
    }
  }
  // mur extérieur
  const sw = S0 + TIERS * DS, yTop = Y0 + TIERS * H;
  for (let i = 0; i < SEG; i++) {
    const a = A0 + (A1 - A0) * i / SEG, b = A0 + (A1 - A0) * (i + 1) / SEG;
    const [xa, za] = P(sw, a), [xb, zb] = P(sw, b);
    quad([xa, yTop, za], [xa, yTop + 1.4, za], [xb, yTop + 1.4, zb], [xb, yTop, zb], c2);
    quad([xa, Y0 - 6, za], [xa, yTop, za], [xb, yTop, zb], [xb, Y0 - 6, zb], c2.clone().multiplyScalar(0.7)); // dessous
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const stands = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  stands.receiveShadow = true; group.add(stands);

  // ---------- Public (une seule géométrie instanciée : rapide sur téléphone) ----------
  const body = new THREE.CylinderGeometry(0.2, 0.26, 0.55, 6); body.translate(0, 0.27, 0);
  const head = new THREE.SphereGeometry(0.2, 7, 5); head.translate(0, 0.74, 0);
  const pg = mergeGeometries([body, head]);
  const spots = [];
  for (let k = 0; k < TIERS; k++) {
    const s = S0 + k * DS + DS * 0.5, n = Math.round((low ? 34 : 60) * (1 + k * 0.12));
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.12) continue;
      const a = A0 + (A1 - A0) * (i + Math.random() * 0.6) / n, [x, z] = P(s, a);
      spots.push({ x, z, y: Y0 + (k + 1) * H, ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 0.8, ry: Math.atan2(-x, -z) });
    }
  }
  const crowd = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), cc = new THREE.Color();
  spots.forEach((s, i) => { crowd.setColorAt(i, cc.set(CROWD[Math.floor(Math.random() * CROWD.length)])); });
  crowd.instanceColor.needsUpdate = true;
  group.add(crowd);
  let cheer = 0;
  ups.push((dt, t) => {
    cheer = Math.max(0, cheer - dt * 0.6);
    for (let i = 0; i < spots.length; i++) {
      const s = spots[i], jump = Math.max(0, Math.sin(t * (4 + cheer * 6) * s.sp + s.ph)) * (0.05 + cheer * 0.35);
      e.set(0, s.ry, 0); q.setFromEuler(e); v.set(s.x, s.y + jump, s.z); m4.compose(v, q, one); crowd.setMatrixAt(i, m4);
    }
    crowd.instanceMatrix.needsUpdate = true;
  });

  // ---------- Piliers, torches, bannières ----------
  const stone = new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true }), gold = new THREE.MeshStandardMaterial({ color: '#d8a83a', metalness: 0.5, roughness: 0.4, flatShading: true });
  const banCol = { aurore: '#e8b84a', sylve: '#4caf6a', arcane: '#8a6ad8', braise: '#d8402a', givre: '#7fc8f0', ombre: '#6a3a9a' }[key] || '#e8b84a';
  const banMat = new THREE.MeshStandardMaterial({ color: banCol, side: THREE.DoubleSide, flatShading: true });
  const torches = [], banners = [];
  const NP = 12;
  for (let i = 0; i <= NP; i++) {
    const a = A0 + (A1 - A0) * i / NP, [x, z] = P(sw + 0.02, a);
    const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 3.2, 8), stone); pil.position.set(x, yTop + 1.6, z); pil.castShadow = true; group.add(pil);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.3, 8), gold); cap.position.set(x, yTop + 3.3, z); group.add(cap);
    const fire = glowSprite(0xff9a3d, 1.6); fire.position.set(x, yTop + 3.9, z); group.add(fire); torches.push(fire);
    if (i < NP) {
      const a2 = A0 + (A1 - A0) * (i + 0.5) / NP, [bx, bz] = P(sw - 0.01, a2);
      const ban = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2, 1, 4), banMat); ban.position.set(bx, yTop + 0.3, bz); ban.rotation.y = Math.atan2(-bx, -bz); group.add(ban); banners.push(ban);
    }
  }
  ups.push((dt, t) => {
    torches.forEach((f, i) => f.scale.setScalar(1.4 + Math.sin(t * 13 + i * 2) * 0.15 + Math.sin(t * 7 + i) * 0.1));
    banners.forEach((b, i) => { b.rotation.z = Math.sin(t * 1.6 + i) * 0.05; });
  });
  // braises des torches
  if (!low) {
    const n = torches.length * 4, eg = new THREE.BufferGeometry(), ep = new Float32Array(n * 3), base = [];
    for (let i = 0; i < n; i++) { const tch = torches[i % torches.length].position; base.push(tch.clone()); ep.set([tch.x, tch.y, tch.z], i * 3); }
    eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
    const em = new THREE.Points(eg, new THREE.PointsMaterial({ size: 0.18, map: glowTexture(), color: '#ffb05a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    group.add(em);
    const life = base.map(() => Math.random());
    ups.push(dt => { for (let i = 0; i < n; i++) { life[i] += dt * 0.7; if (life[i] > 1) life[i] = 0; ep[i * 3] = base[i].x + Math.sin(i + life[i] * 3) * 0.2; ep[i * 3 + 1] = base[i].y + life[i] * 2.2; ep[i * 3 + 2] = base[i].z; } eg.attributes.position.needsUpdate = true; });
  }

  // ---------- Grande porte au fond ----------
  const gate = new THREE.Group(), [gx, gz] = P(sw + 0.05, Math.PI * 1.5);
  gate.position.set(gx, yTop, gz);
  for (const s of [-1, 1]) {
    const tw = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 6, 8), stone); tw.position.set(s * 3, 3, 0); tw.castShadow = true; gate.add(tw);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 8), new THREE.MeshStandardMaterial({ color: banCol, flatShading: true })); roof.position.set(s * 3, 7.1, 0); gate.add(roof);
    const f = glowSprite(0xff9a3d, 2); f.position.set(s * 3, 6.2, 1.2); gate.add(f); torches.push(f);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.45, 6, 16, Math.PI), stone); arch.position.set(0, 3.6, 0); gate.add(arch);
  const lint = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.8, 1.4), stone); lint.position.set(0, 6.3, 0); gate.add(lint);
  const emblem = glowSprite(new THREE.Color(banCol), 3.4); emblem.position.set(0, 4.2, 0.4); gate.add(emblem);
  ups.push((dt, t) => { emblem.material.opacity = 0.6 + Math.sin(t * 2) * 0.25; });
  group.add(gate);

  // ---------- Faille lumineuse sous l'île ----------
  const riftG = new THREE.RingGeometry(0.98, S0 + 0.02, 64, 1); riftG.scale(EX, EZ, 1);
  const rift = new THREE.Mesh(riftG, new THREE.MeshBasicMaterial({ color: T.partCol, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  rift.rotation.x = -Math.PI / 2; rift.position.y = -1.6; group.add(rift);
  ups.push((dt, t) => { rift.material.opacity = 0.25 + Math.sin(t * 1.3) * 0.1; });

  // ---------- Gouffre sous l'île (plus de vide) ----------
  const pit = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.rock2).multiplyScalar(0.45), fog: true }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = -11; group.add(pit);
  const pitGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: T.partCol, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  pitGlow.scale.set(EX * 1.4, EZ * 1.4, 1); pitGlow.rotation.x = -Math.PI / 2; pitGlow.position.y = -10.8; group.add(pitGlow);
  ups.push((dt, t) => { pitGlow.material.opacity = 0.14 + Math.sin(t * 0.9) * 0.06; });

  // ---------- Dragons qui volent autour de l'arène ----------
  const [dc, db] = DRAGON_COL[key] || DRAGON_COL.aurore;
  const dragons = [];
  for (let i = 0; i < (low ? 1 : 2); i++) {
    const d = buildProc('dragon', { color: dc, belly: db, horns: i === 0 });
    d.root.scale.setScalar(i ? 1.6 : 2.4); d.play('run'); group.add(d.root);
    dragons.push({ d, r: i ? 19 : 23, h: i ? 7.5 : 10, sp: i ? 0.16 : 0.11, ph: i * 2.6, dir: i ? -1 : 1 });
  }
  ups.push((dt, t) => {
    for (const o of dragons) {
      const a = o.ph + t * o.sp * o.dir, x = Math.cos(a) * o.r, z = Math.sin(a) * o.r * 0.75 - 8, y = o.h + Math.sin(t * 0.7 + o.ph) * 1.5;
      o.d.root.position.set(x, y, z);
      o.d.root.rotation.y = Math.atan2(-Math.sin(a) * o.dir, Math.cos(a) * 0.8 * o.dir);
      o.d.root.rotation.z = -0.25 * o.dir;
      o.d.update(dt);
    }
  });

  return {
    update(dt, t) { for (const u of ups) u(dt, t); },
    cheer(k = 1) { cheer = Math.min(1.5, cheer + k); },
  };
}
