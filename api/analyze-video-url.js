const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';

const INNERTUBE_CLIENT_VERSION = '20.10.38';
const INNERTUBE_USER_AGENT = `com.google.android.youtube/${INNERTUBE_CLIENT_VERSION} (Linux; U; Android 14)`;
const SCRAPER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)';

function decodeXmlEntities(text) {
  return text
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}

function parseTranscriptXml(xml) {
  const segments = [];
  const pRegex = /<p\s+t="(\d+)"\s+d="(\d+)"[^>]*>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = pRegex.exec(xml)) !== null) {
    const inner = m[3];
    let text = '';
    const sRegex = /<s[^>]*>([^<]*)<\/s>/g;
    let sm;
    while ((sm = sRegex.exec(inner)) !== null) text += sm[1];
    if (!text) text = inner.replace(/<[^>]+>/g, '');
    text = decodeXmlEntities(text).trim();
    if (text) segments.push(text);
  }
  return segments.join(' ').replace(/\s+/g, ' ').trim();
}

async function fetchYouTubeTranscript(videoId) {
  // Essayer plusieurs clients Innertube — certains sont moins bloqués depuis les IPs cloud
  const clients = [
    {
      name: 'ANDROID',
      headers: { 'Content-Type': 'application/json', 'User-Agent': INNERTUBE_USER_AGENT },
      body: { context: { client: { clientName: 'ANDROID', clientVersion: INNERTUBE_CLIENT_VERSION } }, videoId },
    },
    {
      name: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (SMART-TV; Linux; Tizen 6.0) AppleWebKit/538.1 (KHTML, like Gecko) Version/6.0 TV Safari/538.1' },
      body: {
        context: {
          client: { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', hl: 'fr' },
          thirdParty: { embedUrl: `https://www.youtube.com/watch?v=${videoId}` },
        },
        videoId,
      },
    },
    {
      name: 'IOS',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'com.google.ios.youtube/19.09.3 (iPhone; CPU iPhone OS 17_4 like Mac OS X)' },
      body: { context: { client: { clientName: 'IOS', clientVersion: '19.09.3', deviceModel: 'iPhone16,2', hl: 'fr' } }, videoId },
    },
  ];

  for (const client of clients) {
    try {
      const playerResp = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST', headers: client.headers, body: JSON.stringify(client.body),
      });
      if (!playerResp.ok) continue;
      const playerData = await playerResp.json();
      const tracks = playerData?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`[transcript] ${client.name}: playability=${playerData?.playabilityStatus?.status} tracks=${tracks?.length}`);
      if (!tracks?.length) continue;

      const asrTrack = tracks.find(t => t.kind === 'asr');
      const track = asrTrack || tracks[0];
      const suffix = track.kind === 'asr' ? '&kind=asr' : '';
      const captionResp = await fetch(track.baseUrl + suffix, { headers: { 'User-Agent': SCRAPER_USER_AGENT } });
      if (!captionResp.ok) continue;
      const xml = await captionResp.text();
      const parsed = parseTranscriptXml(xml);
      console.log(`[transcript] ${client.name}: caption xml=${xml.length} parsed=${parsed.length}`);
      if (parsed.length > 200) return parsed;
    } catch (e) {
      console.log(`[transcript] ${client.name} error:`, e.message);
    }
  }

  // Fallback : scraping page web
  console.log('[transcript] trying web page fallback...');
  try {
    const pageResp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: { 'User-Agent': SCRAPER_USER_AGENT, 'Accept-Language': 'fr-FR,fr;q=0.9' },
    });
    if (!pageResp.ok) return '';
    const html = await pageResp.text();
    const marker = 'var ytInitialPlayerResponse = ';
    const idx = html.indexOf(marker);
    if (idx === -1) { console.log('[transcript] ytInitialPlayerResponse not found in page'); return ''; }
    const jsonStart = idx + marker.length;
    let depth = 0, inString = false, escaped = false, jsonEnd = -1;
    for (let i = jsonStart; i < html.length; i++) {
      const c = html[i];
      if (escaped) { escaped = false; continue; }
      if (c === '\\' && inString) { escaped = true; continue; }
      if (c === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { jsonEnd = i + 1; break; } }
    }
    if (jsonEnd === -1) return '';
    const pr = JSON.parse(html.slice(jsonStart, jsonEnd));
    const tracks = pr?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    console.log('[transcript] web page tracks:', tracks?.length);
    if (!tracks?.length) return '';
    const asrTrack = tracks.find(t => t.kind === 'asr');
    const orderedTracks = [asrTrack, ...tracks.filter(t => t !== asrTrack)].filter(Boolean);
    for (const track of orderedTracks) {
      const captionResp = await fetch(track.baseUrl, { headers: { 'User-Agent': SCRAPER_USER_AGENT } });
      const xml = captionResp.ok ? await captionResp.text() : '';
      const parsed = parseTranscriptXml(xml);
      console.log(`[transcript] web page caption: kind=${track.kind || 'manual'} xml=${xml.length} parsed=${parsed.length}`);
      if (parsed.length > 200) return parsed;
    }
  } catch (e) {
    console.log('[transcript] web page error:', e.message);
  }
  return '';
}

