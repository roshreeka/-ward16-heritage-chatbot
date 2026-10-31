# Ward 16 Heritage Guide

A chatbot that answers questions about six cultural heritage sites in Ward 16 of Kathmandu Metropolitan City: **Balaju 22 Dhara, Pyatho Ajima, Mhepi Ajima, Siddhi Ganesh (Sorakhutte), Nanak Math and Koncha Dyo**. Answers come from the *Ward 16 Heritage Research Report* and are generated with Google Gemini.

- `server/` – Node.js + Express API (plain JavaScript, `@google/genai`)
- `client/` – React + TypeScript (Vite)
- No authentication or database (test setup). Chat history is stored in the browser.

## How it works

The report is small (~3k tokens), so instead of a vector database the whole report is placed in Gemini's system instruction on every request. The prompt tells the model to answer only from the report, cite its reference numbers (e.g. `[4]`), keep the report's uncertainties and safety caveats, and reply in English or Nepali to match the user.

`server/scripts/ingest.js` converts the `.docx` in `server/data/source/` into `server/data/sites.json` (site text, aliases, photos, references, suggested questions). Re-run it after editing the report:

```bash
npm run ingest --prefix server
```

## Setup

Requires Node.js 20+.

```bash
npm run install:all
cp server/.env.example server/.env   # then set GEMINI_API_KEY (free key: https://aistudio.google.com/apikey)
```

A `.env` in the repo root also works. On Windows, make sure the file isn't saved as `.env.txt`.

### Development

```bash
npm run dev:server   # http://localhost:3001
npm run dev:client   # http://localhost:5173 (proxies /api to the server)
```

### Production-style (single port)

```bash
npm run build && npm start   # server also serves client/dist on http://localhost:3001
```

## Configuration (`server/.env`)

| Variable | Default | Description |
| --- | --- | --- |
| `GEMINI_API_KEY` | – | Google AI Studio API key (required) |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite` | Gemini model ID |
| `PORT` | `3001` | API port |
| `CORS_ORIGIN` | `*` | Allowed browser origin |
| `RATE_LIMIT_PER_MINUTE` | `15` | Chat requests per IP per minute |

## API

- `GET /api/sites` – the six sites with aliases, suggested questions and photo links
- `GET /api/references` – report references
- `POST /api/chat` – body `{ message, siteId?, history?: [{ role: "user" | "model", text }] }`; responds with server-sent events `data: {"text": "..."}` … `data: {"done": true}` (or `data: {"error": "..."}`)

## Tests

```bash
npm test     # server (vitest + supertest, Gemini mocked) and client (vitest + Testing Library)
npm run lint
```

## Known data limitations

- **Koncha Dyo** is not documented in the report; the bot says so instead of inventing details.
- Some in-text citation numbers in the report do not line up with its reference list (e.g. section 2 cites `[5]` for The Rising Nepal, which is reference 2). The bot reproduces the report's numbers as written.
