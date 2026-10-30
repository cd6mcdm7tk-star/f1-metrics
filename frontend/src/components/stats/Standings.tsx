import type { CSSProperties } from 'react';
import type { ConstructorStanding, StandingEntry } from '../../stats/types';
import { lastName } from '../../stats/season';
import { teamColor } from '../../utils/teamColors';
import { DISPLAY, MONO } from './shared';

const panelStyle = (isMobile: boolean): CSSProperties => ({
  flex: 1, minWidth: 0, width: isMobile ? '100%' : undefined,
  background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14,
  display: 'flex', flexDirection: 'column',
});

const titleStyle: CSSProperties = {
  display: 'block', marginBottom: 10, flexShrink: 0,
  fontFamily: MONO, fontSize: 'var(--fs-9)', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700,
};

/** Laid out like a starting grid: odd positions left, even positions right and staggered down. */
export function DriverStandings({ standings, selected, disabled, isMobile, onSelect }: {
  standings: StandingEntry[];
  selected: string[];
  disabled: boolean;
  isMobile: boolean;
  onSelect: (code: string) => void;
}) {
  return (
    <div style={panelStyle(isMobile)}>
      <span style={titleStyle}>Driver Standings</span>
      <div style={{ display: 'flex', gap: 6, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {[0, 1].map(col => (
          <div key={col} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4, marginTop: col === 1 ? 12 : 0 }}>
            {standings.filter((_, i) => i % 2 === col).map(entry => {
              const isSelected = selected.includes(entry.code);
              const color = teamColor(entry.team);
              return (
                <button
                  key={entry.code}
                  onClick={() => onSelect(entry.code)}
                  disabled={disabled}
                  style={{
                    position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    padding: isMobile ? '9px 2px' : '4px 2px',
                    background: isSelected ? `${color}18` : 'transparent',
                    border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: 'var(--r)',
                    cursor: disabled ? 'not-allowed' : 'pointer', outline: 'none',
                    transition: 'all 0.12s',
                  }}
                >
                  <span style={{ position: 'absolute', top: 2, left: 4, fontFamily: MONO, fontSize: 'var(--fs-8)', color: 'var(--text-3)' }}>
                    {entry.position ?? '—'}
                  </span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 'var(--fs-10)', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                    {lastName(entry.name)}
                  </span>
                  <span style={{ fontFamily: MONO, fontWeight: 600, fontSize: 'var(--fs-8)', color: 'var(--text-2)' }}>
                    {entry.points}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConstructorStandings({ standings, isMobile }: { standings: ConstructorStanding[]; isMobile: boolean }) {
  const maxPoints = standings[0]?.points || 0;
  return (
    <div style={panelStyle(isMobile)}>
      <span style={titleStyle}>Constructor Standings</span>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {standings.map(c => {
          const color = teamColor(c.name);
          return (
            <div key={c.name} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 6px', borderRadius: 'var(--r)', overflow: 'hidden' }}>
              {/* Points as a share of the leader's */}
              <div style={{ position: 'absolute', inset: 0, width: `${maxPoints > 0 ? (c.points / maxPoints) * 100 : 0}%`, background: `${color}18` }} />
              <span style={{ position: 'relative', fontFamily: MONO, fontSize: 'var(--fs-10)', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--text-3)', minWidth: 12 }}>{c.position ?? '—'}</span>
                <span aria-hidden style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{c.name}</span>
              </span>
              <span style={{ position: 'relative', fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, color: 'var(--accent)' }}>{c.points}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
