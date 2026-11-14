// MYTHORIA — Royaume vivant : sol détaillé, cascades, fumée, étincelles, villageois, oiseaux, pastilles d'amélioration.
import * as THREE from 'three';
import { glowTexture } from './procedural.js';

const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();

// Texture du dessus de l'île : herbe riche, fleurs, chemins pavés vers chaque bâtiment, place centrale
export function islandGroundTexture(T, spots, R = 9.4) {
  const N = 1024, c = document.createElement('canvas'); c.width = c.height = N; const g = c.getContext('2d');
  const P = (x, z) => [(x / R + 1) / 2 * N, (z / R + 1) / 2 * N], s = N / (2 * R);
  let q = 17; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  g.fillStyle = T.ground; g.fillRect(0, 0, N, N);
  for (let i = 0; i < 260; i++) { const x = r() * N, y = r() * N, rr = 30 + r() * 110, gr = g.createRadialGradient(x, y, 0, x, y, rr), col = r() < 0.5 ? shade(T.ground, 0.82) : shade(T.ground, 1.15); gr.addColorStop(0, col + 'aa'); gr.addColorStop(1, col + '00'); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 22000; i++) { const x = r() * N, y = r() * N, l = 3 + r() * 4, a = -Math.PI / 2 + (r() - 0.5) * 0.9; g.strokeStyle = r() < 0.5 ? shade(T.ground, 1.3) : shade(T.ground, 0.7); g.globalAlpha = 0.5; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 1;
  for (let i = 0; i < 700; i++) { g.fillStyle = ['#fff6d0', '#ffd24a', '#ff8fb0', '#b8a0ff', '#ffffff', '#ff6a5a'][Math.floor(r() * 6)]; g.beginPath(); g.arc(r() * N, r() * N, 1.5 + r() * 1.5, 0, 7); g.fill(); }
  // chemins pavés (courbes douces de la place vers chaque bâtiment)
  const [cx, cz] = spots.chateau, plaza = [cx, cz + 2.4];
  const paths = Object.entries(spots).filter(([id]) => id !== 'chateau').map(([, p]) => p);
  g.lineCap = 'round';
  for (const [x, z] of paths) {
    const a = P(...plaza), b = P(x, z), m = P((plaza[0] + x) / 2 + (z - plaza[1]) * 0.12, (plaza[1] + z) / 2 - (x - plaza[0]) * 0.12);
    for (const [lw, col] of [[1.25, shade(T.path, 0.62)], [0.95, shade(T.path, 0.9)]]) { g.strokeStyle = col; g.lineWidth = lw * s; g.beginPath(); g.moveTo(...a); g.quadraticCurveTo(...m, ...b); g.stroke(); }
    for (let t = 0; t <= 1; t += 0.012) { const u = 1 - t, px = u * u * a[0] + 2 * u * t * m[0] + t * t * b[0], py = u * u * a[1] + 2 * u * t * m[1] + t * t * b[1];
      for (let k = 0; k < 2; k++) { const ox = (r() - 0.5) * 0.7 * s, oy = (r() - 0.5) * 0.7 * s, rr = (0.12 + r() * 0.08) * s; g.fillStyle = shade(T.path, 0.85 + r() * 0.3); g.strokeStyle = shade(T.path, 0.55); g.lineWidth = 1; g.beginPath(); g.ellipse(px + ox, py + oy, rr, rr * 0.8, r() * 3, 0, 7); g.fill(); g.stroke(); } }
  }
  // place pavée devant le château
  const [px, pz] = P(...plaza);
  g.fillStyle = shade(T.path, 0.7); g.beginPath(); g.arc(px, pz, 2.1 * s, 0, 7); g.fill();
  for (let ring = 0; ring < 5; ring++) { const rr = (0.4 + ring * 0.4) * s, n = 6 + ring * 7; for (let k = 0; k < n; k++) { const a0 = k / n * Math.PI * 2, a1 = (k + 1) / n * Math.PI * 2; g.fillStyle = shade(T.path, 0.85 + ((k + ring) % 3) * 0.08); g.beginPath(); g.arc(px, pz, rr + 0.38 * s, a0, a1); g.arc(px, pz, rr, a1, a0, true); g.closePath(); g.fill(); g.strokeStyle = shade(T.path, 0.55); g.lineWidth = 1.5; g.stroke(); } }
  // emplacements des bâtiments : terre battue
  for (const [x, z] of Object.values(spots)) { const [bx, bz] = P(x, z), gr = g.createRadialGradient(bx, bz, 0, bx, bz, 1.7 * s); gr.addColorStop(0, '#9a7a52'); gr.addColorStop(0.75, '#8a6a44cc'); gr.addColorStop(1, '#8a6a4400'); g.fillStyle = gr; g.beginPath(); g.arc(bx, bz, 1.7 * s, 0, 7); g.fill(); }
  // bord : herbe plus sombre
  const ed = g.createRadialGradient(N / 2, N / 2, N * 0.38, N / 2, N / 2, N / 2); ed.addColorStop(0, 'rgba(0,0,0,0)'); ed.addColorStop(1, 'rgba(10,30,0,.35)'); g.fillStyle = ed; g.fillRect(0, 0, N, N);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

// Dessous rocheux de l'île : couches de roche irrégulières + racines
export function islandRock(T, R = 9.2) {
  const g = new THREE.Group(), seg = 40, rings = 8, pos = [], col = [], idx = [];
  let q = 5; const r = () => ((q = (q * 16807) % 2147483647) / 2147483647);
  const c1 = new THREE.Color(T.rock), c2 = new THREE.Color(T.rock2 || T.rock).multiplyScalar(0.8), cg = new THREE.Color(T.ground).multiplyScalar(0.7);
  for (let i = 0; i <= rings; i++) {
    const k = i / rings, rad = i === 0 ? R : R * (1 - Math.pow(k, 1.4)) * 0.97 + 0.15, y = i === 0 ? -0.55 : -0.6 - k * k * 9.5;
    for (let j = 0; j < seg; j++) { const a = j / seg * Math.PI * 2, n = i === 0 ? 1 : 0.85 + r() * 0.3; pos.push(Math.cos(a) * rad * n, y + (i ? (r() - 0.5) * 0.5 : 0), Math.sin(a) * rad * n); const cc = i === 1 ? cg : c1.clone().lerp(c2, k + (r() - 0.5) * 0.2); col.push(cc.r, cc.g, cc.b); }
  }
  for (let i = 0; i < rings; i++) for (let j = 0; j < seg; j++) { const a = i * seg + j, b = i * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, c, b, b, c, d); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })); g.add(m);
  // racines qui pendent
  const rootM = new THREE.MeshStandardMaterial({ color: '#5a3e26', roughness: 1 });
  for (let i = 0; i < 14; i++) { const a = r() * Math.PI * 2, rr = R * (0.55 + r() * 0.35), len = 1.5 + r() * 2.5; const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.09, len, 4), rootM); rt.position.set(Math.cos(a) * rr, -1.6 - len / 2 - r(), Math.sin(a) * rr); rt.rotation.z = (r() - 0.5) * 0.5; g.add(rt); }
  // pointe rocheuse
  const tip = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 7), new THREE.MeshStandardMaterial({ color: c2, flatShading: true })); tip.rotation.x = Math.PI; tip.position.y = -11.5; g.add(tip);
  return g;
}

