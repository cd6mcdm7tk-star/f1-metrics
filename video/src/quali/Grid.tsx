import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CARD } from '../format';
import { formatGap, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import type { QualiFacts } from './facts';
import { GRID } from './story';
import { QUALI_STRINGS } from './strings';

const ROW = CARD.h / 5.5;
const SLOT = { w: 444, h: ROW - 22 };
const COLUMN = [CARD.x + 20, CARD.x + CARD.w - 20 - SLOT.w];

/** The top ten as a starting grid, two staggered columns, each slot dropping
 * in at its cue: from the back to the front, pole last */
export default function Grid({ facts, cues, lang }: { facts: QualiFacts; cues: number[]; lang: Lang }) {
  return (
    <>
      {facts.gaps.slice(0, GRID).map(({ driver, gap }, i) => (
        <Slot key={driver.code} index={i} code={driver.code} name={driver.name} team={driver.team} color={driver.color} gap={gap} cue={cues[i]} lang={lang} />
      ))}
    </>
  );
}

function Slot({ index, code, name, team, color, gap, cue, lang }: {
  index: number; code: string; name: string; team: string; color: string; gap: number; cue: number; lang: Lang;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < cue) return null;
  const drop = spring({ frame: frame - cue, fps, config: { damping: 14, stiffness: 150 } });
  const pole = index === 0;
  const glow = pole ? interpolate(frame - cue, [8, 20], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  const left = COLUMN[index % 2];
  const top = CARD.y + Math.floor(index / 2) * ROW + (index % 2) * (ROW / 2);

  return (
    <div style={{
      position: 'absolute', left, top, width: SLOT.w, height: SLOT.h, opacity: drop, transform: `translateY(${(1 - drop) * -50}px)`,
      color: BRAND.text,
    }}>
      {/* The painted grid box: a line across the front and down the sides */}
      <div style={{ position: 'absolute', inset: 0, borderTop: `4px solid ${BRAND.text}`, borderLeft: `4px solid ${BRAND.text}`, borderRight: `4px solid ${BRAND.text}`, opacity: 0.5 }} />
      <div style={{
        position: 'absolute', left: 12, right: 12, top: 14, bottom: 0, borderRadius: 12, background: '#3d0a10',
        boxShadow: pole ? `0 0 0 ${3 * glow}px ${BRAND.text}, 0 18px 40px rgba(10,0,2,0.5)` : '0 14px 30px rgba(10,0,2,0.4)',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, borderRadius: '12px 0 0 12px', background: color }} />
        <div style={{ position: 'absolute', left: 28, top: 6, fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, lineHeight: 1.1 }}>{index + 1}</div>
        <div style={{ position: 'absolute', left: 104, top: 12, fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, lineHeight: 1, color }}>{code}</div>
        <div style={{ position: 'absolute', left: 104, top: 64, fontFamily: MONO, fontSize: 15, letterSpacing: '0.14em', textTransform: 'uppercase', color: BRAND.textSub }}>
          {name} · {team}
        </div>
        <div style={{ position: 'absolute', right: 20, top: 18, fontFamily: MONO, fontWeight: 700, fontSize: 28 }}>
          {pole ? QUALI_STRINGS[lang].pole.toUpperCase() : `+${formatGap(gap, lang)}`}
        </div>
      </div>
    </div>
  );
}
