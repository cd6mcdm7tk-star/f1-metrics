import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrandBackground } from '../components';
import type { VoiceLine } from '../voice';
import { poseAt } from './animate';
import Donkey from './Donkey';

/** The framings the shot jumps between, a sentence each, as a presenter's
 * edit cuts between two cameras */
const FRAMINGS = [1, 1.12];

/** When each sentence of `lines` starts: the first word, and the word after a full stop */
export function sentenceStarts(lines: VoiceLine[]): number[] {
  return lines.flatMap(line => line.said.filter((_, i) => i === 0 || /[.?!…]$/.test(line.said[i - 1].word)).map(word => word.start));
}

/** The mascot saying `lines` to camera, chest up, as a presenter does between
 * two shots of the data. The camera creeps in from `from` to `to`. */
export default function MascotShot({ lines, from, to, print = true }: { lines: VoiceLine[]; from: number; to: number; print?: boolean }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const push = 1 + 0.035 * Math.min(1, Math.max(0, (frame - from) / (to - from)));
  const sentence = sentenceStarts(lines).filter(start => start <= frame).length;
  const framing = FRAMINGS[Math.max(0, sentence - 1) % FRAMINGS.length];

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ transform: `scale(${push * framing})`, transformOrigin: '50% 62%' }}>
        <div style={{ position: 'absolute', left: 90, top: -30, width: 900 }}>
          <Donkey {...poseAt(lines, frame, fps)} print={print} style={{ width: '100%' }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
