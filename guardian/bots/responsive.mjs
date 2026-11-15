// MYTHORIA GUARDIAN — bot « Testeur Multidispositif » : écrans extrêmes.
// Chaque format refait le parcours rapide (chargement, nom, 5 onglets) avec les bots UX et Directeur Artistique.
// Tout ce qui est trouvé ici est « à surveiller » : un écran extrême ne bloque jamais une publication.
const phone = (width, height) => ({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
export const EXTREME = [
  { id: 'fold', label: 'Galaxy Fold plié (280×653)', extreme: true, ctx: phone(280, 653) },
  { id: 'mini', label: 'Très petit écran (320×480)', extreme: true, ctx: phone(320, 480) },
  { id: 'paysage', label: 'Téléphone couché (915×412)', extreme: true, ctx: phone(915, 412) },
];
