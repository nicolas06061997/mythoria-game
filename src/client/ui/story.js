// MYTHORIA — petites histoires qui expliquent chaque mode la première fois (raconte Vael l'Archimage).
// story(id, ensuite) : montre l'histoire si elle n'a jamais été vue, puis lance « ensuite ».
import { h } from './dom.js';
import { portrait } from '../three/showcase.js';
import { sfx } from '../audio.js';

const STORIES = {
  arene: { title: 'L’Arène des Failles', pages: [
    { t: 'Il y a longtemps, le Cœur de Mythe gardait les six royaumes en paix. Un jour, il s’est brisé : des Failles se sont ouvertes partout, et les héros de chaque monde se disputent maintenant ses éclats.' },
    { t: 'Dans l’Arène, deux Sanctuaires s’affrontent. Le tien est en bas (bleu), celui de l’adversaire en haut (rouge).', steps: ['Invoque des héros (2 éther) : ils arrivent sur ton Cercle, en bas.', 'Touche un héros, puis touche l’île : il part se battre tout seul.', 'Pose un héros sur un héros identique : ils fusionnent et deviennent bien plus forts.'] },
    { t: 'Pourquoi te battre ? Chaque victoire rapporte de la Gloire : elle ouvre de nouveaux mondes et de nouveaux héros, plus rares et plus puissants. Tu arraches aussi des Éclats de Faille, à purifier à l’Autel de ton Royaume, et ta jauge de conquête se remplit.', goal: 'Détruis le Sanctuaire rouge, ou garde le plus de vie au bout de 3 minutes.' },
  ] },
  royaume: { title: 'Ton Royaume', pages: [
    { t: 'Quand les Failles se sont ouvertes, ton peuple a fui sur cette petite île qui flotte au-dessus des nuages. C’est tout ce qu’il reste de ton royaume… pour l’instant.' },
    { t: 'Reconstruis-le, bâtiment par bâtiment. Ils travaillent pour toi même quand tu ne joues pas.', steps: ['Mine d’or et Carrière : produisent de l’or et de la pierre. Reviens appuyer sur « Récolter ».', 'Touche un emplacement « + » pour construire, ou un bâtiment pour l’améliorer.', 'Le Château décide du niveau maximum des autres bâtiments : améliore-le en premier.'] },
    { t: 'Pourquoi c’est utile ? Ton Royaume rend tes héros plus forts : l’Académie permet de monter leur niveau, la Caserne leur donne plus de vie, les Tours rendent ton Sanctuaire plus redoutable, le Marché te fait gagner plus d’or.', goal: 'Récolte souvent, construis, et ton armée grandira avec ton Royaume.' },
  ] },
  campagne: { title: 'La Campagne', pages: [
    { t: 'Six seigneurs maléfiques se sont emparés d’éclats du Cœur de Mythe, un par royaume. Tant qu’ils les gardent, les Failles restent ouvertes.' },
    { t: 'Traverse les mondes un par un : 5 étapes par chapitre, et un boss à la fin de chaque chapitre.', steps: ['Gagne une étape pour débloquer la suivante.', 'Les boss sont énormes et ont des pouvoirs : fais fusionner tes héros pour les vaincre.', 'Les bâtiments de ton Royaume t’aident ici (Caserne, Tours, Temple).'] },
    { t: 'Chaque première victoire donne une belle récompense, et chaque boss vaincu rapproche Mythoria de la paix.', goal: 'Bats les 6 boss pour refermer les Failles.' },
  ] },
  survie: { title: 'Survie · Défense du Royaume', pages: [
    { t: 'Les nuits sans lune, des monstres sortent des Failles et foncent droit vers ton Sanctuaire. Personne ne viendra t’aider : ce soir, c’est toi le rempart.' },
    { t: 'Les vagues arrivent de plus en plus fortes, avec un boss toutes les 5 vagues.', steps: ['Invoque et fusionne tes héros comme dans l’Arène.', 'Garde des héros près de ton Sanctuaire pour le protéger.', 'Utilise ton sortilège quand beaucoup de monstres sont groupés.'] },
    { t: 'Plus tu tiens longtemps, plus la récompense est grande (or, cristaux, gemmes à partir de la vague 10).', goal: 'Bats ton record de vagues !' },
  ] },
  heros: { title: 'Le Mode Héros', pages: [
    { t: 'Parfois, un seul héros doit tenir la Faille pendant que les autres se reposent. Aujourd’hui, c’est toi qui le diriges toi-même.' },
    { t: 'Choisis ton héros préféré : son niveau compte.', steps: ['Glisse le doigt à gauche de l’écran pour te déplacer.', 'Bouton Attaque à droite pour frapper les monstres proches.', 'Quand le cercle Super est plein, déclenche ta super attaque.', 'Ramasse les orbes vertes pour te soigner.'] },
    { t: 'Chaque vague vaincue rapporte de l’or, et des cristaux à partir de la vague 5.', goal: 'Survis le plus longtemps possible.' },
  ] },
  evenement: { title: 'Les Événements', pages: [
    { t: 'Chaque semaine, la magie des Failles devient folle : les règles du combat changent (éther qui coule à flots, héros qui arrivent en ★2, pluie de sortilèges…).' },
    { t: 'Lis bien la règle de la semaine, puis adapte ton deck.', steps: ['Gagne des combats pendant l’événement.', 'Tu as quelques récompenses par jour.'], goal: 'Profite de la règle spéciale pour gagner des récompenses en plus.' },
  ] },
  tournoi: { title: 'Le Tournoi', pages: [
    { t: 'Les champions des six royaumes se retrouvent pour le grand Tournoi. Les adversaires sont des IA (jamais de faux joueurs).' },
    { t: '3 manches, de plus en plus dures.', steps: ['Gagne une manche pour passer à la suivante.', 'Une défaite et tu recommences à la manche 1.'], goal: 'Gagne les 3 manches d’affilée pour remporter le Tournoi et sa grosse récompense.' },
  ] },
};

