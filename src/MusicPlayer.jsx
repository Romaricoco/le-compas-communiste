import { useState } from 'react';

export default function MusicPlayer() {
  const [playing, setPlaying] = useState(false);

  const test = async () => {
    try {
      const ctx = new AudioContext();
      await ctx.resume();
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      g.gain.value = 0.3;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1);
      alert('Son lancé ! Si tu n\'entends rien, vérifie le volume de ton appareil.');
    } catch(e) {
      alert('Erreur : ' + e.message);
    }
  };

  return (
    <button className="music-btn" onClick={test} title="Test son">♫</button>
  );
}
