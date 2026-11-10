// Module partagé : appel LLM avec bascule automatique Mistral -> Groq, et Gemini (gratuit) pour les images.
// Les fichiers api/ préfixés par "_" ne sont pas exposés comme fonctions Vercel.

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Gemini expose un point d'entrée compatible OpenAI (images + response_format json).
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';

const MISTRAL_TEXT = 'mistral-large-latest';
const MISTRAL_VISION = 'pixtral-12b-2409';
const GROQ_TEXT = 'openai/gpt-oss-120b';
// Alias "latest" : suit la version courante (les numéros précis sont retirés aux nouveaux comptes).
// "lite" d'abord : rapide et fiable (le modèle complet est souvent saturé ou bloque) ; l'autre en secours.
const GEMINI_MODELS = [process.env.GEMINI_MODEL || 'gemini-flash-lite-latest', 'gemini-flash-latest'];

async function chatGemini(apiKey, messages, temperature) {
  let lastError;
  for (const model of GEMINI_MODELS) {
    try {
      return await chat(GEMINI_URL, apiKey, model, messages, temperature, `Gemini(${model})`);
    } catch (e) {
      lastError = e;
      console.error('[llm] Gemini', model, 'a échoué :', e.message.slice(0, 160));
    }
  }
  throw lastError;
}

function hasImages(messages) {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));
}

async function chat(url, apiKey, model, messages, temperature, label) {
  let response;
  // les clés gratuites sont limitées en débit (429) et Gemini a des pics de demande (503) :
  // on retente quelques fois avec une courte pause
  for (let attempt = 0; attempt < 3; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, response_format: { type: 'json_object' } }),
      signal: AbortSignal.timeout(15000), // ne jamais rester suspendu : sinon on passe au secours
    });
    if (response.status !== 429 && response.status !== 503) break;
    await new Promise((r) => setTimeout(r, 1600 * (attempt + 1)));
  }
  if (!response.ok) throw new Error(`${label} API ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Appelle le LLM et renvoie l'objet JSON parsé.
 * - Texte : Mistral d'abord, puis Groq si Mistral échoue ou n'est pas configuré.
 * - Image : Mistral (Pixtral) uniquement ; erreur explicite sinon.
 * Le résultat porte `_provider` ("mistral" | "groq") pour le diagnostic.
 * `mistralKey` permet d'imposer une clé Mistral (ex. clé collée dans l'app).
 */
export async function callLLM(messages, { temperature = 0.2, mistralKey = process.env.MISTRAL_API_KEY } = {}) {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  const vision = hasImages(messages);

  if (!mistralKey && !groqKey && !geminiKey) {
    throw new Error('Aucune clé API configurée (MISTRAL_API_KEY, GROQ_API_KEY ou GEMINI_API_KEY)');
  }

  let lastError = null;

  if (mistralKey) {
    try {
      const out = await chat(MISTRAL_URL, mistralKey, vision ? MISTRAL_VISION : MISTRAL_TEXT, messages, temperature, 'Mistral');
      return { ...out, _provider: 'mistral' };
    } catch (e) {
      lastError = e;
      console.error('[llm] Mistral a échoué :', e.message);
    }
  }

  // Images : Groq ne sait pas lire les images, on passe par Gemini.
  if (vision) {
    if (geminiKey) {
      try {
        const out = await chatGemini(geminiKey, messages, temperature);
        return { ...out, _provider: 'gemini' };
      } catch (e) {
        lastError = e;
        console.error('[llm] Gemini a échoué :', e.message);
      }
    }
    throw new Error(
      `Analyse d'image indisponible : ${lastError ? lastError.message : 'aucune clé vision configurée (GEMINI_API_KEY ou MISTRAL_API_KEY)'}`
    );
  }

  // Texte : Groq, puis Gemini en dernier secours.
  if (groqKey) {
    try {
      const out = await chat(GROQ_URL, groqKey, GROQ_TEXT, messages, temperature, 'Groq');
      return { ...out, _provider: 'groq' };
    } catch (e) {
      lastError = e;
      console.error('[llm] Groq a échoué :', e.message);
    }
  }
  if (geminiKey) {
    const out = await chatGemini(geminiKey, messages, temperature);
    return { ...out, _provider: 'gemini' };
  }
  throw lastError;
}

/** Diagnostic des deux fournisseurs (pour les GET /api/...). */
export async function diagnoseProviders() {
  const check = async (url, key) => {
    if (!key) return { configuree: false };
    try {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      return { configuree: true, valide: r.ok, http: r.status };
    } catch (e) {
      return { configuree: true, erreur: String(e).slice(0, 200) };
    }
  };
  const [mistral, groq, gemini] = await Promise.all([
    check('https://api.mistral.ai/v1/models', process.env.MISTRAL_API_KEY),
    check('https://api.groq.com/openai/v1/models', process.env.GROQ_API_KEY),
    check('https://generativelanguage.googleapis.com/v1beta/openai/models', process.env.GEMINI_API_KEY),
  ]);
  const texteOk = mistral.valide || groq.valide || gemini.valide;
  const imageOk = mistral.valide || gemini.valide;
  const message = !texteOk
    ? 'Aucun fournisseur valide : ajoute GROQ_API_KEY ou GEMINI_API_KEY dans Vercel → Settings → Environment Variables, puis redéploie.'
    : imageOk
      ? 'Texte, vidéos et images disponibles.'
      : "Texte et vidéos disponibles ; analyse d'IMAGE indisponible : ajoute GEMINI_API_KEY (gratuite sur aistudio.google.com) dans Vercel.";
  return { cle_configuree: mistral.configuree, cle_valide: !!mistral.valide, mistral, groq, gemini, texte_disponible: !!texteOk, image_disponible: !!imageOk, message };
}
