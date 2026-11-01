import { AbsoluteFill, useCurrentFrame } from 'remotion';
import type { VoiceLine } from '../voice';
import { chunkWords } from '../words';
import { useFraming } from './Camera';
import Caption from './Caption';
import { unframed } from './framing';

/** How long a new phrase takes to pop in (frames) */
const POP = 6;

/** The voice as the new series' subtitles: a short phrase at a time, popping
 * in as it is said, its figures on the cream band, held still while the
 * camera moves */
export default function VoiceCaption({ line, top }: { line: VoiceLine; top: number }) {
  const frame = useCurrentFrame();
  const framing = useFraming();
  if (frame < line.from || frame >= line.to) return null;
  const phrase = [...chunkWords(line.words, 30, 6)].reverse().find(chunk => chunk[0].from <= frame);
  if (!phrase) return null;
  const text = phrase.map(word => (word.figure ? `*${word.text}*` : word.text)).join(' ');
  return (
    <AbsoluteFill style={unframed(framing)}>
      <Caption text={text} top={top} pop={Math.min(1, (frame - phrase[0].from + 1) / POP)} />
    </AbsoluteFill>
  );
}
