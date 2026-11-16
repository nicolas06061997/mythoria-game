// MYTHORIA — le « look » des héros et de l'image, inspiré des jeux de stratégie modernes :
// - lumière de contour (rim light) qui détache les héros du décor,
// - contour sombre dessiné autour des personnages (technique de la « coque inversée »),
// - halo lumineux (bloom) sur les sorts, cristaux et armes magiques,
// - étalonnage des couleurs (saturation, contraste, vignette).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// ---------- Lumière de contour (ajoutée au matériau standard) ----------
export function addRim(mat, color = '#ffffff', strength = 0.55, power = 2.6) {
  mat.userData.rim = { color: { value: new THREE.Color(color) }, k: { value: strength }, p: { value: power } };
  const det = !!mat.userData.detail;
  mat.onBeforeCompile = sh => {
    sh.uniforms.rimColor = mat.userData.rim.color; sh.uniforms.rimK = mat.userData.rim.k; sh.uniforms.rimP = mat.userData.rim.p;
    sh.fragmentShader = 'uniform vec3 rimColor; uniform float rimK; uniform float rimP;\n' + sh.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>
       float rimF = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), rimP);
       totalEmissiveRadiance += rimColor * rimF * rimK;`);
    if (det) { // détails réalistes (16/11) : grain du cuir / tissu, métal usé et rayé (bruit dans l'espace de l'objet)
      sh.vertexShader = 'varying vec3 vOP;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vOP = position;');
      sh.fragmentShader = `varying vec3 vOP;
        float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vn(vec3 p) { vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
        ` + sh.fragmentShader.replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
        float dn1 = vn(vOP * 18.0), dn2 = vn(vOP * 70.0), dn3 = vn(vOP * 160.0);
        float scr = smoothstep(0.86, 0.99, vn(vOP * vec3(140.0, 9.0, 140.0))) * metalnessFactor;
        float grain = (dn1 - 0.5) * 0.16 + (dn2 - 0.5) * 0.12 + (dn3 - 0.5) * 0.08 * (1.0 - metalnessFactor);
        diffuseColor.rgb *= 1.0 + grain + scr * 0.35;
        roughnessFactor = clamp(roughnessFactor + (dn2 - 0.5) * 0.3 - scr * 0.25 + (1.0 - dn1) * 0.08, 0.08, 1.0);`);
    }
  };
  mat.customProgramCacheKey = () => det ? 'rimd' : 'rim';
  mat.needsUpdate = true;
}
export function setRim(mat, color, k) { const r = mat.userData.rim; if (!r) return; if (color) r.color.value.set(color); if (k !== undefined) r.k.value = k; }

// ---------- Contour (coque inversée, marche aussi sur les personnages animés) ----------
const OUTLINE_MATS = new Map();
function outlineMat(color, thick) {
  const key = color + ':' + thick.toFixed(4);
  if (OUTLINE_MATS.has(key)) return OUTLINE_MATS.get(key);
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide }); m.userData.isOutlineMat = true;
  // épaisseur en « uniform » : tous les contours partagent le même programme (pas de recompilation = pas de saccade)
  m.userData.olT = { value: thick };
  m.onBeforeCompile = sh => { sh.uniforms.olT = m.userData.olT; sh.vertexShader = 'uniform float olT;\n' + sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = vec3(position) + normal * olT;'); };
  m.customProgramCacheKey = () => 'ol';
  OUTLINE_MATS.set(key, m);
  return m;
}
// worldThick : épaisseur voulue en unités du monde (≈ cases).
export function addOutline(root, worldThick = 0.028, color = '#1a1026') {
  root.updateMatrixWorld(true);
  const list = [];
  root.traverse(o => { if (o.isMesh && !o.userData.noOutline && !o.userData.isOutline && o.material && !o.material.transparent) list.push(o); });
  const ws = new THREE.Vector3();
  for (const o of list) {
    o.getWorldScale(ws);
    const local = worldThick / Math.max(1e-4, (ws.x + ws.y + ws.z) / 3);
    let ol;
    if (o.isSkinnedMesh) { ol = new THREE.SkinnedMesh(o.geometry, outlineMat(color, local)); ol.bind(o.skeleton, o.bindMatrix); }
    else ol = new THREE.Mesh(o.geometry, outlineMat(color, local));
    ol.userData.isOutline = true; ol.castShadow = false; ol.frustumCulled = o.frustumCulled;
    ol.position.copy(o.position); ol.quaternion.copy(o.quaternion); ol.scale.copy(o.scale);
    ol.onBeforeRender = () => { ol.visible = o.visible; };
    o.parent.add(ol);
    // suit les objets animés par le code (créatures)
    ol.userData.src = o;
  }
}
export function syncOutlines(root) {
  root.traverse(o => { if (o.userData.isOutline && o.userData.src && !o.isSkinnedMesh) { const s = o.userData.src; o.position.copy(s.position); o.quaternion.copy(s.quaternion); o.scale.copy(s.scale); o.visible = s.visible; } });
}

// ---------- Étalonnage final ----------
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, sat: { value: 1.12 }, con: { value: 1.06 }, vig: { value: 0.32 }, warm: { value: new THREE.Vector3(1.02, 1.0, 0.98) } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; uniform float sat; uniform float con; uniform float vig; uniform vec3 warm; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = c.rgb * warm;
      float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, sat); col = (col - 0.5) * con + 0.5;
      float d = distance(vUv, vec2(0.5, 0.45)); col *= 1.0 - vig * smoothstep(0.35, 0.85, d);
      gl_FragColor = vec4(clamp(col, 0.0, 1.0), c.a); }`,
};

// Chaîne d'image : rendu → bloom → tons → étalonnage. bloom=false sur les petits téléphones.
export function createComposer(renderer, scene, camera, { bloom = true, strength = 0.6, threshold = 0.78, radius = 0.55, samples = 4, under = null } = {}) {
  const size = renderer.getSize(new THREE.Vector2()), pr = renderer.getPixelRatio();
  // cible de rendu avec lissage des contours (MSAA) : sans ça, l'image passe en « escaliers »
  const rt = new THREE.WebGLRenderTarget(Math.max(1, size.x * pr), Math.max(1, size.y * pr), { type: THREE.HalfFloatType, samples: renderer.capabilities.isWebGL2 ? samples : 0 });
  const comp = new EffectComposer(renderer, rt);
  if (under) comp.addPass(new RenderPass(under.scene, under.camera)); // décor peint dessiné d'abord
  const main = new RenderPass(scene, camera); if (under) { main.clear = false; main.clearDepth = true; } comp.addPass(main);
  let bp = null;
  if (bloom) { bp = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), strength, radius, threshold); comp.addPass(bp); }
  comp.addPass(new OutputPass());
  const grade = new ShaderPass(GradeShader); comp.addPass(grade);
  return {
    comp, grade, bloom: bp,
    setSize(w, h) { comp.setPixelRatio(renderer.getPixelRatio()); comp.setSize(w, h); if (bp) bp.resolution.set(w / 2, h / 2); },
    render() { comp.render(); },
    dispose() { comp.dispose && comp.dispose(); },
  };
}

// ---------- Ombre de contact (tache douce sous les pieds) ----------
let BLOB = null;
export function blobShadow(size = 1) {
  if (!BLOB) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    BLOB = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: BLOB, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.scale.setScalar(size); m.renderOrder = 1; m.userData.noOutline = true;
  return m;
}
