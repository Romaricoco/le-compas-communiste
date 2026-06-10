import { useState, useRef } from 'react';

// L'Internationale — notes (frequency in Hz) and durations (in beats)
// Simplified melody, key of F major
const F4=349, G4=392, A4=440, Bb4=466, C5=523, D5=587, Eb5=622, F5=698;
const MELODY = [
  // "Debout les damnés de la terre"
  [F4,1],[F4,0.5],[G4,0.5],[A4,1],[Bb4,1],
  [A4,1],[G4,0.5],[A4,0.5],[Bb4,2],
  [Bb4,1],[Bb4,0.5],[C5,0.5],[D5,1],[C5,1],
  [Bb4,1],[A4,0.5],[Bb4,0.5],[C5,2],
  // "Debout les forçats de la faim"
  [C5,1],[C5,0.5],[D5,0.5],[Eb5,1],[D5,1],
  [C5,1],[Bb4,0.5],[C5,0.5],[D5,2],
  [D5,1],[C5,0.5],[Bb4,0.5],[A4,1],[G4,1],
  [F4,4],
  // Refrain: "C'est la lutte finale"
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

function playMelody(ctx, startTime, gain) {
  let t = startTime;
  MELODY.forEach(([freq, beats]) => {
    const dur = beats * BEAT;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.02);
    env.gain.setValueAtTime(gain, t + dur - 0.06);
    env.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(env);
    env.connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur);
    t += dur;
  });
  return t; // returns end time for looping
}

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const ctxRef = useRef(null);
  const loopRef = useRef(null);
  const volRef = useRef(volume);
  volRef.current = volume;

  const stop = () => {
    clearTimeout(loopRef.current);
    if (ctxRef.current) { ctxRef.current.close(); ctxRef.current = null; }
    setPlaying(false);
  };

  const start = () => {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    ctxRef.current = ctx;

    const loop = (when) => {
      const end = playMelody(ctx, when, volRef.current);
      const delay = (end - ctx.currentTime) * 1000 - 200;
      loopRef.current = setTimeout(() => loop(end), Math.max(0, delay));
    };
    loop(ctx.currentTime + 0.1);
    setPlaying(true);
  };

  const toggle = () => playing ? stop() : start();

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
          onChange={e => setVolume(Number(e.target.value))}
          title="Volume"
        />
      )}
    </div>
  );
}
