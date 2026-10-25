import { DISPLAY, MONO } from '../theme';
import { INK } from './ink';

export interface HudReading {
  driver: string;
  color: string;
  speed: number;
  gear: number;
  /** % */
  throttle: number;
  brake: boolean;
  distance: number;
}

const label = { fontFamily: MONO, fontSize: 20, letterSpacing: '0.2em', color: INK.textSub, textTransform: 'uppercase' as const };

function Bar({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ ...label, display: 'flex', justifyContent: 'space-between' }}>
        <span>{name}</span>
        <span style={{ color: INK.text }}>{Math.round(value)} %</span>
      </div>
      <div style={{ marginTop: 10, height: 10, background: 'rgba(242,230,216,0.10)' }}>
        <div style={{ width: `${value}%`, height: '100%', background: color }} />
      </div>
    </div>
  );
}

/** The car's instruments in the site's panel style: speed, gear, pedals */
export default function Hud({ reading, top, left, width }: { reading: HudReading; top: number; left: number; width: number }) {
  return (
    <div style={{
      position: 'absolute', top, left, width, padding: '26px 30px', boxSizing: 'border-box',
      background: 'rgba(36,6,10,0.78)', border: '1px solid rgba(242,230,216,0.14)', borderRadius: 2,
      backdropFilter: 'blur(12px)', color: INK.text,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 6, height: 30, background: reading.color }} />
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 36, letterSpacing: '0.12em' }}>{reading.driver}</span>
        </div>
        <span style={label}>{Math.round(reading.distance)} m</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 34, marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 150, lineHeight: 0.8, fontVariantNumeric: 'tabular-nums' }}>{Math.round(reading.speed)}</span>
          <span style={label}>km/h</span>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'center' }}>
          <div style={{
            width: 104, height: 104, border: `2px solid ${INK.text}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: DISPLAY, fontWeight: 700, fontSize: 80, lineHeight: 1,
          }}>
            {reading.gear}
          </div>
          <div style={{ ...label, marginTop: 10 }}>rapport</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, marginTop: 26 }}>
        <Bar name="Gaz" value={reading.throttle} color={INK.throttle} />
        <Bar name="Frein" value={reading.brake ? 100 : 0} color={INK.brake} />
      </div>
    </div>
  );
}
