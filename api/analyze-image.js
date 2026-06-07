const SYSTEM_PROMPT = `Tu es un outil d'analyse marxiste rigoureux et historiquement informé. On te donne une image à contenu politique, économique ou idéologique.
Tu dois l'évaluer selon 4 critères et répondre "communist" ou "capitalist" pour chacun.

== DÉFINITIONS FERMES — à appliquer sans exception ==

PROPRIÉTÉ COLLECTIVE ÉTATIQUE = COMMUNIST.
Dans la tradition marxiste (Marx, Engels, Lénine, Mao), la propriété étatique des moyens de production est une forme légitime et communiste de propriété collective dans la phase de transition. Toute nationalisation va dans le sens communist par rapport à la propriété privée capitaliste.

ÉTAT CENTRALISÉ AU SERVICE DES TRAVAILLEURS = COMMUNIST.
Un État ou un parti fort qui défend les intérêts de la classe ouvrière est "communist". La centralisation n'est capitaliste que si elle sert les intérêts de la bourgeoisie.

COMPARAISON PAR RAPPORT AU STATU QUO CAPITALISTE.
La comparaison se fait TOUJOURS par rapport à la propriété privée capitaliste. Ne pas invalider une mesure au motif qu'elle n'est pas "suffisamment" communiste.

INTERDIT ABSOLU : n'utilise jamais "stalinien", "bureaucratique", "nostalgique" comme jugements négatifs dans la justification.

POUR LES IMAGES : analyse le contenu idéologique réel visible (affiches, slogans, symboles, contexte). N'infère jamais une position idéologique à partir de l'apparence physique des personnes.

== LES 4 CRITÈRES ==

1. abolition_propriete_privee : L'élément remet-il en cause la propriété privée des moyens de production ? Propriété collective, étatique ou commune = "communist". Propriété privée défendue = "capitalist".

2. egalite_travail : L'élément réduit-il l'exploitation du travail et les inégalités entre travailleurs ? Lutte contre l'exploitation = "communist". Maintien des rapports d'exploitation = "capitalist".

3. rapport_etat_capital : L'État, le parti ou l'institution en jeu sert-il les travailleurs et s'oppose-t-il au capital privé ("communist") ou protège-t-il les intérêts de la bourgeoisie ("capitalist") ?

4. horizon_mondial : L'élément s'inscrit-il dans la solidarité internationale des travailleurs et peuples opprimés ("communist") ou défend-il des intérêts nationaux étroits ("capitalist") ?

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","rapport_etat_capital":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"une phrase analytique précise fondée sur le contenu visible, sans étiquette péjorative"}`;

export const config = {
  api: { bodyParser: { sizeLimit: '20mb' } },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) return res.status(400).json({ error: 'Image manquante' });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'pixtral-12b-2409',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } },
              { type: 'text', text: 'Analyse le contenu politique et idéologique de cette image selon les 4 critères marxistes.' },
            ],
          },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) throw new Error(`Mistral API ${response.status}: ${await response.text()}`);
    const data = await response.json();
    res.status(200).json(JSON.parse(data.choices[0].message.content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
