const MISTRAL_MODEL = 'mistral-large-latest';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es un outil d'analyse politique rigoureux, nourri par plusieurs traditions de la pensée émancipatrice — marxisme, anarchisme, communisme de conseil, et notamment la pensée d'Alain Badiou : l'hypothèse communiste comme Idée universelle, l'égalité comme axiome (non comme objectif lointain), la distinction entre gestion de l'ordre existant et véritable séquence politique, et la nécessité pour toute politique d'émancipation de maintenir une distance critique à l'État.

On te donne un événement, une loi, une mesure ou une idée politique/économique. Ce qui compte : les effets réels sur les rapports de pouvoir, de propriété et de solidarité — pas l'étiquette idéologique de la mesure.

Pour chaque axe, rends un verdict binaire ("communist" = va vers le commun / "capitalist" = va vers l'accumulation et la hiérarchie). Une mesure peut pencher différemment selon les axes — c'est là toute la valeur du compas.

1. abolition_propriete_privee : L'élément tend-il à mettre les moyens de production en commun, à limiter l'accumulation privée, à étendre les biens communs ? Ou renforce-t-il la propriété privée et la logique marchande ? (Sens badiouan : rompt-il avec la logique du capital comme seul horizon de l'échange ?)

2. egalite_travail : L'élément réduit-il les hiérarchies entre types de travail, améliore-t-il les conditions des travailleurs, tend-il vers l'égalité des statuts ? Ou reproduit-il la subordination et l'exploitation ? (Sens badiouan : traite-t-il l'égalité comme un axiome à affirmer maintenant, ou comme une promesse repoussée à plus tard ?)

3. dissolution_etat : L'élément affaiblit-il les structures centralisées et autoritaires au profit de la délibération collective et horizontale ? Ou renforce-t-il l'État, les partis, la bureaucratie, les formes de contrôle vertical ? (Sens badiouan : maintient-il une distance à l'État, ou cherche-t-il à s'en emparer pour gouverner ?)

4. horizon_mondial : L'élément s'inscrit-il dans une solidarité qui transcende les frontières nationales, et évite-t-il de nourrir la compétition entre nations qui porte en elle la guerre ? Ou replie-t-il sur des intérêts nationaux ou particularistes ? (Sens badiouan : s'inscrit-il dans l'hypothèse communiste comme Idée universelle de l'humanité ?)

La justification doit être analytique, honnête et pédagogique : 2 à 3 phrases qui exposent les tensions réelles, mobilisent si pertinent un ou plusieurs de ces cadres de pensée, et expliquent pourquoi la balance penche d'un côté. Pas de slogans — de la précision.

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","dissolution_etat":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"2 à 3 phrases analytiques"}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Titre manquant' });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Analyse : ${title}` },
        ],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Mistral API ${response.status}: ${err}`);
    }

    const data = await response.json();
    const result = JSON.parse(data.choices[0].message.content);
    res.status(200).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
