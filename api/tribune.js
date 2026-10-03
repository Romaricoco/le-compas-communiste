const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const CAST = ['esperanza', 'alain', 'felix', 'ana', 'adama', 'roberto'];

const SYSTEM_PROMPT = `Tu écris en direct une séance d'assemblée révolutionnaire, façon soviet : bruyante, passionnée, drôle, exigeante. Le joueur est à la tribune et défend une cause. Au premier rang, six délégués lui répondent ET se répondent entre eux. Ce n'est pas un jury : c'est une discussion vivante où l'on se coupe, se chambre, s'enflamme.

Tout est en français. Les délégués ne connaissent pas le nom du joueur : ils l'appellent « camarade » ou le tutoient.

== LES SIX DÉLÉGUÉS (id → qui ils sont) ==
- felix : Felix, 65 ans, président de séance, fils de républicains espagnols exilés, béret à étoile rouge. Regard visionnaire. Parle par éruptions : colère contenue puis envolées presque prophétiques. Il distribue la parole, recadre, relance. Il parle à presque chaque tour.
- alain : Alain, ~30 ans, le fils de Felix. Révolte sincère mais naïve et fragile, pas dure. Il aime son père mais le provoque (« Tu es seul, papa ! », « Concrètement, on fait quoi ? »). Il s'enthousiasme vite, doute vite.
- esperanza : Esperanza, ~50 ans, ascétique, dignité tragique à l'Antigone. Voix rauque, phrases brutes, aucun vernis. Elle a tout perdu une fois et ne se laisse plus payer de mots. Humour noir, très sec.
- ana : Ana, fin de vingtaine, violoniste, douce, poétique, jamais criarde. Internationaliste : elle ramène toujours le débat aux opprimés d'ailleurs. Elle fait le pont quand ça s'écharpe, avec une image qui touche.
- adama : Adama, ~40 ans, docker, petit-fils de harki. Grand, timide, force tranquille. Parle peu, lentement, et quand il parle la salle se tait. Il veut savoir ce que ça change pour ceux qui bossent. Phrases courtes.
- roberto : Roberto, ~40 ans, ancien gendarme, théâtral et tendre, esthétique de cabaret. Son registre bascule sans prévenir entre le ton grave du policier et l'envolée théâtrale aiguë : l'instabilité est le personnage. Il fait rire, désamorce, puis lâche une vérité qui pique.

== LES LIGNES DE FRACTURE (elles doivent se sentir) ==
- Felix le prophète contre le concret d'Esperanza et d'Adama (« Tes visions, Felix, ça remplit pas une gamelle »).
- Le père et le fils : Alain conteste Felix, Felix s'emporte puis s'attendrit.
- Roberto casse la tension quand elle devient lourde ; Ana relie les camps.

== RÈGLES DU TOUR ==
1. Écris EXACTEMENT 3 répliques. Felix en a souvent une (pas forcément la première). Si la liste « PAS ENCORE ENTENDUS » n'est pas vide, au moins un de ces délégués doit parler ce tour-ci.
2. Un vrai échange :
   - réplique 1 : réagit à CE QUE LE JOUEUR VIENT DE DIRE, précisément (reprends un mot ou une idée de son argument) ;
   - réplique 2 : répond au délégué de la réplique 1, en le nommant (accord, contradiction, moquerie) ;
   - réplique 3 : relance — vers un autre délégué ou vers le joueur.
3. Chaque réplique : une ou deux phrases parlées, 25 mots maximum, compréhensibles seules. Pas de langue de bois, pas de formule creuse.
4. "to" : à qui la réplique s'adresse — l'id d'un délégué, ou "joueur".
5. Environ un tour sur trois, un délégué lance une citation réelle et exacte (Marx, Engels, Lénine, Rosa Luxemburg, Mao, Jaurès, Louise Michel…), courte, criée, au service de l'argument.
6. Au moins un tour sur deux contient de l'humour : une pique, une moquerie fraternelle, un fou rire. Une assemblée vivante, jamais un tribunal.
7. Juge l'argument du joueur selon le compas marxiste : remet-il en cause la propriété privée des moyens de production, réduit-il l'exploitation, sert-il les travailleurs contre le capital, est-il internationaliste ? Précis et concret = la salle suit. Vague, creux ou contradictoire = elle décroche.
8. "deltas" : variation de conviction de CHAQUE délégué, entier entre -20 et +20, cohérente avec ce qu'il vient de dire (un délégué qui s'emballe pour l'argument ne peut pas perdre de points).
9. "fx" : "ovation" si la salle est soulevée, "rire" si elle rit, "murmure" si elle doute ou grogne, sinon null.
10. "dida" : une courte didascalie de salle (12 mots max) ou null.
11. "question" : la dernière relance adressée au joueur, simple et orale, 15 mots max (« Et toi camarade, qui paierait ? »), avec "by" = l'id de celui qui la pose. null si personne ne l'interpelle.

Réponds UNIQUEMENT avec ce JSON :
{"lines":[{"member":"id","to":"id|joueur","fr":"..."},{"member":"id","to":"id|joueur","fr":"..."},{"member":"id","to":"id|joueur","fr":"..."}],"deltas":{"esperanza":0,"alain":0,"felix":0,"ana":0,"adama":0,"roberto":0},"fx":null,"dida":null,"question":{"by":"id","fr":"..."}}`;

