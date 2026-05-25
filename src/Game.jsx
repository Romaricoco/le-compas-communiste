import { useEffect, useRef, useState, useCallback } from 'react';
import './Game.css';

const W = 420;
const H = 420;
const CX = W / 2;
const CY = H / 2;
const ORBIT_R = 150;
const ARM_R = 138;
const TIP_R = 11;
const ITEM_R = 155;

export default function Game() {
  const canvasRef = useRef(null);
  const gRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, lives: 3, best: 0, phase: 'idle' });

  const startGame = useCallback(() => {
    const g = {
      angle: 0,
      dir: 1,
      speed: 0.022,
      items: [],
      score: 0,
      lives: 3,
      lastSpawn: 0,
      spawnInterval: 1400,
      running: true,
      animId: null,
      hits: [],
    };
    gRef.current = g;
    setUi(prev => ({ ...prev, score: 0, lives: 3, phase: 'playing' }));

    const ctx = canvasRef.current.getContext('2d');

    function spawnItem(now) {
      if (now - g.lastSpawn < g.spawnInterval) return;
      g.lastSpawn = now;

      let a;
      let tries = 0;
      do {
        a = Math.random() * Math.PI * 2;
        tries++;
      } while (
        Math.abs(((a - g.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.5 &&
        tries < 10
      );

      const type = Math.random() < 0.72 ? 'star' : 'cap';
      g.items.push({ angle: a, type, born: now });
      g.speed = Math.min(0.055, g.speed + 0.0004);
      g.spawnInterval = Math.max(700, g.spawnInterval - 15);
    }

    function loop(now) {
      if (!g.running) return;

      g.angle += g.dir * g.speed;
      spawnItem(now);

      const tipX = CX + Math.cos(g.angle) * ARM_R;
      const tipY = CY + Math.sin(g.angle) * ARM_R;

      const toRemove = new Set();
      let changed = false;

      g.items.forEach((item, i) => {
        const age = now - item.born;
        if (age > 3000) { toRemove.add(i); return; }

        const ix = CX + Math.cos(item.angle) * ITEM_R;
        const iy = CY + Math.sin(item.angle) * ITEM_R;
        const dx = tipX - ix;
        const dy = tipY - iy;

        if (Math.sqrt(dx * dx + dy * dy) < TIP_R + 16) {
          toRemove.add(i);
          if (item.type === 'star') {
            g.score++;
            g.hits.push({ x: ix, y: iy, text: '+1', color: '#b8121b', born: now });
          } else {
            g.lives--;
            g.hits.push({ x: ix, y: iy, text: '-❤', color: '#1a3a6b', born: now });
          }
          changed = true;
        }
      });

      [...toRemove].sort((a, b) => b - a).forEach(i => g.items.splice(i, 1));

      if (changed) setUi(prev => ({ ...prev, score: g.score, lives: Math.max(0, g.lives) }));

      if (g.lives <= 0) {
        g.running = false;
        setUi(prev => ({ score: g.score, lives: 0, best: Math.max(prev.best, g.score), phase: 'over' }));
        ctx.clearRect(0, 0, W, H);
        return;
      }

      // ── Draw ──────────────────────────────────────────
      ctx.clearRect(0, 0, W, H);

      // Orbit ring (dashed)
      ctx.save();
      ctx.beginPath();
      ctx.arc(CX, CY, ORBIT_R, 0, Math.PI * 2);
      ctx.setLineDash([4, 9]);
      ctx.strokeStyle = 'rgba(21,5,6,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Counter-arm (tail)
      const tailX = CX - Math.cos(g.angle) * (ARM_R * 0.38);
      const tailY = CY - Math.sin(g.angle) * (ARM_R * 0.38);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(tailX, tailY);
      ctx.strokeStyle = 'rgba(21,5,6,0.25)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Main arm
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = '#150506';
      ctx.lineWidth = 3;
      ctx.stroke();

      // Center pin
      ctx.beginPath();
      ctx.arc(CX, CY, 8, 0, Math.PI * 2);
      ctx.fillStyle = '#150506';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(CX, CY, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#b8121b';
      ctx.fill();

      // Tip
      ctx.beginPath();
      ctx.arc(tipX, tipY, TIP_R, 0, Math.PI * 2);
      ctx.fillStyle = '#b8121b';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tipX, tipY, TIP_R, 0, Math.PI * 2);
      ctx.strokeStyle = '#150506';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Items
      g.items.forEach(item => {
        const age = now - item.born;
        const alpha = age > 2500 ? (3000 - age) / 500 : 1;
        const ix = CX + Math.cos(item.angle) * ITEM_R;
        const iy = CY + Math.sin(item.angle) * ITEM_R;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (item.type === 'star') {
          const pulse = Math.sin(now * 0.005 + item.angle) * 3;
          ctx.beginPath();
          ctx.arc(ix, iy, 15 + pulse, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(184,18,27,0.3)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = 'bold 26px serif';
          ctx.fillStyle = '#b8121b';
          ctx.fillText('★', ix, iy);
        } else {
          ctx.beginPath();
          ctx.arc(ix, iy, 15, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(26,58,107,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.font = '22px serif';
          ctx.fillText('💰', ix, iy);
        }
        ctx.restore();
      });

      // Hit feedback
      g.hits = g.hits.filter(h => now - h.born < 700);
      g.hits.forEach(h => {
        const age = now - h.born;
        const alpha = 1 - age / 700;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 15px monospace';
        ctx.fillStyle = h.color;
        ctx.textAlign = 'center';
        ctx.fillText(h.text, h.x, h.y - (age / 700) * 28);
        ctx.restore();
      });

      g.animId = requestAnimationFrame(loop);
    }

    g.animId = requestAnimationFrame(loop);
  }, []);

  const handleClick = useCallback(() => {
    const g = gRef.current;
    if (g?.running) g.dir *= -1;
  }, []);

  useEffect(() => {
    return () => {
      const g = gRef.current;
      if (g?.animId) cancelAnimationFrame(g.animId);
    };
  }, []);

  return (
    <div className="game-wrap">
      <div className="game-hud">
        <div className="hud-block">
          <span className="hud-label">Score</span>
          <span className="hud-val hud-score">{ui.score} ★</span>
        </div>
        <div className="hud-block hud-center">
          {ui.best > 0 && <span className="hud-best">Record · {ui.best} ★</span>}
        </div>
        <div className="hud-block hud-right">
          <span className="hud-label">Vies</span>
          <span className="hud-val hud-lives">
            {'★'.repeat(Math.max(0, ui.lives))}{'☆'.repeat(Math.max(0, 3 - ui.lives))}
          </span>
        </div>
      </div>

      <div className="game-canvas-wrap" onClick={handleClick}>
        <canvas ref={canvasRef} width={W} height={H} className="game-canvas" />

        {ui.phase === 'idle' && (
          <div className="game-overlay">
            <div className="game-title">★ Le Jeu du Compas ★</div>
            <div className="game-rules">
              <div className="rule"><span className="rule-icon com">★</span> Attrape les étoiles du peuple</div>
              <div className="rule"><span className="rule-icon cap">💰</span> Évite l'argent capitaliste</div>
              <div className="rule"><span className="rule-icon">↻</span> Clique pour inverser la rotation</div>
            </div>
            <button
              className="game-start-btn"
              onClick={e => { e.stopPropagation(); startGame(); }}
            >
              ▸ Jouer
            </button>
          </div>
        )}

        {ui.phase === 'over' && (
          <div className="game-overlay">
            <div className="game-over-title">Fin de Partie</div>
            <div className="game-final">
              <span className="final-num">{ui.score}</span>
              <span className="final-lbl">★ étoiles pour le peuple</span>
            </div>
            {ui.best > 0 && (
              <div className="game-best-line">Record · {ui.best} ★</div>
            )}
            <button
              className="game-start-btn"
              onClick={e => { e.stopPropagation(); startGame(); }}
            >
              ↺ Rejouer
            </button>
          </div>
        )}
      </div>

      <div className="game-footer">
        {ui.phase === 'playing'
          ? '↻ Clique sur le canvas pour inverser la rotation'
          : 'Jeu arcade · Le Compas Communiste'}
      </div>
    </div>
  );
}
