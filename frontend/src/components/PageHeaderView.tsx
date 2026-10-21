import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { rememberedUrl } from '../hooks/usePageMemory';

const MONO = 'JetBrains Mono, monospace';

const PAGES = [
  { key: 'telemetry', label: 'Telemetry', path: '/app' },
  { key: 'statistics', label: 'Statistics', path: '/stats' },
] as const;

export type AppPage = (typeof PAGES)[number]['key'];

export function SignInButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: MONO, fontSize: 9,
        border: '1px solid var(--border)', borderRadius: 'var(--r)',
        padding: '3px 8px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hi)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      Sign in
    </button>
  );
}

/** Top bar of the app pages: wordmark, Telemetry / Statistics switch, account.
 * Display only — PageHeader plugs the signed-in account into it. Pages outside
 * the switch (About, Methodology) leave `page` out. */
export default function PageHeaderView({ page, leading, actions, isPremium = false, account }: {
  page?: AppPage;
  leading?: ReactNode;
  actions?: ReactNode;
  isPremium?: boolean;
  account?: ReactNode;
}) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
      flexWrap: isMobile ? 'wrap' : 'nowrap',
      paddingLeft: 12, paddingRight: 10,
      paddingTop: isMobile ? 8 : 0, paddingBottom: isMobile ? 8 : 0,
      borderBottom: '1px solid var(--border)',
      background: 'var(--bg)', flexShrink: 0,
      position: 'relative',
    }}>
      {leading}

      <span className="font-rajdhani font-black text-sm tracking-[0.12em]">
        <span style={{ color: 'var(--text)' }}>METRIK</span>
        <span style={{ color: 'var(--accent)' }}> DELTA</span>
      </span>

      {/* Centred on desktop whatever the side slots hold */}
      <div style={{
        display: 'flex',
        order: isMobile ? 3 : undefined,
        flexBasis: isMobile ? '100%' : undefined,
        justifyContent: isMobile ? 'center' : undefined,
        position: isMobile ? 'static' : 'absolute',
        left: isMobile ? undefined : '50%', transform: isMobile ? undefined : 'translateX(-50%)',
        border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden',
      }}>
        {PAGES.map((p, i) => {
          const style = {
            padding: '3px 9px', fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em',
            borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
          };
          return p.key === page ? (
            <span key={p.key} style={{ ...style, background: 'var(--accent-10)', color: 'var(--accent)' }}>{p.label}</span>
          ) : (
            <button
              key={p.key}
              onClick={() => navigate(rememberedUrl(p.path))}
              style={{ ...style, background: 'transparent', color: 'var(--text-2)', border: 'none', borderLeft: style.borderLeft, cursor: 'pointer', outline: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {!isMobile && <div style={{ flex: 1 }} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 0, marginLeft: isMobile ? 'auto' : 0 }}>
        {isPremium && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 'var(--r)',
            fontSize: 9, fontFamily: 'Rajdhani, sans-serif', fontWeight: 900,
            background: 'var(--accent-10)', color: 'var(--accent)',
            border: '1px solid var(--accent-20)', marginRight: isMobile ? 0 : 4,
          }}>
            <Zap size={9} />PRO
          </span>
        )}

        {actions}

        {account}
      </div>
    </header>
  );
}
