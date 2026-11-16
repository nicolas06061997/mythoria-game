// MYTHORIA — chargement des modèles 3D et fabrication des héros animés.
// Personnages : KayKit (CC0), tous sur le même squelette => une seule banque d'animations partagée.
// Bêtes : Quaternius (CC0), avec leurs propres animations. Créatures : construites par le code (procedural.js).

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { HERO } from '../../shared/content.js';
import { buildProc } from './procedural.js';
import { addRim, addOutline, syncOutlines } from './look.js';
import { attachHeroFx } from './herofx.js';
import { SKINS } from '../../shared/economy.js';

const BASE = 'assets/models/';
const loader = new GLTFLoader();
const cache = new Map();
export function loadGLB(path) {
  if (!cache.has(path)) cache.set(path, new Promise((ok, ko) => loader.load(BASE + path, g => {
    g.scene.traverse(o => { if (o.geometry) o.geometry.userData.shared = true; if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { m.userData.shared = true; }); });
    ok(g);
  }, undefined, ko)));
  return cache.get(path);
}

let CLIPS = null;
export async function heroClips() {
  if (CLIPS) return CLIPS;
  const g = await loadGLB('heroes/anims.glb');
  CLIPS = Object.fromEntries(g.animations.map(a => [a.name, a]));
  return CLIPS;
}

// Liste des fichiers nécessaires pour une liste de héros (pour tout précharger avant un combat).
export function filesFor(ids) {
  const f = new Set();
  for (const id of ids) {
    const m = HERO[id]?.model; if (!m) continue;
    if (m.glb) { f.add('heroes/' + m.glb + '.glb'); for (const [w] of m.add || []) f.add('heroes/' + w + '.glb'); }
    if (m.beast) f.add('beasts/' + m.beast + '.glb');
    const c = HERO[id];
    if (c.summon) for (const x of filesFor([c.summon.id])) f.add(x);
    if (c.death) for (const x of filesFor([c.death.id])) f.add(x);
  }
  return [...f];
}
export async function preload(ids, onProgress) {
  const files = filesFor(ids);
  let n = 0;
  await heroClips();
  await Promise.all(files.map(f => loadGLB(f).then(() => onProgress && onProgress(++n / files.length))));
}

const HEIGHT = 2.1;
const FILTERED = new Map(); // taille de référence d'un héros (en cases)
const tmpBox = new THREE.Box3();

// Objet commun renvoyé pour tous les héros : { root, play(state), update(dt), flash(), height }
class Actor {
  constructor(root, height) { this.root = root; this.height = height; this.mats = []; this.flashT = 0; this.state = ''; this.frozen = false; }
  collectMats(tint, glow) {
    this.root.traverse(o => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = false;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      const cl = list.map(m => {
        const c = m.clone();
        if (tint) c.color.multiply(new THREE.Color(tint));
        if (glow) { c.emissive = new THREE.Color(glow); c.emissiveIntensity = 0.05; }
        c.userData.baseEmissive = c.emissive ? c.emissive.clone() : new THREE.Color(0);
        c.userData.baseEI = c.emissiveIntensity || 0;
        this.mats.push(c);
        return c;
      });
      o.material = Array.isArray(o.material) ? cl : cl[0];
    });
  }
  flash(col = 0xffffff) { this.flashT = 0.12; this.flashCol = col; }
  updateMats(dt) {
    if (this.flashT > 0) {
      this.flashT -= dt;
      const on = this.flashT > 0;
      for (const m of this.mats) if (m.emissive) {
        if (on) { m.emissive.set(this.flashCol); m.emissiveIntensity = 0.9; }
        else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseEI; }
      }
    }
  }
  setFrozen(on) {
    if (on === this.frozen) return;
    this.frozen = on;
    for (const m of this.mats) if (m.emissive) {
      if (on) { m.emissive.set(0x7fd8ff); m.emissiveIntensity = 0.6; }
      else { m.emissive.copy(m.userData.baseEmissive); m.emissiveIntensity = m.userData.baseEI; }
    }
  }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; m.depthWrite = a >= 1; } }
  dispose() { for (const m of this.mats) m.dispose(); }
}

class SkinnedActor extends Actor {
  constructor(root, height, clips, map) {
    super(root, height);
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = clips; this.map = map; this.cur = null; this.lock = 0;
    this.mixer.addEventListener('finished', e => { if (e.action === this.cur && this.onDone) { const f = this.onDone; this.onDone = null; f(); } });
  }
  action(name) { const c = this.clips[name]; return c ? this.mixer.clipAction(c) : null; }
  // state : idle | run | walk | attack | cast | hit | death | spawn | cheer
  play(state, { force = false, speed = 1 } = {}) {
    let name = this.map[state];
    if (Array.isArray(name)) name = name[Math.floor(Math.random() * name.length)];
    if (!name) return;
    const once = ['attack', 'cast', 'hit', 'death', 'spawn', 'cheer'].includes(state);
    if (!force && this.state === state && !once) return;
    if (!force && this.lock > 0 && !['death', 'attack', 'cast'].includes(state)) return;
    const a = this.action(name); if (!a) return;
    this.state = state;
    a.reset(); a.enabled = true; a.setEffectiveTimeScale(speed); a.setEffectiveWeight(1);
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = state === 'death';
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, state === 'death' ? 0.1 : 0.18, false);
    a.play();
    this.cur = a;
    this.lock = once && state !== 'death' ? a.getClip().duration / speed * 0.85 : 0;
    if (once && state !== 'death') this.onDone = () => { this.lock = 0; this.play(this.back || 'idle', { force: true }); };
  }
  update(dt) {
    if (this.lock > 0) this.lock -= dt;
    if (!this.frozen) this.mixer.update(dt);
    this.updateMats(dt);
  }
}

