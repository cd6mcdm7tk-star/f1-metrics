import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { compoundColor } from '../../../frontend/src/utils/compoundColors';
import type { Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import { Panel, PANEL } from './Panel';
import type { RaceFacts, Stint } from './race';
import { SHOWN, type RecapStory } from './story';
import { RECAP_STRINGS } from './strings';

const BAR = { left: 230, right: PANEL.w - 150, top: 118, row: 122, height: 60 };
/** The bars build up over this share of the scene */
const BUILD = 0.55;

/** Each top driver's race as a bar of tyre stints, built up behind a lap cursor;
 * the camera closes in on the stint the voice names */
export default function Strategy({ facts, story, scene, lang }: { facts: RaceFacts; story: RecapStory; scene: { from: number; to: number }; lang: Lang }) {
  const frame = useCurrentFrame();
  const s = RECAP_STRINGS[lang];
  const total = facts.totalLaps;
  const progress = interpolate(frame, [scene.from + 14, scene.from + 14 + (scene.to - scene.from) * BUILD], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lap = 1 + progress * (total - 1);
  const x = (l: number) => BAR.left + ((l - 1) / total) * (BAR.right - BAR.left);
  const lit = story.stint && frame >= story.stint.from ? story.stint.code : null;
  const glow = lit ? interpolate(frame - story.stint!.from, [0, 10], [0, 1], { extrapolateRight: 'clamp' }) : 0;
  const litRow = facts.followed.slice(0, SHOWN).findIndex(f => f.driver.code === lit);
  const zoom = 1 + 0.22 * interpolate(frame - (story.stint?.from ?? 0), [0, 18], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.65, 0, 0.35, 1) });

  return (
    <Panel>
      <div style={{
        position: 'absolute', inset: 0, transform: litRow >= 0 ? `scale(${zoom})` : undefined,
        transformOrigin: `${BAR.left + 70}px ${BAR.top + (litRow + 0.5) * BAR.row}px`,
      }}>
      {[1, 10, 20, 30, 40, 50, 60].filter(l => l <= total).map(l => (
        <div key={l} style={{ position: 'absolute', left: x(l) - 20, width: 40, top: 64, textAlign: 'center', fontFamily: MONO, fontSize: 17, color: PANEL.sub }}>{l}</div>
      ))}
      {facts.followed.slice(0, SHOWN).map((f, row) => {
        const top = BAR.top + row * BAR.row;
        const enter = interpolate(frame, [scene.from + row * 5, scene.from + row * 5 + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const longest = f.stints.reduce((a, b) => (b.to - b.from > a.to - a.from ? b : a));
        const dim = lit && lit !== f.driver.code ? 1 - 0.55 * glow : 1;
        return (
          <div key={f.driver.code} style={{ position: 'absolute', left: 0, top, width: PANEL.w, height: BAR.row, opacity: enter * dim, transform: `translateX(${(1 - enter) * -60}px)` }}>
            <div style={{ position: 'absolute', left: 34, top: 18, fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, color: PANEL.ink }}>{f.driver.position}</div>
            <div style={{ position: 'absolute', left: 92, top: 22, fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, color: f.driver.color }}>{f.driver.code}</div>
            {f.stints.map(stint => (
              <Segment
                key={stint.from} stint={stint} lap={lap} x={x}
                highlight={lit === f.driver.code && stint === longest ? glow : 0} label={s.stint(stint.to - stint.from + 1, stint.compound)}
              />
            ))}
            <div style={{
              position: 'absolute', left: BAR.right + 18, top: 32, fontFamily: MONO, fontSize: 20, color: PANEL.sub,
              opacity: interpolate(progress, [0.9, 1], [0, 1], { extrapolateLeft: 'clamp' }),
            }}>
              {s.stops(f.stints.length - 1)}
            </div>
          </div>
        );
      })}
      {progress < 1 && <div style={{ position: 'absolute', left: x(lap), top: BAR.top - 10, width: 3, height: SHOWN * BAR.row, background: BRAND.bg }} />}
      </div>
    </Panel>
  );
}

/** A stint's stretch of the bar; lit, it says how long it lasted */
function Segment({ stint, lap, x, highlight, label }: { stint: Stint; lap: number; x: (l: number) => number; highlight: number; label: string }) {
  if (lap < stint.from) return null;
  const left = x(stint.from), right = x(Math.min(stint.to + 1, lap + 1));
  const color = compoundColor(stint.compound) || '#cfc4b4';
  const dark = color === '#ce0000' || color === '#0060ce' || color === '#007700';
  return (
    <div style={{
      position: 'absolute', left: left + 2, width: Math.max(0, right - left - 4), top: (BAR.row - BAR.height) / 2, height: BAR.height,
      borderRadius: 10, background: color, overflow: 'hidden',
      boxShadow: `inset 0 0 0 2px rgba(42,11,16,0.35)${highlight ? `, 0 0 0 ${4 * highlight}px ${BRAND.bg}` : ''}`,
      display: 'flex', alignItems: 'center', paddingLeft: 14,
      fontFamily: DISPLAY, fontWeight: 700, fontSize: 28, color: dark ? '#fff' : PANEL.ink,
    }}>
      {right - left > 60 && (stint.compound?.[0] ?? '?')}
      {/* After the tyre's letter, uncovered as the bar grows */}
      {highlight > 0 && <span style={{ position: 'absolute', left: 56, fontSize: 30, whiteSpace: 'nowrap', opacity: highlight }}>{label}</span>}
    </div>
  );
}
