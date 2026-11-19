// MYTHORIA — sons synthétisés (Web Audio) : aucun fichier audio à télécharger.
let ac = null, enabled = true, last = {}, sfxOut = null, musOut = null;
// Volumes (Réglages, D-20261117-1) : musique et bruitages séparés, gardés sur le téléphone.
const VOL_KEY = 'myt_vol';
let VOL = { m: 0.55, s: 1 };
try { const v = JSON.parse(localStorage.getItem(VOL_KEY) || 'null'); if (v && typeof v.m === 'number') VOL = { m: v.m, s: typeof v.s === 'number' ? v.s : 1 }; } catch (e) {}
export const getVolumes = () => ({ ...VOL });
export function setVolumes(m, s) {
  VOL = { m: Math.max(0, Math.min(1, m)), s: Math.max(0, Math.min(1, s)) };
  try { localStorage.setItem(VOL_KEY, JSON.stringify(VOL)); } catch (e) {}
  applyVol();
}
function applyVol() {
  if (!ac) return;
  const on = enabled ? 1 : 0, t = ac.currentTime;
  sfxOut && sfxOut.gain.setTargetAtTime(VOL.s * on, t, 0.05);
  musOut && musOut.gain.setTargetAtTime(VOL.m * 0.32 * on, t, 0.3);
}

export function setSound(on) { enabled = on; applyVol(); }
export function unlockAudio() {
  if (!ac) {
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; }
    if (ac) {
      sfxOut = ac.createGain(); sfxOut.connect(ac.destination);
      musOut = ac.createGain(); musOut.gain.value = 0; musOut.connect(ac.destination);
      applyVol();
    }
  }
  if (ac && ac.state === 'suspended') ac.resume();
  if (ac && MUS.want && !MUS.timer) startLoop();
}

function tone(f, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxOut || ac.destination); o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur, vol = 0.2, freq = 800, delay = 0) {
  if (!ac || !enabled) return;
  const t = ac.currentTime + delay, n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = 'lowpass'; f.frequency.value = freq; g.gain.value = vol;
  s.connect(f).connect(g).connect(sfxOut || ac.destination); s.start(t);
}

const SFX = {
  click: () => tone(660, 0.06, 'triangle', 0.08),
  deploy: () => { tone(300, 0.15, 'triangle', 0.12, 1.8); noise(0.12, 0.08, 1500); },
  hit: () => noise(0.05, 0.06, 900),
  arrow: () => tone(1200, 0.05, 'square', 0.025, 0.5),
  boom: () => { noise(0.35, 0.3, 500); tone(110, 0.3, 'sine', 0.2, 0.4); },
  tower: () => { noise(0.8, 0.4, 350); tone(80, 0.7, 'sawtooth', 0.12, 0.3); },
  spell: () => { tone(880, 0.25, 'sine', 0.1, 1.5); tone(1320, 0.25, 'sine', 0.06, 1.5, 0.05); },
  freeze: () => { for (let i = 0; i < 5; i++) tone(1500 + i * 300, 0.12, 'sine', 0.05, 1, i * 0.04); },
  heal: () => { tone(523, 0.3, 'sine', 0.08); tone(784, 0.3, 'sine', 0.08, 1, 0.08); },
  zap: () => { noise(0.15, 0.12, 4000); tone(1800, 0.12, 'sawtooth', 0.05, 0.3); },
  fuse: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.18, 'triangle', 0.1, 1, i * 0.07)); },
  summon: () => { tone(392, 0.18, 'triangle', 0.08, 2); tone(784, 0.3, 'sine', 0.07, 1.5, 0.08); noise(0.2, 0.05, 3000, 0.05); },
  reject: () => tone(180, 0.15, 'square', 0.06),
  tick: () => tone(880, 0.08, 'square', 0.06),
  go: () => { tone(523, 0.12, 'square', 0.08); tone(1046, 0.3, 'square', 0.08, 1, 0.1); },
  win: () => { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, 1, i * 0.12)); },
  lose: () => { [392, 349, 311, 262].forEach((f, i) => tone(f, 0.4, 'triangle', 0.1, 1, i * 0.18)); },
  coin: () => { tone(988, 0.08, 'square', 0.05); tone(1318, 0.15, 'square', 0.05, 1, 0.07); },
};

export function sfx(name, gap = 0) {
  if (!ac || !enabled || !SFX[name]) return;
  const now = performance.now();
  if (gap && last[name] && now - last[name] < gap) return;
  last[name] = now;
  try { SFX[name](); } catch (e) {}
}

