const EL_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET = page de diagnostic : ouvrir /api/tts dans le navigateur
  if (req.method === 'GET') {
    const key = process.env.ELEVENLABS_API_KEY;
    if (!key) {
      return res.status(200).json({
        cle_configuree: false,
        message: 'La variable ELEVENLABS_API_KEY est absente de Vercel (Settings → Environment Variables), ou le site n\'a pas été redéployé après son ajout.',
      });
    }
    try {
      const r = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
        headers: { 'xi-api-key': key },
      });
      if (!r.ok) {
        return res.status(200).json({
          cle_configuree: true,
          cle_valide: false,
          message: `ElevenLabs refuse la clé (HTTP ${r.status}). Elle est probablement invalide ou révoquée — régénère-la et remplace la valeur dans Vercel.`,
        });
      }
      const sub = await r.json();
      return res.status(200).json({
        cle_configuree: true,
        cle_valide: true,
        plan: sub.tier,
        caracteres_utilises: sub.character_count,
        caracteres_limite: sub.character_limit,
        message: 'Tout est en ordre côté clé. Si les voix ne chargent toujours pas, le problème est ailleurs.',
      });
    } catch (err) {
      return res.status(200).json({ cle_configuree: true, erreur: String(err).slice(0, 200) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { text, voiceId } = req.body || {};
  if (!text || !voiceId) return res.status(400).json({ error: 'text et voiceId requis' });
  if (text.length > 500) return res.status(400).json({ error: 'Texte trop long' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY non configurée' });

  try {
    const response = await fetch(`${EL_URL}/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.42, similarity_boost: 0.82, style: 0.45, use_speaker_boost: true },
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return res.status(response.status).json({ error: 'Erreur ElevenLabs', detail: detail.slice(0, 300) });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(200).send(audio);
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur', detail: String(err).slice(0, 200) });
  }
}
