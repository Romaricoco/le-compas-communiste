const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es un outil d'analyse marxiste rigoureux et historiquement informé. On te donne un événement, une loi, une mesure ou une idée politique/économique.
Tu dois l'évaluer selon 4 critères et répondre "communist" ou "capitalist" pour chacun.

== DÉFINITIONS FERMES — à appliquer sans exception ==

PROPRIÉTÉ COLLECTIVE ÉTATIQUE = COMMUNIST.
Dans la tradition marxiste (Marx, Engels, Lénine, Mao), la propriété étatique des moyens de production est une forme légitime et communiste de propriété collective dans la phase de transition. Toute nationalisation va dans le sens communist par rapport à la propriété privée capitaliste.

ÉTAT CENTRALISÉ AU SERVICE DES TRAVAILLEURS = COMMUNIST.
Un État ou un parti fort qui défend les intérêts de la classe ouvrière et s'oppose au capital privé est "communist". La centralisation en elle-même n'est pas un critère — l'orientation de classe l'est.

COMPARAISON PAR RAPPORT AU STATU QUO CAPITALISTE.
La comparaison se fait TOUJOURS par rapport à la propriété privée capitaliste, jamais par rapport à un idéal communiste parfait. Ne pas invalider une mesure au motif qu'elle n'est pas "suffisamment" communiste.

INTERDIT ABSOLU : n'utilise jamais "stalinien", "bureaucratique", "nostalgique" comme jugements négatifs. Ces termes sont des étiquettes polémiques, pas des analyses marxistes.

TRADITIONS TOUTES ÉGALEMENT COMMUNISTES : marxisme-léninisme, maoïsme, trotskisme, communisme de conseil, eurocommunisme. Ne hiérarchise pas ces traditions.

== LES 4 CRITÈRES ==

1. abolition_propriete_privee : L'élément remet-il en cause la propriété privée des moyens de production ? Propriété collective, étatique ou commune = "communist". Propriété privée défendue = "capitalist".

2. egalite_travail : L'élément réduit-il l'exploitation du travail et les inégalités entre travailleurs ? Lutte contre l'exploitation = "communist". Maintien des rapports d'exploitation = "capitalist".

3. rapport_etat_capital : L'État, le parti ou l'institution en jeu sert-il les travailleurs et s'oppose-t-il au capital privé ("communist") ou protège-t-il les intérêts de la bourgeoisie et du capital financier ("capitalist") ?

4. horizon_mondial : L'élément s'inscrit-il dans la solidarité internationale des travailleurs et peuples opprimés ("communist") ou défend-il des intérêts nationaux/communautaires au détriment de cette solidarité ("capitalist") ?

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","rapport_etat_capital":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"une phrase analytique précise, sans étiquette péjorative"}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = diagnostic : ouvre /api/analyze dans le navigateur pour savoir
  // si la clé Mistral est configurée et valide sur Vercel.
  if (req.method === 'GET') {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
      return res.status(200).json({
        cle_configuree: false,
        message: 'MISTRAL_API_KEY est absente de Vercel. Va dans Settings → Environment Variables et ajoute-la, puis redéploie.',
      });
    }
    try {
      const r = await fetch('https://api.mistral.ai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
      if (!r.ok) {
        return res.status(200).json({
          cle_configuree: true,
          cle_valide: false,
          message: `Mistral refuse la clé (HTTP ${r.status}). Régénère-la sur console.mistral.ai et remplace-la dans Vercel.`,
        });
      }
      return res.status(200).json({ cle_configuree: true, cle_valide: true, message: 'Clé Mistral en ordre.' });
    } catch (err) {
      return res.status(200).json({ cle_configuree: true, erreur: String(err).slice(0, 200) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titre manquant' });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyse : ${title}` },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Mistral API ${response.status}: ${await response.text()}`);
    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    // find État value by trying all known key variants, then by exclusion
    const KNOWN_KEYS = ['abolition_propriete_privee', 'egalite_travail', 'horizon_mondial', 'justification', 'hasTranscript'];
    const etatVal = result.rapport_etat_capital || result.dissolution_etat || result.etat || result.rapport_etat || result.etat_capital
      || Object.entries(result).find(([k, v]) => !KNOWN_KEYS.includes(k) && (v === 'communist' || v === 'capitalist'))?.[1];
    res.status(200).json({ ...result, rapport_etat_capital: etatVal, _debug_keys: Object.keys(result) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
