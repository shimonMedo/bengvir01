type Props = {
  state: 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';
};

const labels = {
  idle: 'מוכן לשיחה',
  connecting: 'מתחבר…',
  listening: 'מקשיב',
  speaking: 'מדבר',
  error: 'החיבור הופסק',
};

export default function AvatarWindow({ state }: Props) {
  return (
    <section className={`avatar-card avatar-card--${state}`} aria-label="חלון הדמות">
      <video
        className="avatar-media"
        src="/media/avatars/itamar-ben-gvir-idle.mp4"
        poster="/media/avatars/itamar-ben-gvir.webp"
        autoPlay
        muted
        loop
        playsInline
      />
      <div className="avatar-shade" />
      <div className="avatar-status">
        <span className="status-dot" aria-hidden="true" />
        <span>{labels[state]}</span>
      </div>
      <div className="avatar-disclosure">
        <strong>הדמיית AI — לא האדם האמיתי</strong>
        <span>קול סינתטי · תשובות שנוצרות בזמן אמת</span>
      </div>
    </section>
  );
}
