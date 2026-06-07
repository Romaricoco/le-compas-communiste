import React, { useState, useRef } from 'react';

function resizeImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.8).split(',')[1], mimeType: 'image/jpeg' });
    };
    img.src = url;
  });
}

function extractVideoFrames(file, numFrames = 4) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    const frames = [];
    let idx = 0;
    const canvas = document.createElement('canvas');

    video.addEventListener('loadedmetadata', () => {
      const w = Math.min(video.videoWidth, 640);
      canvas.width = w;
      canvas.height = Math.round(w * video.videoHeight / video.videoWidth);
      const timestamps = Array.from({ length: numFrames }, (_, i) =>
        (i / Math.max(numFrames - 1, 1)) * (video.duration - 0.1)
      );
      const next = () => { video.currentTime = timestamps[idx]; };
      video.addEventListener('seeked', () => {
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push({ base64: canvas.toDataURL('image/jpeg', 0.7).split(',')[1], mimeType: 'image/jpeg' });
        idx++;
        if (idx < timestamps.length) next();
        else { URL.revokeObjectURL(url); resolve(frames); }
      });
      next();
    });
    video.addEventListener('error', reject);
    video.load();
  });
}

const INITIAL_ANALYSES = [
  { id: 1, title: "Réforme des retraites 2023", capitalist: 80, communist: 20, author: "Militant45", date: "20 mai 2026", justification: "Allongement du temps de travail au profit du capital." },
  { id: 2, title: "Création de la Sécurité Sociale (1945)", capitalist: 10, communist: 90, author: "Clara_Z", date: "20 mai 2026", justification: "Mutualisation des risques, gestion collective." },
  { id: 3, title: "Privatisation des autoroutes", capitalist: 100, communist: 0, author: "Jean_LePeuple", date: "19 mai 2026", justification: "Transfert de bien public vers le profit privé." }
];

const CRITERIA_LABELS = {
  abolition_propriete_privee: "Abolition de la propriété privée des moyens de production",
  egalite_travail: "Réduction des inégalités et lutte contre l'exploitation du travail",
  rapport_etat_capital: "L'État ou le parti au service des travailleurs, non du capital",
  horizon_mondial: "Solidarité internationale des peuples et travailleurs",
};

