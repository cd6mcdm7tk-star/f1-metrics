import { useState } from 'react';
import { Link } from 'react-router-dom';
import Modal from './Modal';
import PrivacyContent from './PrivacyContent';
import TermsContent from './TermsContent';
import LegalNoticeContent from './LegalNoticeContent';

interface LegalLinksProps {
  color?: string;
  hoverColor?: string;
  fontSize?: number;
}

// About · Methodology (pages) · Privacy · Terms · Legal notice (documents in a modal), as a row of text links
export default function LegalLinks({
  color = 'rgba(242,230,216,0.32)',
  hoverColor = 'rgba(242,230,216,0.7)',
  fontSize = 9,
}: LegalLinksProps) {
  const [open, setOpen] = useState<'privacy' | 'terms' | 'legal' | null>(null);

  const linkStyle = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize, letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    color, background: 'none', border: 'none', padding: 0, cursor: 'pointer',
    transition: 'color 0.15s',
  };

  const onEnter = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = hoverColor; };
  const onLeave = (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.color = color; };

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', justifyContent: 'center', rowGap: 6 }}>
        <Link to="/about" style={{ ...linkStyle, textDecoration: 'none' }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
          About
        </Link>
        <span style={{ color, fontSize }}>·</span>
        <Link to="/methodology" style={{ ...linkStyle, textDecoration: 'none' }} onMouseEnter={onEnter} onMouseLeave={onLeave}>
          Methodology
        </Link>
        <span style={{ color, fontSize }}>·</span>
        <button style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => setOpen('privacy')}>
          Privacy
        </button>
        <span style={{ color, fontSize }}>·</span>
        <button style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => setOpen('terms')}>
          Terms
        </button>
        <span style={{ color, fontSize }}>·</span>
        <button style={linkStyle} onMouseEnter={onEnter} onMouseLeave={onLeave} onClick={() => setOpen('legal')}>
          Legal Notice
        </button>
      </div>

      <Modal isOpen={open === 'privacy'} onClose={() => setOpen(null)} title="Privacy Policy">
        <PrivacyContent />
      </Modal>
      <Modal isOpen={open === 'terms'} onClose={() => setOpen(null)} title="Terms of Service">
        <TermsContent />
      </Modal>
      <Modal isOpen={open === 'legal'} onClose={() => setOpen(null)} title="Legal Notice">
        <LegalNoticeContent />
      </Modal>
    </>
  );
}
