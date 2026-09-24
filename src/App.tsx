import { useCallback, useState } from 'react';
import AvatarWindow from './components/AvatarWindow';
import TextChat from './components/TextChat';
import VoiceConversation from './components/VoiceConversation';
import type { ChatMessage, ExperienceMode } from './types';

type VoiceState = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export default function App() {
  const [mode, setMode] = useState<ExperienceMode>('voice');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const handleVoiceState = useCallback((next: VoiceState) => setVoiceState(next), []);

  return (
    <main className="app-shell">
      <div className="knesset-background" aria-hidden="true" />
      <header className="topbar">
        <div className="identity">
          <img src="/media/logos/otzma.svg" alt="סמל עוצמה יהודית" />
          <div>
            <strong>איתמר בן גביר</strong>
            <span>הדמיית שיחה מבוססת AI</span>
          </div>
        </div>
        <div className="simulation-pill"><span /> הדמיית AI</div>
      </header>

      <div className="experience-grid">
        <AvatarWindow state={voiceState} />

        <section className="conversation-card">
          <div className="candidate-heading">
            <p className="eyebrow">עוצמה יהודית</p>
            <h1>שיחה עם איתמר בן גביר</h1>
            <p>שיחה קולית או כתובה עם דמות AI המבוססת על תמונת מצב ציבורית קבועה.</p>
          </div>

          <nav className="mode-switch" aria-label="בחירת סוג שיחה">
            <button className={mode === 'voice' ? 'active' : ''} onClick={() => setMode('voice')} aria-pressed={mode === 'voice'}><span aria-hidden="true">🎙</span> שיחה קולית</button>
            <button className={mode === 'chat' ? 'active' : ''} onClick={() => setMode('chat')} aria-pressed={mode === 'chat'}><span aria-hidden="true">▢</span> צ׳אט</button>
          </nav>

          <div className="panel-slot">
            {mode === 'voice' ? (
              <VoiceConversation messages={messages} onMessages={setMessages} onState={handleVoiceState} />
            ) : (
              <TextChat messages={messages} onMessages={setMessages} />
            )}
          </div>

          <footer className="card-footer">
            <span>התגובות מבוססות על מאגר מידע לדוגמה שמומלץ להרחיב ולעדכן</span>
            <a href="https://commons.wikimedia.org/wiki/File:Itamar_Ben-Gvir_(SHL_9031).jpg" target="_blank" rel="noreferrer">מקור וקרדיט לתמונת הייחוס</a>
          </footer>
        </section>
      </div>
    </main>
  );
}
