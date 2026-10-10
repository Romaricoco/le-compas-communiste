import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CAST, indexOf, CONVINCED_AT, HOSTILE_AT } from './cast.js';

/* ══════════════════════════════════════════════════════════
   LA SALLE
   Tout est dessiné sur une seule toile : le fond, la foule, les
   six délégués et la tribune d'où tu parles.

   Les délégués ne sont pas des photos posées. Chaque portrait est
   découpé en deux pièces — la tête, le buste — et remonté en
   marionnette : la tête pivote sur le cou, le buste respire et se
   penche, le bas du visage s'étire sur la voix. Celui qui parle se
   lève derrière la table et avance ; les autres se tournent vers
   lui. La table leur coupe le bas du corps, c'est elle qui permet
   de les faire lever sans avoir à leur dessiner des jambes.

   La découpe (rig) est calée à la main sur chaque portrait :
     neck = bas de la tête, jaw = ligne de mâchoire, cx = axe du cou,
   en fraction de la hauteur de l'image.
   ══════════════════════════════════════════════════════════ */

const RIG = {
  esperanza: { neck: 0.56, jaw: 0.36, cx: 0.477 },
  alain:     { neck: 0.45, jaw: 0.34, cx: 0.465 },
  felix:     { neck: 0.60, jaw: 0.43, cx: 0.503 },
  ana:       { neck: 0.50, jaw: 0.30, cx: 0.503 },
  adama:     { neck: 0.42, jaw: 0.30, cx: 0.507 },
  roberto:   { neck: 0.46, jaw: 0.33, cx: 0.502 },
};

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const rnd = (a, b) => a + Math.random() * (b - a);

function gestureOf(tone, t, amp) {
  switch (tone) {
    case 'colere':   return { lean: 0.05 + Math.sin(t * 22) * 0.012 * amp, rise: 10 + amp * 6, hrot: Math.sin(t * 19) * 0.05 * amp, sc: 1.06 };
    case 'joie':     return { lean: -0.02, rise: 8 + Math.abs(Math.sin(t * 7)) * 9, hrot: Math.sin(t * 5) * 0.05, sc: 1.04 };
    case 'rire':     return { lean: 0.06 + Math.sin(t * 9) * 0.03, rise: 6, hrot: -0.1 + Math.sin(t * 9) * 0.05, sc: 1.02 };
    case 'emu':      return { lean: 0.02 * Math.sin(t * 1.3), rise: 2, hrot: 0.07 + Math.sin(t * 1.2) * 0.03, sc: 1.01 };
    case 'ironie':   return { lean: -0.035, rise: 4, hrot: -0.08 + Math.sin(t * 2) * 0.015, sc: 1.02 };
    case 'doute':    return { lean: 0.01, rise: 1, hrot: 0.06 + Math.sin(t * 2.2) * 0.02, sc: 1 };
    case 'chuchote': return { lean: 0.09, rise: 0, hrot: 0.1, sc: 0.98 };
    case 'solennel': return { lean: -0.012, rise: 12, hrot: -0.03, sc: 1.05 };
    default:         return { lean: Math.sin(t * 1.7) * 0.012, rise: 6, hrot: Math.sin(t * 2.1) * 0.025, sc: 1.02 };
  }
}

