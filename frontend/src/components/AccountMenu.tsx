import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getApiBase } from '../config';

const MONO = 'JetBrains Mono, monospace';

/** The signed-in email; for PRO members it opens Stripe's portal to manage the subscription. */
export default function AccountMenu() {
  const { user, isPremium } = useAuth();
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;
  const name = user.email?.split('@')[0];

  if (!isPremium) {
    return <span style={{ fontFamily: MONO, fontSize: 9, color: 'var(--text-2)' }}>{name}</span>;
  }

  const openPortal = async () => {
    setOpening(true);
    setFailed(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${getApiBase()}/customer-portal/${user.id}`, {
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok || !data.portal_url) throw new Error(data.detail || `HTTP ${res.status}`);
      window.location.href = data.portal_url;
    } catch (e) {
      console.error('Customer portal failed:', e);
      setFailed(true);
      setOpening(false);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 3,
          fontFamily: MONO, fontSize: 9, color: open ? 'var(--text)' : 'var(--text-2)',
          background: 'transparent', border: 'none', padding: '2px 0', cursor: 'pointer', outline: 'none',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.color = 'var(--text-2)'; }}
      >
        {name}
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div role="menu" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 60, width: 210,
          background: 'var(--bg)', border: '1px solid var(--border-hi)', borderTop: '2px solid var(--accent)',
          borderRadius: 'var(--r2)', boxShadow: '0 12px 30px rgba(28,4,7,0.18)', padding: 6,
        }}>
          <p style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--accent)', margin: '4px 8px 6px' }}>
            METRIK PRO
          </p>
          <button
            role="menuitem"
            onClick={openPortal}
            disabled={opening}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '8px',
              background: 'transparent', border: 'none', borderRadius: 'var(--r)',
              cursor: opening ? 'wait' : 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-10)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10, fontWeight: 700, color: 'var(--text)' }}>
              Manage subscription
              {opening && <Loader2 size={11} className="animate-spin" />}
            </span>
            <span style={{ display: 'block', marginTop: 3, fontFamily: MONO, fontSize: 8.5, lineHeight: 1.5, color: 'var(--text-2)' }}>
              Cancel, change card, invoices
            </span>
          </button>
          {failed && (
            <p style={{ fontFamily: MONO, fontSize: 8.5, lineHeight: 1.5, color: '#b42318', margin: '4px 8px' }}>
              Couldn't open the portal. Try again, or write to contact@metrikdelta.com.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
