/* Voix des délégués : ElevenLabs quand une clé existe (navigateur ou
   serveur), sinon la synthèse vocale du navigateur, réglée par
   personnage (hauteur, débit). */

import { CAST } from './cast.js';

const getElevenKey = () => {
  try { return localStorage.getItem('elevenlabs_key') || ''; } catch { return ''; }
};

export async function fetchVoice(text, voiceId) {
  if (!voiceId || !text) return null;
  const localKey = getElevenKey();
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = localKey
        ? await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'xi-api-key': localKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.4, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true },
            }),
          })
        : await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId }),
          });
      if (res.ok) return URL.createObjectURL(await res.blob());
      if (res.status === 429) { await new Promise(r => setTimeout(r, 1200)); continue; }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

let catalog = [];
let assigned = new Map();
/* Choix manuel, par délégué : le navigateur décide de ce qu'il a,
   l'utilisateur décide de qui parle avec quoi. */
let pick = {};
try { pick = JSON.parse(localStorage.getItem('tribune_voix') || '{}') || {}; } catch { pick = {}; }

export function listVoices() { return catalog.slice(); }
export function voiceFor(id) {
  if (pick[id]) { const v = catalog.find(x => x.voiceURI === pick[id]); if (v) return v; }
  return assigned.get(id) || null;
}
export function autoVoice(id) { return assigned.get(id) || null; }
export function getPick(id) { return pick[id] || ''; }
export function setPick(id, uri) {
  if (uri) pick[id] = uri; else delete pick[id];
  try { localStorage.setItem('tribune_voix', JSON.stringify(pick)); } catch { /* rien */ }
}
export function clearPicks() {
  pick = {};
  try { localStorage.removeItem('tribune_voix'); } catch { /* rien */ }
}

export function initVoices() {
  if (!('speechSynthesis' in window)) return;
  const load = () => { catalog = speechSynthesis.getVoices() || []; assign(); };
  load();
  speechSynthesis.addEventListener('voiceschanged', load);
}

/* Le genre d'une voix d'après son nom. « Google français » ne dit rien
   de lui-même et c'est une voix de femme : il faut le savoir. */
const FEM = /female|femme|amelie|amélie|audrey|aurelie|aurélie|marie|julie|celine|céline|léa|\blea\b|denise|virginie|hortense|eloise|éloïse|chantal|sylvie|manon|charlotte|google français|google francais/i;
const MALE = /\bmale\b|homme|thomas|paul|henri|claude|nicolas|daniel|mathieu|remy|rémy|antoine|jacques|yannick|guillaume|grégoire|gregoire/i;
const genderOf = v => (FEM.test(v.name) ? 'female' : MALE.test(v.name) ? 'male' : 'unknown');

/* Une voix par délégué, distinctes tant qu'il y en a.
   Deux choix contre-intuitifs mais décisifs :
   - on préfère les voix LOCALES. Les voix réseau (Google) sonnent mieux
     mais ignorent la hauteur : six personnages y parlent d'un seul timbre.
   - le genre pèse plus que la qualité. Felix avec une voix de femme,
     c'est fini avant d'avoir commencé. */
const ROMANCE = /^(es|it|pt|ca|ro|oc)/i;
function assign() {
  assigned = new Map();
  if (!catalog.length) return;
  const used = new Set();
  for (const c of CAST) {
    let best = null, bestScore = -Infinity;
    for (const v of catalog) {
      const g = genderOf(v), lang = (v.lang || '').toLowerCase();
      // le genre d'abord : un homme avec une voix de femme, c'est mort
      let sc = g === c.gender ? 100 : g === 'unknown' ? 40 : 0;
      if (v.localService) sc += 25;            // la hauteur sera respectée
      if (lang.startsWith('fr')) sc += 30;
      else if (ROMANCE.test(lang)) sc += 10;   // un accent latin plutôt qu'un faux genre
      else sc -= 15;
      if (v.lang === 'fr-FR') sc += 5;
      if (used.has(v.voiceURI)) sc -= 60;      // en garder une par délégué
      if (sc > bestScore) { bestScore = sc; best = v; }
    }
    if (best) { used.add(best.voiceURI); assigned.set(c.id, best); }
  }
}

/* Fait parler un délégué avec la voix du navigateur. Résout à la fin
   de la phrase (ou au bout d'un délai de sécurité). */
export function speakBrowser(text, member) {
  return new Promise(resolve => {
    try {
      if (!('speechSynthesis' in window) || !text) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      const v = member ? voiceFor(member.id) : null;
      if (v) u.voice = v;
      // si la voix n'est pas française, c'est qu'il n'y avait pas d'homme
      // en français : on la laisse lire avec son accent plutôt que de
      // donner une voix de femme à Felix
      u.lang = v?.lang || 'fr-FR';
      const remote = v ? v.localService === false : true;
      const wrongSex = v && member && genderOf(v) !== 'unknown' && genderOf(v) !== member.gender;
      // une voix réseau ignore la hauteur : on creuse le débit, seul
      // réglage qu'elle respecte, pour garder six timbres distincts
      const rate = member?.rate ?? 0.95;
      u.rate = Math.max(0.6, Math.min(1.5, 1 + (rate - 1) * (remote ? 1.5 : 1)));
      let pitch = member?.id === 'roberto'
        ? (Math.random() < 0.5 ? 0.7 : 1.4)   // le gendarme bascule au cabaret
        : member?.pitch ?? 1;
      // faute de voix du bon genre, on pousse la hauteur pour s'en approcher
      if (wrongSex) pitch *= member.gender === 'male' ? 0.72 : 1.3;
      u.pitch = Math.max(0.3, Math.min(1.8, pitch));
      let done = false;
      const finish = ok => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      speechSynthesis.speak(u);
      setTimeout(() => finish(true), 4000 + text.length * 90);
    } catch {
      resolve(false);
    }
  });
}

export function hush() {
  try { speechSynthesis.cancel(); } catch { /* rien */ }
}
