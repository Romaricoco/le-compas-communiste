# CLAUDE.md — Le Compas Communiste

## Project Overview

**Le Compas Communiste** is a French-language political analysis web app. Users submit the name of a law, event, or idea; the app calls the Mistral AI API to score it across four Marxist criteria and returns a "communist vs. capitalist" breakdown. Results can be published to a community feed rendered on the same page.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, JSX (no TypeScript) |
| Styling | Tailwind CSS v4 (via `@tailwindcss/vite` plugin) |
| Build tool | Vite 8 |
| Backend / API | Vercel Serverless Function (`api/analyze.js`) |
| AI model | Mistral AI — `mistral-large-latest` |
| Deployment | Vercel |
| Linting | ESLint 10 (flat config, react-hooks + react-refresh plugins) |

---

## Repository Structure

```
le-compas-communiste/
├── api/
│   └── analyze.js          # Vercel serverless function — calls Mistral AI
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── App.jsx             # Entire application UI (single component)
│   ├── App.css             # Component-scoped styles (currently unused)
│   ├── index.css           # Global CSS — only contains `@import "tailwindcss"`
│   ├── main.jsx            # React entry point (StrictMode + createRoot)
│   └── assets/             # Static images (hero.png, react.svg, vite.svg)
├── index.html              # HTML shell, mounts #root
├── vite.config.js          # Vite config with Tailwind plugin + dev proxy
├── eslint.config.js        # ESLint flat config
├── vercel.json             # Vercel deployment config
└── package.json
```

---

## Development Commands

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Production build → dist/
npm run preview    # Preview production build locally
npm run lint       # Run ESLint across all JS/JSX files
```

### Local API Development

The Vite dev server proxies `/api/*` → `http://localhost:3001` (see `vite.config.js`). The canonical way to run the serverless function locally is with the **Vercel CLI**:

```bash
npx vercel dev     # Serves both frontend and api/ functions on one port
```

Without the Vercel CLI, API calls will fail in dev because there is no `server.js` in this repo (the `npm run server` script references one but it does not exist yet).

### Required Environment Variable

```
MISTRAL_API_KEY=<your key>
```

In local development, place it in a `.env` file at the project root. In Vercel, set it as an environment variable in the project settings.

---

## Architecture & Key Conventions

### Frontend (`src/App.jsx`)

- **Single-component architecture**: all UI lives in `App.jsx`. There are no sub-components, routes, or global state library.
- **State**: managed with `useState` only — no persistence; page refresh resets everything.
  - `analyses` — array of published results (pre-seeded with 3 examples, grows via `handlePublish`)
  - `aiResult` — raw JSON response from `/api/analyze`, shown in a review step before publishing
  - `loading` / `error` — request lifecycle flags
- **Two-step publish flow**: analyze → review AI result → publish to local feed (no backend persistence).
- **Score calculation** in `handlePublish`: counts how many of the 4 criteria keys equal `'capitalist'` to derive a percentage.
- **Language**: all user-facing text is in **French**. Keep new strings in French.
- **Styling**: utility-first Tailwind v4. Dark theme (`bg-gray-900`, `text-gray-100`). Brand colors: red (`red-500/600`) for "communist", blue (`blue-600`) for "capitalist", purple for the AI action button.

### Marxist Analysis Criteria (defined in `CRITERIA_LABELS`)

```js
abolition_propriete_privee  // Abolition of private ownership of means of production
egalite_travail             // End of hierarchy between manual and intellectual labour
dissolution_etat            // Dissolution of centralised states in favour of local deliberation
horizon_mondial             // The World as the sole political horizon
```

The API response must contain exactly these four keys plus `justification`. If you add or rename criteria, update both `CRITERIA_LABELS` in `App.jsx` and the `SYSTEM_PROMPT` in `api/analyze.js`.

### Backend (`api/analyze.js`)

- Vercel serverless function (ES module, `export default async function handler(req, res)`).
- Handles CORS manually (allows `*`); responds to `OPTIONS` preflight.
- Calls Mistral with `temperature: 0.2` and `response_format: { type: 'json_object' }` to ensure structured output.
- System prompt instructs the model to return **only** a valid JSON object with the four criteria keys plus `justification`.
- Reads `MISTRAL_API_KEY` from `process.env`.

---

## Deployment

Deployed on **Vercel**. Configuration in `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

The `api/` directory is auto-detected by Vercel as serverless functions. No additional routing config is needed.

---

## No Test Suite

There are currently no unit or integration tests. Validation is done manually via the UI.

---

## Gotchas & Non-obvious Details

- **`CRITERIA_LABELS` has 4 keys but the score uses `Object.values(aiResult).filter(...)`** — this filter only counts values equal to `'capitalist'` or `'communist'`, so `justification` is naturally excluded without needing special handling.
- **`author` is hardcoded** to `"Vous (Romaric)"` in `handlePublish`. If multi-user support is added, this needs parameterisation.
- **Tailwind v4** uses the `@tailwindcss/vite` plugin instead of a PostCSS plugin. Do not add a `tailwind.config.js` — it's unnecessary with the Vite plugin approach.
- **`App.css`** is imported in `App.jsx` but contains no rules. Leave it or remove it; don't move styles there unless needed.
- **No router** — this is a pure SPA with a single view. Adding routing would require installing `react-router-dom`.
