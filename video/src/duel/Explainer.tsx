import { interpolate, useCurrentFrame } from 'remotion';
import { EASE_OUT } from '../components';
import { BRAND, DISPLAY } from '../theme';
import { CARD } from '../format';

/** What a term means, at the foot of the card, while the voice uses it */
export default function Explainer({ from, to, text }: { from: number; to: number; text: string }) {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const enter = interpolate(frame, [from, from + 12], [0, 1], { extrapolateRight: 'clamp', easing: EASE_OUT });
  const leave = interpolate(frame, [to - 10, to], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <div style={{
      position: 'absolute', bottom: 1920 - CARD.y - CARD.h + 20, left: CARD.x + 20, maxWidth: CARD.w - 120,
      display: 'flex', alignItems: 'center', gap: 14, padding: '10px 20px 10px 12px', borderRadius: 40,
      background: 'rgba(94,16,24,0.94)', boxShadow: '0 10px 26px rgba(20,2,4,0.3)',
      opacity: enter * leave, transform: `translateX(${(1 - enter) * -40}px)`,
    }}>
      <span style={{
        width: 40, height: 40, borderRadius: '50%', background: BRAND.text, color: BRAND.bg, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 30,
      }}>?</span>
      <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 32, lineHeight: 1.15, color: BRAND.text }}>{text}</span>
    </div>
  );
}
