import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildSystemPrompt, findSite, getData, listSites } from './knowledge.js';

const MAX_MESSAGE_LENGTH = 2000;
const MAX_HISTORY = 20;

export function validateChatBody(body) {
  const { message, history = [], siteId = null } = body ?? {};
  if (typeof message !== 'string' || !message.trim()) return 'message is required';
  if (message.length > MAX_MESSAGE_LENGTH) return `message must be at most ${MAX_MESSAGE_LENGTH} characters`;
  if (!Array.isArray(history)) return 'history must be an array';
  const badTurn = history.some(
    (m) => !m || !['user', 'model'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 8000,
  );
  if (badTurn) return 'history items must be { role: "user" | "model", text: string }';
  if (siteId !== null && (typeof siteId !== 'string' || !findSite(siteId))) return 'unknown siteId';
  return null;
}

export function createApp({ streamChat, corsOrigin = '*', rateLimitPerMinute = 15 }) {
  const app = express();
  app.use(cors({ origin: corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/sites', (_req, res) => res.json({ sites: listSites() }));
  app.get('/api/references', (_req, res) => res.json({ references: getData().references }));

  const chatLimiter = rateLimit({
    windowMs: 60_000,
    limit: rateLimitPerMinute,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many messages. Please wait a minute and try again.' },
  });

  app.post('/api/chat', chatLimiter, async (req, res) => {
    const error = validateChatBody(req.body);
    if (error) return res.status(400).json({ error });

    const { message, history = [], siteId = null } = req.body;
    res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.flushHeaders();
    const send = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    try {
      const stream = streamChat({
        systemPrompt: buildSystemPrompt(siteId),
        history: history.slice(-MAX_HISTORY),
        message: message.trim(),
      });
      for await (const text of stream) send({ text });
      send({ done: true });
    } catch (err) {
      console.error('Chat error:', err?.message ?? err);
      const status = err?.status ?? err?.code;
      send({
        error:
          status === 429
            ? 'The free Gemini quota is exhausted for now. Please try again shortly.'
            : 'Sorry, something went wrong while generating the answer.',
      });
    } finally {
      res.end();
    }
  });

  const clientDist = fileURLToPath(new URL('../../client/dist', import.meta.url));
  if (existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile('index.html', { root: clientDist }));
  }

  return app;
}
