import type { ReactNode } from 'react';
import { EASE_OUT, pulse, ramp } from './motion';
import { DISPLAY } from '../theme';
import { INK } from './ink';

/** A figure landing at frame `at`: from bigger and transparent to its size,
 * with a short shake; it bumps when it is `named` again */
export default function Slam({ at, frame, children, top, size, color = INK.text, named }: {
  at: number; frame: number; children: ReactNode; top: number; size: number; color?: string; named?: number;
}) {
  const t = ramp(frame, at - 3, at + 10, EASE_OUT);
  if (t <= 0) return null;
  const shake = frame - at < 10 ? Math.sin((frame - at) * 2.4) * (10 - (frame - at)) * 1.4 : 0;
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 0, textAlign: 'center', opacity: t,
      transform: `translateX(${shake}px) scale(${(1.5 - 0.5 * t) * (named == null ? 1 : pulse(frame, named))})`,
      fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1, color, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums',
    }}>
      {children}
    </div>
  );
}
