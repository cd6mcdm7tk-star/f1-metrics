import { useCurrentFrame } from 'remotion';
import { EASE_OUT, ramp } from '../bible/motion';
import Headline, { headline } from '../kit/Headline';
import { INK, inkOn } from '../kit/ink';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import { BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import type { SceneProps } from './GridScenes';

/** The question for the race, the top six in a row, the brand, and the mascot saying it all */
export default function VerdictScene({ session, story, from, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const brand = ramp(frame, from + 50, from + 70, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline
        lines={headline('Qui gagne\n*ce* *soir* ?')} size={130} reveal={i => ramp(frame, from + 6 + i * 6, from + 22 + i * 6, EASE_OUT)}
        style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      />
      <div style={{ position: 'absolute', top: 600, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
        {session.drivers.map((driver, i) => {
          const t = ramp(frame, from + 20 + i * 4, from + 34 + i * 4, EASE_OUT);
          return (
            <div key={driver.code} style={{
              width: 128, padding: '10px 0', textAlign: 'center', background: driver.color, color: inkOn(driver.color),
              opacity: t, transform: `translateY(${(1 - t) * 30}px)`, fontFamily: DISPLAY, fontWeight: 700, fontSize: 32, letterSpacing: '0.08em',
            }}>
              <div style={{ fontFamily: MONO, fontSize: 18, fontWeight: 500 }}>P{driver.position}</div>
              {driver.code}
            </div>
          );
        })}
      </div>
      <VoiceCaption line={story.beats.verdict} top={720} />
      <div style={{ position: 'absolute', top: 1360, left: 0, right: 0, textAlign: 'center', opacity: brand, transform: `translateY(${(1 - brand) * 30}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, letterSpacing: '0.16em', color: INK.text }}>{BRAND_NAME}</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: INK.textSub }}>{SITE}</div>
      </div>
    </Stage>
  );
}