function normalize(root, wanted) {
  root.updateMatrixWorld(true);
  tmpBox.setFromObject(root);
  const h = tmpBox.max.y - tmpBox.min.y || 1;
  const k = wanted / h;
  root.scale.multiplyScalar(k);
  return k;
}

// ---------- Nouveau look d'un héros (model.look) : recoloration par cases de la palette KayKit (64×128 px),
// cases en métal (reflets d'un ciel peint), sans contour. Textures fabriquées une fois par héros et partagées.
const LOOK_CACHE = new Map();
let ENV_TEX = null;
function envTex() {
  if (ENV_TEX) return ENV_TEX;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, '#9aa8c4'); gr.addColorStop(.35, '#5f6d88'); gr.addColorStop(.5, '#384359'); gr.addColorStop(.62, '#232b3b'); gr.addColorStop(1, '#10141d');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
  const spot = (x, y, r, col) => { const s = g.createRadialGradient(x, y, 0, x, y, r); s.addColorStop(0, col); s.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = s; g.fillRect(x - r, y - r, r * 2, r * 2); };
  spot(70, 30, 30, 'rgba(255,250,235,1)'); spot(70, 30, 12, 'rgba(255,255,255,1)'); spot(200, 40, 22, 'rgba(200,255,210,.7)'); spot(140, 56, 40, 'rgba(170,190,230,.45)');
  ENV_TEX = new THREE.CanvasTexture(c); ENV_TEX.mapping = THREE.EquirectangularReflectionMapping; ENV_TEX.colorSpace = THREE.SRGBColorSpace;
  return ENV_TEX;
}
function lookTextures(key, base, look) {
  if (LOOK_CACHE.has(key)) return LOOK_CACHE.get(key);
  const img = base.image, W = img.width, H = img.height, cw = W / 8, ch = H / 4;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, W, H), px = d.data;
  const m = document.createElement('canvas'); m.width = W; m.height = H;
  const mg = m.getContext('2d'); mg.fillStyle = 'rgb(0,' + Math.round((look.rough ?? .62) * 255) + ',0)'; mg.fillRect(0, 0, W, H);
  for (const [[cx, cy], col, k = 1] of look.recolor || []) {
    const t = new THREE.Color(col);
    for (let y = cy * ch; y < (cy + 1) * ch; y++) for (let x = cx * cw; x < (cx + 1) * cw; x++) {
      const i = (y * W + x) * 4, L = (0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]) / 255;
      const v = Math.pow(L, .9) * 1.35 * k;
      px[i] = Math.min(255, t.r * 255 * v); px[i + 1] = Math.min(255, t.g * 255 * v); px[i + 2] = Math.min(255, t.b * 255 * v);
    }
  }
  g.putImageData(d, 0, 0);
  for (const [[cx, cy], metal, rough] of look.metal || []) { mg.fillStyle = 'rgb(0,' + Math.round(rough * 255) + ',' + Math.round(metal * 255) + ')'; mg.fillRect(cx * cw, cy * ch, cw, ch); }
  const map = new THREE.CanvasTexture(c), mr = new THREE.CanvasTexture(m);
  for (const t of [map, mr]) { t.flipY = base.flipY; t.wrapS = base.wrapS; t.wrapT = base.wrapT; t.magFilter = base.magFilter; t.minFilter = base.minFilter; }
  map.colorSpace = THREE.SRGBColorSpace;
  const r = { map, mr }; LOOK_CACHE.set(key, r); return r;
}
const AUTO_METAL = new Map();
function autoMetal(img) { // cases grises peu saturées de la palette = métal
  const k = img.src || img; if (AUTO_METAL.has(k)) return AUTO_METAL.get(k);
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const g = cv.getContext('2d'); g.drawImage(img, 0, 0);
  const out = [], cw = img.width / 8, ch = img.height / 4;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 8; cx++) {
    if (cx === 2 && cy === 0) continue; // yeux
    const d = g.getImageData(cx * cw + cw * .3, cy * ch + ch * .2, cw * .3, ch * .6).data; let r = 0, gg = 0, b = 0, n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
    r /= n * 255; gg /= n * 255; b /= n * 255;
    const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), L = (mx + mn) / 2, sat = mx ? (mx - mn) / mx : 0;
    if (sat < .16 && L > .22 && L < .8 && b >= r - .02) out.push([[cx, cy], .32, .32]);
  }
  AUTO_METAL.set(k, out); return out;
}
function applyLook(a, key, look) {
  if (look.auto) { let img = null; a.root.traverse(o => { if (!img && o.isMesh && o.material && o.material.map) img = o.material.map.image; }); if (img) look = { ...look, metal: autoMetal(img) }; }
  a.root.traverse(o => {
    if (!o.isMesh) return;
    const part = look.mesh && look.mesh[o.name], L = part ? { ...look, ...part } : look;
    for (const mat of Array.isArray(o.material) ? o.material : [o.material]) {
      if (!mat.map || !mat.map.image) continue;
      const T = lookTextures(key + ':' + (part ? o.name : '') + ':' + mat.map.uuid, mat.userData.baseMap || mat.map, L);
      mat.userData.baseMap = mat.userData.baseMap || mat.map;
      mat.map = T.map; mat.metalnessMap = T.mr; mat.roughnessMap = T.mr;
      mat.metalness = 1; mat.roughness = 1; mat.envMap = envTex(); mat.envMapIntensity = L.env ?? 1; mat.userData.detail = true;
      mat.needsUpdate = true;
    }
  });
}

