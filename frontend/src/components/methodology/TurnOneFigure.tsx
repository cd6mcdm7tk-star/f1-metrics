import { teamColor } from '../../utils/teamColors';
import { TURN_ONE } from './mexicoPole';

const W = 680;
const H = 340;
const LEFT = 60;
const RIGHT = 16;
const SPEED = { top: 34, bottom: 206, min: 20, max: 370 };
const GAP = { top: 236, bottom: 300, min: -0.05, max: 0.15 };
const X_MIN = TURN_ONE[0][0];
const X_MAX = TURN_ONE[TURN_ONE.length - 1][0];

const HAM = teamColor('Ferrari');
const RUS = teamColor('Mercedes');

const x = (distance: number) => LEFT + ((distance - X_MIN) / (X_MAX - X_MIN)) * (W - LEFT - RIGHT);
const ySpeed = (kmh: number) => SPEED.bottom - ((kmh - SPEED.min) / (SPEED.max - SPEED.min)) * (SPEED.bottom - SPEED.top);
const yGap = (s: number) => GAP.bottom - ((s - GAP.min) / (GAP.max - GAP.min)) * (GAP.bottom - GAP.top);

// Label size is set by .article figure text in index.css
const mono = { fontFamily: "'JetBrains Mono', monospace" };

/** Where each numbered step of the reading sits on the speed chart: [step, distance (m), speed (km/h)] */
const STEPS: [number, number, number][] = [[1, 990, 285], [2, 1110, 300], [3, 1240, 45], [4, 1392, 218], [5, 1720, 265]];

const line = (pick: (row: (typeof TURN_ONE)[number]) => number, y: (v: number) => number) =>
  TURN_ONE.map((row, i) => `${i ? 'L' : 'M'}${x(row[0]).toFixed(1)},${y(pick(row)).toFixed(1)}`).join(' ');

/** Hamilton's and Russell's speed through Mexico's turn 1 and down the next straight, with Russell's gap under it */
export default function TurnOneFigure() {
  return (
    <figure style={{ margin: '20px 0 12px' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        role="img"
        aria-label="Speed of Hamilton and Russell from 900 to 1,850 metres in Mexico City qualifying: Russell brakes first for turn 1, Hamilton carries more speed in, both reach about 100 km/h, then Russell is slightly faster on the straight. Below, Russell's gap rises through turn 1 and falls slowly on the straight."
      >
        <text x={LEFT} y={18} fill="var(--text-3)" style={mono}>SPEED km/h</text>
        <text x={W - RIGHT - 110} y={18} fill={HAM} style={mono}>HAM</text>
        <text x={W - RIGHT - 50} y={18} fill={RUS} style={mono}>RUS</text>
        {[100, 200, 300].map(v => (
          <g key={v}>
            <line x1={LEFT} x2={W - RIGHT} y1={ySpeed(v)} y2={ySpeed(v)} stroke="var(--border)" strokeDasharray="2 4" />
            <text x={LEFT - 8} y={ySpeed(v) + 5} textAnchor="end" fill="var(--text-3)" style={mono}>{v}</text>
          </g>
        ))}
        <path d={line(r => r[2], ySpeed)} fill="none" stroke={RUS} strokeWidth={2} strokeLinejoin="round" />
        <path d={line(r => r[1], ySpeed)} fill="none" stroke={HAM} strokeWidth={2} strokeLinejoin="round" />
        {STEPS.map(([step, d, v]) => (
          <text key={step} x={x(d)} y={ySpeed(v)} textAnchor="middle" fill="var(--accent)" stroke="var(--bg)" strokeWidth={5}
            paintOrder="stroke" style={{ ...mono, fontWeight: 700 }}>{step}</text>
        ))}

        <text x={LEFT} y={GAP.top - 10} fill="var(--text-3)" style={mono}>RUSSELL'S GAP s</text>
        <line x1={LEFT} x2={W - RIGHT} y1={yGap(0)} y2={yGap(0)} stroke={HAM} strokeOpacity={0.5} />
        <text x={LEFT - 8} y={yGap(0) + 5} textAnchor="end" fill="var(--text-3)" style={mono}>0</text>
        <text x={LEFT - 8} y={yGap(0.1) + 5} textAnchor="end" fill="var(--text-3)" style={mono}>0.1</text>
        <path d={line(r => r[3], yGap)} fill="none" stroke={RUS} strokeWidth={2} strokeLinejoin="round" />

        {[1000, 1200, 1400, 1600, 1800].map(d => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fill="var(--text-3)" style={mono}>{(d / 1000).toFixed(1)} km</text>
        ))}
      </svg>
    </figure>
  );
}
