/* Sons ponctuels de la salle (Web Audio, synthétisés) : maillet du
   président, ovation, rire collectif. Aucun fond sonore permanent. */

export function createHallAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  ctx.resume().catch(() => {});

  // compresseur puis limiteur : jamais de saturation, même à l'ovation
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -20; comp.ratio.value = 5; comp.attack.value = 0.005; comp.release.value = 0.25;
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3; limiter.knee.value = 0; limiter.ratio.value = 20;
  limiter.attack.value = 0.001; limiter.release.value = 0.06;
  const master = ctx.createGain(); master.gain.value = 1.1;
  master.connect(comp); comp.connect(limiter); limiter.connect(ctx.destination);

  // réverbération de grande salle, légère
  const irLen = Math.floor(ctx.sampleRate * 1.4);
  const ir = ctx.createBuffer(2, irLen, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = ir.getChannelData(ch);
    for (let i = 0; i < irLen; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.6);
  }
  const verb = ctx.createConvolver(); verb.buffer = ir;
  const wet = ctx.createGain(); wet.gain.value = 0.18;
  const bus = ctx.createGain();
  bus.connect(master); bus.connect(verb); verb.connect(wet); wet.connect(master);

  // bruit rose-brun réutilisable
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  {
    const d = noise.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099; b1 = 0.963 * b1 + w * 0.2965; b2 = 0.57 * b2 + w * 1.0526;
      d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
    }
  }

  const out = (node, p = 0) => {
    const pan = ctx.createStereoPanner(); pan.pan.value = p;
    node.connect(pan); pan.connect(bus);
  };

  const hit = (t, { f = 1800, q = 1.5, gain = 0.1, dur = 0.06, p = 0, type = 'bandpass' }) => {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); out(g, p);
    s.start(t, Math.random() * 1.5, dur + 0.05);
  };

  // coup de maillet sur le bois du pupitre
  const knock = t => {
    hit(t, { f: 950, q: 6, gain: 0.5, dur: 0.12 });
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(190, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.12);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); out(g, 0); o.start(t); o.stop(t + 0.2);
  };

  const gavel = (n = 3) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime + 0.02;
    for (let i = 0; i < n; i++) knock(t0 + i * 0.32);
  };

  const shout = (t, p) => {
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 5;
    const f0 = 520 + Math.random() * 380;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f0 * 0.65, t + 0.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    s.connect(f); f.connect(g); out(g, p);
    s.start(t, Math.random() * 1.5, 0.6);
  };

  const whistle = (t, p) => {
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(1100, t); o.frequency.exponentialRampToValueAtTime(2100 + Math.random() * 400, t + 0.16);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 6;
    const depth = ctx.createGain(); depth.gain.value = 28; lfo.connect(depth); depth.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.08);
    g.gain.setTargetAtTime(0.0001, t + 0.7, 0.12);
    o.connect(g); out(g, p);
    o.start(t); lfo.start(t); o.stop(t + 1.4); lfo.stop(t + 1.4);
  };

  // ovation : grondement, cris, applaudissements denses puis rythmés
  const ovation = (k = 1) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const roar = ctx.createBufferSource(); roar.buffer = noise; roar.loop = true;
    const rf = ctx.createBiquadFilter(); rf.type = 'bandpass'; rf.Q.value = 0.6;
    rf.frequency.setValueAtTime(380, t0); rf.frequency.linearRampToValueAtTime(720, t0 + 1.2);
    const rg = ctx.createGain();
    rg.gain.setValueAtTime(0.0001, t0); rg.gain.exponentialRampToValueAtTime(0.55 * k, t0 + 0.4);
    rg.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.6);
    roar.connect(rf); rf.connect(rg); out(rg, 0); roar.start(t0); roar.stop(t0 + 3.8);
    for (let i = 0; i < 14 * k; i++) shout(t0 + Math.random() * 1.2, (Math.random() - 0.5) * 1.8);
    if (Math.random() < 0.7) whistle(t0 + 0.2 + Math.random() * 0.6, (Math.random() - 0.5) * 1.4);
    for (let i = 0; i < 160 * k; i++) {
      const t = t0 + 0.08 + Math.min(3.6, -Math.log(1 - Math.random()) * 1.1);
      hit(t, { f: 1300 + Math.random() * 1900, q: 1.4, gain: 0.07 + Math.random() * 0.09, dur: 0.05, p: (Math.random() - 0.5) * 1.9 });
    }
    // la salle s'accorde : quatre claps à l'unisson
    const r0 = t0 + 1.6;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 10; j++) hit(r0 + i * 0.36 + Math.random() * 0.03, { f: 1700 + Math.random() * 700, q: 1.6, gain: 0.08, dur: 0.07, p: (Math.random() - 0.5) * 1.6 });
    }
  };

  // rire collectif : salves de « ha » descendants, deux vagues
  const laughter = (k = 1) => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const voice = (t, p) => {
      const f0 = 520 + Math.random() * 320;
      const n = 3 + Math.floor(Math.random() * 4);
      for (let i = 0; i < n; i++) hit(t + i * (0.12 + Math.random() * 0.03), { f: f0 * (1 - i * 0.05), q: 4.5, gain: 0.12, dur: 0.11, p });
    };
    for (let i = 0; i < 14 * k; i++) voice(t0 + Math.random() * 0.6, (Math.random() - 0.5) * 1.8);
    for (let i = 0; i < 7 * k; i++) voice(t0 + 0.9 + Math.random() * 0.6, (Math.random() - 0.5) * 1.6);
  };

  // grognement bref de la salle qui doute
  const grumble = () => {
    ctx.resume().catch(() => {});
    const t0 = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.8);
    s.connect(f); f.connect(g); out(g, 0); s.start(t0, 0, 2);
  };

  return { gavel, ovation, laughter, grumble, dispose: () => ctx.close().catch(() => {}) };
}
