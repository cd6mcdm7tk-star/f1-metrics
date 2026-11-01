import type { Box } from '../../kit/CornerSchematic';
import { INK } from '../../kit/ink';

/** Streaks in the air: enough to read thinning, few enough to stay light */
const COUNT = 170;

/** A steady pseudo-random number in [0, 1) for streak `i`, so every frame draws the same air */
const random = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/** Air streaming right to left past a car heading right. `density` is the
 * share of the air left, 1 at sea level: each streak has its own threshold
 * and fades out once the air thins below it. `flow` is how far the air has
 * travelled (px), which the caller grows faster when the car goes faster. */
export default function AirField({ box, density, flow, opacity = 1 }: { box: Box; density: number; flow: number; opacity?: number }) {
  return (
    <svg style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, overflow: 'hidden', opacity }}>
      {Array.from({ length: COUNT }, (_, i) => {
        const kept = Math.min(1, Math.max(0, (density - random(i, 3)) / 0.04));
        if (kept <= 0) return null;
        const pace = 0.7 + random(i, 2) * 0.6;
        const length = 18 + random(i, 4) * 30;
        const x = box.w - ((random(i, 1) * (box.w + length) + flow * pace) % (box.w + length));
        const y = random(i, 5) * box.h;
        return <line key={i} x1={x} y1={y} x2={x + length} y2={y} stroke={INK.text} strokeWidth={2} strokeLinecap="round" opacity={0.32 * kept} />;
      })}
    </svg>
  );
}
