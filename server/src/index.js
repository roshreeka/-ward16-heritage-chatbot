import 'dotenv/config';
import { createApp } from './app.js';
import { createGeminiChat } from './gemini.js';

const port = Number(process.env.PORT) || 3001;
const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite-preview';

const app = createApp({
  streamChat: createGeminiChat({ apiKey: process.env.GEMINI_API_KEY, model }),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE) || 15,
});

app.listen(port, () => console.log(`Ward 16 heritage API on http://localhost:${port} (model: ${model})`));
