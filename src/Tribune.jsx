import { useEffect, useRef, useState, useCallback } from 'react';
import SovietHall from './SovietHall.jsx';
import CartoonWitness from './CartoonWitness.jsx';
import './Tribune.css';

/* ══════════════════════════════════════════════════════════
   LA TRIBUNE — le jeu
   Vous défendez une cause devant six témoins. Trois tours.
   Convaincre — ou redescendre.
   Esthétique « témoins » de Reds (1981) : visage en gros plan
   décalé sur noir absolu, lumière dure, la parole nue.
   ══════════════════════════════════════════════════════════ */

const photoUrl = id => `https://unsplash.com/photos/${id}/download?force=true&w=640`;

// Les id restent stables en interne (convictions, voix, palette) ; les
// name affichés/prononcés respectent les vrais noms du scénario source
// pour les témoins qui ont une illustration empruntée à ce scénario.
const MEMBERS = [
  /* photo : servie par le site (téléchargée au build) ; remote : repli Unsplash */
  { id: 'olga',  name: 'Esperanza', lang: 'Français',  role: 'vétérane syndicaliste', photo: '/portraits/olga.jpg',  remote: photoUrl('cwZGbT9S2HU'), voice: '21m00Tcm4TlvDq8ikWAM', side: 'l' },
  { id: 'diego', name: 'Alain',     lang: 'Français',  role: 'jeune anarchiste',      photo: '/portraits/diego.jpg', remote: photoUrl('ApDREtVkv5Y'), voice: 'VR6AewLTigWG4xSOukaG', side: 'r' },
  { id: 'wei',   name: 'Wei',       lang: 'Français',  role: 'matérialiste',          photo: '/portraits/wei.jpg',   remote: photoUrl('8ukPkmUuSd8'), voice: 'pNInz6obpgDQGcFmaJgB', side: 'l' },
  { id: 'amara', name: 'Ana',       lang: 'Français',  role: 'internationaliste',     photo: '/portraits/amara.jpg', remote: photoUrl('4cA1jDfaVJU'), voice: 'EXAVITQu4vr4xnSDxMaL', side: 'r' },
  { id: 'john',  name: 'Adama',     lang: 'Français',  role: 'ouvrier sceptique',     photo: '/portraits/john.jpg',  remote: photoUrl('oULrOWE8R5U'), voice: 'TxGEqnHWrfWFTfGW9XjX', side: 'l' },
  { id: 'greta', name: 'Greta',     lang: 'Français',  role: 'intellectuelle',        photo: '/portraits/greta.jpg', remote: photoUrl('RoV_LoLtZWU'), voice: 'MF3mGyEYCl7XYWbV9V6O', side: 'r' },
  { id: 'romaric', name: 'Felix',   lang: 'Français', role: 'président de séance', photo: '/portraits/romaric.jpg', remote: '', voice: 'ErXwobaYiN019PkySvjV', side: 'l' },
  { id: 'roberto', name: 'Roberto', lang: 'Français', role: 'gendarme retraité, théâtral', photo: '/portraits/roberto.jpg', remote: '', voice: 'yoZ06aMxZJJ28mfd3POQ', side: 'r' },
];
const memberById = id => MEMBERS.find(m => m.id === id);
// Vraie illustration disponible pour ceux-là ; wei et amara gardent le
// personnage en aplats (représentation ethnique fidèle déjà travaillée).
const PHOTO_MEMBERS = new Set(['olga', 'diego', 'john', 'amara', 'romaric', 'roberto']);

const START_CONVICTION = 40;
const CONVINCED_AT = 60;
const HOSTILE_AT = 25;
const ROUNDS = 5;
const WIN_THRESHOLD = Math.ceil(MEMBERS.length * 2 / 3); // ~2/3 de l'assemblée

/* ── TTS : clé locale (navigateur) sinon proxy serveur ──── */
const getLocalKey = () => {
  try { return localStorage.getItem('elevenlabs_key') || ''; } catch { return ''; }
};

async function fetchVoice(text, voiceId) {
  if (!voiceId || !text) return null;
  const localKey = getLocalKey();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = localKey
        ? await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: { 'xi-api-key': localKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text,
              model_id: 'eleven_multilingual_v2',
              voice_settings: { stability: 0.42, similarity_boost: 0.82, style: 0.45, use_speaker_boost: true },
            }),
          })
        : await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voiceId }),
          });
      if (res.ok) {
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      return null;
    } catch {
      return null;
    }
  }
  return null;
}

/* ── Voix de secours : synthèse du navigateur dans la langue
      du témoin, quand ElevenLabs n'est pas disponible ──────── */
// Tout le monde parle français désormais — plus de langues étrangères.
const SPEECH_LANGS = { olga: 'fr-FR', diego: 'fr-FR', wei: 'fr-FR', amara: 'fr-FR', john: 'fr-FR', greta: 'fr-FR', romaric: 'fr-FR', roberto: 'fr-FR' };
const SPEECH_GENDER = { olga: 'female', diego: 'male', wei: 'female', amara: 'female', john: 'male', greta: 'female', romaric: 'male', roberto: 'male' };
// Olga (Esperanza) : voix éraillée — pitch bas, débit plus lent
const SPEECH_PITCH = { olga: 0.72, diego: 1.02, wei: 1.04, amara: 0.98, john: 0.88, greta: 0.97, romaric: 0.95, roberto: 1.0 };

