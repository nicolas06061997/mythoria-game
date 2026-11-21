// MYTHORIA — vue 3D d'un combat. N'applique AUCUNE règle : elle montre l'état de la simulation.
import * as THREE from 'three';
import { CX, CY, RX, RY, HEART, SANCT, BENCH, MYTH, CMDR } from '../../shared/sim.js';
import { HERO, SPELL, RARITIES } from '../../shared/content.js';
import { createRenderer, quality, PerfWatch } from './stage.js';
import { buildWorld } from './world.js';
import { makeHero, preload, prop } from './assets.js';
import { sanctuaryCrystal, heartOfMyth, glowSprite, glowTexture } from './procedural.js';
import { dragons } from './surroundings.js';
import { FX } from './fx.js';
import { createComposer, blobShadow } from './look.js';

export const TEAM = ['#3da9ff', '#ff4f5e'];
// Arènes « peintes » : une illustration sert de décor, la 3D (héros, effets) est posée dessus avec une caméra
// calculée pour coller exactement à l'image (sol, Sanctuaires, Cœur). Paramètres trouvés par ajustement.
// Arènes peintes. Paramètres de caméra trouvés par ajustement sur des points de l'image (centre du Cœur, Sanctuaires, bords, socles).
// sylve (19/11) : capture peinte de l'utilisateur nettoyée de son interface, voûte sombre ajoutée en haut (top = 320 px, pour les écrans longs), agrandie 1,5× (Real-ESRGAN) ;
// coordonnées en pixels de l'image d'origine (W = 1176), décalées de `top` dans l'image finale.
const ARENA_ART = { sylve: { src: 'assets/arenas/sylve.webp', fx: 'sylve', W: 1176, H: 1920, fov: 40.4914, th: 0.7958, D: 39.1892, zt: 2.5842, off: -452.2128, k: 0.9082, imgH: 2200, benchY: 2079, top: 320, benchZ: 13.818, benchX: [-5.3, -2.64, 0, 2.64, 5.3] },
  aurore: { src: 'assets/arenas/aurore.webp', W: 1176, H: 1920, fov: 40.4914, th: 0.8884, D: 44.3774, zt: 2.5842, off: -213.3714, k: 0.8555, imgH: 2190, benchY: 2050, benchZ: 17.705, benchX: [-6.211, -3.079, 0, 3.079, 6.158] } };
// Sylve vivante : champignons et runes qui pulsent, feuillage qui ondule, poussière dorée autour du Cœur, étoiles qui scintillent
const SYLVE_FS = `uniform sampler2D map; uniform float t, cheer, top; uniform vec2 res; varying vec2 vu;
  float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main(){
    vec2 p = vec2(vu.x, 1.0 - vu.y), P = p * res - vec2(0.0, top), Q = P;
    vec4 c0 = texture2D(map, vu);
    // feuillage des grands arbres (haut et bords) : ondulation lente
    float leaf = clamp((c0.g - max(c0.r, c0.b)) * 4.0, 0.0, 1.0) * (1.0 - smoothstep(420.0, 620.0, P.y) * (1.0 - smoothstep(60.0, 0.0, min(P.x, res.x - P.x) - 120.0)));
    Q.x += leaf * (1.6 * sin(t * 1.3 + P.y * 0.035 + P.x * 0.012) + 0.8 * sin(t * 2.1 + P.x * 0.05));
    Q.y += leaf * 0.9 * sin(t * 1.7 + P.x * 0.03);
    vec4 c = texture2D(map, vec2(Q.x / res.x, 1.0 - (Q.y + top) / res.y));
    // champignons et runes cyan : chaque touffe pulse à son rythme (plus fort quand le public acclame)
    float cy = clamp((min(c.g, c.b) - c.r) * 3.0, 0.0, 1.0) * smoothstep(0.45, 0.8, max(c.g, c.b));
    float ph = h21(floor(P / 46.0));
    c.rgb += vec3(0.25, 0.75, 0.65) * cy * (0.18 + cheer * 0.25) * (0.5 + 0.5 * sin(t * (1.6 + ph * 1.8) + ph * 6.283));
    // poussière dorée autour du Cœur : scintillement
    vec2 dH = (P - vec2(588.0, 955.0)) / vec2(250.0, 170.0); float ring = smoothstep(1.35, 1.0, length(dH)) * smoothstep(0.55, 0.8, length(dH));
    float gold = clamp((c.r + c.g) * 0.5 - c.b, 0.0, 1.0) * smoothstep(0.65, 0.9, c.r);
    c.rgb += vec3(1.0, 0.85, 0.45) * gold * ring * 0.55 * pow(0.5 + 0.5 * sin(t * 3.0 + h21(floor(P / 9.0)) * 40.0), 3.0);
    // ciel : étoiles qui scintillent + nébuleuse qui respire doucement
    float sky = clamp((c.b - max(c.r, c.g)) * 3.0, 0.0, 1.0) * step(dot(c.rgb, vec3(0.33)), 0.45);
    vec2 sc = floor(p * vec2(120.0, 190.0)); float st = h21(sc + 7.0);
    if (st > 0.985) { vec2 fr = fract(p * vec2(120.0, 190.0)) - 0.5; float tw = pow(max(0.0, sin(t * (1.5 + st * 3.0) + st * 40.0)), 6.0); c.rgb += sky * tw * smoothstep(0.25, 0.0, length(fr)) * vec3(0.9, 0.95, 1.0); }
    c.rgb *= 1.0 + sky * 0.08 * sin(t * 0.5 + P.x * 0.004 + P.y * 0.003);
    // brume derrière le château ennemi : elle glisse lentement
    float mist = smoothstep(300.0, 380.0, P.y) * (1.0 - smoothstep(440.0, 480.0, P.y)) * smoothstep(200.0, 330.0, P.x) * (1.0 - smoothstep(850.0, 980.0, P.x));
    float mn = h21(floor(vec2(P.x * 0.012 + t * 0.15, P.y * 0.03)));
    c.rgb += mist * vec3(0.35, 0.45, 0.6) * 0.06 * (0.5 + 0.5 * sin(t * 0.6 + P.x * 0.01)) * (0.6 + 0.4 * mn);
    // lanternes du château ennemi : flamme qui vacille
    float warm = clamp((c.r - c.b) * 2.0, 0.0, 1.0) * smoothstep(0.55, 0.85, c.r) * step(P.y, 720.0) * step(420.0, P.y);
    c.rgb += vec3(1.0, 0.6, 0.25) * warm * 0.25 * (0.6 + 0.4 * sin(t * 9.0 + h21(floor(P / 20.0)) * 20.0));
    gl_FragColor = c;
  }`;
