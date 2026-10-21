import { AbsoluteFill } from 'remotion';
import { BRAND, BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import Donkey from './Donkey';
import { FACES } from './face';

// The image link previews show (frontend/public/og-image.png): the brand on
// the left, the mascot's bust on the right. Everything sits clear of the
// 2:1 crop some networks apply.

export const SHARE_SIZE = { width: 1200, height: 630 };
/** Head and shoulders, cut at the chest by the bottom edge */
const BUST = '-40 -80 680 780';

export default function ShareImage() {
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 74% 46%, #7a1822 0%, ${BRAND.bg} 38%, #3d0a10 100%)` }}>
      <div style={{ position: 'absolute', left: 88, top: 0, bottom: 0, width: 640, display: 'flex', flexDirection: 'column', justifyContent: 'center', color: BRAND.text }}>
        <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.3em', textTransform: 'uppercase', color: BRAND.textSub }}>
          Formula 1 · Telemetry · Statistics
        </div>
        <div style={{ marginTop: 22, fontFamily: DISPLAY, fontWeight: 700, fontSize: 112, letterSpacing: '0.06em', lineHeight: 0.92 }}>
          {BRAND_NAME.split(' ').map(word => <div key={word}>{word}</div>)}
        </div>
        <div style={{ marginTop: 28, fontFamily: DISPLAY, fontWeight: 500, fontSize: 36, letterSpacing: '0.02em', lineHeight: 1.2, color: BRAND.textSub }}>
          Speed, throttle, braking —<br />any driver, any lap.
        </div>
        <div style={{ marginTop: 44, width: 72, height: 2, background: BRAND.textGhost }} />
        <div style={{ marginTop: 22, fontFamily: MONO, fontWeight: 500, fontSize: 22, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          {SITE}
        </div>
      </div>
      <Donkey face={FACES.pleased} print={false} viewBox={BUST} style={{ position: 'absolute', right: 24, bottom: 0, height: 630 }} />
    </AbsoluteFill>
  );
}
