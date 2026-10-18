import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { CARD, LABEL, VIDEO } from '../format';
import { ordinal, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import { Panel, PANEL } from './Panel';
import type { RaceFacts } from './race';
import { raceLapAt, SHOWN, type RecapStory } from './story';
import { RECAP_STRINGS } from './strings';

const PLOT = { left: 96, right: PANEL.w - 130, top: 130, bottom: PANEL.h - 70 };
/** Heads closer than this are spread apart so their codes stay readable */
const LABEL_GAP = 30;
/** Room a neutralisation's label takes: one closer to the last label keeps its band only */
const NEUTRAL_LABEL = 170;
/** Zoom following the lines as they draw, and onto the faller when named */
const FOLLOW = 1.55;
const PUNCH = 2.1;

interface View {
  x: number;
  y: number;
  k: number;
}
const mix = (a: View, b: View, t: number): View => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, k: a.k + (b.k - a.k) * t });
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const envelope = (frame: number, from: number, to: number, ramp: number) =>
  Math.min(
    interpolate(frame, [from, from + ramp], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }),
    interpolate(frame, [to - ramp, to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }),
  );

/** The gap of the top drivers to the leader, drawn lap by lap as the voice tells
 * the race; the camera follows the lines, dives onto the faller, and pulls out
 * to the whole race before the cut */