const BENCH_Z = RY + 3.1, BENCH_X = [-4.6, -2.3, 0, 2.3, 4.6];
// ---------- Arc runique du Cercle d'Invocation (Lot 1B, 19/11 : remplace la rangée de socles en ligne) ----------
// Les 5 socles suivent un arc (le centre plus près de toi, les bords remontent vers l'île) ;
// chaque socle = médaillon rond de pierre astrale, liseré doré, anneau de runes qui tourne ; le héros lévite au-dessus.
const ARC_LIFT = 0.8; // remontée des socles du bord (unités du monde)
let RUNE_TEX = null;
function runeTexture() {
  if (RUNE_TEX) return RUNE_TEX;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.translate(S / 2, S / 2); g.strokeStyle = '#fff'; g.lineCap = 'round';
  g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 118, 0, 7); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 84, 0, 7); g.stroke();
  // glyphes entre les deux cercles
  let sd = 11; const rnd = () => (sd = (sd * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 16; i++) {
    g.save(); g.rotate(i / 16 * Math.PI * 2); g.translate(0, -101); g.lineWidth = 2.6; g.beginPath();
    const k = Math.floor(rnd() * 4);
    if (k === 0) { g.moveTo(-6, -8); g.lineTo(0, 8); g.lineTo(6, -8); }
    else if (k === 1) { g.moveTo(0, -9); g.lineTo(0, 9); g.moveTo(-6, -3); g.lineTo(6, 3); }
    else if (k === 2) { g.moveTo(-6, 8); g.lineTo(-6, -8); g.lineTo(6, 0); g.lineTo(-6, 0); }
    else { g.arc(0, 0, 6, 0.4, 5.9); g.moveTo(0, -9); g.lineTo(0, 9); }
    g.stroke(); g.restore();
  }
  // étoile à 8 branches au centre
  g.lineWidth = 1.6; g.globalAlpha = 0.55; g.beginPath();
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; g.moveTo(Math.cos(a) * 20, Math.sin(a) * 20); g.lineTo(Math.cos(a + Math.PI / 8) * 60, Math.sin(a + Math.PI / 8) * 60); g.lineTo(Math.cos(a + Math.PI / 4) * 20, Math.sin(a + Math.PI / 4) * 20); }
  g.stroke();
  RUNE_TEX = new THREE.CanvasTexture(c); RUNE_TEX.colorSpace = THREE.SRGBColorSpace; RUNE_TEX.anisotropy = 4;
  return RUNE_TEX;
}
// Médaillon d'un socle : pierre astrale + liseré doré + runes (additives) + halo
function medallion() {
  const g = new THREE.Group();
  const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.82, 0.22, 40), new THREE.MeshStandardMaterial({ color: '#1c2766', emissive: '#0d1a5a', emissiveIntensity: 0.6, roughness: 0.55, metalness: 0.25 }));
  stone.position.y = 0.11; stone.receiveShadow = true; g.add(stone);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.06, 8, 48), new THREE.MeshStandardMaterial({ color: '#e9c877', emissive: '#7a5410', emissiveIntensity: 0.7, roughness: 0.3, metalness: 0.8 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = 0.22; g.add(rim);
  const rune = new THREE.Mesh(new THREE.PlaneGeometry(1.66, 1.66), new THREE.MeshBasicMaterial({ map: runeTexture(), color: '#8fd8ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  rune.rotation.x = -Math.PI / 2; rune.position.y = 0.235; g.add(rune);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), new THREE.MeshBasicMaterial({ map: glowTexture(), color: '#5fb8ff', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  halo.rotation.x = -Math.PI / 2; halo.position.y = 0.02; g.add(halo);
  return { g, rune, halo, rim };
}
// ---------- Zones des failles et des événements de monde (Lot 3) : un seul programme pour toutes ----------
// Plan qui couvre l'île ; le shader calcule la zone en coordonnées du combat (cercle, bande, bord) et dessine l'effet du type k.
const ZONE_K = { fureur: 0, source: 1, tempete: 2, bourrasque: 3, lave: 4, spores: 5, halo: 6, hate: 7 };
const ZONE_VS = 'varying vec2 vP; uniform float zk; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vP = vec2(w.x + ' + CX.toFixed(1) + ', w.z / zk + ' + CY.toFixed(1) + '); gl_Position = projectionMatrix * viewMatrix * w; }';
const ZONE_FS = `varying vec2 vP; uniform float t, a, warn, k, shape, zr; uniform vec4 z; uniform vec3 col;
  float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1,0)), f.x), mix(h2(i+vec2(0,1)), h2(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec2 P = vP;
    vec2 e = (P - vec2(${CX.toFixed(1)}, ${CY.toFixed(1)})) / vec2(${RX.toFixed(2)}, ${RY.toFixed(2)});
    if (dot(e, e) > 1.0) discard;                       // seulement sur l'île
    float d, edge;                                       // d : 0 au centre .. 1 au bord de la zone ; edge : liseré
    if (shape < 0.5) { d = length(P - z.xy) / zr; }
    else if (shape < 1.5) { d = abs(P.y - (z.x + z.y) * 0.5) / ((z.y - z.x) * 0.5); }
    else { float lim = ${(RX * 0.55).toFixed(2)}; float dx = (P.x - ${CX.toFixed(1)}) * z.x - lim; d = dx > 0.0 ? 1.0 - min(1.0, dx / 1.2) * 0.6 : 2.0; }
    if (d > 1.0) discard;
    edge = smoothstep(0.82, 0.97, d) * (1.0 - smoothstep(0.97, 1.0, d));
    vec2 q = P - z.xy; float ang = atan(q.y, q.x), r = length(q) / max(zr, 0.01);
    float v = 0.0;
    if (k < 0.5) v = 0.55 + 0.45 * sin(ang * 3.0 + r * 9.0 - t * 4.0);                       // Fureur : tourbillon rouge
    else if (k < 1.5) v = 0.5 + 0.5 * sin(r * 14.0 - t * 2.5) * 0.6 + 0.2 * vn(P * 2.0 + t);    // Source : ondes vertes
    else if (k < 2.5) v = 0.5 + 0.5 * sin(ang * 4.0 - r * 12.0 + t * 7.0);                    // Tempête : spirale rapide
    else if (k < 3.5) v = 0.55 + 0.9 * smoothstep(0.45, 1.0, vn(vec2(P.x * 1.2 - t * 6.0, P.y * 5.0))); // Bourrasque : rafales
    else if (k < 4.5) v = 0.45 + 0.55 * vn(P * 1.6 + vec2(0.0, t * 0.8)) + 0.3 * vn(P * 4.0 - t);  // Lave : coulée
    else if (k < 5.5) { vec2 g = fract(P * 1.6 + vec2(0.0, -t * 0.4)) - 0.5; v = 0.25 + smoothstep(0.18, 0.0, length(g)) * (0.5 + 0.5 * sin(t * 3.0 + h2(floor(P * 1.6)) * 6.0)); } // Spores
    else if (k < 6.5) v = 0.35 + 0.65 * smoothstep(0.35, 0.0, abs(fract(r * 2.0 - t * 0.8) - 0.5));  // Halo : anneaux qui s'élargissent
    else v = 0.3 + 0.7 * step(0.6, fract(ang * 1.909 + t * 0.6)) * smoothstep(0.72, 0.8, r) * (1.0 - smoothstep(0.92, 0.98, r)) + 0.25 * smoothstep(0.4, 0.0, abs(r - 0.5)); // Hâte : cercle de runes
    float fill = (1.0 - warn) * v * (0.55 + 0.45 * (1.0 - d)) ;
    float glow = edge * (warn > 0.5 ? 0.6 + 0.4 * sin(t * 10.0) : 1.0);
    // couleur posée par-dessus (pas additive : reste visible sur la neige ou le sol doré), liseré plus clair
    float al = clamp(fill * (k > 2.5 && k < 3.5 ? 1.1 : 0.55) + glow * 0.9, 0.0, 0.85) * a;
    gl_FragColor = vec4(mix(col, vec3(1.0), glow * 0.35), al);
  }`;
// Bandeau de runes qui relie les socles (courbe passant par les 5 médaillons), motif qui défile
const ARC_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
const ARC_FS = `varying vec2 vUv; uniform float t; uniform vec3 col;
  float h(float x){ return fract(sin(x * 91.7) * 4375.5); }
  void main(){
    float edge = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.82, vUv.y);
    float line = smoothstep(0.12, 0.0, abs(vUv.y - 0.5)) * 0.55;
    float u = vUv.x * 46.0 - t * 1.6, cell = floor(u), f = fract(u);
    float glyph = step(0.35, h(cell)) * smoothstep(0.5, 0.2, abs(f - 0.5)) * smoothstep(0.42, 0.18, abs(vUv.y - 0.5));
    float pulse = 0.6 + 0.4 * sin(vUv.x * 18.0 - t * 3.0);
    float ends = smoothstep(0.0, 0.06, vUv.x) * smoothstep(1.0, 0.94, vUv.x);
    gl_FragColor = vec4(col * (line + glyph * 0.8) * pulse * edge * ends, 1.0);
  }`;


// Forteresse des Sanctuaires (remplace le simple temple)
function fortress(roof, crys, stone, hk = 1) {
  const g = new THREE.Group(), st = new THREE.MeshStandardMaterial({ color: stone, flatShading: true, roughness: 0.9 }), st2 = new THREE.MeshStandardMaterial({ color: new THREE.Color(stone).multiplyScalar(0.8), flatShading: true });
  const rf = new THREE.MeshStandardMaterial({ color: roof, flatShading: true, roughness: 0.6 }), cm = new THREE.MeshStandardMaterial({ color: crys, emissive: crys, emissiveIntensity: 1.6, flatShading: true });
  const W = 3.7, H = 1.05 * hk, T = 0.34;
  for (const [x, z, rot] of [[0, -W / 2, 0], [0, W / 2, 0], [-W / 2, 0, Math.PI / 2], [W / 2, 0, Math.PI / 2]]) {
    const front = z > 0;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), st); wall.position.set(x, H / 2, z); wall.rotation.y = rot; wall.castShadow = wall.receiveShadow = true; g.add(wall);
    for (let i = 0; i < 7; i++) { if (front && (i === 3)) continue; const c = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, T + 0.04), st2); const u = -W / 2 + 0.3 + i * (W - 0.6) / 6; c.position.set(x + (rot ? 0 : u), H + 0.11, z + (rot ? u : 0)); g.add(c); }
  }
  // porte (vers le Cœur) avec bannières
  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.85 * hk, 0.1), new THREE.MeshStandardMaterial({ color: '#2a1a12', flatShading: true })); gate.position.set(0, 0.42 * hk, W / 2 + T / 2 + 0.01); g.add(gate);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.1, 5, 10, Math.PI), st2); arch.position.set(0, 0.85 * hk, W / 2 + T / 2); g.add(arch);
  for (const sx of [-0.85, 0.85]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.85), rf); b.position.set(sx, H * 0.55, W / 2 + T / 2 + 0.02); g.add(b); }
  // tours d'angle
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const th = (1.9 + (z < 0 ? 0.3 : 0)) * hk;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, th, 8), st); t.position.set(x * W / 2, th / 2, z * W / 2); t.castShadow = true; g.add(t);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.18, 8), st2); ring.position.set(x * W / 2, th, z * W / 2); g.add(ring);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.0 * hk, 8), rf); cone.position.set(x * W / 2, th + 0.55 * hk, z * W / 2); cone.castShadow = true; g.add(cone);
    const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), cm); sh.scale.y = 1.8; sh.position.set(x * W / 2, th + 1.2 * hk, z * W / 2); g.add(sh);
  }
  // cristaux au pied des murs
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, c = new THREE.Mesh(new THREE.OctahedronGeometry(0.16 + (i % 2) * 0.08, 0), cm); c.scale.y = 2; c.position.set(Math.cos(a) * 2.35, 0.25, Math.sin(a) * 2.35); c.rotation.z = (Math.random() - 0.5) * 0.5; g.add(c); }
  return g;
}

