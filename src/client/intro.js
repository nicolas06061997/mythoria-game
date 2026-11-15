// MYTHORIA — cinématique d'ouverture de la Saison 1 (~20 s), jouée en direct par le moteur 3D du jeu.
// 1) le Cœur de Mythe se brise et les Failles s'ouvrent ; 2) Vael l'Archimage appelle un héros ; 3) titre de la Saison 1.
// Une seule fois (localStorage myt_intro_s1), bouton « Passer », revoir depuis les Réglages. Musique synthétisée (Web Audio).
// Si quoi que ce soit échoue (WebGL, modèle), la cinématique s'efface et le jeu continue normalement.
import * as THREE from 'three';
import { createRenderer, quality } from './three/stage.js';
import { makeHero, preload, prop } from './three/assets.js';
import { nebulaDome } from './three/world.js';
import { createComposer, blobShadow } from './three/look.js';
import { glowSprite, glowTexture } from './three/procedural.js';
import { dragons } from './three/surroundings.js';
import { loadProfile } from './store.js';

const KEY = 'myt_intro_s1';
export const introSeen = () => { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return true; } };
const markSeen = () => { try { localStorage.setItem(KEY, '1'); } catch (e) {} };

const DUR = 20.5;
// textes de Vael (début, fin en secondes)
const CAPS = [
  [0.7, 4.0, 'Il y a longtemps, le Cœur de Mythe gardait les six royaumes en paix.'],
  [4.5, 7.0, 'Un jour, il s’est brisé… et les Failles se sont ouvertes.'],
  [7.6, 10.3, 'Moi, Vael l’Archimage, j’ai vu les ténèbres en sortir.'],
  [10.6, 13.4, 'Mythoria a besoin d’un nouveau héros… toi.'],
];
const BREAK = 4.3, CUT1 = 7.0, CUT2 = 13.5, TITLE = 14.1;

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
const clamp01 = x => Math.max(0, Math.min(1, x));
const ease = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
const lerp = (a, b, k) => a + (b - a) * k;

export function playIntro({ force = false } = {}) {
  if (!force && introSeen()) return Promise.resolve(false);
  return new Promise(resolve => {
    let done = false, I = null;
    const root = el('div', 'intro');
    const finish = () => {
      if (done) return; done = true; markSeen();
      root.classList.add('off');
      try { I && I.stop(); } catch (e) {}
      setTimeout(() => { root.remove(); resolve(true); }, 450);
    };
    // Écran d'attente : un appui est nécessaire pour que le téléphone accepte de jouer la musique.
    const gate = el('div', 'in-gate');
    gate.append(el('div', 'in-season', 'Saison 1'), el('div', 'logo', 'MYTHORIA'), el('div', 'in-sub', 'Les Failles du Mythe'));
    const play = el('button', 'btn big gold in-play', '▶ Voir l’histoire');
    const skip0 = el('button', 'in-skip0', 'Passer');
    gate.append(play, skip0);
    root.append(gate);
    document.body.append(root);
    skip0.onclick = finish;
    play.onclick = async () => {
      play.disabled = true;
      try { I = await startCinematic(root, finish); gate.remove(); }
      catch (e) { console.warn('cinématique', e); finish(); }
    };
  });
}

