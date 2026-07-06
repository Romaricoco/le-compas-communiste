import { useEffect, useRef, useState, useCallback } from 'react';
import './Tribune.css';

/* ══════════════════════════════════════════════════════════
   LA TRIBUNE — maquette d'ambiance (v0)
   Salle sombre · assemblée internationale · sous-titres
   ══════════════════════════════════════════════════════════ */

const photoUrl = id => `https://unsplash.com/photos/${id}/download?force=true&w=640`;

const MEMBERS = [
  { id: 'olga',  name: 'Olga',  lang: 'Русский',  role: 'vétérane syndicaliste', photo: photoUrl('cwZGbT9S2HU') },
  { id: 'diego', name: 'Diego', lang: 'Español',  role: 'jeune anarchiste',      photo: photoUrl('ApDREtVkv5Y') },
  { id: 'wei',   name: 'Wei',   lang: '中文',      role: 'matérialiste',          photo: photoUrl('8ukPkmUuSd8') },
  { id: 'amara', name: 'Amara', lang: 'العربية',   role: 'internationaliste',     photo: photoUrl('4cA1jDfaVJU') },
  { id: 'john',  name: 'John',  lang: 'English',  role: 'ouvrier sceptique',     photo: photoUrl('oULrOWE8R5U') },
  { id: 'greta', name: 'Greta', lang: 'Deutsch',  role: 'intellectuelle',        photo: photoUrl('RoV_LoLtZWU') },
];

const SCRIPT = [
  { dida: true, fr: 'La salle se tait. Vous montez sur le ring.', dur: 4600 },
  { sp: 'olga',  vo: 'Ну, послушаем. Но у нас мало времени, товарищ.', fr: 'Bien. Écoutons. Mais nous avons peu de temps, camarade.', dur: 5400 },
  { sp: 'john',  vo: 'Words are cheap. Show us where the money goes.', fr: 'Les mots ne coûtent rien. Montre-nous où va l’argent.', dur: 5000 },
  { sp: 'wei',   vo: '先说清楚：生产资料掌握在谁手里？', fr: 'Commence par le plus clair : qui détient les moyens de production ?', dur: 5600 },
  { sp: 'diego', vo: '¡Y sin jefes! Ni los tuyos, ni los nuestros.', fr: 'Et sans chefs ! Ni les tiens, ni les nôtres.', dur: 4600 },
  { dida: true, fr: '(Murmures dans l’assemblée)', fx: 'murmur', dur: 3400 },
  { sp: 'amara', vo: 'من طنجة إلى جاكرتا، المعركة واحدة.', fr: 'De Tanger à Jakarta, c’est la même bataille.', dur: 5200 },
  { dida: true, fr: '(La salle éclate — hourras, poings sur les tables)', fx: 'ovation', dur: 4600 },
  { sp: 'greta', vo: 'Die Widersprüche interessieren mich. Ihre auch.', fr: 'Les contradictions m’intéressent. Y compris les vôtres.', dur: 5200 },
  { dida: true, fr: 'Bientôt, vous aurez la parole.', dur: 5000 },
];

/* ── Moteur audio (Web Audio, tout est synthétisé) ────── */
function createAudioEngine() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  // Bruit rose partagé (2 s, bouclé)
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    data[i] = last * 3.2;
  }
  const noiseSrc = () => {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
  };

  // Nappe de fond : souffle grave de grand hall
  const room = noiseSrc();
  const roomF = ctx.createBiquadFilter();
  roomF.type = 'lowpass';
  roomF.frequency.value = 130;
  const roomG = ctx.createGain();
  roomG.gain.value = 0.4;
  room.connect(roomF); roomF.connect(roomG); roomG.connect(master);
  room.start();

  // Murmures : bruit filtré en bande, fluctuant
  const mur = noiseSrc();
  const murF = ctx.createBiquadFilter();
  murF.type = 'bandpass';
  murF.frequency.value = 620;
  murF.Q.value = 0.9;
  const murG = ctx.createGain();
  murG.gain.value = 0.012;
  mur.connect(murF); murF.connect(murG); murG.connect(master);
  mur.start();
  const flutter = setInterval(() => {
    murG.gain.setTargetAtTime(0.008 + Math.random() * 0.014, ctx.currentTime, 0.9);
  }, 1700);

  // Battement sourd, très lent
  const thump = () => {
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(52, t);
    o.frequency.exponentialRampToValueAtTime(37, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.5);
  };
  const beat = setInterval(() => { thump(); setTimeout(thump, 330); }, 3100);

  // Montée de murmures (la salle réagit)
  const murmurSwell = () => {
    murG.gain.setTargetAtTime(0.075, ctx.currentTime, 0.35);
    setTimeout(() => murG.gain.setTargetAtTime(0.014, ctx.currentTime, 1.4), 2400);
  };

  // Hourras : rugissement de foule + salve d'applaudissements
  const ovation = (intensity = 1) => {
    const t0 = ctx.currentTime;
    const roar = noiseSrc();
    const rf = ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.frequency.setValueAtTime(420, t0);
    rf.frequency.linearRampToValueAtTime(700, t0 + 1.2);
    rf.Q.value = 0.55;
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0);
    rg.gain.exponentialRampToValueAtTime(0.16 * intensity, t0 + 0.45);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.2);
    roar.connect(rf); rf.connect(rg); rg.connect(master);
    roar.start(t0); roar.stop(t0 + 3.4);

    const claps = Math.floor(56 * intensity);
    for (let i = 0; i < claps; i++) {
      const t = t0 + 0.15 + Math.random() * 2.4;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1400 + Math.random() * 1700;
      f.Q.value = 1.6;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04 + Math.random() * 0.05, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);
      s.connect(f); f.connect(g); g.connect(master);
      s.start(t, Math.random() * 1.6, 0.09);
    }
  };

  const dispose = () => {
    clearInterval(flutter);
    clearInterval(beat);
    ctx.close().catch(() => {});
  };

  return { murmurSwell, ovation, dispose };
}

