import { useEffect, useRef, useState } from 'react';
import type { LiveServerMessage, Session } from '@google/genai';
import { createVoiceSession } from '../lib/api';
import { decodeBase64, decodePcm16, encodePcm16 } from '../lib/audio';
import type { ChatMessage } from '../types';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

type Props = {
  messages: ChatMessage[];
  onMessages: (messages: ChatMessage[]) => void;
  onState: (state: VoiceState) => void;
};

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function VoiceConversation({ messages, onMessages, onState }: Props) {
  const [state, setState] = useState<VoiceState>('idle');
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState('');
  const sessionRef = useRef<Session | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const outputSourcesRef = useRef(new Set<AudioBufferSourceNode>());
  const outputAtRef = useRef(0);
  const inputTranscriptRef = useRef('');
  const outputTranscriptRef = useRef('');
  const messagesRef = useRef(messages);
  const epochRef = useRef(0);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { onState(state); }, [onState, state]);
  useEffect(() => () => stop(false), []);

  function stop(updateState = true) {
    epochRef.current += 1;
    try { sessionRef.current?.sendRealtimeInput({ audioStreamEnd: true }); } catch { /* already closed */ }
    try { sessionRef.current?.close(); } catch { /* already closed */ }
    sessionRef.current = null;
    processorRef.current && (processorRef.current.onaudioprocess = null);
    processorRef.current?.disconnect();
    inputSourceRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    outputSourcesRef.current.forEach((source) => { try { source.stop(); } catch { /* ended */ } });
    outputSourcesRef.current.clear();
    void inputContextRef.current?.close().catch(() => undefined);
    void outputContextRef.current?.close().catch(() => undefined);
    processorRef.current = null;
    inputSourceRef.current = null;
    streamRef.current = null;
    inputContextRef.current = null;
    outputContextRef.current = null;
    outputAtRef.current = 0;
    if (updateState) setState('idle');
  }

  async function playAudio(base64: string, epoch: number) {
    const context = outputContextRef.current;
    if (!context || epoch !== epochRef.current) return;
    const source = context.createBufferSource();
    source.buffer = decodePcm16(decodeBase64(base64), context);
    source.connect(context.destination);
    const startAt = Math.max(context.currentTime, outputAtRef.current);
    outputAtRef.current = startAt + source.buffer.duration;
    outputSourcesRef.current.add(source);
    source.onended = () => {
      outputSourcesRef.current.delete(source);
      if (outputSourcesRef.current.size === 0 && epoch === epochRef.current) setState('listening');
    };
    source.start(startAt);
  }

  async function start() {
    if (state === 'connecting' || state === 'listening' || state === 'speaking') return;
    const epoch = ++epochRef.current;
    setState('connecting');
    setError('');
    inputTranscriptRef.current = '';
    outputTranscriptRef.current = '';
    try {
      const grant = await createVoiceSession(messagesRef.current);
      if (epoch !== epochRef.current) return;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      if (epoch !== epochRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;

      const outputContext = new AudioContext({ sampleRate: 24000 });
      await outputContext.resume();
      outputContextRef.current = outputContext;

      const { GoogleGenAI, Modality, ThinkingLevel } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: grant.token, httpOptions: { apiVersion: grant.apiVersion } });
      const session = await ai.live.connect({
        model: grant.model,
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: grant.instructions,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: grant.voice } } },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
        callbacks: {
          onopen: () => { if (epoch === epochRef.current) setState('listening'); },
          onmessage: (message: LiveServerMessage) => {
            if (epoch !== epochRef.current) return;
            const content = message.serverContent;
            if (content?.interrupted) {
              outputSourcesRef.current.forEach((source) => { try { source.stop(); } catch { /* ended */ } });
              outputSourcesRef.current.clear();
              outputAtRef.current = 0;
              setState('listening');
            }
            if (content?.inputTranscription?.text) inputTranscriptRef.current += content.inputTranscription.text;
            if (content?.outputTranscription?.text) outputTranscriptRef.current += content.outputTranscription.text;
            for (const part of content?.modelTurn?.parts || []) {
              if (part.inlineData?.data) {
                setState('speaking');
                void playAudio(part.inlineData.data, epoch);
              }
            }
            if (content?.turnComplete) {
              const userText = inputTranscriptRef.current.trim();
              const assistantText = outputTranscriptRef.current.trim();
              if (userText && assistantText) {
                const next: ChatMessage[] = [
                  ...messagesRef.current,
                  { id: id(), role: 'user', text: userText },
                  { id: id(), role: 'assistant', text: assistantText },
                ];
                messagesRef.current = next;
                onMessages(next);
              }
              inputTranscriptRef.current = '';
              outputTranscriptRef.current = '';
            }
          },
          onerror: () => {
            if (epoch !== epochRef.current) return;
            setError('אירעה שגיאה בשיחה הקולית. אפשר לעצור ולנסות שוב.');
            setState('error');
          },
          onclose: () => {
            if (epoch !== epochRef.current) return;
            setState('idle');
          },
        },
      });
      if (epoch !== epochRef.current) { session.close(); return; }
      sessionRef.current = session;

      const inputContext = new AudioContext({ sampleRate: 16000 });
      await inputContext.resume();
      inputContextRef.current = inputContext;
      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(512, 1, 1);
      inputSourceRef.current = source;
      processorRef.current = processor;
      processor.onaudioprocess = (event) => {
        if (sessionRef.current && stream.getAudioTracks()[0]?.enabled) {
          sessionRef.current.sendRealtimeInput({ audio: encodePcm16(event.inputBuffer.getChannelData(0)) });
        }
      };
      source.connect(processor);
      processor.connect(inputContext.destination);
    } catch (caught) {
      if (epoch !== epochRef.current) return;
      stop(false);
      setError(caught instanceof Error ? caught.message : 'לא ניתן להתחבר לשיחה הקולית.');
      setState('error');
    }
  }

  const active = state === 'listening' || state === 'speaking';
  function toggleMute() {
    const next = !muted;
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    setMuted(next);
  }

  return (
    <section className="voice-panel" aria-label="שיחה קולית">
      <div className="voice-copy">
        <p className="eyebrow">שיחה קולית בזמן אמת</p>
        <h2>{active ? (state === 'speaking' ? 'איתמר משיב…' : 'המיקרופון פתוח') : 'מוכנים להתחיל?'}</h2>
        <p>{active ? 'דברו באופן טבעי. אפשר לעצור או לעבור לצ׳אט בכל רגע.' : 'לחיצה על התחלה תבקש הרשאת מיקרופון מהדפדפן.'}</p>
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="voice-controls">
        {!active ? (
          <button className="primary-action" onClick={start} disabled={state === 'connecting'}>
            <span aria-hidden="true">{state === 'connecting' ? '◌' : '🎙'}</span>
            {state === 'connecting' ? 'מתחבר…' : 'התחל שיחה'}
          </button>
        ) : (
          <>
            <button className={`round-action ${muted ? 'is-muted' : ''}`} onClick={toggleMute} aria-label={muted ? 'ביטול השתקה' : 'השתקה'}>{muted ? '🔇' : '🎙'}</button>
            <button className="stop-action" onClick={() => stop()}><span aria-hidden="true">■</span> סיום שיחה</button>
          </>
        )}
      </div>
      <p className="privacy-note">האודיו מועבר ל־Gemini לצורך יצירת התשובה ואינו נשמר בפרויקט.</p>
    </section>
  );
}
