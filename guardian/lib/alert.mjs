// MYTHORIA GUARDIAN — alertes vers le téléphone du propriétaire.
//   ntfy    : toujours (sujet public, déjà utilisé par le Guardian).
//   Discord : seulement les urgences (urgent: true), et seulement si l'adresse secrète du webhook est fournie
//             dans la variable d'environnement DISCORD_WEBHOOK (secret GitHub — jamais écrite dans le dépôt).
const env = process.env;

export async function sendNtfy({ topic, title, message, priority = 3, tags = [], click }) {
  try {
    const r = await fetch('https://ntfy.sh/', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ topic, title, message: String(message).slice(0, 3500), priority, tags, click }) });
    return r.ok ? 'envoyée' : 'refusée (' + r.status + ')';
  } catch (e) { return 'impossible : ' + e.message; }
}

export function discordPayload({ title, message, url, level = 'urgence' }) {
  return {
    username: 'MYTHORIA Guardian',
    content: level === 'urgence' ? '🚨 **Urgence MYTHORIA**' : undefined,
    embeds: [{ title: String(title).slice(0, 250), description: String(message).slice(0, 3500), url, color: level === 'urgence' ? 0xff4f5e : 0x3ddc97, timestamp: new Date().toISOString(), footer: { text: 'MYTHORIA Guardian' } }],
    allowed_mentions: { parse: [] },
  };
}

export async function sendDiscord(payload, hook = env.DISCORD_WEBHOOK) {
  if (!hook) return 'non configuré';
  if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(hook)) return 'adresse de webhook invalide';
  try {
    const r = await fetch(hook, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) });
    return r.ok ? 'envoyée' : 'refusée (' + r.status + ')';
  } catch (e) { return 'impossible : ' + e.message; }
}

// Une seule porte d'entrée : ntfy toujours, Discord en plus si « urgent ».
export async function alert({ topic, title, message, priority = 3, tags = [], click, urgent = false }) {
  if (env.GUARDIAN_NO_NOTIFY) { console.log('[notification non envoyée]', title, '—', message); return; }
  console.log('Notification ntfy', await sendNtfy({ topic, title, message, priority, tags, click }), ':', title);
  if (urgent) console.log('Alerte Discord', await sendDiscord(discordPayload({ title, message, url: click })), ':', title);
}
