// MYTHORIA — le Royaume en 3D : ton île flottante avec ses bâtiments (qui changent avec leur niveau).
import * as THREE from 'three';
import { createRenderer, quality } from './stage.js';
import { loadGLB, prop } from './assets.js';
import { THEMES, skyDome } from './world.js';
import { glowSprite, glowTexture } from './procedural.js';
import { createComposer } from './look.js';
import { dragons, flock } from './surroundings.js';
import { BUILD_ORDER, BUILDINGS, DECOS, DECO_SLOTS } from '../../shared/kingdom.js';

// Emplacements des bâtiments sur l'île (x, z)
export const SPOTS = {
  chateau: [0, -1.2], mine: [-5.2, 1.4], carriere: [5.2, 1.4], academie: [-4.3, -4.6], caserne: [-2.4, 4.6],
  tour: [2.4, 4.6], cristal: [4.3, -4.6], temple: [0, -6.6], marche: [-6.4, -2.0],
};
const DECO_POS = [[6.6, -1.6], [-1.4, 7.0], [1.4, 7.0], [-7.0, 3.4], [7.0, 3.6], [0, 3.2]];

function modelFor(id, lvl) {
  const T = lvl <= 3 ? 0 : lvl <= 6 ? 1 : 2;
  switch (id) {
    case 'chateau': return [lvl <= 3 ? 'kingdom/TownCenter_FirstAge_Level' + Math.max(2, lvl) : 'kingdom/TownCenter_SecondAge_Level' + Math.min(3, lvl - 3)];
    case 'mine': return ['kingdom/Mine', 'kingdom/Resource_Gold_1'];
    case 'carriere': return ['kingdom/Resource_Rock_1', 'kingdom/Resource_Rock_2', 'kingdom/Logs'];
    case 'cristal': return ['kingdom/Resource_Rock_2'];
    case 'academie': return [['kingdom/Archery_FirstAge_Level1', 'kingdom/Archery_FirstAge_Level3', 'kingdom/Archery_SecondAge_Level2'][T]];
    case 'caserne': return [['kingdom/Barracks_FirstAge_Level1', 'kingdom/Barracks_FirstAge_Level3', 'kingdom/Barracks_SecondAge_Level2'][T]];
    case 'tour': return [['kingdom/WatchTower_FirstAge_Level1', 'kingdom/WatchTower_FirstAge_Level3', 'world/WatchTower_SecondAge_Level3'][T]];
    case 'temple': return [T < 2 ? 'kingdom/Temple_FirstAge_Level2' : 'world/Temple_SecondAge_Level3'];
    case 'marche': return [['kingdom/Market_FirstAge_Level2', 'kingdom/Storage_FirstAge_Level1', 'kingdom/Storage_SecondAge_Level2'][T]];
  }
  return [];
}
const SIZE = { chateau: 4.2, mine: 2.6, carriere: 2.2, cristal: 2.2, academie: 3.0, caserne: 3.0, tour: 2.0, temple: 3.2, marche: 2.8 };

async function loadModel(path) {
  const g = await loadGLB(path + '.glb');
  const o = g.scene.clone(true);
  o.traverse(x => { if (x.isMesh) { x.castShadow = true; x.receiveShadow = true; } });
  return o;
}
function fit(o, w) {
  const b = new THREE.Box3().setFromObject(o), s = w / Math.max(b.max.x - b.min.x, b.max.z - b.min.z, 0.01);
  o.scale.multiplyScalar(s);
  const b2 = new THREE.Box3().setFromObject(o); o.position.y -= b2.min.y;
}
function crystals(lvl) {
  const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: '#c8a8ff', emissive: '#9b6bff', emissiveIntensity: 0.8, flatShading: true, roughness: 0.2 });
  for (let i = 0; i < 3 + Math.min(6, lvl); i++) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.25 + Math.random() * 0.2, 0), mat); m.scale.y = 2 + Math.random() * 1.5;
    const a = Math.random() * 6.28, d = Math.random() * 0.9; m.position.set(Math.cos(a) * d, 0.5, Math.sin(a) * d); m.rotation.z = (Math.random() - 0.5) * 0.5; m.castShadow = true; g.add(m);
  }
  g.add(glowSprite(0xb48cff, 2.2)).position.y = 0.8;
  return g;
}
function plot() {
  const g = new THREE.Group();
  const dirt = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 2.2), new THREE.MeshStandardMaterial({ color: '#8a6a44', flatShading: true })); dirt.position.y = 0.06; dirt.receiveShadow = true; g.add(dirt);
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: '#6b4a2a' })); post.position.set(0.7, 0.45, 0.7); g.add(post);
  const sign = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.05), new THREE.MeshStandardMaterial({ color: '#d8b07a' })); sign.position.set(0.7, 0.85, 0.72); g.add(sign);
  return g;
}
function scaffold(w) {
  const g = new THREE.Group(), m = new THREE.MeshStandardMaterial({ color: '#b07a45', flatShading: true });
  for (const x of [-1, 1]) for (const z of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.4, 0.08), m); p.position.set(x * w / 2, 1.2, z * w / 2); g.add(p); }
  for (const y of [0.8, 1.6, 2.35]) for (const r of [0, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(r ? 0.06 : w, 0.06, r ? w : 0.06), m); b.position.set(0, y, 0); g.add(b); const b2 = b.clone(); if (r) b2.position.x = w / 2; else b2.position.z = w / 2; g.add(b2); const b3 = b.clone(); if (r) b3.position.x = -w / 2; else b3.position.z = -w / 2; g.add(b3); }
  return g;
}

