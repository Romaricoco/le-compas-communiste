import { YoutubeTranscript } from 'youtube-transcript';

const MISTRAL_MODEL = 'mistral-large-latest';
const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const SYSTEM_PROMPT = `Tu es un outil d'analyse marxiste radical. On te donne la transcription (ou le titre) d'une vidéo YouTube.
Tu dois évaluer son contenu selon 4 principes communistes fondamentaux :

1. abolition_propriete_privee : Le contenu remet-il en cause la propriété privée des moyens de production ?
2. egalite_travail : Réduit-il la hiérarchie entre travail manuel et intellectuel ?
3. dissolution_etat : Affaiblit-il l'État centralisé au profit de la délibération locale ?
4. horizon_mondial : Transcende-t-il les frontières nationales vers un horizon de l'humanité entière ?

Pour chaque critère, réponds "communist" ou "capitalist".

Réponds UNIQUEMENT en JSON valide, sans markdown :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","dissolution_etat":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"une phrase courte et tranchante"}`;

function extractVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
    /youtube\.com\/shorts\/([^&?/\s]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  const videoId = extractVideoId(url);
  if (!videoId) return res.status(400).json({ error: 'URL YouTube invalide' });

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  let transcriptText = '';
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'fr' })
      .catch(() => YoutubeTranscript.fetchTranscript(videoId));
    transcriptText = segments.map(s => s.text).join(' ').slice(0, 4000);
  } catch {
    // pas de transcription disponible, on analyse via l'URL seule
  }

  const userContent = transcriptText
    ? `Analyse cette vidéo YouTube (transcription) :\n\n${transcriptText}`
    : `Analyse cette vidéo YouTube (pas de transcription disponible) : ${url}`;

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userContent },
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
    res.status(200).json({ ...result, hasTranscript: !!transcriptText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