// Si aucune voix n'est installée pour la langue exacte, on tente des
// variantes proches avant de renoncer.
const LANG_FALLBACKS = {
  'ru-RU': ['ru'],
  'es-ES': ['es-MX', 'es-US', 'es'],
  'zh-CN': ['zh-TW', 'zh-HK', 'zh', 'cmn'],
  'ar-SA': ['ar-EG', 'ar-AE', 'ar'],
  'en-GB': ['en-US', 'en-AU', 'en'],
  'de-DE': ['de-AT', 'de-CH', 'de'],
  'fr-FR': ['fr-CA', 'fr'],
};

const QUALITY_HINTS = ['natural', 'neural', 'premium', 'enhanced', 'online', 'wavenet'];

/* Attend le catalogue de voix du navigateur (souvent vide au tout
   premier appel, rempli de façon asynchrone). */
function loadVoices() {
  return new Promise(resolve => {
    const existing = speechSynthesis.getVoices();
    if (existing.length) return resolve(existing);
    const onChange = () => {
      speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', onChange);
    setTimeout(() => {
      speechSynthesis.removeEventListener('voiceschanged', onChange);
      resolve(speechSynthesis.getVoices());
    }, 1200);
  });
}

let voiceCatalog = [];
const voicePickCache = new Map();

/* Choisit la meilleure voix disponible pour une langue : les voix
   "réseau" (non locales) et celles marquées Natural/Neural/Premium
   sonnent nettement mieux que la voix locale par défaut du système,
   et on préfère un nom cohérent avec le genre du personnage quand le
   navigateur l'indique (ex. "Google UK English Male/Female"). */
function pickVoice(lang, gender) {
  const cacheKey = lang + ':' + gender;
  if (voicePickCache.has(cacheKey)) return voicePickCache.get(cacheKey);
  const codes = [lang, ...(LANG_FALLBACKS[lang] || [])];
  let candidates = [];
  for (const code of codes) {
    const exact = voiceCatalog.filter(v => v.lang === code);
    const prefix = voiceCatalog.filter(v => v.lang.toLowerCase().startsWith(code.slice(0, 2).toLowerCase()));
    candidates = exact.length ? exact : prefix;
    if (candidates.length) break;
  }
  let best = null, bestScore = -Infinity;
  for (const v of candidates) {
    const name = v.name.toLowerCase();
    let score = 0;
    if (!v.localService) score += 3;               // voix réseau = quasi toujours meilleure
    if (QUALITY_HINTS.some(h => name.includes(h))) score += 4;
    if (gender === 'male' && name.includes('female')) score -= 5;
    if (gender === 'female' && name.includes('male') && !name.includes('female')) score -= 5;
    if (name.includes(gender)) score += 2;
    if (v.default) score += 1;
    if (score > bestScore) { bestScore = score; best = v; }
  }
  voicePickCache.set(cacheKey, best);
  return best;
}

/* La salle vit : des voix lancent des interjections — tout en français */
const INTERJECTIONS = [
  ['fr-FR', ['Bravo !', 'Exact !', 'Qu’il parle !', 'Voilà !', 'Bien dit !', 'Continue !']],
];

function crowdInterjection(volume = 0.3) {
  try {
    const [lang, words] = INTERJECTIONS[Math.floor(Math.random() * INTERJECTIONS.length)];
    const u = new SpeechSynthesisUtterance(words[Math.floor(Math.random() * words.length)]);
    u.lang = lang;
    const voice = pickVoice(lang, Math.random() < 0.5 ? 'male' : 'female');
    if (voice) u.voice = voice;
    u.volume = volume;
    u.rate = 1 + Math.random() * 0.1;
    u.pitch = 0.94 + Math.random() * 0.14;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

function speakFallback(text, memberId) {
  return new Promise(resolve => {
    try {
      if (!('speechSynthesis' in window)) return resolve(false);
      const u = new SpeechSynthesisUtterance(text);
      const lang = SPEECH_LANGS[memberId] || 'fr-FR';
      u.lang = lang;
      const match = pickVoice(lang, SPEECH_GENDER[memberId] || 'female');
      if (match) u.voice = match;
      // Adama/John : la retenue est le personnage — débit lent, silences
      u.rate = memberId === 'john' ? 0.78 : 0.9;
      // Roberto/Gina : l'instabilité EST le personnage — bascule en
      // direct entre grave/policier et aigu/théâtral, jamais lissé
      u.pitch = memberId === 'roberto'
        ? (Math.random() < 0.5 ? 0.72 + Math.random() * 0.08 : 1.3 + Math.random() * 0.15)
        : SPEECH_PITCH[memberId] ?? 1;
      u.volume = 1;
      let done = false;
      const finish = ok => { if (!done) { done = true; resolve(ok); } };
      u.onend = () => finish(true);
      u.onerror = () => finish(false);
      speechSynthesis.speak(u);
      setTimeout(() => finish(true), 16000); // garde-fou
    } catch {
      resolve(false);
    }
  });
}

/* ── Moteur audio d'ambiance (Web Audio, synthétisé) ────── */
function createAudioEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  ctx.resume().catch(() => {});
  // Chaîne de sortie : compresseur (nivelle) → gain de rattrapage →
  // limiteur final (empêche toute saturation numérique en sortie,
  // quel que soit le nombre de sources qui s'additionnent).
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -22; comp.knee.value = 10; comp.ratio.value = 6;
  comp.attack.value = 0.005; comp.release.value = 0.25;
  const post = ctx.createGain(); post.gain.value = 1.15;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.001; limiter.release.value = 0.06;
  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(comp); comp.connect(post); post.connect(limiter); limiter.connect(ctx.destination);

  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };

  // ── Réverbération de salle : convolution avec une réponse
  // impulsionnelle générée (grand hall, decay ~1.8s) — donne à tout
  // le mixage une vraie profondeur spatiale au lieu d'un son "collé".
  const irLen = Math.floor(ctx.sampleRate * 0.9);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) {
      const decay = Math.pow(1 - i / irLen, 4.2);
      d[i] = (Math.random() * 2 - 1) * decay;
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = ir;
  convolver.normalize = true;
  const wetGain = ctx.createGain(); wetGain.gain.value = 0.14;
  const dryBus = ctx.createGain(); dryBus.gain.value = 1;
  dryBus.connect(master);
  dryBus.connect(convolver); convolver.connect(wetGain); wetGain.connect(master);

  // Chaque source se connecte à dryBus (jamais directement à master) —
  // elle profite ainsi automatiquement de la salle.
  const pan = (src, p) => {
    const panner = ctx.createStereoPanner(); panner.pan.value = p;
    src.connect(panner); panner.connect(dryBus);
    return panner;
  };

  // Souffle grave de grand hall — discret
  const room = noiseSrc();
  const roomF = ctx.createBiquadFilter(); roomF.type = 'lowpass'; roomF.frequency.value = 150;
  const roomG = ctx.createGain(); roomG.gain.value = 0;
  room.connect(roomF); roomF.connect(roomG); pan(roomG, 0); room.start();

  let heat = 0.25;  // 0..1 : la salle est d'autant plus bruyante qu'elle est chaude
  let boost = 0;    // surchauffe passagère (réactions de la salle)
  let dead = false;

  // ── Walla humain à deux profondeurs ──────────────────────
  // "près" : peu de voix, présentes, peu filtrées, au centre.
  // "loin" : plus de voix, étouffées, étalées en stéréo — un vrai
  // fond de salle avec de la profondeur, pas un mur uniforme.
  const wallaTimers = [];
  // Bruit filtré et modulé, pas d'oscillateur : une vraie voix murmurée
  // de loin est du bruit à bande étroite qui glisse, pas un ton pur —
  // l'onde en dents de scie sonnait comme un synthétiseur qui parle.
  const makeWallaVoice = (near, panPos) => {
    const src = noiseSrc();
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 3.5;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 6;
    const muffle = ctx.createBiquadFilter();
    muffle.type = 'lowpass'; muffle.frequency.value = near ? 2600 : 1000;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f1); f1.connect(muffle);
    src.connect(f2); f2.connect(muffle);
    muffle.connect(g);
    pan(g, panPos);
    src.start(0, Math.random() * 1.8);
    const baseVol = near ? 0.045 : 0.02;
    const mumble = () => {
      if (dead) return;
      const t = ctx.currentTime;
      const syls = 2 + Math.floor(Math.random() * 6);
      const vol = (baseVol * (0.7 + Math.random() * 0.6)) * (1 + (heat + boost) * 2.6);
      let tt = t + Math.random() * 0.1;
      for (let s2 = 0; s2 < syls; s2++) {
        const dur = 0.09 + Math.random() * 0.15;
        // les bandes glissent pendant la syllabe — un vrai murmure
        // n'a pas de hauteur fixe, juste des formants qui bougent
        f1.frequency.setValueAtTime(280 + Math.random() * 260, tt);
        f1.frequency.linearRampToValueAtTime(220 + Math.random() * 320, tt + dur);
        f2.frequency.setValueAtTime(700 + Math.random() * 900, tt);
        f2.frequency.linearRampToValueAtTime(600 + Math.random() * 1100, tt + dur);
        g.gain.setTargetAtTime(vol, tt, 0.03);
        g.gain.setTargetAtTime(0.0001, tt + dur * 0.7, 0.045);
        tt += dur;
      }
      const id = wallaTimers.length;
      wallaTimers[id] = setTimeout(mumble, ((tt - t) + 0.2 + Math.random() * 3 / (0.35 + heat + boost)) * 1000);
    };
    mumble();
  };
  // Bruit de fond coupé : plus de souffle de salle ni de murmure permanent.
  // Les réactions ponctuelles (ovation, rire, huées, duels) restent seules.

  // Bruits de salle aléatoires : toux, chaises, exclamations lointaines
  const burst = ({ f0, type = 'bandpass', q = 1, dur = 0.12, gain = 0.04, sweep = 0, p = 0 }) => {
    const t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (sweep) f.frequency.linearRampToValueAtTime(Math.max(60, f0 + sweep), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); pan(g, p);
    s.start(t, Math.random() * 1.6, dur + 0.05);
  };
  const events = setInterval(() => {
    if (Math.random() > 0.3 + heat * 0.45) return;
    const pick = Math.random();
    const p = (Math.random() - 0.5) * 1.6;
    if (pick < 0.3) {           // une toux au fond de la salle
      burst({ f0: 360, type: 'lowpass', dur: 0.13, gain: 0.12, p });
      setTimeout(() => burst({ f0: 320, type: 'lowpass', dur: 0.11, gain: 0.09, p }), 200);
    } else if (pick < 0.8) {    // le brouhaha qui enfle brièvement
      boost = Math.max(boost, 0.7);
      setTimeout(() => { boost = 0; }, 1800);
    } else {                    // une exclamation lointaine
      burst({ f0: 550 + Math.random() * 200, q: 3, dur: 0.28, gain: 0.07, sweep: 260, p });
    }
  }, 1150);

  const setHeat = v => { heat = Math.max(0, Math.min(1, v)); };

  const murmurSwell = () => {
    ctx.resume().catch(() => {});
    boost = 1.3;
    setTimeout(() => { boost = 0; }, 2600);
  };

  // Un cri isolé (voyelle criée, formants dynamiques) — "Oui !", "Ouais !"
  // générique dans n'importe quelle langue, pour peupler les ovations
  // de vraies voix humaines plutôt que du bruit filtré seul.
  // Huée : "booo" descendant, bruit filtré tenu — pas un cri bref
  const boo = (t0, p) => {
    const src = noiseSrc();
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(340 + Math.random() * 80, t0);
    f.frequency.linearRampToValueAtTime(180 + Math.random() * 40, t0 + 0.6);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.05 + Math.random() * 0.04, t0 + 0.12);
    g.gain.setTargetAtTime(0.0001, t0 + 0.4, 0.22);
    src.connect(f); f.connect(g); pan(g, p);
    src.start(t0, Math.random() * 1.6, 0.75); src.stop(t0 + 0.8);
  };

  // Réaction de foule derrière un duel : encouragements OU huées,
  // jamais les deux pour la même réplique — la salle prend parti.
  const crowdReact = (favorable, p) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const n = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = t0 + Math.random() * 0.4;
      if (favorable) shout(t, p + (Math.random() - 0.5) * 0.8);
      else boo(t, p + (Math.random() - 0.5) * 0.8);
    }
  };

  const shout = (t0, p) => {
    const src = noiseSrc();
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4.5;
    const start = 500 + Math.random() * 350;
    f1.frequency.setValueAtTime(start, t0);
    f1.frequency.exponentialRampToValueAtTime(start * (0.6 + Math.random() * 0.15), t0 + 0.32);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.06, t0 + 0.045);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4 + Math.random() * 0.25);
    src.connect(f1); f1.connect(g); pan(g, p);
    src.start(t0, Math.random() * 1.6, 0.75); src.stop(t0 + 0.8);
  };

  // Un rire isolé : plusieurs pulses "ha-ha-ha" à hauteur descendante,
  // pas juste un cri — la texture est reconnaissable comme du rire.
  const laughBurst = (t0, p, pulses = 3) => {
    const basePitch = 550 + Math.random() * 300;
    for (let i = 0; i < pulses; i++) {
      const t = t0 + i * (0.13 + Math.random() * 0.03);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 4.5;
      f1.frequency.setValueAtTime(basePitch * (1 - i * 0.05), t);
      f1.frequency.exponentialRampToValueAtTime(basePitch * (0.75 - i * 0.04), t + 0.1);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.09 + Math.random() * 0.06, t + 0.018);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      s.connect(f1); f1.connect(g); pan(g, p);
      s.start(t, Math.random() * 1.6, 0.18);
    }
  };

  // Rire collectif de la salle — plus léger qu'une ovation, monte vite
  // et retombe, quelques voix isolées qui pouffent en décalé.
  const laughter = (intensity = 1) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    boost = Math.max(boost, 1.6 * intensity);
    setTimeout(() => { boost = 0; }, 2200);
    const voices = Math.floor(13 * intensity);
    for (let i = 0; i < voices; i++) {
      laughBurst(t0 + Math.random() * 0.7, (Math.random() - 0.5) * 1.9, 3 + Math.floor(Math.random() * 4));
    }
    // une deuxième vague qui repart, la salle qui relance le rire
    if (Math.random() < 0.7) {
      const voices2 = Math.floor(6 * intensity);
      for (let i = 0; i < voices2; i++) {
        laughBurst(t0 + 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 1.8, 2 + Math.floor(Math.random() * 3));
      }
    }
    // des voix qui gueulent par-dessus le rire
    crowdInterjection(0.5);
    if (Math.random() < 0.6) crowdInterjection(0.4);
  };

  // Sifflement d'ovation (deux doigts) : ton net avec vibrato, monte
  // puis se stabilise — texture bien distincte des cris et des claps.
  const whistle = (t0, p) => {
    const osc = ctx.createOscillator(); osc.type = 'sine';
    const peak = 1900 + Math.random() * 500;
    osc.frequency.setValueAtTime(900, t0);
    osc.frequency.exponentialRampToValueAtTime(peak, t0 + 0.18);
    const vibrato = ctx.createOscillator(); vibrato.frequency.value = 5 + Math.random() * 2;
    const vibratoDepth = ctx.createGain(); vibratoDepth.gain.value = 25;
    vibrato.connect(vibratoDepth); vibratoDepth.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.045, t0 + 0.1);
    g.gain.setTargetAtTime(0.0001, t0 + 0.55 + Math.random() * 0.4, 0.15);
    osc.connect(g); pan(g, p);
    osc.start(t0); vibrato.start(t0);
    osc.stop(t0 + 1.3); vibrato.stop(t0 + 1.3);
  };

  const ovation = (intensity = 1) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    // un ou deux sifflets d'enthousiasme, pas systématiques
    if (Math.random() < 0.55) whistle(t0 + Math.random() * 0.5, (Math.random() - 0.5) * 1.5);
    if (intensity > 0.7 && Math.random() < 0.3) whistle(t0 + 0.6 + Math.random() * 0.6, (Math.random() - 0.5) * 1.5);
    const roar = noiseSrc();
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass';
    rf.frequency.setValueAtTime(420, t0); rf.frequency.linearRampToValueAtTime(700, t0 + 1.2); rf.Q.value = 0.55;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0); rg.gain.exponentialRampToValueAtTime(0.3 * intensity, t0 + 0.45);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    roar.connect(rf); rf.connect(rg); pan(rg, 0); roar.start(t0); roar.stop(t0 + 3.4);

    // chœur de cris épars sur les premières secondes
    const shouts = Math.floor(10 * intensity);
    for (let i = 0; i < shouts; i++) {
      shout(t0 + 0.05 + Math.random() * 1.1, (Math.random() - 0.5) * 1.8);
    }

    // applaudissements : profil réaliste — départ dense, puis décroissance
    // exponentielle avec quelques trainards, plutôt qu'une distribution
    // uniforme sur toute la durée.
    const claps = Math.floor(90 * intensity);
    const tau = 1.1;
    for (let i = 0; i < claps; i++) {
      const t = t0 + 0.1 + Math.min(3.4, -Math.log(1 - Math.random()) * tau);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = 1400 + Math.random() * 1700; f.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.08, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      s.connect(f); f.connect(g); pan(g, (Math.random() - 0.5) * 1.9);
      s.start(t, Math.random() * 1.6, 0.09);
    }

    // brève salve rythmée en unisson, comme une salle qui s'accorde
    if (Math.random() < 0.4) {
      const rt0 = t0 + 1.3 + Math.random() * 0.8;
      for (let i = 0; i < 4; i++) {
        const t = rt0 + i * 0.32;
        const s = ctx.createBufferSource(); s.buffer = buf;
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 2;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.13, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        s.connect(f); f.connect(g); pan(g, 0);
        s.start(t, Math.random() * 1.6, 0.12);
      }
    }
  };

  const dispose = () => {
    dead = true;
    wallaTimers.forEach(t2 => clearTimeout(t2));
    clearInterval(events);
    ctx.close().catch(() => {});
  };
  return { murmurSwell, ovation, laughter, crowdReact, setHeat, dispose };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const getMistralKey = () => {
  try { return localStorage.getItem('mistral_key') || ''; } catch { return ''; }
};

