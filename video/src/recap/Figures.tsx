import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CARD } from '../format';
import { BRAND, DISPLAY, MONO } from '../theme';
import type { FigureCard } from './story';

/** One big figure at a time, its number counting up as it lands */
export default function Figures({ cards }: { cards: FigureCard[] }) {
  const frame = useCurrentFrame();
  const card = cards.find(c => frame >= c.from && frame < c.to);
  return card ? <Figure key={card.from} card={card} /> : null;
}

function Figure({ card }: { card: FigureCard }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const land = spring({ frame: frame - card.from, fps, config: { damping: 15, stiffness: 150 } });
  const count = Math.round(card.value * interpolate(frame - card.from, [4, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const detail = interpolate(frame - card.from, [14, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  // It lands hard: the screen shakes as it settles
  const since = frame - card.from - 9;
  const shake = since >= 0 && since < 12 ? Math.sin(since * 2.6) * 12 * (1 - since / 12) : 0;

  return (
    <div style={{
      position: 'absolute', left: CARD.x, top: CARD.y + 80, width: CARD.w, height: CARD.h - 160, color: BRAND.text,
      display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 60,
      transform: `translate(${(1 - land) * 140 + shake}px, ${shake * 0.5}px) scale(${1.4 - 0.4 * land})`, opacity: Math.min(1, land * 1.6), transformOrigin: '0 50%',
    }}>
      <div style={{
        position: 'absolute', right: -40, top: '50%', transform: `translateY(-50%) translateX(${(1 - land) * 160}px)`,
        fontFamily: DISPLAY, fontWeight: 700, fontSize: 420, lineHeight: 1, letterSpacing: '-0.04em', color: card.color, opacity: 0.16,
      }}>
        {card.ghost}
      </div>
      <div style={{ position: 'absolute', left: 0, top: 70, bottom: 70, width: 14, borderRadius: 7, background: card.color }} />
      <div style={{ fontFamily: MONO, fontSize: 26, letterSpacing: '0.3em', textTransform: 'uppercase', color: BRAND.textSub }}>{card.label}</div>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 340, lineHeight: 0.9, letterSpacing: '-0.03em' }}>{card.sign}{count}</div>
      <div style={{ marginTop: 10, fontFamily: DISPLAY, fontWeight: 600, fontSize: 48, lineHeight: 1.1, opacity: detail }}>{card.detail}</div>
    </div>
  );
}
