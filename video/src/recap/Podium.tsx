import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CARD } from '../format';
import { formatGap, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import type { RecapDriver } from './data';
import type { RaceFacts } from './race';
import { RECAP_STRINGS } from './strings';

// P2, P1, P3 from the left, the winner's block the tallest
const COLUMNS = [1, 0, 2];
const HEIGHTS = [780, 660, 590];
const WIDTH = 300;
const GAP = (CARD.w - 3 * WIDTH) / 2;

/** When the winner's block lands, after its rise */
const LANDS = 12;

/** The top three as blocks in their team's colour, each rising as its driver is
 * named; the screen shakes as the winner's lands, and the camera creeps in */
export default function Podium({ facts, drivers, cues, streak, scene, lang }: {
  facts: RaceFacts; drivers: RecapDriver[]; cues: number[]; streak: number; scene: { from: number; to: number }; lang: Lang;
}) {
  const frame = useCurrentFrame();
  const push = 1 + 0.06 * interpolate(frame, [scene.from, scene.to], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const since = frame - cues[0] - LANDS;
  const shake = since >= 0 && since < 14 ? Math.sin(since * 2.4) * 14 * (1 - since / 14) : 0;
  const flash = interpolate(since, [0, 10], [0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, transform: `translate(${shake}px, ${shake * 0.4}px) scale(${push})`, transformOrigin: '50% 75%' }}>
        {COLUMNS.map((place, column) => (
          <Block
            key={place} driver={drivers[place]} place={place} cue={cues[place]} lang={lang} streak={place === 0 ? streak : 0}
            left={CARD.x + column * (WIDTH + GAP)} gap={facts.followed[place]?.gaps.at(-1) ?? 0} led={facts.lapsLed}
          />
        ))}
      </div>
      {since >= 0 && <div style={{ position: 'absolute', inset: 0, background: BRAND.text, opacity: flash }} />}
    </>
  );
}

function Block({ driver, place, cue, left, gap, led, streak, lang }: {
  driver: RecapDriver; place: number; cue: number; left: number; gap: number; led: number; streak: number; lang: Lang;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = RECAP_STRINGS[lang];
  const height = HEIGHTS[place];
  const rise = spring({ frame: frame - cue, fps, config: { damping: 14, stiffness: 120 } });
  const text = interpolate(frame, [cue + 8, cue + 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const counted = gap * interpolate(frame, [cue + 10, cue + 36], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (frame < cue) return null;

  return (
    <div style={{
      position: 'absolute', left, top: CARD.y + CARD.h - height, width: WIDTH, height, borderRadius: '18px 18px 0 0', overflow: 'hidden',
      background: `linear-gradient(180deg, rgba(255,255,255,0.14), rgba(0,0,0,0.28)), ${driver.color}`,
      boxShadow: place === 0 ? `0 0 0 4px ${BRAND.text}, 0 30px 80px rgba(10,0,2,0.6)` : '0 24px 60px rgba(10,0,2,0.5)',
      transform: `translateY(${(1 - rise) * (height + 120)}px)`, color: BRAND.text,
    }}>
      <div style={{ position: 'absolute', left: 24, top: 6, fontFamily: DISPLAY, fontWeight: 700, fontSize: 220, lineHeight: 1, opacity: 0.92 }}>{place + 1}</div>
      <div style={{ position: 'absolute', left: 24, right: 20, bottom: 26, opacity: text }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 88, lineHeight: 0.9, letterSpacing: '-0.01em' }}>{driver.code}</div>
        <div style={{ marginTop: 6, fontFamily: DISPLAY, fontWeight: 600, fontSize: 36 }}>{driver.name}</div>
        <div style={{ marginTop: 2, fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', textTransform: 'uppercase', opacity: 0.75 }}>{driver.team}</div>
        <div style={{ marginTop: 18, fontFamily: MONO, fontWeight: 700, fontSize: 30 }}>
          {place === 0 ? s.winner.toUpperCase() : `+${formatGap(counted, lang, 1)}`}
        </div>
        {place === 0 && <div style={{ marginTop: 4, fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, opacity: 0.85 }}>{s.ledAll(led)}</div>}
        {streak > 1 && <div style={{ marginTop: 2, fontFamily: DISPLAY, fontWeight: 600, fontSize: 28, opacity: 0.85 }}>{s.streak(streak)}</div>}
      </div>
    </div>
  );
}