function CompassGauge({ communist }) {
  const capitalist = 100 - communist;
  const radius = 80;
  const cx = 110;
  const cy = 110;
  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const totalAngle = endAngle - startAngle;
  const commAngle = startAngle + (communist / 100) * totalAngle;

  const polarToCart = (angle, r) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcPath = (startA, endA, r) => {
    const s = polarToCart(startA, r);
    const e = polarToCart(endA, r);
    const large = endA - startA > Math.PI ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const needleAngle = startAngle + (communist / 100) * totalAngle;
  const needleTip = polarToCart(needleAngle, radius - 10);
  const needleBase1 = polarToCart(needleAngle + Math.PI / 2, 8);
  const needleBase2 = polarToCart(needleAngle - Math.PI / 2, 8);

  return (
    <div style={{ textAlign: 'center', padding: '16px 0' }}>
      <svg width="220" height="130" viewBox="0 0 220 130">
        {/* Fond demi-cercle */}
        <path d={arcPath(Math.PI, 2 * Math.PI, radius + 14)} stroke="#1a0000" strokeWidth="28" fill="none" />
        {/* Arc capitaliste */}
        <path d={arcPath(Math.PI, commAngle, radius + 14)} stroke="#1a3a6e" strokeWidth="26" fill="none" />
        {/* Arc communiste */}
        <path d={arcPath(commAngle, 2 * Math.PI, radius + 14)} stroke="#cc0000" strokeWidth="26" fill="none" />
        {/* Bord extérieur */}
        <path d={arcPath(Math.PI, 2 * Math.PI, radius + 27)} stroke="#3a0000" strokeWidth="2" fill="none" />
        <path d={arcPath(Math.PI, 2 * Math.PI, radius + 1)} stroke="#3a0000" strokeWidth="2" fill="none" />
        {/* Aiguille */}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBase1.x},${needleBase1.y} ${cx},${cy} ${needleBase2.x},${needleBase2.y}`}
          fill="#e8d5c4"
          stroke="#8a0000"
          strokeWidth="1"
        />
        <circle cx={cx} cy={cy} r="7" fill="#cc0000" stroke="#8a0000" strokeWidth="2" />
        {/* Labels */}
        <text x="22" y="118" fill="#6a9ad4" fontSize="11" fontWeight="700">CAPITAL.</text>
        <text x="148" y="118" fill="#cc0000" fontSize="11" fontWeight="700">COMMUN.</text>
      </svg>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '4px' }}>
        <span style={{ fontSize: '13px', color: '#6a9ad4', fontWeight: 700, fontFamily: 'monospace' }}>
          {capitalist}%
        </span>
        <span style={{ fontSize: '13px', color: '#cc0000', fontWeight: 700, fontFamily: 'monospace' }}>
          {communist}%
        </span>
      </div>
    </div>
  );
}

function ScoreBar({ capitalist, communist }) {
  return (
    <div>
      <div style={{
        width: '100%',
        height: '10px',
        background: '#0a0000',
        borderRadius: '5px',
        overflow: 'hidden',
        display: 'flex',
        border: '1px solid #2a0000',
      }}>
        <div style={{ width: `${capitalist}%`, background: '#1a3a6e', transition: 'width 0.5s' }} />
        <div style={{ width: `${communist}%`, background: '#cc0000', transition: 'width 0.5s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
        <span style={{ fontSize: '11px', color: '#6a9ad4', fontFamily: 'monospace', fontWeight: 700 }}>
          ▶ Cap. {capitalist}%
        </span>
        <span style={{ fontSize: '11px', color: '#cc0000', fontFamily: 'monospace', fontWeight: 700 }}>
          Com. {communist}% ◀
        </span>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState('text'); // 'text' | 'image' | 'video'
  const [inputTitle, setInputTitle] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [error, setError] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [analyses, setAnalyses] = useState(INITIAL_ANALYSES);
  const fileRef = useRef();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setAiResult(null);
    setError(null);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAiResult(null);

    try {
      if (mode === 'text') {
        if (!inputTitle.trim()) return;
        setLoadingMsg('Analyse en cours...');
        const res = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: inputTitle }),
        });
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
        setAiResult(await res.json());

      } else if (mode === 'image') {
        if (!mediaFile) return;
        setLoadingMsg('Traitement de l\'image...');
        const { base64, mimeType } = await resizeImage(mediaFile);
        setLoadingMsg('Analyse marxiste en cours...');
        const res = await fetch('/api/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
        setAiResult(await res.json());

      } else if (mode === 'video') {
        if (!inputTitle.trim()) return;
        setLoadingMsg('Récupération des miniatures YouTube...');
        const res = await fetch('/api/analyze-video-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: inputTitle }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || `Erreur serveur: ${res.status}`);
        }
        setAiResult(await res.json());
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMsg('');
    }
  };

  const getCommScore = (result) => {
    if (!result) return 50;
    const scores = Object.values(result).filter(v => v === 'capitalist' || v === 'communist');
    const commCount = scores.filter(v => v === 'communist').length;
    return scores.length ? Math.round((commCount / scores.length) * 100) : 50;
  };

  const handlePublish = () => {
    if (!aiResult) return;
    const communist = getCommScore(aiResult);
    setAnalyses([{
      id: Date.now(),
      title: inputTitle,
      capitalist: 100 - communist,
      communist,
      author: "Vous (Romaric)",
      date: "Aujourd'hui",
      justification: aiResult.justification,
    }, ...analyses]);
    setInputTitle("");
    setAiResult(null);
  };

  const s = {
    page: { minHeight: '100vh', background: '#0a0000', color: '#e8d5c4', fontFamily: "'Georgia', serif" },
    header: { background: '#cc0000', borderBottom: '4px solid #8a0000', position: 'sticky', top: 0, zIndex: 50 },
    headerInner: { maxWidth: '1040px', margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    emblem: { fontSize: '2.8rem', lineHeight: 1, color: '#fff' },
    title: { margin: 0, fontSize: '1.4rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#fff' },
    subtitle: { margin: 0, fontSize: '0.65rem', letterSpacing: '0.25em', color: '#ffcccc', fontFamily: 'monospace', fontWeight: 700 },
    badge: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '20px', padding: '6px 14px', fontSize: '12px', color: '#fff', fontWeight: 600 },
    pulseDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' },
    redLine: { height: '3px', background: 'linear-gradient(to right, #8a0000, #cc0000, #8a0000)', margin: 0, border: 'none' },
    main: { maxWidth: '1040px', margin: '0 auto', padding: '28px 24px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' },
    card: { background: '#120000', border: '1px solid #3a0000', borderRadius: '4px', padding: '24px', boxShadow: '0 4px 24px rgba(0,0,0,0.6)' },
    cardTitle: { margin: '0 0 6px', fontSize: '1rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#cc0000', display: 'flex', alignItems: 'center', gap: '8px' },
    cardDesc: { margin: '0 0 20px', fontSize: '0.9rem', color: '#a08070', lineHeight: 1.5 },
    label: { display: 'block', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#a08070', marginBottom: '8px' },
    input: { width: '100%', background: '#0a0000', border: '1px solid #4a1010', borderRadius: '3px', padding: '12px 14px', color: '#e8d5c4', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', fontFamily: "'Georgia', serif" },
    btnAnalyze: { width: '100%', background: '#cc0000', border: 'none', borderRadius: '3px', padding: '14px', color: '#fff', fontSize: '0.95rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', marginTop: '14px' },
    btnPublish: { width: '100%', background: '#8a0000', border: '1px solid #cc0000', borderRadius: '3px', padding: '12px', color: '#fff', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' },
    errorBox: { marginTop: '14px', background: '#1a0000', border: '1px solid #8a0000', borderRadius: '3px', padding: '12px', fontSize: '0.85rem', color: '#ff8080' },
    divider: { border: 'none', borderTop: '1px solid #2a0000', margin: '20px 0' },
    criteriaRow: { background: '#0a0000', border: '1px solid #2a0000', borderRadius: '3px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
    criteriaLabel: { fontSize: '1rem', color: '#c0a090', lineHeight: 1.4 },
    tagCom: { fontSize: '0.9rem', fontWeight: 700, padding: '5px 14px', borderRadius: '2px', background: 'rgba(180,0,0,0.3)', color: '#ff6060', border: '1px solid #8a0000', whiteSpace: 'nowrap' },
    tagCap: { fontSize: '0.9rem', fontWeight: 700, padding: '5px 14px', borderRadius: '2px', background: 'rgba(30,60,120,0.3)', color: '#6a9ad4', border: '1px solid #1a3a6e', whiteSpace: 'nowrap' },
    justification: { fontSize: '1rem', color: '#a08070', fontStyle: 'italic', borderLeft: '3px solid #8a0000', paddingLeft: '12px', margin: '16px 0 0', lineHeight: 1.6 },
    fluxItem: { background: '#0a0000', border: '1px solid #2a0000', borderRadius: '3px', padding: '14px', marginBottom: '10px' },
    fluxTitle: { margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#e8d5c4', lineHeight: 1.3 },
    fluxMeta: { fontSize: '0.72rem', color: '#6a5a50', display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #1a0000' },
    footer: { maxWidth: '1040px', margin: '0 auto', padding: '28px 24px', textAlign: 'center', borderTop: '1px solid #2a0000', fontSize: '1rem', color: '#a08070', fontStyle: 'italic' },
  };

  const commScore = getCommScore(aiResult);

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={s.emblem}>☭</div>
            <div>
              <h1 style={s.title}>Le Compas Communiste</h1>
              <p style={s.subtitle}>★ DISTINGUER POUR AGIR ★</p>
            </div>
          </div>
          <div style={s.badge}>
            <div style={s.pulseDot} />
            Prototype V2.0 — IA Active
          </div>
        </div>
      </header>
      <hr style={s.redLine} />

      <main style={s.main}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Formulaire */}
          <div style={s.card}>
            <h2 style={s.cardTitle}>★ Analyser avec l'IA</h2>

            {/* Onglets */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
              {[
                { key: 'text', label: '📝 Texte' },
                { key: 'image', label: '🖼 Image' },
                { key: 'video', label: '🎬 Vidéo' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => { setMode(tab.key); setAiResult(null); setError(null); setMediaFile(null); setMediaPreview(null); }}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '3px',
                    border: mode === tab.key ? '1px solid #cc0000' : '1px solid #3a0000',
                    background: mode === tab.key ? '#cc0000' : '#0a0000',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    letterSpacing: '0.05em',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleAnalyze}>
              {mode === 'text' && (
                <>
                  <label style={s.label}>Événement ou idée à scanner</label>
                  <input
                    type="text"
                    required
                    style={s.input}
                    placeholder="Ex : La nationalisation d'EDF, le pass rail, l'ubérisation..."
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                  />
                </>
              )}

              {mode === 'image' && (
                <>
                  <label style={s.label}>Image à analyser</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    required
                    onChange={handleFileChange}
                    style={{ ...s.input, padding: '10px', cursor: 'pointer' }}
                  />
                  {mediaPreview && (
                    <img
                      src={mediaPreview}
                      alt="Aperçu"
                      style={{ width: '100%', maxHeight: '220px', objectFit: 'contain', marginTop: '12px', border: '1px solid #3a0000', borderRadius: '3px' }}
                    />
                  )}
                </>
              )}

              {mode === 'video' && (
                <>
                  <label style={s.label}>Lien YouTube à analyser</label>
                  <input
                    type="url"
                    required
                    style={s.input}
                    placeholder="Ex : https://www.youtube.com/watch?v=..."
                    value={inputTitle}
                    onChange={(e) => setInputTitle(e.target.value)}
                  />
                  {inputTitle && inputTitle.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/) && (
                    <img
                      src={`https://img.youtube.com/vi/${inputTitle.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/)[1]}/mqdefault.jpg`}
                      alt="Miniature"
                      style={{ width: '100%', marginTop: '12px', border: '1px solid #3a0000', borderRadius: '3px' }}
                    />
                  )}
                  <p style={{ fontSize: '0.8rem', color: '#6a5a50', marginTop: '8px' }}>
                    Les miniatures YouTube sont analysées par l'IA.
                  </p>
                </>
              )}

              <button type="submit" disabled={loading} style={{ ...s.btnAnalyze, opacity: loading ? 0.6 : 1 }}>
                {loading ? `⟳ ${loadingMsg}` : '★ Analyser avec l\'IA'}
              </button>
            </form>
            {error && <div style={s.errorBox}>⚠ {error}</div>}
          </div>

          {/* Résultats */}
          {aiResult && (
            <div style={s.card}>
              <h2 style={s.cardTitle}>★ Résultat de l'analyse</h2>

              {/* Compas visuel */}
              <CompassGauge communist={commScore} />

              <hr style={s.divider} />

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                  <div key={key} style={s.criteriaRow}>
                    <span style={s.criteriaLabel}>{label}</span>
                    <span style={aiResult[key] === 'communist' ? s.tagCom : s.tagCap}>
                      {aiResult[key] === 'communist' ? '★ Commun.' : '▶ Capital.'}
                    </span>
                  </div>
                ))}
              </div>

              {aiResult.justification && (
                <p style={s.justification}>{aiResult.justification}</p>
              )}

              <div style={{ marginTop: '20px' }}>
                <button onClick={handlePublish} style={s.btnPublish}>
                  ☭ Publier dans le Flux
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Profils */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[
            {
              nom: "Vladimir Ilitch Lénine",
              dates: "1870 – 1924",
              photo: "/lenine.jpg",
              role: "Théoricien & révolutionnaire russe",
              citation: "« La liberté est si précieuse qu'il faut la rationner. »",
              faits: [
                "Fondateur de l'URSS (1922)",
                "Théorie de l'impérialisme (1917)",
                "Révolution d'Octobre 1917",
                "NEP — compromis tactique (1921)",
              ],
            },
            {
              nom: "Mao Zedong",
              dates: "1893 – 1976",
              photo: "/mao.jpg",
              role: "Fondateur de la République Populaire de Chine",
              citation: "« Le pouvoir politique est au bout du fusil. »",
              faits: [
                "RPC fondée le 1er octobre 1949",
                "Grand Bond en Avant (1958–1962)",
                "Révolution Culturelle (1966–1976)",
                "Maoïsme — marxisme adapté aux paysans",
              ],
            },
          ].map((p) => (
            <div key={p.nom} style={s.card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                <img src={p.photo} alt={p.nom} style={{ width: '72px', height: '88px', objectFit: 'cover', objectPosition: 'top', border: '2px solid #cc0000', borderRadius: '3px', flexShrink: 0 }} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: '#e8d5c4', letterSpacing: '0.05em' }}>{p.nom}</h2>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#cc0000', fontWeight: 700, letterSpacing: '0.1em' }}>{p.dates}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#a08070' }}>{p.role}</p>
                </div>
              </div>

              <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#c0a090', borderLeft: '3px solid #cc0000', paddingLeft: '12px', margin: '0 0 14px', lineHeight: 1.5 }}>
                {p.citation}
              </p>

              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#6a5a50', marginBottom: '8px' }}>Faits clés</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {p.faits.map((f) => (
                  <li key={f} style={{ fontSize: '0.85rem', color: '#c0a090', paddingLeft: '16px', position: 'relative', lineHeight: 1.4 }}>
                    <span style={{ position: 'absolute', left: 0, color: '#cc0000' }}>★</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>

      <footer style={s.footer}>
        "On sauve le monde, une ligne de code à la fois." — Développé pour Romaric.
      </footer>
    </div>
  );
}
