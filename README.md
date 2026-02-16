# 💝 Memory Lane

A personal relationship memory app with AI-assisted chat, semantic browse search, and AI gift idea generation.

## Features

- Add and organize memories by category, tags, and date
- Browse memories with:
  - Chronological list (default)
  - Keyword search
  - **Semantic Search** (server-generated semantic vectors + cosine similarity)
- Ask AI questions about your saved memories
- Generate gift ideas grounded in saved memories
- Export/import local memory data

## Local Development

```bash
npm install
netlify dev
```

App runs at `http://localhost:8888`.

## Environment Variables

Create `.env` in project root (for local) or add in Netlify site settings:

```bash
ANTHROPIC_API_KEY=your_anthropic_key
```

- `ANTHROPIC_API_KEY` is used by `/api/chat`, `/api/embed`, and `/api/gift-ideas`.
- API keys are server-side only (Netlify Functions), not exposed in frontend code.

## Serverless Functions and Routing

Functions live in:

- `netlify/functions/chat.js`
- `netlify/functions/embed.js`
- `netlify/functions/gift-ideas.js`

`netlify.toml` routes:

- `/api/chat` → `/.netlify/functions/chat`
- `/api/embed` → `/.netlify/functions/embed`
- `/api/gift-ideas` → `/.netlify/functions/gift-ideas`

## Semantic Search Details

When a memory is saved, the app embeds this combined text:

`category + " | " + tags + " | " + memory text`

The memory object stores:

- `embedding` (vector)
- `embeddingModel` (`claude-semantic-v1`)

In Browse:

- Empty search: chronological view
- Search + Semantic Search ON: query embedding + cosine similarity ranking
- Search + Semantic Search OFF: keyword search
- Older memories without embeddings are lazily embedded in batches of up to 20
- If embedding fails, app falls back to keyword search and shows a non-blocking message

## AI Gift Generator Details

In the Chat tab:

- Click **Generate Gift Ideas**
- Enter occasion, budget, timeframe
- App sends composed question + up to 80 selected memories (priority categories: gifts/favorites/activities, then recency)

`/api/gift-ideas` returns:

```json
{
  "ideas": [
    {
      "title": "...",
      "why": "...",
      "priceRange": "...",
      "effort": "low|medium|high",
      "relatedMemories": ["..."]
    }
  ],
  "followUps": ["...", "..."]
}
```

The UI renders ideas as cards and shows follow-up questions.

## Tech Stack

- HTML, CSS, vanilla JavaScript
- Netlify Functions (Node 18+)
- Anthropic SDK (chat + semantic vectors + gift generation)
- localStorage for persistence
