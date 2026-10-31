import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, validateChatBody } from '../src/app.js';
import { buildSystemPrompt } from '../src/knowledge.js';

const parseEvents = (text) =>
  text
    .split('\n\n')
    .filter((l) => l.startsWith('data: '))
    .map((l) => JSON.parse(l.slice(6)));

describe('GET /api/sites', () => {
  it('returns the six heritage sites', async () => {
    const res = await request(createApp({ streamChat: async function* () {} })).get('/api/sites');
    expect(res.status).toBe(200);
    expect(res.body.sites.map((s) => s.id)).toEqual([
      '22-dhara',
      'pyatho-ajima',
      'mhepi-ajima',
      'siddhi-ganesh',
      'nanak-math',
      'koncha-dyo',
    ]);
    expect(res.body.sites.every((s) => s.suggestions.length > 0)).toBe(true);
  });
});

describe('POST /api/chat', () => {
  it('streams model output as SSE events and passes the site-focused prompt', async () => {
    let received;
    const streamChat = async function* (args) {
      received = args;
      yield 'Hello ';
      yield 'world';
    };
    const res = await request(createApp({ streamChat }))
      .post('/api/chat')
      .send({ message: ' Who built it? ', siteId: '22-dhara', history: [{ role: 'user', text: 'hi' }] });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/event-stream/);
    expect(parseEvents(res.text)).toEqual([{ text: 'Hello ' }, { text: 'world' }, { done: true }]);
    expect(received.message).toBe('Who built it?');
    expect(received.history).toEqual([{ role: 'user', text: 'hi' }]);
    expect(received.systemPrompt).toContain('currently viewing "Balaju 22 Dhara"');
  });

  it('rejects invalid bodies', async () => {
    const app = createApp({ streamChat: async function* () {} });
    expect((await request(app).post('/api/chat').send({})).status).toBe(400);
    expect((await request(app).post('/api/chat').send({ message: 'x', siteId: 'nope' })).status).toBe(400);
  });

  it('reports a friendly error when Gemini fails', async () => {
    const streamChat = async function* () {
      throw Object.assign(new Error('quota'), { status: 429 });
    };
    const res = await request(createApp({ streamChat })).post('/api/chat').send({ message: 'hi' });
    expect(parseEvents(res.text)[0].error).toMatch(/quota/i);
  });

  it('rate limits chat requests', async () => {
    const app = createApp({ streamChat: async function* () {}, rateLimitPerMinute: 1 });
    await request(app).post('/api/chat').send({ message: 'hi' });
    expect((await request(app).post('/api/chat').send({ message: 'hi' })).status).toBe(429);
  });
});

describe('validateChatBody', () => {
  it('validates history turns', () => {
    expect(validateChatBody({ message: 'hi', history: [{ role: 'bot', text: 'x' }] })).toMatch(/history/);
    expect(validateChatBody({ message: 'a'.repeat(2001) })).toMatch(/at most/);
    expect(validateChatBody({ message: 'hi', history: [{ role: 'model', text: 'x' }] })).toBeNull();
  });
});

describe('buildSystemPrompt', () => {
  it('embeds the full dataset and references', () => {
    const prompt = buildSystemPrompt(null);
    for (const name of ['Baisdhara', 'Sitalamai', 'Mhepi', 'Sorakhutte', 'Nanak Math', 'Koncha Dyo']) {
      expect(prompt).toContain(name);
    }
    expect(prompt).toContain('10.1016/j.envc.2022.100573');
    expect(prompt).toContain('not selected a specific site');
  });
});
