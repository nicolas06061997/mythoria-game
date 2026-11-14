// MYTHORIA — Royaume « peint » : l'illustration de l'île (assets/kingdom/island.webp) rendue vivante.
// Shader : l'île et les îlots flottent, les cascades coulent, les nuages ondulent, l'herbe/lueurs scintillent.
// Calque 2D : fumée du château, lucioles, étincelles de la mine, oiseaux, villageois qui marchent.
// Calque HTML : bâtiments construits (illustrations 3D), pastilles ↑ / +, zones à toucher.
import * as THREE from 'three';
import { createRenderer } from './stage.js';
import { buildingPicture } from './kingdomview.js';
import { BUILD_ORDER } from '../../shared/kingdom.js';

export const IMG_W = 1050, IMG_H = 1120;
// emplacements en pixels de l'image (château, mine et carrière sont dessinés dans l'image)
export const PSPOTS = {
  chateau: [524, 600, 'painted'], mine: [244, 700, 'painted'], carriere: [770, 625, 'painted'],
  academie: [292, 616], temple: [632, 526], marche: [399, 512], caserne: [500, 860], tour: [762, 752], cristal: [395, 770],
};
const FALLS = [[397, 224, 425, 331], [846, 330, 898, 548], [104, 774, 148, 936]];
const PATHS = [[[560, 700], [512, 905]], [[600, 705], [760, 770]], [[470, 700], [300, 640]], [[540, 720], [640, 860]]];