// Fond du Royaume : mer de nuages, îlots flottants, dragon et oiseaux aux couleurs du monde.
const KDRAGON = { aurore: ['#e8b04a', '#fff0b8'], sylve: ['#4caf6a', '#d8ffb0'], arcane: ['#8a5ad8', '#e0d0ff'], braise: ['#c4263c', '#ffcf70'], givre: ['#6fb8e8', '#eaf8ff'], ombre: ['#2a1e3a', '#c08aff'] };
function kingdomBackdrop(scene, T, key, ups, low) {
  const g = new THREE.Group(); scene.add(g);
  // mer de nuages sous l'île
  const fogC = new THREE.Color(T.fog), bright = fogC.r + fogC.g + fogC.b > 1.8;
  const seaC = fogC.clone().lerp(new THREE.Color(T.skyTop), bright ? 0.72 : 0.45);
  const sea = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshBasicMaterial({ color: seaC, fog: false }));
  if (bright) scene.fog.color.copy(fogC.clone().lerp(new THREE.Color(T.skyTop), 0.4));
  sea.rotation.x = -Math.PI / 2; sea.position.y = -16; g.add(sea);
  const clouds = [];
  for (let i = 0; i < (low ? 22 : 40); i++) {
    const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(T.fog).lerp(new THREE.Color('#ffffff'), 0.35), transparent: true, opacity: 0.75, depthWrite: false }));
    const a = Math.random() * 6.28, r = 11 + Math.random() * 55; c.position.set(Math.cos(a) * r, -7 - Math.random() * 8, Math.sin(a) * r);
    c.scale.set(16 + Math.random() * 18, 7 + Math.random() * 5, 1); g.add(c); clouds.push({ c, a, r, sp: 0.006 + Math.random() * 0.01 });
  }
  // îlots flottants
  const isl = [];
  for (let i = 0; i < 7; i++) {
    const a = i / 7 * 6.28 + 0.4, r = 17 + (i % 3) * 5, s = 0.7 + Math.random() * 0.9, o = new THREE.Group();
    const top = new THREE.Mesh(new THREE.CylinderGeometry(2 * s, 2.3 * s, 0.5, 9), new THREE.MeshStandardMaterial({ color: T.ground, flatShading: true }));
    const bot = new THREE.Mesh(new THREE.ConeGeometry(2.2 * s, 4.5 * s, 9), new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true })); bot.rotation.x = Math.PI; bot.position.y = -2.5 * s;
    o.add(top, bot); o.position.set(Math.cos(a) * r, -3 + Math.random() * 6, Math.sin(a) * r); g.add(o); isl.push({ o, y: o.position.y, ph: Math.random() * 6 });
    prop(T.props[i % T.props.length][0], { scale: 1.1 * s, tint: T.tintProps }).then(p => { p.position.y = 0.25; o.add(p); }).catch(() => {});
  }
  // lueurs qui montent
  const n = low ? 40 : 90, pg = new THREE.BufferGeometry(), pp = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.random() * 30; pp[i * 3] = Math.cos(a) * r; pp[i * 3 + 1] = Math.random() * 14 - 4; pp[i * 3 + 2] = Math.sin(a) * r; }
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
  g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.5, map: glowTexture(), color: T.partCol, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const [dc, db] = KDRAGON[key] || KDRAGON.aurore;
  dragons(g, ups, [{ c: dc, b: db, horns: true, s: 1.6, r: 19, h: 8, sp: 0.12, dir: 1, cz: 0 }]);
  flock(g, ups, { n: low ? 8 : 14, color: key === 'ombre' ? '#120c1a' : '#2a2030', r: 15, h: 7, sp: 0.3, size: 0.35, cz: 0 });
  ups.push((dt, t) => {
    for (const c of clouds) { c.a += c.sp * dt; c.c.position.x = Math.cos(c.a) * c.r; c.c.position.z = Math.sin(c.a) * c.r; }
    for (const i of isl) i.o.position.y = i.y + Math.sin(t * 0.6 + i.ph) * 0.4;
    for (let i = 0; i < n; i++) { pp[i * 3 + 1] += dt * 0.6; if (pp[i * 3 + 1] > 12) pp[i * 3 + 1] = -4; }
    pg.attributes.position.needsUpdate = true;
  });
}

