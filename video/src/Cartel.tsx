import { interpolate, useCurrentFrame } from 'remotion';
import { LABEL } from './format';
import { BRAND, DISPLAY, MONO } from './theme';

export interface CartelProps {
  from: number;
  to: number;
  kicker: string;
  title: string;
  detail?: string;
  /** "02 / 04" when the shot is one of a series */
  chapter?: string;
  /** Narrower beside something on the right */
  maxWidth?: number;
}

/** A museum label beside the mascot's bubble: what the shot shows, then what to see in it */
export default function Cartel({ from, to, kicker, title, detail, chapter, maxWidth = 744 }: CartelProps) {
  const frame = useCurrentFrame();
  if (frame < from || frame >= to) return null;
  const opacity = Math.min(
    interpolate(frame, [from, from + 8], [0, 1], { extrapolateRight: 'clamp' }),
    interpolate(frame, [to - 6, to], [1, 0], { extrapolateLeft: 'clamp' }),
  );

  return (
    <div style={{ position: 'absolute', left: LABEL.left, bottom: LABEL.bottom, maxWidth, opacity, color: BRAND.text }}>
      <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.2em', textTransform: 'uppercase', color: BRAND.textSub }}>
        {kicker}{chapter && <span style={{ marginLeft: 14, color: BRAND.textGhost }}>{chapter}</span>}
      </div>
      <div style={{ marginTop: 6, fontFamily: DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.1 }}>{title}</div>
      {detail && <div style={{ marginTop: 4, fontFamily: DISPLAY, fontWeight: 500, fontSize: 26, lineHeight: 1.15, color: BRAND.textSub }}>{detail}</div>}
    </div>
  );
}