const Scene = forwardRef(function Scene(props, ref) {
  const cvRef = useRef(null);
  const S = useRef(null);

  // les props sont relues à chaque image par la boucle : on les garde
  // dans un objet mutable plutôt que de redémarrer l'animation
  if (!S.current) {
    S.current = {
      W: 0, H: 0, DPR: 1, PHONE: false, TABLE: 500, FIG: 180, HUDY: 10, FLOOR: 640,
      crowd: [], dust: [], floats: [], sparks: [], confetti: [],
      heat: 0.25, ovation: -99, boo: -99, shake: 0, flash: 0, camX: 0, camZ: 0,
      amp: 0, env: 0, slogan: null, sloganDirty: true, raf: 0, last: 0,
      ac: null, an: null, buf: null, imgs: {},
      ent: CAST.map((c, i) => ({
        c, i, hx: 0, x: 0, y: 0, sc: 1, lean: 0, hrot: 0, turn: 0, rise: 0, breath: 1,
        disp: 40, flash: 0, up: true, nod: 0, deny: 0, ph: Math.random() * 6.3, init: false,
      })),
      p: {},
    };
  }
  S.current.p = props;

  useImperativeHandle(ref, () => ({
    setIntensity(v) { S.current.heat = clamp(v, 0, 1); },
    ovation() { S.current.ovation = performance.now() / 1000; S.current.shake = 1; S.current.flash = 0.5; burstConfetti(S.current); },
    murmur() { S.current.boo = performance.now() / 1000; S.current.shake = Math.max(S.current.shake, 0.3); },
    announce(txt) { S.current.ann = txt; S.current.annT = performance.now() / 1000; S.current.flash = 0.6; S.current.shake = 0.6; },
    /* Branche l'analyseur sur le lecteur ElevenLabs : la mâchoire
       s'ouvre alors sur l'amplitude réelle de la voix, pas sur une
       enveloppe simulée. */
    attachAudio(el) {
      const s = S.current;
      if (!el || s.ac) return;
      try {
        const AX = window.AudioContext || window.webkitAudioContext;
        if (!AX) return;
        s.ac = new AX();
        const src = s.ac.createMediaElementSource(el);
        const an = s.ac.createAnalyser();
        an.fftSize = 512;
        src.connect(an); an.connect(s.ac.destination);
        s.an = an; s.buf = new Uint8Array(an.fftSize);
        el.addEventListener('play', () => { s.ac.state === 'suspended' && s.ac.resume(); });
      } catch { /* pas d'analyse : enveloppe simulée */ }
    },
  }), []);

  useEffect(() => {
    const cv = cvRef.current, ctx = cv.getContext('2d'), s = S.current;

    CAST.forEach(c => {
      const im = new Image();
      im.src = c.img;
      s.imgs[c.id] = im;
    });

    function layout() {
      s.PHONE = s.W < 560;
      s.HUDY = s.PHONE ? 62 : 52;
      s.TABLE = Math.max(s.H * 0.5, s.H - (s.PHONE ? 210 : 230));
      s.FIG = clamp(Math.min(s.W / 7.2, (s.TABLE - s.H * 0.3) * 1.05), 70, 230);
      s.FLOOR = s.TABLE + (s.PHONE ? 54 : 64);
      const slot = Math.min((s.W * 0.97) / 6, s.FIG * 1.12);
      s.ent.forEach(e => {
        e.hx = s.W / 2 + (e.i - 2.5) * slot;
        if (!e.init) { e.x = e.hx; e.y = s.TABLE; e.init = true; }
      });
      buildCrowd(s);
      s.dust = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), v: rnd(0.01, 0.04), p: Math.random() * 6 }));
      s.sloganDirty = true;
    }
    function resize() {
      const r = cv.getBoundingClientRect();
      s.W = Math.max(280, r.width); s.H = Math.max(360, r.height);
      s.DPR = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(s.W * s.DPR); cv.height = Math.round(s.H * s.DPR);
      layout();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    if (document.fonts?.ready) document.fonts.ready.then(() => { s.sloganDirty = true; });

    s.last = performance.now();
    const frame = now => {
      const dt = Math.min(0.05, (now - s.last) / 1000);
      s.last = now;
      step(s, ctx, dt, now / 1000);
      s.raf = requestAnimationFrame(frame);
    };
    s.raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(s.raf); ro.disconnect(); };
  }, []);

  // un coup encaissé : chiffre qui gicle, étincelles, hochement de tête
  useEffect(() => {
    const s = S.current, d = props.deltas;
    if (!d) return;
    CAST.forEach((c, i) => {
      const v = d[c.id] || 0;
      if (!v) return;
      const e = s.ent[i];
      e.flash = 1; e.up = v > 0;
      if (v > 0) e.nod = 0.9; else e.deny = 0.8;
      s.floats.push({ x: e.hx, y: s.TABLE - s.FIG * 0.8, txt: (v > 0 ? '+' : '') + v, up: v > 0, life: 1.6 });
      for (let k = 0; k < 16; k++) {
        s.sparks.push({ x: e.hx, y: s.TABLE - s.FIG * 0.6, vx: rnd(-130, 130), vy: rnd(-230, -40), life: rnd(0.3, 0.7), col: v > 0 ? '#ffc24a' : '#e0262e' });
      }
    });
    s.shake = Math.max(s.shake, 0.5);
  }, [props.deltas]);

  return <canvas className="as-scene" ref={cvRef} />;
});

/* ───────── la foule ───────── */
function buildCrowd(s) {
  s.crowd = [];
  const rows = s.PHONE ? 4 : 5;
  const top = s.H * (s.PHONE ? 0.3 : 0.22), bottom = s.TABLE - s.FIG * 0.92;
  for (let r = 0; r < rows; r++) {
    const k = rows > 1 ? r / (rows - 1) : 0;
    const y = lerp(top, bottom, k), sz = lerp(0.5, 1, k) * (s.PHONE ? 0.85 : 1), sp = 52 * sz;
    for (let j = 0, n = Math.ceil(s.W / sp) + 2; j < n; j++) {
      if (Math.random() < 0.1) continue; // des trous : un public, pas un papier peint
      s.crowd.push({
        r, k, x: -sp + j * sp + rnd(-8, 8) * sz, y: y + rnd(-5, 5) * sz,
        s: sz * rnd(0.82, 1.18), wide: rnd(0.8, 1.25), ph: rnd(0, 6.3), sp: rnd(1.7, 3.5),
        eager: Math.random(), hat: Math.random() < 0.22, flag: Math.random() < 0.05 && r > 0,
      });
    }
  }
}
function burstConfetti(s) {
  for (let i = 0; i < 90; i++) {
    s.confetti.push({ x: rnd(0, s.W), y: rnd(-s.H * 0.3, 0), vy: rnd(90, 220), vr: rnd(-6, 6), rot: rnd(0, 6), ph: rnd(0, 6), life: rnd(3, 5), col: Math.random() < 0.6 ? '#f4e7c8' : (Math.random() < 0.5 ? '#e0262e' : '#ffc24a') });
  }
}

