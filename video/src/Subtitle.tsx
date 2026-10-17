import { useCurrentFrame } from 'remotion';
import { BRAND, DISPLAY } from './theme';
import type { VoiceLine } from './voice';
import { chunkWords } from './words';

/** Where subtitles sit in every shot: under the data card, on the mascot's chest */
export const SUBTITLE_TOP = 1392;

/** The voice as plain subtitles, a phrase at a time, as in a film: no box,
 * no highlight, at most two lines */
export default function Subtitle({ line, top }: { line: VoiceLine; top: number }) {
  const frame = useCurrentFrame();
  if (frame < line.from || frame >= line.to) return null;
  const phrase = [...chunkWords(line.words, 42, 9)].reverse().find(chunk => chunk[0].from <= frame);
  if (!phrase) return null;

  return (
    <div style={{
      position: 'absolute', top, left: 140, right: 140, textAlign: 'center',
      fontFamily: DISPLAY, fontWeight: 600, fontSize: 46, lineHeight: 1.08, letterSpacing: '-0.01em', color: BRAND.text,
      textShadow: '0 2px 10px rgba(0,0,0,0.5)',
    }}>
      {phrase.map(word => word.text).join(' ')}
    </div>
  );
}
