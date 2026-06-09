import { useState, useEffect, useRef } from 'react';
import './App.css';
import Game from './Game.jsx';
import { CRITERIA_ICONS } from './CriteriaIcons.jsx';
import EarthBackground from './components/EarthBackground.jsx';

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

const CRITERIA = [
  { id: 'abolition_propriete_privee', n: 'I',   short: 'Propriété',  long: 'Abolition de la propriété privée car la propriété privée protège les riches et maintient les inégalités !' },
  { id: 'egalite_travail',            n: 'II',  short: 'Hiérarchie', long: 'Fin de la hiérarchie entre travail manuel et intellectuel' },
  { id: 'dissolution_etat',           n: 'III', short: 'État',       long: "Dissolution des États et des partis au profit de la délibération locale libre et égalitaire" },
  { id: 'horizon_mondial',            n: 'IV',  short: 'Monde',      long: "Le Monde comme seul horizon politique car il n'y a qu'un seul Monde !" },
];

const EXAMPLES = [
  "Nationalisation d'EDF",
  "Pass rail européen",
  "Uberisation du travail",
  "Privatisation de La Poste",
  "Sécurité sociale (1945)",
];


export default function App() {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [mode, setMode] = useState('text');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileRef = useRef();
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [view, setView] = useState('compas');
  const [showIosBanner, setShowIosBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null); });

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = window.navigator.standalone === true;
    const dismissed = sessionStorage.getItem('ios-banner-dismissed');
    if (isIos && !isStandalone && !dismissed) setShowIosBanner(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  const dismissIosBanner = () => {
    sessionStorage.setItem('ios-banner-dismissed', '1');
    setShowIosBanner(false);
  };

  const reset = () => { setScan(null); setError(null); setPendingItem(null); };

  const runAnalysis = async (fetchPromise, label) => {
    setError(null); setScan(null); setLoading(true);
    const pid = Date.now();
    setPendingItem({ id: pid, title: label, status: 'scanning' });
    try {
      const res = await fetchPromise;
      if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
      const result = await res.json();
      const comCount = CRITERIA.filter(c => result[c.id] === 'communist').length;
      const capPct = Math.round(((CRITERIA.length - comCount) / CRITERIA.length) * 100);
      setScan({ result, capitalist: capPct, hasTranscript: result.hasTranscript });
      setPendingItem(prev => prev ? { ...prev, status: 'ready' } : null);
    } catch (err) {
      setError(err.message || "Erreur d'analyse");
      setPendingItem(prev => prev ? { ...prev, status: 'error' } : null);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    runAnalysis(
      fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: t }) }),
      t
    );
  };

  const handleAnalyzeVideo = (e) => {
    e.preventDefault();
    const u = videoUrl.trim();
    if (!u) return;
    const label = '▶ ' + u.replace(/https?:\/\/(www\.)?/, '').slice(0, 40);
    runAnalysis(
      fetch('/api/analyze-video-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) }),
      label
    );
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
    setScan(null);
    setError(null);
  };

  const handleAnalyzeImage = async (e) => {
    e.preventDefault();
    if (!mediaFile) return;
    const { base64, mimeType } = await resizeImage(mediaFile);
    const label = '🖼 ' + mediaFile.name.slice(0, 40);
    runAnalysis(
      fetch('/api/analyze-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType }) }),
      label
    );
  };

  const state = loading ? 'scanning' : scan ? 'done' : 'idle';
  const status = state === 'scanning'
    ? '// scan en cours…'
    : state === 'done'
      ? `// verdict : ${scan.capitalist < 50 ? 'PENCHE COMMUN' : scan.capitalist > 50 ? 'PENCHE CAPITAL' : 'ÉQUILIBRÉ'}`
      : '// en attente d\'une idée';

  return (
    <>
      <EarthBackground />
      <div style={{ position: 'relative', zIndex: 2 }}>
      <header className="topbar">
        <div className="brand">
          <div className="mark">★</div>
          <div>
            <h1>Le Compas Communiste</h1>
            <div className="tag">// <b>Distinguer pour agir</b> · scan via IA · MMXXVI</div>
          </div>
        </div>
        <nav className="nav">
          <a href="#" className={view === 'compas' ? 'active' : ''} onClick={e => { e.preventDefault(); setView('compas'); }}>Le compas</a>
          <a href="#" className={view === 'jeu' ? 'active' : ''} onClick={e => { e.preventDefault(); setView('jeu'); }}>★ Le Jeu</a>
        </nav>
        {installPrompt && !installed && (
          <button className="install-btn" onClick={handleInstall}>⬇ Installer l'app</button>
        )}
        <div className="status">
          <span className="dot"></span>
          {installed ? 'App installée ✓' : 'Prototype v2.0 · IA active'}
        </div>
      </header>

      {showIosBanner && (
        <div className="ios-banner">
          <span>Pour installer l'app : appuie sur <b>⎋ Partager</b> puis <b>« Sur l'écran d'accueil »</b></span>
          <button onClick={dismissIosBanner}>✕</button>
        </div>
      )}

      <div className="jaures-bar">
        <span className="jaures-quote">«&thinsp;Le capitalisme porte en lui la guerre comme la nuée porte <strong>l'orage</strong>&thinsp;»</span>
        <span className="jaures-author">— Jean Jaurès</span>
      </div>

      {view === 'compas' && <div className="earth-spacer" />}

      {view === 'jeu' && (
        <main className="game-main">
          <Game />
          <aside className="game-aside">
            <div className="game-info-block">
              <div className="game-info-head">▸ Comment jouer</div>
              <div className="game-info-body">
                <p>Le bras du compas tourne en continu autour du centre. <b>Clique</b> n'importe où sur le canvas pour inverser sa direction.</p>
                <p>Attrape les <span className="red">★ étoiles rouges</span> pour marquer des points. Évite les <span className="blue">💰 sacs d'argent</span> — chaque collision te coûte une vie.</p>
                <p>Le compas accélère progressivement. Combien d'étoiles peux-tu récupérer pour le peuple ?</p>
              </div>
            </div>
            <div className="game-info-block">
              <div className="game-info-head">▸ Tableau des valeurs</div>
              <div className="game-info-body">
                <table className="game-score-table">
                  <tbody>
                    <tr><td>Action</td><td>Effet</td></tr>
                    <tr><td>★ Étoile attrapée</td><td>+1 point</td></tr>
                    <tr><td>💰 Argent touché</td><td>−1 vie</td></tr>
                    <tr><td>★ Étoile manquée</td><td>disparaît (−0)</td></tr>
                    <tr><td>Clic / tap</td><td>Inverse la rotation</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </aside>
        </main>
      )}

{view === 'compas' && <main>
        <section className="scanner">
          <div className="scanner-body">
            <h2>
              Qu'est-ce que tu passes au <span className="hl">compas</span><br/>
              aujourd'hui&nbsp;?
            </h2>
            <p className="sub">
              Une idée, un événement, une réforme. <b>Le compas</b> teste si elle penche vers le <span className="com-em">commun</span> ou vers le <span className="cap-em">capital</span>, axiome par axiome. Pas un jugement — un outil d'orientation.
            </p>

            <div className="mode-tabs">
              <button className={mode === 'text' ? 'active' : ''} onClick={() => { setMode('text'); reset(); }}>✎ Texte / Idée</button>
              <button className={mode === 'video' ? 'active' : ''} onClick={() => { setMode('video'); reset(); }}>▶ Vidéo YouTube</button>
              <button className={mode === 'image' ? 'active' : ''} onClick={() => { setMode('image'); reset(); setMediaFile(null); setMediaPreview(null); }}>🖼 Image</button>
            </div>

            {mode === 'text' && (
              <>
                <form className="input-row" onSubmit={handleAnalyze} autoComplete="off">
                  <input
                    type="text"
                    required
                    maxLength={200}
                    placeholder="Ex : Nationalisation d'EDF · Pass rail · Uberisation · Réforme des retraites…"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <button className="scan-btn" type="submit" disabled={loading}>
                    {loading ? '⟳ Analyse…' : '▸ Analyser'}
                  </button>
                </form>
                <div className="examples">
                  <span className="lbl">essaie →</span>
                  {EXAMPLES.map(ex => (
                    <button key={ex} type="button" onClick={() => setTitle(ex)}>{ex.replace(/ .*européen/, ' rail').slice(0, 28)}</button>
                  ))}
                </div>
              </>
            )}

            {mode === 'video' && (
              <form className="input-row" onSubmit={handleAnalyzeVideo} autoComplete="off">
                <input
                  type="url"
                  required
                  placeholder="https://youtube.com/watch?v=… ou youtu.be/…"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                />
                <button className="scan-btn" type="submit" disabled={loading}>
                  {loading ? '⟳ Analyse…' : '▸ Analyser'}
                </button>
              </form>
            )}

            {mode === 'image' && (
              <form className="input-row" onSubmit={handleAnalyzeImage} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                <input type="file" accept="image/*" ref={fileRef} style={{ display: 'none' }} onChange={handleFileChange} />
                <button type="button" className="scan-btn" style={{ marginBottom: 8 }} onClick={() => fileRef.current.click()}>
                  {mediaFile ? `📎 ${mediaFile.name.slice(0, 40)}` : '📂 Choisir une image'}
                </button>
                {mediaPreview && <img src={mediaPreview} alt="preview" style={{ maxHeight: 160, objectFit: 'contain', borderRadius: 4, marginBottom: 8 }} />}
                <button className="scan-btn" type="submit" disabled={loading || !mediaFile}>
                  {loading ? '⟳ Analyse…' : '▸ Analyser l\'image'}
                </button>
              </form>
            )}

            {error && <div className="error">⚠️ {error}</div>}

            <div className="needles">
              <div className="needles-head">
                <span className="t">Les 4 aiguilles</span>
                <hr/>
                <span className="n">{status}</span>
              </div>
              <div className="needles-grid">
                {CRITERIA.map(c => {
                  const cls =
                    state === 'scanning' ? 'needle scanning' :
                    state === 'done'     ? `needle ${scan.result[c.id]}` :
                                            'needle';
                  const verdictLabel =
                    state === 'scanning' ? '· · ·' :
                    state === 'done'
                      ? (scan.result[c.id] === 'communist' ? '● Commun' : '● Capital')
                      : 'à scanner';
                  return (
                    <div key={c.id} className={cls}>
                      <div className="needle-art">{CRITERIA_ICONS[c.id]}</div>
                      <div className="needle-content">
                        <div className="needle-num">{c.n}</div>
                        <div className="lbl"><b>{c.short}</b>{c.long}</div>
                        <div className="verdict">{verdictLabel}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {scan && (
                <>
                  <div className="justification">
                    <span className="lbl">// Justification</span>
                    {scan.result.justification || '—'}
                  </div>

                  <div className="summary">
                    <div className="needles-head" style={{ marginTop: 8, marginBottom: 8 }}>
                      <span className="t" style={{ fontSize: 13 }}>Résultat global</span>
                      <hr/>
                    </div>
                    <div className="summary-bar">
                      <div className="b-cap" style={{ width: `${scan.capitalist}%` }}>
                        {scan.capitalist}%&nbsp;Capital
                      </div>
                      <div className="b-com" style={{ width: `${100 - scan.capitalist}%` }}>
                        Commun&nbsp;{100 - scan.capitalist}%
                      </div>
                    </div>
                  </div>

                  {mode === 'video' && (
                    <div className="transcript-info">
                      {scan.hasTranscript ? '✓ Analysé via transcription' : '⚠ Pas de transcription — analysé via URL'}
                    </div>
                  )}

                  <div className="actions">
                    <button className="ghost" onClick={reset}>↺ Scanner autre chose</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

      </main>}

      <footer className="foot">
        <div className="quote">«&nbsp;De chacun selon ses capacités, <b>à chacun selon ses besoins</b>.&nbsp;» — Karl Marx</div>
        <div className="links">
          <span>GitHub</span><span>RSS</span><span>compas-communiste.fr</span>
        </div>
      </footer>
      </div>
    </>
  );
}
