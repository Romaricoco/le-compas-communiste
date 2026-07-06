import { useEffect, useRef, useState, useCallback } from 'react';
import './Tribune.css';

/* ══════════════════════════════════════════════════════════
   LA TRIBUNE — dispositif « témoins » (Reds, 1981)
   Un visage en gros plan, décalé, sur noir absolu.
   Lumière frontale dure. Aucun décor. La parole nue.
   Les noms n'apparaissent qu'au générique final.
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

const SCRIPT = [
  { dida: true, fr: 'Ils se souviennent. Peut-être mal. Mais ils étaient là.', dur: 5200 },
  { sp: 'olga',  vo: 'Ну, послушаем. Но у нас мало времени, товарищ.', fr: 'Bien. Écoutons. Mais nous avons peu de temps, camarade.', dur: 5400 },
  { sp: 'john',  vo: 'Words are cheap. Show us where the money goes.', fr: 'Les mots ne coûtent rien. Montre-nous où va l’argent.', dur: 5000 },
  { sp: 'wei',   vo: '先说清楚：生产资料掌握在谁手里？', fr: 'Commence par le plus clair : qui détient les moyens de production ?', dur: 5600 },
  { sp: 'diego', vo: '¡Y sin jefes! Ni los tuyos, ni los nuestros.', fr: 'Et sans chefs ! Ni les tiens, ni les nôtres.', dur: 4600 },
  { dida: true, fr: '(Murmures, hors champ)', fx: 'murmur', dur: 3400 },
  { sp: 'amara', vo: 'من طنجة إلى جاكرتا، المعركة واحدة.', fr: 'De Tanger à Jakarta, c’est la même bataille.', dur: 5200 },
  { dida: true, fr: '(La salle éclate — hourras, poings sur les tables)', fx: 'ovation', dur: 4600 },
  { sp: 'greta', vo: 'Die Widersprüche interessieren mich. Ihre auch.', fr: 'Les contradictions m’intéressent. Y compris les vôtres.', dur: 5200 },
  { dida: true, fr: 'Bientôt, vous aurez la parole.', dur: 5000 },
];

/* ── ElevenLabs TTS ──────────────────────────────────────── */
async function fetchVoice(text, voiceId) {
  if (!voiceId) return { error: 'pas de voix définie' };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceId }),
      });
      if (res.ok) {
        const blob = await res.blob();
        return { url: URL.createObjectURL(blob) };
      }
      // 429 = trop de requêtes simultanées (plan gratuit) : on retente
      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      let detail = '';
      try { detail = (await res.json()).detail || ''; } catch { /* ignore */ }
      return { error: `HTTP ${res.status} ${detail}`.trim() };
    } catch (err) {
      return { error: `réseau : ${String(err).slice(0, 120)}` };
    }
  }
  return { error: 'HTTP 429 — trop de requêtes' };
}

/* File d'attente : max 2 requêtes simultanées (limite ElevenLabs) */
async function fetchAllVoices(items, onEach) {
  const queue = [...items];
  const workers = Array.from({ length: 2 }, async () => {
    while (queue.length) {
      const item = queue.shift();
      const result = await fetchVoice(item.text, item.voiceId);
      onEach(item, result);
    }
  });
  await Promise.all(workers);
}

/* ── Moteur audio de fond (Web Audio, synthétisé) ────────── */
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

  // Souffle de studio, très discret — le noir n'est jamais tout à fait silencieux
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

