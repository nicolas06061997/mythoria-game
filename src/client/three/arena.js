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
export function buildArena(group, T, key, EX, EZ, { low = false, noPit = false } = {}) {
  const ups = [];
  const A0 = Math.PI * 0.80, A1 = Math.PI * 2.20; // gradins en fer à cheval, ouverts vers la caméra
  const TIERS = 5, S0 = 1.13, DS = 0.11, H = 0.85, Y0 = -0.35, SEG = 72;
  const P = (s, a) => [Math.cos(a) * EX * s, Math.sin(a) * EZ * s];

  // ---------- Gradins : marches de pierre, sièges colorés par tribune, allées, muret avant ----------
  const pos = [], col = [], idx = [];
  const c1 = new THREE.Color(T.rock), c2 = new THREE.Color(T.rock2), cTop = new THREE.Color(T.path);
  const SEATS = { aurore: ['#c0392b', '#2e6fb8', '#d9a520'], sylve: ['#3f8a4a', '#8a5a2e', '#c9a43a'], arcane: ['#6a4ab8', '#3a5ab8', '#b88ad8'], braise: ['#a8321e', '#5a2a1a', '#d8762a'], givre: ['#4a8ac0', '#d8e8f4', '#2a5a8a'], ombre: ['#4a2a6a', '#2a1a3a', '#8a2a4a'] }[key] || ['#c0392b', '#2e6fb8', '#d9a520'];
  const seatC = SEATS.map(x => new THREE.Color(x)), wood = new THREE.Color('#7a5232');
  const quad = (a, b, c, d, color) => { const n = pos.length / 3; for (const v of [a, b, c, d]) { pos.push(...v); col.push(color.r, color.g, color.b); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  const SECT = 12, aisle = i => i % SECT === 0; // une allée (escalier) tous les 12 morceaux
  for (let k = 0; k < TIERS; k++) {
    const si = S0 + k * DS, so = si + DS, y = Y0 + (k + 1) * H, yb = Y0 + k * H;
    const ctop = cTop.clone().lerp(c1, 0.45), crise = c1.clone().lerp(c2, 0.3 + k / TIERS * 0.4);
    for (let i = 0; i < SEG; i++) {
      const a = A0 + (A1 - A0) * i / SEG, b = A0 + (A1 - A0) * (i + 1) / SEG;
      const [xa, za] = P(si, a), [xb, zb] = P(si, b), [xa2, za2] = P(so, a), [xb2, zb2] = P(so, b);
      const vr = 0.92 + ((i * 7 + k * 13) % 5) * 0.035;
      if (aisle(i)) { // escalier : petites marches plus claires
        for (let st = 0; st < 3; st++) { const y0 = yb + H * st / 3, y1 = yb + H * (st + 1) / 3, s0 = si + DS * st / 3, s1 = si + DS * (st + 1) / 3; const [p0x, p0z] = P(s0, a), [p1x, p1z] = P(s0, b), [q0x, q0z] = P(s1, a), [q1x, q1z] = P(s1, b); const cs = cTop.clone().multiplyScalar(0.95 - st * 0.04); quad([p0x, y1, p0z], [q0x, y1, q0z], [q1x, y1, q1z], [p1x, y1, p1z], cs); quad([p0x, y0, p0z], [p0x, y1, p0z], [p1x, y1, p1z], [p1x, y0, p1z], cs.clone().multiplyScalar(0.8)); }
        continue;
      }
      quad([xa, y, za], [xa2, y, za2], [xb2, y, zb2], [xb, y, zb], ctop.clone().multiplyScalar(vr));
      quad([xa, yb, za], [xa, y, za], [xb, y, zb], [xb, yb, zb], crise.clone().multiplyScalar(vr * (i % 2 ? 0.93 : 1)));
      // banc (siège coloré selon la tribune) posé sur la marche
      const sc = seatC[Math.floor(i / SECT) % seatC.length].clone().multiplyScalar(0.9 + (i % 2) * 0.1);
      const sb0 = si + DS * 0.08, sb1 = si + DS * 0.42, yS = y + 0.2;
      const [ua, wa] = P(sb0, a), [ub, wb] = P(sb0, b), [ua2, wa2] = P(sb1, a), [ub2, wb2] = P(sb1, b);
      quad([ua, yS, wa], [ua2, yS, wa2], [ub2, yS, wb2], [ub, yS, wb], sc);
      quad([ua, y, wa], [ua, yS, wa], [ub, yS, wb], [ub, y, wb], sc.clone().lerp(wood, 0.5).multiplyScalar(0.75));
    }
  }
  // muret avant (entre le terrain et les gradins), avec chaperon clair
  for (let i = 0; i < SEG; i++) {
    const a = A0 + (A1 - A0) * i / SEG, b = A0 + (A1 - A0) * (i + 1) / SEG;
    const [xa, za] = P(S0 - 0.012, a), [xb, zb] = P(S0 - 0.012, b), [xa2, za2] = P(S0 + 0.012, a), [xb2, zb2] = P(S0 + 0.012, b), yW = Y0 + H + 0.45;
    quad([xa, Y0 - 0.5, za], [xa, yW, za], [xb, yW, zb], [xb, Y0 - 0.5, zb], c2.clone().multiplyScalar(i % 2 ? 0.9 : 1));
    quad([xa, yW, za], [xa2, yW, za2], [xb2, yW, zb2], [xb, yW, zb], cTop);
  }
  // mur extérieur
  const sw = S0 + TIERS * DS, yTop = Y0 + TIERS * H;
  for (let i = 0; i < SEG; i++) {
    const a = A0 + (A1 - A0) * i / SEG, b = A0 + (A1 - A0) * (i + 1) / SEG;
    const [xa, za] = P(sw, a), [xb, zb] = P(sw, b);
    quad([xa, yTop, za], [xa, yTop + 1.4, za], [xb, yTop + 1.4, zb], [xb, yTop, zb], c2);
    if (i % 2 === 0) { const [xm, zm] = P(sw, (a + b) / 2); quad([xa, yTop + 1.4, za], [xa, yTop + 1.9, za], [xm, yTop + 1.9, zm], [xm, yTop + 1.4, zm], c2.clone().multiplyScalar(0.9)); } // créneaux
    quad([xa, Y0 - 6, za], [xa, yTop, za], [xb, yTop, zb], [xb, Y0 - 6, zb], c2.clone().multiplyScalar(0.7));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  const stands = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95, side: THREE.DoubleSide }));
  stands.receiveShadow = true; group.add(stands);
  // boucliers peints sur le muret avant
  {
    const n = 22, sh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.32, 6), new THREE.MeshStandardMaterial({ color: '#fff', flatShading: true, metalness: 0.3, roughness: 0.5 }), n);
    const o = new THREE.Object3D(), cc = new THREE.Color();
    for (let i = 0; i < n; i++) { const a = A0 + (A1 - A0) * (i + 0.5) / n, [x, z] = P(S0 - 0.02, a); o.position.set(x, Y0 + H * 0.75, z); o.lookAt(0, Y0 + H * 0.75, 0); o.updateMatrix(); sh.setMatrixAt(i, o.matrix); sh.setColorAt(i, cc.set(i % 2 ? SEATS[0] : '#e8c060')); }
    group.add(sh);
  }

  // ---------- Loge royale (au fond, au centre) ----------
  const ROY = Math.PI * 1.5, royW = 0.11; // angle et demi-largeur (en radians)
  {
    const box = new THREE.Group(), [rx, rz] = P(S0 + DS * 2.6, ROY);
    box.position.set(rx, Y0 + H * 3, rz); box.rotation.y = Math.atan2(-rx, -rz);
    const goldM = new THREE.MeshStandardMaterial({ color: '#e0b040', metalness: 0.6, roughness: 0.35, flatShading: true });
    const redM = new THREE.MeshStandardMaterial({ color: SEATS[0], flatShading: true, side: THREE.DoubleSide });
    const fl = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.3, 2.2), new THREE.MeshStandardMaterial({ color: T.path, flatShading: true })); fl.position.y = 0.1; box.add(fl);
    for (const x of [-1.9, 1.9]) for (const z of [-0.9, 0.9]) { const po = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 6), goldM); po.position.set(x, 1.3, z); box.add(po); }
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 1.3, 4, 1, true), redM); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.6); roof.position.y = 3.1; box.add(roof);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), goldM); tip.position.y = 3.85; box.add(tip);
    const thr = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.3, 0.25), goldM); thr.position.set(0, 0.9, -0.6); box.add(thr);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.6), redM); seat.position.set(0, 0.55, -0.35); box.add(seat);
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 0.9), redM); drape.position.set(0, -0.35, 1.12); box.add(drape);
    const em = glowSprite(0xffd46a, 1.6); em.position.set(0, -0.35, 1.2); em.material.opacity = 0.6; box.add(em);
    group.add(box);
  }

  // ---------- Public : petits spectateurs (corps, tête, cheveux/chapeau, bras qui se lèvent) ----------
  const SKIN = ['#f3cfac', '#e2b08a', '#c88d5e', '#9a6440', '#6e4630', '#ffe0c8'];
  const HAIR = ['#2a1a10', '#5a3a1a', '#c89040', '#e8d070', '#8a2a1a', '#222222', '#ffffff'];
  const CLOTH = ['#d84a4a', '#3d8ad8', '#e8c040', '#5ab85a', '#a060d0', '#e08a40', '#f0f0f0', '#4a4a5a', '#2ab0a0', '#e86aa0'];
  const gBody = new THREE.CylinderGeometry(0.15, 0.21, 0.42, 7); gBody.translate(0, 0.21, 0);
  const gHead = new THREE.SphereGeometry(0.15, 8, 6); gHead.translate(0, 0.57, 0);
  const gHair = new THREE.SphereGeometry(0.162, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55); gHair.translate(0, 0.6, -0.01);
  const gHat = new THREE.ConeGeometry(0.17, 0.26, 7); gHat.translate(0, 0.78, 0);
  const armA = new THREE.BoxGeometry(0.075, 0.3, 0.075); armA.translate(-0.2, -0.15, 0); const armB = armA.clone(); armB.translate(0.4, 0, 0);
  const gArms = mergeGeometries([armA, armB]);
  const spots = [];
  for (let k = 0; k < TIERS; k++) {
    const s = S0 + k * DS + DS * 0.3, n = Math.round((low ? 44 : 76) * (1 + k * 0.12));
    for (let i = 0; i < n; i++) {
      if (Math.random() < 0.1) continue;
      const a = A0 + (A1 - A0) * (i + 0.2 + Math.random() * 0.6) / n, seg = Math.floor((a - A0) / (A1 - A0) * SEG);
      if (aisle(seg)) continue; if (k >= 1 && k <= 4 && Math.abs(a - ROY) < royW * 1.25) continue;
      const [x, z] = P(s, a);
      spots.push({ x, z, y: Y0 + (k + 1) * H + 0.2, ph: Math.random() * 6.28, sp: 0.8 + Math.random() * 0.8, ry: Math.atan2(-x, -z), hat: Math.random() < 0.18, fan: Math.random() < 0.3 });
    }
  }
  const N = spots.length, std = c => new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  const mBody = new THREE.InstancedMesh(gBody, std(), N), mHead = new THREE.InstancedMesh(gHead, std(), N), mHair = new THREE.InstancedMesh(gHair, std(), N), mArms = new THREE.InstancedMesh(gArms, std(), N);
  const hats = spots.filter(s => s.hat), mHat = new THREE.InstancedMesh(gHat, std(), Math.max(1, hats.length)); mHat.count = hats.length;
  const cc = new THREE.Color();
  spots.forEach((s, i) => { const cl = CLOTH[Math.floor(Math.random() * CLOTH.length)]; mBody.setColorAt(i, cc.set(cl)); mArms.setColorAt(i, cc.set(cl).multiplyScalar(0.85)); mHead.setColorAt(i, cc.set(SKIN[Math.floor(Math.random() * SKIN.length)])); mHair.setColorAt(i, cc.set(HAIR[Math.floor(Math.random() * HAIR.length)])); });
  hats.forEach((s, i) => mHat.setColorAt(i, cc.set(SEATS[i % SEATS.length])));
  for (const m of [mBody, mHead, mHair, mArms, mHat]) { if (m.instanceColor) m.instanceColor.needsUpdate = true; m.castShadow = false; group.add(m); }
  // drapeaux agités par quelques fans
  const fans = spots.filter(s => s.fan && !low).slice(0, 40);
  const flagG = new THREE.BufferGeometry(); flagG.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0.9, 0, 0.02, 0.9, 0, 0, 0.9, 0, 0.42, 0.78, 0, 0, 0.62, 0], 3)); flagG.computeVertexNormals();
  const mFlag = new THREE.InstancedMesh(flagG, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, flatShading: true }), Math.max(1, fans.length)); mFlag.count = fans.length;
  fans.forEach((s, i) => mFlag.setColorAt(i, cc.set(i % 3 ? SEATS[i % SEATS.length] : '#ffffff'))); if (mFlag.instanceColor) mFlag.instanceColor.needsUpdate = true; group.add(mFlag);
  const m4 = new THREE.Matrix4(), m5 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), one = new THREE.Vector3(1.22, 1.22, 1.22), sh = new THREE.Vector3();
  let cheer = 0, frame = 0;
  ups.push((dt, t) => {
    cheer = Math.max(0, cheer - dt * 0.6);
    if ((frame++ & 1) && cheer < 0.05) return; // public calme : mis à jour une image sur deux (plus léger)
    let hi = 0, fi = 0;
    for (let i = 0; i < N; i++) {
      const s = spots[i], w = Math.sin(t * (3.5 + cheer * 6) * s.sp + s.ph), jump = Math.max(0, w) * (0.03 + cheer * 0.32);
      e.set(0, s.ry, 0); q.setFromEuler(e); v.set(s.x, s.y + jump, s.z); m4.compose(v, q, one);
      mBody.setMatrixAt(i, m4); mHead.setMatrixAt(i, m4); mHair.setMatrixAt(i, m4);
      if (s.hat) mHat.setMatrixAt(hi++, m4);
      // bras : levés quand le public crie, sinon ils bougent un peu
      const up = Math.min(2.9, 0.25 + cheer * 2.6 + (s.fan ? 1.6 : 0) + Math.max(0, w) * 0.5);
      e.set(-up, s.ry, 0, 'YXZ'); q.setFromEuler(e); sh.set(s.x, s.y + jump + 0.46, s.z); m5.compose(sh, q, one); mArms.setMatrixAt(i, m5);
      if (s.fan && fi < fans.length && fans[fi] === s) { e.set(Math.sin(t * 5 + s.ph) * 0.35, s.ry + 1.2, 0, 'YXZ'); q.setFromEuler(e); sh.set(s.x + Math.cos(s.ry) * 0.2, s.y + jump + 0.67, s.z - Math.sin(s.ry) * 0.2); m5.compose(sh, q, one); mFlag.setMatrixAt(fi++, m5); }
    }
    for (const m of [mBody, mHead, mHair, mArms, mHat, mFlag]) m.instanceMatrix.needsUpdate = true;
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
  // guirlandes de fanions colorés entre les piliers (ambiance de tournoi)
  {
    const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.Float32BufferAttribute([-0.18, 0, 0, 0.18, 0, 0, 0, -0.42, 0], 3)); tri.computeVertexNormals();
    const per = 9, flags = new THREE.InstancedMesh(tri, new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide, flatShading: true }), NP * per);
    const o = new THREE.Object3D(), fc = new THREE.Color(), FC = [banCol, '#ffffff', '#d84a4a', '#3d8ad8', '#e8c040'];
    let m = 0; const ropePts = [];
    for (let i = 0; i < NP; i++) {
      const a0 = A0 + (A1 - A0) * i / NP, a1 = A0 + (A1 - A0) * (i + 1) / NP, [x0, z0] = P(sw + 0.02, a0), [x1, z1] = P(sw + 0.02, a1);
      for (let j = 0; j < per; j++) {
        const t = (j + 0.5) / per, x = x0 + (x1 - x0) * t, z = z0 + (z1 - z0) * t, y = yTop + 3.0 - Math.sin(t * Math.PI) * 0.9;
        o.position.set(x, y, z); o.rotation.set(0, Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, 0); o.updateMatrix(); flags.setMatrixAt(m, o.matrix); flags.setColorAt(m, fc.set(FC[(i + j) % FC.length])); m++;
      }
      for (let j = 0; j <= 8; j++) { const t = j / 8; ropePts.push(new THREE.Vector3(x0 + (x1 - x0) * t, yTop + 3.0 - Math.sin(t * Math.PI) * 0.9, z0 + (z1 - z0) * t)); }
    }
    group.add(flags);
    const rope = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ropePts), new THREE.LineBasicMaterial({ color: '#3a2a1a' })); group.add(rope);
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

  if (!noPit) {
  // ---------- Faille lumineuse sous l'île ----------
  const riftG = new THREE.RingGeometry(0.98, S0 + 0.02, 64, 1); riftG.scale(EX, EZ, 1);
  const rift = new THREE.Mesh(riftG, new THREE.MeshBasicMaterial({ color: T.partCol, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  rift.rotation.x = -Math.PI / 2; rift.position.y = -1.6; group.add(rift);
  ups.push((dt, t) => { rift.material.opacity = 0.25 + Math.sin(t * 1.3) * 0.1; });

  }
  if (!noPit) {
  // ---------- Gouffre sous l'île (plus de vide) ----------
  const pit = new THREE.Mesh(new THREE.CircleGeometry(90, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(T.rock2).multiplyScalar(0.45), fog: true }));
  pit.rotation.x = -Math.PI / 2; pit.position.y = -11; group.add(pit);
  const pitGlow = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: T.partCol, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
  pitGlow.scale.set(EX * 1.4, EZ * 1.4, 1); pitGlow.rotation.x = -Math.PI / 2; pitGlow.position.y = -10.8; group.add(pitGlow);
  ups.push((dt, t) => { pitGlow.material.opacity = 0.14 + Math.sin(t * 0.9) * 0.06; });

  }
  if (!noPit) {
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

  }
  return {
    update(dt, t) { for (const u of ups) u(dt, t); },
    cheer(k = 1) { cheer = Math.min(1.5, cheer + k); },
  };
}
