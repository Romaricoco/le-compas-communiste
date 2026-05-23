const MISTRAL_MODEL = 'mistral-small-latest';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es un outil d'analyse marxiste radical. On te donne un événement, une loi, une mesure ou une idée politique/économique.
Tu dois l'évaluer selon 4 principes communistes fondamentaux et dire pour chacun si l'élément analysé va dans le sens communiste ("communist") ou capitaliste/réactionnaire ("capitalist") :

1. abolition_propriete_privee : L'élément remet-il en cause la propriété privée des moyens de production ? Tend-il vers le commun universel ou renforce-t-il l'accumulation privée ?
2. egalite_travail : L'élément réduit-il la hiérarchie entre travail manuel et intellectuel ? Tend-il vers l'égalité des fonctions et des statuts ?
3. dissolution_etat : L'élément affaiblit-il l'État centralisé et les structures de parti au profit de la délibération locale et horizontale ?
4. horizon_mondial : L'élément transcende-t-il les frontières nationales pour s'inscrire dans un horizon de l'humanité entière ?

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","dissolution_etat":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"une phrase courte et tranchante"}`;

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
        temperature: 0.2,
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
