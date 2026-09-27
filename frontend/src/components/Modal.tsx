import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

// Same self-contained dark "chrome" palette as AuthModal/UpgradeModal — see
// AuthModal.tsx for why it's hardcoded rather than read via CSS vars.
const P = {
  panel: '#57121c', accent: '#f2e6d8', text: '#f2e6d8',
  text2: 'rgba(242,230,216,0.55)', text3: 'rgba(242,230,216,0.32)',
  border: 'rgba(242,230,216,0.10)', borderHi: 'rgba(242,230,216,0.20)',
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      />

      <div style={{
        position: 'relative', width: '100%', maxWidth: 720, maxHeight: '85vh',
        background: P.panel, border: `1px solid ${P.borderHi}`, borderRadius: 'var(--r2)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', borderBottom: `1px solid ${P.border}`, flexShrink: 0,
        }}>
          <h2 style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 19,
            letterSpacing: '0.04em', textTransform: 'uppercase', color: P.text, margin: 0,
          }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            style={{
              width: 30, height: 30, borderRadius: 'var(--r)',
              background: 'transparent', border: `1px solid ${P.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: P.text3, transition: 'color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = P.text; }}
            onMouseLeave={e => { e.currentTarget.style.color = P.text3; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '20px 24px 24px', overflowY: 'auto', color: P.text2 }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
