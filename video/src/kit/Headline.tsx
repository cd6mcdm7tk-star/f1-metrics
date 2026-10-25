import type { CSSProperties } from 'react';
import { DISPLAY } from '../theme';
import { INK } from './ink';

/** A word of a headline; marked words are set on a cream band, like a highlighter */
export interface HeadlineWord {
  text: string;
  mark?: boolean;
}

/** Big condensed caps, a line per array, for hooks and chapter titles.
 * `reveal` gives each word's entrance, 0 to 1, by its index in the text. */
export default function Headline({ lines, size = 104, style, reveal }: {
  lines: HeadlineWord[][]; size?: number; style?: CSSProperties; reveal?: (index: number) => number;
}) {
  let index = 0;
  return (
    <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 0.98, letterSpacing: '0.01em', textTransform: 'uppercase', color: INK.text, ...style }}>
      {lines.map((line, i) => (
        <div key={i} style={{ display: 'flex', flexWrap: 'wrap', gap: '0 0.24em', marginTop: i ? size * 0.08 : 0 }}>
          {line.map((word, j) => {
            const shown = reveal ? reveal(index++) : 1;
            return (
              <span key={j} style={{
                ...(word.mark ? { background: INK.text, color: INK.bg, padding: '0 0.12em', margin: '0 -0.12em' } : {}),
                opacity: shown, transform: `translateY(${(1 - shown) * 0.3 * size}px)`, display: 'inline-block',
              }}>
                {word.text}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** "Pourquoi *freiner* si tard ?" → words, the starred ones marked */
export const headline = (text: string): HeadlineWord[][] =>
  text.split('\n').map(line => line.split(' ').map(word => (word.startsWith('*') && word.endsWith('*') ? { text: word.slice(1, -1), mark: true } : { text: word })));