const seen = () => { try { return JSON.parse(localStorage.getItem('myt_seen') || '{}'); } catch (e) { return {}; } };
const markSeen = id => { try { const s = seen(); s[id] = 1; localStorage.setItem('myt_seen', JSON.stringify(s)); } catch (e) {} };

export function story(id, then, force = false) {
  const S = STORIES[id];
  if (!S || (!force && seen()[id])) { then && then(); return; }
  let k = 0;
  const img = h('img', { class: 'st-img', alt: '' }); portrait('vael').then(u => { if (u) img.src = u; }).catch(() => {});
  const body = h('div', { class: 'st-body' }), dots = h('div', { class: 'st-dots' }), next = h('button', { class: 'btn big gold' }, 'Suivant');
  const box = h('div', { class: 'story' },
    h('div', { class: 'st-card' },
      h('div', { class: 'st-top' }, h('div', { class: 'st-av' }, img), h('div', {}, h('small', {}, 'Vael l’Archimage raconte…'), h('h3', {}, S.title))),
      body, dots,
      h('div', { class: 'st-btns' }, h('button', { class: 'btn ghost', onclick: () => close() }, 'Passer'), next)));
  const close = () => { markSeen(id); box.classList.add('off'); setTimeout(() => box.remove(), 300); then && then(); };
  const show = () => {
    const pg = S.pages[k];
    body.replaceChildren(...[h('p', { class: 'st-t' }, pg.t),
      pg.steps ? h('ol', { class: 'st-steps' }, pg.steps.map(s => h('li', {}, s))) : null,
      pg.goal ? h('div', { class: 'st-goal' }, '🎯 ', pg.goal) : null].filter(Boolean));
    body.classList.remove('in'); void body.offsetWidth; body.classList.add('in');
    dots.replaceChildren(...S.pages.map((_, i) => h('i', { class: i === k ? 'on' : '' })));
    next.textContent = k === S.pages.length - 1 ? 'C’est parti !' : 'Suivant';
  };
  next.onclick = () => { sfx('click'); if (k < S.pages.length - 1) { k++; show(); } else close(); };
  show(); document.body.append(box);
}
// petit bouton « 📖 » pour relire une histoire
export const storyBtn = (id, label = '📖 Comment ça marche ?') => h('button', { class: 'st-again', onclick: e => { e.stopPropagation(); story(id, null, true); } }, label);
