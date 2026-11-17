// MYTHORIA — tutoriel guidé du tout premier combat (D-20261116-3, accepté par le propriétaire le 16/11).
// Entraînement contre l'IA la plus facile ; Vael explique 5 gestes, une flèche dorée montre quoi toucher,
// chaque étape attend que le joueur le fasse (ou « Passer »). Une seule fois (localStorage myt_tuto), à revoir dans Réglages.
import { h } from './ui/dom.js';
import { HEART } from '../shared/sim.js';

export const TUTO_KEY = 'myt_tuto';
export const tutoDone = () => { try { return localStorage.getItem(TUTO_KEY) === '1'; } catch (e) { return true; } };
const markDone = () => { try { localStorage.setItem(TUTO_KEY, '1'); } catch (e) {} };

// done(P, s, base) : vrai quand le joueur a fait le geste DEPUIS le début de l'étape (base = compteurs à ce moment). at(b) : point visé à l'écran (pixels) ou null.
const STEPS = [
  { t: 'Bienvenue, Gardien ! Touche « Invoquer » : un héros apparaît sur un socle de ton Cercle. Ça coûte 2 éther (les losanges violets).',
    at: b => b.rectOf(b.elSummon), done: (P, s, B) => P.summons > B.summons },
  { t: 'Touche ton héros sur son socle, puis touche la zone bleue de l’île : il part au combat.',
    at: b => { const i = b.s.players[b.me].bench.findIndex(Boolean); return i >= 0 ? b.view.benchScreen(i) : null; }, done: (P, s, B) => P.deployed > B.deployed },
  { t: 'Deux héros identiques (même étoile) se fusionnent en un héros ★★ plus fort : invoque encore, puis touche l’un et l’autre.',
    at: b => b.rectOf(b.elSummon), done: (P, s, B) => P.fuses > B.fuses, skipAfter: 25 },
  { t: 'Le Cœur de Mythe, au centre : envoie un héros qui marche (pas un volant) dessus pour le capturer. Il remplit ton éther et ton Éveil plus vite.',
    at: b => b.view.screenOf(HEART.x, HEART.y, 0), done: (P, s, B) => P.hearts > B.hearts || s.heart.owner === 0, skipAfter: 40 },
  { t: 'Ton sortilège est prêt ! Touche-le, puis touche l’endroit de l’île où le lancer.',
    at: b => b.rectOf(b.elSpell), done: (P, s, B) => P.spells > B.spells, start: (P) => { P.eveil = Math.max(P.eveil, 100); } },
];

export class Tuto {
  constructor(battle) {
    this.b = battle; this.i = -1; this.t = 0; this.over = false;
    this.el = h('div', { class: 'tuto' },
      this.arrow = h('div', { class: 'tu-arrow' }),
      this.box = h('div', { class: 'tu-box' },
        h('div', { class: 'tu-who' }, h('b', {}, 'Vael'), this.count = h('small', {}, '')),
        this.txt = h('p', {}, ''),
        h('div', { class: 'tu-btns' },
          this.next = h('button', { class: 'tu-skip', onclick: () => this.go(this.i + 1) }, 'Étape suivante'),
          h('button', { class: 'tu-skip', onclick: () => this.end(true) }, 'Passer le tutoriel'))));
    battle.el.append(this.el);
    this.go(0);
  }
  // l'IA attend que les 2 premiers gestes soient appris
  get holdBot() { return !this.over && this.i < 2; }
  go(i) {
    if (i >= STEPS.length) return this.end(false);
    this.i = i; this.t = 0; const S = STEPS[i];
    const P0 = this.b.s.players[this.b.me];
    this.base = { summons: P0.summons, deployed: P0.deployed, fuses: P0.fuses, hearts: P0.hearts, spells: P0.spells, owner: this.b.s.heart.owner };
    if (S.start) S.start(P0, this.b.s);
    this.txt.textContent = S.t; this.count.textContent = 'Étape ' + (i + 1) + ' / ' + STEPS.length;
    this.next.style.display = S.skipAfter ? 'none' : '';
    this.box.classList.remove('pop'); void this.box.offsetWidth; this.box.classList.add('pop');
  }
  end(skipped) {
    if (this.over) return; this.over = true; markDone();
    this.arrow.style.display = 'none';
    this.count.textContent = '';
    this.txt.textContent = skipped ? 'D’accord ! Tu pourras revoir le tutoriel dans les Réglages.' : 'Bravo, tu connais l’essentiel ! Détruis le Sanctuaire ennemi, ou garde le tien le moins abîmé jusqu’à la fin du temps.';
    this.box.querySelector('.tu-btns').style.display = 'none';
    setTimeout(() => this.el.remove(), skipped ? 2500 : 6000);
  }
  // appelé à chaque image par le combat
  update(dt) {
    if (this.over || this.i < 0) return;
    const S = STEPS[this.i], P = this.b.s.players[this.b.me];
    this.t += dt;
    if (S.done(P, this.b.s, this.base)) return this.go(this.i + 1);
    if (S.skipAfter && this.t > S.skipAfter) this.next.style.display = '';
    const p = this.b.started ? S.at(this.b) : null;
    if (p) { this.arrow.style.display = ''; this.arrow.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px)`; }
    else this.arrow.style.display = 'none';
  }
}
