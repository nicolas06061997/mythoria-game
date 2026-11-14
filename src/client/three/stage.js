// MYTHORIA — moteur de rendu WebGL + niveaux de graphismes (réglables dans Réglages → Graphismes).
import * as THREE from 'three';

// Les niveaux, du plus léger au plus beau.
export const GFX_LEVELS = [
  { id: 'auto', name: 'Auto', desc: 'Le jeu choisit le plus beau réglage que ton téléphone supporte, et baisse tout seul si ça rame.' },
  { id: 'eco', name: 'Économie', desc: 'Pour les vieux téléphones : pas d’ombres ni de lueurs, batterie préservée.' },
  { id: 'moyen', name: 'Moyen', desc: 'Ombres et lueurs, résolution 1,5×.' },
  { id: 'haut', name: 'Haut', desc: 'Résolution 2×, ombres fines, contours lisses, décor complet.' },
  { id: 'ultra', name: 'Ultra 4K', desc: 'Pleine résolution de l’écran (jusqu’à 3×), ombres très fines. Pour les téléphones puissants.' },
];
const PRESET = {
  eco:   { dpr: 1,   antialias: false, shadows: false, shadowSize: 512,  bloom: false, msaa: 0, low: true,  lite: true,  fx: 0.5 },
  moyen: { dpr: 1.5, antialias: true,  shadows: true,  shadowSize: 1024, bloom: true,  msaa: 2, low: true,  lite: false, fx: 0.8 },
  haut:  { dpr: 2,   antialias: true,  shadows: true,  shadowSize: 2048, bloom: true,  msaa: 4, low: false, lite: false, fx: 1 },
  ultra: { dpr: 3,   antialias: true,  shadows: true,  shadowSize: 4096, bloom: true,  msaa: 4, low: false, lite: false, fx: 1.3 },
};
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; };
export const gfxChoice = () => (PRESET[ls('myt_gfx')] ? ls('myt_gfx') : 'auto');
export const setGfx = id => ls('myt_gfx', id);
export const showFps = () => ls('myt_fps') === '1';
export const setShowFps = on => ls('myt_fps', on ? '1' : '0');

// Réglage choisi automatiquement : le plus beau possible selon le téléphone.
export function autoLevel() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (mobile && (cores <= 4 || mem <= 2)) return 'moyen';
  if (mobile && cores >= 8 && mem >= 8) return 'ultra';
  return mobile ? 'haut' : 'ultra';
}

export function quality() {
  const choice = gfxChoice(), level = choice === 'auto' ? autoLevel() : choice, P = PRESET[level];
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  return { ...P, mobile, choice, level, auto: choice === 'auto', dpr: Math.max(1, Math.min(window.devicePixelRatio || 1, P.dpr)) };
}

export function createRenderer(canvas, { alpha = false } = {}) {
  const q = quality();
  const r = new THREE.WebGLRenderer({ canvas, antialias: q.antialias, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(q.dpr);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = q.shadows;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

// Compteur d'images/seconde + baisse automatique de la résolution si ça rame (mode Auto).
export class PerfWatch {
  constructor(renderer, onChange, host) {
    this.r = renderer; this.onChange = onChange; this.q = quality();
    this.n = 0; this.acc = 0; this.slow = 0; this.fps = 60;
    if (showFps() && host) { this.el = document.createElement('div'); this.el.className = 'fps'; host.append(this.el); }
  }
  tick(dt) {
    this.n++; this.acc += dt;
    if (this.acc < 1) return;
    this.fps = this.n / this.acc; this.n = 0; this.acc = 0;
    if (this.el) this.el.textContent = Math.round(this.fps) + ' FPS · ' + this.q.level + ' · ' + this.r.getPixelRatio().toFixed(2) + '×';
    if (!this.q.auto) return;
    this.slow = this.fps < 28 ? this.slow + 1 : Math.max(0, this.slow - 1);
    if (this.slow >= 3 && this.r.getPixelRatio() > 1.01) { this.slow = 0; this.r.setPixelRatio(Math.max(1, this.r.getPixelRatio() - 0.25)); this.onChange && this.onChange(); }
  }
  dispose() { this.el && this.el.remove(); }
}

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
