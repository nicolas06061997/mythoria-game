// MYTHORIA — 3D des menus : vitrine d'un héros (tourne, joue ses animations) et portraits
// fabriqués à partir des vrais modèles 3D (pour la collection).
import * as THREE from 'three';
import { createRenderer, quality } from './stage.js';
import { makeHero, preload, prop } from './assets.js';
import { THEMES, skyDome } from './world.js';
import { createComposer, blobShadow } from './look.js';
import { glowSprite, glowTexture } from './procedural.js';
import { dragons, flock } from './surroundings.js';
import { HERO, RARITIES } from '../../shared/content.js';

// ---------- Vitrine ----------
export class Showcase {
  constructor(canvas, { world = 'aurore', heroId = 'ecuyer', star = 1, mode = 'hero', skin = null, cosmic = false } = {}) {
    this.skin = skin;
    this.cv = canvas; this.mode = mode;
    this.cosmic = cosmic; // accueil : fond transparent, le décor animé est en CSS derrière le héros
    this.r = createRenderer(canvas, { alpha: cosmic }); if (cosmic) this.r.setClearColor(0x000000, 0);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    this.t = 0; this.rotY = 0.5; this.spin = 0.25; this.dead = false;
    const T = THEMES[world] || THEMES.aurore;
    const HS = { aurore: ['#1f5fd8', '#6fb0f0'], sylve: ['#14584a', '#5fb894'], arcane: ['#1e1068', '#6a48d0'], braise: ['#3a0a08', '#c8501e'], givre: ['#1f5aa8', '#90c8ee'], ombre: ['#0c0620', '#42226e'] }[world] || ['#1f5fd8', '#6fb0f0'];
    this.sky = skyDome(mode === 'home' ? { skyTop: HS[0], skyBot: HS[1] } : { skyTop: '#2a1a5a', skyBot: '#0d0820' }); this.sky.scale.setScalar(0.25); if (!cosmic) this.scene.add(this.sky);
    this.post = createComposer(this.r, this.scene, this.cam, { bloom: quality().bloom, strength: 0.45, threshold: 1.1, radius: 0.5, samples: quality().msaa });
    this.scene.add(new THREE.HemisphereLight(T.hemiSky, T.hemiGround, 1.3));
    const sun = new THREE.DirectionalLight(T.sun, 2.4); sun.position.set(-3, 6, 4); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -3, right: 3, top: 4, bottom: -2, near: 0.5, far: 20 }); this.scene.add(sun);
    const rim = new THREE.DirectionalLight(new THREE.Color(T.skyBot), 1.8); rim.position.set(3, 3, -4); this.scene.add(rim);
    // socle
    this.base = new THREE.Group(); this.scene.add(this.base);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.3, 32), new THREE.MeshStandardMaterial({ color: cosmic ? '#5b6cb4' : T.ground, flatShading: true })); top.position.y = -0.15; top.receiveShadow = true; this.base.add(top);
    const rimR = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.5, 0.5, 32), new THREE.MeshStandardMaterial({ color: cosmic ? '#39468c' : T.rock, flatShading: true })); rimR.position.y = -0.5; this.base.add(rimR);
    const under = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.2, 9), new THREE.MeshStandardMaterial({ color: cosmic ? '#222a66' : T.rock2, flatShading: true })); under.rotation.x = Math.PI; under.position.y = -1.8; this.base.add(under);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.3, 48), new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.position.y = 0.02; this.base.add(this.ring);
    if (mode === 'home') {
      const add = async (n, x, z, s) => { try { const o = await prop(n, { scale: s }); o.position.set(x, 0, z); this.base.add(o); } catch (e) {} };
      // décor derrière le héros seulement (il ne passe plus devant)
      if (!cosmic) add(T.props[0][0], -1.25, -1.05, 0.42); if (!cosmic) add(T.props[Math.min(2, T.props.length - 1)][0], 1.3, -0.95, 0.45);
      if (cosmic) { top.visible = rimR.visible = under.visible = this.ring.visible = false; this.rockIsle(); } else this.altar(T);
      if (!cosmic) this.backdrop(T, world);
    }
    this.glow = glowSprite(0xffffff, 3); this.glow.position.y = 0.9; this.glow.material.opacity = 0.25; this.scene.add(this.glow);
    this.resize();
    this.setHero(heroId, star);
    this.bindDrag();
    this.loop = this.loop.bind(this); this.last = 0; this.raf = requestAnimationFrame(this.loop);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
  }
  // Accueil cosmique : île de roche fendue (dalles irrégulières + pointes dessous), lumière cyan
  rockIsle() {
    const g = this.base, mat = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.95 });
    const slab = (x, z, r, hgt, y, rot, seg, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.86, hgt, seg), mat(c)); m.position.set(x, y - hgt / 2, z); m.rotation.y = rot; m.receiveShadow = true; g.add(m); };
    slab(0, 0, 1.28, 0.36, 0, 0.3, 7, '#8794dc');
    slab(-1.3, 0.2, 0.78, 0.3, -0.13, 0.9, 5, '#7986d0'); slab(1.25, -0.15, 0.72, 0.32, -0.2, 0.2, 6, '#7380cc');
    slab(0.25, -1.05, 0.82, 0.3, -0.08, 1.4, 5, '#6f7cc8'); slab(-0.45, 1.0, 0.62, 0.28, -0.24, 0.5, 5, '#8490d8');
    const spike = (x, z, r, len, y, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.18, len, 5), mat(c)); m.position.set(x, y - len / 2, z); m.rotation.y = x * 2 + z; g.add(m); };
    spike(0, 0, 1.18, 2.5, -0.34, '#3d4796'); spike(-1.05, 0.25, 0.62, 1.5, -0.4, '#4a55a8'); spike(1.0, -0.1, 0.6, 1.8, -0.48, '#343d88');
    spike(0.2, 0.85, 0.5, 1.3, -0.45, '#525db0'); spike(0.2, -0.9, 0.6, 1.6, -0.36, '#2b3378');
    const l = new THREE.PointLight('#8fe9ff', 7, 7); l.position.set(0, 2.6, -1.6); this.scene.add(l);
  }
  // Autel magique sous le héros : cercle de runes lumineuses, cristaux qui tournent, colonne de lumière, cascade
  altar(T) {
    const g = this.base, gold = new THREE.MeshStandardMaterial({ color: '#e0b040', metalness: 0.6, roughness: 0.35, flatShading: true });
    const trim = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.05, 6, 48), gold); trim.rotation.x = Math.PI / 2; trim.position.y = 0.0; g.add(trim);
    // runes dessinées
    const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d');
    x.translate(256, 256); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineWidth = 6;
    for (const r of [236, 200, 120]) { x.beginPath(); x.arc(0, 0, r, 0, 7); x.stroke(); }
    x.font = 'bold 30px serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const glyph = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗ';
    for (let i = 0; i < 20; i++) { x.save(); x.rotate(i / 20 * Math.PI * 2); x.fillText(glyph[i], 0, -218); x.restore(); }
    for (let i = 0; i < 6; i++) { x.save(); x.rotate(i / 6 * Math.PI * 2); x.beginPath(); x.moveTo(0, -200); x.lineTo(0, -120); x.stroke(); x.restore(); }
    x.beginPath(); for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI * 2 * 2; x.lineTo(Math.sin(a) * 200, -Math.cos(a) * 200); } x.stroke();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const runeCol = new THREE.Color(this.cosmic ? '#8fe9ff' : T.partCol || '#ffd88a');
    const rune = new THREE.Mesh(new THREE.CircleGeometry(1.45, 48), new THREE.MeshBasicMaterial({ map: tex, color: runeCol, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    rune.rotation.x = -Math.PI / 2; rune.position.y = 0.025; g.add(rune);
    this.ring.visible = false;
    // colonne de lumière
    const beamM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { c: { value: runeCol }, t: { value: 0 } },
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 c; uniform float t; varying vec2 vu; void main(){ float a = (1.0 - vu.y) * (1.0 - vu.y) * (0.16 + 0.07 * sin(t * 2.0 + vu.y * 8.0)); gl_FragColor = vec4(c * a, a); }' });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.3, 3.2, 32, 1, true), beamM); beam.position.y = 1.6; g.add(beam);
    // cristaux en orbite
    const crys = [];
    for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: runeCol, emissive: runeCol, emissiveIntensity: 1.6, flatShading: true })); m.scale.y = 1.8; g.add(m); crys.push(m); }
    // cascade qui tombe du bord de l'île
    const fallM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { t: { value: 0 } },
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform float t; varying vec2 vu; void main(){ float s = 0.55 + 0.45 * sin(vu.y * 40.0 + t * 9.0 + sin(vu.x * 20.0) * 2.0); float a = s * smoothstep(0.0, 0.25, vu.y) * (1.0 - abs(vu.x - 0.5) * 2.0); gl_FragColor = vec4(vec3(0.75, 0.9, 1.0) * (0.7 + s * 0.4), a * 0.85); }' });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.6), fallM); fall.position.set(0.9, -1.55, 1.25); fall.rotation.y = -0.6; g.add(fall);
    const mist = glowSprite(0xdff4ff, 1.4); mist.position.set(0.9, -2.8, 1.3); mist.material.opacity = 0.5; g.add(mist);
    this.altarUp = (dt, t) => {
      rune.rotation.z += dt * 0.25; rune.material.opacity = 0.7 + Math.sin(t * 2) * 0.15;
      beamM.uniforms.t.value = t; fallM.uniforms.t.value = t;
      crys.forEach((m, i) => { const a = t * 0.8 + i * Math.PI / 2; m.position.set(Math.cos(a) * 1.25, 0.9 + Math.sin(t * 1.6 + i) * 0.25, Math.sin(a) * 1.25); m.rotation.y = t * 2; });
    };
  }
  // Fond de l'accueil : îlots flottants, nuages, lueurs et un dragon au loin (couleurs du monde)
  backdrop(T, world) {
    this.ups = [];
    const g = new THREE.Group(); this.scene.add(g);
    const clouds = [];
    for (let i = 0; i < 14; i++) {
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(T.fog).lerp(new THREE.Color('#ffffff'), 0.4), transparent: true, opacity: 0.3, depthWrite: false }));
      c.position.set((Math.random() - 0.5) * 22, -5 - Math.random() * 2.5, -4 - Math.random() * 12); c.scale.set(5 + Math.random() * 6, 2 + Math.random() * 1.5, 1); g.add(c); clouds.push({ c, sp: 0.15 + Math.random() * 0.2 });
    }
    const isl = [];
    for (const [x, y, z, s] of [[-3.6, 0.6, -6, 0.5], [4.2, 1.6, -9, 0.7], [-5.5, 2.4, -12, 0.8], [2.6, -0.6, -5, 0.35], [7, 0.2, -13, 0.9]]) {
      const o = new THREE.Group();
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * s, 1.6 * s, 0.35 * s + 0.1, 9), new THREE.MeshStandardMaterial({ color: T.ground, flatShading: true }));
      const bot = new THREE.Mesh(new THREE.ConeGeometry(1.5 * s, 3 * s, 9), new THREE.MeshStandardMaterial({ color: T.rock, flatShading: true })); bot.rotation.x = Math.PI; bot.position.y = -1.6 * s;
      o.add(top, bot); o.position.set(x, y, z); g.add(o); isl.push({ o, y, ph: Math.random() * 6 });
      prop(T.props[isl.length % T.props.length][0], { scale: 0.55 * s, tint: T.tintProps }).then(p => { p.position.y = 0.15; if (!this.dead) o.add(p); }).catch(() => {});
    }
    const n = 50, pg = new THREE.BufferGeometry(), pp = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pp[i * 3] = (Math.random() - 0.5) * 14; pp[i * 3 + 1] = Math.random() * 6 - 1.5; pp[i * 3 + 2] = -1 - Math.random() * 9; }
    pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.12, map: glowTexture(), color: T.partCol, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    // paysage peint au loin : montagnes enneigées, forêt, château sur sa colline, rayons de soleil
    const haze = new THREE.Color(T.fog), farC = new THREE.Color(T.rock).lerp(new THREE.Color(T.skyTop), 0.45).multiplyScalar(0.9), snow = new THREE.Color('#ffffff').lerp(haze, 0.15);
    const flatM = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.95 });
    for (let i = 0; i < 9; i++) {
      const x = -20 + i * 5 + (Math.random() - 0.5) * 3, z = -30 - Math.random() * 10, hgt = 7 + Math.random() * 6, r = 4 + Math.random() * 3;
      const m = new THREE.Mesh(new THREE.ConeGeometry(r, hgt, 6), flatM(farC.clone().multiplyScalar(0.85 + Math.random() * 0.25))); m.position.set(x, -4 + hgt / 2, z); m.rotation.y = Math.random(); g.add(m);
      if (!['braise', 'ombre'].includes(world)) { const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.38, hgt * 0.38, 6), flatM(snow)); cap.position.set(x, -4 + hgt - hgt * 0.19 + 0.02, z); cap.rotation.y = m.rotation.y; g.add(cap); }
    }
    const treeC = new THREE.Color(T.ground2 || T.ground).lerp(new THREE.Color(T.skyTop), 0.15).multiplyScalar(0.75), tg = new THREE.ConeGeometry(0.5, 1.6, 6);
    const forest = new THREE.InstancedMesh(tg, flatM('#ffffff'), 70), o = new THREE.Object3D(), tc = new THREE.Color();
    for (let i = 0; i < 70; i++) { o.position.set(-16 + Math.random() * 32, -3.2 + Math.random() * 0.6, -15 - Math.random() * 7); o.scale.setScalar(0.8 + Math.random() * 0.9); o.updateMatrix(); forest.setMatrixAt(i, o.matrix); forest.setColorAt(i, tc.copy(treeC).multiplyScalar(0.8 + Math.random() * 0.4)); }
    g.add(forest);
    const hill = new THREE.Mesh(new THREE.SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), flatM(new THREE.Color(T.ground).lerp(new THREE.Color(T.skyTop), 0.2))); hill.scale.set(1.4, 0.55, 1); hill.position.set(7, -3.4, -20); g.add(hill);
    const castle = new THREE.Group(), cm = flatM(new THREE.Color('#d8dcef').lerp(haze, 0.35)), roofM = flatM(new THREE.Color(T.partCol || '#6a8ad8').lerp(haze, 0.25));
    for (const [x, hgt, r] of [[-1.1, 2.2, 0.32], [0, 3.2, 0.42], [1.1, 2.4, 0.32], [0.55, 1.6, 0.6], [-0.55, 1.6, 0.6]]) {
      const tw = new THREE.Mesh(r > 0.5 ? new THREE.BoxGeometry(r * 1.6, hgt, 0.9) : new THREE.CylinderGeometry(r, r, hgt, 8), cm); tw.position.set(x, hgt / 2, 0); castle.add(tw);
      if (r < 0.5) { const rf = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 2.6, 8), roofM); rf.position.set(x, hgt + r * 1.3, 0); castle.add(rf); }
    }
    castle.position.set(7, -1.2, -20); castle.scale.setScalar(1.1); g.add(castle);
    const rayM = new THREE.MeshBasicMaterial({ color: new THREE.Color(T.skyBot).lerp(new THREE.Color('#fff8e0'), 0.6), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const rays = [];
    for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.PlaneGeometry(1.4 + i * 0.4, 30), rayM.clone()); r.position.set(-4.5 + i * 1.6, -6, -15); r.rotation.z = 0.5 - i * 0.12; r.geometry.translate(0, 15, 0); g.add(r); rays.push(r); }
    this.ups.push((dt, t) => rays.forEach((r, i) => { r.material.opacity = 0.035 + Math.sin(t * 0.6 + i * 1.3) * 0.02; }));
    const sunG = glowSprite(new THREE.Color(T.skyBot).lerp(new THREE.Color('#ffffff'), 0.5), 9); sunG.position.set(-5, 6, -18); sunG.material.opacity = 0.35; g.add(sunG);
    const DC = { aurore: ['#e8b04a', '#fff0b8'], sylve: ['#4caf6a', '#d8ffb0'], arcane: ['#8a5ad8', '#e0d0ff'], braise: ['#c4263c', '#ffcf70'], givre: ['#6fb8e8', '#eaf8ff'], ombre: ['#2a1e3a', '#c08aff'] }[world] || ['#e8b04a', '#fff0b8'];
    dragons(g, this.ups, [{ c: DC[0], b: DC[1], horns: true, s: 0.5, r: 7, h: 3.2, sp: 0.18, dir: 1, cz: -11 }]);
    flock(g, this.ups, { n: 7, color: world === 'ombre' ? '#120c1a' : '#3a3040', r: 6, h: 2.6, sp: 0.35, size: 0.12, cz: -8 });
    this.ups.push((dt, t) => {
      for (const c of clouds) { c.c.position.x += c.sp * dt; if (c.c.position.x > 12) c.c.position.x = -12; }
      for (const i of isl) i.o.position.y = i.y + Math.sin(t * 0.7 + i.ph) * 0.12;
      for (let i = 0; i < n; i++) { pp[i * 3 + 1] += dt * 0.25; if (pp[i * 3 + 1] > 4.5) pp[i * 3 + 1] = -1.5; }
      pg.attributes.position.needsUpdate = true;
    });
  }
  async setHero(id, star = 1) {
    const my = (this.req = (this.req || 0) + 1); this.heroId = id;
    await preload([id]);
    const a = await makeHero(id, { star, skin: this.skin });
    if (my !== this.req || this.dead) { a.dispose(); return; }
    if (this.actor) { this.base.remove(this.actor.holder); this.actor.dispose(); }
    this.actor = a; a.play('idle'); a.back = 'idle'; this.base.add(a.holder); a.holder.add(blobShadow(1.4));
    const c = HERO[id];
    if (this.mode !== 'home') { const R = new THREE.Color(RARITIES[c.rar].color); this.sky.material.uniforms.top.value.copy(R.clone().multiplyScalar(0.45)); }
    this.ring.material.color.set(RARITIES[c.rar].color);
    this.glow.material.color.set(c.model.glow || RARITIES[c.rar].color);
    this.frame();
  }
  play(state) { if (this.actor) { this.actor.back = 'idle'; this.actor.play(state, { force: true }); } }
  frame() {
    const h = this.actor ? Math.min(3.4, this.actor.height + (HERO[this.heroId]?.fly ? 1 : 0)) : 1.8;
    const fly = this.actor && this.actor.height > 1.85 ? 1.15 : 1;
    const d = (this.mode === 'home' ? 6.4 : 5.4) * Math.max(1, h * fly / 1.8);
    this.cam.position.set(0, h * 0.62 + 0.9, d);
    this.cam.lookAt(0, h * 0.48, 0);
  }
  resize() {
    const w = this.cv.clientWidth || 1, h = this.cv.clientHeight || 1;
    this.r.setSize(w, h, false); this.cam.aspect = w / h; this.cam.updateProjectionMatrix(); if (this.post) this.post.setSize(w, h);
  }
  bindDrag() {
    let x0 = null;
    this.cv.addEventListener('pointerdown', e => { x0 = e.clientX; this.spin = 0; });
    this.onMove = e => { if (x0 === null) return; this.rotY += (e.clientX - x0) * 0.012; x0 = e.clientX; };
    this.onUp = () => { if (x0 !== null) { x0 = null; this.spin = 0.25; } };
    addEventListener('pointermove', this.onMove); addEventListener('pointerup', this.onUp);
  }
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now; this.t += dt;
    this.rotY += this.spin * dt;
    if (this.actor) this.actor.holder.rotation.y = this.rotY;
    if (this.altarUp) this.altarUp(dt, this.t);
    this.base.position.y = Math.sin(this.t * 1.2) * 0.05;
    this.ring.rotation.z += dt * 0.5;
    if (this.actor) this.actor.update(dt);
    if (this.ups) for (const u of this.ups) u(dt, this.t);
    if (this.cosmic) this.r.render(this.scene, this.cam); else this.post.render();
  }
  dispose() {
    this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect();
    removeEventListener('pointermove', this.onMove); removeEventListener('pointerup', this.onUp);
    if (this.actor) this.actor.dispose();
    this.r.dispose(); { const rr = this.r; setTimeout(() => { try { rr.forceContextLoss && rr.forceContextLoss(); } catch (e) {} }, 1500); } // libère la carte graphique après l’affichage du nouvel écran
  }
}