// ---------- Musiques d'ambiance (D-20261117-1) : fabriquées en direct, aucun fichier ----------
// Une ambiance douce pour les menus, une par monde en combat ; setMusicIntensity(1) = dernière minute / Éther ×2 (plus vite, percussions).
const N = n => 440 * Math.pow(2, (n - 69) / 12); // numéro de note MIDI → fréquence
// prog = accords (notes MIDI) ; arp = motif d'arpège (indices dans l'accord, -1 = silence) ; pad/lead = formes d'onde
const THEMES = {
  menu:   { bpm: 64, prog: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 66], [52, 55, 59, 62]], arp: [0, 2, 3, 2, 1, 2, 3, -1], pad: 'sine', lead: 'triangle', bass: 0.5 },
  aurore: { bpm: 92, prog: [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 67]], arp: [0, 1, 2, 3, 2, 1, 2, 3], pad: 'triangle', lead: 'triangle', bass: 0.7 },
  sylve:  { bpm: 84, prog: [[62, 65, 69, 72], [58, 62, 65, 69], [60, 64, 67, 72], [57, 60, 64, 69]], arp: [0, 2, 1, 3, 0, 2, 3, -1], pad: 'sine', lead: 'sine', bass: 0.6 },
  arcane: { bpm: 88, prog: [[59, 62, 66, 69], [55, 59, 62, 66], [57, 61, 64, 69], [54, 57, 61, 64]], arp: [3, 2, 1, 0, 1, 2, 3, 2], pad: 'sine', lead: 'square', bass: 0.6 },
  braise: { bpm: 104, prog: [[52, 55, 59, 62], [48, 52, 55, 59], [50, 53, 57, 60], [47, 50, 54, 57]], arp: [0, 0, 2, 1, 0, 3, 2, 1], pad: 'sawtooth', lead: 'square', bass: 0.9 },
  givre:  { bpm: 76, prog: [[64, 67, 71, 74], [60, 64, 67, 71], [62, 65, 69, 72], [59, 62, 66, 69]], arp: [0, 3, 1, 3, 2, 3, 1, -1], pad: 'sine', lead: 'triangle', bass: 0.5 },
  ombres: { bpm: 80, prog: [[50, 53, 57, 60], [46, 50, 53, 57], [48, 51, 55, 58], [45, 48, 52, 55]], arp: [0, 1, 0, 2, 0, 3, 2, -1], pad: 'sawtooth', lead: 'triangle', bass: 0.9 },
};
const MUS = { want: null, theme: null, timer: 0, step: 0, next: 0, k: 0 };
function mnote(f, t, dur, type, vol) {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musOut); o.start(t); o.stop(t + dur + 0.05);
}
function mhat(t, vol) {
  const n = Math.floor(ac.sampleRate * 0.05), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  s.buffer = b; f.type = 'highpass'; f.frequency.value = 6000; g.gain.value = vol; s.connect(f).connect(g).connect(musOut); s.start(t);
}
function schedule() {
  if (!ac || !MUS.theme) return;
  const T = THEMES[MUS.theme], spb = 60 / (T.bpm * (1 + 0.22 * MUS.k)) / 2; // croches
  while (MUS.next < ac.currentTime + 0.25) {
    const t = MUS.next, st = MUS.step, bar = Math.floor(st / 8) % T.prog.length, ch = T.prog[bar], i = st % 8;
    if (i === 0) { // nouvel accord : nappe + basse
      ch.forEach(n => mnote(N(n), t, spb * 8.4, T.pad, T.pad === 'sawtooth' ? 0.035 : 0.06));
      mnote(N(ch[0] - 12), t, spb * 7.5, 'sine', 0.16 * T.bass);
    }
    if (i === 4 && MUS.k) mnote(N(ch[0] - 12), t, spb * 3.5, 'sine', 0.12 * T.bass);
    const a = T.arp[i]; if (a >= 0) mnote(N(ch[a] + 12), t, spb * 1.6, T.lead, T.lead === 'square' ? 0.025 : 0.05);
    if (MUS.k && i % 2 === 0) mhat(t, 0.05);
    MUS.step++; MUS.next += spb;
  }
}
function startLoop() {
  MUS.theme = MUS.want; MUS.step = 0; MUS.next = ac.currentTime + 0.1;
  clearInterval(MUS.timer); MUS.timer = setInterval(schedule, 100);
}
// change d'ambiance en fondu (rien ne se passe tant que le joueur n'a pas touché l'écran : règle des navigateurs)
export function playMusic(theme) {
  if (!THEMES[theme]) theme = 'menu';
  if (MUS.want === theme && MUS.timer) return;
  MUS.want = theme; MUS.k = 0;
  if (!ac) return;
  if (!MUS.timer) return startLoop();
  const t = ac.currentTime; musOut.gain.setTargetAtTime(0, t, 0.25);
  setTimeout(() => { if (MUS.want !== theme) return; startLoop(); applyVol(); }, 700);
}
export function setMusicIntensity(k) { MUS.k = k ? 1 : 0; }
export function stopMusic() { MUS.want = null; clearInterval(MUS.timer); MUS.timer = 0; MUS.theme = null; }
