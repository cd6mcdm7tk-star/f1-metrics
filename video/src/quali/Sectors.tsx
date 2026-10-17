import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CARD } from '../format';
import { formatGap, formatLapTime, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import type { QualiFacts } from './facts';
import { QUALI_STRINGS } from './strings';

const CARD_W = (CARD.w - 2 * 24) / 3;
const DARK = '#3d0a10';

/** The quickest driver in each sector, then the lap their best sectors make:
 * its time counts down past the pole's */
export default function Sectors({ facts, cues, ideal, lang }: { facts: QualiFacts; cues: number[]; ideal: number | null; lang: Lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = QUALI_STRINGS[lang];
  const pole = facts.pole;

  return (
    <>
      {facts.sectors.map(({ driver, time }, k) => {
        const land = spring({ frame: frame - cues[k], fps, config: { damping: 14, stiffness: 150 } });
        return (
          <div key={k} style={{
            position: 'absolute', left: CARD.x + k * (CARD_W + 24), top: CARD.y + 10, width: CARD_W, height: 400, borderRadius: 16, background: DARK,
            boxShadow: '0 18px 40px rgba(10,0,2,0.45)', color: BRAND.text, padding: '26px 24px', boxSizing: 'border-box',
            opacity: frame >= cues[k] ? land : 0, transform: `translateY(${(1 - land) * 60}px)`,
          }}>
            <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.22em', textTransform: 'uppercase', color: BRAND.textSub }}>{s.sector(k + 1)}</div>
            <div style={{ marginTop: 18, fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, lineHeight: 1, color: driver.color }}>{driver.code}</div>
            <div style={{ marginTop: 6, fontFamily: DISPLAY, fontWeight: 600, fontSize: 32 }}>{driver.name}</div>
            <div style={{ position: 'absolute', left: 24, bottom: 26, fontFamily: MONO, fontWeight: 700, fontSize: 38 }}>{formatGap(time, lang).replace(/ ?s$/, '')}</div>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, borderRadius: '0 0 16px 16px', background: driver.color }} />
          </div>
        );
      })}
      {facts.ideal && ideal != null && frame >= ideal && pole.best != null && (
        <IdealLap name={facts.ideal.driver.name} color={facts.ideal.driver.color} time={facts.ideal.time} pole={pole.best} poleCode={pole.code} from={ideal} lang={lang} />
      )}
    </>
  );
}

function IdealLap({ name, color, time, pole, poleCode, from, lang }: { name: string; color: string; time: number; pole: number; poleCode: string; from: number; lang: Lang }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = QUALI_STRINGS[lang];
  const rise = spring({ frame: frame - from, fps, config: { damping: 15, stiffness: 140 } });
  // From the pole's time down to the ideal lap, ending under it
  const shown = pole + (time - pole) * interpolate(frame - from, [10, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const under = interpolate(frame - from, [38, 48], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div style={{
      position: 'absolute', left: CARD.x, top: CARD.y + 450, width: CARD.w, height: 420, borderRadius: 18, background: BRAND.text,
      boxShadow: '0 30px 80px rgba(10,0,2,0.55)', color: DARK, padding: '30px 36px', boxSizing: 'border-box',
      opacity: rise, transform: `translateY(${(1 - rise) * 120}px)`,
    }}>
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, borderRadius: '18px 0 0 18px', background: color }} />
      <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.24em', textTransform: 'uppercase', opacity: 0.6 }}>{s.ideal} · {name}</div>
      <div style={{ marginTop: 8, fontFamily: DISPLAY, fontWeight: 700, fontSize: 150, lineHeight: 1, letterSpacing: '-0.02em' }}>{formatLapTime(shown, lang)}</div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 22 }}>
        <span style={{ fontFamily: MONO, fontSize: 26, opacity: 0.6 }}>{s.pole} {poleCode} {formatLapTime(pole, lang)}</span>
        <span style={{
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, background: DARK, color: BRAND.text, borderRadius: 10, padding: '2px 16px',
          opacity: under, transform: `scale(${0.7 + 0.3 * under})`, display: 'inline-block',
        }}>
          −{s.idealDetail(formatGap(pole - time, lang))}
        </span>
      </div>
    </div>
  );
}
