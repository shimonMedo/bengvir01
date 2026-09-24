import { FormEvent, useEffect, useRef, useState } from 'react';
import { sendChat } from '../lib/api';
import type { ChatMessage } from '../types';

type Props = {
  messages: ChatMessage[];
  onMessages: (messages: ChatMessage[]) => void;
};

const id = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export default function TextChat({ messages, onMessages }: Props) {
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, pending]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || pending) return;
    const next = [...messages, { id: id(), role: 'user' as const, text }];
    onMessages(next);
    setDraft('');
    setPending(true);
    setError('');
    try {
      const response = await sendChat(next);
      onMessages([...next, { id: id(), role: 'assistant', text: response.text }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'שליחת ההודעה נכשלה.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="chat-panel" aria-label="צ׳אט כתוב">
      <div className="messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="empty-chat">
            <strong>על מה תרצו לדבר?</strong>
            <span>אפשר לשאול על ביטחון אישי, משילות, מערכת המשפט או מדיניות.</span>
          </div>
        )}
        {messages.map((message) => (
          <article key={message.id} className={`message message--${message.role}`}>
            <span>{message.role === 'user' ? 'אתם' : 'איתמר בן גביר · הדמיית AI'}</span>
            <p>{message.text}</p>
          </article>
        ))}
        {pending && <div className="typing" aria-label="מכין תשובה"><i /><i /><i /></div>}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <form className="composer" onSubmit={submit}>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          maxLength={4000}
          placeholder="כתבו הודעה…"
          aria-label="הודעה"
        />
        <button className="send-button" type="submit" disabled={!draft.trim() || pending} aria-label="שליחה">➤</button>
      </form>
    </section>
  );
}