/* ── Composant ───────────────────────────────────────────── */
export default function Tribune({ onExit }) {
  const [phase, setPhase] = useState('door');   // door | loading | scene
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState(null);
  const [line, setLine] = useState(null);
  const [lineIdx, setLineIdx] = useState(-1);
  const [ended, setEnded] = useState(false);
  const [take, setTake] = useState(0);
  const [imgFail, setImgFail] = useState({});
  const audioRef = useRef(null);
  const voiceUrlsRef = useRef({});
  const voicePlayerRef = useRef(null);

  const enter = useCallback(async () => {
    audioRef.current = createAudioEngine();

    // iOS n'autorise le son que pendant un geste utilisateur :
    // on débloque UN lecteur ici (clic) et on le réutilise pour
    // toutes les voix de la scène.
    const player = new Audio();
    player.playsInline = true;
    player.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    player.play().catch(() => {});
    voicePlayerRef.current = player;

    setPhase('loading');

    const lines = SCRIPT
      .map((l, i) => ({ l, i }))
      .filter(({ l }) => l.sp && l.vo);

    const total = lines.length;
    let done = 0;
    const errors = [];
    const member = id => MEMBERS.find(m => m.id === id);

    await fetchAllVoices(
      lines.map(({ l, i }) => ({ text: l.vo, voiceId: member(l.sp)?.voice, idx: i, who: l.sp })),
      (item, result) => {
        if (result.url) voiceUrlsRef.current[item.idx] = result.url;
        else errors.push(`${item.who} : ${result.error}`);
        done++;
        setLoadProgress(Math.round((done / total) * 100));
      }
    );

    if (errors.length === total) {
      // Aucune voix : on affiche la cause à l'écran avant de continuer
      setLoadError(errors[0]);
      setTimeout(() => setPhase('scene'), 8000);
    } else {
      setPhase('scene');
    }
  }, []);

  const replay = useCallback(() => {
    voicePlayerRef.current?.pause();
    setEnded(false);
    setLine(null);
    setLineIdx(-1);
    setTake(t => t + 1);
  }, []);

  useEffect(() => {
    if (phase !== 'scene') return;
    let idx = 0;
    let tid = null;

    const playVoice = (i) => {
      const url = voiceUrlsRef.current[i];
      const player = voicePlayerRef.current;
      if (!url || !player) return;
      player.pause();
      player.src = url;
      player.volume = 0.92;
      player.play().catch(() => {});
    };

    const next = () => {
      if (idx >= SCRIPT.length) { setLine(null); setEnded(true); return; }
      const l = SCRIPT[idx];
      setLine(l);
      setLineIdx(idx);
      if (l.sp) playVoice(idx);
      if (l.fx === 'ovation') audioRef.current?.ovation(1);
      if (l.fx === 'murmur') audioRef.current?.murmurSwell();
      tid = setTimeout(() => { idx += 1; next(); }, l.dur);
    };

    const start = setTimeout(next, 2000);
    return () => { clearTimeout(start); clearTimeout(tid); voicePlayerRef.current?.pause(); };
  }, [phase, take]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      audioRef.current?.dispose();
      Object.values(voiceUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const speaker = line?.sp ? MEMBERS.find(m => m.id === line.sp) : null;

  return (
    <div className="tr-stage">
      {/* Le témoin : un seul visage, décalé, sur noir absolu */}
      {phase === 'scene' && speaker && !imgFail[speaker.id] && (
        <div key={`${speaker.id}-${lineIdx}`} className={`tr-witness tr-witness-${speaker.side}`}>
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

      {phase === 'scene' && line && (
        <div className={'tr-subzone' + (speaker ? ` tr-subzone-${speaker.side === 'l' ? 'r' : 'l'}` : '')}>
          {line.vo && <div className="tr-vo" dir="auto">{line.vo}</div>}
          <div className={'tr-fr' + (line.dida ? ' dida' : '')}>{line.fr}</div>
        </div>
      )}

      {phase === 'door' && (
        <div className="tr-door">
          <div className="tr-door-title">LA TRIBUNE</div>
          <div className="tr-door-sub">TÉMOINS — CONVAINCRE, OU REDESCENDRE</div>
          <button className="tr-door-btn" onClick={enter}>Entrer dans la salle</button>
          <div className="tr-door-note">6 langues · voix réelles · v2</div>
        </div>
      )}

      {phase === 'loading' && (
        <div className="tr-door">
          <div className="tr-door-title">CHARGEMENT DES VOIX</div>
          <div className="tr-load-bar">
            <div className="tr-load-fill" style={{ width: `${loadProgress}%` }} />
          </div>
          {loadError ? (
            <div className="tr-load-error">
              VOIX INDISPONIBLES — {loadError}
              <br />La scène continue en sous-titres.
            </div>
          ) : (
            <div className="tr-door-note">{loadProgress}% — synthèse multilingue en cours</div>
          )}
        </div>
      )}

      {ended && (
        <div className="tr-endcard">
          <div className="tr-end-title">LES TÉMOINS</div>
          <div className="tr-credits">
            {MEMBERS.map(m => (
              <div key={m.id} className="tr-credit-line">
                <span className="tr-credit-name">{m.name}</span>
                <span className="tr-credit-role">{m.role} · {m.lang}</span>
              </div>
            ))}
          </div>
          <div className="tr-end-sub">
            Le débat complet arrive : votre sujet, vos arguments,
            l’assemblée qui juge selon les principes du compas.
          </div>
          <button className="tr-end-btn" onClick={replay}>Rejouer la scène</button>
        </div>
      )}

      {onExit && (
        <button className="tr-exit" onClick={onExit}>Quitter ✕</button>
      )}
    </div>
  );
}
