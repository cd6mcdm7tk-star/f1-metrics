import { Easing } from 'remotion';
import { INK, inkOn } from '../kit/ink';
import { DISPLAY, MONO } from '../theme';
import type { PoleDriver } from './data';

// The top six as a starting grid: pole on the left, each row half a slot
// lower on the right, like the real grid. Cards come in one by one; one can
// be picked out with a figure under it while the others dim.

const CARD = { w: 404, h: 210 };
const COLUMNS = [72, 536];
const TOP = 470;
const ROW = 300;
const pop = Easing.out(Easing.back(1.6));

/** "1:34.035" */
export const lapTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(3).padStart(6, '0')}`;
};
/** "+0,179" */
export const gapText = (seconds: number): string => `+${seconds.toFixed(3).replace('.', ',')}`;

export interface TopSixProps {
  drivers: PoleDriver[];
  gaps: number[];
  /** Each card's entrance, 0 to 1 */
  shown: number[];
  /** The card picked out, by classification index, and how far, 0 to 1 */
  focus?: { index: number; amount: number; figure: string };
}

export default function TopSix({ drivers, gaps, shown, focus }: TopSixProps) {
  return (
    <>
      {drivers.map((driver, i) => {
        const t = shown[i] ?? 0;
        if (t <= 0) return null;
        const focused = focus?.index === i;
        const dim = focus && !focused ? 1 - 0.7 * focus.amount : 1;
        const lift = focused ? 1 + 0.06 * focus.amount : 1;
        const x = COLUMNS[i % 2], y = TOP + Math.floor(i / 2) * ROW + (i % 2) * (ROW / 2);
        return (
          <div key={driver.code} style={{
            position: 'absolute', left: x, top: y, width: CARD.w, height: CARD.h, boxSizing: 'border-box',
            opacity: Math.min(1, t * 1.5) * dim, transform: `translateY(${(1 - pop(t)) * 80}px) scale(${lift})`,
            background: 'rgba(36,6,10,0.82)', border: `1px solid ${focused && focus.amount > 0.5 ? INK.text : 'rgba(242,230,216,0.16)'}`, borderRadius: 2,
            boxShadow: i === 0 ? `0 0 ${60 * t}px rgba(242,230,216,0.18)` : 'none', color: INK.text, zIndex: focused ? 2 : 1,
          }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 10, background: driver.color }} />
            <div style={{ position: 'absolute', left: 34, top: 18, fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, lineHeight: 1 }}>P{driver.position}</div>
            <div style={{ position: 'absolute', right: 24, top: 26, fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em', color: INK.textSub, textTransform: 'uppercase' }}>{driver.team}</div>
            <div style={{ position: 'absolute', left: 34, top: 84, fontFamily: DISPLAY, fontWeight: 700, fontSize: 50, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{driver.name}</div>
            <div style={{ position: 'absolute', left: 34, bottom: 20, fontFamily: MONO, fontWeight: 500, fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>{lapTime(driver.time)}</div>
            <div style={{ position: 'absolute', right: 24, bottom: 22, fontFamily: MONO, fontSize: 26, color: i === 0 ? INK.bg : INK.textSub, background: i === 0 ? INK.text : 'none', padding: i === 0 ? '2px 10px' : 0 }}>
              {i === 0 ? 'POLE' : gapText(gaps[i])}
            </div>
            {focused && focus.amount > 0 && (
              <div style={{
                position: 'absolute', left: -2, right: -2, top: CARD.h + 14, padding: '12px 16px', textAlign: 'center',
                background: driver.color, color: inkOn(driver.color), opacity: focus.amount,
                fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, letterSpacing: '0.04em', whiteSpace: 'nowrap',
              }}>
                {focus.figure}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
