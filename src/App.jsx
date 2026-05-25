import { useState, useEffect } from 'react';
import './App.css';
import Game from './Game.jsx';

const CRITERIA = [
  { id: 'abolition_propriete_privee', n: 'I',   short: 'Propriété',  long: 'Abolition de la propriété privée des moyens de production' },
  { id: 'egalite_travail',            n: 'II',  short: 'Hiérarchie', long: 'Fin de la hiérarchie entre travail manuel et intellectuel' },
  { id: 'dissolution_etat',           n: 'III', short: 'État',       long: "Dissolution des États au profit de la délibération locale" },
  { id: 'horizon_mondial',            n: 'IV',  short: 'Monde',      long: 'Le Monde comme seul horizon politique' },
];

const EXAMPLES = [
  "Nationalisation d'EDF",
  "Pass rail européen",
  "Uberisation du travail",
  "Privatisation de La Poste",
  "Sécurité sociale (1945)",
];

const FLUX_STORAGE_KEY = 'compas:flux:v1';

function loadFlux() {
  try {
    const raw = localStorage.getItem(FLUX_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

export default function App() {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [mode, setMode] = useState('text');
  const [loading, setLoading] = useState(false);
  const [scan, setScan] = useState(null);
  const [error, setError] = useState(null);
  const [flux, setFlux] = useState(loadFlux);
  const [newId, setNewId] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [view, setView] = useState('compas');

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  };

  useEffect(() => {
    try { localStorage.setItem(FLUX_STORAGE_KEY, JSON.stringify(flux)); } catch {}
  }, [flux]);

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
      fetch('/api/analyze-video', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: u }) }),
      label
    );
  };

  const handlePublish = () => {
    if (!scan) return;
    const id = pendingItem?.id || Date.now();
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const label = mode === 'video'
      ? ('▶ ' + videoUrl.replace(/https?:\/\/(www\.)?/, '').slice(0, 40))
      : title.trim();
    setFlux(prev => [{
      id,
      title: label,
      capitalist: scan.capitalist,
      communist: 100 - scan.capitalist,
      author: 'Vous',
      date: today,
      justification: scan.result.justification,
    }, ...prev]);
    setNewId(id);
    setTitle('');
    setVideoUrl('');
    setScan(null);
    setError(null);
    setPendingItem(null);
  };

  const removeFlux = (id) => setFlux(prev => prev.filter(it => it.id !== id));

  const state = loading ? 'scanning' : scan ? 'done' : 'idle';
  const status = state === 'scanning'
    ? '// scan en cours…'
    : state === 'done'
      ? `// verdict : ${scan.capitalist < 50 ? 'PENCHE COMMUN' : scan.capitalist > 50 ? 'PENCHE CAPITAL' : 'ÉQUILIBRÉ'}`
      : '// en attente d\'une idée';

  const fluxCount = flux.length + (pendingItem ? 1 : 0);

  return (
    <>
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
          <div className="scanner-head">
            <div className="num">·· Boussole n° <b>01</b> ·· Scan ··</div>
            <div className="meta">4 aiguilles · réponse en ~6 sec</div>
          </div>
          <div className="scanner-body">
            <div className="stamp">Libre<br/>diffusion<br/>MMXXVI</div>

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
            </div>

            {mode === 'text' ? (
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
            ) : (
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
                      <div className="id">{c.n}</div>
                      <div className="lbl"><b>{c.short}</b>{c.long}</div>
                      <div className="verdict">{verdictLabel}</div>
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
                    <button onClick={handlePublish}>▸ Publier dans le flux</button>
                    <button className="ghost" onClick={reset}>↺ Scanner autre chose</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <aside className="flux">
          <div className="flux-head">
            <h3>▤ Flux communautaire</h3>
            <span className="count">{fluxCount} analyse{fluxCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flux-list">
            {pendingItem && (
              <article className={`card pending-card ${pendingItem.status}`}>
                <div className="row1">
                  <div className="title">{pendingItem.title}</div>
                  <div className="date">à l'instant</div>
                </div>
                <div className="pending-status">
                  {pendingItem.status === 'scanning' && '⟳ Analyse en cours…'}
                  {pendingItem.status === 'ready'    && '✓ Prête — publie pour enregistrer'}
                  {pendingItem.status === 'error'    && '⚠ Analyse échouée'}
                </div>
              </article>
            )}
            {flux.length === 0 && !pendingItem ? (
              <div className="flux-empty">
                <div className="empty-icon">▤</div>
                <div className="empty-title">Aucun scan encore.</div>
                <div className="empty-sub">Tes analyses publiées s'empileront ici — local, sur ta machine.</div>
              </div>
            ) : flux.map(item => (
              <article key={item.id} className={'card' + (item.id === newId ? ' new' : '')}>
                <div className="row1">
                  <div className="title">{item.title}</div>
                  <div className="date">{item.date}</div>
                </div>
                <div className="bar">
                  <div className="cap" style={{ width: `${item.capitalist}%` }}></div>
                  <div className="com" style={{ width: `${item.communist}%` }}></div>
                </div>
                <div className="pcts">
                  <span className="cap-l">▲ Capital · {item.capitalist}%</span>
                  <span className="com-l">{item.communist}% · Commun ▲</span>
                </div>
                {item.justification && (
                  <div className="just">«&nbsp;{item.justification}&nbsp;»</div>
                )}
                <div className="row-foot">
                  <span className="author">par <b>{item.author}</b></span>
                  <button className="del" onClick={() => removeFlux(item.id)} title="Retirer du flux">✕</button>
                </div>
              </article>
            ))}
          </div>
        </aside>
      </main>}

      <footer className="foot">
        <div className="quote">«&nbsp;On sauve le monde, <b>une ligne de code</b> à la fois.&nbsp;»</div>
        <div className="links">
          <span>GitHub</span><span>RSS</span><span>compas-communiste.fr</span>
        </div>
      </footer>
    </>
  );
}
