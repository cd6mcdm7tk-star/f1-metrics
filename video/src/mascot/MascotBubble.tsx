import { spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BUBBLE } from '../format';
import { BRAND } from '../theme';
import type { VoiceLine } from '../voice';
import { poseAt } from './animate';
import Donkey from './Donkey';

// Room above the bubble for the head and ears, which poke out of it
const HEADROOM = 104;
// The head is drawn as wide as the bubble, its muzzle resting on the bottom edge
const MUZZLE_BOTTOM = 610;

/** The mascot in a round window in the corner while the data is on screen,
 * still saying the lines: it pops in at `from`. `at` moves it elsewhere. */
export default function MascotBubble({ lines, from, to, at = BUBBLE }: { lines: VoiceLine[]; from: number; to: number; at?: { x: number; y: number; size: number } }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (frame < from || frame >= to) return null;
  const pop = spring({ frame: frame - from, fps, config: { damping: 13, stiffness: 170 } });
  const { x, y, size } = at;
  const r = size / 2;
  const scale = size / 400;
  // Inside the circle, or anywhere above its middle
  const mask = `radial-gradient(circle at ${r}px ${HEADROOM + r}px, #000 ${r - 1}px, transparent ${r}px), linear-gradient(#000, #000)`;
  const maskLayers = { maskSize: `100% 100%, 100% ${HEADROOM + r}px`, maskRepeat: 'no-repeat', maskPosition: '0 0, 0 0' };

  return (
    <div style={{
      position: 'absolute', left: x, top: y - HEADROOM, width: size, height: size + HEADROOM,
      transform: `scale(${pop})`, transformOrigin: `50% ${HEADROOM + r}px`,
    }}>
      <div style={{
        position: 'absolute', left: 0, top: HEADROOM, width: size, height: size, borderRadius: '50%',
        background: '#3d0a10', boxShadow: `0 0 0 4px ${BRAND.text}, 0 14px 34px rgba(10,0,2,0.5)`,
      }} />
      <div style={{ position: 'absolute', inset: 0, maskImage: mask, WebkitMaskImage: mask, ...maskLayers }}>
        <Donkey
          {...poseAt(lines, frame, fps)} headOnly
          style={{ position: 'absolute', left: 0, top: HEADROOM + size - 8 - MUZZLE_BOTTOM * scale, width: size }}
        />
      </div>
    </div>
  );
}
