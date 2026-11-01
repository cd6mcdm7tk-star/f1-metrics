import { useCurrentFrame } from 'remotion';
import { SAFE } from '../../format';
import Headline, { headline } from '../../kit/Headline';
import { INK } from '../../kit/ink';
import Stage from '../../kit/Stage';
import VoiceCaption from '../../kit/VoiceCaption';
import { MONO } from '../../theme';
import { EASE_IN_OUT, EASE_OUT, ramp } from '../motion';
import AirField from './AirField';
import { airDensity, MEXICO_ALTITUDE } from './data';
import type { AltitudeStory } from './story';

// The air explained on the car, side on and heading right: the air it moves
// through, downforce pressing it down, drag holding it back. The air thins
// and both arrows shrink by the same share; bigger wings win back part of the
// downforce; then the price: the turbo spinning harder, the brakes hot.

const BOX = { x: SAFE.left, y: 520, w: SAFE.right - SAFE.left, h: 680 };
/** Arrow lengths at sea level (px) */
const DOWNFORCE = 220;
const DRAG = 360;
/** Where the arrows push: above the cockpit, and under the car's middle (px, in the box) */
const PRESS = { x: 470, y: 470 };
const HOLD = { x: 470, y: 650 };
const WHEELS = [250, 640];
/** The side profile, nose to the right (px, in the box) */
const BODY = 'M175 520 L200 500 L300 470 L360 430 L395 432 L420 470 L470 482 L560 500 L760 545 L800 560 L790 582 L175 582 Z';
const label = { fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em' };
const thin = 1 - airDensity(MEXICO_ALTITUDE);
const percent = (share: number) => `−${Math.round(share * 100)} %`;

function Arrow({ x1, y1, x2, y2, color, dashed = false }: { x1: number; y1: number; x2: number; y2: number; color: string; dashed?: boolean }) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const head = (side: number) => `${x2 - 22 * Math.cos(angle + side * 0.45)},${y2 - 22 * Math.sin(angle + side * 0.45)}`;
  return (
    <g stroke={color} strokeWidth={dashed ? 3 : 7} fill="none" strokeLinecap="round" opacity={dashed ? 0.5 : 1}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} strokeDasharray={dashed ? '10 10' : undefined} />
      {!dashed && <polyline points={`${head(1)} ${x2},${y2} ${head(-1)}`} />}
    </g>
  );
}