/* ───────── une image ───────── */
function step(s, ctx, dt, t) {
  const p = s.p;
  const speaking = !!p.speaking;
  const spIdx = p.speaker ? indexOf(p.speaker) : -1;
  const sp = spIdx >= 0 ? s.ent[spIdx] : null;

  // amplitude de la voix : la vraie si le lecteur est analysé, sinon simulée
  let amp = 0;
  if (speaking) {
    if (s.an && s.buf) {
      s.an.getByteTimeDomainData(s.buf);
      let sum = 0;
      for (let i = 0; i < s.buf.length; i += 4) { const v = (s.buf[i] - 128) / 128; sum += v * v; }
      amp = clamp(Math.sqrt(sum / (s.buf.length / 4)) * 7, 0, 1);
    }
    if (amp < 0.02) amp = 0.3 + 0.32 * Math.abs(Math.sin(t * 12.5));
  }
  s.amp = lerp(s.amp, amp, 1 - Math.exp(-dt * 18));

  const conv = p.conv || {};
  const avg = CAST.reduce((a, c) => a + (conv[c.id] ?? 40), 0) / CAST.length;
  const target = clamp((avg - 32) / 48, 0, 1) * 0.85 + 0.12 + clamp(1 - (t - s.ovation) / 3.4, 0, 1) * 0.3;
  s.heat = lerp(s.heat, clamp(target, 0, 1), 1 - Math.exp(-dt * 1.4));
  s.shake *= Math.exp(-dt * 5); s.flash *= Math.exp(-dt * 7);
  s.camX = lerp(s.camX, sp ? (s.W / 2 - sp.x) * 0.1 : 0, 1 - Math.exp(-dt * 2.5));
  s.camZ = lerp(s.camZ, sp ? 0.045 : 0, 1 - Math.exp(-dt * 2));

  // les six
  for (const e of s.ent) {
    const v = conv[e.c.id] ?? 40, isSp = e === sp;
    e.disp = lerp(e.disp, v, 1 - Math.exp(-dt * 3));
    e.flash = Math.max(0, e.flash - dt * 1.6);
    e.nod = Math.max(0, e.nod - dt); e.deny = Math.max(0, e.deny - dt);
    let tx = e.hx, tsc = 1, tlean = 0, thr = 0, tturn = 0, trise = 0;
    if (isSp) {
      const g = gestureOf(p.tone, t, s.amp);
      tsc = Math.min(s.PHONE ? 1.6 : 1.32, (s.H * 0.4) / s.FIG) * g.sc;
      tx = clamp(lerp(e.hx, s.W / 2, 0.3), s.FIG * 0.6, s.W - s.FIG * 0.6);
      trise = g.rise + 14; tlean = g.lean; thr = g.hrot + Math.sin(t * 11) * 0.02 * s.amp;
      tturn = (s.W / 2 - e.hx) / s.W * 0.5;
    } else if (sp) {
      tturn = clamp((sp.x - e.hx) / (s.W * 0.5), -1, 1) * 0.5;
      thr = tturn * 0.1 + (v >= CONVINCED_AT ? Math.sin(t * 2 + e.ph) * 0.02 : 0);
      tlean = tturn * 0.03;
      if (v <= HOSTILE_AT) { tlean = -tturn * 0.03; thr = -tturn * 0.04; }
      if (p.to === e.c.id && speaking) { trise = 8; tsc = 1.05; }
    } else {
      thr = Math.sin(t * 0.7 + e.ph) * 0.04; tlean = Math.sin(t * 0.5 + e.ph) * 0.012;
      if (p.aside === e.i) { const d = e.i < 3 ? 1 : -1; tturn = d * 0.45; thr = d * 0.12; tlean = d * 0.05; trise = 3; }
    }
    if (p.phase === 'verdict') {
      const won = CAST.filter(c => (conv[c.id] ?? 0) >= CONVINCED_AT).length >= 4;
      trise = won ? Math.abs(Math.sin(t * 5 + e.ph)) * 16 : 0;
      tsc = won ? 1.06 : 0.97; thr = won ? Math.sin(t * 5 + e.ph) * 0.06 : 0.1;
    }
    if (e.nod > 0) thr += Math.sin(e.nod * 26) * 0.12 * e.nod;
    if (e.deny > 0) { tturn += Math.sin(e.deny * 22) * 0.5 * e.deny; thr += Math.sin(e.deny * 22) * 0.05; }
    const k = 1 - Math.exp(-dt * (isSp ? 9 : 6));
    e.x = lerp(e.x, tx, k); e.y = lerp(e.y, s.TABLE, k); e.sc = lerp(e.sc, tsc, k);
    e.rise = lerp(e.rise, trise, k); e.lean = lerp(e.lean, tlean, k);
    e.hrot = lerp(e.hrot, thr, 1 - Math.exp(-dt * 12)); e.turn = lerp(e.turn, tturn, k);
    e.breath = 1 + 0.014 * Math.sin(t * 1.8 + e.ph) + (isSp ? 0.01 * Math.sin(t * 16) * s.amp : 0);
  }

  ctx.setTransform(s.DPR, 0, 0, s.DPR, 0, 0);
  ctx.clearRect(0, 0, s.W, s.H);
  ctx.save();
  const sk = s.shake, zm = 1 + s.camZ;
  ctx.translate(s.W / 2 + (Math.random() - 0.5) * 8 * sk + s.camX, s.H * 0.58 + (Math.random() - 0.5) * 6 * sk);
  ctx.scale(zm, zm); ctx.translate(-s.W / 2, -s.H * 0.58);
  drawHall(s, ctx, t); drawBanners(s, ctx, t); drawCrowd(s, ctx, t);
  drawFigures(s, ctx, t, sp); drawTable(s, ctx); drawRostrum(s, ctx, t);
  drawFx(s, ctx, t, dt);
  ctx.restore();
  drawHud(s, ctx); drawScreen(s, ctx);
}

