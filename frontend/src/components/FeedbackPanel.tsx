import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import { sendFeedback, type FeedbackResult } from '../services/feedback';

type Status = 'idle' | 'sending' | FeedbackResult;

// The brand's own palette, so the panel reads the same over every page
const P = {
  bg: '#3d0c10',
  field: 'rgba(0,0,0,0.22)',
  text: '#f2e6d8',
  sub: 'rgba(242,230,216,0.62)',
  border: 'rgba(242,230,216,0.18)',
};

const MONO = "'JetBrains Mono', monospace";
const field: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 'var(--r2)',
  background: P.field, border: `1px solid ${P.border}`, color: P.text,
  fontFamily: 'Rajdhani, sans-serif', fontSize: 15, outline: 'none',
};
const NOTE: Record<Exclude<Status, 'idle' | 'sending'>, string> = {
  sent: "Thanks, it's on its way.",
  limited: "That's a lot of messages from here: try again in an hour.",
  failed: "It didn't go through. Try again, or write to contact@metrikdelta.com.",
};

/** A small form, in the corner of the screen, that mails a message (and the page it was written on) to the site */
export default function FeedbackPanel({ onClose }: { onClose: () => void }) {
  const location = useLocation();
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const messageRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messageRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Closes itself a moment after a message went
  useEffect(() => {
    if (status !== 'sent') return;
    const id = setTimeout(onClose, 2200);
    return () => clearTimeout(id);
  }, [status, onClose]);

  const ready = message.trim().length >= 3 && status !== 'sending' && status !== 'sent';
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setStatus('sending');
    setStatus(await sendFeedback({ message, email, page: location.pathname + location.search, website }));
  };

  return (
    <form
      role="dialog" aria-label="Feedback" onSubmit={submit}
      style={{
        position: 'fixed', left: 'max(12px, env(safe-area-inset-left))', bottom: 'max(12px, env(safe-area-inset-bottom))', zIndex: 1000,
        width: 'min(360px, calc(100vw - 24px))', boxSizing: 'border-box', padding: '18px 18px 16px',
        display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left',
        background: P.bg, color: P.text, border: `1px solid ${P.border}`, borderRadius: 'var(--r2)',
        boxShadow: '0 24px 60px rgba(10,0,2,0.55)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Feedback</span>
        <button type="button" onClick={onClose} aria-label="Close" style={{ display: 'flex', padding: 4, background: 'none', border: 'none', color: P.sub, cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>
      <span style={{ fontSize: 15, lineHeight: 1.35, color: P.sub }}>A number that looks wrong, an idea, a bug? Write it here.</span>
      <textarea
        ref={messageRef} value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={4}
        placeholder="Your message" aria-label="Your message" style={{ ...field, resize: 'vertical' }}
      />
      <input
        type="email" value={email} onChange={e => setEmail(e.target.value)} maxLength={254}
        placeholder="Your email, if you'd like a reply" aria-label="Your email, if you'd like a reply" style={field}
      />
      {/* Left empty by people, who never see it */}
      <input
        type="text" name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true"
        style={{ position: 'absolute', left: -10000, width: 1, height: 1, opacity: 0 }}
      />
      <span style={{ fontFamily: MONO, fontSize: 'var(--fs-9)', letterSpacing: '0.04em', color: P.sub }}>The page you're on is sent with your message.</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="submit" disabled={!ready}
          style={{
            padding: '8px 18px', borderRadius: 'var(--r2)', border: `1px solid ${P.text}`,
            background: ready ? P.text : 'transparent', color: ready ? P.bg : P.sub,
            fontFamily: MONO, fontSize: 'var(--fs-10)', letterSpacing: '0.14em', textTransform: 'uppercase',
            cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.6,
          }}
        >
          {status === 'sending' ? 'Sending…' : 'Send'}
        </button>
        {status !== 'idle' && status !== 'sending' && (
          <span role="status" style={{ fontSize: 14, lineHeight: 1.3, color: status === 'sent' ? P.text : P.sub }}>{NOTE[status]}</span>
        )}
      </div>
    </form>
  );
}
