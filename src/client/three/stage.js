// MYTHORIA — création du moteur de rendu WebGL avec des réglages adaptés aux téléphones.
import * as THREE from 'three';

export function quality() {
  const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  const low = mobile && (cores <= 4 || mem <= 2);
  // image plus nette : jusqu'à 2× la résolution (1,5× sur les petits téléphones)
  return { mobile, low, dpr: Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2) };
}

export function createRenderer(canvas, { alpha = false } = {}) {
  const q = quality();
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, powerPreference: 'high-performance' });
  r.setPixelRatio(q.dpr);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.0;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  return r;
}

export function webglOk() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
