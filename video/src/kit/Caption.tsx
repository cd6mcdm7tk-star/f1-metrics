import { DISPLAY } from '../theme';
import { INK } from './ink';

/** The new series' subtitles: bold, centred, the key words on a cream band.
 * Written with *stars* round the marked words. */
export default function Caption({ text, top, pop = 1 }: { text: string; top: number; pop?: number }) {
  return (
    <div style={{
      position: 'absolute', top, left: 110, right: 180, textAlign: 'center', transform: `scale(${0.9 + 0.1 * pop})`, opacity: pop,
      fontFamily: DISPLAY, fontWeight: 700, fontSize: 58, lineHeight: 1.12, color: INK.text, textShadow: '0 3px 14px rgba(10,0,2,0.7)',
    }}>
      {text.split(/(\*[^*]+\*)/).map((part, i) => part.startsWith('*')
        ? <span key={i} style={{ background: INK.text, color: INK.bg, padding: '0 0.14em', textShadow: 'none' }}>{part.slice(1, -1)}</span>
        : part)}
    </div>
  );
}
