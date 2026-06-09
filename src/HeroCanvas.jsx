import { useEffect, useRef } from 'react';

export default function HeroCanvas({
  title, setTitle, onAnalyze, loading,
  view, setView,
  installPrompt, onInstall, installed,
  showIosBanner, onDismissIos,
}) {
  const starsRef = useRef(null);
  const earthRef = useRef(null);
  const rafRef   = useRef(null);

  useEffect(() => {
    const sc  = starsRef.current;
    const ec  = earthRef.current;
    const sctx = sc.getContext('2d');
    const ctx  = ec.getContext('2d');

    function resize() {
      const W = ec.parentElement.offsetWidth;
      ec.width = sc.width = W;
      ec.height = sc.height = 620;
    }
    resize();
    window.addEventListener('resize', resize);

    const W = () => ec.width;
    const H = () => ec.height;

    const stars = Array.from({ length: 280 }, () => ({
      x: Math.random(), y: Math.random(),
      r: 0.3 + Math.random() * 1.2,
      a: 0.3 + Math.random() * 0.7,
      tw: Math.random() * Math.PI * 2,
    }));

    function drawStars(t) {
      sctx.clearRect(0, 0, W(), H());
      for (const s of stars) {
        const a = s.a * (0.6 + 0.4 * Math.sin(s.tw + t * 0.0008));
        sctx.fillStyle = `rgba(255,255,255,${a})`;
        sctx.beginPath();
        sctx.arc(s.x * W(), s.y * H(), s.r, 0, Math.PI * 2);
        sctx.fill();
      }
    }

    let angle = 0;
    function drawEarth() {
      const cx = W() * 0.62;
      const cy = H() * 0.42;
      const R  = Math.min(W(), H()) * 0.38;
      ctx.clearRect(0, 0, W(), H());
      angle += 0.0003;

      const grad = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.05, cx, cy, R);
      grad.addColorStop(0,    '#4a90d9');
      grad.addColorStop(0.3,  '#1a5fa8');
      grad.addColorStop(0.6,  '#0d3d7a');
      grad.addColorStop(0.85, '#082660');
      grad.addColorStop(1,    '#020e28');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.clip();

      const continents = [
        { bx: -0.15, by: -0.25, bw: 0.38, bh: 0.55, color: '#2d7a3a' },
        { bx:  0.05, by: -0.40, bw: 0.28, bh: 0.35, color: '#3a8a42' },
        { bx: -0.55, by: -0.35, bw: 0.35, bh: 0.45, color: '#2a6e32' },
        { bx: -0.52, by:  0.05, bw: 0.28, bh: 0.32, color: '#266030' },
        { bx:  0.18, by:  0.12, bw: 0.38, bh: 0.28, color: '#8B7355' },
        { bx: -0.05, by:  0.25, bw: 0.22, bh: 0.20, color: '#2d7a3a' },
        { bx:  0.30, by: -0.50, bw: 0.50, bh: 0.22, color: '#e8e8e8' },
        { bx: -0.60, by:  0.32, bw: 0.60, bh: 0.25, color: '#e8e8e8' },
      ];

      for (const c of continents) {
        const ox = Math.cos(angle) * c.bx - Math.sin(angle) * 0.1;
        ctx.fillStyle = c.color;
        ctx.beginPath();
        ctx.ellipse(cx + ox * R, cy + c.by * R, c.bw * R * 0.5, c.bh * R * 0.5, angle * 0.2, 0, Math.PI * 2);
        ctx.fill();
      }

      const cloudG = ctx.createRadialGradient(cx - R * 0.1, cy - R * 0.35, 0, cx - R * 0.1, cy - R * 0.35, R * 0.7);
      cloudG.addColorStop(0,   'rgba(255,255,255,0.18)');
      cloudG.addColorStop(0.4, 'rgba(255,255,255,0.08)');
      cloudG.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = cloudG;
      ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

      for (let i = 0; i < 6; i++) {
        const ca   = angle * 0.7 + i * Math.PI / 3;
        const cr   = R * (0.5 + 0.3 * Math.sin(i * 1.3));
        const ccx2 = cx + Math.cos(ca) * cr * 0.8;
        const ccy2 = cy + Math.sin(ca) * cr * 0.25;
        const cg   = ctx.createRadialGradient(ccx2, ccy2, 0, ccx2, ccy2, R * 0.25);
        cg.addColorStop(0, 'rgba(255,255,255,0.14)');
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = cg;
        ctx.beginPath();
        ctx.ellipse(ccx2, ccy2, R * 0.28, R * 0.1, ca, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      const atmG = ctx.createRadialGradient(cx, cy, R * 0.85, cx, cy, R * 1.12);
      atmG.addColorStop(0,   'rgba(80,160,255,0)');
      atmG.addColorStop(0.4, 'rgba(80,160,255,0.12)');
      atmG.addColorStop(0.7, 'rgba(40,100,200,0.08)');
      atmG.addColorStop(1,   'rgba(20,60,150,0)');
      ctx.fillStyle = atmG;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2);
      ctx.fill();

      const rimG = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.4, cx, cy, R);
      rimG.addColorStop(0,    'rgba(255,255,255,0)');
      rimG.addColorStop(0.75, 'rgba(255,255,255,0)');
      rimG.addColorStop(0.88, 'rgba(100,160,255,0.2)');
      rimG.addColorStop(1,    'rgba(30,80,180,0)');
      ctx.fillStyle = rimG;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      const lightG = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, 0, cx, cy, R);
      lightG.addColorStop(0,   'rgba(255,255,255,0.12)');
      lightG.addColorStop(0.4, 'rgba(255,255,255,0)');
      ctx.fillStyle = lightG;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      const shadowG = ctx.createRadialGradient(cx + R * 0.5, cy + R * 0.5, 0, cx, cy, R);
      shadowG.addColorStop(0,    'rgba(0,0,0,0)');
      shadowG.addColorStop(0.55, 'rgba(0,0,0,0)');
      shadowG.addColorStop(0.8,  'rgba(0,0,5,0.55)');
      shadowG.addColorStop(1,    'rgba(0,0,10,0.75)');
      ctx.fillStyle = shadowG;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();
    }

    function loop(t) {
      drawStars(t);
      drawEarth(t);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="hero-scene">
      <canvas ref={starsRef} className="hero-canvas" />
      <canvas ref={earthRef} className="hero-canvas" />
      <div className="hero-overlay" />

      <nav className="hero-nav">
        <div className="hero-brand">
          <div className="hero-mark">★</div>
          <div>
            <span className="hero-brand-name">Le Compas Communiste</span>
            <span className="hero-brand-sub">Distinguer pour agir</span>
          </div>
        </div>
        <div className="hero-nav-links">
          <a href="#" className={view === 'compas' ? 'active' : ''} onClick={e => { e.preventDefault(); setView('compas'); }}>Le Compas</a>
          <a href="#" className={view === 'jeu'    ? 'active' : ''} onClick={e => { e.preventDefault(); setView('jeu'); }}>★ Le Jeu</a>
        </div>
        {installPrompt && !installed && (
          <button className="hero-install-btn" onClick={onInstall}>⬇ Installer l'app</button>
        )}
        <div className="hero-status">
          <span className="hero-dot" />
          {installed ? 'App installée ✓' : 'Prototype v2.0 · IA active'}
        </div>
      </nav>

      {showIosBanner && (
        <div className="ios-banner">
          <span>Pour installer l'app : appuie sur <b>⎋ Partager</b> puis <b>« Sur l'écran d'accueil »</b></span>
          <button onClick={onDismissIos}>✕</button>
        </div>
      )}

      <div className="hero-ticker">
        <span>«&thinsp;Le capitalisme porte en lui la guerre comme la nuée porte <strong>l'orage</strong>&thinsp;» — Jean Jaurès &nbsp;⬥&nbsp; Outil d'analyse marxiste libre &nbsp;⬥&nbsp; Distinguer pour agir</span>
      </div>

      {view === 'compas' && (
        <div className="hero-content">
          <div className="hero-eyebrow">·· Boussole N° 01 ·· Scan ··</div>
          <h1 className="hero-title">
            <span className="ht-white">Qu'est-ce que tu passes au</span>
            <span className="ht-red">Compas</span>
            <span className="ht-white">aujourd'hui ?</span>
          </h1>
          <p className="hero-sub">
            Une idée, un événement, une réforme. Le compas teste si elle penche vers le <span className="com-em">commun</span> ou vers le <span className="cap-em">capital</span>, axiome par axiome.
          </p>
          <form className="hero-form" onSubmit={onAnalyze} autoComplete="off">
            <input
              className="hero-input"
              type="text"
              required
              maxLength={200}
              placeholder="Ex : Nationalisation d'EDF · Pass rail · Ubérisation…"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <button className="hero-btn" type="submit" disabled={loading}>
              {loading ? '⟳ Analyse…' : '▶ Analyser'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
