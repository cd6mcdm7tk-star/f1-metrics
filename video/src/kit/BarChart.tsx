import { DISPLAY, MONO } from '../theme';
import { INK } from './ink';
import type { Box } from './CornerSchematic';

export interface Bar {
  label: string;
  value: number;
  color: string;
  /** A second line under the label, e.g. the points scored that year */
  note?: string;
}

/** Vertical bars growing from a baseline, their values counting up with
 * them: up from the bottom, or down from the top for losses */
export default function BarChart({ bars, shown, box, max, format, down = false, line }: {
  bars: Bar[];
  /** Each bar's growth, 0 to 1 */
  shown: number[];
  box: Box;
  max: number;
  format: (value: number) => string;
  down?: boolean;
  /** A dashed level across the chart, with its label */
  line?: { value: number; label: string; shown: number };
}) {
  const slot = box.w / bars.length;
  const width = slot * 0.56;
  const labels = 92;
  const plot = box.h - labels - 70;
  const base = down ? box.y + 70 : box.y + 70 + plot;
  const height = (value: number) => (value / max) * plot;
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h }}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: base - box.y, height: 2, background: INK.textGhost }} />
      {line && line.shown > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: base - box.y + (down ? height(line.value) : -height(line.value)), opacity: line.shown }}>
          <div style={{ borderTop: `3px dashed ${INK.text}` }} />
          <div style={{ position: 'absolute', left: 0, bottom: 10, padding: '4px 10px', background: INK.bg, fontFamily: MONO, fontSize: 22, letterSpacing: '0.1em', color: INK.text, whiteSpace: 'nowrap' }}>{line.label}</div>
        </div>
      )}
      {bars.map((bar, i) => {
        const t = shown[i] ?? 0;
        const h = height(bar.value) * t;
        const left = i * slot + (slot - width) / 2;
        const top = down ? base - box.y : base - box.y - h;
        return (
          <div key={bar.label} style={{ opacity: t > 0 ? 1 : 0.35 }}>
            <div style={{ position: 'absolute', left, top, width, height: h, background: bar.color }} />
            <div style={{
              position: 'absolute', left: left - 30, width: width + 60, textAlign: 'center',
              top: down ? top + h + 10 : top - 64, opacity: t,
              fontFamily: DISPLAY, fontWeight: 700, fontSize: 48, color: INK.text, fontVariantNumeric: 'tabular-nums',
            }}>
              {format(bar.value * t)}
            </div>
            <div style={{
              position: 'absolute', left: i * slot, width: slot, textAlign: 'center', top: down ? -60 : plot + 86,
              fontFamily: MONO, fontSize: 24, letterSpacing: '0.1em', color: INK.textSub,
            }}>
              {bar.label}
              {bar.note && <div style={{ marginTop: 4, fontSize: 20, color: INK.text, opacity: t }}>{bar.note}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
