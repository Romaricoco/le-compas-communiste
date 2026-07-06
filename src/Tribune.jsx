import { useEffect, useRef, useState, useCallback } from 'react';
import './Tribune.css';

/* ══════════════════════════════════════════════════════════
   LA TRIBUNE — le jeu
   Vous défendez une cause devant six témoins. Trois tours.
   Convaincre — ou redescendre.
   Esthétique « témoins » de Reds (1981) : visage en gros plan
   décalé sur noir absolu, lumière dure, la parole nue.
   ══════════════════════════════════════════════════════════ */

const photoUrl = id => `https://unsplash.com/photos/${id}/download?force=true&w=640`;

const MEMBERS = [
  { id: 'olga',  name: 'Olga',  lang: 'Русский',  role: 'vétérane syndicaliste', photo: photoUrl('cwZGbT9S2HU'), voice: '21m00Tcm4TlvDq8ikWAM', side: 'l' },
  { id: 'diego', name: 'Diego', lang: 'Español',  role: 'jeune anarchiste',      photo: photoUrl('ApDREtVkv5Y'), voice: 'VR6AewLTigWG4xSOukaG', side: 'r' },
  { id: 'wei',   name: 'Wei',   lang: '中文',      role: 'matérialiste',          photo: photoUrl('8ukPkmUuSd8'), voice: 'pNInz6obpgDQGcFmaJgB', side: 'l' },
  { id: 'amara', name: 'Amara', lang: 'العربية',   role: 'internationaliste',     photo: photoUrl('4cA1jDfaVJU'), voice: 'EXAVITQu4vr4xnSDxMaL', side: 'r' },
  { id: 'john',  name: 'John',  lang: 'English',  role: 'ouvrier sceptique',     photo: photoUrl('oULrOWE8R5U'), voice: 'TxGEqnHWrfWFTfGW9XjX', side: 'l' },
  { id: 'greta', name: 'Greta', lang: 'Deutsch',  role: 'intellectuelle',        photo: photoUrl('RoV_LoLtZWU'), voice: 'MF3mGyEYCl7XYWbV9V6O', side: 'r' },
];
const memberById = id => MEMBERS.find(m => m.id === id);

const START_CONVICTION = 40;
const CONVINCED_AT = 60;
const HOSTILE_AT = 25;
const ROUNDS = 3;

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

/* ── Moteur audio d'ambiance (Web Audio, synthétisé) ────── */
function createAudioEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  const noiseSrc = () => { const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s; };

  const room = noiseSrc();
  const roomF = ctx.createBiquadFilter(); roomF.type = 'lowpass'; roomF.frequency.value = 110;
  const roomG = ctx.createGain(); roomG.gain.value = 0.22;
  room.connect(roomF); roomF.connect(roomG); roomG.connect(master); room.start();

  const mur = noiseSrc();
  const murF = ctx.createBiquadFilter(); murF.type = 'bandpass'; murF.frequency.value = 620; murF.Q.value = 0.9;
  const murG = ctx.createGain(); murG.gain.value = 0.006;
  mur.connect(murF); murF.connect(murG); murG.connect(master); mur.start();
  const flutter = setInterval(() => {
    murG.gain.setTargetAtTime(0.004 + Math.random() * 0.008, ctx.currentTime, 0.9);
  }, 1700);

  const murmurSwell = () => {
    ctx.resume().catch(() => {});
    murG.gain.setTargetAtTime(0.07, ctx.currentTime, 0.35);
    setTimeout(() => murG.gain.setTargetAtTime(0.006, ctx.currentTime, 1.4), 2400);
  };

  const ovation = (intensity = 1) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const roar = noiseSrc();
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass';
    rf.frequency.setValueAtTime(420, t0); rf.frequency.linearRampToValueAtTime(700, t0 + 1.2); rf.Q.value = 0.55;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0); rg.gain.exponentialRampToValueAtTime(0.16 * intensity, t0 + 0.45);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    roar.connect(rf); rf.connect(rg); rg.connect(master); roar.start(t0); roar.stop(t0 + 3.4);

    const claps = Math.floor(56 * intensity);
    for (let i = 0; i < claps; i++) {
      const t = t0 + 0.15 + Math.random() * 2.4;
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass';
      f.frequency.value = 1400 + Math.random() * 1700; f.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.04 + Math.random() * 0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.6, 0.09);
    }
  };

  const dispose = () => { clearInterval(flutter); ctx.close().catch(() => {}); };
  return { murmurSwell, ovation, dispose };
}

