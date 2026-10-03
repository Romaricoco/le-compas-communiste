/* Voix des délégués : ElevenLabs quand une clé existe (navigateur ou
   serveur), sinon la synthèse vocale du navigateur, réglée par
   personnage (hauteur, débit). */

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
const pickCache = new Map();
const QUALITY = ['natural', 'neural', 'premium', 'enhanced', 'online', 'google'];

export function initVoices() {
  if (!('speechSynthesis' in window)) return;
  const load = () => { catalog = speechSynthesis.getVoices(); pickCache.clear(); };
  load();
  speechSynthesis.addEventListener('voiceschanged', load);
}

/* La meilleure voix française disponible pour un genre donné */
function pickVoice(gender) {
  if (pickCache.has(gender)) return pickCache.get(gender);
  const fr = catalog.filter(v => v.lang && v.lang.toLowerCase().startsWith('fr'));
  let best = null, bestScore = -Infinity;
  for (const v of fr) {
    const n = v.name.toLowerCase();
    let s = 0;
    if (v.lang === 'fr-FR') s += 2;
    if (!v.localService) s += 3;
    if (QUALITY.some(q => n.includes(q))) s += 3;
    if (gender === 'male' && /female|femme|amelie|audrey|marie|julie|celine|léa|lea|denise|virginie/.test(n)) s -= 4;
    if (gender === 'female' && /\bmale\b|homme|thomas|paul|henri|claude|nicolas|daniel/.test(n)) s -= 4;
    if (s > bestScore) { bestScore = s; best = v; }
  }
  pickCache.set(gender, best);
  return best;
}

/* Fait parler un délégué avec la voix du navigateur. Résout à la fin
   de la phrase (ou au bout d'un délai de sécurité). */
export function speakBrowser(text, member) {
  return new Promise(resolve => {
    try {
      if (!('speechSynthesis' in window) || !text) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'fr-FR';
      const v = pickVoice(member?.gender || 'male');
      if (v) u.voice = v;
      u.rate = member?.rate ?? 0.95;
      // Roberto bascule sans prévenir entre le grave du gendarme et
      // l'aigu du cabaret : l'instabilité est le personnage
      u.pitch = member?.id === 'roberto'
        ? (Math.random() < 0.5 ? 0.7 : 1.4)
        : member?.pitch ?? 1;
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