export class KingdomPainted {
  constructor(canvas, layer, worldKey, onTap) {
    this.cv = canvas; this.layer = layer; this.onTap = onTap; this.dead = false; this.t = 0; this.last = 0;
    this.stage = canvas.parentElement;
    this.r = createRenderer(canvas, { alpha: true }); this.r.toneMapping = THREE.NoToneMapping;
    this.scene = new THREE.Scene(); this.cam = new THREE.OrthographicCamera(0, 1, 1, 0, -1, 1);
    const tex = new THREE.TextureLoader().load('assets/kingdom/island.webp'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const E = (cx, cy, rx, ry) => new THREE.Vector4(cx / IMG_W, cy / IMG_H, rx / IMG_W, ry / IMG_H);
    const B = b => new THREE.Vector4(b[0] / IMG_W, b[1] / IMG_H, b[2] / IMG_W, b[3] / IMG_H);
    this.u = { map: { value: tex }, t: { value: 0 }, isl: { value: E(525, 770, 480, 330) }, isl2: { value: E(525, 930, 400, 190) },
      i1: { value: E(399, 255, 95, 115) }, i2: { value: E(945, 360, 125, 200) }, f1: { value: B(FALLS[0]) }, f2: { value: B(FALLS[1]) }, f3: { value: B(FALLS[2]) } };
    const mat = new THREE.ShaderMaterial({ uniforms: this.u, toneMapped: false,
      vertexShader: 'varying vec2 vu; void main(){ vu = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform sampler2D map; uniform float t; uniform vec4 isl, isl2, i1, i2, f1, f2, f3; varying vec2 vu;
        float ell(vec2 p, vec4 e){ vec2 d = (p - e.xy) / e.zw; return dot(d, d); }
        float box(vec2 p, vec4 b){ return step(b.x, p.x) * step(p.x, b.z) * step(b.y, p.y) * step(p.y, b.w); }
        float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 x){ vec2 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec2 p = vec2(vu.x, 1.0 - vu.y);
          // île principale et îlots qui flottent (chacun à son rythme)
          float mI = max(smoothstep(1.0, 0.86, ell(p, isl)), smoothstep(1.0, 0.8, ell(p, isl2)));
          float m1 = smoothstep(1.0, 0.75, ell(p, i1)), m2 = smoothstep(1.0, 0.75, ell(p, i2));
          float dy = mI * sin(t * 0.8) * 0.0045 + m1 * sin(t * 1.1 + 1.0) * 0.007 + m2 * sin(t * 0.9 + 2.3) * 0.008;
          // nuages qui ondulent doucement (tout ce qui n'est pas une île)
          float sky = (1.0 - mI) * (1.0 - m1) * (1.0 - m2);
          vec2 q = p + vec2(sin(t * 0.25 + p.y * 9.0) * 0.004, sin(t * 0.2 + p.x * 7.0) * 0.002) * sky;
          q.y -= dy;
          vec4 c = texture2D(map, vec2(q.x, 1.0 - q.y));
          // cascades : l'eau descend en continu
          float fm = max(box(q, f1), max(box(q, f2), box(q, f3)));
          float water = fm * smoothstep(0.45, 0.75, dot(c.rgb, vec3(0.33))) * step(c.r, c.b + 0.08);
          float fl = vn(vec2(q.x * 260.0, q.y * 45.0 - t * 4.0)) * 0.6 + vn(vec2(q.x * 520.0, q.y * 90.0 - t * 7.0)) * 0.4;
          c.rgb += water * (fl - 0.45) * 0.55;
          // lueurs de l'herbe et des lucioles peintes qui scintillent
          float bright = smoothstep(0.82, 0.95, max(c.r, c.g)) * step(c.b, c.g) * mI;
          c.rgb += bright * 0.25 * pow(0.5 + 0.5 * sin(t * 3.0 + h21(floor(p * 140.0)) * 30.0), 4.0);
          gl_FragColor = vec4(c.rgb, 1.0);
          #include <colorspace_fragment>
        }` });
    this.scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0), mat));
    // calque 2D (fumée, lucioles, oiseaux, villageois)
    this.fx = document.createElement('canvas'); this.fx.className = 'k-fx'; this.stage.insertBefore(this.fx, this.layer); this.g = this.fx.getContext('2d');
    this.parts = [];
    for (let i = 0; i < 46; i++) this.parts.push({ k: 'fly', x: 80 + Math.random() * 900, y: 150 + Math.random() * 850, ph: Math.random() * 6, sp: 0.3 + Math.random() * 0.6 });
    this.birds = Array.from({ length: 7 }, (_, i) => ({ x: Math.random() * IMG_W, y: 90 + Math.random() * 260, sp: 18 + Math.random() * 16, ph: Math.random() * 6, s: 0.7 + Math.random() * 0.5 }));
    this.walkers = PATHS.map((p, i) => ({ a: p[0], b: p[1], u: Math.random(), dir: 1, pause: 0, col: ['#c0392b', '#2e6fb8', '#d9a520', '#3f8a4a'][i], sp: 0.035 + Math.random() * 0.02 }));
    this.smoke = []; this.sparks = [];
    // calque HTML : bâtiments construits + pastilles + zones à toucher
    this.items = {};
    for (const id of BUILD_ORDER) {
      const [x, y, painted] = PSPOTS[id];
      const el = document.createElement('div'); el.className = 'kp-spot' + (painted ? ' painted' : ''); el.style.left = (x / IMG_W * 100) + '%'; el.style.top = (y / IMG_H * 100) + '%';
      el.innerHTML = '<img class="kp-b" alt=""><span class="kp-plot"></span><i class="kp-badge"></i>';
      el.addEventListener('click', e => { e.stopPropagation(); this.onTap(id); });
      this.layer.append(el); this.items[id] = el;
    }
    this.resize(); this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(this.stage);
    this.loop = this.loop.bind(this); this.raf = requestAnimationFrame(this.loop);
  }
  async sync(K) {
    for (const id of BUILD_ORDER) {
      const el = this.items[id], lvl = K.b[id] || 0, job = K.job && K.job.id === id;
      el.classList.toggle('built', lvl > 0); el.classList.toggle('job', !!job);
      if (!PSPOTS[id][2] && lvl > 0) { const url = await buildingPicture(id, lvl); const img = el.querySelector('.kp-b'); if (url && img.src !== url) img.src = url; }
    }
  }
  setBadges(kinds) { for (const id of BUILD_ORDER) { const b = this.items[id].querySelector('.kp-badge'); b.className = 'kp-badge' + (kinds[id] ? ' ' + kinds[id] : ''); } }
  setLabels() {}
  resize() {
    const w = this.stage.clientWidth || 1, h = this.stage.clientHeight || 1;
    this.r.setSize(w, h, false); const d = Math.min(2, devicePixelRatio || 1); this.fx.width = w * d; this.fx.height = h * d; this.fd = d; this.fw = w; this.fh = h;
  }
  loop(now) {
    if (this.dead) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(0.05, (now - this.last) / 1000) : 0; this.last = now; this.t += dt; const t = this.t;
    this.u.t.value = t; this.r.render(this.scene, this.cam);
    const g = this.g, s = this.fw / IMG_W, bob = Math.sin(t * 0.8) * 0.0045 * this.fh;
    g.setTransform(this.fd, 0, 0, this.fd, 0, 0); g.clearRect(0, 0, this.fw, this.fh);
    // fumée de la cheminée du château
    if (Math.random() < dt * 5) this.smoke.push({ x: 568 + (Math.random() - 0.5) * 6, y: 462, life: 0, r: 6 });
    g.globalCompositeOperation = 'source-over';
    for (const p of this.smoke) { p.life += dt; p.y -= dt * 16; p.x += dt * (6 + Math.sin(p.life * 2) * 4); p.r += dt * 7; const a = Math.max(0, 0.45 * (1 - p.life / 4)); g.fillStyle = `rgba(236,232,228,${a})`; g.beginPath(); g.arc(p.x * s, p.y * s + bob, p.r * s, 0, 7); g.fill(); }
    this.smoke = this.smoke.filter(p => p.life < 4);
    // étincelles dorées de la mine
    if (Math.random() < dt * 9) this.sparks.push({ x: 232 + Math.random() * 40, y: 690 + Math.random() * 20, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 25, life: 0 });
    g.globalCompositeOperation = 'lighter';
    for (const p of this.sparks) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 20 * dt; const a = Math.max(0, 1 - p.life / 1.3); g.fillStyle = `rgba(255,210,90,${a})`; g.beginPath(); g.arc(p.x * s, p.y * s + bob, 2.2 * s * 1.6, 0, 7); g.fill(); }
    this.sparks = this.sparks.filter(p => p.life < 1.3);
    // lucioles
    for (const p of this.parts) { const x = p.x + Math.sin(t * p.sp + p.ph) * 14, y = p.y + Math.cos(t * p.sp * 0.8 + p.ph) * 10 - ((t * 6 * p.sp) % 40); const a = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 2.4 + p.ph * 3), 3); const gr = g.createRadialGradient(x * s, y * s, 0, x * s, y * s, 7 * s); gr.addColorStop(0, `rgba(255,236,160,${a})`); gr.addColorStop(1, 'rgba(255,220,120,0)'); g.fillStyle = gr; g.fillRect(x * s - 7 * s, y * s - 7 * s, 14 * s, 14 * s); }
    g.globalCompositeOperation = 'source-over';
    // oiseaux
    g.strokeStyle = 'rgba(40,30,50,.85)'; g.lineWidth = 1.6 * s * 1.5; g.lineCap = 'round';
    for (const b of this.birds) { b.x += b.sp * dt; if (b.x > IMG_W + 30) { b.x = -30; b.y = 90 + Math.random() * 260; } const y = b.y + Math.sin(t * 0.8 + b.ph) * 8, f = Math.sin(t * 9 + b.ph) * 5 * b.s, w = 9 * b.s; g.beginPath(); g.moveTo((b.x - w) * s, (y - f) * s); g.quadraticCurveTo((b.x - w / 2) * s, (y - 3) * s, b.x * s, y * s); g.quadraticCurveTo((b.x + w / 2) * s, (y - 3) * s, (b.x + w) * s, (y - f) * s); g.stroke(); }
    // villageois qui marchent sur les chemins
    for (const v of this.walkers) {
      if (v.pause > 0) v.pause -= dt; else { v.u += v.sp * dt * v.dir; if (v.u > 1 || v.u < 0) { v.dir *= -1; v.u = Math.min(1, Math.max(0, v.u)); v.pause = 1 + Math.random() * 2.5; } }
      const x = (v.a[0] + (v.b[0] - v.a[0]) * v.u) * s, y = (v.a[1] + (v.b[1] - v.a[1]) * v.u) * s + bob, k = s * 1.15, step = v.pause > 0 ? 0 : Math.sin(t * 10);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(x, y, 5 * k, 2 * k, 0, 0, 7); g.fill();
      g.fillStyle = '#3a2a1a'; g.fillRect(x - 3 * k + step * k, y - 6 * k, 2 * k, 6 * k); g.fillRect(x + 1 * k - step * k, y - 6 * k, 2 * k, 6 * k);
      g.fillStyle = v.col; g.beginPath(); g.roundRect(x - 4 * k, y - 14 * k, 8 * k, 9 * k, 2 * k); g.fill();
      g.fillStyle = '#f0c8a0'; g.beginPath(); g.arc(x, y - 17 * k, 3.4 * k, 0, 7); g.fill();
      g.fillStyle = '#6a4a2a'; g.beginPath(); g.arc(x, y - 18.5 * k, 3.6 * k, Math.PI, 0); g.fill();
    }
    // les bâtiments et pastilles suivent la lévitation de l'île
    this.layer.style.transform = `translateY(${bob.toFixed(2)}px)`;
  }
  dispose() {
    this.dead = true; cancelAnimationFrame(this.raf); this.ro.disconnect(); this.fx.remove();
    this.r.dispose(); const rr = this.r; setTimeout(() => { try { rr.forceContextLoss && rr.forceContextLoss(); } catch (e) {} }, 1500);
  }
}
