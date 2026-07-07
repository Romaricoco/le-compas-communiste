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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Mistral-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = diagnostic Mistral
  if (req.method === 'GET') {
    const key = process.env.MISTRAL_API_KEY;
    if (!key) {
      return res.status(200).json({
        cle_configuree: false,
        message: 'MISTRAL_API_KEY est absente de Vercel. Va dans Settings → Environment Variables et ajoute-la.',
      });
    }
    try {
      const r = await fetch('https://api.mistral.ai/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      if (!r.ok) {
        return res.status(200).json({
          cle_configuree: true,
          cle_valide: false,
          message: `Mistral refuse la clé (HTTP ${r.status}). Régénère-la dans ton compte Mistral et remplace-la dans Vercel.`,
        });
      }
      return res.status(200).json({
        cle_configuree: true,
        cle_valide: true,
        message: 'Tout est en ordre côté Mistral.',
      });
    } catch (err) {
      return res.status(200).json({ cle_configuree: true, erreur: String(err).slice(0, 200) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { cause, argument, transcript, convictions, round } = req.body || {};
  if (!cause || !argument) return res.status(400).json({ error: 'cause et argument requis' });

  // La clé collée dans l'app (en-tête) prime sur celle de Vercel
  const apiKey = req.headers['x-mistral-key'] || process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Aucune clé Mistral : ni sur Vercel (MISTRAL_API_KEY), ni collée dans l’app' });

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
    let response;
    // les clés gratuites Mistral sont limitées en débit : on retente une fois
    for (let attempt = 0; attempt < 2; attempt++) {
      response = await fetch(MISTRAL_URL, {
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
      if (response.status !== 429) break;
      await new Promise(r => setTimeout(r, 1600));
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.status(response.status).json({
        error: `Mistral a répondu ${response.status}`,
        detail: detail.slice(0, 200),
      });
    }

    const data = await response.json();
    const parsed = JSON.parse(data.choices[0].message.content);
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
