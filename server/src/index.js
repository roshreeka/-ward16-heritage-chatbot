import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { createApp } from './app.js';
import { createGeminiChat } from './gemini.js';

const envFiles = ['../.env', '../../.env'].map((p) => fileURLToPath(new URL(p, import.meta.url)));
dotenv.config({ path: envFiles, quiet: true });
for (const file of envFiles) {
  if (existsSync(`${file}.txt`)) console.warn(`Found ${file}.txt; rename it to .env (Windows may hide the .txt extension).`);
}

const port = Number(process.env.PORT) || 3001;
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';

const app = createApp({
  streamChat: createGeminiChat({ apiKey: process.env.GEMINI_API_KEY, model }),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 15,
});

app.listen(port, () => console.log(`Ward 16 heritage API on http://localhost:${port} (model: ${model})`));
