import type { ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile } from 'remotion';
import { INK } from '../kit/ink';
import MascotBubble from '../mascot/MascotBubble';
import Swipe from '../Swipe';
import type { Voiceover, VoiceLine } from '../voice';

/** Around a money episode's scenes: a swipe at each cut, the mascot for the
 * proof and for the closing line, and the voice */
export default function MoneyShell({ cuts, voice, voiceover, proof, end, frames, children }: {
  cuts: number[];
  voice: VoiceLine[];
  voiceover: Voiceover | null;
  proof: { line: VoiceLine; from: number; to: number };
  end: { line: VoiceLine; from: number };
  frames: number;
  children: ReactNode;
}) {
  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      {children}
      <MascotBubble lines={[proof.line]} from={proof.from + 12} to={proof.to} at={{ x: 770, y: 1330, size: 170 }} />
      <MascotBubble lines={[end.line]} from={end.from + 24} to={frames} at={{ x: 390, y: 960, size: 300 }} />
      {cuts.map(at => <Swipe key={at} at={at} />)}
      {voiceover && voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
