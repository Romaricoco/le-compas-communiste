import { useCallback, useEffect, useRef, useState } from 'react';
import SovietHall from './SovietHall.jsx';
import { CAST, byId, indexOf, ROUNDS, START, CONVINCED_AT, WIN_AT, stance } from './tribune/cast.js';
import { fetchVoice, initVoices, speakBrowser, hush } from './tribune/voice.js';
import { createHallAudio } from './tribune/audio.js';
import './Tribune.css';

/* ══════════════════════════════════════════════════════════
   LA TRIBUNE
   Tu es à la tribune. Au premier rang, six délégués : celui qui
   parle se lève et entre dans la lumière, les autres se tournent
   vers lui. Leur conviction se lit sur leur chevalet, en direct.
   Cinq tours pour en convaincre quatre.
   ══════════════════════════════════════════════════════════ */

const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const fem = id => byId(id)?.gender === 'female';
const stanceLabel = (v, id) => {
  const s = stance(v);
  return fem(id) && s === 'convaincu' ? 'convaincue' : s;
};

const OPENING = { by: 'felix', fr: 'Camarades, la séance est ouverte ! Toi, à la tribune : quelle cause viens-tu défendre ?' };

const getMistralKey = () => {
  try { return localStorage.getItem('mistral_key') || ''; } catch { return ''; }
};

