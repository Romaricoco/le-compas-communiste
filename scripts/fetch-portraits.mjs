/* Télécharge les portraits des témoins au moment du build
   (le build Vercel a accès au réseau) et les place dans public/portraits/
   pour que le site les serve lui-même — aucune dépendance externe au runtime.
   Ne fait jamais échouer le build : en cas d'échec, le front a un fallback. */
import { mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, 'public', 'portraits');

const PORTRAITS = {
  olga:  'cwZGbT9S2HU',
  diego: 'ApDREtVkv5Y',
  wei:   '8ukPkmUuSd8',
  amara: '4cA1jDfaVJU',
  john:  'oULrOWE8R5U',
  greta: 'RoV_LoLtZWU',
};

await mkdir(DIR, { recursive: true });

for (const [name, id] of Object.entries(PORTRAITS)) {
  const file = join(DIR, `${name}.jpg`);
  try {
    await access(file);
    console.log(`portraits: ${name}.jpg déjà présent`);
    continue;
  } catch { /* absent → on télécharge */ }

  const url = `https://unsplash.com/photos/${id}/download?force=true&w=900`;
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) throw new Error(`fichier suspect (${buf.length} octets)`);
    await writeFile(file, buf);
    console.log(`portraits: ${name}.jpg téléchargé (${Math.round(buf.length / 1024)} Ko)`);
  } catch (e) {
    console.warn(`portraits: échec ${name} (${id}) — ${e.message} (le front a un fallback)`);
  }
}
