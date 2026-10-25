import type { ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';
import { SAFE, VIDEO } from '../format';
import { BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import { INK } from './ink';

/** The safe area's right edge, as a CSS `right` */
const VIDEO_RIGHT = VIDEO.width - SAFE.right;

/** The new series' backdrop: the site's dark bordeaux, lit from the top, with
 * the series and the brand along the top of the safe area. `scene` is drawn
 * under the fog and vignette, `children` over them. */
export default function Stage({ series, episode, fog = false, scene, children }: {
  series: string;
  episode?: string;
  /** Fades the far end of a 3D scene into the backdrop */
  fog?: boolean;
  scene?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <AbsoluteFill style={{ background: `linear-gradient(180deg, #5e1018 0%, ${INK.bg} 42%, ${INK.deep} 100%)` }}>
      {scene}
      {fog && <AbsoluteFill style={{ background: 'linear-gradient(180deg, #5e1018 0%, rgba(94,16,24,0.7) 14%, rgba(61,12,16,0) 32%)', pointerEvents: 'none' }} />}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 90% 70% at 50% 45%, transparent 55%, rgba(20,2,5,0.55) 100%)', pointerEvents: 'none' }} />
      <div style={{
        position: 'absolute', top: SAFE.top, left: SAFE.left, right: VIDEO_RIGHT, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        color: INK.text,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, letterSpacing: '0.14em' }}>{series}</span>
          {episode && <span style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.2em', color: INK.textSub }}>{episode}</span>}
        </div>
        <span style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.22em', color: INK.textSub }}>{BRAND_NAME}</span>
      </div>
      {children}
      <div style={{ position: 'absolute', top: SAFE.bottom + 14, right: VIDEO_RIGHT, fontFamily: MONO, fontSize: 22, letterSpacing: '0.08em', color: INK.text, opacity: 0.72 }}>
        {SITE}
      </div>
    </AbsoluteFill>
  );
}

