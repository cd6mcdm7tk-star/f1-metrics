import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { BRAND } from './theme';

// The sweep takes this many frames either side of the cut
const HALF = 9;
const WIDTH = 2300;
const ease = Easing.bezier(0.65, 0, 0.35, 1);

/** A slanted band of the brand's colours sweeping across the screen, the cut at
 * frame `at` hidden under it */
export default function Swipe({ at }: { at: number }) {
  const frame = useCurrentFrame();
  if (frame < at - HALF || frame > at + HALF) return null;
  const t = interpolate(frame, [at - HALF, at + HALF], [0, 1], { easing: ease });
  const left = -WIDTH - 600 + t * (WIDTH + 2300);
  return (
    <div style={{ position: 'absolute', top: -500, height: 2920, left, width: WIDTH, transform: 'skewX(-14deg)', zIndex: 100 }}>
      <div style={{ position: 'absolute', inset: 0, background: '#3d0a10' }} />
      <div style={{ position: 'absolute', top: 0, bottom: 0, right: -34, width: 34, background: BRAND.text }} />
    </div>
  );
}
