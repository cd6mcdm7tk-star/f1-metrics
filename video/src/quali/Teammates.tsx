import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CARD } from '../format';
import { formatGap, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import type { QualiFacts } from './facts';
import { PAIRS } from './story';

const ROW = CARD.h / PAIRS;

/** Each team's two drivers side by side, the quicker on the left, the gap
 * between them as the voice comes to it */
export default function Teammates({ facts, cues, lang }: { facts: QualiFacts; cues: number[]; lang: Lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {facts.teammates.slice(0, PAIRS).map(({ ahead, behind, gap }, i) => {
        const cue = cues[i];
        const land = spring({ frame: frame - cue, fps, config: { damping: 15, stiffness: 150 } });
        return (
          <div key={ahead.code} style={{
            position: 'absolute', left: CARD.x, top: CARD.y + i * ROW + 10, width: CARD.w, height: ROW - 24, borderRadius: 16,
            background: '#3d0a10', boxShadow: '0 16px 36px rgba(10,0,2,0.45)', color: BRAND.text, overflow: 'hidden',
            opacity: frame >= cue ? land : 0, transform: `translateX(${(1 - land) * -140}px)`,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 12, background: ahead.color }} />
            <div style={{ position: 'absolute', left: 40, top: 24, fontFamily: DISPLAY, fontWeight: 700, fontSize: 76, lineHeight: 1, color: ahead.color }}>{ahead.code}</div>
            <div style={{ position: 'absolute', left: 40, top: 112, fontFamily: MONO, fontSize: 17, letterSpacing: '0.16em', textTransform: 'uppercase', color: BRAND.textSub }}>
              {ahead.team} · P{ahead.position}
            </div>
            <div style={{ position: 'absolute', left: 270, top: 44, fontFamily: DISPLAY, fontWeight: 600, fontSize: 40, color: BRAND.textGhost }}>›</div>
            <div style={{ position: 'absolute', left: 320, top: 38, fontFamily: DISPLAY, fontWeight: 700, fontSize: 56, lineHeight: 1, color: BRAND.textSub }}>{behind.code}</div>
            <div style={{ position: 'absolute', left: 320, top: 104, fontFamily: MONO, fontSize: 17, letterSpacing: '0.16em', color: BRAND.textGhost }}>P{behind.position}</div>
            <div style={{ position: 'absolute', right: 36, top: 30, textAlign: 'right' }}>
              <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84, lineHeight: 1 }}>{formatGap(gap, lang).replace(/ ?s$/, '')}</div>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', color: BRAND.textSub }}>SEC</div>
            </div>
          </div>
        );
      })}
    </>
  );
}