export class KingdomView {
  constructor(canvas, labelsEl, worldKey, onTap) {
    this.cv = canvas; this.labels = labelsEl; this.onTap = onTap; this.dead = false;
    this.r = createRenderer(canvas); this.r.toneMappingExposure = 1.05;
    this.scene = new THREE.Scene();
    const T = THEMES[worldKey] || THEMES.aurore; this.T = T;
    this.scene.add(skyDome(T));
    this.scene.fog = new THREE.Fog(T.fog, 60, 200);
    this.scene.add(new THREE.HemisphereLight(T.hemiSky, T.hemiGround, T.hemiI * 1.1));
    const sun = new THREE.DirectionalLight(T.sun, T.sunI); sun.position.set(-8, 16, 9); sun.castShadow = true;
    const q = quality(); sun.shadow.mapSize.set(Math.min(2048, q.shadowSize), Math.min(2048, q.shadowSize));
    Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 50 }); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.03;
    this.scene.add(sun);
    // île
    this.root = new THREE.Group(); this.scene.add(this.root);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(9.4, 9.0, 0.6, 48), new THREE.MeshStandardMaterial({ color: T.ground, flatShading: true }));
    top.position.y = -0.3; top.receiveShadow = true; this.root.add(top);
    const under = new THREE.Mesh(new THREE.ConeGeometry(9.0, 9, 14, 3), new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true }));
    under.rotation.x = Math.PI; under.position.y = -5.1; this.root.add(under);
    // chemins
    const path = new THREE.MeshStandardMaterial({ color: T.path, flatShading: true });
    for (const id of BUILD_ORDER) { if (id === 'chateau') continue; const [x, z] = SPOTS[id], len = Math.hypot(x, z + 1.2); const p = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, len), path); p.position.set(x / 2, 0.02, (z - 1.2) / 2); p.rotation.y = Math.atan2(x, z + 1.2); p.receiveShadow = true; this.root.add(p); }
    const plaza = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 2.8, 0.05, 32), path); plaza.position.set(0, 0.03, -1.2); plaza.receiveShadow = true; this.root.add(plaza);
    // arbres sur le bord
    (async () => { for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2; try { const o = await prop(T.props[i % T.props.length][0], { scale: 0.8, tint: T.tintProps }); o.position.set(Math.cos(a) * 8.4, 0, Math.sin(a) * 8.4); o.rotation.y = a; if (!this.dead) this.root.add(o); } catch (e) {} } })();
    this.ups = []; kingdomBackdrop(this.scene, T, worldKey, this.ups, q.low);
    this.slots = {}; this.hits = [];
    this.cam = new THREE.PerspectiveCamera(40, 1, 0.5, 300);
    this.rot = 0.35; this.dist = 24; this.spin = 0;
    this.ray = new THREE.Raycaster(); this.v2 = new THREE.Vector2();
    this.post = createComposer(this.r, this.scene, this.cam, { bloom: q.bloom, strength: 0.4, threshold: 1.1, radius: 0.5, samples: q.msaa });
    this.bind();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    this.last = 0; this.t = 0; this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }

  async sync(K) {
    for (const id of BUILD_ORDER) {
      const lvl = K.b[id] || 0, job = K.job && K.job.id === id, key = lvl + (job ? 'j' : '');
      let S = this.slots[id];
      if (!S) { S = this.slots[id] = { g: new THREE.Group(), key: '' }; const [x, z] = SPOTS[id]; S.g.position.set(x, 0, z); this.root.add(S.g);
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(SIZE[id] / 2 + 0.3, SIZE[id] / 2 + 0.3, 3, 10), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 1.5; hit.userData.id = id; S.g.add(hit); this.hits.push(hit); }
      if (S.key === key) continue;
      S.key = key;
      for (const c of [...S.g.children]) if (!c.userData.id) S.g.remove(c);
      if (!lvl) S.g.add(plot());
      else {
        const grp = new THREE.Group();
        const paths = modelFor(id, lvl);
        for (let k = 0; k < paths.length; k++) {
          try { const o = await loadModel(paths[k]); fit(o, k ? SIZE[id] * 0.45 : SIZE[id]); if (k) o.position.set(k === 1 ? SIZE[id] * 0.45 : -SIZE[id] * 0.4, 0, SIZE[id] * 0.35); grp.add(o); } catch (e) {}
        }
        if (id === 'cristal') grp.add(crystals(lvl));
        if (id === 'chateau' && lvl > 6) grp.scale.multiplyScalar(1 + (lvl - 6) * 0.06);
        S.g.add(grp);
      }
      if (job) S.g.add(scaffold(SIZE[id] * 0.9));
    }
    // décorations
    this.decos = this.decos || [];
    for (let i = 0; i < DECO_SLOTS; i++) {
      const id = K.deco[i]; if (this.decos[i] && this.decos[i].id === id) continue;
      if (this.decos[i] && this.decos[i].o) this.root.remove(this.decos[i].o);
      this.decos[i] = { id };
      if (!id) continue;
      try { const o = await loadModel('kingdom/' + DECOS[id].model); fit(o, id === 'moulin' ? 2.2 : 1.4); o.position.set(DECO_POS[i][0], 0, DECO_POS[i][1]); this.root.add(o); this.decos[i].o = o; } catch (e) {}
    }
  }

  bind() {
    let x0 = null, moved = 0, sx = 0, sy = 0;
    this.cv.addEventListener('pointerdown', e => { x0 = e.clientX; sx = e.clientX; sy = e.clientY; moved = 0; });
    this.onMove = e => { if (x0 === null) return; this.rot -= (e.clientX - x0) * 0.01; moved += Math.abs(e.clientX - x0); x0 = e.clientX; };
    this.onUp = e => {
      if (x0 === null) return; x0 = null;
      if (moved < 8 && Math.abs(e.clientY - sy) < 8) {
        const rc = this.cv.getBoundingClientRect(); this.v2.set((e.clientX - rc.left) / rc.width * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
        this.ray.setFromCamera(this.v2, this.cam);
        const h = this.ray.intersectObjects(this.hits, false)[0];
        if (h) this.onTap(h.object.userData.id);
      }
    };
    addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
  }
  resize() {
    const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.fov = w / h < 0.8 ? 48 : 38; this.cam.updateProjectionMatrix(); if (this.post) this.post.setSize(w, h);
    this.dist = w / h < 0.8 ? 27 : 23;
  }
  // étiquettes (nom, niveau, minuteur, production) placées au-dessus des bâtiments
  setLabels(fn) { this.labelFn = fn; }
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now; this.t += dt;
    this.cam.position.set(Math.sin(this.rot) * this.dist, this.dist * 0.82, Math.cos(this.rot) * this.dist);
    this.cam.lookAt(0, 0, -0.5);
    for (const u of this.ups) u(dt, this.t);
    if (this.post) this.post.render(); else this.r.render(this.scene, this.cam);
    if (this.labelFn) {
      const rc = this.cv.getBoundingClientRect(), v = new THREE.Vector3();
      for (const id of BUILD_ORDER) {
        const el = this.labelFn(id); if (!el) continue;
        const [x, z] = SPOTS[id]; v.set(x, SIZE[id] * 0.9 + 0.8, z).project(this.cam);
        el.style.transform = `translate(${(v.x + 1) / 2 * rc.width}px, ${(1 - v.y) / 2 * rc.height}px) translate(-50%, -100%)`;
      }
    }
  }
  dispose() {
    this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect();
    removeEventListener('pointermove', this.onMove); removeEventListener('pointerup', this.onUp);
    this.r.dispose(); { const rr = this.r; setTimeout(() => { try { rr.forceContextLoss && rr.forceContextLoss(); } catch (e) {} }, 1500); } // libère la carte graphique après l’affichage du nouvel écran
  }
}