async function callTribuneAPI(cause, argument, transcript, convictions, round) {
  // Toujours via notre serveur (appeler Mistral depuis le navigateur est
  // bloqué par CORS) ; la clé collée dans l'app part en en-tête et prime.
  const mistralKey = getMistralKey();
  const headers = { 'Content-Type': 'application/json' };
  if (mistralKey) headers['X-Mistral-Key'] = mistralKey;
  const res = await fetch('/api/tribune', {
    method: 'POST',
    headers,
    body: JSON.stringify({ cause, argument, transcript, convictions, round }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    const detail = [j.error, j.detail].filter(Boolean).join(' — ');
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return await res.json();
}

/* ── Composant ───────────────────────────────────────────── */
export default function Tribune({ onExit }) {
  // door → cause → speak → playing → state → verdict
  const [phase, setPhase] = useState('door');
  const [round, setRound] = useState(1);
  const [cause, setCause] = useState('');
  const [causeInput, setCauseInput] = useState('');
  const [argInput, setArgInput] = useState('');
  const [current, setCurrent] = useState(null);   // { member?, vo?, fr } | { dida }
  const [convictions, setConvictions] = useState({});
  const [gameError, setGameError] = useState(null);
  const [pendingQuestion, setPendingQuestion] = useState(null);
  const [needMistralKey, setNeedMistralKey] = useState(false);
  const [mistralKeyInput, setMistralKeyInput] = useState('');

  const audioRef = useRef(null);
  const hallRef = useRef(null);
  const heatRef = useRef(0.25);
  const skipRef = useRef(null);
  const voicePlayerRef = useRef(null);
  const convictionsRef = useRef({});
  const transcriptRef = useRef([]);
  const abortRef = useRef(false);

  const enter = useCallback(() => {
    audioRef.current = createAudioEngine();
    // iOS : on débloque UN lecteur pendant le geste utilisateur,
    // réutilisé ensuite pour toutes les voix.
    const player = new Audio();
    player.playsInline = true;
    player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    player.play().catch(() => {});
    voicePlayerRef.current = player;

    // Préchauffe les portraits pendant que le joueur écrit sa cause
    MEMBERS.forEach(m => { const img = new Image(); img.src = m.photo; });
    // Charge le catalogue de voix du navigateur et choisit la meilleure
    // par personnage avant que la partie ne commence.
    try {
      loadVoices().then(list => {
        voiceCatalog = list;
        voicePickCache.clear();
      });
    } catch { /* ignore */ }

    setPhase('cause');
  }, []);

  const playLine = useCallback((line, url) => new Promise(resolve => {
    setCurrent(line);
    const minDur = Math.max(2600, (line.fr || '').length * 55);
    let done = false;
    const finish = (delay = 0) => {
      if (done) return;
      done = true;
      skipRef.current = null;
      setTimeout(resolve, delay);
    };
    // un tap n'importe où saute à la suite — interaction fluide
    skipRef.current = () => {
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
      voicePlayerRef.current?.pause();
      finish(120);
    };
    const player = voicePlayerRef.current;
    if (url && player) {
      player.onended = () => finish(650);
      player.src = url;
      player.volume = 0.92;
      player.play().catch(() => setTimeout(() => finish(0), minDur));
      setTimeout(() => finish(0), 20000);   // garde-fou
    } else if (line.vo && line.member) {
      // Pas d'ElevenLabs : le témoin parle avec la voix du téléphone,
      // dans sa langue (russe, mandarin, arabe…)
      const t0 = Date.now();
      speakFallback(line.vo, line.member).then(ok => {
        const elapsed = Date.now() - t0;
        finish(ok ? Math.max(450, 2000 - elapsed) : Math.max(200, minDur - elapsed));
      });
    } else {
      setTimeout(() => finish(0), minDur);
    }
  }), []);

  const runRound = useCallback(async (argumentText, currentRound, currentCause) => {
    setGameError(null);
    setPhase('playing');
    // réaction immédiate de la salle dès que tu prends la parole
    audioRef.current?.murmurSwell();
    hallRef.current?.murmur();
    setCurrent({ dida: currentRound === 1
      ? 'La salle se tait. Vous montez à la tribune.'
      : 'L’assemblée pèse vos mots…' });

    let data;
    try {
      data = await callTribuneAPI(currentCause, argumentText, transcriptRef.current, convictionsRef.current, currentRound);
      if (!Array.isArray(data.lines)) throw new Error('réponse malformée');
    } catch (err) {
      const msg = String(err.message || err);
      if (/401|403|aucune clé|unauthorized|invalid/i.test(msg)) {
        setGameError(`Clé Mistral refusée ou absente — ${msg.slice(0, 120)}`);
        setNeedMistralKey(true);
      } else {
        setGameError(`L’assemblée n’a pas pu délibérer : ${msg.slice(0, 140)}`);
      }
      setPhase('speak');
      return;
    }

    // Synthèse des voix en parallèle (3 répliques max, un vrai échange)
    const urls = await Promise.all(
      data.lines.map(l => fetchVoice(l.vo, memberById(l.member)?.voice))
    );

    if (abortRef.current) return;

    for (let k = 0; k < data.lines.length; k++) {
      if (abortRef.current) return;
      // Roberto bascule de registre en direct — la salle tressaille
      if (data.lines[k].member === 'roberto') hallRef.current?.murmur();
      await playLine(data.lines[k], urls[k]);
    }
    urls.forEach(u => { if (u) URL.revokeObjectURL(u); });

    if (data.fx === 'ovation') {
      audioRef.current?.ovation(1);
      hallRef.current?.ovation();
      // des voix crient depuis la salle
      crowdInterjection(0.55);
      setTimeout(() => crowdInterjection(0.45), 900);
    }
    if (data.fx === 'murmur') { audioRef.current?.murmurSwell(); hallRef.current?.murmur(); }
    if (data.fx === 'rire') { audioRef.current?.laughter(1); hallRef.current?.murmur(); }
    if (data.dida) {
      setCurrent({ dida: data.dida });
      await wait(1700 + Math.random() * 700);
    }

    // Mise à jour des convictions
    const next = { ...convictionsRef.current };
    for (const m of MEMBERS) {
      const d = Number(data.deltas?.[m.id] ?? 0);
      next[m.id] = clamp((next[m.id] ?? START_CONVICTION) + (Number.isFinite(d) ? d : 0), 0, 100);
    }
    convictionsRef.current = next;
    setConvictions(next);
    // la salle s'échauffe (ou se refroidit) avec la conviction moyenne
    const avg = MEMBERS.reduce((s, m) => s + (next[m.id] ?? START_CONVICTION), 0) / MEMBERS.length;
    hallRef.current?.setIntensity(avg / 100);
    audioRef.current?.setHeat(avg / 100);
    heatRef.current = avg / 100;

    transcriptRef.current = [
      ...transcriptRef.current,
      { by: 'joueur', fr: argumentText },
      ...data.lines.map(l => ({ by: l.member, fr: l.fr })),
    ];
    setPendingQuestion(data.question || null);
    if (data.question) {
      // la question est adressée à voix haute, directement au joueur,
      // par Romaric — plus d'interactivité qu'un simple texte affiché
      try {
        const u = new SpeechSynthesisUtterance(data.question);
        u.lang = 'fr-FR';
        const v = pickVoice('fr-FR', 'male');
        if (v) u.voice = v;
        u.rate = 0.95;
        u.pitch = SPEECH_PITCH.romaric;
        u.volume = 1;
        setTimeout(() => speechSynthesis.speak(u), 400);
      } catch { /* ignore */ }
    }

    setCurrent(null);
    setPhase('state');
    await wait(2200 + Math.random() * 900);
    if (abortRef.current) return;

    if (currentRound >= ROUNDS) {
      const convinced = MEMBERS.filter(m => next[m.id] >= CONVINCED_AT).length;
      if (convinced >= WIN_THRESHOLD) {
        audioRef.current?.ovation(1);
        hallRef.current?.ovation();
        hallRef.current?.setIntensity(1);
      } else {
        audioRef.current?.murmurSwell();
        hallRef.current?.murmur();
      }
      setPhase('verdict');
    } else {
      setRound(currentRound + 1);
      setArgInput('');
      setPhase('speak');
    }
  }, [playLine]);

  const submitCause = useCallback(() => {
    const c = causeInput.trim();
    if (c.length < 8) return;
    setCause(c);
    const init = {};
    MEMBERS.forEach(m => { init[m.id] = START_CONVICTION; });
    convictionsRef.current = init;
    setConvictions(init);
    transcriptRef.current = [];
    setPendingQuestion(null);
    runRound(c, 1, c);
  }, [causeInput, runRound]);

  const submitArg = useCallback(() => {
    const a = argInput.trim();
    if (a.length < 8) return;
    runRound(a, round, cause);
  }, [argInput, round, cause, runRound]);

  const replay = useCallback(() => {
    voicePlayerRef.current?.pause();
    try { speechSynthesis.cancel(); } catch { /* ignore */ }
    setRound(1);
    setCause('');
    setCauseInput('');
    setArgInput('');
    setCurrent(null);
    setGameError(null);
    setPendingQuestion(null);
    transcriptRef.current = [];
    setPhase('cause');
  }, []);

  const submitMistralKey = useCallback(() => {
    const k = mistralKeyInput.trim();
    if (!k) return;
    try { localStorage.setItem('mistral_key', k); } catch { /* ignore */ }
    setNeedMistralKey(false);
    setGameError('Clé enregistrée — renvoie ton argument à la tribune.');
  }, [mistralKeyInput]);

  const forgetMistralKey = useCallback(() => {
    try { localStorage.removeItem('mistral_key'); } catch { /* ignore */ }
    setMistralKeyInput('');
    setNeedMistralKey(false);
    setGameError('Clé collée oubliée — le site utilisera sa propre clé. Renvoie ton argument.');
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      abortRef.current = true;
      voicePlayerRef.current?.pause();
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
      audioRef.current?.dispose();
    };
  }, []);

  const speaker = current?.member ? memberById(current.member) : null;
  const convincedCount = MEMBERS.filter(m => (convictions[m.id] ?? 0) >= CONVINCED_AT).length;
  const won = convincedCount >= WIN_THRESHOLD;

  const stance = v => v >= CONVINCED_AT ? 'convaincu·e' : v <= HOSTILE_AT ? 'hostile' : 'sceptique';

  return (
    <div className="tr-stage" onClick={phase === 'playing' ? () => skipRef.current?.() : undefined}>
      {/* La salle : foule, faisceaux, bannières — vivante en permanence */}
      <SovietHall ref={hallRef} />
      <div className="tr-vignette" />
      <div className="tr-grade" />

      {/* Le témoin qui parle : vraie illustration quand on en a une,
          personnage en aplats articulé sinon (wei, amara) */}
      {phase === 'playing' && speaker && (
        <div key={speaker.id} className={`tr-witness tr-witness-${speaker.side}`}>
          {PHOTO_MEMBERS.has(speaker.id) ? (
            <img className="tr-witness-photo" src={`/portraits/${speaker.id}.jpg`} alt="" />
          ) : (
            <CartoonWitness memberId={speaker.id} speaking={!current.dida} />
          )}
        </div>
      )}

      <div className="tr-grain" />
      <div className="tr-bar tr-bar-top" />
      <div className="tr-bar tr-bar-bottom" />

      {/* Répliques et didascalies */}
      {phase === 'playing' && current && (
        <div className={'tr-subzone' + (speaker ? ` tr-subzone-${speaker.side === 'l' ? 'r' : 'l'}` : '')}>
          {current.vo && <div className="tr-vo" dir="auto">{current.vo}</div>}
          <div className={'tr-fr' + (current.dida ? ' dida' : '')}>{current.fr || current.dida}</div>
          {!current.dida && <div className="tr-skip-hint">toucher l’écran pour passer</div>}
        </div>
      )}

      {/* Porte d'entrée */}
      {phase === 'door' && (
        <div className="tr-door">
          <div className="tr-door-title">LA TRIBUNE</div>
          <div className="tr-door-sub">CINQ TOURS. CONVAINCRE — OU REDESCENDRE.</div>
          <button className="tr-door-btn" onClick={enter}>Monter à la tribune</button>
          <div className="tr-door-note">8 témoins · voix réelles · le jeu</div>
        </div>
      )}

      {/* Ta cause — tu parles dans la scène, comme un sous-titre que tu écris */}
      {phase === 'cause' && (
        <div className="tr-speech">
          <div className="tr-fr dida">Le président de séance frappe le pupitre — « Ta cause, camarade ? »</div>
          <textarea
            className="tr-speechline"
            rows={1}
            maxLength={280}
            placeholder="parle… puis Entrée"
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            value={causeInput}
            onChange={e => setCauseInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCause(); } }}
            autoFocus
          />
          <div className="tr-speech-hint">↵ Entrée pour monter à la tribune</div>
          {needMistralKey && (
            <div className="tr-keyform">
              <div className="tr-door-note">Mistral indisponible : colle ta clé API (console.mistral.ai → API Keys — elle reste dans ton navigateur)</div>
              <input
                className="tr-keyinput"
                type="password"
                placeholder="clé Mistral…"
                value={mistralKeyInput}
                onChange={e => setMistralKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitMistralKey(); }}
              />
              <div className="tr-keyrow">
                <button className="tr-end-btn" onClick={submitMistralKey}>Valider la clé</button>
                {getLocalKey() && (
                  <button className="tr-end-btn" onClick={forgetMistralKey}>
                    Oublier ma clé collée (revenir à celle du site)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Ton argument du tour — même dispositif, la salle attend */}
      {phase === 'speak' && (
        <div className="tr-speech">
          <div className="tr-speech-hint">TOUR {round} / {ROUNDS}</div>
          {transcriptRef.current.length > 0 && (
            <div className="tr-lastwords">
              {transcriptRef.current.slice(-2).filter(t => t.by !== 'joueur').map((t, i) => (
                <div key={i} className="tr-lastword">
                  <span className="tr-lastword-name">{memberById(t.by)?.name || t.by}</span> — {t.fr}
                </div>
              ))}
            </div>
          )}
          <div className={'tr-fr dida' + (pendingQuestion ? ' tr-question' : '')}>
            {pendingQuestion || "L'assemblée attend ta réponse."}
          </div>
          <textarea
            className="tr-speechline"
            rows={2}
            maxLength={600}
            placeholder="parle… puis Entrée"
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
            value={argInput}
            onChange={e => setArgInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitArg(); } }}
            autoFocus
          />
          <div className="tr-speech-hint">↵ Entrée pour prendre la parole</div>
          {gameError && <div className="tr-load-error">{gameError}</div>}
          {needMistralKey && (
            <div className="tr-keyform">
              <div className="tr-door-note">Colle ici ta clé API Mistral (console.mistral.ai → API Keys — elle reste dans ton navigateur)</div>
              <input
                className="tr-keyinput"
                type="password"
                placeholder="clé Mistral…"
                value={mistralKeyInput}
                onChange={e => setMistralKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitMistralKey(); }}
              />
              <div className="tr-keyrow">
                <button className="tr-end-btn" onClick={submitMistralKey}>Valider la clé</button>
                {getLocalKey() && (
                  <button className="tr-end-btn" onClick={forgetMistralKey}>
                    Oublier ma clé collée (revenir à celle du site)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* État de la salle entre les tours : une ligne, comme un carton */}
      {phase === 'state' && (
        <div className="tr-speech">
          <div className="tr-stateline">
            {MEMBERS.map(m => (
              <span key={m.id} className={'tr-state-chip s-' + stance(convictions[m.id] ?? START_CONVICTION).slice(0, 4)}>
                {m.name} <em>{stance(convictions[m.id] ?? START_CONVICTION)}</em>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      {phase === 'verdict' && (
        <div className="tr-endcard">
          <div className="tr-end-title">{won ? 'L’ASSEMBLÉE SE LÈVE' : convincedCount === 3 ? 'LA SALLE EST PARTAGÉE' : 'REDESCENDS, CAMARADE'}</div>
          <div className="tr-end-sub">{convincedCount} témoin{convincedCount > 1 ? 's' : ''} sur {MEMBERS.length} convaincu{convincedCount > 1 ? 's' : ''} — « {cause} »</div>
          <div className="tr-credits">
            {MEMBERS.map(m => (
              <div key={m.id} className="tr-credit-line">
                <span className="tr-credit-name">{m.name}</span>
                <span className="tr-credit-role">{stance(convictions[m.id] ?? START_CONVICTION)} · {m.role}</span>
              </div>
            ))}
          </div>
          <button className="tr-end-btn" onClick={replay}>Défendre une autre cause</button>
        </div>
      )}

      {onExit && (
        <button className="tr-exit" onClick={onExit}>Quitter ✕</button>
      )}
    </div>
  );
}