const SYSTEM_PROMPT = `Tu es un outil d'analyse marxiste rigoureux et historiquement informé. On te donne un événement, une loi, une mesure, une idée politique/économique, ou le contenu d'une vidéo YouTube (titre, transcription et/ou miniatures).
Tu dois l'évaluer selon 4 critères et répondre "communist" ou "capitalist" pour chacun.

== DÉFINITIONS FERMES — à appliquer sans exception ==

PROPRIÉTÉ COLLECTIVE ÉTATIQUE = COMMUNIST.
Dans la tradition marxiste (Marx, Engels, Lénine, Mao), la propriété étatique des moyens de production est une forme légitime et communiste de propriété collective dans la phase de transition. Affirmer qu'elle est "non communiste" est une position anarchiste ou libertarienne — pas une vérité marxiste. Si un élément promeut la propriété collective ou étatique contre la propriété privée capitaliste, c'est "communist".

ÉTAT CENTRALISÉ AU SERVICE DES TRAVAILLEURS = COMMUNIST.
Un État ou un parti fort qui défend les intérêts de la classe ouvrière et s'oppose au capital privé est "communist". Ce n'est capitaliste que si cet État sert les intérêts de la bourgeoisie. La centralisation en elle-même n'est pas un critère — l'orientation de classe l'est.

COMPARAISON PAR RAPPORT AU STATU QUO CAPITALISTE.
La comparaison se fait TOUJOURS par rapport à la propriété privée capitaliste, jamais par rapport à un idéal communiste parfait. Toute nationalisation, même sous un État bourgeois, va dans le sens communist par rapport au statu quo. Ne pas invalider une mesure au motif qu'elle n'est pas "suffisamment" communiste.

INTERDIT ABSOLU : n'utilise jamais les mots "stalinien", "bureaucratique", "nostalgique" comme jugements de valeur négatifs dans la justification. Ces termes sont des étiquettes polémiques, pas des analyses marxistes.

TRADITIONS TOUTES ÉGALEMENT COMMUNISTES : marxisme-léninisme, maoïsme, trotskisme, communisme de conseil, eurocommunisme, communisme badiousien. Ne hiérarchise pas ces traditions et ne disqualifie pas l'une au profit d'une autre.

POUR LES VIDÉOS : si tu as accès au titre ou à la transcription, appuie-toi EN PRIORITÉ sur ce contenu textuel. Les miniatures sont secondaires et ne doivent JAMAIS servir à inférer une position idéologique à partir de l'apparence physique du locuteur.

== LES 4 CRITÈRES ==

1. abolition_propriete_privee : L'élément remet-il en cause la propriété privée des moyens de production ? Propriété collective, étatique ou commune = "communist". Propriété privée défendue = "capitalist".

2. egalite_travail : L'élément réduit-il l'exploitation du travail et les inégalités entre travailleurs ? Lutte contre l'exploitation = "communist". Maintien des rapports d'exploitation = "capitalist".

3. rapport_etat_capital : L'État, le parti ou l'institution en jeu sert-il les travailleurs et s'oppose-t-il au capital privé ("communist") ou protège-t-il les intérêts de la bourgeoisie et du capital financier ("capitalist") ?

4. horizon_mondial : L'élément s'inscrit-il dans la solidarité internationale des travailleurs et peuples opprimés ("communist") ou défend-il des intérêts nationaux/communautaires au détriment de cette solidarité ("capitalist") ?

Réponds UNIQUEMENT en JSON valide, sans markdown, sans explication :
{"abolition_propriete_privee":"capitalist|communist","egalite_travail":"capitalist|communist","rapport_etat_capital":"capitalist|communist","horizon_mondial":"capitalist|communist","justification":"une phrase analytique précise fondée sur le contenu réel, sans étiquette péjorative"}`;