// ---------- Portraits (rendus une fois, puis gardés en mémoire) ----------
const PORTRAITS = new Map(), waiting = new Map();
let pr = null, queue = Promise.resolve();
function portraitRig() {
  if (pr) return pr;
  const cv = document.createElement('canvas'); cv.width = 240; cv.height = 300;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(240, 300, false); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.setClearColor(0, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight('#ffffff', '#5a4a6a', 1.4));
  const d = new THREE.DirectionalLight('#fff4e0', 2.6); d.position.set(-2, 4, 5); scene.add(d);
  const rim = new THREE.DirectionalLight('#b8c8ff', 2.2); rim.position.set(3, 2, -4); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(30, 240 / 300, 0.1, 50);
  pr = { cv, r, scene, cam };
  return pr;
}
// Portraits gardés sur le téléphone (une fois par version) : l'onglet Héros s'ouvre tout de suite.
export async function warmPortraits(ids, version, onProgress) {
  let cache = null, name = 'myt-portraits-' + version;
  try { cache = await caches.open(name); (await caches.keys()).filter(k => k.startsWith('myt-portraits-') && k !== name).forEach(k => caches.delete(k)); } catch (e) {}
  let n = 0;
  for (const id of ids) {
    try {
      const key = 'portrait/' + id, hit = cache && await cache.match(key);
      if (hit) PORTRAITS.set(id, URL.createObjectURL(await hit.blob()));
      else { const url = await portrait(id); if (cache && url) { const blob = await (await fetch(url)).blob(); await cache.put(key, new Response(blob, { headers: { 'Content-Type': 'image/png' } })); } }
    } catch (e) {}
    onProgress && onProgress(++n / ids.length);
  }
}
export function portrait(id) {
  if (PORTRAITS.has(id)) return Promise.resolve(PORTRAITS.get(id));
  if (waiting.has(id)) return waiting.get(id);
  const p = (queue = queue.then(async () => {
    const { cv, r, scene, cam } = portraitRig();
    await preload([id]);
    const a = await makeHero(id, { star: 1 });
    scene.add(a.holder);
    a.holder.rotation.y = 0.45;
    a.play('idle'); a.update(0.6);
    const c = HERO[id], h = a.height, wide = ['wolf', 'Stag'].includes(c.model.beast) || c.model.proc === 'dragon' || c.model.proc === 'ram';
    const fly = c.fly ? 1.0 : 0;
    cam.position.set(0, h * 0.6 + fly * 0.3, (wide ? 3.6 : 3.1) * Math.max(0.8, h / 1.75));
    cam.lookAt(0, h * 0.52 + fly * 0.2, 0);
    if (c.model.proc === 'dragon') { cam.position.y = h * 0.75; cam.lookAt(0, h * 0.6, 0); }
    r.render(scene, cam);
    const url = cv.toDataURL('image/png');
    scene.remove(a.holder); a.dispose();
    PORTRAITS.set(id, url);
    return url;
  }).catch(() => ''));
  waiting.set(id, p);
  return p;
}