async function deliberate(payload) {
  const headers = { 'Content-Type': 'application/json' };
  const key = getMistralKey();
  if (key) headers['X-Mistral-Key'] = key;
  const res = await fetch('/api/tribune', { method: 'POST', headers, body: JSON.stringify(payload) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error([j.error, j.detail].filter(Boolean).join(' — ') || `HTTP ${res.status}`);
  return j;
}

/* Réplique qui s'écrit au rythme de la parole */
function Caption({ line, asking }) {
  const [n, setN] = useState(0);
  const text = line.fr || '';
  useEffect(() => {
    // calé sur l'horloge, pas sur le nombre de ticks : si l'appareil
    // rame, le texte rattrape son retard au lieu de rester bloqué
    const t0 = performance.now();
    setN(0);
    const id = setInterval(() => {
      const k = Math.min(text.length, Math.floor((performance.now() - t0) * 0.042));
      setN(k);
      if (k >= text.length) clearInterval(id);
    }, 40);
    return () => clearInterval(id);
  }, [text]);
  const m = byId(line.member);
  const to = line.to && line.to !== 'joueur' ? byId(line.to)?.name : null;
  return (
    <div
      className={'as-cap' + (asking ? ' as-cap-ask' : '')}
      style={{ '--i': indexOf(line.member), '--h': m?.height ?? 1 }}
    >
      <div className="as-cap-who">
        {m?.name}
        {to && <span className="as-cap-to"> → {to}</span>}
        {line.to === 'joueur' && <span className="as-cap-to"> → toi</span>}
      </div>
      <div className="as-cap-text">{text.slice(0, n)}<span className="as-cap-rest">{text.slice(n)}</span></div>
    </div>
  );
}

export default function Tribune({ onExit }) {
  // door → input → debate → (input …) → verdict
  const [phase, setPhase] = useState('door');
  const [round, setRound] = useState(0);         // 0 = la cause
  const [cause, setCause] = useState('');
  const [text, setText] = useState('');
  const [conv, setConv] = useState(() => Object.fromEntries(CAST.map(c => [c.id, START])));
  const [line, setLine] = useState(null);        // réplique en cours { member, to, fr }
  const [asking, setAsking] = useState(null);    // question en attente { by, fr }
  const [playerLine, setPlayerLine] = useState('');
  const [dida, setDida] = useState(null);
  const [react, setReact] = useState('');        // ovation | rire | murmure | chatter
  const [deltas, setDeltas] = useState(null);
  const [aside, setAside] = useState(-1);        // un délégué qui glisse un mot à son voisin
  const [error, setError] = useState(null);
  const [needKey, setNeedKey] = useState(false);
  const [keyInput, setKeyInput] = useState('');

  const hallRef = useRef(null);
  const audioRef = useRef(null);
  const playerRef = useRef(null);
  const convRef = useRef(conv);
  const transcriptRef = useRef([]);
  const skipRef = useRef(null);
  const deadRef = useRef(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
      deadRef.current = true;
      playerRef.current?.pause();
      hush();
      audioRef.current?.dispose();
    };
  }, []);

  /* Fait parler un délégué : voix ElevenLabs si dispo, sinon celle du
     navigateur ; un tap sur l'écran passe à la suite. */
  const say = useCallback((ln, url) => new Promise(resolve => {
    const minDur = Math.max(2200, ln.fr.length * 55);
    let done = false;
    const finish = (delay = 0) => {
      if (done) return;
      done = true;
      skipRef.current = null;
      setTimeout(resolve, delay);
    };
    skipRef.current = () => { hush(); playerRef.current?.pause(); finish(80); };
    const player = playerRef.current;
    if (url && player) {
      player.onended = () => finish(500);
      player.src = url;
      player.play().catch(() => setTimeout(() => finish(), minDur));
      setTimeout(() => finish(), 22000);
    } else {
      const t0 = Date.now();
      speakBrowser(ln.fr, byId(ln.member)).then(ok => {
        const el = Date.now() - t0;
        finish(ok ? 450 : Math.max(200, minDur - el));
      });
    }
  }), []);

  const ask = useCallback(q => {
    setAsking(q);
    setPhase('input');
    speakBrowser(q.fr, byId(q.by));
  }, []);

  const enter = useCallback(() => {
    audioRef.current = createHallAudio();
    // iOS : un seul lecteur débloqué pendant le geste, réutilisé ensuite
    const p = new Audio();
    p.playsInline = true;
    p.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    p.play().catch(() => {});
    playerRef.current = p;
    initVoices();
    audioRef.current?.gavel(3);
    hallRef.current?.murmur();
    setTimeout(() => ask(OPENING), 1000);
  }, [ask]);

  const runRound = useCallback(async (argument, r, theCause) => {
    setError(null);
    setAsking(null);
    setPhase('debate');
    setPlayerLine(argument);
    setLine(null);
    setDida(null);
    setReact('chatter');
    hallRef.current?.murmur();

    let data;
    try {
      data = await deliberate({
        cause: theCause, argument, round: r, rounds: ROUNDS,
        transcript: transcriptRef.current, convictions: convRef.current,
      });
    } catch (err) {
      const msg = String(err.message || err);
      setReact('');
      setError(/401|403|aucune clé|unauthorized/i.test(msg)
        ? `Clé Mistral refusée ou absente — ${msg.slice(0, 120)}`
        : `L’assemblée n’a pas pu délibérer : ${msg.slice(0, 140)}`);
      if (/401|403|aucune clé|unauthorized/i.test(msg)) setNeedKey(true);
      setAsking(r === 1 ? OPENING : { by: 'felix', fr: 'Reprends, camarade, on ne t’a pas entendu.' });
      setPhase('input');
      return;
    }

    const urls = await Promise.all(data.lines.map(l => fetchVoice(l.fr, byId(l.member)?.voice)));
    if (deadRef.current) return;
    setReact('');

    for (let k = 0; k < data.lines.length; k++) {
      if (deadRef.current) return;
      const ln = data.lines[k];
      setLine(ln);
      if (ln.member === 'roberto') hallRef.current?.murmur();
      await say(ln, urls[k]);
    }
    urls.forEach(u => u && URL.revokeObjectURL(u));
    setLine(null);

    // la salle réagit
    if (data.fx) {
      setReact(data.fx);
      if (data.fx === 'ovation') { audioRef.current?.ovation(1); hallRef.current?.ovation(); }
      if (data.fx === 'rire') { audioRef.current?.laughter(1); hallRef.current?.murmur(); }
      if (data.fx === 'murmure') { audioRef.current?.grumble(); hallRef.current?.murmur(); }
    }
    if (data.dida) setDida(data.dida);

    // les convictions bougent, et ça se voit sur chacun
    const next = { ...convRef.current };
    CAST.forEach(c => { next[c.id] = clamp(next[c.id] + (data.deltas?.[c.id] || 0), 0, 100); });
    convRef.current = next;
    setConv(next);
    setDeltas(data.deltas || null);
    const avg = CAST.reduce((s, c) => s + next[c.id], 0) / CAST.length;
    hallRef.current?.setIntensity(avg / 100);

    transcriptRef.current = [
      ...transcriptRef.current,
      { by: 'joueur', fr: argument },
      ...data.lines.map(l => ({ by: l.member, fr: l.fr })),
    ];

    await wait(2800);
    if (deadRef.current) return;
    setReact('');
    setDeltas(null);
    setDida(null);

    if (r >= ROUNDS) {
      const won = CAST.filter(c => next[c.id] >= CONVINCED_AT).length >= WIN_AT;
      if (won) { audioRef.current?.ovation(1.2); hallRef.current?.ovation(); hallRef.current?.setIntensity(1); setReact('ovation'); }
      else { audioRef.current?.grumble(); hallRef.current?.murmur(); }
      setPhase('verdict');
      return;
    }
    setRound(r + 1);
    ask(data.question || { by: 'felix', fr: 'La parole est à toi, camarade.' });
  }, [say, ask]);

  const submit = useCallback(() => {
    const t = text.trim();
    if (t.length < 4 || phase !== 'input') return;
    hush();
    setText('');
    if (round === 0) {
      setCause(t);
      const init = Object.fromEntries(CAST.map(c => [c.id, START]));
      convRef.current = init;
      setConv(init);
      transcriptRef.current = [];
      setRound(1);
      runRound(t, 1, t);
    } else {
      runRound(t, round, cause);
    }
  }, [text, phase, round, cause, runRound]);

  const replay = useCallback(() => {
    playerRef.current?.pause();
    hush();
    setRound(0);
    setCause('');
    setReact('');
    setPlayerLine('');
    const init = Object.fromEntries(CAST.map(c => [c.id, START]));
    convRef.current = init;
    setConv(init);
    hallRef.current?.setIntensity(0.25);
    audioRef.current?.gavel(2);
    ask(OPENING);
  }, [ask]);

  const saveKey = useCallback(() => {
    const k = keyInput.trim();
    if (!k) return;
    try { localStorage.setItem('mistral_key', k); } catch { /* rien */ }
    setNeedKey(false);
    setError('Clé enregistrée — renvoie ta réponse.');
  }, [keyInput]);

  const forgetKey = useCallback(() => {
    try { localStorage.removeItem('mistral_key'); } catch { /* rien */ }
    setNeedKey(false);
    setError('Clé collée oubliée — le site utilisera sa propre clé.');
  }, []);

  // pendant que tu écris, la salle ne se fige pas : quelqu'un glisse
  // un mot à son voisin, un autre s'agite
  useEffect(() => {
    if (phase !== 'input' && phase !== 'door') return;
    const id = setInterval(() => {
      setAside(Math.random() < 0.7 ? Math.floor(Math.random() * CAST.length) : -1);
    }, 2600);
    return () => clearInterval(id);
  }, [phase]);

  const focusId = line?.member || asking?.by || null;
  const focusIdx = focusId ? indexOf(focusId) : -1;
  const convinced = CAST.filter(c => conv[c.id] >= CONVINCED_AT).length;
  const won = convinced >= WIN_AT;

  return (
    <div className={`as-stage phase-${phase}`} onClick={phase === 'debate' ? () => skipRef.current?.() : undefined}>
      <SovietHall ref={hallRef} />
      <div className="as-shade" />

      {/* bandeau du haut */}
      {phase !== 'door' && (
        <header className="as-top">
          <div className="as-top-left">LA TRIBUNE{round > 0 && <> · TOUR {Math.min(round, ROUNDS)}/{ROUNDS}</>}</div>
          {cause && <div className="as-top-cause">« {cause} »</div>}
          <div className="as-top-right">
            <span className={convinced >= WIN_AT ? 'ok' : ''}>{convinced}/6 convaincus</span>
            <span className="as-top-need"> · il en faut {WIN_AT}</span>
          </div>
        </header>
      )}

      {/* ce que tu viens de dire, pendant que l'assemblée répond */}
      {phase === 'debate' && playerLine && (
        <div className="as-player">
          <div className="as-player-who">Toi, à la tribune</div>
          <div className="as-player-text">« {playerLine} »</div>
          {react === 'chatter' && <div className="as-deliberate">l’assemblée s’agite…</div>}
        </div>
      )}

      {dida && <div className="as-dida">{dida}</div>}

      {/* le premier rang */}
      <div className={`as-front react-${react || 'none'}${phase === 'verdict' ? (won ? ' end-won' : ' end-lost') : ''}`}>
        <div className="as-row">
          {CAST.map((c, i) => {
            const speaking = focusId === c.id;
            const listening = focusIdx >= 0 && !speaking;
            const addressed = line && line.to === c.id;
            const d = deltas?.[c.id] || 0;
            const tilt = listening ? clamp((focusIdx - i) * 2.2, -7, 7) : 0;
            return (
              <div
                key={c.id}
                className={
                  'as-seat'
                  + (speaking ? ' is-speaking' : '')
                  + (listening ? ' is-listening' : '')
                  + (addressed ? ' is-addressed' : '')
                  + (aside === i && !focusId ? ' is-aside' : '')
                  + (d >= 6 ? ' gain' : d <= -6 ? ' loss' : '')
                }
                style={{ '--i': i, '--h': c.height, '--tilt': `${tilt}deg` }}
              >
                <img className="as-portrait" src={c.img} alt={c.name} draggable="false" />
                {deltas && d !== 0 && (
                  <div className={'as-delta ' + (d > 0 ? 'up' : 'down')}>{d > 0 ? `+${d}` : d}</div>
                )}
              </div>
            );
          })}
        </div>

        {line && <Caption line={line} />}
        {!line && asking && phase === 'input' && <Caption line={{ member: asking.by, to: 'joueur', fr: asking.fr }} asking />}

        {/* la balustrade drapée, avec le chevalet de chacun */}
        <div className="as-rail">
          {CAST.map(c => {
            const v = conv[c.id];
            const st = stance(v);
            return (
              <div key={c.id} className={`as-plate s-${st}${focusId === c.id ? ' on' : ''}`}>
                <div className="as-plate-name">{c.name}</div>
                <div className="as-plate-bar">
                  <div className="as-plate-fill" style={{ width: `${v}%` }} />
                  <div className="as-plate-mark" />
                </div>
                <div className="as-plate-stance">{stanceLabel(v, c.id)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* porte d'entrée */}
      {phase === 'door' && (
        <div className="as-door">
          <div className="as-door-kicker">Le Compas communiste présente</div>
          <h1 className="as-door-title">La Tribune</h1>
          <p className="as-door-sub">Six délégués. Cinq tours. Convaincs-en quatre — ou redescends.</p>
          <button className="as-btn as-btn-red" onClick={enter}>Monter à la tribune</button>
        </div>
      )}

      {/* ta réponse */}
      {phase === 'input' && (
        <div className="as-input" onClick={e => e.stopPropagation()}>
          <label className="as-input-label">{round === 0 ? 'Ta cause' : 'Ta réponse'}</label>
          <div className="as-input-row">
            <textarea
              className="as-input-text"
              rows={2}
              maxLength={round === 0 ? 280 : 600}
              placeholder={round === 0 ? 'Ex. : nationaliser les autoroutes' : 'Réponds à l’assemblée…'}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
              autoFocus
            />
            <button className="as-btn as-btn-red" onClick={submit} disabled={text.trim().length < 4}>Parler</button>
          </div>
          {error && <div className="as-error">{error}</div>}
          {needKey && (
            <div className="as-key">
              <span>Colle ta clé API Mistral (console.mistral.ai → API Keys, elle reste dans ton navigateur) :</span>
              <input type="password" value={keyInput} onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveKey(); }} placeholder="clé Mistral…" />
              <button className="as-btn" onClick={saveKey}>Valider</button>
              {getMistralKey() && <button className="as-btn" onClick={forgetKey}>Oublier ma clé</button>}
            </div>
          )}
        </div>
      )}

      {/* verdict */}
      {phase === 'verdict' && (
        <div className="as-verdict">
          <div className="as-verdict-title">{won ? 'L’assemblée se lève !' : convinced === WIN_AT - 1 ? 'La salle est partagée' : 'Redescends, camarade'}</div>
          <div className="as-verdict-sub">{convinced} délégué{convinced > 1 ? 's' : ''} sur 6 convaincu{convinced > 1 ? 's' : ''} — « {cause} »</div>
          <div className="as-verdict-btns">
            <button className="as-btn as-btn-red" onClick={replay}>Défendre une autre cause</button>
            {onExit && <button className="as-btn" onClick={onExit}>Quitter la salle</button>}
          </div>
        </div>
      )}

      {phase === 'debate' && <div className="as-skip">toucher l’écran pour passer</div>}
      {onExit && <button className="as-quit" onClick={e => { e.stopPropagation(); onExit(); }}>Quitter ✕</button>}
    </div>
  );
}
