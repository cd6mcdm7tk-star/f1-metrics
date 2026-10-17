import type { ReactNode } from 'react';
import { interpolate, useCurrentFrame } from 'remotion';
import { EASE_OUT } from '../components';
import { CARD } from '../format';

/** The site's cream data panel, where the page's card sits in the other shots */
export const PANEL = { ...CARD, bg: '#f2e6d8', ink: '#2a0b10', sub: 'rgba(42,11,16,0.55)', grid: 'rgba(94,16,24,0.12)' };

/** A scene's content sliding in from the right as the scene starts */
export function SlideIn({ from, children }: { from: number; children: ReactNode }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [from, from + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });
  return <div style={{ position: 'absolute', inset: 0, opacity: p, transform: `translateX(${(1 - p) * 90}px)` }}>{children}</div>;
}

export function Panel({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'absolute', left: PANEL.x, top: PANEL.y, width: PANEL.w, height: PANEL.h, overflow: 'hidden',
      borderRadius: 18, background: PANEL.bg, boxShadow: '0 30px 90px rgba(10,0,2,0.55)',
    }}>
      {children}
    </div>
  );
}