const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));

/* Mistral se trompe parfois de format : on ne laisse passer vers le
   jeu qu'une réponse propre, avec des id connus. */
function sanitize(raw) {
  const lines = (Array.isArray(raw.lines) ? raw.lines : [])
    .filter(l => l && CAST.includes(l.member) && typeof l.fr === 'string' && l.fr.trim())
    .slice(0, 4)
    .map(l => ({
      member: l.member,
      to: CAST.includes(l.to) ? l.to : 'joueur',
      fr: l.fr.trim().slice(0, 240),
    }));
  const deltas = {};
  CAST.forEach(id => { deltas[id] = clampInt(raw.deltas?.[id], -20, 20); });
  const fx = ['ovation', 'rire', 'murmure'].includes(raw.fx) ? raw.fx : (raw.fx === 'murmur' ? 'murmure' : null);
  let question = null;
  if (raw.question && typeof raw.question === 'object' && typeof raw.question.fr === 'string' && raw.question.fr.trim()) {
    question = { by: CAST.includes(raw.question.by) ? raw.question.by : 'felix', fr: raw.question.fr.trim().slice(0, 160) };
  } else if (typeof raw.question === 'string' && raw.question.trim()) {
    question = { by: 'felix', fr: raw.question.trim().slice(0, 160) };
  }
  const dida = typeof raw.dida === 'string' && raw.dida.trim() && raw.dida !== 'null' ? raw.dida.trim().slice(0, 100) : null;
  return { lines, deltas, fx, dida, question };
}

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
      const r = await fetch('https://api.mistral.ai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
      if (!r.ok) {
        return res.status(200).json({
          cle_configuree: true,
          cle_valide: false,
          message: `Mistral refuse la clé (HTTP ${r.status}). Régénère-la dans ton compte Mistral et remplace-la dans Vercel.`,
        });
      }
      return res.status(200).json({ cle_configuree: true, cle_valide: true, message: 'Tout est en ordre côté Mistral.' });
    } catch (err) {
      return res.status(200).json({ cle_configuree: true, erreur: String(err).slice(0, 200) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { cause, argument, transcript, convictions, round, rounds } = req.body || {};
  if (!cause || !argument) return res.status(400).json({ error: 'cause et argument requis' });

  // La clé collée dans l'app (en-tête) prime sur celle de Vercel
  const localKey = req.headers['x-mistral-key'];
  const apiKey = localKey || process.env.MISTRAL_API_KEY;
  const keySource = localKey ? 'clé collée dans l’app' : 'clé du site (Vercel)';
  if (!apiKey) return res.status(500).json({ error: 'Aucune clé Mistral : ni sur Vercel (MISTRAL_API_KEY), ni collée dans l’app' });

  const transcriptArr = Array.isArray(transcript) ? transcript : [];
  const history = transcriptArr.slice(-15).map(t => `${t.by === 'joueur' ? 'JOUEUR' : t.by} : ${t.fr}`).join('\n');
  // calculé sur tout l'historique, pas sur la fenêtre envoyée au modèle
  const spoken = new Set(transcriptArr.map(t => t.by));
  const notYetHeard = CAST.filter(id => id !== 'felix' && !spoken.has(id));

  const userContent = `CAUSE DÉFENDUE : ${String(cause).slice(0, 300)}
TOUR : ${round || 1} sur ${rounds || 5}
CONVICTIONS ACTUELLES (0-100) : ${JSON.stringify(convictions || {})}
PAS ENCORE ENTENDUS : ${notYetHeard.length ? notYetHeard.join(', ') : 'aucun'}
CE QUI S'EST DIT :
${history || '(ouverture de séance)'}

LE JOUEUR, À LA TRIBUNE, DIT MAINTENANT :
« ${String(argument).slice(0, 600)} »`;

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
          temperature: 0.75,
          response_format: { type: 'json_object' },
        }),
      });
      if (response.status !== 429) break;
      await new Promise(r => setTimeout(r, 1600));
    }

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.status(response.status).json({
        error: `Mistral a répondu ${response.status} avec la ${keySource}`,
        detail: detail.slice(0, 200),
      });
    }

    const data = await response.json();
    const parsed = sanitize(JSON.parse(data.choices[0].message.content));
    if (!parsed.lines.length) return res.status(502).json({ error: 'L’assemblée a bafouillé (réponse vide), renvoie ton argument.' });
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
