import { useState, useEffect, useRef } from 'react';

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.4);
  const audioRef = useRef(null);

  useEffect(() => {
    const audio = new Audio('/music.mp3');
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;
    return () => { audio.pause(); audio.src = ''; };
  }, []);

  useEffect(() => {
    const unlock = () => {
      if (audioRef.current && !playing) {
        audioRef.current.play().then(() => setPlaying(true)).catch(() => {});
      }
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
    return () => {
      document.removeEventListener('click', unlock);
      document.removeEventListener('touchstart', unlock);
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
    }
  };

  const handleVolume = (e) => {
    const v = Number(e.target.value);
    setVolume(v);
    if (audioRef.current) audioRef.current.volume = v;
  };

  return (
    <div className="music-player">
      <button className="music-btn" onClick={toggle} title={playing ? 'Couper la musique' : '♫ La Lutte Finale'}>
        {playing ? '⏸' : '♫'}
      </button>
      {playing && (
        <input
          className="music-volume"
          type="range" min="0" max="1" step="0.05"
          value={volume}
          onChange={handleVolume}
          title="Volume"
        />
      )}
    </div>
  );
}