async function startCinematic(root, finish) {
  const cv = el('canvas', 'in-cv'), shade = el('div', 'in-shade'), cap = el('div', 'in-cap'), title = el('div', 'in-title'), skip = el('button', 'in-skip', 'Passer ⏭');
  title.append(el('div', 'in-season', 'Saison 1'), el('div', 'logo', 'MYTHORIA'), el('div', 'in-sub', 'Les Failles du Mythe'), el('div', 'in-tap', 'Touche l’écran pour commencer'));
  root.append(cv, shade, cap, title, skip);
  skip.onclick = e => { e.stopPropagation(); finish(); };

  const q = quality();
  const r = createRenderer(cv);
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, 1, 0.1, 600);
  const post = createComposer(r, scene, cam, { bloom: q.bloom, strength: 0.5, threshold: 0.86, radius: 0.5, samples: q.msaa });
  const ups = [];
  scene.fog = new THREE.FogExp2('#120c36', 0.012);

  // ---------- ciel et lumières ----------
  const sky = nebulaDome(); scene.add(sky);
  scene.add(new THREE.HemisphereLight('#b8c8ff', '#2a1a40', 1.0));
  const sun = new THREE.DirectionalLight('#ffe8c8', 2.2); sun.position.set(-6, 10, 6); sun.castShadow = q.shadows; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 40 }); scene.add(sun);
  const heartLight = new THREE.PointLight('#fff6e0', 9, 14, 2); heartLight.position.set(0, 2.4, 0); scene.add(heartLight);

  // ---------- l'île flottante ----------
  const flat = c => new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 });
  const island = new THREE.Group(); scene.add(island);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 6.8, 0.6, 28), flat('#6fae55')); top.position.y = -0.3; top.receiveShadow = true; island.add(top);
  const cliff = new THREE.Mesh(new THREE.CylinderGeometry(6.85, 6.2, 1.4, 28), flat('#9a8f80')); cliff.position.y = -1.2; island.add(cliff);
  const under = new THREE.Mesh(new THREE.ConeGeometry(6.2, 9, 11), flat('#6f655a')); under.rotation.x = Math.PI; under.position.y = -6.4; island.add(under);
  const path = new THREE.Mesh(new THREE.CircleGeometry(3.1, 32), flat('#d8c39a')); path.rotation.x = -Math.PI / 2; path.position.y = 0.01; path.receiveShadow = true; island.add(path);
  const addProp = async (n, x, z, s, ry = 0) => { try { const o = await prop(n, { scale: s }); o.position.set(x, 0, z); o.rotation.y = ry; island.add(o); } catch (e) {} };
  await Promise.all([
    addProp('Temple_SecondAge_Level3', 0, -4.6, 1.0),
    addProp('CommonTree_1', -4.6, -1.8, 1.0), addProp('CommonTree_3', 4.8, -2.2, 1.0, 1.2), addProp('Rock_Moss_2', 4.2, 2.6, 0.9),
    addProp('Flowers', -3.8, 2.4, 1.0), addProp('Bush_1', -2.6, -3.6, 0.9),
  ]);

  // ---------- le Cœur de Mythe ----------
  const heart = new THREE.Group(); island.add(heart);
  const stone = flat('#cfc6b4'), stone2 = flat('#a99f8c');
  const b1 = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.2, 0.2, 24), stone2); b1.position.y = 0.1; b1.receiveShadow = true; heart.add(b1);
  const b2 = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.24, 20), stone); b2.position.y = 0.32; heart.add(b2);
  for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, p = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.0, 0.22), stone); p.position.set(Math.cos(a) * 1.75, 0.6, Math.sin(a) * 1.75); p.castShadow = true; heart.add(p); }
  const gemM = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.7, flatShading: true, roughness: 0.2 });
  const gem = new THREE.Mesh(new THREE.IcosahedronGeometry(0.6, 0), gemM); gem.position.y = 2.1; heart.add(gem);
  const halo = glowSprite(0xfff2d0, 2.4); halo.position.y = 2.1; halo.material.opacity = 0.32; heart.add(halo);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.55, 10, 12, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2d0', transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = 6.5; heart.add(beam);
  // éclats qui volent quand il se brise
  const shards = [];
  for (let i = 0; i < 16; i++) {
    const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.16 + Math.random() * 0.14, 0), new THREE.MeshStandardMaterial({ color: '#e8d8ff', emissive: '#c08aff', emissiveIntensity: 1.0, flatShading: true }));
    const a = Math.random() * Math.PI * 2, up = 0.4 + Math.random() * 0.9;
    m.userData.v = new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 3), up * 4, Math.sin(a) * (2 + Math.random() * 3));
    m.visible = false; m.position.copy(gem.position); heart.add(m); shards.push(m);
  }
  const flash = glowSprite(0xffffff, 1); flash.position.y = 2.1; flash.material.opacity = 0; heart.add(flash);

  // ---------- les Failles : déchirures lumineuses dans le ciel ----------
  function rift(seed, len, w) {
    let s = seed; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const pts = []; let x = 0, y = 0;
    for (let i = 0; i <= 18; i++) { pts.push([x, y]); y -= len / 18; x += (rnd() - 0.5) * len * 0.16; }
    const mk = (width, color, op) => {
      const pos = [], idx = [];
      pts.forEach(([px, py], i) => { const k = Math.sin(i / 18 * Math.PI) * width + 0.02; pos.push(px - k, py, 0, px + k, py, 0); if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.userData.n = idx.length; g.setDrawRange(0, 0); return m;
    };
    const grp = new THREE.Group(); grp.add(mk(w, '#a04aff', 0.85), mk(w * 0.35, '#ffffff', 0.95));
    const glow = glowSprite(0xb060ff, len * 0.9); glow.position.y = -len / 2; glow.material.opacity = 0; grp.add(glow); grp.userData.glow = glow;
    return grp;
  }
  const rifts = [[-22, 30, -48, 7, 26, 3.0, 0.15], [18, 34, -52, 11, 30, 3.4, -0.2], [2, 40, -70, 23, 34, 3.8, 0.05], [-40, 22, -30, 31, 20, 2.4, 0.4]]
    .map(([x, y, z, seed, len, w, rz], i) => { const g = rift(seed, len, w); g.position.set(x, y, z); g.rotation.z = rz; g.lookAt(0, y - len / 2, 0); g.rotateZ(rz); g.userData.t0 = BREAK + 0.15 + i * 0.35; scene.add(g); return g; });
  // ombres qui s'échappent des Failles
  const NM = 140, mg = new THREE.BufferGeometry(), mp = new Float32Array(NM * 3), mv = [];
  for (let i = 0; i < NM; i++) { const R = rifts[i % rifts.length]; mp[i * 3] = R.position.x; mp[i * 3 + 1] = R.position.y - 8 - Math.random() * 14; mp[i * 3 + 2] = R.position.z; mv.push([(Math.random() - 0.5) * 6, -2 - Math.random() * 3, 6 + Math.random() * 8]); }
  mg.setAttribute('position', new THREE.BufferAttribute(mp, 3));
  const motes = new THREE.Points(mg, new THREE.PointsMaterial({ color: '#c070ff', map: glowTexture(), size: 1.1, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  scene.add(motes);

  // ---------- Vael l'Archimage ----------
  let vael = null;
  try { await preload(['vael']); vael = await makeHero('vael', { lite: !q.shadows }); vael.play('idle'); vael.back = 'idle';
    vael.holder.position.set(0, 0.45, 2.7); vael.holder.rotation.y = 0.15; vael.holder.add(blobShadow(1.2)); island.add(vael.holder); } catch (e) { vael = null; }
  const aura = glowSprite(0x9a5aff, 3.2); aura.position.set(0, 1.3, 1.9); aura.material.opacity = 0; island.add(aura);
  const vLight = new THREE.PointLight('#a070ff', 0, 8, 2); vLight.position.set(0.6, 2.2, 3.8); island.add(vLight);

  // dragon qui tourne autour de l'île (scène du titre)
  dragons(scene, ups, [{ c: '#e8b04a', b: '#fff0b8', horns: true, s: 1.1, r: 15, h: 7, sp: 0.22, dir: 1, cz: 0 }]);

  const resize = () => { const w = root.clientWidth || innerWidth, h = root.clientHeight || innerHeight; r.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 52 : 40; cam.updateProjectionMatrix(); post.setSize(w, h); };
  resize(); addEventListener('resize', resize);

  // ---------- caméra : trois plans ----------
  const P = new THREE.Vector3(), L = new THREE.Vector3();
  function camAt(t) {
    if (t < CUT1) { // plan 1 : le Cœur, on tourne lentement autour, puis on recule quand il se brise
      const k = t / CUT1, a = 0.9 - k * 0.6, d = lerp(7.5, 9.5, ease((t - BREAK) / 2.5)), y = lerp(3.2, 4.6, ease((t - BREAK) / 2.5));
      P.set(Math.sin(a) * d, y, Math.cos(a) * d); L.set(0, lerp(2.0, 3.4, ease((t - BREAK) / 2.5)), 0);
    } else if (t < CUT2) { // plan 2 : Vael, gros plan qui se rapproche
      const k = (t - CUT1) / (CUT2 - CUT1);
      P.set(lerp(2.0, 1.1, k), lerp(2.3, 2.0, k), lerp(9.4, 7.6, ease(k))); L.set(0, 1.15, 2.7);
    } else { // plan 3 : on s'envole au-dessus de l'île, les Failles au fond
      const k = ease((t - CUT2) / 5), a = -0.25 + (t - CUT2) * 0.05;
      P.set(Math.sin(a) * lerp(9, 22, k), lerp(3, 12, k), Math.cos(a) * lerp(9, 22, k)); L.set(0, lerp(2, 6, k), lerp(0, -10, k));
    }
    if (t > BREAK && t < BREAK + 1.1) { const s = (1 - (t - BREAK) / 1.1) * 0.25; P.x += (Math.random() - 0.5) * s; P.y += (Math.random() - 0.5) * s; } // secousse
    cam.position.copy(P); cam.lookAt(L);
  }

  // ---------- musique ----------
  const music = startMusic();

  // ---------- boucle ----------
  // le temps suit l'horloge réelle (images et musique restent synchronisées même si le téléphone est lent)
  let t = 0, last = 0, raf = 0, stopped = false, broken = false, cast = false, cheer = false, tapReady = false, start = 0, offset = 0;
  window.__intro = { seek: s => { offset = s - (performance.now() - start) / 1000; } }; // pour les tests automatiques (captures à un instant précis)
  const capEl = cap;
  function frame(now) {
    if (stopped) return;
    raf = requestAnimationFrame(frame);
    if (!start) start = now;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0; last = now; t = (now - start) / 1000 + offset;
    // textes
    const c = CAPS.find(([a, b]) => t >= a && t <= b);
    const txt = c ? c[2] : '';
    if (capEl.dataset.t !== txt) { capEl.dataset.t = txt; capEl.classList.remove('on'); if (txt) { capEl.textContent = txt; void capEl.offsetWidth; capEl.classList.add('on'); } }
    // fondus au noir entre les plans
    const fade = Math.max(0, 1 - Math.abs(t - CUT1) / 0.32, 1 - Math.abs(t - CUT2) / 0.32, 1 - t / 0.6, (t - (DUR - 0.6)) / 0.6);
    shade.style.opacity = clamp01(fade).toFixed(3);
    // le Cœur
    gem.rotation.set(t * 0.6, t * 0.9, 0); gem.position.y = 2.1 + Math.sin(t * 1.8) * 0.12;
    if (t < BREAK) { const p = clamp01((t - 2.6) / (BREAK - 2.6)); gemM.emissiveIntensity = 0.7 + p * 1.6 + Math.sin(t * 40) * p * 0.5; halo.scale.setScalar(2.4 + p * 1.6 + Math.sin(t * 30) * p * 0.6); halo.material.opacity = 0.32 + p * 0.25; }
    if (t >= BREAK && !broken) { broken = true; gem.visible = false; halo.visible = false; beam.material.color.set('#b060ff'); shards.forEach(s => { s.visible = true; }); }
    if (broken) {
      const k = t - BREAK;
      for (const s of shards) { s.position.addScaledVector(s.userData.v, dt); s.userData.v.y -= 6 * dt; s.rotation.x += dt * 5; s.rotation.y += dt * 3; if (s.position.y < 0.4) { s.position.y = 0.4; s.userData.v.set(0, 0, 0); } }
      flash.material.opacity = Math.max(0, 0.8 - k / 0.6); flash.scale.setScalar(2 + k * 18);
      heartLight.color.set('#b060ff'); heartLight.intensity = 9 * Math.max(0.35, 1 - k * 0.5);
      beam.material.opacity = 0.09 + Math.sin(t * 9) * 0.03;
    }
    // les Failles s'ouvrent une à une
    for (const R of rifts) {
      const p = ease((t - R.userData.t0) / 1.4);
      R.children.forEach(m => { if (m.isMesh) m.geometry.setDrawRange(0, Math.floor(m.userData.n * p / 6) * 6); });
      R.userData.glow.material.opacity = p * (0.35 + Math.sin(t * 3 + R.position.x) * 0.1);
    }
    if (t > BREAK + 0.6) {
      motes.material.opacity = Math.min(0.9, (t - BREAK - 0.6) * 0.6);
      for (let i = 0; i < NM; i++) { const v = mv[i]; mp[i * 3] += v[0] * dt; mp[i * 3 + 1] += v[1] * dt * 0.4; mp[i * 3 + 2] += v[2] * dt; if (mp[i * 3 + 2] > 30) { const R = rifts[i % rifts.length]; mp[i * 3] = R.position.x; mp[i * 3 + 1] = R.position.y - 10; mp[i * 3 + 2] = R.position.z; } }
      mg.attributes.position.needsUpdate = true;
    }
    // Vael
    if (vael) {
      vael.holder.visible = t >= CUT1;
      vael.update(dt);
      if (t > 9.2 && !cast) { cast = true; vael.play('attack', { force: true }); }
      if (t > 11.6 && !cheer) { cheer = true; vael.play('cheer', { force: true }); }
    }
    const ak = t > CUT1 ? clamp01((t - 9.2) / 0.5) * (t < CUT2 + 2 ? 1 : 0.4) : 0;
    aura.material.opacity = ak * (0.32 + Math.sin(t * 6) * 0.1); vLight.intensity = ak * 8;
    // titre
    title.classList.toggle('on', t >= TITLE);
    if (t >= 16.5 && !tapReady) { tapReady = true; root.classList.add('tap'); root.addEventListener('pointerdown', finish, { once: true }); }
    island.position.y = Math.sin(t * 0.8) * 0.12;
    sky.rotation.y += dt * 0.01;
    for (const u of ups) u(dt, t);
    camAt(t);
    post.render();
    if (t >= DUR) finish();
  }
  raf = requestAnimationFrame(frame);

  return { stop() {
    stopped = true; cancelAnimationFrame(raf); removeEventListener('resize', resize); delete window.__intro;
    music.stop();
    try { if (vael) vael.dispose(); } catch (e) {}
    r.dispose(); setTimeout(() => { try { r.forceContextLoss && r.forceContextLoss(); } catch (e) {} }, 1500);
  } };
}

// Musique épique synthétisée : nappe mystérieuse (ré mineur), impact quand le Cœur se brise, suspense, puis accord triomphal.
function startMusic() {
  let on = true; try { on = loadProfile().sound !== false; } catch (e) {}
  let ac = null;
  if (on) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } }
  if (!ac) return { stop() {} };
  const T0 = ac.currentTime + 0.05;
  const master = ac.createGain(); master.gain.value = 0.55;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  // écho léger pour l'ampleur
  const dl = ac.createDelay(1); dl.delayTime.value = 0.32; const fb = ac.createGain(); fb.gain.value = 0.3; const wet = ac.createGain(); wet.gain.value = 0.35;
  lp.connect(master); lp.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(master); master.connect(ac.destination);
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  const pad = (notes, t, dur, vol = 0.05, type = 'sawtooth', cut = 900) => {
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cut; const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, T0 + t); g.gain.exponentialRampToValueAtTime(vol, T0 + t + Math.min(1.2, dur * 0.35)); g.gain.setValueAtTime(vol, T0 + t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, T0 + t + dur);
    f.connect(g).connect(lp);
    for (const n of notes) for (const det of [-7, 7]) { const o = ac.createOscillator(); o.type = type; o.frequency.value = hz(n); o.detune.value = det; o.connect(f); o.start(T0 + t); o.stop(T0 + t + dur + 0.1); }
  };
  const note = (n, t, dur, vol = 0.08, type = 'triangle') => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = type; o.frequency.value = hz(n);
    g.gain.setValueAtTime(0.0001, T0 + t); g.gain.exponentialRampToValueAtTime(vol, T0 + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, T0 + t + dur);
    o.connect(g).connect(lp); o.start(T0 + t); o.stop(T0 + t + dur + 0.05);
  };
  const boom = (t, vol = 0.5, f0 = 90) => {
    const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f0, T0 + t); o.frequency.exponentialRampToValueAtTime(32, T0 + t + 0.9);
    g.gain.setValueAtTime(vol, T0 + t); g.gain.exponentialRampToValueAtTime(0.0001, T0 + t + 1.2); o.connect(g).connect(master); o.start(T0 + t); o.stop(T0 + t + 1.3);
    const n = Math.floor(ac.sampleRate * 1.0), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = ac.createBufferSource(), nf = ac.createBiquadFilter(), ng = ac.createGain(); s.buffer = b; nf.type = 'lowpass'; nf.frequency.value = 700; ng.gain.value = vol * 0.8;
    s.connect(nf).connect(ng).connect(master); s.start(T0 + t);
  };
  // 1) paix : ré mineur puis si bémol, petite mélodie
  pad([50, 53, 57], 0, 4.4, 0.045); [62, 65, 69, 67, 65, 64].forEach((n, i) => note(n, 0.6 + i * 0.55, 0.9, 0.05));
  // montée avant la cassure
  for (let i = 0; i < 8; i++) note(57 + i, 2.9 + i * 0.17, 0.2, 0.035, 'square');
  // 2) le Cœur se brise
  boom(BREAK, 0.6); pad([46, 50, 53, 56], BREAK, 2.8, 0.05, 'sawtooth', 700);
  // 3) Vael : suspense (sol mineur → la), arpèges
  pad([43, 46, 50], CUT1, 3.2, 0.04, 'sawtooth', 650); pad([45, 49, 52], CUT1 + 3.2, 3.3, 0.045, 'sawtooth', 800);
  [55, 58, 62, 58, 57, 61, 64, 61, 55, 58, 62, 67].forEach((n, i) => note(n, CUT1 + 0.3 + i * 0.5, 0.45, 0.04));
  boom(9.2, 0.25, 140);
  // 4) titre : accord triomphal (ré majeur) + timbales
  boom(CUT2, 0.55, 110); boom(CUT2 + 0.5, 0.35, 110);
  pad([38, 50, 54, 57, 62], CUT2, 6.6, 0.06, 'sawtooth', 1800);
  [62, 66, 69, 74].forEach((n, i) => note(n, CUT2 + 0.6 + i * 0.22, 2.2, 0.06, 'triangle'));
  note(74, CUT2 + 2.0, 3.5, 0.05, 'triangle');
  return { stop() {
    try { const t = ac.currentTime; master.gain.cancelScheduledValues(t); master.gain.setValueAtTime(master.gain.value, t); master.gain.linearRampToValueAtTime(0, t + 0.4); setTimeout(() => ac.close().catch(() => {}), 600); } catch (e) {}
  } };
}
