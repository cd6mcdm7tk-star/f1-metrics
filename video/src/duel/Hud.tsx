import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { formatGap, type Lang } from '../i18n';
import { BRAND, DISPLAY, MONO } from '../theme';
import { interpolate, type Duel } from './data';
import type { PageStory } from './page';

const BOX = { x: 712, y: 214, w: 300, map: 168, pad: 16 };
/** Where the panel starts, for what sits to its left */
export const HUD_LEFT = BOX.x;
const LABEL: Record<Lang, string> = { fr: 'Écart', en: 'Gap' };

/** The track as the site draws it (FastF1's rotation, Y up), fitted to the box */
function useTrack(duel: Duel) {
  return useMemo(() => {
    const rot = (duel.telemetry.rotation * Math.PI) / 180;
    const points = duel.telemetry.telemetry;
    const rx = points.map(p => p.x * Math.cos(rot) - p.y * Math.sin(rot));
    const ry = points.map(p => -(p.x * Math.sin(rot) + p.y * Math.cos(rot)));
    const [minX, maxX, minY, maxY] = [Math.min(...rx), Math.max(...rx), Math.min(...ry), Math.max(...ry)];
    const w = BOX.w - 2 * BOX.pad, h = BOX.map;
    const scale = Math.min(w / (maxX - minX), h / (maxY - minY));
    const offX = BOX.pad + (w - (maxX - minX) * scale) / 2, offY = (h - (maxY - minY) * scale) / 2;
    const xs = rx.map(x => offX + (x - minX) * scale), ys = ry.map(y => offY + (y - minY) * scale);
    const at = (d: number) => {
      const k = interpolate(duel.distance, duel.distance.map((_, i) => i), d);
      const i = Math.floor(k), j = Math.min(i + 1, xs.length - 1), f = k - i;
      return { x: xs[i] + (xs[j] - xs[i]) * f, y: ys[i] + (ys[j] - ys[i]) * f };
    };
    return { xs, ys, at };
  }, [duel]);
}

/** Where the replay is on the track, the corner being told, and the gap between the laps */
export default function Hud({ duel, story, distance, lang }: { duel: Duel; story: PageStory; distance: number; lang: Lang }) {
  const frame = useCurrentFrame();
  const track = useTrack(duel);

  const path = (count: number) => track.xs.slice(0, count).map((x, i) => `${x.toFixed(1)},${track.ys[i].toFixed(1)}`).join(' ');
  const reached = duel.distance.findIndex(d => d > distance);
  const car = track.at(distance);
  const zoom = story.zooms.find(z => frame >= z.from && frame < z.to);
  const corner = zoom && track.at(zoom.apexAt);
  const pulse = (frame % 40) / 40;
  const gap = interpolate(story.gap.distance, story.gap.gap, distance);
  const slower = duel.drivers[1].code;

  return (
    <div style={{
      position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, padding: `${BOX.pad}px 0`, borderRadius: 12,
      background: 'rgba(61,12,16,0.9)', boxShadow: '0 12px 30px rgba(20,2,4,0.35)',
    }}>
      <svg width={BOX.w} height={BOX.map} style={{ display: 'block', overflow: 'visible' }}>
        <polyline points={path(track.xs.length)} fill="none" stroke={BRAND.textGhost} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={path(reached < 0 ? track.xs.length : reached)} fill="none" stroke={BRAND.text} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
        {corner && <circle cx={corner.x} cy={corner.y} r={10 + 14 * pulse} fill="none" stroke={BRAND.text} strokeWidth={3} opacity={1 - pulse} />}
        <circle cx={car.x} cy={car.y} r={8} fill={BRAND.bg} stroke={BRAND.text} strokeWidth={4} />
      </svg>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: `10px ${BOX.pad}px 0` }}>
        <span style={{ fontFamily: MONO, fontSize: 15, letterSpacing: '0.2em', textTransform: 'uppercase', color: BRAND.textSub }}>{LABEL[lang]}</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, color: BRAND.text, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
          {slower} {gap >= 0 ? '+' : '−'}{formatGap(gap, lang)}
        </span>
      </div>
    </div>
  );
}
