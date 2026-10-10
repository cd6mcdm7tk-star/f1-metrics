import type { H2HData, HoveredMetric, RaceLogEntry } from '../../stats/types';
import { DISPLAY, MONO } from './shared';

/** Both drivers' result in every race, one column per Grand Prix. */
export default function RaceLog({ h2h, color1, color2, hovered, onHover, isMobile }: {
  h2h: H2HData;
  color1: string;
  color2: string;
  hovered: HoveredMetric;
  onHover: (m: HoveredMetric) => void;
  isMobile: boolean;
}) {
  const rows = [
    { code: h2h.driver1.code, color: color1, pick: (r: RaceLogEntry) => r.pos1 },
    { code: h2h.driver2.code, color: color2, pick: (r: RaceLogEntry) => r.pos2 },
  ];
  return (
    <div style={{
      ...(isMobile ? { maxHeight: 320 } : { flexShrink: 0, maxHeight: '100%' }),
      minWidth: 0,
      marginTop: 12, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
    }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
        <thead>
          <tr style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--surface)' }}>
            <th style={{
              position: 'sticky', left: 0, zIndex: 6, background: 'var(--surface)',
              width: 90, padding: '8px 14px', textAlign: 'left',
              borderBottom: '1px solid var(--border-hi)', borderRight: '1px solid var(--border-hi)',
              fontFamily: MONO, fontSize: 7, color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              Race
            </th>
            {h2h.raceLog.map(r => {
              const isHovered = hovered?.kind === 'race' && hovered.round === r.round;
              return (
                <th
                  key={r.round}
                  onMouseEnter={() => onHover({ kind: 'race', round: r.round })}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    minWidth: 60, padding: '8px 4px', textAlign: 'center',
                    borderBottom: '1px solid var(--border-hi)', borderRight: '1px solid var(--border)',
                    fontFamily: MONO, fontSize: 8, letterSpacing: '0.02em', fontWeight: 400,
                    color: isHovered ? 'var(--accent)' : 'var(--text-3)',
                    background: isHovered ? 'var(--accent-10)' : undefined,
                    cursor: 'default',
                  }}
                >
                  {r.raceName.replace(' Grand Prix', '')}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ code, color, pick }) => (
            <tr key={code} style={{ borderBottom: '1px solid var(--border-hi)' }}>
              <td style={{
                position: 'sticky', left: 0, zIndex: 2,
                background: 'var(--bg)', borderRight: '1px solid var(--border-hi)',
                padding: '8px 14px', fontFamily: DISPLAY, fontWeight: 800, fontSize: 13, color,
              }}>
                {code}
              </td>
              {h2h.raceLog.map(r => {
                const pos = pick(r);
                return (
                  <td key={r.round} style={{
                    textAlign: 'center', padding: '8px 4px', borderRight: '1px solid var(--border)',
                    fontFamily: MONO, fontSize: 11, fontWeight: 700,
                    color: pos == null ? 'var(--text-3)' : color,
                  }}>
                    {pos == null ? 'DNF' : `P${pos}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
