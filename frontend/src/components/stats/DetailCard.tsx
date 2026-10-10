import type { CSSProperties, ReactNode } from 'react';
import { Flag, Target, Trophy, Zap } from 'lucide-react';
import type { H2HData, HoveredMetric, RaceClassification } from '../../stats/types';
import { summarizeDnfCauses } from '../../stats/dnf';
import { DISPLAY, MONO, share } from './shared';

const panelStyle: CSSProperties = { background: 'var(--panel)', border: '1px solid var(--border)', borderRadius: 'var(--r2)', padding: 14 };
const titleStyle: CSSProperties = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', margin: 0, fontWeight: 700 };
const bodyStyle: CSSProperties = { fontFamily: MONO, fontSize: 10, lineHeight: 1.7, color: 'var(--text-2)', margin: '0 0 8px' };
const iconStyle: CSSProperties = { color: 'var(--accent)' };

function Panel({ icon, title, children, style }: { icon: ReactNode; title: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ ...panelStyle, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
        {icon}
        <h3 style={titleStyle}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

/** "value / total = result" for one driver */
function FractionRow({ code, color, num, den, result }: { code: string; color: string; num: number | string; den: number | string; result: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6, fontFamily: MONO, fontSize: 11, color: 'var(--text-2)' }}>
      <span style={{ color, fontWeight: 700, minWidth: 34, textAlign: 'right' }}>{code}</span>
      <span>{num}</span><span style={{ color: 'var(--text-3)' }}>/</span><span>{den}</span><span style={{ color: 'var(--text-3)' }}>=</span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 16, color, minWidth: 48, textAlign: 'left' }}>{result}</span>
    </div>
  );
}

function Scores({ items }: { items: { color: string; text: string }[] }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', gap: 18, fontFamily: MONO, fontSize: 11 }}>
      {items.map(({ color, text }) => <span key={text} style={{ color }}>{text}</span>)}
    </div>
  );
}

