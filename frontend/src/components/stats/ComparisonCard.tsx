import { Users } from 'lucide-react';
import type { H2HData, HoveredMetric } from '../../stats/types';
import { lastName } from '../../stats/season';
import { DISPLAY, MONO, share } from './shared';
import { teamBadge } from '../../utils/teamColors';

interface Row {
  label: string;
  statKey: string;
  raw1: number;
  raw2: number;
  display1: string | number;
  display2: string | number;
  bar?: boolean;
  lowerIsBetter?: boolean;
}

function rowsFor(h2h: H2HData): Row[] {
  const s1 = h2h.driver1.stats, s2 = h2h.driver2.stats;
  const totalRaces = h2h.totalRaces || 1;
  const poleConv1 = s1.poles > 0 ? (s1.poleWins / s1.poles) * 100 : null;
  const poleConv2 = s2.poles > 0 ? (s2.poleWins / s2.poles) * 100 : null;
  const ppr1 = s1.raceFinishes.length > 0 ? s1.racePoints / s1.raceFinishes.length : null;
  const ppr2 = s2.raceFinishes.length > 0 ? s2.racePoints / s2.raceFinishes.length : null;
  // Positions gained (-) or lost (+) from qualifying to the race, on average
  const fmtQR = (c: number) => (c > 0 ? `-${Math.abs(c).toFixed(1)}` : `+${Math.abs(c).toFixed(1)}`);
  const rate = (n: number) => `${((n / totalRaces) * 100).toFixed(1)}%`;

  const rows: Row[] = [
    { label: 'Wins', statKey: 'wins', raw1: s1.wins, raw2: s2.wins, display1: s1.wins, display2: s2.wins },
    { label: 'Poles', statKey: 'poles', raw1: s1.poles, raw2: s2.poles, display1: s1.poles, display2: s2.poles },
    { label: 'Podiums', statKey: 'podiums', raw1: s1.podiums, raw2: s2.podiums, display1: s1.podiums, display2: s2.podiums },
    { label: 'Fastest Laps', statKey: 'fastestlaps', raw1: s1.fastestLaps, raw2: s2.fastestLaps, display1: s1.fastestLaps, display2: s2.fastestLaps },
    { label: 'Qualifying H2H', statKey: 'qualih2h', raw1: s1.qualiWins, raw2: s2.qualiWins, display1: s1.qualiWins, display2: s2.qualiWins },
    { label: 'Race H2H', statKey: 'raceh2h', raw1: s1.raceWins, raw2: s2.raceWins, display1: s1.raceWins, display2: s2.raceWins },
    { label: 'Avg Race Position', statKey: 'avgracepos', raw1: s1.avgRacePosition, raw2: s2.avgRacePosition, display1: `P${s1.avgRacePosition}`, display2: `P${s2.avgRacePosition}`, lowerIsBetter: true },
    { label: 'Avg Quali Position', statKey: 'avgqualipos', raw1: s1.avgQualiPosition, raw2: s2.avgQualiPosition, display1: `P${s1.avgQualiPosition}`, display2: `P${s2.avgQualiPosition}`, lowerIsBetter: true },
    { label: 'DNFs', statKey: 'dnfs', raw1: s1.dnfs, raw2: s2.dnfs, display1: s1.dnfs, display2: s2.dnfs, lowerIsBetter: true },
    { label: 'Points per Race', statKey: 'pointsperrace', raw1: ppr1 ?? 0, raw2: ppr2 ?? 0, display1: ppr1 !== null ? ppr1.toFixed(1) : '—', display2: ppr2 !== null ? ppr2.toFixed(1) : '—', bar: ppr1 !== null && ppr2 !== null },
    { label: 'Win Rate', statKey: 'winrate', raw1: s1.wins, raw2: s2.wins, display1: rate(s1.wins), display2: rate(s2.wins) },
    { label: 'Podium Rate', statKey: 'podiumrate', raw1: s1.podiums, raw2: s2.podiums, display1: rate(s1.podiums), display2: rate(s2.podiums) },
    { label: 'Pole Conversion', statKey: 'poleconv', raw1: poleConv1 ?? 0, raw2: poleConv2 ?? 0, display1: poleConv1 !== null ? `${poleConv1.toFixed(1)}%` : 'N/A', display2: poleConv2 !== null ? `${poleConv2.toFixed(1)}%` : 'N/A', bar: poleConv1 !== null && poleConv2 !== null },
    { label: 'Quali → Race', statKey: 'qualitorace', raw1: 0, raw2: 0, display1: fmtQR(s1.avgRacePosition - s1.avgQualiPosition), display2: fmtQR(s2.avgRacePosition - s2.avgQualiPosition), bar: false },
  ];
  if (h2h.sprint) {
    const sp = h2h.sprint;
    rows.push(
      { label: 'Sprint Qualifying H2H', statKey: 'sprintqualih2h', raw1: sp.sqWins1, raw2: sp.sqWins2, display1: sp.sqWins1, display2: sp.sqWins2 },
      { label: 'Sprint H2H', statKey: 'sprinth2h', raw1: sp.sWins1, raw2: sp.sWins2, display1: sp.sWins1, display2: sp.sWins2 },
    );
  }
  return rows;
}