/* ───────── décor ───────── */
function drawHall(s, ctx, t) {
  const { W, H, TABLE, FIG, PHONE } = s;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#190e0b'); g.addColorStop(0.5, '#2b1a13'); g.addColorStop(1, '#0a0504');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const nw = PHONE ? 3 : 5, top = H * 0.1, bot = TABLE - FIG * 0.5;
  for (let i = 0; i < nw; i++) {
    const cx = W * (0.13 + 0.74 * (i / (nw - 1))), ww = W * (PHONE ? 0.17 : 0.1);
    const fl = 0.86 + 0.1 * Math.sin(t * 1.2 + i * 2);
    const gl = ctx.createRadialGradient(cx, (top + bot) / 2, 4, cx, (top + bot) / 2, (bot - top) * 0.85);
    gl.addColorStop(0, `rgba(255,186,105,${0.42 * fl})`); gl.addColorStop(1, 'rgba(255,150,70,0)');
    ctx.fillStyle = gl; ctx.fillRect(cx - ww * 2, top - 30, ww * 4, bot - top + 60);
    ctx.beginPath(); ctx.moveTo(cx - ww / 2, bot); ctx.lineTo(cx - ww / 2, top + ww / 2);
    ctx.arc(cx, top + ww / 2, ww / 2, Math.PI, 0); ctx.lineTo(cx + ww / 2, bot); ctx.closePath();
    const wg = ctx.createLinearGradient(0, top, 0, bot);
    wg.addColorStop(0, `rgba(255,214,150,${0.4 * fl})`); wg.addColorStop(1, `rgba(206,112,56,${0.2 * fl})`);
    ctx.fillStyle = wg; ctx.fill();
    ctx.strokeStyle = 'rgba(16,8,6,.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, bot);
    ctx.moveTo(cx - ww / 2, (top + bot) / 2); ctx.lineTo(cx + ww / 2, (top + bot) / 2); ctx.stroke();
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) {
    const x0 = W * (0.2 + i * 0.3), sw = Math.sin(t * 0.33 + i * 2.2) * W * 0.05;
    const bg = ctx.createLinearGradient(0, 0, 0, TABLE);
    bg.addColorStop(0, 'rgba(255,208,140,0.15)'); bg.addColorStop(1, 'rgba(255,208,140,0)');
    ctx.fillStyle = bg; ctx.beginPath();
    ctx.moveTo(x0 - 10, 0); ctx.lineTo(x0 + 10, 0);
    ctx.lineTo(x0 + sw + W * 0.15, TABLE); ctx.lineTo(x0 + sw - W * 0.15, TABLE);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
function cloth(s, ctx, x, y, w, h, t, amp, color, star) {
  for (let i = 0, seg = 12; i < seg; i++) {
    const k0 = i / seg, k1 = (i + 1) / seg;
    const o0 = Math.sin(t * (1.6 + s.heat * 1.4) + k0 * 4) * amp * k0;
    const o1 = Math.sin(t * (1.6 + s.heat * 1.4) + k1 * 4) * amp * k1;
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(x + o0, y + k0 * h); ctx.lineTo(x + w + o0, y + k0 * h);
    ctx.lineTo(x + w + o1, y + k1 * h + 1); ctx.lineTo(x + o1, y + k1 * h + 1);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(0,0,0,${(1 - (0.78 + 0.22 * Math.sin(t * 1.6 + k0 * 4 + 1))) * 0.9})`; ctx.fill();
  }
  if (star) {
    const cx = x + w / 2 + Math.sin(t * 1.6 + 1.4) * amp * 0.5, cy = y + h * 0.34, r = w * 0.28;
    ctx.fillStyle = '#ffc24a'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fill();
  }
}
function drawSlogan(s) {
  const w = Math.min(s.W * (s.PHONE ? 0.84 : 0.56), 680), h = Math.max(26, w * 0.066);
  const cv = document.createElement('canvas');
  cv.width = Math.round(w * 2); cv.height = Math.round(h * 2);
  const g = cv.getContext('2d'); g.scale(2, 2);
  g.fillStyle = '#8d1016'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(244,231,200,.5)'; g.lineWidth = 1.5; g.strokeRect(3, 3, w - 6, h - 6);
  const txt = '★  TOUT LE POUVOIR À L’ASSEMBLÉE  ★';
  let fs = Math.round(h * 0.5);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  do { g.font = `700 ${fs}px Oswald, Impact, sans-serif`; if (g.measureText(txt).width <= w - 18) break; fs -= 1; } while (fs > 7);
  g.fillStyle = '#f4e7c8'; g.fillText(txt, w / 2, h / 2 + 1);
  cv._w = w; cv._h = h;
  s.slogan = cv; s.sloganDirty = false;
}
function drawBanners(s, ctx, t) {
  const bw = s.PHONE ? 34 : 64, bh = s.H * 0.3;
  cloth(s, ctx, s.W * 0.02, s.H * 0.02, bw, bh, t, 5 + s.heat * 8, '#8d1016', true);
  cloth(s, ctx, s.W * 0.98 - bw, s.H * 0.02, bw, bh, t + 1.7, 5 + s.heat * 8, '#7d0e14', true);
  if (s.sloganDirty) drawSlogan(s);
  const sl = s.slogan;
  if (sl) {
    const w = sl._w, h = sl._h, x = s.W / 2 - w / 2, y = s.HUDY + (s.PHONE ? 56 : 76);
    const slices = Math.ceil(w / 4);
    for (let i = 0; i < slices; i++) {
      const k = i / slices, o = Math.sin(t * (1.8 + s.heat) + k * 7) * (2 + s.heat * 3);
      ctx.drawImage(sl, (i * 4 / w) * sl.width, 0, (4 / w) * sl.width + 1, sl.height, x + i * 4, y + o, 4.5, h);
    }
  }
}
function drawCrowd(s, ctx, t) {
  const ov = clamp(1 - (t - s.ovation) / 3.4, 0, 1), bo = clamp(1 - (t - s.boo) / 2, 0, 1);
  for (const p of s.crowd) {
    const sz = p.s * 30;
    const bounce = Math.abs(Math.sin(t * p.sp * (0.6 + s.heat + ov) + p.ph)) * (2 + s.heat * 5 + ov * 12) * p.s - bo * 3 * p.s;
    const x = p.x + Math.sin(t * 1.2 + p.ph) * (1.2 + bo * 4) * p.s, y = p.y - bounce;
    const tone = Math.round(10 + p.k * 16);
    ctx.fillStyle = `rgb(${tone},${Math.round(tone * 0.72)},${Math.round(tone * 0.6)})`;
    ctx.beginPath();
    ctx.moveTo(x - sz * 0.52 * p.wide, y + sz * 1.2);
    ctx.quadraticCurveTo(x - sz * 0.5 * p.wide, y + sz * 0.26, x - sz * 0.2, y + sz * 0.1);
    ctx.lineTo(x + sz * 0.2, y + sz * 0.1);
    ctx.quadraticCurveTo(x + sz * 0.5 * p.wide, y + sz * 0.26, x + sz * 0.52 * p.wide, y + sz * 1.2);
    ctx.closePath(); ctx.fill();
    ctx.fillRect(x - sz * 0.1, y - sz * 0.05, sz * 0.2, sz * 0.2);
    ctx.beginPath(); ctx.ellipse(x, y - sz * 0.2, sz * 0.21, sz * 0.25, 0, 0, 6.283); ctx.fill();
    if (p.hat) {
      ctx.beginPath(); ctx.ellipse(x, y - sz * 0.38, sz * 0.3, sz * 0.1, 0, 0, 6.283); ctx.fill();
      ctx.fillRect(x - sz * 0.19, y - sz * 0.5, sz * 0.38, sz * 0.16);
    }
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,190,110,${0.1 + p.k * 0.16})`; ctx.lineWidth = Math.max(1, sz * 0.07);
    ctx.beginPath(); ctx.arc(x, y - sz * 0.2, sz * 0.22, Math.PI * 1.1, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
    if ((ov > 0.05 || p.eager < 0.1 + s.heat * 0.75) && bo < 0.5) {
      const pump = Math.sin(t * p.sp * 2 + p.ph) * sz * 0.18, ax = x + sz * 0.4, ay = y + sz * 0.2;
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = sz * 0.16; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax - sz * 0.1, ay + sz * 0.2); ctx.lineTo(ax + sz * 0.1, ay - sz * 0.62 + pump); ctx.stroke();
      ctx.beginPath(); ctx.arc(ax + sz * 0.1, ay - sz * 0.7 + pump, sz * 0.13, 0, 6.283); ctx.fill();
      if (ov > 0.05) {
        const bx = x - sz * 0.4;
        ctx.beginPath(); ctx.moveTo(bx + sz * 0.1, ay + sz * 0.2); ctx.lineTo(bx - sz * 0.1, ay - sz * 0.6 - pump); ctx.stroke();
        ctx.beginPath(); ctx.arc(bx - sz * 0.1, ay - sz * 0.68 - pump, sz * 0.13, 0, 6.283); ctx.fill();
      }
    }
    if (p.flag) {
      const px = x + sz * 0.5, top = y - sz * 1.7;
      ctx.strokeStyle = '#17100d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(px, y + sz * 0.2); ctx.lineTo(px, top); ctx.stroke();
      cloth(s, ctx, px, top, sz * 1.1, sz * 0.7, t + p.ph, 3 + s.heat * 5, '#a4131a', false);
    }
  }
}

/* ───────── les marionnettes ───────── */
function drawFigure(s, ctx, e, amp) {
  const img = s.imgs[e.c.id];
  if (!img || !img.complete || !img.naturalWidth) return;
  const R = RIG[e.c.id], IH = img.naturalHeight, IW = img.naturalWidth;
  const h = s.FIG * e.sc, w = h * (IW / IH);
  const neckS = R.neck * IH, over = 0.035 * IH;
  ctx.save();
  ctx.translate(e.x, e.y - e.rise);
  ctx.rotate(e.lean);
  ctx.scale(1 - Math.abs(e.turn) * 0.16, e.breath);
  ctx.translate(e.turn * w * 0.06, 0);
  const bTopS = neckS - over, bTopD = -h + (bTopS / IH) * h;
  ctx.drawImage(img, 0, bTopS, IW, IH - bTopS, -w / 2, bTopD, w, h - (bTopS / IH) * h);
  ctx.save();
  const px = (R.cx - 0.5) * w, py = -h + (neckS / IH) * h;
  ctx.translate(px, py); ctx.rotate(e.hrot); ctx.translate(-px, -py);
  const headH = ((neckS + over) / IH) * h;
  ctx.drawImage(img, 0, 0, IW, neckS + over, -w / 2, -h, w, headH);
  if (amp > 0.03) {
    const jS = R.jaw * IH, jD = -h + R.jaw * h, jH = headH - R.jaw * h;
    ctx.drawImage(img, 0, jS, IW, (neckS + over) - jS, -w / 2, jD, w, jH * (1 + 0.13 * amp));
  }
  ctx.restore();
  ctx.restore();
}
function drawFigures(s, ctx, t, sp) {
  const order = s.ent.slice().sort((a, b) => (a === sp ? 1 : 0) - (b === sp ? 1 : 0));
  for (const e of order) {
    const isSp = e === sp;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(e.x, s.TABLE + 4, s.FIG * e.sc * 0.3, 7, 0, 0, 6.283); ctx.fill();
    if (isSp) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(0, 0, 0, s.TABLE);
      g.addColorStop(0, 'rgba(255,214,150,0)');
      g.addColorStop(1, `rgba(255,214,150,${0.18 + s.amp * 0.14})`);
      ctx.fillStyle = g; ctx.beginPath();
      ctx.moveTo(e.x - 16, 0); ctx.lineTo(e.x + 16, 0);
      ctx.lineTo(e.x + s.FIG * e.sc * 0.75, s.TABLE); ctx.lineTo(e.x - s.FIG * e.sc * 0.75, s.TABLE);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    if (!isSp && sp) { ctx.save(); ctx.globalAlpha = 0.84; drawFigure(s, ctx, e, 0); ctx.restore(); }
    else drawFigure(s, ctx, e, isSp ? s.amp : 0);
    if (e.flash > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = e.flash * 0.5;
      ctx.fillStyle = e.up ? '#ffc24a' : '#e0262e';
      ctx.beginPath(); ctx.ellipse(e.x, e.y - s.FIG * e.sc * 0.5, s.FIG * 0.4, s.FIG * 0.55, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    if (s.p.aside === e.i && !sp) {
      const x = e.x + (e.i < 3 ? 1 : -1) * s.FIG * 0.4, y = e.y - s.FIG * e.sc - 10;
      ctx.fillStyle = 'rgba(244,231,200,.92)';
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 17, y - 15, 34, 17, 8); else ctx.rect(x - 17, y - 15, 34, 17);
      ctx.fill();
      ctx.fillStyle = '#241510';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 8 + i * 8, y - 6 + Math.sin(t * 8 + i) * 2, 2, 0, 6.283); ctx.fill(); }
    }
  }
}

/* ───────── table de séance et tribune ───────── */
function drawTable(s, ctx) {
  const { W, H, TABLE: y, FLOOR, PHONE } = s, h = FLOOR - y;
  const g = ctx.createLinearGradient(0, y - 6, 0, FLOOR);
  g.addColorStop(0, '#6a3a22'); g.addColorStop(0.18, '#3d2113'); g.addColorStop(1, '#1b0f0a');
  ctx.fillStyle = g; ctx.fillRect(0, y - 6, W, h + 6);
  ctx.fillStyle = 'rgba(255,196,120,.35)'; ctx.fillRect(0, y - 6, W, 2);
  ctx.fillStyle = '#1d3a2a'; ctx.fillRect(0, y + 6, W, Math.max(6, h * 0.22));
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(0, y + 6 + Math.max(6, h * 0.22), W, 3);
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1;
  for (let x = (PHONE ? 54 : 96) / 2; x < W; x += PHONE ? 54 : 96) {
    ctx.beginPath(); ctx.moveTo(x, y + h * 0.3); ctx.lineTo(x, FLOOR); ctx.stroke();
  }
  const felt = y + 6 + Math.max(6, h * 0.22);
  s.ent.forEach((e, i) => {
    ctx.save(); ctx.translate(e.hx + (i % 2 ? 18 : -22), felt - 9); ctx.rotate(((i * 37) % 11 - 5) / 60);
    ctx.fillStyle = 'rgba(226,215,188,.82)'; ctx.fillRect(-13, -8, 26, 14);
    ctx.fillStyle = 'rgba(60,45,32,.5)';
    for (let l = 0; l < 3; l++) ctx.fillRect(-10, -5 + l * 4, 20 - l * 5, 1);
    ctx.restore();
    if (i === 2) {
      ctx.fillStyle = 'rgba(190,205,200,.3)'; ctx.fillRect(e.hx + 30, felt - 24, 11, 22);
      ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(e.hx + 32, felt - 22, 3, 18);
      ctx.save(); ctx.translate(e.hx - 44, felt - 5); ctx.rotate(-0.25);
      ctx.fillStyle = '#4a2a16'; ctx.fillRect(0, 0, 22, 3); ctx.fillRect(-4, -5, 9, 13);
      ctx.restore();
    }
  });
  ctx.fillStyle = '#0a0504'; ctx.fillRect(0, FLOOR, W, H - FLOOR);
}
function drawRostrum(s, ctx, t) {
  const { W, H, PHONE } = s;
  const w = Math.min(W * (PHONE ? 0.8 : 0.52), 560), x = W / 2 - w / 2;
  const top = H - (PHONE ? 128 : 136);
  ctx.save();
  const mx = x + w * 0.5, my = top - (PHONE ? 46 : 62);
  ctx.strokeStyle = '#17100d'; ctx.lineWidth = PHONE ? 4 : 5; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(mx, top + 6); ctx.lineTo(mx, my + 10); ctx.stroke();
  ctx.fillStyle = '#20150f'; ctx.beginPath(); ctx.ellipse(mx, my, PHONE ? 8 : 10, PHONE ? 11 : 14, 0.2, 0, 6.283); ctx.fill();
  ctx.strokeStyle = 'rgba(255,200,140,.35)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(mx, my, PHONE ? 8 : 10, PHONE ? 11 : 14, 0.2, 0, 6.283); ctx.stroke();
  const g = ctx.createLinearGradient(0, top, 0, H);
  g.addColorStop(0, '#53301d'); g.addColorStop(0.1, '#3a2013'); g.addColorStop(1, '#120a07');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(x - w * 0.06, H); ctx.lineTo(x + w * 0.02, top);
  ctx.lineTo(x + w * 0.98, top); ctx.lineTo(x + w * 1.06, H); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,205,140,.4)'; ctx.fillRect(x + w * 0.02, top, w * 0.96, 3);
  const sx = W / 2, sy = top + (PHONE ? 40 : 52), r = PHONE ? 20 : 26;
  ctx.fillStyle = `rgba(190,30,36,${0.75 + 0.2 * Math.sin(t * 1.6)})`;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fill();
  const cause = s.p.cause;
  if (cause) {
    ctx.save();
    ctx.translate(x + w * 0.06, top + (PHONE ? 14 : 16)); ctx.rotate(-0.05);
    const pw = w * 0.3, ph = PHONE ? 24 : 30;
    ctx.fillStyle = 'rgba(232,222,196,.9)'; ctx.fillRect(0, 0, pw, ph);
    ctx.fillStyle = '#3a2a1c'; ctx.font = `${PHONE ? 7 : 9}px Oswald, sans-serif`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    let ln = '', yy = 5, used = 0;
    for (const wd of String(cause).split(/\s+/)) {
      const trial = ln ? ln + ' ' + wd : wd;
      if (ctx.measureText(trial).width > pw - 10) {
        ctx.fillText(ln, 5, yy); yy += PHONE ? 8 : 11; ln = wd; used++;
        if (used > (PHONE ? 1 : 2)) { ln = '…'; break; }
      } else ln = trial;
    }
    ctx.fillText(ln, 5, yy);
    ctx.restore();
  }
  ctx.restore();
}

