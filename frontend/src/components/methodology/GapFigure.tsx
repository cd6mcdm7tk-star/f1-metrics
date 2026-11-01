import { CORNERS, GAP, OFFICIAL } from './mexicoPole';

const W = 680;
const H = 260;
const PAD = { top: 30, right: 16, bottom: 34, left: 60 };
const X_MAX = 4245;
const Y_MIN = -0.05;
const Y_MAX = 0.2;

const x = (distance: number) => PAD.left + (distance / X_MAX) * (W - PAD.left - PAD.right);
const y = (gap: number) => PAD.top + ((Y_MAX - gap) / (Y_MAX - Y_MIN)) * (H - PAD.top - PAD.bottom);

// Label size is set by .article figure text in index.css: larger on phones, where the chart is scaled down
const mono = { fontFamily: "'JetBrains Mono', monospace" };

/** The time-gap curve of the Mexico pole laps against the official gaps at the sector lines */
export default function GapFigure() {
  const path = GAP.map(([d, g], i) => `${i ? 'L' : 'M'}${x(d).toFixed(1)},${y(g).toFixed(1)}`).join(' ');
  return (
    <figure style={{ margin: '20px 0 24px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Russell's computed gap to Hamilton swings between minus 0.03 and plus 0.19 seconds along the lap, while the official gaps are 0.025 seconds at the first sector line, 0.003 at the second and 0.009 at the finish."
      >
        {[-0.05, 0, 0.1, 0.2].map(g => (
          <g key={g}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray={g === 0 ? undefined : '2 4'} />
            {g >= 0 && <text x={PAD.left - 8} y={y(g) + 5} textAnchor="end" fill="var(--text-3)" style={mono}>{g.toFixed(1)}</text>}
          </g>
        ))}
        {[0, 1000, 2000, 3000, 4000].map(d => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fill="var(--text-3)" style={mono}>{d === 0 ? '0 m' : `${d / 1000} km`}</text>
        ))}
        {CORNERS.map(c => (
          <text key={c.label} x={x(c.distance)} y={20} textAnchor="middle" fill="var(--text-3)" style={mono}>{c.label}</text>
        ))}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinejoin="round" />
        {OFFICIAL.map(o => (
          <g key={o.mark}>
            <line x1={x(o.distance)} x2={x(o.distance)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--text-3)" strokeDasharray="3 3" />
            <circle cx={x(o.distance)} cy={y(o.gap)} r={5} fill="var(--text)" />
            {/* Low in the plot, where the curve never goes: the values are in the caption */}
            <text x={x(o.distance) - 6} y={H - PAD.bottom - 6} textAnchor="end" fill="var(--text-3)" style={mono}>{o.mark}</text>
          </g>
        ))}
      </svg>
      <figcaption style={{ fontSize: 15, color: 'var(--text-2)', marginTop: 8 }}>
        Russell's gap to Hamilton (seconds) along their pole laps, Mexico City 2026. The line is what the site
        computes. The dots are the official gaps: {OFFICIAL.map(o => `${o.gap.toFixed(3)} s ${o.where}`).join(', ')}.
      </figcaption>
    </figure>
  );
}
