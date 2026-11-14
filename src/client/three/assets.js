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

// Fabrique un héros 3D. Le modèle doit avoir été préchargé (preload) pour être instantané.
async function buildHero(id, { star = 1, skin = null } = {}) {
  const c = HERO[id], m = skin && SKINS[skin] ? { ...HERO[id].model, tint: SKINS[skin].tint, glow: SKINS[skin].glow } : HERO[id].model;
  const holder = new THREE.Group();
  const size = (m.scale || 1) * [1, 1, 1.18, 1.36][star];
  if (m.proc) {
    const p = buildProc(m.proc, m);
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
  holder.add(root); a.holder = holder;
  return a;
}

// Fabrique un héros 3D complet : modèle + lumière de contour + contour sombre + effets propres au héros.
// opts : star, outline (true), fx (true), lite (moins de particules)
// Héros « illustrés » : l'illustration détourée (assets/sprites/<id>.webp) joue en combat, avec des animations
export const SPRITE_HEROES = { malakar: 2.7, damne: 2.2, osseuse: 2.15, morvak: 2.25, frimas: 2.2, belier: 2.0 };
const SPR_TEX = new Map();
function spriteTex(id) {
  if (!SPR_TEX.has(id)) SPR_TEX.set(id, new THREE.TextureLoader().loadAsync('assets/sprites/' + id + '.webp').then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }));
  return SPR_TEX.get(id);
}
class SpriteActor {
  constructor(tex, h, star = 1) {
    const asp = tex.image.width / tex.image.height;
    this.holder = new THREE.Group(); this.root = new THREE.Group(); this.holder.add(this.root);
    this.mat = new THREE.SpriteMaterial({ map: tex, transparent: true, alphaTest: 0.08, fog: false });
    this.fl = new THREE.SpriteMaterial({ map: tex, transparent: true, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0, fog: false });
    const k = 1 + (star - 1) * 0.12; this.h = h * k; this.w = this.h * asp;
    this.spr = new THREE.Sprite(this.mat); this.spr.center.set(0.5, 0.02); this.root.add(this.spr);
    this.glow = new THREE.Sprite(this.fl); this.glow.center.set(0.5, 0.02); this.root.add(this.glow);
    this.height = this.h; this.state = 'idle'; this.st = 0; this.t = Math.random() * 10; this.flashT = 0; this.frozen = false; this.mats = [this.mat]; this.noOutline = true; this.dead = false; this.dir = 1;
    this.v = new THREE.Vector3(); this.q = new THREE.Quaternion();
  }
  play(state, { force = false } = {}) { if (this.state === 'death' && !force) return; if (force || state !== this.state || ['attack', 'cast', 'hit', 'spawn', 'cheer'].includes(state)) { this.state = state; this.st = 0; } }
  flash(col = 0xffffff) { this.flashT = 0.14; this.fl.color.set(col); }
  setFrozen(on) { this.frozen = on; this.mat.color.set(on ? 0x9fe4ff : 0xffffff); }
  setOpacity(a) { this.mat.opacity = a; this.mat.alphaTest = a < 1 ? 0.01 : 0.08; }
  update(dt) {
    if (!this.frozen) { this.t += dt; this.st += dt; }
    const t = this.t, st = this.st, S = this.state;
    // regarde vers la gauche ou la droite selon la direction de marche (vue caméra)
    this.holder.getWorldQuaternion(this.q); this.v.set(0, 0, 1).applyQuaternion(this.q);
    if (Math.abs(this.v.x) > 0.15) this.dir = this.v.x > 0 ? 1 : -1;
    let sx = 1, sy = 1, y = 0, rz = 0, op = 1, glow = 0;
    if (S === 'run' || S === 'walk') { const w = Math.sin(t * (S === 'run' ? 13 : 9)); y = Math.abs(w) * 0.09; rz = w * 0.05; sy = 1 - Math.abs(w) * 0.03; }
    else if (S === 'attack') { const k = Math.min(1, st / 0.45), p = Math.sin(k * Math.PI); rz = -p * 0.22 * this.dir; sx = 1 + p * 0.1; sy = 1 - p * 0.06; y = p * 0.05; if (st > 0.6) this.state = this.back || 'idle'; }
    else if (S === 'cast') { const p = Math.sin(Math.min(1, st / 0.6) * Math.PI); sy = 1 + p * 0.06; glow = p * 0.45; if (st > 0.7) this.state = this.back || 'idle'; }
    else if (S === 'hit') { rz = Math.sin(st * 40) * 0.06 * Math.max(0, 1 - st / 0.3); if (st > 0.3) this.state = this.back || 'idle'; }
    else if (S === 'spawn') { const k = Math.min(1, st / 0.4); sx = sy = 0.3 + 0.7 * (1 - Math.pow(1 - k, 3)); glow = (1 - k) * 0.8; if (st > 0.45) this.state = this.back || 'idle'; }
    else if (S === 'cheer') { y = Math.abs(Math.sin(st * 9)) * 0.3; if (st > 1.4) this.state = this.back || 'idle'; }
    else if (S === 'death') { const k = Math.min(1, st / 0.9); rz = k * 1.35 * this.dir; y = -k * 0.1; op = 1 - Math.max(0, (st - 0.6) / 0.8); }
    else { sy = 1 + Math.sin(t * 2.2) * 0.018; sx = 1 - Math.sin(t * 2.2) * 0.008; }
    if (this.flashT > 0) { this.flashT -= dt; glow = Math.max(glow, 0.9 * (this.flashT / 0.14)); }
    for (const s of [this.spr, this.glow]) { s.scale.set(this.w * sx * this.dir, this.h * sy, 1); s.position.y = y; this.mat.rotation = this.fl.rotation = rz; }
    this.mat.opacity = op * (this.mat.opacity > 0 ? 1 : 1); if (S === 'death') this.mat.opacity = Math.max(0, op);
    this.fl.opacity = glow;
  }
  dispose() { this.mat.dispose(); this.fl.dispose(); }
}