// Cascade qui tombe du bord de l'île (eau qui coule en continu) + brume en bas
export function waterfall(x, z, len = 9, w = 1.1) {
  const g = new THREE.Group();
  const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float t; varying vec2 vu;
      float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5); }
      float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
      void main(){ vec2 p = vec2(vu.x * 6.0, vu.y * 10.0 + t * 3.5); float s = n(p) * 0.6 + n(p * 2.3) * 0.4;
        float edge = smoothstep(0.0, 0.18, vu.x) * smoothstep(1.0, 0.82, vu.x);
        float a = edge * (0.55 + s * 0.45) * smoothstep(0.0, 0.25, vu.y);
        vec3 col = mix(vec3(0.55, 0.78, 0.95), vec3(1.0), smoothstep(0.55, 0.9, s));
        gl_FragColor = vec4(col * 1.15, min(1.0, a * 1.2)); }` });
  const geo = new THREE.PlaneGeometry(w, len, 1, 8); geo.translate(0, -len / 2, 0);
  // légère courbure vers l'extérieur
  const pa = geo.attributes.position; for (let i = 0; i < pa.count; i++) { const y = pa.getY(i); pa.setZ(i, Math.pow(-y / len, 1.6) * 1.2); }
  const m = new THREE.Mesh(geo, mat); g.add(m);
  const mist = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#eaf6ff', transparent: true, opacity: 0.6, depthWrite: false })); mist.scale.set(3.2, 2.2, 1); mist.position.set(0, -len + 0.2, 1.2); g.add(mist);
  g.position.set(x, -0.05, z); g.rotation.y = Math.atan2(x, z);
  // ruisseau sur l'île
  const stream = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.9, 1.6), mat); stream.rotation.x = -Math.PI / 2; stream.position.set(0, 0.06, -0.8); g.add(stream);
  g.userData.update = (dt, tt) => { mat.uniforms.t.value = tt; mist.material.opacity = 0.45 + Math.sin(tt * 2) * 0.12; };
  return g;
}

// Particules (fumée de cheminée, étincelles d'or…) attachées à un objet
export function emitter(parent, { n = 18, color = '#d8d8d8', size = 0.6, rise = 1.2, spread = 0.25, life = 3, additive = false, at = [0, 2, 0] }) {
  const geo = new THREE.BufferGeometry(), p = new Float32Array(n * 3), L = new Float32Array(n);
  for (let i = 0; i < n; i++) L[i] = Math.random() * life;
  geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  const mat = new THREE.PointsMaterial({ size, map: glowTexture(), color, transparent: true, opacity: additive ? 1 : 0.55, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
  const pts = new THREE.Points(geo, mat); parent.add(pts);
  const seeds = Array.from({ length: n }, () => [Math.random() - 0.5, Math.random() - 0.5]);
  return dt => {
    for (let i = 0; i < n; i++) { L[i] += dt; if (L[i] > life) L[i] = 0; const k = L[i] / life;
      p[i * 3] = at[0] + seeds[i][0] * spread * (1 + k * 3) + Math.sin(k * 6 + i) * 0.1; p[i * 3 + 1] = at[1] + k * rise * life; p[i * 3 + 2] = at[2] + seeds[i][1] * spread * (1 + k * 3); }
    geo.attributes.position.needsUpdate = true;
  };
}

// Petit villageois (corps, tête, bras, jambes) qui marche entre deux points
const SKIN = ['#f3cfac', '#e2b08a', '#c88d5e', '#9a6440'], CLOTH = ['#c0392b', '#2e6fb8', '#d9a520', '#3f8a4a', '#8a5ab8', '#a86a3a'];
export function villager(a, b, tool = false) {
  const g = new THREE.Group(), M = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.8 });
  const cloth = CLOTH[Math.floor(Math.random() * CLOTH.length)], skin = SKIN[Math.floor(Math.random() * SKIN.length)];
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 0.32, 7), M(cloth)); body.position.y = 0.42; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), M(skin)); head.position.y = 0.68; g.add(head);
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.14, 7), M(Math.random() < 0.5 ? '#6a4a2a' : '#e8d070')); hat.position.y = 0.8; g.add(hat);
  const legs = [-1, 1].map(s => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.06), M('#4a3a2a')); l.geometry.translate(0, -0.12, 0); l.position.set(s * 0.05, 0.27, 0); g.add(l); return l; });
  const arms = [-1, 1].map(s => { const l = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.22, 0.05), M(cloth)); l.geometry.translate(0, -0.11, 0); l.position.set(s * 0.14, 0.55, 0); g.add(l); return l; });
  if (tool) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.03), M('#6b4a2a')); t.position.set(0, -0.2, 0.06); arms[1].add(t); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.05), M('#9aa0aa')); hd.position.set(0, -0.36, 0.06); arms[1].add(hd); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  let u = Math.random(), dir = 1, pause = 0; const sp = 0.06 + Math.random() * 0.04;
  g.userData.update = (dt, t) => {
    if (pause > 0) { pause -= dt; legs.forEach(l => l.rotation.x = 0); arms[1].rotation.x = tool ? -1.2 + Math.abs(Math.sin(t * 5)) * 1.4 : 0; return; }
    u += dt * sp * dir; if (u > 1 || u < 0) { dir *= -1; u = Math.min(1, Math.max(0, u)); pause = 1.5 + Math.random() * 3; }
    g.position.set(a[0] + (b[0] - a[0]) * u, 0, a[1] + (b[1] - a[1]) * u);
    g.rotation.y = Math.atan2((b[0] - a[0]) * dir, (b[1] - a[1]) * dir);
    const w = Math.sin(t * 9); legs[0].rotation.x = w * 0.6; legs[1].rotation.x = -w * 0.6; arms[0].rotation.x = -w * 0.5; arms[1].rotation.x = w * 0.5; body.position.y = 0.42 + Math.abs(w) * 0.02;
  };
  return g;
}

// Pastille d'amélioration (flèche verte ↑ ou bouton +) au-dessus d'un emplacement
const BADGE = {};
function badgeTex(kind) {
  if (BADGE[kind]) return BADGE[kind];
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(56, 48, 8, 64, 64, 60); gr.addColorStop(0, '#9dff8a'); gr.addColorStop(0.6, '#3cc43a'); gr.addColorStop(1, '#1d7a20');
  g.beginPath(); g.arc(64, 64, 54, 0, 7); g.fillStyle = gr; g.fill(); g.lineWidth = 9; g.strokeStyle = '#ffffff'; g.stroke(); g.lineWidth = 3; g.strokeStyle = '#0d4a12'; g.beginPath(); g.arc(64, 64, 59, 0, 7); g.stroke();
  g.fillStyle = '#ffffff'; g.strokeStyle = '#0d4a12'; g.lineWidth = 4; g.beginPath();
  if (kind === 'up') { g.moveTo(64, 26); g.lineTo(96, 62); g.lineTo(76, 62); g.lineTo(76, 96); g.lineTo(52, 96); g.lineTo(52, 62); g.lineTo(32, 62); }
  else { g.rect(54, 30, 20, 68); g.rect(30, 54, 68, 20); }
  g.closePath(); g.fill(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (BADGE[kind] = t);
}
export function badge(kind) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(kind), depthTest: false, transparent: true })); s.scale.setScalar(1.5); s.renderOrder = 10;
  return s;
}

// Château procédural (toits bleus, tours, remparts, bannières) — grandit avec le niveau
export function castleModel(lvl = 1) {
  const g = new THREE.Group(), M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.85, ...o });
  const stone = M('#b8b2a8'), stone2 = M('#8f8a84'), roof = M('#3a5ec8', { roughness: 0.55 }), wood = M('#6b4a2a'), banner = M('#c8323e', { side: THREE.DoubleSide }), gold = M('#e0b040', { metalness: 0.6, roughness: 0.35 }), win = M('#ffd27a', { emissive: '#ffb040', emissiveIntensity: 1.2 });
  const tier = lvl <= 3 ? 0 : lvl <= 6 ? 1 : 2, W = 2.6 + tier * 0.35;
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const tower = (x, z, r, h, roofH = 1.1) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 10), stone); t.position.set(x, h / 2, z); t.castShadow = true; g.add(t);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.22, r * 1.22, 0.16, 10), stone2); ring.position.set(x, h, z); g.add(ring);
    const c = new THREE.Mesh(new THREE.ConeGeometry(r * 1.32, roofH, 10), roof); c.position.set(x, h + roofH / 2 + 0.06, z); c.castShadow = true; g.add(c);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), gold); tip.position.set(x, h + roofH + 0.1, z); g.add(tip);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16), banner); fl.position.set(x + 0.15, h + roofH + 0.18, z); g.add(fl);
    for (let k = 0; k < 2; k++) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.18, 0.04), win); const a = k * 1.6 + 0.6; w2.position.set(x + Math.sin(a) * r * 1.01, h * 0.6, z + Math.cos(a) * r * 1.01); w2.rotation.y = a; g.add(w2); }
  };
  // remparts
  const wh = 0.75 + tier * 0.15;
  for (const [x, z, rx] of [[0, -W / 2, 0], [0, W / 2, 0], [-W / 2, 0, 1], [W / 2, 0, 1]]) {
    box(rx ? 0.24 : W, wh, rx ? W : 0.24, stone2, x, wh / 2, z);
    for (let i = 0; i < 6; i++) { const u = -W / 2 + 0.2 + i * (W - 0.4) / 5; if (z > 0 && i >= 2 && i <= 3) continue; box(0.18, 0.16, 0.26, stone2, x + (rx ? 0 : u), wh + 0.08, z + (rx ? u : 0)); }
  }
  // porte + bannières
  box(0.6, 0.62, 0.08, wood, 0, 0.31, W / 2 + 0.13);
  const ar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 5, 10, Math.PI), stone); ar.position.set(0, 0.62, W / 2 + 0.13); g.add(ar);
  for (const sx of [-0.62, 0.62]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.5), banner); b.position.set(sx, wh * 0.55, W / 2 + 0.13); g.add(b); }
  // donjon
  const kh = 1.5 + tier * 0.5;
  box(1.3, kh, 1.1, stone, 0, kh / 2, -0.2);
  const kr = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.0, 4), roof); kr.rotation.y = Math.PI / 4; kr.scale.z = 0.85; kr.position.set(0, kh + 0.5, -0.2); kr.castShadow = true; g.add(kr);
  for (let i = 0; i < 3; i++) { const w2 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.24, 0.04), win); w2.position.set(-0.35 + i * 0.35, kh * 0.62, 0.36); g.add(w2); }
  box(0.22, 0.6, 0.22, stone2, 0.4, kh + 0.55, -0.45); // cheminée
  g.userData.chimney = [0.4, kh + 0.9, -0.45];
  // tours d'angle (plus nombreuses et hautes avec le niveau)
  const th = 1.5 + tier * 0.45;
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) tower(x * W / 2, z * W / 2, 0.36 + tier * 0.04, th + (z < 0 ? 0.3 : 0));
  if (tier >= 1) { tower(-0.75, -0.75, 0.3, kh + 0.6, 0.9); tower(0.75, -0.75, 0.3, kh + 0.4, 0.9); }
  if (tier >= 2) tower(0, -0.95, 0.38, kh + 1.3, 1.3);
  return g;
}
