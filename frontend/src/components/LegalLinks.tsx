import { useCallback, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import FeedbackPanel from './FeedbackPanel';

interface LegalLinksProps {
  color?: string;
  hoverColor?: string;
  fontSize?: CSSProperties['fontSize'];
}

// Methodology · Legal · Feedback, as a row of text links; Feedback opens its panel
export default function LegalLinks({
  color = 'rgba(242,230,216,0.32)',
  hoverColor = 'rgba(242,230,216,0.7)',
  fontSize = 'var(--fs-9)',
}: LegalLinksProps) {
  const linkStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    color, textDecoration: 'none', transition: 'color 0.15s',
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = hoverColor; };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = color; };
  const [feedback, setFeedback] = useState(false);
  const close = useCallback(() => setFeedback(false), []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', rowGap: 6 }}>
      <Link to="/methodology" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>Methodology</Link>
      <span style={{ color, fontSize }}>·</span>
      <Link to="/legal" style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave}>Legal</Link>
      <span style={{ color, fontSize }}>·</span>
      <button
        type="button" onClick={() => setFeedback(open => !open)} aria-expanded={feedback}
        style={{ ...linkStyle, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }} onMouseEnter={onEnter} onMouseLeave={onLeave}
      >
        Feedback
      </button>
      {/* On the page itself: the links can sit inside a scrolling panel or a chart's export */}
      {feedback && createPortal(<FeedbackPanel onClose={close} />, document.body)}
    </div>
  );
}