function DnfCauses({ code, color, causes, total }: { code: string; color: string; causes: string[]; total: number }) {
  const counts = Object.entries(summarizeDnfCauses(causes)).filter(([, n]) => n > 0);
  return (
    <div>
      <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 10, color, marginBottom: 6 }}>{code}</div>
      {total === 0 ? (
        <p style={{ fontFamily: MONO, fontSize: 10, color: 'var(--text-2)', margin: '0 0 4px' }}>No DNFs this season</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {counts.map(([cause, n]) => (
            <div key={cause}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-2)' }}>{cause}</span>
                <span style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 12, color }}>{n}</span>
              </div>
              <div style={{ height: 5, background: 'var(--bg)', borderRadius: 'var(--r)', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${(n / total) * 100}%`, background: color }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RaceDetail({ classification, h2h, color1, color2 }: { classification: RaceClassification; h2h: H2HData; color1: string; color2: string }) {
  // Two columns, so a full grid fits the sidebar without scrolling
  const half = Math.ceil(classification.results.length / 2);
  return (
    <Panel icon={<Flag size={16} style={iconStyle} />} title={classification.raceName.replace(' Grand Prix', '')}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[0, 1].map(col => (
          <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {classification.results.slice(col * half, col * half + half).map(r => {
              const isD1 = r.code === h2h.driver1.code;
              const isD2 = r.code === h2h.driver2.code;
              return (
                <div key={r.code} style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '1px 4px',
                  background: isD1 || isD2 ? 'var(--accent-10)' : undefined, borderRadius: 'var(--r)',
                }}>
                  <span style={{ width: 13, fontFamily: MONO, fontSize: 8, color: 'var(--text-3)' }}>{r.position}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 9, color: isD1 ? color1 : isD2 ? color2 : 'var(--text-2)' }}>{r.code}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </Panel>
  );
}

/** Sidebar card explaining the hovered stat, or listing a hovered Grand Prix's classification. */
export default function DetailCard({ h2h, hovered, classifications, color1, color2 }: {
  h2h: H2HData;
  hovered: HoveredMetric;
  classifications: Record<number, RaceClassification>;
  color1: string;
  color2: string;
}) {
  const d1 = h2h.driver1, d2 = h2h.driver2;
  const s1 = d1.stats, s2 = d2.stats;
  const totalRaces = h2h.totalRaces || 1;
  const both = (render: (code: string, color: string, which: 0 | 1) => ReactNode) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {render(d1.code, color1, 0)}
      {render(d2.code, color2, 1)}
    </div>
  );

  if (hovered?.kind === 'race') {
    const classification = classifications[hovered.round];
    return classification ? <RaceDetail classification={classification} h2h={h2h} color1={color1} color2={color2} /> : null;
  }

  if (hovered?.kind !== 'stat') {
    return (
      <div style={{ ...panelStyle, textAlign: 'center' }}>
        <p style={{ fontFamily: MONO, fontSize: 9, lineHeight: 1.6, color: 'var(--text-3)', margin: 0 }}>
          Hover a stat, or a Grand Prix in the table below, for details
        </p>
      </div>
    );
  }

  switch (hovered.statKey) {
    case 'qualih2h': {
      const [p1, p2] = share(s1.qualiWins, s2.qualiWins);
      return (
        <Panel icon={<Target size={16} style={iconStyle} />} title="Qualifying H2H">
          <p style={bodyStyle}>Across <strong style={{ color: 'var(--text)' }}>{totalRaces}</strong> qualifying sessions, whoever set the faster lap wins that session.</p>
          <Scores items={[
            { color: color1, text: `${d1.code} ${s1.qualiWins} (${p1.toFixed(0)}%)` },
            { color: color2, text: `${d2.code} ${s2.qualiWins} (${p2.toFixed(0)}%)` },
          ]} />
        </Panel>
      );
    }

    case 'raceh2h':
      return (
        <Panel icon={<Flag size={16} style={iconStyle} />} title="Race H2H">
          <p style={bodyStyle}>Whoever is classified ahead wins the race. Retirements count too: they're ranked by distance covered.</p>
          <Scores items={[{ color: color1, text: `${d1.code} ${s1.raceWins}` }, { color: color2, text: `${d2.code} ${s2.raceWins}` }]} />
        </Panel>
      );

    case 'sprintqualih2h':
    case 'sprinth2h': {
      if (!h2h.sprint) return null;
      const isQuali = hovered.statKey === 'sprintqualih2h';
      const sp = h2h.sprint;
      return (
        <Panel icon={<Zap size={16} style={iconStyle} />} title={isQuali ? 'Sprint Qualifying H2H' : 'Sprint H2H'}>
          <p style={bodyStyle}>
            Same logic as {isQuali ? 'Qualifying' : 'Race'} H2H, across the <strong style={{ color: 'var(--text)' }}>{sp.totalSprints}</strong> sprint weekend{sp.totalSprints !== 1 ? 's' : ''} this season.
          </p>
          <Scores items={[
            { color: color1, text: `${d1.code} ${isQuali ? sp.sqWins1 : sp.sWins1}` },
            { color: color2, text: `${d2.code} ${isQuali ? sp.sqWins2 : sp.sWins2}` },
          ]} />
        </Panel>
      );
    }

    case 'qualitorace': {
      const fmt = (c: number) => (c > 0 ? `lost ${Math.abs(c).toFixed(1)}` : `gained ${Math.abs(c).toFixed(1)}`);
      return (
        <Panel icon={<Target size={16} style={iconStyle} />} title="Quali → Race">
          <p style={bodyStyle}>Avg race position minus avg qualifying position — negative means positions gained on race day.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontFamily: MONO, fontSize: 10 }}>
            {[{ d: d1, s: s1, color: color1 }, { d: d2, s: s2, color: color2 }].map(({ d, s, color }) => (
              <div key={d.code}>
                <span style={{ color, fontWeight: 700 }}>{d.code}</span>: P{s.avgRacePosition} − P{s.avgQualiPosition} → {fmt(s.avgRacePosition - s.avgQualiPosition)} on average
              </div>
            ))}
          </div>
        </Panel>
      );
    }

    case 'dnfs':
      return (
        <Panel icon={<Flag size={16} style={iconStyle} />} title="Reliability">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <DnfCauses code={d1.code} color={color1} causes={s1.dnfCauses} total={s1.dnfs} />
            <DnfCauses code={d2.code} color={color2} causes={s2.dnfCauses} total={s2.dnfs} />
          </div>
        </Panel>
      );

    case 'avgracepos':
      return (
        <Panel icon={<Target size={16} style={iconStyle} />} title="Avg Race Position">
          <p style={bodyStyle}>Sum of race finishes divided by races classified (DNFs excluded).</p>
          {both((code, color, i) => {
            const s = i === 0 ? s1 : s2;
            return <FractionRow code={code} color={color} num={s.raceFinishes.reduce((a, b) => a + b, 0)} den={s.raceFinishes.length} result={`P${s.avgRacePosition}`} />;
          })}
        </Panel>
      );

    case 'avgqualipos':
      return (
        <Panel icon={<Target size={16} style={iconStyle} />} title="Avg Quali Position">
          <p style={bodyStyle}>Averaged across qualifying sessions.</p>
          {both((code, color, i) => {
            const s = i === 0 ? s1 : s2;
            return <FractionRow code={code} color={color} num={s.qualiPositions.reduce((a, b) => a + b, 0)} den={s.qualiPositions.length} result={`P${s.avgQualiPosition}`} />;
          })}
        </Panel>
      );

    case 'pointsperrace':
      return (
        <Panel icon={<Trophy size={16} style={iconStyle} />} title="Points per Race">
          <p style={bodyStyle}>Total points scored divided by classified finishes (DNFs excluded).</p>
          {both((code, color, i) => {
            const s = i === 0 ? s1 : s2;
            const finishes = s.raceFinishes.length;
            return <FractionRow code={code} color={color} num={s.racePoints} den={finishes} result={finishes > 0 ? (s.racePoints / finishes).toFixed(1) : '—'} />;
          })}
        </Panel>
      );

    case 'poleconv':
      return (
        <Panel icon={<Trophy size={16} style={iconStyle} />} title="Pole Conversion">
          <p style={bodyStyle}>Races won after starting from pole, out of total poles.</p>
          {both((code, color, i) => {
            const s = i === 0 ? s1 : s2;
            return <FractionRow code={code} color={color} num={s.poleWins} den={s.poles} result={s.poles > 0 ? `${((s.poleWins / s.poles) * 100).toFixed(1)}%` : 'N/A'} />;
          })}
        </Panel>
      );
  }

  // The rest are "count out of races entered"
  const counts: Record<string, { title: string; value: (s: typeof s1) => number }> = {
    wins: { title: 'Wins', value: s => s.wins },
    poles: { title: 'Poles', value: s => s.poles },
    podiums: { title: 'Podiums', value: s => s.podiums },
    fastestlaps: { title: 'Fastest Laps', value: s => s.fastestLaps },
    winrate: { title: 'Win Rate', value: s => s.wins },
    podiumrate: { title: 'Podium Rate', value: s => s.podiums },
  };
  const count = counts[hovered.statKey];
  if (!count) return null;
  return (
    <Panel icon={<Trophy size={16} style={iconStyle} />} title={count.title}>
      {both((code, color, i) => {
        const n = count.value(i === 0 ? s1 : s2);
        return <FractionRow code={code} color={color} num={n} den={totalRaces} result={`${((n / totalRaces) * 100).toFixed(1)}%`} />;
      })}
    </Panel>
  );
}
