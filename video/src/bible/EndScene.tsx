import { useCurrentFrame } from 'remotion';
import Headline, { headline } from '../kit/Headline';
import { INK } from '../kit/ink';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import { BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import type { VoiceLine } from '../voice';
import { EASE_OUT, ramp } from './motion';

/** The closing card: the next episode, then the brand and the site, the
 * mascot saying it under them */
export default function EndScene({ next, line, from, series, episode }: { next: string; line: VoiceLine; from: number; series: string; episode: string }) {
  const frame = useCurrentFrame();
  const kicker = ramp(frame, from + 4, from + 20, EASE_OUT);
  const brand = ramp(frame, from + 40, from + 60, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <div style={{ position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', opacity: kicker, fontFamily: MONO, fontSize: 26, letterSpacing: '0.3em', color: INK.textSub }}>
        PROCHAIN ÉPISODE
      </div>
      <Headline
        lines={headline(next)} size={140} reveal={i => ramp(frame, from + 10 + i * 6, from + 26 + i * 6, EASE_OUT)}
        style={{ position: 'absolute', top: 390, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      />
      <VoiceCaption line={line} top={640} />
      <div style={{ position: 'absolute', top: 1360, left: 0, right: 0, textAlign: 'center', opacity: brand, transform: `translateY(${(1 - brand) * 30}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, letterSpacing: '0.16em', color: INK.text }}>{BRAND_NAME}</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: INK.textSub }}>{SITE}</div>
      </div>
    </Stage>
  );
}
