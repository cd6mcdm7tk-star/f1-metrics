import { interpolate, useCurrentFrame } from 'remotion';
import { SAFE } from './format';
import { BRAND, BRAND_NAME, DISPLAY, MONO } from './theme';

export interface TitleCardProps {
  from: number;
  /** Shown until the end without */
  to?: number;
  /** The series, small above: "LE DUEL" */
  kicker: string;
  /** Huge, one entry per line */
  title: string[];
  /** Under it: who, where, when */
  meta?: string;
}

/** The episode's title set big over the shot, as a magazine cover does; on
 * the first frame it is the video's cover */
export function TitleCard({ from, to, kicker, title, meta }: TitleCardProps) {
  const frame = useCurrentFrame();
  if (frame < from || (to != null && frame >= to)) return null;
  const leave = to == null ? 1 : interpolate(frame, [to - 8, to], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <div style={{
      position: 'absolute', left: SAFE.left, right: 1080 - SAFE.right, bottom: 1920 - 1372, opacity: leave,
      color: BRAND.text, textShadow: '0 4px 24px rgba(0,0,0,0.45)',
    }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '0.01em', textTransform: 'uppercase' }}>{kicker}</div>
      <div style={{ marginTop: 4, fontFamily: DISPLAY, fontWeight: 700, fontSize: 156, lineHeight: 0.84, letterSpacing: '-0.03em', textTransform: 'uppercase' }}>
        {title.map(line => <div key={line}>{line}</div>)}
      </div>
      {meta && <div style={{ marginTop: 16, fontFamily: DISPLAY, fontWeight: 500, fontSize: 32, letterSpacing: '0.01em' }}>{meta}</div>}
    </div>
  );
}

/** The brand's mark in the corner of the cover, where the profile grid shows it */
export function Signature({ tagline }: { tagline: string }) {
  return (
    <div style={{ position: 'absolute', right: 56, bottom: 64, textAlign: 'right', color: BRAND.text }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, letterSpacing: '0.12em', lineHeight: 1 }}>{BRAND_NAME}</div>
      <div style={{ marginTop: 6, fontFamily: MONO, fontSize: 15, letterSpacing: '0.18em', textTransform: 'uppercase', color: BRAND.textSub }}>{tagline}</div>
    </div>
  );
}
