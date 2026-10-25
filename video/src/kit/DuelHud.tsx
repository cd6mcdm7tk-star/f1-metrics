import { DISPLAY, MONO } from '../theme';
import { INK } from './ink';

export interface DuelReading {
  code: string;
  color: string;
  speed: number;
  gear: number;
  /** % */
  throttle: number;
  brake: boolean;
}

const label = { fontFamily: MONO, fontSize: 20, letterSpacing: '0.2em', color: INK.textSub, textTransform: 'uppercase' as const };

function Row({ reading }: { reading: DuelReading }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '8px 110px 1fr 70px 150px', alignItems: 'center', gap: 18, height: 96 }}>
      <div style={{ height: 70, background: reading.color }} />
      <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, letterSpacing: '0.1em' }}>{reading.code}</span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 92, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums' }}>{Math.round(reading.speed)}</span>
        <span style={label}>km/h</span>
      </div>
      <div style={{ width: 64, height: 64, border: `2px solid ${INK.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 700, fontSize: 46 }}>
        {reading.gear}
      </div>
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ height: 10, background: 'rgba(242,230,216,0.10)' }}><div style={{ width: `${reading.throttle}%`, height: '100%', background: INK.throttle }} /></div>
        <div style={{ height: 10, background: 'rgba(242,230,216,0.10)' }}><div style={{ width: reading.brake ? '100%' : 0, height: '100%', background: INK.brake }} /></div>
      </div>
    </div>
  );
}

/** Two cars' instruments, one row each, with the gap between them on top:
 * speed, gear, throttle and brake, in the site's panel style */
export default function DuelHud({ readings, gap, top, left, width }: { readings: [DuelReading, DuelReading]; gap: string; top: number; left: number; width: number }) {
  return (
    <div style={{
      position: 'absolute', top, left, width, padding: '20px 28px', boxSizing: 'border-box', color: INK.text,
      background: 'rgba(36,6,10,0.8)', border: '1px solid rgba(242,230,216,0.14)', borderRadius: 2, backdropFilter: 'blur(12px)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={label}>Écart</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 30, letterSpacing: '0.04em', fontVariantNumeric: 'tabular-nums' }}>{gap}</span>
      </div>
      <Row reading={readings[0]} />
      <Row reading={readings[1]} />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 24, ...label, fontSize: 16 }}>
        <span>gaz</span><span style={{ color: INK.brake }}>frein</span>
      </div>
    </div>
  );
}
