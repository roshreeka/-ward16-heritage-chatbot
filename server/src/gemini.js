import { GoogleGenAI } from '@google/genai';

export function createGeminiChat({ apiKey, model }) {
  if (!apiKey) console.warn('GEMINI_API_KEY is not set: copy server/.env.example to server/.env and add your key.');
  const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

  return async function* streamChat({ systemPrompt, history, message }) {
    if (!ai) throw new Error('GEMINI_API_KEY is not set');
    const contents = [
      ...history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: message }] },
    ];
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction: systemPrompt, temperature: 0.3, maxOutputTokens: 1024 },
    });
    for await (const chunk of stream) {
      if (chunk.text) yield chunk.text;
    }
  };
}
