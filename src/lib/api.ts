import type { ChatMessage } from '../types';

export type VoiceGrant = {
  token: string;
  model: string;
  voice: string;
  instructions: string;
  apiVersion: string;
};

async function jsonOrError<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'השירות אינו זמין כרגע.');
  return body as T;
}

export async function sendChat(messages: ChatMessage[], signal?: AbortSignal) {
  return jsonOrError<{ text: string }>(await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.slice(-20).map(({ role, text }) => ({ role, content: text })),
    }),
    signal,
  }));
}

export async function createVoiceSession(messages: ChatMessage[], signal?: AbortSignal) {
  return jsonOrError<VoiceGrant>(await fetch('/api/voice-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recentTranscript: messages.slice(-12).map(({ role, text }) => `${role}: ${text}`).join('\n'),
    }),
    signal,
  }));
}
