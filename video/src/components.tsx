import type { ReactNode } from 'react';
import { AbsoluteFill, Easing, interpolate } from 'remotion';
import { BRAND } from './theme';

/** Ease-out used for every entrance */
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 over `duration` frames from `start`, eased */
export const entrance = (frame: number, start: number, duration = 24): number =>
  interpolate(frame, [start, start + duration], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE_OUT });

/** The landing page's background and glow */
export function BrandBackground({ children }: { children?: ReactNode }) {
  return (
    <AbsoluteFill style={{ background: BRAND.bg }}>
      <div style={{
        position: 'absolute', top: '45%', left: '50%', width: 1500, height: 1100, transform: 'translate(-50%, -50%)',
        background: `radial-gradient(ellipse at center, ${BRAND.glow} 0%, transparent 70%)`,
      }} />
      {children}
    </AbsoluteFill>
  );
}