async function callMistral(apiKey, model, messages) {
  const response = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.2, response_format: { type: 'json_object' } }),
  });
  if (!response.ok) throw new Error(`Mistral API ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL manquante' });

  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return res.status(400).json({ error: 'URL YouTube non reconnue.' });

  const videoId = match[1];
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'MISTRAL_API_KEY non configurée' });

  try {
    // 1. Titre via oEmbed
    let videoTitle = '';
    let videoAuthor = '';
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
      if (oembedRes.ok) {
        const d = await oembedRes.json();
        videoTitle = d.title || '';
        videoAuthor = d.author_name || '';
      }
    } catch (_) {}

    // 2. Transcription (sous-titres via Innertube Android)
    let transcriptText = '';
    try {
      const raw = await fetchYouTubeTranscript(videoId);
      console.log('[handler] raw transcript length:', raw.length);
      if (raw.length > 500) transcriptText = raw.slice(0, 8000);
    } catch (err) {
      console.error('[handler] transcript error:', err.message);
    }

    // 3. Si transcription substantielle → analyse texte pure (plus fiable)
    if (transcriptText) {
      const contextText = [
        videoTitle ? `Titre : "${videoTitle}"${videoAuthor ? ` — par ${videoAuthor}` : ''}.` : '',
        `Transcription (extrait) : ${transcriptText}`,
      ].filter(Boolean).join('\n');

      const result = await callMistral(apiKey, 'mistral-large-latest', [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Analyse cette vidéo YouTube :\n${contextText}` },
      ]);
      return res.status(200).json({ ...result, videoId, source: 'transcript' });
    }

    // 4. Fallback : miniatures + titre
    const thumbUrls = [
      `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      `https://img.youtube.com/vi/${videoId}/1.jpg`,
      `https://img.youtube.com/vi/${videoId}/2.jpg`,
      `https://img.youtube.com/vi/${videoId}/3.jpg`,
    ];

    const frames = (await Promise.all(thumbUrls.map(async (thumbUrl) => {
      const r = await fetch(thumbUrl);
      if (!r.ok) return null;
      const buf = await r.arrayBuffer();
      return { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${Buffer.from(buf).toString('base64')}` } };
    }))).filter(Boolean);

    if (!frames.length) return res.status(400).json({ error: 'Impossible de récupérer les miniatures.' });

    const titleContext = videoTitle
      ? `Titre de la vidéo : "${videoTitle}"${videoAuthor ? ` — par ${videoAuthor}` : ''}. `
      : '';

    const result = await callMistral(apiKey, 'pixtral-12b-2409', [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          ...frames,
          {
            type: 'text',
            text: `${titleContext}Ces images sont des miniatures YouTube. IMPORTANT : si les miniatures ne montrent pas de contenu idéologique explicite, appuie-toi principalement sur le titre. N'infère jamais une position idéologique à partir de l'apparence physique du locuteur.`,
          },
        ],
      },
    ]);

    return res.status(200).json({ ...result, videoId, source: 'thumbnails' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
