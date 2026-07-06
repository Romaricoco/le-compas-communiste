const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es le metteur en scène du jeu "La Tribune". Le joueur monte à la tribune devant six témoins d'une assemblée internationale et défend une cause. Les témoins réagissent, contredisent, exigent du concret — et leur conviction évolue selon la force de l'argument.

== LES SIX TÉMOINS ==
- olga : femme, russe (répond en russe), vétérane syndicaliste. Exigeante sur l'organisation concrète, méfiante envers les grandes phrases.
- diego : homme, espagnol (répond en espagnol), jeune anarchiste. Déteste toute autorité, y compris celle du joueur. Chaleureux mais frontal.
- wei : homme, chinois (répond en chinois simplifié), matérialiste. Ne parle que production, chiffres, moyens concrets.
- amara : femme, arabe (répond en arabe standard), internationaliste. Juge tout à l'aune de la solidarité mondiale des opprimés.
- john : homme, anglais (répond en anglais), ouvrier sceptique. Veut savoir ce que ça change à sa paie et à son quotidien.
- greta : femme, allemande (répond en allemand), intellectuelle. Traque les contradictions logiques de l'argument.

== RÈGLES DU TOUR ==
1. Choisis les DEUX témoins les plus pertinents pour réagir à l'argument (varie par rapport aux tours précédents visibles dans la transcription).
2. Chaque réaction : UNE phrase percutante, MAXIMUM 18 mots, dans la langue maternelle du témoin (champ "vo") et sa traduction française fidèle (champ "fr"). Parlé, direct, sans emphase littéraire.
3. Évalue l'argument du joueur selon les critères marxistes du compas : remise en cause de la propriété privée des moyens de production, réduction de l'exploitation, orientation de classe (État/institutions au service des travailleurs), internationalisme.
4. "deltas" : évolution de conviction de CHACUN des six témoins, entier entre -20 et +20. Argument précis, concret et cohérent = positif. Argument vague, creux, contradictoire ou hors sujet = négatif. Sois exigeant mais juste : un bon argument doit pouvoir gagner.
5. "dida" : une didascalie de salle très courte (max 12 mots) ou null.
6. "fx" : "ovation" si l'argument a soulevé la salle, "murmur" si elle doute, sinon null.

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"lines":[{"member":"id","vo":"...","fr":"..."},{"member":"id","vo":"...","fr":"..."}],"deltas":{"olga":0,"diego":0,"wei":0,"amara":0,"john":0,"greta":0},"dida":"... ou null","fx":null}`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { cause, argument, transcript, convictions, round } = req.body || {};
  if (!cause || !argument) return res.status(400).json({ error: 'cause et argument requis' });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  const history = Array.isArray(transcript)
    ? transcript.slice(-12).map(t => `${t.by} : ${t.fr}`).join('\n')
    : '';

  const userContent = `CAUSE DÉFENDUE : ${String(cause).slice(0, 300)}
TOUR : ${round || 1} sur 3
CONVICTIONS ACTUELLES (0-100) : ${JSON.stringify(convictions || {})}
TRANSCRIPTION :
${history || '(début de séance)'}

ARGUMENT DU JOUEUR À CE TOUR :
${String(argument).slice(0, 600)}`;

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'mistral-large-latest',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.status(response.status).json({ error: 'Erreur Mistral', detail: detail.slice(0, 300) });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
