import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { BRAND, DISPLAY, MONO } from '../theme';
import { Panel, PANEL } from './Panel';
import type { Standing } from './season';

const ROW = { top: 70, height: 128, bar: 64 };
const BAR = { left: 250, right: PANEL.w - 190 };
const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** The championship's top as bars: they start where the drivers stood before
 * the race, then grow to their points after it and swap places */
export default function Championship({ standings, winner, scene }: { standings: Standing[]; winner: string; scene: { from: number; to: number } }) {
  const frame = useCurrentFrame();
  const grow = interpolate(frame, [scene.from + 30, scene.from + 90], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease });
  const gained = interpolate(frame, [scene.from + 90, scene.from + 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const most = Math.max(...standings.map(s => s.after));
  const width = (points: number) => (points / most) * (BAR.right - BAR.left);
  const shown = standings.length;

  return (
    <Panel>
      {standings.map((s, i) => {
        // From its place before the race (below the table if it wasn't in it) to its place after
        const from = Math.min(s.placeBefore, shown + 0.6) - 1, to = s.place - 1;
        const row = from + (to - from) * grow;
        const enter = interpolate(frame, [scene.from + i * 4, scene.from + i * 4 + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const points = Math.round(s.before + (s.after - s.before) * grow);
        const lit = s.code === winner;
        return (
          <div key={s.code} style={{
            position: 'absolute', left: 0, width: PANEL.w, top: ROW.top + row * ROW.height, height: ROW.height,
            opacity: enter, transform: `translateX(${(1 - enter) * -60}px)`,
          }}>
            {lit && <div style={{ position: 'absolute', left: 16, right: 16, top: 8, bottom: 8, borderRadius: 14, background: BRAND.bg, opacity: 0.1 * gained }} />}
            <div style={{ position: 'absolute', left: 34, top: 32, fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, color: PANEL.ink }}>{Math.round(row) + 1}</div>
            <div style={{ position: 'absolute', left: 100, top: 22, fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, color: s.color }}>{s.code}</div>
            <div style={{ position: 'absolute', left: 100, top: 72, fontFamily: MONO, fontSize: 16, letterSpacing: '0.14em', textTransform: 'uppercase', color: PANEL.sub }}>{s.name}</div>
            <div style={{
              position: 'absolute', left: BAR.left, top: (ROW.height - ROW.bar) / 2, height: ROW.bar, width: width(s.before + (s.after - s.before) * grow),
              borderRadius: 10, background: s.color, boxShadow: 'inset 0 0 0 2px rgba(42,11,16,0.25)',
            }} />
            <div style={{ position: 'absolute', left: BAR.left + width(s.after) + 18, top: 30, fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: PANEL.ink }}>
              {points}
              {s.after > s.before && (
                <span style={{ marginLeft: 12, fontSize: 30, color: BRAND.bg, opacity: gained, display: 'inline-block', transform: `scale(${0.6 + 0.4 * gained})` }}>
                  +{s.after - s.before}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </Panel>
  );
}
