import type { ReactNode } from 'react'
import { X } from 'lucide-react'
import { P } from './authStyle'

export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div style={{
      background: P.errorBg, border: `1px solid ${P.errorBorder}`,
      borderRadius: 'var(--r)', color: P.error,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-10-5)', lineHeight: 1.4,
      padding: '10px 12px', marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

export function Card({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(28,4,7,0.55)', backdropFilter: 'blur(4px)',
    }}>
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: P.panel, color: P.text,
        border: `1px solid ${P.borderHi}`, borderTop: `3px solid ${P.accent}`, borderRadius: 'var(--r2)',
        boxShadow: '0 24px 60px rgba(28,4,7,0.35)',
        padding: '32px 28px 28px',
      }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16,
            color: P.text3, background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 4, lineHeight: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = P.text }}
          onMouseLeave={e => { e.currentTarget.style.color = P.text3 }}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}
