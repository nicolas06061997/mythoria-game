// MYTHORIA — point d'entrée du jeu dans le navigateur.
import { startApp } from './ui/app.js';
import { initInstall, initUpdates } from './install.js';

const APPV = document.documentElement.dataset.version || 'dev';
initInstall();          // bouton « Installer le jeu » (comme les autres jeux)
initUpdates(APPV);      // mises à jour automatiques
startApp(document.getElementById('app'), APPV);
const sp = document.getElementById('splash'); if (sp) { sp.classList.add('off'); setTimeout(() => sp.remove(), 500); }
