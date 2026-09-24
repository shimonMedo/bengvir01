import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI } from '@google/genai';
import express from 'express';
import { buildPrompt } from './prompt.js';
import { rateLimit } from './rateLimit.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const apiKey = process.env.GEMINI_API_KEY?.trim();
const chatModel = process.env.GEMINI_CHAT_MODEL?.trim() || 'gemini-3.8-flash';
const liveModel = process.env.GEMINI_LIVE_MODEL?.trim() || 'gemini-3.1-flash-live-preview';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, 'dist');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((request, response, next) => {
  response.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), geolocation=(), payment=(), usb=()',
  });
  if (request.path.startsWith('/api/')) response.set('Cache-Control', 'no-store');
  next();
});
app.use(express.json({ limit: '64kb' }));

function requireKey(_request, response, next) {
  if (!apiKey) return response.status(503).json({ error: 'מפתח Gemini עדיין לא הוגדר. הוסיפו GEMINI_API_KEY לקובץ .env.local.' });
  next();
}

function normalizeMessages(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(-20).flatMap((message) => {
    const role = message?.role === 'assistant' ? 'model' : message?.role === 'user' ? 'user' : null;
    const content = typeof message?.content === 'string' ? message.content.trim().slice(0, 4000) : '';
    return role && content ? [{ role, parts: [{ text: content }] }] : [];
  });
}

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', aiConfigured: Boolean(apiKey), chatModel, liveModel, knowledgeMode: 'fixed-snapshot', candidate: 'otzma' });
});

app.post('/api/chat', rateLimit, requireKey, async (request, response) => {
  const contents = normalizeMessages(request.body?.messages);
  if (!contents.length || contents.at(-1)?.role !== 'user') return response.status(400).json({ error: 'נדרשת הודעת משתמש.' });
  const controller = new AbortController();
  response.once('close', () => { if (!response.writableEnded) controller.abort(); });
  try {
    const ai = new GoogleGenAI({ apiKey });
    const result = await ai.models.generateContent({
      model: chatModel,
      contents,
      config: {
        systemInstruction: await buildPrompt(),
        maxOutputTokens: 1200,
        thinkingConfig: { thinkingLevel: 'low' },
        abortSignal: controller.signal,
      },
    });
    const text = result.text?.trim();
    if (!text) throw new Error('Empty AI response.');
    response.json({ text });
  } catch (error) {
    if (controller.signal.aborted) return;
    console.error('Gemini chat failed', error?.status || error?.name || 'Error', error?.message || '');
    response.status(502).json({ error: 'לא ניתן לקבל תשובה משירות ה־AI כרגע.' });
  }
});

app.post('/api/voice-session', rateLimit, requireKey, async (request, response) => {
  const recentTranscript = typeof request.body?.recentTranscript === 'string' ? request.body.recentTranscript.trim().slice(-12000) : '';
  const instructions = await buildPrompt({ recentTranscript, voice: true });
  const voice = 'Fenrir';
  const liveConfig = {
    responseModalities: ['AUDIO'],
    systemInstruction: instructions,
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    thinkingConfig: { thinkingLevel: 'LOW' },
  };
  try {
    const ai = new GoogleGenAI({ apiKey, httpOptions: { apiVersion: 'v1beta' } });
    const now = Date.now();
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: { model: liveModel, config: liveConfig },
        lockAdditionalFields: [],
      },
    });
    response.json({ token: token.name, model: liveModel, voice, instructions, apiVersion: 'v1beta' });
  } catch (error) {
    console.error('Gemini voice token failed', error?.status || error?.name || 'Error', error?.message || '');
    response.status(502).json({ error: 'לא ניתן לפתוח שיחה קולית כרגע.' });
  }
});

app.use('/api', (_request, response) => response.status(404).json({ error: 'API endpoint not found.' }));

if (existsSync(dist)) {
  app.use(express.static(dist, { maxAge: '1h' }));
  app.get('*path', (_request, response) => response.sendFile(path.join(dist, 'index.html')));
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '127.0.0.1', () => {
    console.log(`Ben Gvir AI simulation is available on http://127.0.0.1:${port}`);
  });
}

export default app;