export default function Tribune({ onExit }) {
  const [phase, setPhase] = useState('door');   // door | scene
  const [line, setLine] = useState(null);
  const [ended, setEnded] = useState(false);
  const [take, setTake] = useState(0);          // rejouer la scène
  const [imgFail, setImgFail] = useState({});
  const audioRef = useRef(null);

  const enter = useCallback(() => {
    audioRef.current = createAudioEngine();
    setPhase('scene');
  }, []);

  const replay = useCallback(() => {
    setEnded(false);
    setLine(null);
    setTake(t => t + 1);
  }, []);

  // Déroulé de la séquence
  useEffect(() => {
    if (phase !== 'scene') return;
    let idx = 0;
    let tid = null;
    const next = () => {
      if (idx >= SCRIPT.length) {
        setLine(null);
        setEnded(true);
        return;
      }
      const l = SCRIPT[idx];
      setLine(l);
      if (l.fx === 'ovation') audioRef.current?.ovation(1);
      if (l.fx === 'murmur') audioRef.current?.murmurSwell();
      tid = setTimeout(() => { idx += 1; next(); }, l.dur);
    };
    const start = setTimeout(next, 2000);
    return () => { clearTimeout(start); clearTimeout(tid); };
  }, [phase, take]);

  // Nettoyage audio + scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      audioRef.current?.dispose();
    };
  }, []);

  const speaker = line?.sp ? MEMBERS.find(m => m.id === line.sp) : null;

  return (
    <div className="tr-stage">
      <div className="tr-spot" />
      <div className="tr-smoke" />
      <div className="tr-smoke2" />
      <div className="tr-ringlight" />

      {phase === 'scene' && (
        <div className="tr-assembly">
          {MEMBERS.map(m => (
            <div
              key={m.id}
              className={
                'tr-member' +
                (speaker?.id === m.id ? ' speaking' : '') +
                (speaker && speaker.id !== m.id ? ' dimmed' : '')
              }
            >
              {imgFail[m.id] ? (
                <div className="tr-silhouette" />
              ) : (
                <img
                  src={m.photo}
                  alt=""
                  loading="eager"
                  onError={() => setImgFail(f => ({ ...f, [m.id]: true }))}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="tr-ring">
        <div className="tr-rope" />
        <div className="tr-rope" />
        <div className="tr-rope" />
        <div className="tr-post tr-post-l" />
        <div className="tr-post tr-post-r" />
      </div>

      <div className="tr-vignette" />
      <div className="tr-grain" />
      <div className="tr-bar tr-bar-top" />
      <div className="tr-bar tr-bar-bottom" />

      {phase === 'scene' && line && (
        <div className="tr-subzone">
          {speaker && (
            <div className="tr-nameplate">{speaker.name} · {speaker.lang} · {speaker.role}</div>
          )}
          {line.vo && <div className="tr-vo" dir="auto">{line.vo}</div>}
          <div className={'tr-fr' + (line.dida ? ' dida' : '')}>{line.fr}</div>
        </div>
      )}

      {phase === 'door' && (
        <div className="tr-door">
          <div className="tr-door-title">LA TRIBUNE</div>
          <div className="tr-door-sub">CONVAINCRE — OU REDESCENDRE</div>
          <button className="tr-door-btn" onClick={enter}>Entrer dans la salle</button>
          <div className="tr-door-note">maquette d'ambiance · son activé · v0</div>
        </div>
      )}

      {ended && (
        <div className="tr-endcard">
          <div className="tr-end-title">FIN DE LA MAQUETTE</div>
          <div className="tr-end-sub">
            Le débat complet arrive : votre sujet, vos arguments,
            l'assemblée qui juge selon les principes du compas.
          </div>
          <button className="tr-end-btn" onClick={replay}>Rejouer la scène</button>
        </div>
      )}

      {onExit && (
        <button className="tr-exit" onClick={onExit}>Quitter la salle ✕</button>
      )}
    </div>
  );
}