// ---------- Visage détaillé (model.look.face) : vrais yeux (blanc, iris, pupille, reflets) + cheveux à mèches.
// Les triangles des yeux / cheveux sont repérés par la couleur de la palette sous leurs UV, puis copiés dans
// deux maillages à part, avec leurs propres UV et une texture dessinée (nette, fabriquée une seule fois).
const FACE_CACHE = new Map();
function faceTex(kind, F) {
  const key = kind + JSON.stringify(F);
  if (FACE_CACHE.has(key)) return FACE_CACHE.get(key);
  const c = document.createElement('canvas'), g = c.getContext('2d');
  if (kind === 'eye') {
    c.width = c.height = 256;
    g.fillStyle = '#fbf8f2'; g.fillRect(0, 0, 256, 256);
    const sh = g.createLinearGradient(0, 0, 0, 256); sh.addColorStop(0, 'rgba(90,70,60,.45)'); sh.addColorStop(.3, 'rgba(90,70,60,0)'); g.fillStyle = sh; g.fillRect(0, 0, 256, 256);
    const cx = 128, cy = 140, R = 114;
    const ir = g.createRadialGradient(cx, cy + 20, 8, cx, cy, R); ir.addColorStop(0, F.iris2 || '#b07a3e'); ir.addColorStop(.55, F.iris || '#6b3f1d'); ir.addColorStop(1, '#2a160a');
    g.fillStyle = ir; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();
    g.fillStyle = '#120a06'; g.beginPath(); g.arc(cx, cy + 4, R * .4, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.96)'; g.beginPath(); g.ellipse(cx + 40, cy - 44, 30, 25, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(cx - 38, cy + 46, 12, 0, 7); g.fill();
    g.strokeStyle = '#24130a'; g.lineWidth = 30; g.beginPath(); g.moveTo(0, 8); g.lineTo(256, 8); g.stroke();
  } else {
    c.width = 256; c.height = 256;
    const b = g.createLinearGradient(0, 256, 0, 0); b.addColorStop(0, F.hair0 || '#9c7432'); b.addColorStop(.45, F.hair1 || '#d9b25e'); b.addColorStop(1, F.hair2 || '#f1d993');
    g.fillStyle = b; g.fillRect(0, 0, 256, 256);
    let r = 7; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 220; i++) { // mèches (tuile horizontale sans couture)
      const x = rnd() * 256, w = 1.5 + rnd() * 4, dark = rnd() < .5;
      g.strokeStyle = dark ? 'rgba(90,60,20,' + (.05 + rnd() * .08) + ')' : 'rgba(255,243,200,' + (.05 + rnd() * .1) + ')';
      g.lineWidth = w; g.lineCap = 'round';
      for (const dx of [0, -256, 256]) { g.beginPath(); g.moveTo(x + dx, 256); g.bezierCurveTo(x + dx + 10, 170, x + dx - 8, 90, x + dx + 4, -10); g.stroke(); }
    }
    const hl = g.createLinearGradient(0, 0, 0, 256); hl.addColorStop(.18, 'rgba(255,248,215,0)'); hl.addColorStop(.3, 'rgba(255,248,215,.26)'); hl.addColorStop(.42, 'rgba(255,248,215,0)'); g.fillStyle = hl; g.fillRect(0, 0, 256, 256);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.flipY = false; t.anisotropy = 4;
  if (kind === 'hair') t.wrapS = THREE.RepeatWrapping;
  FACE_CACHE.set(key, t); return t;
}
// Cheveux sculptés (16/11, d'après l'image de l'utilisateur) : la coiffure en blocs est arrondie —
// sommets soudés, 2 subdivisions, lissage de Taubin (garde le volume), bords collés à la tête gardés fixes,
// léger gonflement ; puis normales lisses. Les poids d'os sont recopiés (cheveux = os de la tête).
function smoothHair(g, F) {
  const P = g.attributes.position, n0 = P.count, key = (x, y, z) => Math.round(x * 2e4) + ',' + Math.round(y * 2e4) + ',' + Math.round(z * 2e4);
  const map = new Map(), pos = [], src = [], idx = [];
  for (let i = 0; i < n0; i++) { const k = key(P.getX(i), P.getY(i), P.getZ(i)); let j = map.get(k); if (j === undefined) { j = pos.length / 3; map.set(k, j); pos.push(P.getX(i), P.getY(i), P.getZ(i)); src.push(i); } idx.push(j); }
  const level = F.hairSub ?? 2;
  let tris = idx;
  for (let l = 0; l < level; l++) {
    const mid = new Map(), out = [];
    const m = (a, b) => { const k = a < b ? a + '_' + b : b + '_' + a; let j = mid.get(k); if (j === undefined) { j = pos.length / 3; mid.set(k, j); pos.push((pos[a * 3] + pos[b * 3]) / 2, (pos[a * 3 + 1] + pos[b * 3 + 1]) / 2, (pos[a * 3 + 2] + pos[b * 3 + 2]) / 2); src.push(src[a]); } return j; };
    for (let t = 0; t < tris.length; t += 3) { const a = tris[t], b = tris[t + 1], c = tris[t + 2], ab = m(a, b), bc = m(b, c), ca = m(c, a); out.push(a, ab, ca, ab, b, bc, ca, bc, c, ab, bc, ca); }
    tris = out;
  }
  const N = pos.length / 3, nb = Array.from({ length: N }, () => new Set()), edge = new Map();
  for (let t = 0; t < tris.length; t += 3) for (let k = 0; k < 3; k++) { const a = tris[t + k], b = tris[t + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); const e = a < b ? a + '_' + b : b + '_' + a; edge.set(e, (edge.get(e) || 0) + 1); }
  const fixed = new Uint8Array(N); for (const [e, c] of edge) if (c === 1) { const [a, b] = e.split('_'); fixed[+a] = fixed[+b] = 1; }
  const P2 = Float32Array.from(pos), tmp = new Float32Array(P2.length);
  const pass = f => { for (let i = 0; i < N; i++) { if (fixed[i] || !nb[i].size) { tmp.set(P2.subarray(i * 3, i * 3 + 3), i * 3); continue; } let x = 0, y = 0, z = 0; for (const j of nb[i]) { x += P2[j * 3]; y += P2[j * 3 + 1]; z += P2[j * 3 + 2]; } const c = nb[i].size; tmp[i * 3] = P2[i * 3] + f * (x / c - P2[i * 3]); tmp[i * 3 + 1] = P2[i * 3 + 1] + f * (y / c - P2[i * 3 + 1]); tmp[i * 3 + 2] = P2[i * 3 + 2] + f * (z / c - P2[i * 3 + 2]); } P2.set(tmp); };
  for (let it = 0; it < (F.hairSmooth ?? 10); it++) { pass(0.55); pass(-0.58); }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(P2, 3)); out.setIndex(tris); out.computeVertexNormals();
  const NN = out.attributes.normal; out.computeBoundingBox(); const bb = out.boundingBox, sz = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) * (F.hairPuff ?? 0.025);
  for (let i = 0; i < N; i++) if (!fixed[i]) { P2[i * 3] += NN.getX(i) * sz; P2[i * 3 + 1] += NN.getY(i) * sz; P2[i * 3 + 2] += NN.getZ(i) * sz; }
  for (const name of ['skinIndex', 'skinWeight', 'uv']) { const a = g.attributes[name]; if (!a) continue; const arr = new (a.array.constructor)(N * a.itemSize); for (let i = 0; i < N; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.array[src[i] * a.itemSize + c]; out.setAttribute(name, new THREE.BufferAttribute(arr, a.itemSize)); }
  out.computeVertexNormals();
  return out.toNonIndexed ? out : out;
}
const SPLIT_CACHE = new Map();
function splitFace(geo, img, F) {
  if (SPLIT_CACHE.has(geo.uuid)) return SPLIT_CACHE.get(geo.uuid);
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
  const cg = cv.getContext('2d'); cg.drawImage(img, 0, 0); const px = cg.getImageData(0, 0, img.width, img.height).data;
  const P = geo.attributes.position, U = geo.attributes.uv, N = geo.attributes.normal, idx = geo.index;
  const tri = idx ? idx.count / 3 : P.count / 3, vi = (t, k) => idx ? idx.getX(t * 3 + k) : t * 3 + k;
  const cellOf = v => { const x = Math.min(img.width - 1, Math.max(0, Math.floor(U.getX(v) * img.width))), y = Math.min(img.height - 1, Math.max(0, Math.floor(U.getY(v) * img.height))); return [Math.floor(x / (img.width / 8)), Math.floor(y / (img.height / 4)), x, y]; };
  const kindOf = t => { const k = [0, 1, 2].map(j => cellOf(vi(t, j))); const same = (a, b) => k.every(c => c[0] === a && c[1] === b); return same(F.eyeCell[0], F.eyeCell[1]) ? 'eye' : same(F.hairCell[0], F.hairCell[1]) ? 'hair' : 'base'; };
  const groups = { base: [], eye: [], hair: [] };
  for (let t = 0; t < tri; t++) groups[kindOf(t)].push(vi(t, 0), vi(t, 1), vi(t, 2));
  // sourcils = triangles « cheveux » juste au-dessus des yeux : ils restent unis (pas de mèches)
  if (groups.eye.length && groups.hair.length) {
    let e0 = 1e9, e1 = -1e9, x0 = 1e9, x1 = -1e9; for (const i of groups.eye) { const y = P.getY(i), x = P.getX(i); e0 = Math.min(e0, y); e1 = Math.max(e1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    const thr = e1 + (e1 - e0) * (F.browK || 1.6), keep = [], xm = (x0 + x1) / 2, xw = (x1 - x0) * 0.74;
    for (let k = 0; k < groups.hair.length; k += 3) {
      const t = [groups.hair[k], groups.hair[k + 1], groups.hair[k + 2]], cy = (P.getY(t[0]) + P.getY(t[1]) + P.getY(t[2])) / 3, cx = (P.getX(t[0]) + P.getX(t[1]) + P.getX(t[2])) / 3;
      (cy < thr && Math.abs(cx - xm) < xw ? groups.base : keep).push(...t); // sourcil = bas ET au-dessus des yeux ; mèches des côtés = cheveux
    }
    groups.hair = keep;
  }
  const sub = list => { // nouvelle géométrie non indexée avec les mêmes attributs
    const g = new THREE.BufferGeometry();
    for (const [name, a] of Object.entries(geo.attributes)) {
      // attributs parfois entrelacés / quantifiés : lecture par getX..getW (valeurs réelles), indices d'os gardés en entiers
      const intAttr = name === 'skinIndex', out = intAttr ? new Uint16Array(list.length * a.itemSize) : new Float32Array(list.length * a.itemSize), GET = ['getX', 'getY', 'getZ', 'getW'];
      for (let i = 0; i < list.length; i++) for (let c = 0; c < a.itemSize; c++) out[i * a.itemSize + c] = a[GET[c]](list[i]);
      g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize, false));
    }
    return g;
  };
  const res = {};
  if (groups.eye.length) {
    const g = sub(groups.eye), p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), cen = new THREE.Vector3(), nor = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { cen.add(v.fromBufferAttribute(p, i)); if (n) nor.add(v.fromBufferAttribute(n, i)); }
    cen.divideScalar(p.count); if (nor.lengthSq() < 1e-6) nor.set(0, 0, 1); nor.normalize();
    const right = new THREE.Vector3(0, 1, 0).cross(nor).normalize(), up = nor.clone().cross(right).normalize();
    // deux yeux : côté gauche / droit du centre ; UV = position dans la boîte de chaque œil
    const side = i => v.fromBufferAttribute(p, i).sub(cen).dot(right) > 0 ? 1 : 0;
    const box = [[1e9, -1e9, 1e9, -1e9], [1e9, -1e9, 1e9, -1e9]], ecen = [new THREE.Vector3(), new THREE.Vector3()], cnt = [0, 0];
    for (let i = 0; i < p.count; i++) { const s = side(i); ecen[s].add(v.fromBufferAttribute(p, i)); cnt[s]++; }
    ecen.forEach((e, s) => e.divideScalar(Math.max(1, cnt[s])));
    const big = F.eyeScale || 1.2, uv = new Float32Array(p.count * 2), pos = new Float32Array(p.count * 3), q = new THREE.Vector3();
    const proj = (i, s) => { v.fromBufferAttribute(p, i).sub(ecen[s]); return [v.dot(right), v.dot(up)]; };
    for (let i = 0; i < p.count; i++) { const s = side(i), [x, y] = proj(i, s), B = box[s]; B[0] = Math.min(B[0], x); B[1] = Math.max(B[1], x); B[2] = Math.min(B[2], y); B[3] = Math.max(B[3], y); }
    for (let i = 0; i < p.count; i++) {
      const s = side(i), [x, y] = proj(i, s), B = box[s];
      uv[i * 2] = (x - B[0]) / (B[1] - B[0] || 1); if (s === 0) uv[i * 2] = 1 - uv[i * 2];
      uv[i * 2 + 1] = 1 - (y - B[2]) / (B[3] - B[2] || 1);
      q.fromBufferAttribute(p, i).sub(ecen[s]).multiplyScalar(big).add(ecen[s]).addScaledVector(nor, 0.004);
      pos.set([q.x, q.y, q.z], i * 3);
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    res.eye = g;
  }
  if (groups.hair.length) {
    const g = smoothHair(sub(groups.hair), F), p = g.attributes.position, v = new THREE.Vector3(), cen = new THREE.Vector3();
    let y0 = 1e9, y1 = -1e9;
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); cen.add(v); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
    cen.divideScalar(p.count);
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i).sub(cen); uv[i * 2] = (Math.atan2(v.x, v.z) / (Math.PI * 2) + .5) * 3; uv[i * 2 + 1] = 1 - (v.y + cen.y - y0) / (y1 - y0 || 1); }
    g.setAttribute('aHair', new THREE.BufferAttribute(uv, 2)); // coordonnées « autour de la tête » pour les mèches ; uv = palette d'origine
    res.hair = g;
  }
  res.base = sub(groups.base);
  SPLIT_CACHE.set(geo.uuid, res); return res;
}
// Cheveux réalistes : « couches de mèches » (shell texturing). La coque des cheveux est redessinée N fois,
// chaque couche un peu plus loin de la tête et retombant légèrement ; une texture de densité garde seulement
// les mèches assez longues pour cette hauteur → volume, pointes fines, racines foncées, reflet le long des mèches.
let STRAND_TEX = null;
function strandTex() {
  if (STRAND_TEX) return STRAND_TEX;
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), d = g.createImageData(W, H), px = d.data;
  let r = 11; const rnd = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const len = new Float32Array(W); for (let x = 0; x < W; x++) len[x] = Math.pow(rnd(), .55);
  for (let y = 0; y < H; y++) {
    let off = Math.floor(Math.sin(y * .05) * 2 + Math.sin(y * .013 + 1) * 3); // mèches qui ondulent un peu
    for (let x = 0; x < W; x++) {
      const sx = (x + off + W) % W, L = len[sx] * (0.85 + 0.15 * Math.sin(y * .09 + sx)), i = (y * W + x) * 4;
      const v = Math.max(0, Math.min(255, L * 255));
      px[i] = v; px[i + 1] = Math.floor(rnd() * 255); px[i + 2] = 0; px[i + 3] = 255; // R = longueur de la mèche, G = variation de teinte
    }
  }
  g.putImageData(d, 0, 0);
  STRAND_TEX = new THREE.CanvasTexture(c); STRAND_TEX.wrapS = STRAND_TEX.wrapT = THREE.RepeatWrapping; STRAND_TEX.flipY = false;
  STRAND_TEX.minFilter = THREE.LinearFilter; STRAND_TEX.generateMipmaps = false;
  return STRAND_TEX;
}
function shellMat(F, k, len, tex) {
  const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0, envMap: envTex(), envMapIntensity: 0.1, side: THREE.DoubleSide });
  m.userData.shell = { k: { value: k }, len: { value: len }, st: { value: strandTex() } };
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { shellK: m.userData.shell.k, shellLen: m.userData.shell.len, strandT: m.userData.shell.st });
    sh.vertexShader = 'uniform float shellK; uniform float shellLen;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       transformed += normalize(objectNormal) * shellK * shellLen;
       transformed.y -= shellK * shellK * shellLen * 0.55;`);
    sh.fragmentShader = 'uniform float shellK; uniform sampler2D strandT;\n' + sh.fragmentShader.replace('#include <map_fragment>',
      `#include <map_fragment>
       vec4 sT = texture2D(strandT, vMapUv * vec2(2.0, 1.0));
       if (shellK > 0.0 && sT.r < shellK) discard;
       diffuseColor.rgb *= mix(0.42, 1.12, shellK) * (0.86 + 0.28 * sT.g);`).replace('#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       roughnessFactor = mix(0.6, 0.32, shellK);`).replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float hBand = exp(-pow((normal.y - 0.42 - (sT.g - 0.5) * 0.12) * 5.0, 2.0));
       totalEmissiveRadiance += diffuseColor.rgb * hBand * 0.55 * shellK;`);
  };
  m.customProgramCacheKey = () => 'hairshell';
  return m;
}
function hairMat(base) { // cheveux lisses : MÊME couleur que les cheveux d'origine (palette, teinte, lueur du héros) + mèches en relief + reflet satiné
  const m = base.clone(); m.envMap = envTex(); m.envMapIntensity = Math.min(m.envMapIntensity ?? 1, 0.3);
  m.onBeforeCompile = sh => {
    sh.vertexShader = 'attribute vec2 aHair; varying vec2 vHair;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vHair = aHair;');
    sh.fragmentShader = 'varying vec2 vHair;\n' + sh.fragmentShader.replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = 0.4;').replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = 0.0;').replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
       float gr = sin(vHair.x * 95.0 + sin(vHair.y * 7.0) * 1.6) * 0.5 + sin(vHair.x * 230.0 + vHair.y * 3.0) * 0.18;
       normal = normalize(normal + vec3(gr * 0.12, 0.0, 0.0));`).replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
       float hb = exp(-pow((normal.y - 0.38 + gr * 0.05) * 4.2, 2.0));
       totalEmissiveRadiance += diffuseColor.rgb * hb * 0.35;
       diffuseColor.rgb *= mix(1.06, 0.8, clamp(vHair.y, 0.0, 1.0));`);
  };
  m.customProgramCacheKey = () => 'hairsmooth';
  return m;
}
function applyFace(a, F, opts = {}) {
  const heads = []; a.root.traverse(o => { if (o.isSkinnedMesh && (o.name === F.mesh || (F.mesh === 'auto' && /Head/i.test(o.name)))) heads.push(o); });
  for (const o of heads) {
    const mat = o.material, img = (mat.userData.baseMap || mat.map)?.image; if (!img) continue;
    if (F.auto && !F.hair1) { // couleur des cheveux = celle de la palette du héros (case des cheveux)
      const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const cg = cv.getContext('2d'); cg.drawImage(img, 0, 0);
      const q = cg.getImageData(Math.floor((F.hairCell[0] + .5) * img.width / 8), Math.floor(img.height / 4 * .45), 1, 1).data;
      const tc = F.tint ? [1, 3, 5].map(i => parseInt(F.tint.slice(i, i + 2), 16) / 255) : [1, 1, 1]; // teinte propre du héros (comme ses cheveux d'origine)
      const hex = k => '#' + [0, 1, 2].map(i => Math.min(255, Math.round(q[i] * tc[i] * k)).toString(16).padStart(2, '0')).join(''); // sRGB direct (pas de conversion)
      F = { ...F, hair1: hex(1), hair0: hex(.6), hair2: hex(1.2) };
    }
    const S = splitFace(o.geometry, img, F);
    o.geometry = S.base;
    const add = (geo, m) => { const sm = new THREE.SkinnedMesh(geo, m); sm.bind(o.skeleton, o.bindMatrix); sm.castShadow = true; sm.frustumCulled = false; o.parent.add(sm); sm.position.copy(o.position); sm.quaternion.copy(o.quaternion); sm.scale.copy(o.scale); m.userData.baseEmissive = new THREE.Color(0); m.userData.baseEI = 0; a.mats.push(m); };
    if (S.eye) add(S.eye, new THREE.MeshStandardMaterial({ map: faceTex('eye', F), roughness: 0.25, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    if (S.hair) {
      const tex = faceTex('hair', F);
      if (!S.hairLen) { S.hair.computeBoundingBox(); const b = S.hair.boundingBox; S.hairLen = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z); }
      const sm = new THREE.SkinnedMesh(S.hair, hairMat(mat)); sm.bind(o.skeleton, o.bindMatrix);
      sm.frustumCulled = false; sm.castShadow = true; o.parent.add(sm); sm.position.copy(o.position); sm.quaternion.copy(o.quaternion); sm.scale.copy(o.scale);
    }
  }
}

// Look par défaut (16/11, à la demande de l'utilisateur, d'après Aldric) : tous les héros KayKit ont de vrais yeux,
// des cheveux à mèches, du métal qui brille, sans contour noir. Les squelettes : métal + sans contour.
function softLook(a) { // créatures : reflets doux du ciel peint (plus de volume sans contour noir)
  const seen = new Set();
  (a.root || a).traverse(o => { if (!o.isMesh) return; for (const mt of Array.isArray(o.material) ? o.material : [o.material]) { if (!mt || seen.has(mt) || !mt.isMeshStandardMaterial) continue; seen.add(mt); mt.envMap = envTex(); mt.envMapIntensity = .7; if (mt.roughness > .7) mt.roughness = .7; mt.userData.detail = true; mt.needsUpdate = true; } });
}
export function lookOf(m) {
  if (m.look) return m.look;
  if (m.glb && !m.glb.startsWith('Skeleton')) {
    const iris = m.glow ? '#' + new THREE.Color(m.glow).multiplyScalar(.55).getHexString() : '#5e3518', iris2 = m.glow || '#a8743a';
    const show = m.show || [], helmet = show.some(n => /Helmet/.test(n)), hat = show.some(n => /Hat/.test(n)) || /Hooded/.test(m.glb);
    const hair = helmet ? { shells: 0 } : hat ? { hairLen: 0.04, shells: 12 } : {}; // sous un casque : pas de mèches qui dépassent
    return { auto: true, noOutline: true, env: 1.15, rough: .6, face: { auto: true, mesh: 'auto', eyeCell: [2, 0], hairCell: [1, 0], eyeScale: 1.35, iris, iris2, tint: m.tint || null, ...hair } };
  }
  if (m.glb) return { auto: true, noOutline: true, env: 1.1, rough: .6 };
  if (m.beast) return { noOutline: true, noTex: true, soft: true };
  if (m.proc) return { noOutline: true, noTex: true, soft: true };
  return null;
}

// Fabrique un héros 3D. Le modèle doit avoir été préchargé (preload) pour être instantané.
async function buildHero(id, { star = 1, skin = null } = {}) {
  const c = HERO[id], m = skin && SKINS[skin] ? { ...HERO[id].model, tint: SKINS[skin].tint, glow: SKINS[skin].glow } : HERO[id].model;
  const holder = new THREE.Group();
  const size = (m.scale || 1) * [1, 1, 1.18, 1.36][star];
  if (m.proc) {
    const p = buildProc(m.proc, m);
    if (lookOf(m)?.soft) softLook(p);
    p.root.scale.multiplyScalar(size);
    holder.add(p.root);
    p.height = (p.height || 1.6) * size;
    p.holder = holder;
    return p;
  }
  if (m.beast) {
    const g = await loadGLB('beasts/' + m.beast + '.glb');
    const root = SkeletonUtils.clone(g.scene);
    root.rotation.y = 0;
    normalize(root, 1.3 * (m.beast === 'Stag' ? 1.9 : 1));
    root.scale.multiplyScalar(size);
    const clips = Object.fromEntries(g.animations.map(a => [a.name, a]));
    const a = new SkinnedActor(root, 1.3 * (m.beast === 'Stag' ? 1.9 : 1) * size, clips, {
      idle: 'Idle', run: 'Gallop', walk: 'Walk', attack: Object.keys(clips).filter(n => n.startsWith('Attack')), cast: 'Idle_HitReact_Left', hit: 'Idle_HitReact_Left', death: 'Death', spawn: 'Idle', cheer: 'Idle',
    });
    a.collectMats(m.tint, m.glow);
    softLook(a);
    holder.add(root); a.holder = holder;
    return a;
  }
  const g = await loadGLB('heroes/' + m.glb + '.glb');
  const root = SkeletonUtils.clone(g.scene);
  const show = new Set(m.show || []);
  root.traverse(o => {
    if (o.isMesh && !o.isSkinnedMesh && o.parent && o.parent.isBone) o.visible = show.has(o.name);
  });
  for (const [w, slot] of m.add || []) {
    const wg = await loadGLB('heroes/' + w + '.glb');
    const bone = root.getObjectByName(slot.replace('.', ''));
    if (bone) bone.add(wg.scene.clone(true));
  }
  normalize(root, HEIGHT);
  root.scale.multiplyScalar(size);
  let clips = await heroClips();
  // Squelette simplifié (ex. Ranger 2.0) : on retire les pistes d'animation des os absents.
  if (!FILTERED.has(m.glb)) {
    const names = new Set(); root.traverse(o => names.add(o.name));
    const missing = Object.values(clips).some(c => c.tracks.some(t => !names.has(t.name.split('.')[0])));
    FILTERED.set(m.glb, missing ? Object.fromEntries(Object.entries(clips).map(([k, c]) => [k, new THREE.AnimationClip(c.name, c.duration, c.tracks.filter(t => names.has(t.name.split('.')[0])))])) : null);
  }
  clips = FILTERED.get(m.glb) || clips;
  const skel = m.glb.startsWith('Skeleton');
  const a = new SkinnedActor(root, HEIGHT * size, clips, {
    idle: m.idle || (skel ? 'Idle_Combat' : 'Idle'), run: 'Running_A', walk: skel ? 'Walking_D_Skeletons' : 'Walking_A',
    attack: m.atk || ['1H_Melee_Attack_Chop'], cast: m.cast || 'Spellcast_Long', hit: 'Hit_A', death: skel ? ['Death_C_Skeletons', 'Death_A'] : ['Death_A', 'Death_B'],
    spawn: m.spawn || 'Spawn_Air', cheer: 'Cheer',
  });
  a.collectMats(m.tint, m.glow);
  const LK = lookOf(m);
  if (LK && LK.soft) softLook(a);
  if (LK && !LK.noTex) applyLook(a, id, LK);
  if (LK && LK.face) applyFace(a, LK.face, arguments[1] || {});
  holder.add(root); a.holder = holder;
  return a;
}

// Fabrique un héros 3D complet : modèle + lumière de contour + contour sombre + effets propres au héros.
// opts : star, outline (true), fx (true), lite (moins de particules)
export async function makeHero(id, opts = {}) {
  const a = await buildHero(id, opts);
  const c = HERO[id], m = opts.skin && SKINS[opts.skin] ? { ...c.model, glow: SKINS[opts.skin].glow } : c.model;
  const rimCol = m.glow || (m.proc ? '#ffe0b0' : '#cfe0ff');
  const rimK = m.glow ? 0.32 : 0.24;
  // grain / rayures : seulement dans la fiche du héros (opts.detail) ; en combat c'était trop lourd (contrôle Guardian n°69)
  if (!opts.detail) a.root.traverse(o => { if (o.isMesh) for (const mt of Array.isArray(o.material) ? o.material : [o.material]) if (mt && mt.userData) mt.userData.detail = false; });
  for (const mat of a.mats) if (mat.isMeshStandardMaterial && !mat.transparent) addRim(mat, rimCol, rimK, 3.2);
  const LKo = lookOf(m);
  if (opts.outline !== false && !(LKo && LKo.noOutline)) addOutline(a.root, m.proc ? 0.035 : 0.03);
  const fx = opts.fx === false ? null : attachHeroFx(a, id, { lite: opts.lite });
  const orig = a.update.bind(a);
  let t = Math.random() * 10;
  const proc = !!m.proc && opts.outline !== false;
  a.update = dt => { orig(dt); t += dt; if (fx) fx(dt, t, a.state); if (proc) syncOutlines(a.root); };
  // Libère vraiment la mémoire de la carte graphique (sauf ce qui est partagé entre héros).
  const baseDispose = a.dispose.bind(a);
  a.dispose = () => { baseDispose(); if (a.holder) freeTree(a.holder); };
  return a;
}

export function freeTree(root) {
  root.traverse(o => {
    if (o.isSkinnedMesh && o.skeleton) o.skeleton.dispose();
    if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => { if (m.map && m.map.userData.own) m.map.dispose(); });
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    // les matériaux ne sont pas « disposés » : ils ne prennent pas de mémoire graphique, et les garder évite
    // que la carte graphique recompile leurs shaders à chaque nouveau héros (petites saccades en combat).
  });
}

// Décor (arbres, rochers, temples…)
export async function prop(name, { tint, scale = 1, shadow = true } = {}) {
  const g = await loadGLB('world/' + name + '.glb');
  const o = g.scene.clone(true);
  o.traverse(x => {
    if (!x.isMesh) return;
    x.castShadow = shadow; x.receiveShadow = true;
    if (tint) { x.material = x.material.clone(); x.material.color.multiply(new THREE.Color(tint)); }
  });
  o.scale.multiplyScalar(scale);
  return o;
}
