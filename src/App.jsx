import React, { useState } from 'react';

const INITIAL_ANALYSES = [
  { id: 1, title: "Réforme des retraites 2023", capitalist: 80, communist: 20, author: "Militant45", date: "20 mai 2026", justification: "Allongement du temps de travail au profit du capital." },
  { id: 2, title: "Création de la Sécurité Sociale (1945)", capitalist: 10, communist: 90, author: "Clara_Z", date: "20 mai 2026", justification: "Mutualisation des risques, gestion collective." },
  { id: 3, title: "Privatisation des autoroutes", capitalist: 100, communist: 0, author: "Jean_LePeuple", date: "19 mai 2026", justification: "Transfert de bien public vers le profit privé." }
];

const CRITERIA_LABELS = {
  abolition_propriete_privee: "Abolition de la propriété privée des moyens de production",
  egalite_travail: "Fin de la hiérarchie entre travail manuel et intellectuel",
  dissolution_etat: "Dissolution des États au profit de la délibération locale",
  horizon_mondial: "Le Monde comme seul horizon politique",
};

export default function App() {
  const [inputTitle, setInputTitle] = useState("");
  const [analyses, setAnalyses] = useState(INITIAL_ANALYSES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [pendingId, setPendingId] = useState(null);

  const handleAnalyze = async (e) => {
    e.preventDefault();
    if (!inputTitle.trim()) return;
    setLoading(true);
    setError(null);
    setAiResult(null);

    const newPendingId = Date.now();
    const submittedTitle = inputTitle;
    setPendingId(newPendingId);
    setAnalyses(prev => [{
      id: newPendingId,
      title: submittedTitle,
      pending: true,
      author: "Vous (Romaric)",
      date: "Aujourd'hui",
    }, ...prev]);
    setInputTitle("");

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: submittedTitle }),
      });
      if (!res.ok) throw new Error(`Erreur serveur: ${res.status}`);
      const data = await res.json();

      const scores = Object.values(data).filter(v => v === 'capitalist' || v === 'communist');
      const capitalistCount = scores.filter(v => v === 'capitalist').length;
      const capitalistPercentage = Math.round((capitalistCount / scores.length) * 100);

      setAnalyses(prev => prev.map(a => a.id === newPendingId ? {
        id: newPendingId,
        title: submittedTitle,
        capitalist: capitalistPercentage,
        communist: 100 - capitalistPercentage,
        author: "Vous (Romaric)",
        date: "Aujourd'hui",
        justification: data.justification,
      } : a));
      setAiResult(data);
    } catch (err) {
      setError(err.message);
      setAnalyses(prev => prev.map(a => a.id === newPendingId ? { ...a, pending: false, failed: true } : a));
    } finally {
      setLoading(false);
      setPendingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-50 py-4">
        <div className="max-w-5xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🧭</span>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white uppercase">Le Compas Communiste</h1>
              <p className="text-xs text-red-500 font-bold tracking-widest">DISTINGUER POUR AGIR</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-gray-800 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Prototype V2.0 — IA Active
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-750 shadow-xl">
            <h2 className="text-xl font-bold mb-2 text-white flex items-center gap-2">
              <span>🤖</span> Analyser avec l'IA
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              L'IA analyse automatiquement l'événement selon les 3 piliers marxistes.
            </p>

            <form onSubmit={handleAnalyze} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Événement ou idée à scanner
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:border-red-500 transition"
                  placeholder="Ex: La nationalisation d'EDF, Le pass rail, Uberisation..."
                  value={inputTitle}
                  onChange={(e) => setInputTitle(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all"
              >
                {loading ? '🔄 Analyse en cours...' : '🤖 Analyser avec l\'IA'}
              </button>
            </form>

            {error && (
              <div className="mt-4 bg-red-950 border border-red-700 rounded-xl p-4 text-sm text-red-300">
                ⚠️ {error}
              </div>
            )}

            {aiResult && (
              <div className="mt-6 space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Résultat de l'analyse IA</h3>

                <div className="space-y-2">
                  {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
                    <div key={key} className="bg-gray-950 p-3 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-gray-300">{label}</span>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                        aiResult[key] === 'communist'
                          ? 'bg-red-600/20 text-red-400 border border-red-700'
                          : 'bg-blue-600/20 text-blue-400 border border-blue-700'
                      }`}>
                        {aiResult[key] === 'communist' ? '🔴 Commun' : '🔵 Capitaliste'}
                      </span>
                    </div>
                  ))}
                </div>

                {aiResult.justification && (
                  <p className="text-xs text-gray-400 italic border-l-2 border-red-700 pl-3">
                    {aiResult.justification}
                  </p>
                )}

                <p className="text-xs text-green-500 font-semibold">✅ Publié automatiquement dans le flux</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-750 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <span>📊</span> Flux Global Communautaire
            </h2>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {analyses.map((item) => (
                <div key={item.id} className={`bg-gray-950 p-4 rounded-xl border space-y-3 transition-all duration-300 ${item.pending ? 'border-purple-700/50 opacity-75' : item.failed ? 'border-red-900/50 opacity-60' : 'border-gray-850'}`}>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="text-sm font-bold text-white line-clamp-2">{item.title}</h3>
                    <span className="text-[10px] text-gray-500 whitespace-nowrap bg-gray-900 px-2 py-0.5 rounded">
                      {item.date}
                    </span>
                  </div>

                  {item.pending ? (
                    <div className="flex items-center gap-2 text-xs text-purple-400">
                      <span className="inline-block w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      Analyse IA en cours…
                    </div>
                  ) : item.failed ? (
                    <div className="text-xs text-red-500">⚠️ Analyse échouée</div>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <div className="w-full bg-gray-800 h-3 rounded-full overflow-hidden flex">
                          <div className="bg-blue-600 h-full transition-all duration-500" style={{ width: `${item.capitalist}%` }} />
                          <div className="bg-red-600 h-full transition-all duration-500" style={{ width: `${item.communist}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono font-semibold">
                          <span className="text-blue-400">Capitalisme : {item.capitalist}%</span>
                          <span className="text-red-400">Commun : {item.communist}%</span>
                        </div>
                      </div>

                      {item.justification && (
                        <p className="text-[10px] text-gray-500 italic line-clamp-2">{item.justification}</p>
                      )}
                    </>
                  )}

                  <div className="text-[10px] text-gray-500 flex justify-between items-center pt-1 border-t border-gray-900">
                    <span>Par : <strong className="text-gray-400">{item.author}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-5xl mx-auto px-4 py-8 mt-12 border-t border-gray-850 text-center text-xs text-gray-500">
        <p>"On sauve le monde, une ligne de code à la fois." — Développé pour Romaric.</p>
      </footer>
    </div>
  );
}
