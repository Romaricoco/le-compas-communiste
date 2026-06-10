import { useState, useEffect } from 'react';

const F4=349, G4=392, A4=440, Bb4=466, C5=523, D5=587, Eb5=622, F5=698;
const MELODY = [
  [F4,1],[F4,0.5],[G4,0.5],[A4,1],[Bb4,1],
  [A4,1],[G4,0.5],[A4,0.5],[Bb4,2],
  [Bb4,1],[Bb4,0.5],[C5,0.5],[D5,1],[C5,1],
  [Bb4,1],[A4,0.5],[Bb4,0.5],[C5,2],
  [C5,1],[C5,0.5],[D5,0.5],[Eb5,1],[D5,1],
  [C5,1],[Bb4,0.5],[C5,0.5],[D5,2],
  [D5,1],[C5,0.5],[Bb4,0.5],[A4,1],[G4,1],
  [F4,4],
  [F5,1],[F5,0.5],[F5,0.5],[F5,1],[Eb5,1],
  [D5,1],[C5,0.5],[D5,0.5],[Eb5,2],
  [Eb5,1],[D5,0.5],[C5,0.5],[D5,1],[C5,1],
  [Bb4,4],
  [C5,1],[C5,0.5],[C5,0.5],[C5,1],[Bb4,1],
  [A4,1],[G4,0.5],[A4,0.5],[Bb4,2],
  [Bb4,1],[C5,0.5],[D5,0.5],[C5,1],[Bb4,1],
  [F4,4],
];
const BPM = 84;
const BEAT = 60 / BPM;

let _ctx = null, _master = null, _timer = null;

function scheduleLoop(when) {
  let t = when;
  MELODY.forEach(([freq, beats]) => {
    const dur = beats * BEAT;
    const osc = _ctx.createOscillator();
    const env = _ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.02);
    env.gain.setValueAtTime(1, t + dur - 0.05);
    env.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(env);
    env.connect(_master);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  });
  _timer = setTimeout(() => scheduleLoop(t), (t - _ctx.currentTime) * 1000 - 300);
}

async function audioStart(vol = 0.3) {
  if (_ctx) return;
  _ctx = new AudioContext();
  await _ctx.resume();
  _master = _ctx.createGain();
  _master.gain.value = vol;
  _master.connect(_ctx.destination);
  scheduleLoop(_ctx.currentTime + 0.05);
}

function audioStop() {
  clearTimeout(_timer);
  if (_ctx) { _ctx.close(); _ctx = null; _master = null; }
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);

  useEffect(() => {
    const unlock = () => {
      audioStart(0.3).then(() => setPlaying(true));
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const toggle = () => {
    if (playing) {
      audioStop();
      setPlaying(false);
    } else {
      audioStart(volume).then(() => setPlaying(true));
    }
  };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (_master) _master.gain.value = v;
  };

  return (
    <div className="music-player">
      <button className="music-btn" onClick={toggle} title={playing ? 'Couper la musique' : "♫ L'Internationale"}>
        {playing ? '⏸' : '♫'}
      </button>
      {playing && (
        <input
          className="music-volume"
          type="range" min="0" max="0.6" step="0.02"
          value={volume}
          onChange={handleVolume}
          title="Volume"
        />
      )}
    </div>
  );
}