export class BattleView {
  constructor(canvas, overlay, worldKey, me = 0) {
    this.cv = canvas; this.ov = overlay; this.octx = overlay.getContext('2d');
    this.key = worldKey; this.me = me;
    this.q = quality();
    this.art = ARENA_ART[worldKey] || null; this.zk = this.art ? this.art.k : 1; this.bz = this.art ? this.art.benchZ : BENCH_Z; this.bx = this.art ? this.art.benchX : BENCH_X;
    { const xm = Math.max(...this.bx.map(Math.abs)); this.bzs = this.bx.map(x => this.bz - ARC_LIFT * this.zk * (x / xm) ** 2); }
    this.r = createRenderer(canvas);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, 1, 0.5, 400);
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2(); this.v3 = new THREE.Vector3();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.views = new Map(); this.bench = []; this.shake = 0; this.time = 0;
    this.fx = new FX(this.scene);
    this.nums = [];
  }

  toWorld(x, y) { return { x: x - CX, z: (y - CY) * this.zk }; }
  toSim(X, Z) { return { x: X + CX, y: Z / this.zk + CY }; }

  async init(heroIds, onProgress) {
    this.before = new Set(this.scene.children);
    const [world] = await Promise.all([
      buildWorld(this.scene, this.key, { light: this.q.low ? 'low' : 'high', shadow: this.q.shadowSize }),
      preload(heroIds, onProgress),
    ]);
    this.world = world;
    if (this.art) { // décor peint : on garde seulement les lumières du monde 3D
      for (const o of this.scene.children) if (!this.before.has(o)) for (const c of o.children) if (!c.isLight) c.visible = false;
      const sh = new THREE.Mesh(new THREE.CircleGeometry(9, 48), new THREE.ShadowMaterial({ opacity: 0.32 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.01; sh.receiveShadow = true; this.scene.add(sh);
      this.r.toneMapping = THREE.NoToneMapping;
    }
    this.r.toneMappingExposure = world.theme.exposure;
    // Sanctuaires
    this.sanct = [];
    for (const p of [0, 1]) {
      const g = new THREE.Group(), w = this.toWorld(CX, SANCT.y[p]);
      g.position.set(w.x, 0, w.z); g.rotation.y = p === this.me ? Math.PI : 0;
      // forteresse : remparts crénelés, 4 tours à toits colorés, donjon (temple) au centre, porte vers le Cœur
      const mine = p === this.me, stoneC = this.key === 'aurore' ? '#9a98a8' : world.theme.rock;
      if (!this.art) g.add(fortress(mine ? '#3a7be0' : '#c8323e', mine ? '#8fe0ff' : '#c48aff', stoneC, mine ? 0.66 : 1));
      if (!this.art) try { const t = await prop('Temple_SecondAge_Level3', { scale: 1 }); const b = new THREE.Box3().setFromObject(t); const k = 2.2 / Math.max(b.max.x - b.min.x, b.max.z - b.min.z); t.scale.multiplyScalar(k); t.scale.y *= mine ? 0.75 : 1; g.add(t); } catch (e) {}
      const col = TEAM[p === this.me ? 0 : 1];
      const cr = sanctuaryCrystal(col); cr.group.position.y = p === this.me ? 3.0 : 4.0; if (p === this.me) cr.group.scale.setScalar(0.8); g.add(cr.group);
      const base = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.2, 48), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }));
      base.rotation.x = -Math.PI / 2; base.position.y = 0.04; g.add(base);
      if (this.art) { cr.group.visible = false; base.visible = false; }
      this.scene.add(g);
      this.sanct.push({ g, cr, smokeT: 0 });
    }
    // Cœur de Mythe
    this.heart = heartOfMyth(); this.scene.add(this.heart.group);
    // Halo au sol du Cœur (lisible en un coup d'œil : couleur = qui capture, clignote si disputé)
    this.heartHalo = new THREE.Mesh(new THREE.RingGeometry(HEART.r * 0.55, HEART.r, 64), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.15, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
    this.heartHalo.rotation.x = -Math.PI / 2; this.heartHalo.position.y = 0.06; this.heartHalo.scale.y = this.zk; this.scene.add(this.heartHalo);
    this.lava = []; // zones persistantes (Éruption)
    if (this.art) this.heart.group.traverse(o => { if (o.isMesh && !o.material.transparent) o.visible = false; });
    // Cercle d'invocation (le banc du joueur, en 3D devant l'île)
    const ledge = new THREE.Group(); ledge.position.set(0, -0.35, this.bz);
    const rockMat = new THREE.MeshStandardMaterial({ color: world.theme.rock, flatShading: true });
    const top = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.5, 2.6), new THREE.MeshStandardMaterial({ color: this.key === 'aurore' ? '#8f8a9e' : world.theme.ground2, flatShading: true })); top.receiveShadow = true; ledge.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(2.0, 3, 6), rockMat); under.scale.set(3.3, 1, 0.8); under.rotation.x = Math.PI; under.position.y = -1.7; ledge.add(under);
    this.scene.add(ledge); if (this.art) ledge.visible = false;
    this.slotHits = [];
    for (let i = 0; i < BENCH; i++) {
      const g = new THREE.Group(); g.position.set(this.bx[i], 0, this.bzs[i]);
      const md = medallion(); md.g.scale.setScalar(1.12); g.add(md.g); const rune = md.rune;
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.6, 8), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.2; hit.userData.slot = i; g.add(hit);
      this.slotHits.push(hit);
      this.scene.add(g);
      this.bench.push({ g, rune, halo: md.halo, key: '', actor: null, loading: null, sel: false });
    }
    // arc de runes qui relie les médaillons (dans les arènes peintes et en 3D)
    {
      const pts = this.bx.map((x, i) => new THREE.Vector3(x, 0.05, this.bzs[i]));
      const d0 = pts[0].clone().sub(pts[1]).multiplyScalar(0.55), d1 = pts[4].clone().sub(pts[3]).multiplyScalar(0.55);
      const curve = new THREE.CatmullRomCurve3([pts[0].clone().add(d0), ...pts, pts[4].clone().add(d1)]);
      const N = 120, W = 0.34, pos = [], uv = [], idx = [];
      for (let k = 0; k <= N; k++) {
        const u = k / N, p = curve.getPointAt(u), tg = curve.getTangentAt(u), nx = -tg.z, nz = tg.x, l = Math.hypot(nx, nz) || 1;
        pos.push(p.x - nx / l * W, p.y, p.z - nz / l * W, p.x + nx / l * W, p.y, p.z + nz / l * W); uv.push(u, 0, u, 1);
        if (k < N) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
      this.arcU = { t: { value: 0 }, col: { value: new THREE.Color('#6fc8ff') } };
      const arc = new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: this.arcU, vertexShader: ARC_VS, fragmentShader: ARC_FS, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      arc.renderOrder = -1; this.scene.add(arc);
    }
    // zones des failles / événements de monde (cachées tant qu'il n'y en a pas)
    this.zones = [0, 1].map(() => {
      const u = { t: { value: 0 }, a: { value: 0 }, warn: { value: 0 }, k: { value: 0 }, shape: { value: 0 }, zr: { value: 1 }, z: { value: new THREE.Vector4() }, col: { value: new THREE.Color() }, zk: { value: this.zk } };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(RX * 2 + 1, (RY * 2 + 1) * this.zk).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({ uniforms: u, vertexShader: ZONE_VS, fragmentShader: ZONE_FS, transparent: true, depthWrite: false }));
      m.position.y = 0.08; m.visible = false; m.renderOrder = 1; this.scene.add(m);
      return { m, u, fade: 0, key: '' };
    });
    // Zone de déploiement (moitié de l'île du joueur)
    const sh = new THREE.Shape(); sh.absellipse(0, 0, RX - 0.3, RY - 0.3, Math.PI, 2 * Math.PI, false, 0);
    this.zone = new THREE.Mesh(new THREE.ShapeGeometry(sh, 40), new THREE.MeshBasicMaterial({ color: TEAM[0], transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide }));
    this.zone.rotation.x = -Math.PI / 2; this.zone.scale.y = (RY - 1.1) / (RY - 0.3); this.zone.position.set(0, 0.07, 0.8 * this.zk); this.zone.scale.y *= this.zk; this.zone.visible = false;
    this.scene.add(this.zone);
    this.aim = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 48), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    this.aim.rotation.x = -Math.PI / 2; this.aim.position.y = 0.09; this.aim.visible = false; this.scene.add(this.aim);
    // Préchauffe la carte graphique : prépare une fois les matériaux de chaque héros du combat,
    // sinon le jeu « saccade » la première fois qu'un nouveau héros apparaît.
    try {
      const warm = new THREE.Group(); this.scene.add(warm);
      const ids = [...new Set(heroIds)], acts = await Promise.all([...ids.map(id => makeHero(id, { star: 1, lite: this.q.lite }).catch(() => null)), ...ids.map(id => makeHero(id, { star: 3, lite: this.q.lite }).catch(() => null))]);
      acts.forEach((a, i) => { if (a) { a.holder.position.set((i % 6) * 2 - 5, 0, -2 - Math.floor(i / 6) * 2); warm.add(a.holder); } });
      this.warm = { warm, acts };
    } catch (e) {}
    if (this.art) await this.buildArt();
    this.post = createComposer(this.r, this.scene, this.cam, { bloom: this.q.bloom, strength: 0.45, threshold: 1.15, radius: 0.45, samples: this.q.msaa, under: this.bg || null });
    if (this.art) { const u = this.post.grade.uniforms; u.sat.value = 1.0; u.con.value = 1.0; u.vig.value = 0.12; }
    this.perf = new PerfWatch(this.r, () => this.resize(), this.cv.parentElement);
    this.resize();
    if (this.warm) {
      try { this.r.compile(this.scene, this.cam); this.post.render(); } catch (e) {}
      // on les garde cachés jusqu'à la fin du combat : leurs « programmes » restent prêts sur la carte graphique
      this.warm.warm.visible = false; this.keep = this.warm; this.warm = null;
    }
  }

  // Décor peint : image + fond dégradé, dans une petite scène dessinée avant la 3D
  async buildArt() {
    const A = this.art, img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = A.src; }).catch(() => null);
    if (!img) { this.art = null; this.zk = 1; return; }
    // fondu en haut de l'image, et couleur du ciel pour remplir au-dessus
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const top = g.getImageData(0, 4, img.width, 1).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < top.length; i += 4) { r += top[i]; gg += top[i + 1]; b += top[i + 2]; } const npx = top.length / 4;
    const skyCol = new THREE.Color(`rgb(${Math.round(r / npx)},${Math.round(gg / npx)},${Math.round(b / npx)})`);
    g.globalCompositeOperation = 'destination-out'; const fade = g.createLinearGradient(0, 0, 0, 120); fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = fade; g.fillRect(0, 0, img.width, 120);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const scene = new THREE.Scene(); scene.background = skyCol;
    // shader « vivant » : le public saute (plus fort quand il acclame), runes et cristaux pulsent, étoiles qui scintillent
    const E = (cx, cy, rx, ry) => new THREE.Vector4(cx / A.W, cy / A.imgH, rx / A.W, ry / A.imgH);
    this.bgU = { map: { value: tex }, t: { value: 0 }, cheer: { value: 0 },
      outE: { value: E(588, 1090, 575, 520) }, inE: { value: E(588, 1095, 455, 352) }, floorE: { value: E(588, 1095, 440, 340) },
      castA: { value: new THREE.Vector4(470 / A.W, 530 / A.imgH, 710 / A.W, 780 / A.imgH) }, castB: { value: new THREE.Vector4(380 / A.W, 1390 / A.imgH, 800 / A.W, 1790 / A.imgH) },
      islE: { value: E(588, 1480, 590, 470) }, res: { value: new THREE.Vector2(A.W, A.imgH) }, top: { value: A.top || 0 } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.bgU, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: A.fx === 'sylve' ? SYLVE_FS : `uniform sampler2D map; uniform float t, cheer; uniform vec4 outE, inE, floorE, castA, castB, islE; uniform vec2 res; varying vec2 vu;
        float ell(vec2 p, vec4 e){ vec2 d = (p - e.xy) / e.zw; return dot(d, d); }
        float box(vec2 p, vec4 b){ return step(b.x, p.x) * step(p.x, b.z) * step(b.y, p.y) * step(p.y, b.w); }
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        vec2 rot(vec2 p, vec2 c, float a){ vec2 d = p - c; float s = sin(a), co = cos(a); return c + vec2(co * d.x - s * d.y, s * d.x + co * d.y); }
        float vn(vec2 x){ vec2 i = floor(x), fq = fract(x); fq = fq * fq * (3.0 - 2.0 * fq); return mix(mix(h21(i), h21(i + vec2(1, 0)), fq.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), fq.x), fq.y); }
        vec2 toUV(vec2 P){ return vec2(P.x / res.x, 1.0 - P.y / res.y); }
        void main(){
          vec2 p = vec2(vu.x, 1.0 - vu.y), P = p * res;
          // --- la statue de dragon s'anime : ailes qui battent, corps qui respire ---
          vec2 Q = P; float flap = 0.2 * sin(t * 3.0) + 0.05 * sin(t * 7.0);
          vec2 L = vec2(860.0, 182.0), R = vec2(902.0, 182.0);
          float wL = smoothstep(4.0, 40.0, L.x - P.x) * (1.0 - smoothstep(150.0, 195.0, length(P - L))) * step(P.y, 245.0);
          float wR = smoothstep(4.0, 40.0, P.x - R.x) * (1.0 - smoothstep(140.0, 180.0, length(P - R))) * step(P.y, 245.0);
          if (wL > 0.0) Q = rot(Q, L, -flap * wL);
          if (wR > 0.0) Q = rot(Q, R, flap * wR);
          float wB = (1.0 - smoothstep(70.0, 110.0, abs(P.x - 880.0))) * smoothstep(262.0, 222.0, P.y) * step(40.0, P.y);
          Q.y -= wB * (2.5 * sin(t * 1.6) + 2.0 * flap * 6.0);
          float drag = smoothstep(770.0, 800.0, P.x) * (1.0 - smoothstep(1000.0, 1030.0, P.x)) * smoothstep(40.0, 70.0, P.y) * (1.0 - smoothstep(240.0, 275.0, P.y));
          // --- le vide sous l'arène tourbillonne doucement (deux échantillons en fondu, sans à-coup) ---
          vec2 V = vec2(588.0, 1900.0); float r = length(P - V), fall = exp(-r / 520.0);
          float skyM = smoothstep(1.0, 1.15, ell(p, outE)) * smoothstep(1.0, 1.12, ell(p, islE)) * (1.0 - smoothstep(1935.0, 1960.0, P.y)) * (1.0 - drag);
          float low = smoothstep(1250.0, 1600.0, P.y), f = fract(t * 0.1), aw = 0.5 * fall * skyM * low;
          vec2 uvA = toUV(rot(Q, V, aw * f)), uvB = toUV(rot(Q, V, aw * fract(f + 0.5)));
          float lerpF = abs((0.5 - f) / 0.5);
          // --- public qui saute ---
          float crowd = smoothstep(1.0, 0.96, ell(p, outE)) * smoothstep(1.0, 1.06, ell(p, inE)) * (1.0 - box(p, castA)) * (1.0 - box(p, castB));
          vec2 cell = floor(p * vec2(70.0, 95.0)); float ph = h21(cell);
          float jump = max(0.0, sin(t * (5.0 + cheer * 7.0) * (0.8 + ph * 0.5) + ph * 6.283)) * crowd * (0.0012 + cheer * 0.0042);
          uvA.y -= jump; uvB.y -= jump;
          vec4 c = skyM > 0.001 ? mix(texture2D(map, uvA), texture2D(map, uvB), lerpF) : texture2D(map, uvA);
          // reflet doré qui passe sur le dragon
          float gold = clamp((c.r - c.b) * 2.0, 0.0, 1.0) * drag;
          c.rgb += vec3(1.0, 0.85, 0.45) * gold * 0.55 * pow(max(0.0, sin((P.x + P.y) * 0.03 - t * 2.5)), 12.0);
          // vagues d'énergie qui partent du tourbillon
          c.rgb += vec3(0.45, 0.5, 1.0) * skyM * low * fall * 0.10 * pow(0.5 + 0.5 * sin(r * 0.035 - t * 1.4), 6.0);
          // étoiles et volutes qui tournent en spirale autour du tourbillon
          { vec2 dV = P - V; float ang = atan(dV.y, dV.x), spin = t * 0.45 * exp(-r / 650.0);
            vec2 pc = vec2(r / 20.0, (ang + spin) * r / 20.0); float hs = h21(floor(pc) + 3.1);
            if (hs > 0.9) { vec2 fq = fract(pc) - 0.5; c.rgb += skyM * low * smoothstep(0.32, 0.0, length(fq)) * vec3(0.75, 0.85, 1.0) * (0.55 + 0.45 * sin(t * 3.0 + hs * 50.0)); }
            float wisp = vn(vec2(r * 0.012 - t * 0.15, (ang + spin * 0.7) * 2.5)) * vn(vec2(r * 0.03, (ang + spin) * 5.0));
            c.rgb += skyM * low * (0.35 + fall) * 0.22 * wisp * vec3(0.55, 0.45, 1.0); }
          float blue = clamp((c.b - max(c.r, c.g)) * 3.0, 0.0, 1.0);
          float floorM = smoothstep(1.0, 0.9, ell(p, floorE)), castM = max(box(p, castA), box(p, castB));
          float pulse = 0.5 + 0.5 * sin(t * 2.2 - length((p - floorE.xy) / floorE.zw) * 5.0);
          c.rgb += vec3(0.25, 0.55, 1.0) * blue * (floorM * 0.18 * pulse + castM * 0.35 * (0.5 + 0.5 * sin(t * 3.1)));
          float sky = step(1.05, ell(p, outE)) * (1.0 - castM);
          vec2 sc = floor(p * vec2(120.0, 200.0)); float st = h21(sc + 7.0);
          if (st > 0.985) { vec2 fr = fract(p * vec2(120.0, 200.0)) - 0.5; float tw = pow(max(0.0, sin(t * (1.5 + st * 3.0) + st * 40.0)), 6.0); c.rgb += sky * (1.0 - drag) * tw * smoothstep(0.25, 0.0, length(fr)) * vec3(0.9, 0.9, 1.0); }
          gl_FragColor = c;
        }` });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    scene.add(plane);
    this.bg = { scene, camera: new THREE.OrthographicCamera(0, 1, 0, -1, -1, 1), plane };
    this.artUps = [];
    const dg = new THREE.Group(); this.scene.add(dg);
    if (A.fx !== 'sylve') dragons(dg, this.artUps, [{ c: '#e8b04a', b: '#fff0b8', horns: true, s: 1.4, r: 17, h: 15, sp: 0.12, dir: 1, cz: -18 }]);
    const nd = this.q.low ? 40 : 90, n = nd, pg = new THREE.BufferGeometry(), pp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = 3 + Math.random() * 9; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = Math.random() * 6; pp[i * 3 + 2] = Math.sin(a) * r * this.zk; }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    this.scene.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: A.fx === 'sylve' ? 0.26 : 0.22, map: glowTexture(), color: A.fx === 'sylve' ? '#d8ffa8' : '#bfe0ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    this.artUps.push(dt => { for (let i = 0; i < n; i++) { pp[i * 3 + 1] += dt * 0.5; if (pp[i * 3 + 1] > 6) pp[i * 3 + 1] = 0; } pg.attributes.position.needsUpdate = true; });
  }
  // Caméra calée sur l'image : l'image prend toute la largeur, le banc reste à la même hauteur qu'avant
  paintedCamera(w, h) {
    const A = this.art, s = w / A.W, y0 = h - 140 - A.benchY * s;
    this.cam.fov = A.fov; this.cam.aspect = A.W / A.H;
    this.cam.setViewOffset(A.W, A.H, 0, A.off - y0 / s, A.W, h / s); this.cam.updateProjectionMatrix();
    const target = new THREE.Vector3(0, 0, A.zt);
    this.cam.position.set(0, Math.sin(A.th) * A.D, A.zt + Math.cos(A.th) * A.D); this.cam.lookAt(target);
    this.camBase = this.cam.position.clone(); this.camTarget = target;
    if (this.bg) { const B = this.bg; B.camera.left = 0; B.camera.right = w; B.camera.top = 0; B.camera.bottom = -h; B.camera.updateProjectionMatrix(); B.plane.scale.set(w, A.imgH * s, 1); B.plane.position.set(w / 2, -(y0 + A.imgH * s / 2), 0); }
  }

  resize() {
    const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.r.setSize(w, h, false);
    if (this.post) this.post.setSize(w, h);
    const d = Math.min(2, devicePixelRatio || 1);
    this.ov.width = w * d; this.ov.height = h * d; this.ow = w; this.oh = h; this.od = d;
    this.cam.aspect = w / h;
    this.cam.fov = w / h < 0.6 ? 46 : 40;
    this.cam.updateProjectionMatrix();
    if (this.art) this.paintedCamera(w, h); else this.fitCamera();
    this.fx.setScale(h);
  }
  // Recule la caméra jusqu'à voir toute l'île et le cercle d'invocation.
  fitCamera() {
    // Lot 4 : angle un peu plus bas qu'avant (0,95 -> 0,8) pour montrer le relief et le vide autour de l'île (mondes en vraie 3D seulement)
    const target = new THREE.Vector3(0, 0, 3.0), dir = new THREE.Vector3(0, 0.8, 1.0).normalize();
    const pts = [[-RX + 0.9, 0, 2], [RX - 0.9, 0, 2], [0, 5.5, -RY + 2.7], [-5.6, 0, this.bz + 1], [5.6, 0, this.bz + 1], [0, 0, this.bz + 1.2]].map(p => new THREE.Vector3(...p));
    let lo = 10, hi = 120;
    for (let it = 0; it < 22; it++) {
      const mid = (lo + hi) / 2;
      this.cam.position.copy(target).addScaledVector(dir, mid); this.cam.lookAt(target); this.cam.updateMatrixWorld();
      const ok = pts.every(p => { const v = p.clone().project(this.cam); return Math.abs(v.x) < 0.98 && v.y < 0.84 && v.y > -0.74; });
      if (ok) hi = mid; else lo = mid;
    }
    this.cam.position.copy(target).addScaledVector(dir, hi); this.cam.lookAt(target);
    this.camBase = this.cam.position.clone(); this.camTarget = target;
  }

  // ---------- Toucher ----------
  ndc(cx, cy) { const rc = this.cv.getBoundingClientRect(); this.v2.set((cx - rc.left) / rc.width * 2 - 1, -((cy - rc.top) / rc.height) * 2 + 1); return this.v2; }
  pickBench(cx, cy) {
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    const h = this.ray.intersectObjects(this.slotHits, false)[0];
    return h ? h.object.userData.slot : -1;
  }
  pickGround(cx, cy) {
    this.ray.setFromCamera(this.ndc(cx, cy), this.cam);
    const p = this.ray.ray.intersectPlane(this.plane, this.v3);
    return p ? this.toSim(p.x, p.z) : null;
  }
  screenOf(x, y, h = 0) { const w = this.toWorld(x, y); const v = new THREE.Vector3(w.x, h, w.z).project(this.cam); return { x: (v.x + 1) / 2 * this.ow, y: (1 - v.y) / 2 * this.oh }; }
  benchScreen(i, h = 0) { const v = new THREE.Vector3(this.bx[i], h, this.bzs[i]).project(this.cam); return { x: (v.x + 1) / 2 * this.ow, y: (1 - v.y) / 2 * this.oh }; }

  async setGhost(g) {
    if (!g) { this.ghostInfo = null; if (this.ghost) { this.scene.remove(this.ghost.a.holder); this.ghost.a.dispose(); this.ghost = null; } this.zone.visible = false; this.aim.visible = false; return; }
    if (g.spell) {
      this.zone.visible = false; this.aim.visible = true;
      const w = this.toWorld(g.x, g.y); this.aim.position.set(w.x, 0.09, w.z); this.aim.scale.setScalar(SPELL[g.spell].radius);
      this.aim.material.color.set(g.ok ? '#ffffff' : '#ff4f5e');
      return;
    }
    this.zone.visible = true;
    const key = g.id + g.star;
    if (!this.ghost || this.ghost.key !== key) {
      if (this.ghost) { this.scene.remove(this.ghost.a.holder); this.ghost.a.dispose(); }
      const a = await makeHero(g.id, { star: g.star, outline: false, fx: false }); a.setOpacity(0.6); a.play('idle');
      this.ghost = { a, key }; this.scene.add(a.holder);
    }
    const w = this.toWorld(g.x, g.y);
    this.ghost.a.holder.position.set(w.x, 0, w.z);
    this.ghost.a.holder.rotation.y = Math.PI;
    this.ghost.ok = g.ok;
    this.aim.visible = true; this.aim.position.set(w.x, 0.09, w.z);
    const c = HERO[g.id]; this.aim.scale.setScalar(c.range > 2 ? c.range : 1.1);
    this.aim.material.color.set(g.ok ? '#ffffff' : '#ff4f5e');
    // étiquette : portée et capture du Cœur
    const inHeart = Math.hypot(g.x - HEART.x, g.y - HEART.y) <= HEART.r;
    this.ghostInfo = { x: g.x, y: g.y, ok: g.ok,
      a: c.range > 2 ? 'Portée ' + String(c.range).replace('.', ',') + ' cases' : 'Corps à corps',
      b: c.fly ? '🪽 Volant : ne capture pas le Cœur' : c.type === 'building' ? 'Bâtiment : ne capture pas' : c.tgt === 'buildings' ? 'Fonce sur les bâtiments' : inHeart ? '✦ Capture le Cœur ici' : '✦ Peut capturer le Cœur',
      heart: inHeart && !c.fly && c.type !== 'building' };
  }
  highlightSlot(i) { this.bench.forEach((b, k) => { b.sel = k === i; b.rune.material.color.set(b.sel ? '#ffd166' : '#8fd8ff'); b.halo.material.color.set(b.sel ? '#ffc04a' : '#5fb8ff'); b.halo.material.opacity = b.sel ? 0.7 : 0.35; }); }

  // Zones des failles et des événements de monde (Lot 3) : 0 = faille, 1 = événement du monde
  syncZones(s, dt) {
    const COL = { fureur: '#ff4a3a', source: '#4dff9a', tempete: '#b46bff', bourrasque: '#2f80e8', lave: '#ff5a10', spores: '#3ee07a', halo: '#ffb52e', hate: '#c08aff' };
    const R = s.rift, Wv = s.wev && s.wev.k !== 'eclipse' ? s.wev : null;
    const items = [R ? { key: 'r' + R.n, k: R.k, zone: { shape: 'circle', x: R.x, y: R.y, r: R.r }, warn: false } : null, Wv ? { key: 'w' + Wv.n, k: Wv.k, zone: Wv.zone, warn: !Wv.on } : null];
    this.zones.forEach((Z, i) => {
      const it = items[i];
      if (it) {
        Z.last = it; Z.fade = Math.min(1, Z.fade + dt * 2.5);
        const u = Z.u, zz = it.zone; u.k.value = ZONE_K[it.k]; u.col.value.set(COL[it.k]); u.warn.value = it.warn ? 1 : 0;
        if (zz.shape === 'circle') { u.shape.value = 0; u.z.value.set(zz.x, zz.y, 0, 0); u.zr.value = zz.r; }
        else if (zz.shape === 'band') { u.shape.value = 1; u.z.value.set(zz.y0, zz.y1, 0, 0); u.zr.value = 1; }
        else { u.shape.value = 2; u.z.value.set(zz.side, 0, 0, 0); u.zr.value = 1; }
        // particules légères (moins en qualité « eco »)
        if (!it.warn && Math.random() < dt * (this.q.low ? 4 : 10)) this.zoneSpark(it, COL[it.k]);
      } else Z.fade = Math.max(0, Z.fade - dt * 2);
      Z.m.visible = Z.fade > 0.01; Z.u.a.value = Z.fade * (i === 0 ? 0.9 : 0.75); Z.u.t.value = this.time;
    });
  }
  zoneSpark(it, col) {
    const z = it.zone; let x, y;
    if (z.shape === 'circle') { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()) * z.r; x = z.x + Math.cos(a) * r; y = z.y + Math.sin(a) * r; }
    else if (z.shape === 'band') { x = CX + (Math.random() - 0.5) * RX * 1.6; y = z.y0 + Math.random() * (z.y1 - z.y0); }
    else { x = CX + z.side * (RX * 0.62 + Math.random() * RX * 0.3); y = CY + (Math.random() - 0.5) * RY * 1.4; }
    const w = this.toWorld(x, y), up = { lave: 1.2, spores: 0.6, halo: 1.5, source: 0.8, fureur: 1, tempete: 0.4, hate: 0.6, bourrasque: 0.1 }[it.k] || 0.5;
    this.fx.emit(w.x, 0.3, w.z, { n: it.k === 'bourrasque' ? 1 : 2, color: [col, '#ffffff'], size: it.k === 'spores' ? 0.35 : 0.3, life: 1.1, speed: it.k === 'bourrasque' ? 0.2 : 0.5, up, alpha: 0.8 });
  }
  // Mouvements de caméra des temps forts (Lot 4) : petit zoom vers le point (image entière : 3D + calque, donc les arènes peintes restent alignées)
  punch(x, y, k) {
    let off = false; try { off = localStorage.getItem('myt_cam') === '0'; } catch (e) {}
    if (off || !this.ow) return;
    const p = this.screenOf(x, y, 0.5);
    this.pz = { x: Math.max(0, Math.min(this.ow, p.x)), y: Math.max(0, Math.min(this.oh, p.y)), k: Math.max(k, this.pz ? this.pz.k * (1 - this.pz.t / 0.9) : 0), t: 0 };
  }
  punchTick(dt) {
    const P = this.pz; if (!P) return;
    P.t += dt; const u = P.t / 0.9;
    const ease = u >= 1 ? 0 : P.k * (u < 0.18 ? Math.sin(u / 0.18 * Math.PI / 2) : Math.cos((u - 0.18) / 0.82 * Math.PI / 2));
    const tr = ease > 0.0005 ? `scale(${1 + ease})` : '';
    for (const el of [this.cv, this.ov]) { el.style.transformOrigin = `${P.x}px ${P.y}px`; el.style.transform = tr; }
    if (u >= 1) this.pz = null;
  }
  // Rayon du Mythe (Lot 2) : faisceau du Cœur jusqu'au Sanctuaire visé, éclair, explosion, secousse
  mythBeam(e, team) {
    const a = this.toWorld(e.x0, e.y0), b = this.toWorld(e.x1, e.y1), col = TEAM[team];
    const A = new THREE.Vector3(a.x, 1.6, a.z), B = new THREE.Vector3(b.x, 2.2, b.z), len = A.distanceTo(B);
    const mk = (r, c, op) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 12, 1, true), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false })); m.position.copy(A).add(B).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); this.scene.add(m); return m; };
    const core = mk(0.22, '#ffffff', 1), glow = mk(0.75, col, 0.55);
    (this.beams = this.beams || []).push({ core, glow, t: 0, life: 1.1 });
    this.fx.pillar(a.x, a.z, 1.6, col, 1.0, 9); this.fx.flash(a.x, 2, a.z, 7, col, 0.5);
    this.fx.flash(b.x, 2.5, b.z, 8, '#ffffff', 0.6); this.fx.explosion(b.x, b.z, 2.4, 'magic'); this.fx.ring(b.x, b.z, 3.6, col, 0.8);
    this.shake = Math.max(this.shake, 0.7);
  }
  beamTick(b, dt) {
    b.t += dt; const k = 1 - b.t / b.life;
    if (k <= 0) { for (const m of [b.core, b.glow]) { this.scene.remove(m); m.geometry.dispose(); } return false; }
    const w = 1 + Math.sin(b.t * 40) * 0.12;
    b.core.material.opacity = k; b.glow.material.opacity = 0.55 * k; b.core.scale.set(w * (0.4 + k * 0.6), 1, w * (0.4 + k * 0.6)); b.glow.scale.set(w * (0.5 + k), 1, w * (0.5 + k));
    return true;
  }

  // ---------- Effets à partir des événements ----------
  ingest(ev, s) {
    for (const e of ev) {
      const w = e.x !== undefined ? this.toWorld(e.x, e.y) : null;
      const team = e.p === this.me ? 0 : 1;
      if (['fuse', 'heart', 'bossDown', 'boss', 'discharge'].includes(e.type) || (e.type === 'die' && e.kind === 'sanct') || e.type === 'end') { const k = e.type === 'end' || e.type === 'bossDown' ? 1.5 : 0.8; this.world.cheer(k); this.artCheer = Math.min(1.5, (this.artCheer || 0) + k); }
      switch (e.type) {
        case 'deploy': if (e.star >= 3) this.punch(e.x, e.y, 0.05); this.fx.ring(w.x, w.z, 1.4, TEAM[team], 0.6); this.fx.pillar(w.x, w.z, 0.6, TEAM[team], 0.7, 7); break;
        case 'land': { const v = this.views.get(e.id); if (v) { this.fx.dust(w.x, w.z, 12); this.fx.ring(w.x, w.z, 1.0, '#ffffff', 0.35); } break; }
        case 'attack': { const v = this.views.get(e.id); if (v && v.actor) { v.actor.play('attack', { force: true }); const c = HERO[s.ents.find(o => o.id === e.id)?.card]; if (c && !c.proj && !c.chain) { const t = this.toWorld(e.tx, e.ty); this.fx.emit(t.x, 0.9, t.z, { n: 6, color: ['#ffffff', '#ffe9b0'], size: 0.3, life: 0.25, speed: 3 }); } } break; }
        case 'hit': { const v = this.views.get(e.id); if (v && v.actor) v.actor.flash(); const ent = s.ents.find(o => o.id === e.id); if (ent && ent.kind === 'sanct') { this.num(e.x, e.y, '-' + e.amount, 3.4); this.sanctFlash = 0.1; } break; }
        case 'die': this.onDie(e, s); break;
        case 'boom': this.fx.explosion(w.x, w.z, e.r, e.kind); if (e.kind === 'roar') this.shake = Math.max(this.shake, 0.4); if (e.kind === 'surcharge') this.fx.ring(w.x, w.z, e.r * 1.3, '#c8b8ff', 0.5); if (e.kind === 'breche') { this.fx.ring(w.x, w.z, e.r * 1.4, '#e8d8b0', 0.5); this.shake = Math.max(this.shake, 0.2); } break;
        case 'rico': { const b = this.toWorld(e.tx, e.ty); this.fx.bolt([new THREE.Vector3(w.x, 0.9, w.z), new THREE.Vector3(b.x, 0.9, b.z)], '#c8ffd0', 0.18, 0.05); break; }
        case 'star3': this.star3Fx(e, w, s); break;
        case 'recycle': if (e.p === this.me) { const b = this.bx[e.slot]; this.fx.ring(b, this.bz, 1.3, '#7dff9a', 0.6); this.fx.emit(b, 0.5, this.bz, { n: 22, color: ['#b0ffc0', '#7fd8ff', '#ffffff'], size: 0.4, life: 0.7, speed: 2.2, up: 1 }); this.num(CX + this.bx[e.slot], CY + this.bz / this.zk, '+' + e.back + ' éther', 1.2, '#b98cff'); } break;
        case 'cleave': this.fx.ring(w.x, w.z, e.r * 1.2, '#ffe0b0', 0.3); this.fx.emit(w.x, 0.8, w.z, { n: 10, color: ['#ffffff', '#ffd27a'], size: 0.35, life: 0.3, speed: 4, up: 0.2 }); break;
        case 'impact': if (e.kind === 'arrow') this.fx.emit(w.x, 0.9, w.z, { n: 4, color: '#ffffff', size: 0.25, life: 0.2, speed: 2 }); else if (e.kind === 'ice') this.fx.emit(w.x, 0.9, w.z, { n: 8, color: ['#ffffff', '#9fe8ff'], size: 0.35, life: 0.4, speed: 2.5 }); else this.fx.emit(w.x, 0.9, w.z, { n: 8, color: ['#ffffff', '#ffd27a'], size: 0.4, life: 0.3, speed: 2.5 }); break;
        case 'zap': this.fx.bolt(e.pts.map(p => { const q = this.toWorld(p.x, p.y); return new THREE.Vector3(q.x, 1.1, q.z); })); break;
        case 'dash': { const a = this.toWorld(e.x0, e.y0), b = this.toWorld(e.x1, e.y1); for (let k = 0; k <= 8; k++) this.fx.emit(a.x + (b.x - a.x) * k / 8, 0.8, a.z + (b.z - a.z) * k / 8, { n: 3, color: ['#ffb48a', '#ff7a3d'], size: 0.5, life: 0.4, speed: 0.6, gravity: 0 }); break; }
        case 'fuse': if (e.star >= 3) this.punch(e.x, e.y, 0.05); this.fx.pillar(w.x, w.z, 1.0, '#ffd166', 1.0, 9); this.fx.ring(w.x, w.z, 2.2, '#ffd166', 0.7); this.fx.emit(w.x, 1, w.z, { n: 40, color: ['#fff3c0', '#ffd166'], size: 0.45, life: 1, speed: 3, up: 0.9 }); this.num(e.x, e.y, '★'.repeat(e.star) + ' FUSION', 3.0, '#ffd166', true); break;
        case 'conjure': { const v = this.views.get(e.id); if (v && v.actor) v.actor.play('cast', { force: true }); this.fx.ring(w.x, w.z, 2, FAC_COL[e.fac] || '#a0ffb0', 0.7); this.fx.emit(w.x, 0.3, w.z, { n: 20, color: [FAC_COL[e.fac] || '#a0ffb0', '#ffffff'], size: 0.4, life: 0.8, speed: 1.5, up: 1 }); break; }
        case 'nova': { const v = this.views.get(e.id); if (v && v.actor) v.actor.play('cast', { force: true }); this.fx.ring(w.x, w.z, e.r, '#bff0ff', 0.6); this.fx.shards(w.x, w.z, e.r); this.fx.emit(w.x, 0.6, w.z, { n: 30, color: ['#ffffff', '#bff0ff'], size: 0.4, life: 0.8, speed: 4, up: 0.3 }); break; }
        case 'cast': if (SPELL[e.spell].fx === 'meteor') { const w2 = this.toWorld(e.x, e.y); this.fx.meteor(w2.x, w2.z, e.delay); } break;
        case 'spell': this.spellFx(e, w); break;
        case 'heart': this.punch(HEART.x, HEART.y, 0.04); this.fx.flash(0, 2, 0, 6, e.owner < 0 ? '#ffffff' : TEAM[e.owner === this.me ? 0 : 1], 0.6); this.fx.ring(0, 0, 3.4, e.owner < 0 ? '#ffffff' : TEAM[e.owner === this.me ? 0 : 1], 0.8); break;
        case 'shieldBreak': { const ent = s.ents.find(o => o.id === e.id); if (ent) { const q = this.toWorld(ent.x, ent.y); this.fx.emit(q.x, 1, q.z, { n: 14, color: ['#cfe8ff', '#ffffff'], size: 0.35, life: 0.5, speed: 3 }); } break; }
        case 'boss': this.shake = 0.6; break;
        case 'discharge': this.mythBeam(e, team); this.punch(HEART.x, HEART.y, 0.07); break;
        case 'cmdr': { this.fx.pillar(w.x, w.z, 1.2, '#ffd36a', 1.1, 9); this.fx.ring(w.x, w.z, 2.2, '#ffd36a', 0.8); this.fx.flash(w.x, 2, w.z, 6, '#fff3c0', 0.5); this.shake = Math.max(this.shake, 0.35); this.punch(e.x, e.y, 0.06); break; }
        case 'cmdrEnd': this.fx.pillar(w.x, w.z, 0.9, '#ffd36a', 0.6, 7); this.fx.emit(w.x, 0.6, w.z, { n: 24, color: ['#fff3c0', '#ffd36a'], size: 0.4, life: 0.8, speed: 2, up: 1.5 }); break;
        case 'csig': {
          const col = e.k === 'heal' ? '#7dff9a' : e.k === 'volley' ? '#9fe8ff' : '#ffb04a';
          this.fx.ring(w.x, w.z, e.k === 'volley' ? 6 : e.k === 'heal' ? 4 : 2.8, col, 0.7); this.fx.flash(w.x, 1.5, w.z, 5, col, 0.45);
          if (e.k === 'wave') { this.fx.explosion(w.x, w.z, 2.6, 'roar'); this.shake = Math.max(this.shake, 0.45); }
          this.punch(e.x, e.y, 0.045); break;
        }
        case 'rift': this.fx.flash(w.x, 1.5, w.z, 5, '#ffffff', 0.5); this.fx.ring(w.x, w.z, e.r * 1.4, '#ffffff', 0.7); this.shake = Math.max(this.shake, 0.25); break;
        case 'halo': { const v = this.views.get(e.id); if (v && v.actor) { const p = v.actor.holder.position; this.fx.ring(p.x, p.z, 0.9, '#ffd36a', 0.5); } break; }
        case 'order': if (e.p === this.me) this.orderT = 2.5; break;
        case 'bossSkill': {
          const v = this.views.get(e.id); if (v && v.actor) v.actor.play(e.k === 'slam' ? 'attack' : 'cast', { force: true });
          if (e.k === 'slam') { this.fx.explosion(w.x, w.z, e.r, 'roar'); this.fx.ring(w.x, w.z, e.r * 1.3, '#ff5a3a', 0.6); this.shake = 0.45; }
          else if (e.k === 'freeze') { this.fx.shards(w.x, w.z, e.r, '#bff0ff', 2.2); this.fx.ring(w.x, w.z, e.r, '#bff0ff', 0.7); }
          else if (e.k === 'heal') { this.fx.pillar(w.x, w.z, 1.2, '#7dff9a', 1.2, 7); this.fx.emit(w.x, 0.5, w.z, { n: 30, color: ['#b0ffb8', '#ffffff'], size: 0.45, life: 1, speed: 2, up: 1 }); }
          else if (e.k === 'summon') { this.fx.ring(w.x, w.z, 2.4, '#c08aff', 0.8); this.fx.emit(w.x, 0.3, w.z, { n: 26, color: ['#c08aff', '#2a0a40'], size: 0.5, life: 0.9, speed: 1.6, up: 1 }); }
          else if (e.k === 'rage') { this.fx.flash(w.x, 2, w.z, 6, '#ff2a2a', 0.6); this.shake = 0.3; }
          break; }
        case 'bossDown': this.fx.explosion(w.x, w.z, 3, 'fire'); this.fx.pillar(w.x, w.z, 1.4, '#ffd166', 1.4, 10); this.shake = 0.8; break;
        case 'wave': this.fx.flash(0, 3, -8, 10, '#ff5a3a', 0.6); break;
        case 'summon': if (e.p === this.me) { const b = this.bx[e.slot]; const col = RARITIES[HERO[e.id].rar].color; const bz = this.bzs[e.slot]; this.fx.pillar(b, bz, 0.8, col, 0.8, 5); this.fx.emit(b, 0.4, bz, { n: 24, color: [col, '#ffffff'], size: 0.45, life: 0.8, speed: 2, up: 1 }); } break;
        case 'benchFuse': if (e.p === this.me) { const b = this.bx[e.slot]; const bz = this.bzs[e.slot]; this.fx.pillar(b, bz, 1, '#ffd166', 0.9, 6); this.fx.emit(b, 0.6, bz, { n: 36, color: ['#fff3c0', '#ffd166'], size: 0.45, life: 0.9, speed: 2.5, up: 1 }); } break;
      }
    }
  }
  // Héros ★3 : grosse colonne dorée, double onde, gerbe d'étincelles et tremblement (effet unique selon son rôle)
  star3Fx(e, w, s) {
    const col = { gardien: '#ffd166', tireur: '#7dff9a', mage: '#b8a8ff', bete: '#ff8a4a', siege: '#e8d8b0' }[e.role] || '#ffd166';
    this.fx.pillar(w.x, w.z, 1.5, '#fff3c0', 1.3, 12); this.fx.pillar(w.x, w.z, 0.8, col, 1.5, 14);
    this.fx.ring(w.x, w.z, e.role === 'gardien' ? 3.0 : 2.4, col, 0.8); this.fx.ring(w.x, w.z, 3.6, '#ffffff', 0.6);
    this.fx.flash(w.x, 1.5, w.z, 7, col, 0.45);
    this.fx.emit(w.x, 0.8, w.z, { n: 70, color: ['#fff3c0', '#ffd166', col], size: 0.55, life: 1.2, speed: 4.5, up: 0.8, spread: 1.4 });
    if (e.role === 'gardien') this.fx.explosion(w.x, w.z, 2.4, 'roar');
    this.num(e.x, e.y, '★★★ ' + ({ gardien: 'ONDE DE CHOC', tireur: 'RICOCHET', mage: 'SURCHARGE', bete: 'RAGE', siege: 'BRÈCHE' }[e.role] || ''), 3.4, '#ffd166', true);
    this.shake = Math.max(this.shake, 0.55);
    if (this.world && this.world.cheer) this.world.cheer(0.8);
  }
  spellFx(e, w) {
    if (e.reso) this.fx.ring(w.x, w.z, e.r * 1.25, '#ffffff', 0.7);
    if (e.fx === 'eruption') {
      this.fx.explosion(w.x, w.z, e.r, 'fire'); this.fx.disc(w.x, w.z, e.r, '#ff4a0a', e.dur, 0.55); this.shake = Math.max(this.shake, 0.5);
      this.lava.push({ x: w.x, z: w.z, r: e.r, t: e.dur, k: 0 });
      return;
    }
    if (e.fx === 'roots') {
      this.fx.disc(w.x, w.z, e.r, '#3f9a52', 2.5, 0.45); this.fx.ring(w.x, w.z, e.r, '#9fff8a', 0.8);
      for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, d = e.r * (0.3 + (k % 3) * 0.25); this.fx.pillar(w.x + Math.cos(a) * d, w.z + Math.sin(a) * d, 0.18, '#6fd06a', 1.6, 1.6); }
      this.fx.emit(w.x, 0.3, w.z, { n: 50, color: ['#7fe08a', '#3f9a52', '#d8ffb0'], size: 0.45, life: 1.2, speed: 1.6, up: 0.9, jitter: e.r });
      this.shake = Math.max(this.shake, 0.2); return;
    }
    if (e.fx === 'curse') {
      this.fx.disc(w.x, w.z, e.r, '#6a1aa0', 2.2, 0.5); this.fx.ring(w.x, w.z, e.r * 1.1, '#c08aff', 0.9); this.fx.flash(w.x, 1.5, w.z, e.r * 2, '#a060ff', 0.4);
      this.fx.emit(w.x, 0.4, w.z, { n: 60, color: ['#e0c0ff', '#a060ff', '#2a0a40'], size: 0.55, life: 1.4, speed: 1.4, up: 1.1, jitter: e.r, gravity: 1 });
      this.shake = Math.max(this.shake, 0.25); return;
    }
    if (e.fx === 'meteor') { this.fx.explosion(w.x, w.z, e.r, 'fire'); this.fx.explosion(w.x, w.z, e.r * 0.6, 'roar'); this.fx.disc(w.x, w.z, e.r, '#ff5a1a', 2.5, 0.5); this.shake = 0.6; }
    else if (e.fx === 'freeze') { this.fx.shards(w.x, w.z, e.r, '#bff0ff', 3.5); this.fx.disc(w.x, w.z, e.r, '#9fe8ff', 3.5, 0.35); this.fx.emit(w.x, 2, w.z, { n: 60, color: ['#ffffff', '#cfefff'], size: 0.35, life: 1.6, speed: 2, up: -0.2, spread: 1.5, gravity: -1, jitter: e.r }); }
    else if (e.fx === 'heal') { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; this.fx.pillar(w.x + Math.cos(a) * e.r * 0.55, w.z + Math.sin(a) * e.r * 0.55, 0.3, '#ffe39a', 1.2, 5); } this.fx.disc(w.x, w.z, e.r, '#ffd166', 1.2, 0.35); this.fx.emit(w.x, 0.3, w.z, { n: 50, color: ['#fff6c8', '#ffd166', '#b0ffb0'], size: 0.45, life: 1.2, speed: 1.5, up: 1.2, jitter: e.r }); }
    else if (e.fx === 'storm') { this.fx.bolt([new THREE.Vector3(w.x + 1, 16, w.z - 3), new THREE.Vector3(w.x, 0.2, w.z)], '#dff8ff', 0.35, 0.14); this.fx.explosion(w.x, w.z, e.r, 'bolt'); this.shake = 0.25; }
  }
  onDie(e, s) {
    const w = this.toWorld(e.x, e.y);
    if (e.kind === 'sanct') {
      const S = this.sanct[e.p === this.me ? 0 : 1];
      for (let k = 0; k < 4; k++) setTimeout(() => this.fx.explosion(w.x + (Math.random() - 0.5) * 2, w.z + (Math.random() - 0.5) * 2, 2.5, 'fire'), k * 180);
      this.shake = 1.0; S.dead = true;
      return;
    }
    const v = this.views.get(e.id);
    if (v && v.actor) { v.dying = 0.01; v.actor.play('death', { force: true }); if (v.ring) v.ring.visible = false; }
    this.fx.emit(w.x, 0.6, w.z, { n: 10, color: ['#e8e4f0', '#c8c0d8'], size: 0.7, life: 0.8, speed: 1.2, up: 0.7, gravity: 0.5, alpha: 0.5 });
  }
  num(x, y, txt, h = 2.2, col = '#ffffff', big = false) { this.nums.push({ x, y, h, txt, col, big, t: 0 }); if (this.nums.length > 30) this.nums.shift(); }

  // ---------- Image ----------
  async ensureView(e) {
    const v = { pending: true, ring: null, actor: null };
    this.views.set(e.id, v);
    const a = await makeHero(e.card, { star: e.star, lite: this.q.lite, skin: e.boss ? e.boss.skin : e.p === this.me ? (this.skins || {})[e.card] : null });
    if (e.boss) { a.holder.scale.multiplyScalar(e.boss.scale); a.height *= e.boss.scale; const gl = glowSprite(0xff2a3a, e.r * 4); gl.material.opacity = 0.3; gl.position.y = 0.3; a.holder.add(gl); }
    if (!this.views.has(e.id)) { a.dispose(); return; }
    a.holder.add(blobShadow(e.r * 3));
    v.actor = a; v.pending = false; v.star = e.star;
    const team = e.p === this.me ? 0 : 1;
    const ring = new THREE.Mesh(new THREE.RingGeometry(e.r * 0.95, e.r * 1.2, 32), new THREE.MeshBasicMaterial({ color: e.star > 1 ? '#ffd166' : TEAM[team], transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; a.holder.add(ring); v.ring = ring;
    const c = HERO[e.card];
    if (c.model.glow && c.rar !== 'commun') { const gl = glowSprite(new THREE.Color(c.model.glow), e.r * 3.2); gl.position.y = 0.3; gl.material.opacity = 0.35; a.holder.add(gl); }
    const w = this.toWorld(e.x, e.y);
    a.holder.position.set(w.x, 0, w.z);
    a.holder.rotation.y = e.p === this.me ? Math.PI : 0;
    this.scene.add(a.holder);
    if (e.deploy > 0.2) { a.holder.position.y = c.model.spawn ? 0 : 6; v.drop = c.model.spawn ? 0 : 1; a.play('spawn', { force: true }); }
    else a.play('idle');
  }

  sync(s, alpha, dt) {
    this.time += dt;
    const seen = new Set();
    for (const e of s.ents) {
      if (e.kind === 'sanct') continue;
      seen.add(e.id);
      let v = this.views.get(e.id);
      if (!v) { this.ensureView(e); continue; }
      if (v.pending || !v.actor) continue;
      const a = v.actor, x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha, w = this.toWorld(x, y);
      a.holder.position.x = w.x; a.holder.position.z = w.z;
      if (v.drop) { a.holder.position.y = Math.max(0, a.holder.position.y - dt * 14); if (a.holder.position.y <= 0) v.drop = 0; }
      if (e.star !== v.star) { v.star = e.star; const k = [1, 1, 1.18, 1.36][e.star] / [1, 1, 1.18, 1.36][e.star - 1]; a.holder.scale.multiplyScalar(k); if (v.ring) v.ring.material.color.set('#ffd166'); }
      if (e.kind === 'unit' && (e.faceX || e.faceY)) {
        const want = Math.atan2(e.faceX, e.faceY);
        let d = want - a.holder.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        a.holder.rotation.y += d * Math.min(1, dt * 10);
      }
      a.setFrozen(e.frozen > 0);
      if (e.s3 && v.ring) { v.ring.material.opacity = 0.6 + Math.sin(this.time * 5 + e.id) * 0.35; v.ring.scale.setScalar(1 + Math.sin(this.time * 5 + e.id) * 0.12); } // aura ★3
      if (e.deploy <= 0 && !v.dying) {
        a.back = e.moving ? (e.spd < 1 ? 'walk' : 'run') : 'idle';
        if (e.moving) a.play(e.spd < 1 ? 'walk' : 'run'); else if (!['attack', 'cast'].includes(a.state) || !a.lock) a.play('idle');
      }
    }
    for (const [id, v] of this.views) {
      if (v.pending || !v.actor) { if (!seen.has(id) && !v.pending) this.views.delete(id); continue; }
      if (!seen.has(id) && !v.dying) v.dying = 0.01;
      if (v.dying) {
        v.dying += dt;
        if (v.dying > 1.4) v.actor.holder.position.y -= dt * 1.2;
        if (v.dying > 2.2) { this.scene.remove(v.actor.holder); v.actor.dispose(); this.views.delete(id); continue; }
      }
      v.actor.update(dt);
    }
    // Cercle d'invocation du joueur
    const B = s.players[this.me].bench;
    for (let i = 0; i < BENCH; i++) {
      const b = this.bench[i], h = B[i], key = h ? h.id + h.star : '';
      if (key !== b.key) {
        b.key = key;
        if (b.actor) { b.g.remove(b.actor.holder); b.actor.dispose(); b.actor = null; }
        if (h) {
          const k = key;
          makeHero(h.id, { star: h.star, lite: this.q.lite, skin: (this.skins || {})[h.id] }).then(a => {
            if (b.key !== k) { a.dispose(); return; }
            a.holder.position.y = 0.6; a.holder.scale.multiplyScalar(1.15); a.holder.rotation.order = 'YXZ'; a.play('idle'); b.actor = a; b.g.add(a.holder);
          });
        }
      }
      // le héros lévite au-dessus de son médaillon
      if (b.actor) { b.actor.update(dt); b.actor.holder.rotation.y = Math.sin(this.time * 0.6 + i) * 0.35; b.actor.holder.rotation.x = -0.55; b.actor.holder.position.y = 0.62 + Math.sin(this.time * 2.1 + i * 1.3) * 0.1; }
      b.rune.rotation.z += dt * (h ? 0.8 : 0.35);
      if (!b.sel) { const c = h ? RARITIES[HERO[h.id].rar].color : '#8fd8ff'; if (b.col !== c) { b.col = c; b.rune.material.color.set(c); } b.halo.material.opacity = (h ? 0.42 : 0.22) + Math.sin(this.time * 2 + i) * 0.06; }
      else b.col = null;
    }
    // Sanctuaires, Cœur
    for (const p of [0, 1]) {
      const e = s.ents.find(o => o.kind === 'sanct' && o.p === p), S = this.sanct[p === this.me ? 0 : 1], k = Math.max(0, e.hp / e.maxHp);
      if (!S.dead) S.cr.update(this.time, k); else { S.cr.group.position.y = Math.max(0.6, S.cr.group.position.y - dt * 3); }
      if (k < 0.5 && !S.dead) { S.smokeT -= dt; if (S.smokeT <= 0) { S.smokeT = 0.15 + k * 0.4; this.fx.emit(S.g.position.x + (Math.random() - 0.5) * 2, 2.5, S.g.position.z, { n: 1, color: k < 0.25 ? ['#ff8a3d', '#5a5050'] : ['#6a6464'], size: 1.2, life: 1.6, speed: 0.4, up: 1, gravity: 1, alpha: 0.4 }); } }
    }
    this.heart.update(this.time, this.me === 0 ? s.heart.ctl : -s.heart.ctl, s.heart.owner < 0 ? -1 : s.heart.owner === this.me ? 0 : 1, TEAM);
    { const cap = s.heart.cap ?? -1, H = this.heartHalo.material; // halo du Cœur
      if (cap === 2) { H.color.set(Math.sin(this.time * 14) > 0 ? '#ffffff' : '#ffb02e'); H.opacity = 0.45; }
      else if (cap >= 0) { H.color.set(TEAM[cap === this.me ? 0 : 1]); H.opacity = 0.32 + Math.sin(this.time * 6) * 0.12; }
      else if (s.heart.owner >= 0) { H.color.set(TEAM[s.heart.owner === this.me ? 0 : 1]); H.opacity = 0.16; }
      else { H.color.set('#ffffff'); H.opacity = 0.08 + Math.sin(this.time * 2) * 0.03; }
      this.heartHalo.rotation.z += dt * 0.3; }
    for (const z of this.lava) { z.t -= dt; z.k -= dt; if (z.k <= 0 && z.t > 0) { z.k = 0.12; const a = Math.random() * 6.283, d = Math.random() * z.r; this.fx.emit(z.x + Math.cos(a) * d, 0.2, z.z + Math.sin(a) * d, { n: 3, color: ['#fff3c0', '#ffb02e', '#ff4a0a'], size: 0.5, life: 0.7, speed: 1.2, up: 1.2, spread: 0.4, gravity: 1 }); } }
    this.lava = this.lava.filter(z => z.t > 0);
    if (this.zones) this.syncZones(s, dt);
    this.punchTick(dt);
    if (this.beams) this.beams = this.beams.filter(b => this.beamTick(b, dt));
    this.fx.syncProjectiles(s.proj, (x, y) => this.toWorld(x, y));
    this.fx.update(dt);
    this.world.update(dt, this.time);
    if (this.arcU) this.arcU.t.value = this.time;
    if (this.bgU) { this.artCheer = Math.max(0, (this.artCheer || 0) - dt * 0.6); this.bgU.t.value = this.time; this.bgU.cheer.value = Math.min(1, this.artCheer); }
    if (this.artUps) for (const u of this.artUps) u(dt, this.time);
    if (this.ghost) { this.ghost.a.update(dt); }
    // caméra (tremblement)
    if (this.shake > 0) { this.shake = Math.max(0, this.shake - dt); const k = this.shake * 0.5; this.cam.position.set(this.camBase.x + (Math.random() - 0.5) * k, this.camBase.y + (Math.random() - 0.5) * k, this.camBase.z + (Math.random() - 0.5) * k); }
    else this.cam.position.copy(this.camBase);
    this.post.render();
    if (this.perf) this.perf.tick(dt);
    this.drawOverlay(s, alpha, dt);
  }

  // Éclair d'énergie entre deux socles identiques prêts à fusionner (même héros, même rang, rang < 3)
  drawFusionBolts(c, B, dt) {
    const pairs = [];
    for (let i = 0; i < BENCH; i++) for (let j = i + 1; j < BENCH; j++) { const a = B[i], b = B[j]; if (a && b && a.id === b.id && a.star === b.star && a.star < 3) pairs.push([i, j]); }
    if (!pairs.length) return;
    this.boltT = (this.boltT || 0) - dt;
    if (this.boltT <= 0 || !this.bolts) { this.boltT = 0.07; this.bolts = {}; }
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round'; c.lineCap = 'round';
    for (const [i, j] of pairs) {
      const k = i + '-' + j, A = this.benchScreen(i, 0.9), Bp = this.benchScreen(j, 0.9);
      if (!this.bolts[k]) {
        // ligne brisée qui monte en arc entre les deux médaillons (refaite ~14 fois par seconde)
        const n = 12 + (j - i) * 4, lift = 26 + (j - i) * 10, pts = [];
        for (let q = 0; q <= n; q++) { const u = q / n, x = A.x + (Bp.x - A.x) * u, y = A.y + (Bp.y - A.y) * u - Math.sin(u * Math.PI) * lift; const jit = q && q < n ? (Math.random() - 0.5) * 14 : 0; pts.push([x + jit * 0.4, y + jit]); }
        this.bolts[k] = pts;
      }
      const pts = this.bolts[k], path = () => { c.beginPath(); pts.forEach(([x, y], q) => q ? c.lineTo(x, y) : c.moveTo(x, y)); };
      const fl = 0.75 + Math.random() * 0.25;
      path(); c.strokeStyle = `rgba(90,200,255,${0.22 * fl})`; c.lineWidth = 9; c.stroke();
      path(); c.strokeStyle = `rgba(140,230,255,${0.6 * fl})`; c.lineWidth = 3.5; c.stroke();
      path(); c.strokeStyle = `rgba(255,255,255,${0.95 * fl})`; c.lineWidth = 1.3; c.stroke();
      for (const P of [A, Bp]) { const g = c.createRadialGradient(P.x, P.y, 0, P.x, P.y, 16); g.addColorStop(0, `rgba(220,245,255,${0.8 * fl})`); g.addColorStop(1, 'rgba(90,200,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(P.x, P.y, 16, 0, 7); c.fill(); }
    }
    c.restore();
  }

  drawOverlay(s, alpha, dt) {
    const c = this.octx, d = this.od;
    c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, this.ow, this.oh);
    for (const e of s.ents) {
      if (e.kind === 'sanct' || e.deploy > 0) continue;
      const v = this.views.get(e.id); if (!v || !v.actor) continue;
      const show = e.hp < e.maxHp || e.star > 1 || e.kind === 'building' || e.shield > 0 || e.rootT > 0 || e.curseT > 0;
      if (!show) continue;
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
      const h = v.actor.height + (e.fly ? 1.2 : 0.25);
      const p = this.screenOf(x, y, h);
      const w = Math.max(26, e.r * 44), hh = 5;
      const team = e.p === this.me ? 0 : 1;
      c.fillStyle = 'rgba(10,6,20,.8)'; rr(c, p.x - w / 2 - 1.5, p.y - 1.5, w + 3, hh + 3, 3); c.fill();
      c.fillStyle = TEAM[team]; rr(c, p.x - w / 2, p.y, w * Math.max(0, e.hp / e.maxHp), hh, 2); c.fill();
      if (e.shield > 0) { c.fillStyle = '#d8ecff'; c.fillRect(p.x - w / 2, p.y - 3, Math.min(w, w * e.shield / e.maxHp * 2), 2); }
      if (e.rootT > 0 || e.curseT > 0) { c.font = '900 11px Nunito, sans-serif'; c.textAlign = 'left'; c.fillStyle = e.curseT > 0 ? '#d8a8ff' : '#9fff8a'; c.strokeStyle = 'rgba(20,10,30,.9)'; c.lineWidth = 3; const ic = (e.rootT > 0 ? '🌿' : '') + (e.curseT > 0 ? '☠' : ''); c.strokeText(ic, p.x + w / 2 + 3, p.y + 6); c.fillText(ic, p.x + w / 2 + 3, p.y + 6); }
      if (e.star > 1) { c.font = '900 12px Nunito, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#ffd166'; c.strokeStyle = 'rgba(20,10,30,.9)'; c.lineWidth = 3; const st = '★'.repeat(e.star); c.strokeText(st, p.x, p.y - 4); c.fillText(st, p.x, p.y - 4); }
    }
    // Jauge de la Décharge du Mythe autour du Cœur : arc bleu = toi, arc rouge = l'ennemi (temps de contrôle cumulé / 30 s)
    {
      const ctr = this.screenOf(HEART.x, HEART.y, 0.05), ex = this.screenOf(HEART.x + HEART.r, HEART.y, 0.05), ey = this.screenOf(HEART.x, HEART.y + HEART.r, 0.05);
      const rx = Math.abs(ex.x - ctr.x), ry = Math.abs(ey.y - ctr.y), top = -Math.PI / 2;
      const arc = (k, col, sc, w) => { if (k <= 0.005) return; c.beginPath(); c.ellipse(ctr.x, ctr.y, rx * sc, ry * sc, 0, top, top + Math.PI * 2 * k); c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
      c.save(); c.lineCap = 'round';
      c.beginPath(); c.ellipse(ctr.x, ctr.y, rx * 1.08, ry * 1.08, 0, 0, 7); c.strokeStyle = 'rgba(10,14,40,.35)'; c.lineWidth = 5; c.stroke();
      const mk = Math.min(1, s.players[this.me].myth / MYTH.need), ok = Math.min(1, s.players[1 - this.me].myth / MYTH.need);
      c.globalCompositeOperation = 'lighter';
      arc(mk, mk > 0.8 ? `rgba(255,214,110,${0.75 + 0.25 * Math.sin(this.time * 9)})` : 'rgba(80,180,255,.9)', 1.08, 4);
      arc(ok, ok > 0.8 ? `rgba(255,120,120,${0.75 + 0.25 * Math.sin(this.time * 9)})` : 'rgba(255,79,94,.8)', 0.9, 3);
      c.restore();
    }
    // Fanions d'ordre (discrets) : seulement au-dessus de TES héros, petits, presque transparents sauf juste après un changement d'ordre
    {
      const P = s.players[this.me], col = { heart: '#ffd36a', assault: '#ff7a4a', defend: '#6fc8ff' }[P.order];
      this.orderT = Math.max(0, (this.orderT || 0) - dt);
      const mine = s.ents.filter(e => e.p === this.me && e.kind === 'unit' && !e.dead && !(e.deploy > 0));
      const a = (this.orderT > 0 ? 0.95 : mine.length > 6 ? 0.32 : 0.5);
      c.save(); c.globalAlpha = a;
      for (const e of mine) {
        const v = this.views.get(e.id); if (!v || !v.actor) continue;
        const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha;
        const p = this.screenOf(x, y, v.actor.height + (e.fly ? 1.2 : 0.25));
        const bx = p.x + Math.max(13, e.r * 22) + 3, by = p.y - 2;
        c.fillStyle = 'rgba(20,14,30,.85)'; c.fillRect(bx - 0.6, by - 9, 1.4, 10);
        c.beginPath(); c.moveTo(bx + 0.8, by - 9); c.lineTo(bx + 7, by - 6.5); c.lineTo(bx + 0.8, by - 4); c.closePath(); c.fillStyle = col; c.fill();
      }
      c.restore();
    }
    // Couronne des Commandants (Lot 4) + anneau du temps restant (le tien en or, celui de l'ennemi en rouge)
    for (const e of s.ents) {
      if (!e.cmdr || e.dead || e.deploy > 0) continue;
      const v = this.views.get(e.id); if (!v || !v.actor) continue;
      const x = e.px + (e.x - e.px) * alpha, y = e.py + (e.y - e.py) * alpha, p = this.screenOf(x, y, v.actor.height + 0.9);
      const mine = e.p === this.me, col = mine ? '#ffd36a' : '#ff6b6b', k = Math.max(0, e.cmdrT) / CMDR.life;
      c.save(); c.translate(p.x, p.y - 4 + Math.sin(this.time * 3) * 2);
      c.beginPath(); c.arc(0, 0, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k); c.strokeStyle = col; c.lineWidth = 2.5; c.stroke();
      c.beginPath(); c.moveTo(-8, 4); c.lineTo(-8, -4); c.lineTo(-4, 0); c.lineTo(0, -6); c.lineTo(4, 0); c.lineTo(8, -4); c.lineTo(8, 4); c.closePath();
      c.fillStyle = col; c.fill(); c.lineWidth = 1.4; c.strokeStyle = 'rgba(40,20,0,.9)'; c.stroke();
      c.restore();
    }
    // Cercle d'Invocation : rang (★) en petites gemmes sous chaque médaillon, éclairs entre deux héros prêts à fusionner
    const B = s.players[this.me].bench;
    for (let i = 0; i < BENCH; i++) {
      const h = B[i]; if (!h) continue;
      const p = this.benchScreen(i);
      for (let k = 0; k < 3; k++) {
        const sx = p.x + (k - 1) * 11, sy = p.y + 19 + Math.abs(k - 1) * -2, on = k < h.star;
        c.beginPath(); c.moveTo(sx, sy - 5); c.lineTo(sx + 4, sy); c.lineTo(sx, sy + 5); c.lineTo(sx - 4, sy); c.closePath();
        c.fillStyle = on ? '#ffd166' : 'rgba(180,200,255,.22)'; c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(15,8,40,.9)'; c.stroke();
      }
    }
    if (this.ghostInfo && this.ghost) {
      const gi = this.ghostInfo, p = this.screenOf(gi.x, gi.y, 0);
      c.font = '800 11px Nunito, sans-serif'; c.lineWidth = 3; c.strokeStyle = 'rgba(15,8,30,.95)';
      c.fillStyle = gi.ok ? '#ffffff' : '#ff8a94'; c.strokeText(gi.a, p.x, p.y + 20); c.fillText(gi.a, p.x, p.y + 20);
      c.fillStyle = gi.heart ? '#ffe28a' : '#bfe6ff'; c.strokeText(gi.b, p.x, p.y + 34); c.fillText(gi.b, p.x, p.y + 34);
    }
    this.drawFusionBolts(c, B, dt);
    for (const n of this.nums) {
      n.t += dt; const k = n.t / 1.1;
      const p = this.screenOf(n.x, n.y, n.h + k * 1.2);
      c.globalAlpha = k < 0.7 ? 1 : Math.max(0, (1 - k) / 0.3);
      c.font = `900 ${n.big ? 20 : 14}px Nunito, sans-serif`; c.lineWidth = 3.5; c.strokeStyle = 'rgba(15,8,30,.9)';
      c.strokeText(n.txt, p.x, p.y); c.fillStyle = n.col; c.fillText(n.txt, p.x, p.y);
    }
    c.globalAlpha = 1;
    this.nums = this.nums.filter(n => n.t < 1.1);
  }

  dispose() {
    if (this.perf) this.perf.dispose();
    this.fx.dispose(); this.world && this.world.dispose();
    for (const [, v] of this.views) if (v.actor) v.actor.dispose();
    if (this.keep) for (const a of this.keep.acts) if (a) a.dispose();
    this.r.dispose(); { const rr = this.r; setTimeout(() => { try { rr.forceContextLoss && rr.forceContextLoss(); } catch (e) {} }, 1500); } // libère la carte graphique après l’affichage du nouvel écran
  }
}

const FAC_COL = { sylve: '#8fff9a', ombre: '#c08aff', givre: '#bff0ff', braise: '#ffb02e', arcane: '#b8a8ff', aube: '#ffe39a' };
function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