export default function RaceChart({ facts, story, scene, lang }: { facts: RaceFacts; story: RecapStory; scene: { from: number; to: number }; lang: Lang }) {
  const frame = useCurrentFrame();
  const s = RECAP_STRINGS[lang];
  const lap = raceLapAt(story, frame);
  const total = facts.totalLaps;
  const shown = facts.followed.slice(0, SHOWN);
  const maxGap = Math.max(10, Math.ceil(Math.max(...shown.flatMap(f => f.gaps)) / 10) * 10);
  const x = (l: number) => PLOT.left + ((l - 1) / (total - 1)) * (PLOT.right - PLOT.left);
  const y = (gap: number) => PLOT.top + (Math.min(gap, maxGap) / maxGap) * (PLOT.bottom - PLOT.top);
  const labelled = facts.neutralised.reduce<RaceFacts['neutralised']>(
    (kept, n) => (kept.length && x(n.from) - x(kept[kept.length - 1].from) < NEUTRAL_LABEL ? kept : [...kept, n]), [],
  );
  const gapAt = (gaps: number[], l: number) => {
    const k = Math.min(Math.floor(l), gaps.length) - 1;
    return k + 1 >= gaps.length ? gaps[gaps.length - 1] : gaps[k] + (gaps[k + 1] - gaps[k]) * (l - Math.floor(l));
  };
  // Teammates told apart by a dashed line for the second
  const seen = new Set<string>();
  const dashed = shown.map(f => (seen.has(f.driver.team) ? true : (seen.add(f.driver.team), false)));

  const heads = shown.map((f, i) => ({ i, y: y(gapAt(f.gaps, lap)) })).sort((a, b) => a.y - b.y);
  heads.forEach((h, k) => { if (k > 0) h.y = Math.max(h.y, heads[k - 1].y + LABEL_GAP); });
  const labelY = Object.fromEntries(heads.map(h => [h.i, h.y]));
  const faller = facts.faller;
  const fallerIndex = faller ? shown.findIndex(f => f.driver === faller.driver) : -1;

  // The camera: on the heads as they draw, on the faller when named, then out
  const heads0 = shown.map(f => y(gapAt(f.gaps, lap)));
  const follow: View = { x: x(lap) - 110, y: heads0.reduce((a, b) => a + b, 0) / heads0.length, k: FOLLOW };
  const punchAt = faller && story.raceLaps.find(k => k.lap === faller.lap)?.frame;
  const punch: View | null = faller && fallerIndex >= 0 ? { x: x(faller.lap), y: y(shown[fallerIndex].gaps[faller.lap - 1]), k: PUNCH } : null;
  const whole: View = { x: PANEL.w / 2, y: PANEL.h / 2, k: 1 };
  let view = follow;
  if (punch && punchAt != null) view = mix(view, punch, envelope(frame, punchAt - 6, punchAt + 80, 14));
  view = mix(view, whole, interpolate(frame, [scene.to - 80, scene.to - 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease }));
  const half = { x: PANEL.w / (2 * view.k), y: PANEL.h / (2 * view.k) };
  const cx = Math.min(Math.max(view.x, half.x), PANEL.w - half.x), cy = Math.min(Math.max(view.y, half.y), PANEL.h - half.y);

  return (
    <Panel>
      <svg
        width={PANEL.w} height={PANEL.h}
        style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${PANEL.w / 2 - cx * view.k}px, ${PANEL.h / 2 - cy * view.k}px) scale(${view.k})` }}
      >
        {facts.neutralised.map(n => (
          <g key={n.from} opacity={interpolate(lap, [n.from - 1, n.from], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}>
            <rect x={x(n.from - 0.5)} y={PLOT.top} width={x(n.to + 0.5) - x(n.from - 0.5)} height={PLOT.bottom - PLOT.top} fill={BRAND.bg} opacity={0.13} />
            {labelled.includes(n) && (
              <text x={x(n.from - 0.5) + 6} y={PLOT.top - 12} fontFamily={MONO} fontSize={15} letterSpacing="0.14em" fill={BRAND.bg}>{s.neutralised.toUpperCase()}</text>
            )}
          </g>
        ))}
        {Array.from({ length: maxGap / 10 + 1 }, (_, k) => k * 10).map(g => (
          <g key={g}>
            <line x1={PLOT.left} x2={PLOT.right} y1={y(g)} y2={y(g)} stroke={PANEL.grid} strokeWidth={2} strokeDasharray="6 6" />
            <text x={PLOT.left - 14} y={y(g) + 6} textAnchor="end" fontFamily={MONO} fontSize={18} fill={PANEL.sub}>{g === 0 ? '0' : `+${g}`}</text>
          </g>
        ))}
        {[1, ...Array.from({ length: Math.floor(total / 10) }, (_, k) => (k + 1) * 10), total].map(l => (
          <text key={l} x={x(l)} y={PLOT.bottom + 34} textAnchor="middle" fontFamily={MONO} fontSize={18} fill={PANEL.sub}>{l}</text>
        ))}
        {shown.map((f, i) => {
          const upTo = Math.floor(lap);
          const points = f.gaps.slice(0, upTo).map((g, k) => `${x(k + 1).toFixed(1)},${y(g).toFixed(1)}`);
          points.push(`${x(lap).toFixed(1)},${y(gapAt(f.gaps, lap)).toFixed(1)}`);
          const stops = f.stints.slice(1).map(st => st.from - 1).filter(l => l <= lap);
          return (
            <g key={f.driver.code} opacity={fallerIndex >= 0 && lap >= total && i !== fallerIndex && i !== 0 ? 0.55 : 1}>
              <polyline points={points.join(' ')} fill="none" stroke={f.driver.color} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed[i] ? '14 9' : undefined} />
              {stops.map(l => <circle key={l} cx={x(l)} cy={y(f.gaps[l - 1])} r={6} fill={PANEL.bg} stroke={f.driver.color} strokeWidth={3} />)}
              <circle cx={x(lap)} cy={y(gapAt(f.gaps, lap))} r={9} fill={f.driver.color} stroke={PANEL.bg} strokeWidth={3} />
              <text x={x(lap) + 18} y={labelY[i] + 9} fontFamily={DISPLAY} fontWeight={700} fontSize={28} fill={f.driver.color}>{f.driver.code}</text>
            </g>
          );
        })}
        {faller && fallerIndex >= 0 && lap >= faller.lap && (
          <Chip x={x(faller.lap)} y={y(shown[fallerIndex].gaps[faller.lap - 1]) - 26} text={`${faller.driver.code} · ${ordinal(faller.best, lang)}`} />
        )}
      </svg>
    </Panel>
  );
}

/** The lap the race chart has reached, big above its corner, out of the camera's way */
export function LapCounter({ story, total, lang }: { story: RecapStory; total: number; lang: Lang }) {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', right: VIDEO.width - CARD.x - CARD.w, bottom: LABEL.bottom - 8, textAlign: 'right', color: BRAND.text }}>
      <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.2em', textTransform: 'uppercase', color: BRAND.textSub }}>{RECAP_STRINGS[lang].lap} </span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 104, lineHeight: 1 }}>{Math.max(1, Math.floor(raceLapAt(story, frame)))}</span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, color: BRAND.textSub }}> / {total}</span>
    </div>
  );
}

function Chip({ x, y, text }: { x: number; y: number; text: string }) {
  const width = text.length * 15 + 28;
  return (
    <g transform={`translate(${x - width / 2} ${y - 40})`}>
      <rect width={width} height={40} rx={8} fill={BRAND.bg} />
      <text x={width / 2} y={28} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={26} fill={BRAND.text}>{text}</text>
    </g>
  );
}