function StatRow({ row, color1, color2, hovered, onHover }: {
  row: Row; color1: string; color2: string; hovered: boolean; onHover: (m: HoveredMetric) => void;
}) {
  const { label, statKey, raw1, raw2, display1, display2, bar = true, lowerIsBetter = false } = row;
  let percent1 = 50, percent2 = 50;
  if (bar) {
    // Lower is better: each side's bar grows with the inverse of its value
    [percent1, percent2] = lowerIsBetter
      ? share(raw1 > 0 ? 1 / raw1 : 0, raw2 > 0 ? 1 / raw2 : 0)
      : share(raw1, raw2);
  }
  return (
    <div
      onMouseEnter={() => onHover({ kind: 'stat', statKey })}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 6px', margin: '0 -6px',
        borderTop: '1px solid var(--border)', cursor: 'default',
        background: hovered ? 'var(--accent-10)' : undefined,
        borderRadius: hovered ? 'var(--r)' : undefined,
      }}
    >
      <span style={{
        width: 92, flexShrink: 0, lineHeight: 1.2,
        fontFamily: MONO, fontSize: 'var(--fs-7-5)', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-3)',
      }}>{label}</span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 12, color: 'var(--text)', minWidth: 34, textAlign: 'right' }}>{display1}</span>
      {bar ? (
        <div style={{ flex: 1, height: 6, background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)', display: 'flex' }}>
          <div style={{ width: `${percent1}%`, background: color1, transition: 'width 0.4s' }} />
          <div style={{ width: `${percent2}%`, background: color2, transition: 'width 0.4s' }} />
        </div>
      ) : <div style={{ flex: 1 }} />}
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 12, color: 'var(--text)', minWidth: 34, textAlign: 'left' }}>{display2}</span>
    </div>
  );
}

/** Both drivers' season side by side, one row per stat. */
export default function ComparisonCard({ h2h, placeholder, color1, color2, hovered, onHover }: {
  h2h: H2HData | null;
  placeholder: string;
  color1: string;
  color2: string;
  hovered: HoveredMetric;
  onHover: (m: HoveredMetric) => void;
}) {
  if (!h2h) {
    return (
      <div style={{
        flex: 1, background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
        padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <Users size={40} style={{ color: 'var(--text-3)', marginBottom: 16 }} />
        <p style={{ fontFamily: MONO, fontSize: 'var(--fs-11)', color: 'var(--text-2)', textAlign: 'center', margin: 0 }}>{placeholder}</p>
      </div>
    );
  }

  const d1 = h2h.driver1, d2 = h2h.driver2;
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: '10px 14px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, marginBottom: 2, borderBottom: '1px solid var(--border-hi)' }}>
        <div>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, margin: '0 0 2px', color: 'var(--text)', whiteSpace: 'nowrap', display: 'inline-block', borderBottom: `3px solid ${color1}` }}>{lastName(d1.name)}</h2>
          <p style={{ fontFamily: MONO, fontSize: 'var(--fs-8)', color: 'var(--text-3)', margin: 0 }}>{d1.team}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span style={{ ...teamBadge(color1), fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>{d1.stats.points}</span>
            <span style={{ fontFamily: MONO, fontSize: 'var(--fs-8)', color: 'var(--text-3)' }}>vs</span>
            <span style={{ ...teamBadge(color2), fontFamily: DISPLAY, fontWeight: 800, fontSize: 18, lineHeight: 1.1 }}>{d2.stats.points}</span>
          </div>
          <span style={{ fontFamily: MONO, fontSize: 'var(--fs-7)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)' }}>Points</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h2 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 15, margin: '0 0 2px', color: 'var(--text)', whiteSpace: 'nowrap', display: 'inline-block', borderBottom: `3px solid ${color2}` }}>{lastName(d2.name)}</h2>
          <p style={{ fontFamily: MONO, fontSize: 'var(--fs-8)', color: 'var(--text-3)', margin: 0 }}>{d2.team}</p>
        </div>
      </div>

      {/* Extra height spreads evenly between rows instead of pooling at the bottom */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0 }}>
        {rowsFor(h2h).map(row => (
          <StatRow
            key={row.statKey}
            row={row}
            color1={color1}
            color2={color2}
            hovered={hovered?.kind === 'stat' && hovered.statKey === row.statKey}
            onHover={onHover}
          />
        ))}
      </div>
    </div>
  );
}
