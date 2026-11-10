// Module partagé : appel LLM avec bascule automatique Mistral -> Groq.
// Les fichiers api/ préfixés par "_" ne sont pas exposés comme fonctions Vercel.

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const MISTRAL_TEXT = 'mistral-large-latest';
const MISTRAL_VISION = 'pixtral-12b-2409';
const GROQ_TEXT = 'openai/gpt-oss-120b';

function hasImages(messages) {
  return messages.some((m) => Array.isArray(m.content) && m.content.some((p) => p.type === 'image_url'));
}

async function chat(url, apiKey, model, messages, temperature, label) {
  let response;
  // les clés gratuites sont limitées en débit : on retente une fois sur 429
  for (let attempt = 0; attempt < 2; attempt++) {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature, response_format: { type: 'json_object' } }),
    });
    if (response.status !== 429) break;
    await new Promise((r) => setTimeout(r, 1600));
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
  const vision = hasImages(messages);

  if (!mistralKey && !groqKey) throw new Error('Aucune clé API configurée (MISTRAL_API_KEY ou GROQ_API_KEY)');

  let mistralError = null;
  if (mistralKey) {
    try {
      const out = await chat(MISTRAL_URL, mistralKey, vision ? MISTRAL_VISION : MISTRAL_TEXT, messages, temperature, 'Mistral');
      return { ...out, _provider: 'mistral' };
    } catch (e) {
      mistralError = e;
      console.error('[llm] Mistral a échoué :', e.message);
    }
  }

  if (vision) {
    throw new Error(
      `Analyse d'image indisponible : ${mistralError ? mistralError.message : 'MISTRAL_API_KEY non configurée'} (Groq ne propose pas de modèle vision).`
    );
  }

  if (!groqKey) throw mistralError;
  const out = await chat(GROQ_URL, groqKey, GROQ_TEXT, messages, temperature, 'Groq');
  return { ...out, _provider: 'groq' };
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
  const [mistral, groq] = await Promise.all([
    check('https://api.mistral.ai/v1/models', process.env.MISTRAL_API_KEY),
    check('https://api.groq.com/openai/v1/models', process.env.GROQ_API_KEY),
  ]);
  const texteOk = mistral.valide || groq.valide;
  const message = mistral.valide
    ? 'Clé Mistral en ordre.'
    : texteOk
      ? `Mistral indisponible (${mistral.configuree ? 'clé refusée HTTP ' + mistral.http : 'clé absente'}) : texte et vidéos servis par Groq, analyse d'IMAGE indisponible. Régénère la clé sur console.mistral.ai et remplace-la dans Vercel.`
      : 'Aucun fournisseur valide : ajoute MISTRAL_API_KEY (ou GROQ_API_KEY) dans Vercel → Settings → Environment Variables, puis redéploie.';
  return { cle_configuree: mistral.configuree, cle_valide: !!mistral.valide, mistral, groq, texte_disponible: !!texteOk, image_disponible: !!mistral.valide, message };
}
