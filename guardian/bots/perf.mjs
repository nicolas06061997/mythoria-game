// MYTHORIA GUARDIAN — bot « Traqueur de Performances ».
// S'injecte dans la page : FPS (requestAnimationFrame), mémoire JavaScript (JS Heap), poids des fichiers chargés.
// Important : les machines de test n'ont pas de carte graphique (rendu logiciel, 3-4 FPS normal). Le seuil de
// 30 FPS n'est appliqué que si une vraie carte graphique est détectée ; sinon seul l'effondrement compte.
export const PERF = { fpsGpu: 30, fpsSoft: 2, heapMo: 700, heapGrowthMo: 250, imageKo: 500, legacyKo: 200, totalMo: 60 };

export const gpuInfo = page => page.evaluate(() => {
  try { const gl = document.createElement('canvas').getContext('webgl'); const x = gl.getExtension('WEBGL_debug_renderer_info');
    const r = x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); return { renderer: String(r), software: /swiftshader|llvmpipe|software|basic render/i.test(String(r)) };
  } catch (e) { return { renderer: 'inconnu', software: true }; }
});

// FPS pendant `ms` : moyenne, pire seconde (1 % low simplifié = image la plus longue).
export const sampleFps = (page, ms) => page.evaluate(ms => new Promise(res => {
  const t0 = performance.now(); let last = t0, n = 0, worst = 0;
  const f = t => { n++; worst = Math.max(worst, t - last); last = t; if (t - t0 < ms) requestAnimationFrame(f); else res({ fps: Math.round(n * 10000 / (t - t0)) / 10, pireImageMs: Math.round(worst) }); };
  requestAnimationFrame(f);
}), ms);

export const heapMo = page => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null).catch(() => null);

// Poids des fichiers réellement téléchargés depuis l'ouverture de la page.
export const assets = page => page.evaluate(() => {
  const L = performance.getEntriesByType('resource').map(e => ({ url: e.name.split('?')[0], ko: Math.round((e.encodedBodySize || e.transferSize || 0) / 1024) })).filter(e => e.ko > 0);
  const seen = new Set(), list = L.filter(e => !seen.has(e.url) && seen.add(e.url));
  const short = u => { try { return new URL(u).pathname.split('/').slice(-3).join('/'); } catch (e) { return u; } };
  return { fichiers: list.length, totalKo: list.reduce((a, e) => a + e.ko, 0), images: list.filter(e => /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(e.url)).map(e => ({ f: short(e.url), ko: e.ko })).sort((a, b) => b.ko - a.ko) };
}).catch(() => null);

// Transforme les mesures d'un appareil en alertes lisibles.
export function perfFindings({ gpu, fps = {}, heap = [], files }) {
  const out = [], seuil = gpu && !gpu.software ? PERF.fpsGpu : PERF.fpsSoft;
  const lents = Object.entries(fps).filter(([, v]) => v != null && v < seuil);
  if (lents.length) out.push({ title: 'Jeu saccadé', detail: `Sous ${seuil} FPS (${gpu && !gpu.software ? 'avec carte graphique' : 'sans carte graphique : effondrement'}) : ` + lents.map(([k, v]) => `${k} ${v} FPS`).join(', ') + '.' });
  const hs = heap.filter(h => h.mo != null);
  if (hs.length) {
    const max = hs.reduce((a, b) => (b.mo > a.mo ? b : a)), growth = hs[hs.length - 1].mo - hs[0].mo;
    if (max.mo > PERF.heapMo) out.push({ title: 'Mémoire très élevée', detail: `${max.mo} Mo de mémoire JavaScript à l'étape « ${max.step} » (seuil ${PERF.heapMo} Mo).` });
    else if (growth > PERF.heapGrowthMo) out.push({ title: 'La mémoire grimpe pendant le parcours', detail: `De ${hs[0].mo} Mo à ${hs[hs.length - 1].mo} Mo entre le début et la fin (fuite possible).` });
  }
  if (files) {
    const lourdes = files.images.filter(i => i.ko > PERF.imageKo || (/\.(png|jpe?g)$/i.test(i.f) && i.ko > PERF.legacyKo));
    if (lourdes.length) out.push({ title: 'Images trop lourdes', detail: `${lourdes.length} image(s) à compresser (plus de ${PERF.imageKo} Ko, ou PNG/JPEG de plus de ${PERF.legacyKo} Ko) : ` + lourdes.slice(0, 5).map(i => `${i.f} ${i.ko} Ko`).join(', ') + (lourdes.length > 5 ? '…' : '') + '.' });
    if (files.totalKo / 1024 > PERF.totalMo) out.push({ title: 'Jeu lourd à télécharger', detail: `${Math.round(files.totalKo / 1024)} Mo téléchargés pendant le parcours (seuil ${PERF.totalMo} Mo).` });
  }
  return out;
}