/* ───────── habillage ───────── */
function drawHud(s, ctx) {
  const { W, PHONE } = s, n = CAST.length;
  const gap = PHONE ? 3 : 8, cw = Math.min((W - 16 - gap * (n - 1)) / n, PHONE ? 70 : 150);
  const x0 = W / 2 - (cw * n + gap * (n - 1)) / 2, y = s.HUDY, ch = PHONE ? 30 : 38;
  for (let i = 0; i < n; i++) {
    const c = CAST[i], e = s.ent[i], x = x0 + i * (cw + gap), v = e.disp;
    const st = v >= CONVINCED_AT ? 'c' : v <= HOSTILE_AT ? 'h' : 's';
    ctx.fillStyle = 'rgba(10,5,4,.82)'; ctx.fillRect(x, y, cw, ch);
    ctx.strokeStyle = e.flash > 0.05 ? (e.up ? '#ffc24a' : '#e0262e') : st === 'c' ? 'rgba(255,194,74,.8)' : 'rgba(244,231,200,.22)';
    ctx.lineWidth = e.flash > 0.05 ? 2 : 1; ctx.strokeRect(x + 0.5, y + 0.5, cw - 1, ch - 1);
    const th = ch - 8, img = s.imgs[c.id];
    if (img && img.complete && img.naturalWidth) {
      ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 4, th, th); ctx.clip();
      const IH = img.naturalHeight, IW = img.naturalWidth, side = RIG[c.id].neck * IH;
      ctx.drawImage(img, clamp(RIG[c.id].cx * IW - side / 2, 0, Math.max(0, IW - side)), 0, Math.min(side, IW), side, x + 4, y + 4, th, th);
      ctx.restore();
      ctx.strokeStyle = 'rgba(244,231,200,.18)'; ctx.lineWidth = 1; ctx.strokeRect(x + 4.5, y + 4.5, th - 1, th - 1);
    }
    const bx = x + th + 8, bw = cw - th - 12;
    if (bw > 16) {
      if (!PHONE) {
        ctx.fillStyle = '#f4e7c8'; ctx.font = '8px "Press Start 2P", Oswald, monospace';
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(c.name.toUpperCase().slice(0, 9), bx, y + 7);
      }
      const by = PHONE ? y + ch / 2 - 4 : y + 22, seg = PHONE ? 5 : 8, sw = bw / seg;
      const lit = Math.round(clamp(v / 100, 0, 1) * seg);
      for (let k = 0; k < seg; k++) {
        ctx.fillStyle = k < lit ? (st === 'c' ? '#ffc24a' : st === 'h' ? '#9c141a' : '#c9a86a') : 'rgba(244,231,200,.12)';
        ctx.fillRect(bx + k * sw, by, sw - 2, PHONE ? 7 : 9);
      }
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.fillRect(bx + bw * (CONVINCED_AT / 100) - 1, by - 2, 1.5, (PHONE ? 7 : 9) + 4);
    }
  }
}
function drawFx(s, ctx, t, dt) {
  for (let i = s.sparks.length - 1; i >= 0; i--) {
    const p = s.sparks[i];
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt;
    if (p.life <= 0) { s.sparks.splice(i, 1); continue; }
    ctx.globalAlpha = clamp(p.life * 2.2, 0, 1); ctx.fillStyle = p.col;
    ctx.fillRect(p.x - 2, p.y - 2, 4, 4); ctx.globalAlpha = 1;
  }
  ctx.fillStyle = 'rgba(255,225,180,.45)';
  for (const d of s.dust) {
    d.y += d.v * dt * (1 + s.heat); d.x += Math.sin(t * 0.5 + d.p) * 0.0004;
    if (d.y > 1) { d.y = 0; d.x = Math.random(); }
    ctx.fillRect(d.x * s.W, d.y * s.TABLE, 1.6, 1.6);
  }
  for (let i = s.confetti.length - 1; i >= 0; i--) {
    const p = s.confetti[i];
    p.y += p.vy * dt; p.x += Math.sin(t * 3 + p.ph) * 30 * dt; p.rot += p.vr * dt; p.life -= dt;
    if (p.life <= 0 || p.y > s.H) { s.confetti.splice(i, 1); continue; }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.fillRect(-4, -2.5, 8, 5); ctx.restore();
  }
  for (let i = s.floats.length - 1; i >= 0; i--) {
    const f = s.floats[i];
    f.life -= dt; f.y -= 46 * dt;
    if (f.life <= 0) { s.floats.splice(i, 1); continue; }
    ctx.globalAlpha = clamp(f.life / 0.7, 0, 1);
    ctx.font = `${s.PHONE ? 14 : 20}px "Press Start 2P", Oswald, monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 6; ctx.strokeStyle = '#0b0605'; ctx.strokeText(f.txt, f.x, f.y);
    ctx.fillStyle = f.up ? '#ffc24a' : '#ff6a60'; ctx.fillText(f.txt, f.x, f.y);
    ctx.globalAlpha = 1;
  }
}
function drawScreen(s, ctx) {
  ctx.save();
  ctx.globalAlpha = 0.16; ctx.fillStyle = '#000';
  for (let y = 0; y < s.H; y += 3) ctx.fillRect(0, y, s.W, 1);
  ctx.restore();
  if (s.flash > 0.01) { ctx.fillStyle = `rgba(255,240,200,${s.flash * 0.45})`; ctx.fillRect(0, 0, s.W, s.H); }
  const vg = ctx.createRadialGradient(s.W / 2, s.H * 0.48, Math.min(s.W, s.H) * 0.32, s.W / 2, s.H * 0.48, Math.max(s.W, s.H) * 0.72);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.72)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, s.W, s.H);
}

export default Scene;