/** A turbo's compressor wheel, its blades turned by `angle` */
function Turbo({ x, y, angle }: { x: number; y: number; angle: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${(angle * 180) / Math.PI})`} stroke={INK.text} strokeWidth={3} fill="none">
      <circle r={24} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i * Math.PI) / 3;
        return <path key={i} d={`M0 0 Q ${14 * Math.cos(a + 0.6)} ${14 * Math.sin(a + 0.6)} ${22 * Math.cos(a)} ${22 * Math.sin(a)}`} />;
      })}
    </g>
  );
}

export default function AirScene({ story, from, series, episode }: { story: AltitudeStory; from: number; series: string; episode: string }) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;

  // Sea level first, then Mexico's air; the wings win part of the downforce back
  const thinning = ramp(frame, cues.lessGrip - 10, cues.lessGrip + 30, EASE_IN_OUT);
  const density = 1 - thin * thinning;
  const bigger = ramp(frame, cues.wings - 6, cues.wings + 30, EASE_OUT);
  const wing = 1 + 0.5 * bigger;
  const downforce = ramp(frame, cues.pressed - 6, cues.pressed + 18, EASE_OUT) * (density + thin * 0.5 * bigger);
  const drag = ramp(frame, cues.resistance - 6, cues.resistance + 14, EASE_OUT);
  const dragNow = 1 - thin * ramp(frame, cues.resistance + 14, cues.resistance + 44, EASE_IN_OUT);
  const glide = ramp(frame, cues.glide - 10, cues.glide + 40, EASE_IN_OUT);
  const flow = (frame - from) * 7 + Math.max(0, frame - cues.glide + 10) * 4 * glide;
  const turbo = ramp(frame, cues.turbo - 6, cues.turbo + 14, EASE_OUT);
  const spin = (frame - cues.turbo) * (0.15 + 0.6 * ramp(frame, cues.turbo, cues.turbo + 40, EASE_IN_OUT));
  const heat = ramp(frame, cues.brakes - 6, cues.brakes + 30, EASE_OUT);
  const car = ramp(frame, from, from + 24, EASE_OUT);
  const wingTop = 520 - 110 * wing;

  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline("Moins *d'air*")} size={120} reveal={() => ramp(frame, from + 4, from + 22, EASE_OUT)} style={{ position: 'absolute', top: 280, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 420, left: SAFE.left, ...label, fontSize: 24, color: thinning > 0.5 ? INK.brake : INK.textSub }}>
        {thinning > 0.5 ? `MEXICO · ${MEXICO_ALTITUDE.toLocaleString('fr-FR')} M · AIR ${percent(thin)}` : 'AU NIVEAU DE LA MER · AIR 100 %'}
      </div>
      <AirField box={BOX} density={density} flow={flow} />
      <svg style={{ position: 'absolute', left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h, overflow: 'visible', opacity: car }}>
        <line x1={0} y1={600} x2={BOX.w} y2={600} stroke={INK.textGhost} strokeWidth={2} />
        {/* Rear wing, growing to Monaco's */}
        <g stroke={INK.text} strokeWidth={3} fill={INK.bg}>
          <line x1={175} y1={510} x2={158} y2={wingTop + 14 * wing} />
          <rect x={120} y={wingTop} width={65} height={14 * wing} />
          <rect x={126} y={wingTop - 24 * wing} width={52} height={12 * wing} />
          <rect x={712} y={574} width={118} height={12} />
          <rect x={822} y={556} width={12} height={32} />
        </g>
        <path d={BODY} fill={INK.bg} stroke={INK.text} strokeWidth={3} strokeLinejoin="round" />
        <circle cx={430} cy={455} r={14} fill={INK.bg} stroke={INK.text} strokeWidth={3} />
        {WHEELS.map(x => (
          <g key={x}>
            <circle cx={x} cy={548} r={52} fill={INK.deep} stroke={INK.text} strokeWidth={3} />
            <circle cx={x} cy={548} r={24} fill={INK.brake} opacity={0.15 + 0.85 * heat} style={{ filter: heat > 0 ? `drop-shadow(0 0 ${18 * heat}px ${INK.brake})` : undefined }} />
          </g>
        ))}
        {turbo > 0 && <g opacity={turbo}><Turbo x={355} y={522} angle={spin} /></g>}

        {/* Downforce, over the sea-level length once the air thins */}
        {thinning > 0 && <Arrow x1={PRESS.x + 34} y1={PRESS.y - 12 - DOWNFORCE} x2={PRESS.x + 34} y2={PRESS.y - 12} color={INK.text} dashed />}
        {downforce > 0 && <Arrow x1={PRESS.x} y1={PRESS.y - 12 - DOWNFORCE * downforce} x2={PRESS.x} y2={PRESS.y - 12} color={INK.text} />}
        {/* Drag, under the car, pointing back */}
        {drag > 0 && <Arrow x1={HOLD.x} y1={HOLD.y} x2={HOLD.x - DRAG} y2={HOLD.y} color={INK.text} dashed />}
        {drag > 0 && <Arrow x1={HOLD.x} y1={HOLD.y} x2={HOLD.x - DRAG * drag * dragNow} y2={HOLD.y} color={INK.brake} />}
      </svg>

      <div style={{ position: 'absolute', left: BOX.x + PRESS.x + 60, top: BOX.y + PRESS.y - DOWNFORCE - 30, ...label, color: INK.text, opacity: downforce > 0 ? 1 : 0 }}>
        <div>APPUI</div>
        <div style={{ color: INK.brake, opacity: thinning }}>{percent(thin)}</div>
        <div style={{ marginTop: 6, fontSize: 18, color: INK.textSub, opacity: thinning }}>
          <span style={{ display: 'inline-block', width: 26, marginRight: 10, verticalAlign: 'middle', borderTop: `3px dashed ${INK.textSub}` }} />
          NIVEAU DE LA MER
        </div>
      </div>
      <div style={{ position: 'absolute', left: BOX.x + 10, top: BOX.y + wingTop - 80, ...label, color: INK.text, opacity: bigger }}>AILERONS DE MONACO</div>
      <div style={{ position: 'absolute', left: BOX.x + HOLD.x + 20, top: BOX.y + HOLD.y - 18, ...label, color: INK.text, opacity: drag }}>
        TRAÎNÉE <span style={{ color: INK.brake, opacity: ramp(frame, cues.resistance + 20, cues.resistance + 40) }}>{percent(thin)}</span>
      </div>
      <div style={{ position: 'absolute', left: BOX.x + 215, top: BOX.y + 352, ...label, color: INK.text, opacity: turbo }}>TURBO<br />PLUS DE TOURS</div>
      <div style={{ position: 'absolute', left: BOX.x + 500, top: BOX.y + 690, ...label, color: INK.brake, opacity: heat }}>FREINS · MAL REFROIDIS</div>
      {(['downforce', 'wings', 'drag', 'cost'] as const).map(beat => <VoiceCaption key={beat} line={beats[beat]} top={1320} />)}
    </Stage>
  );
}