const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const getMistralKey = () => {
  try { return localStorage.getItem('mistral_key') || ''; } catch { return ''; }
};

async function callTribuneAPI(cause, argument, transcript, convictions, round) {
  const mistralKey = getMistralKey();
  if (!mistralKey) {
    // Utiliser le serveur
    const res = await fetch('/api/tribune', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cause, argument, transcript, convictions, round }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  // Appel direct à Mistral
  const history = Array.isArray(transcript)
    ? transcript.slice(-12).map(t => `${t.by} : ${t.fr}`).join('\n')
    : '';
  const SYSTEM = `Tu es le metteur en scène du jeu "La Tribune". Les témoins réagissent selon leur conviction.
1. Deux témoins réagissent (varie vs tours précédents).
2. MAX 18 mots/réaction. Langue maternelle (vo) + traduction française (fr).
3. "deltas" : -20 à +20 par témoin. Argument solide = positif. Creux = négatif.
4. "dida" : didascalie max 12 mots ou null. "fx" : "ovation", "murmur", ou null.
Réponds UNIQUEMENT en JSON : {"lines":[{"member":"id","vo":"...","fr":"..."},...],"deltas":{...},"dida":null,"fx":null}`;
  const userMsg = `CAUSE : ${cause.slice(0, 300)}
TOUR : ${round}/3
CONVICTIONS : ${JSON.stringify(convictions || {})}
TRANSCRIPTION : ${history || '(début)'}

ARGUMENT : ${argument.slice(0, 600)}`;

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${mistralKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error?.message || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
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
  const [imgFail, setImgFail] = useState({});
  const [needMistralKey, setNeedMistralKey] = useState(false);
  const [mistralKeyInput, setMistralKeyInput] = useState('');

  const audioRef = useRef(null);
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

    // Sans clé serveur ni clé locale, proposer la saisie
    if (!getLocalKey()) {
      fetch('/api/tts').then(r => r.json()).then(d => {
        if (d && d.cle_configuree === false) setNeedKey(true);
      }).catch(() => {});
    }

    setPhase('cause');
  }, []);

  const playLine = useCallback((line, url) => new Promise(resolve => {
    setCurrent(line);
    const minDur = Math.max(3400, (line.fr || '').length * 60);
    const player = voicePlayerRef.current;
    if (url && player) {
      let done = false;
      const finish = () => { if (!done) { done = true; setTimeout(resolve, 800); } };
      player.onended = finish;
      player.src = url;
      player.volume = 0.92;
      player.play().catch(() => setTimeout(resolve, minDur));
      setTimeout(finish, 20000);   // garde-fou
    } else {
      setTimeout(resolve, minDur);
    }
  }), []);

  const runRound = useCallback(async (argumentText, currentRound, currentCause) => {
    setGameError(null);
    setPhase('playing');
    setCurrent({ dida: currentRound === 1
      ? 'La salle se tait. Vous montez à la tribune.'
      : 'L’assemblée pèse vos mots…' });

    let data;
    try {
      data = await callTribuneAPI(currentCause, argumentText, transcriptRef.current, convictionsRef.current, currentRound);
      if (!Array.isArray(data.lines)) throw new Error(‘reponse malformee’);
    } catch (err) {
      const msg = String(err.message || err);
      setGameError(`${msg}`);
      setNeedMistralKey(true);
      setPhase(‘speak’);
      return;
    }

    // Synthèse des voix en parallèle (2 répliques max)
    const urls = await Promise.all(
      data.lines.map(l => fetchVoice(l.vo, memberById(l.member)?.voice))
    );

    if (abortRef.current) return;

    for (let k = 0; k < data.lines.length; k++) {
      if (abortRef.current) return;
      await playLine(data.lines[k], urls[k]);
    }
    urls.forEach(u => { if (u) URL.revokeObjectURL(u); });

    if (data.fx === 'ovation') audioRef.current?.ovation(1);
    if (data.fx === 'murmur') audioRef.current?.murmurSwell();
    if (data.dida) {
      setCurrent({ dida: data.dida });
      await wait(2800);
    }

    // Mise à jour des convictions
    const next = { ...convictionsRef.current };
    for (const m of MEMBERS) {
      const d = Number(data.deltas?.[m.id] ?? 0);
      next[m.id] = clamp((next[m.id] ?? START_CONVICTION) + (Number.isFinite(d) ? d : 0), 0, 100);
    }
    convictionsRef.current = next;
    setConvictions(next);

    transcriptRef.current = [
      ...transcriptRef.current,
      { by: 'joueur', fr: argumentText },
      ...data.lines.map(l => ({ by: l.member, fr: l.fr })),
    ];

    setCurrent(null);
    setPhase('state');
    await wait(3600);
    if (abortRef.current) return;

    if (currentRound >= ROUNDS) {
      const convinced = MEMBERS.filter(m => next[m.id] >= CONVINCED_AT).length;
      if (convinced >= 4) audioRef.current?.ovation(1);
      else audioRef.current?.murmurSwell();
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
    runRound(c, 1, c);
  }, [causeInput, runRound]);

  const submitArg = useCallback(() => {
    const a = argInput.trim();
    if (a.length < 8) return;
    runRound(a, round, cause);
  }, [argInput, round, cause, runRound]);

  const replay = useCallback(() => {
    voicePlayerRef.current?.pause();
    setRound(1);
    setCause('');
    setCauseInput('');
    setArgInput('');
    setCurrent(null);
    setGameError(null);
    transcriptRef.current = [];
    setPhase('cause');
  }, []);

  const submitMistralKey = useCallback(() => {
    const k = mistralKeyInput.trim();
    if (!k) return;
    try { localStorage.setItem('mistral_key', k); } catch { /* ignore */ }
    setNeedMistralKey(false);
    setGameError(null);
    setMistralKeyInput('');
    // Relancer le round courant
    if (phase === 'speak' && round && cause && argInput) {
      runRound(argInput, round, cause);
    }
  }, [mistralKeyInput, phase, round, cause, argInput, runRound]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      abortRef.current = true;
      voicePlayerRef.current?.pause();
      audioRef.current?.dispose();
    };
  }, []);

  const speaker = current?.member ? memberById(current.member) : null;
  const convincedCount = MEMBERS.filter(m => (convictions[m.id] ?? 0) >= CONVINCED_AT).length;
  const won = convincedCount >= 4;

  const stance = v => v >= CONVINCED_AT ? 'convaincu·e' : v <= HOSTILE_AT ? 'hostile' : 'sceptique';

  return (
    <div className="tr-stage">
      {/* Le témoin qui parle : gros plan décalé sur noir absolu */}
      {phase === 'playing' && speaker && !imgFail[speaker.id] && (
        <div key={`${speaker.id}-${current.fr}`} className={`tr-witness tr-witness-${speaker.side}`}>
          <img
            src={speaker.photo}
            alt=""
            loading="eager"
            onError={() => setImgFail(f => ({ ...f, [speaker.id]: true }))}
          />
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
        </div>
      )}

      {/* Porte d'entrée */}
      {phase === 'door' && (
        <div className="tr-door">
          <div className="tr-door-title">LA TRIBUNE</div>
          <div className="tr-door-sub">TROIS TOURS. CONVAINCRE — OU REDESCENDRE.</div>
          <button className="tr-door-btn" onClick={enter}>Monter à la tribune</button>
          <div className="tr-door-note">6 témoins · voix réelles · le jeu</div>
        </div>
      )}

      {/* Saisie de la cause */}
      {phase === 'cause' && (
        <div className="tr-door">
          <div className="tr-form-label">VOTRE CAUSE, CAMARADE</div>
          <textarea
            className="tr-textarea"
            rows={2}
            maxLength={280}
            placeholder="Ex. : la réquisition des logements vides, la semaine de 30 heures…"
            value={causeInput}
            onChange={e => setCauseInput(e.target.value)}
            autoFocus
          />
          <button className="tr-door-btn" onClick={submitCause} disabled={causeInput.trim().length < 8}>
            Défendre cette cause
          </button>
          {needMistralKey && (
            <div className="tr-keyform">
              <div className="tr-door-note">Mistral indisponible : colle ta clé API (elle reste dans ton navigateur)</div>
              <input
                className="tr-keyinput"
                type="password"
                placeholder="sk_…"
                value={mistralKeyInput}
                onChange={e => setMistralKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitMistralKey(); }}
              />
              <div className="tr-keyrow">
                <button className="tr-end-btn" onClick={submitMistralKey}>Valider Mistral</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saisie de l'argument du tour */}
      {phase === 'speak' && (
        <div className="tr-door">
          <div className="tr-form-round">TOUR {round} / {ROUNDS}</div>
          <div className="tr-form-label">L'ASSEMBLÉE ATTEND VOTRE RÉPONSE</div>
          {transcriptRef.current.length > 0 && (
            <div className="tr-lastwords">
              {transcriptRef.current.slice(-2).filter(t => t.by !== 'joueur').map((t, i) => (
                <div key={i} className="tr-lastword">
                  <span className="tr-lastword-name">{memberById(t.by)?.name || t.by}</span> — {t.fr}
                </div>
              ))}
            </div>
          )}
          <textarea
            className="tr-textarea"
            rows={3}
            maxLength={600}
            placeholder="Votre argument…"
            value={argInput}
            onChange={e => setArgInput(e.target.value)}
            autoFocus
          />
          <button className="tr-door-btn" onClick={submitArg} disabled={argInput.trim().length < 8}>
            À la tribune
          </button>
          {gameError && (
            <div>
              <div className="tr-load-error">{gameError}</div>
              {needMistralKey && (
                <div className="tr-keyform">
                  <div className="tr-door-note">Colle ta clé Mistral (elle reste dans ton navigateur)</div>
                  <input
                    className="tr-keyinput"
                    type="password"
                    placeholder="sk_…"
                    value={mistralKeyInput}
                    onChange={e => setMistralKeyInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitMistralKey(); }}
                  />
                  <div className="tr-keyrow">
                    <button className="tr-end-btn" onClick={submitMistralKey}>Valider</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* État de l'assemblée entre les tours */}
      {phase === 'state' && (
        <div className="tr-door">
          <div className="tr-form-label">L'ÉTAT DE L'ASSEMBLÉE</div>
          <div className="tr-statecard">
            {MEMBERS.map(m => (
              <div key={m.id} className="tr-staterow">
                <span className="tr-state-name">{m.name}</span>
                <span className="tr-state-bar">
                  <span className="tr-state-fill" style={{ width: `${convictions[m.id] ?? START_CONVICTION}%` }} />
                </span>
                <span className={'tr-state-stance s-' + stance(convictions[m.id] ?? START_CONVICTION).slice(0, 4)}>
                  {stance(convictions[m.id] ?? START_CONVICTION)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdict */}
      {phase === 'verdict' && (
        <div className="tr-endcard">
          <div className="tr-end-title">{won ? 'L’ASSEMBLÉE SE LÈVE' : convincedCount === 3 ? 'LA SALLE EST PARTAGÉE' : 'REDESCENDS, CAMARADE'}</div>
          <div className="tr-end-sub">{convincedCount} témoin{convincedCount > 1 ? 's' : ''} sur 6 convaincu{convincedCount > 1 ? 's' : ''} — « {cause} »</div>
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
