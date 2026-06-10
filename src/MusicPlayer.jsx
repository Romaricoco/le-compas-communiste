import { useState, useRef } from 'react';

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

function scheduleMelody(ctx, masterGain, startTime) {
  let t = startTime;
  MELODY.forEach(([freq, beats]) => {
    const dur = beats * BEAT;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(1, t + 0.02);
    env.gain.setValueAtTime(1, t + dur - 0.06);
    env.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(env);
    env.connect(masterGain);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  });
  return t;
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const ctxRef = useRef(null);
  const gainRef = useRef(null);
  const loopRef = useRef(null);

  const stop = () => {
    clearTimeout(loopRef.current);
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; gainRef.current = null; }
    setPlaying(false);
  };

  const start = async () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();
    const master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    ctxRef.current = ctx;
    gainRef.current = master;

    const loop = (when) => {
      const end = scheduleMelody(ctx, master, when);
      const delay = (end - ctx.currentTime) * 1000 - 300;
      loopRef.current = setTimeout(() => loop(end), Math.max(0, delay));
    };
    loop(ctx.currentTime + 0.05);
    setPlaying(true);
  };

  const toggle = () => playing ? stop() : start();

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (gainRef.current) gainRef.current.gain.value = v;
  };

  return (
    <div className="music-player">
      <button className="music-btn" onClick={toggle} title={playing ? 'Pause musique' : "♫ L'Internationale"}>
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