// Héros 3D « HD » (modèles détaillés animés, ex. créés à partir des illustrations) : assets/models/hd/index.json
// { "heroes": { "malakar": { "file": "malakar.glb", "height": 2.7, "clips": { "idle": "Idle", "run": "Walk", "attack": "Attack", "death": "Death" } } } }
let HD = null;
export function hdList() { if (!HD) HD = fetch('assets/models/hd/index.json').then(r => r.ok ? r.json() : { heroes: {} }).then(j => j.heroes || {}).catch(() => ({})); return HD; }
class HDActor {
  constructor(g, cfg, star) {
    this.holder = new THREE.Group(); this.root = SkeletonUtils.clone(g.scene); this.holder.add(this.root);
    const b = new THREE.Box3().setFromObject(this.root), k = (cfg.height || 2.1) * (1 + (star - 1) * 0.12) / Math.max(0.01, b.max.y - b.min.y);
    this.root.scale.setScalar(k); this.root.position.y = -b.min.y * k; this.height = (cfg.height || 2.1) * (1 + (star - 1) * 0.12);
    this.mats = []; this.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.material = o.material.clone(); this.mats.push(o.material); o.material.userData.e = o.material.emissive ? o.material.emissive.clone() : null; } });
    this.mixer = new THREE.AnimationMixer(this.root); this.clips = {};
    const byName = n => g.animations.find(a => a.name === n) || g.animations.find(a => a.name.toLowerCase().includes(String(n).toLowerCase()));
    const want = { idle: 'idle', run: 'run', walk: 'walk', attack: 'attack', cast: 'cast', hit: 'hit', death: 'death', spawn: 'idle', cheer: 'cheer', ...(cfg.clips || {}) };
    for (const [st, n] of Object.entries(want)) { const c = byName(n); if (c) this.clips[st] = c; }
    if (!this.clips.run) this.clips.run = this.clips.walk || this.clips.idle; if (!this.clips.walk) this.clips.walk = this.clips.run;
    if (!this.clips.cast) this.clips.cast = this.clips.attack; if (!this.clips.cheer) this.clips.cheer = this.clips.idle;
    this.state = ''; this.cur = null; this.flashT = 0; this.frozen = false; this.play('idle');
  }
  play(state, { force = false } = {}) {
    if (this.state === 'death' && !force) return; if (!force && state === this.state && !['attack', 'cast', 'hit'].includes(state)) return;
    const c = this.clips[state] || this.clips.idle; this.state = state; if (!c) return;
    const a = this.mixer.clipAction(c); const once = ['attack', 'cast', 'hit', 'death', 'cheer', 'spawn'].includes(state);
    a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = state === 'death';
    if (this.cur && this.cur !== a) a.crossFadeFrom(this.cur, 0.15, false); a.play(); this.cur = a;
    if (once && state !== 'death') { const back = () => { this.mixer.removeEventListener('finished', back); if (this.state === state) this.play(this.back || 'idle', { force: true }); }; this.mixer.addEventListener('finished', back); }
  }
  flash(col = 0xffffff) { this.flashT = 0.12; this.fc = col; }
  setFrozen(on) { this.frozen = on; }
  setOpacity(a) { for (const m of this.mats) { m.transparent = a < 1; m.opacity = a; } }
  update(dt) {
    if (!this.frozen) this.mixer.update(dt);
    if (this.flashT > 0 || this.frozen) { this.flashT -= dt; const on = this.flashT > 0; for (const m of this.mats) if (m.emissive) { if (on) { m.emissive.set(this.fc); m.emissiveIntensity = 0.9; } else if (this.frozen) { m.emissive.set(0x7fd8ff); m.emissiveIntensity = 0.5; } else { m.emissive.copy(m.userData.e); m.emissiveIntensity = 1; } } }
  }
  dispose() { this.mixer.stopAllAction(); for (const m of this.mats) m.dispose(); }
}

export async function makeHero(id, opts = {}) {
  const hd = (await hdList())[id];
  if (hd && opts.hd !== false) { try { const g = await loadGLB('hd/' + hd.file); return new HDActor(g, hd, opts.star || 1); } catch (e) { console.warn('modèle HD', id, e); } }
  if (SPRITE_HEROES[id] && opts.sprite !== false) { const tex = await spriteTex(id); const a = new SpriteActor(tex, SPRITE_HEROES[id], opts.star || 1); a.update(0); return a; }
  const a = await buildHero(id, opts);
  const c = HERO[id], m = opts.skin && SKINS[opts.skin] ? { ...c.model, glow: SKINS[opts.skin].glow } : c.model;
  const rimCol = m.glow || (m.proc ? '#ffe0b0' : '#cfe0ff');
  const rimK = m.glow ? 0.32 : 0.24;
  for (const mat of a.mats) if (mat.isMeshStandardMaterial && !mat.transparent) addRim(mat, rimCol, rimK, 3.2);
  if (opts.outline !== false) addOutline(a.root, m.proc ? 0.035 : 0.03);
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
