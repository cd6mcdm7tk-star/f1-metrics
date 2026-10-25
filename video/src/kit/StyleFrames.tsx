import { useMemo } from 'react';
import { type CalculateMetadataFunction, useCurrentFrame } from 'remotion';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import { fetchDuel, type DuelQuery } from '../api';
import type { Duel } from '../duel/data';
import { SAFE, VIDEO } from '../format';
import MascotBubble from '../mascot/MascotBubble';
import { DISPLAY, MONO } from '../theme';
import Caption from './Caption';
import CornerSchematic, { SCHEMATIC_DONE } from './CornerSchematic';
import { cornerBraking } from './figures';
import Headline, { headline } from './Headline';
import Hud from './Hud';
import { INK } from './ink';
import { fitCamera, orbit } from './projection';
import ProofCard from './ProofCard';
import Stage from './Stage';
import { buildTrack, positionAt, valueAt } from './track';
import Track3D from './Track3D';

// Four still frames of the new series' look, one per kind of scene, from a
// real lap: the hook, the 3D track with the car's instruments, the 2D
// schematic, and the proof on the site. Frame n shows design n.

export const STYLE_QUERY: DuelQuery = { year: 2025, gp: 19, session: 'Q', drivers: ['VER', 'NOR'] };

export interface StyleFramesProps extends Record<string, unknown> {
  duel: Duel | null;
}

export const calculateStyleFrames: CalculateMetadataFunction<StyleFramesProps> = async ({ props }) => ({
  props: { ...props, duel: props.duel ?? (await fetchDuel(STYLE_QUERY)) },
});

const SERIES = 'LA BIBLE F1';
const EPISODE = 'ÉP. 01';
const WIDTH = SAFE.right - SAFE.left;

export default function StyleFrames({ duel }: StyleFramesProps) {
  const frame = useCurrentFrame();
  const scene = useMemo(() => {
    if (!duel) return null;
    const lap = duel.order[0];
    const track = buildTrack(duel.telemetry);
    const t1 = duel.telemetry.corners.find(c => c.number === 1)!.distance;
    const braking = cornerBraking(duel.telemetry, lap, t1);
    const driver = duel.drivers[0];
    return { lap, track, t1, braking, driver, color: teamColor(duel.teams[driver.code] ?? '') };
  }, [duel]);
  if (!duel || !scene) return null;
  const { lap, track, t1, braking, driver, color } = scene;
  const brakeZone = { from: braking.brakeAt ?? braking.topAt, to: braking.minAt, color: INK.brake, glow: true };
  const metres = Math.round((braking.minAt - braking.topAt) / 10) * 10;

  if (frame === 0) {
    // From the south-west, turn 1 in the foreground and the lap running away from it
    const camera = fitCamera(track.points.map(q => ({ ...q, z: 0 })), 0.95, 0.5, 40, { x: 24, y: 760, w: VIDEO.width - 48, h: 720 }, VIDEO);
    return (
      <Stage series={SERIES} episode={EPISODE} scene={
        <Track3D track={track} camera={camera} width={34} paints={[brakeZone]} car={{ distance: braking.brakeAt ?? t1 - 80, color, trail: 260 }}
          labels={[{ distance: t1, text: 'VIRAGE 1', side: 'right' }]} />
      }>
        <Headline lines={headline('Pourquoi ils ne\nroulent *jamais*\nau milieu\nde la piste ?')} size={100} style={{ position: 'absolute', top: 290, left: SAFE.left, width: WIDTH }} />
      </Stage>
    );
  }

  if (frame === 1) {
    const at = (braking.brakeAt ?? t1 - 80) + 20;
    const car = positionAt(track, at);
    // Above and behind the car, the corner ahead in the top half
    const camera = { ...orbit({ x: car.x + Math.cos(car.heading) * 90, y: car.y + Math.sin(car.heading) * 90, z: 0 }, 300, car.heading, 0.62, 50), shift: { x: 0, y: -350 } };
    const p = duel.telemetry.telemetry;
    const reading = {
      driver: driver.code, color, distance: at,
      speed: valueAt(p, at, q => q.speeds[lap]), gear: Math.round(valueAt(p, at, q => q.gears[lap])),
      throttle: valueAt(p, at, q => q.throttles[lap]), brake: valueAt(p, at, q => (q.brakes[lap] ? 1 : 0)) > 0.5,
    };
    return (
      <Stage series={SERIES} episode={EPISODE} fog scene={
        <Track3D track={track} camera={camera} width={14} paints={[brakeZone]} car={{ distance: at, color, trail: 90 }}
          labels={[{ distance: t1, text: 'VIRAGE 1', detail: `${Math.round(braking.min)} KM/H MINI`, side: 'right' }]} />
      }>
        <Caption text={`De ${Math.round(braking.top)} à ${Math.round(braking.min)} km/h en *${metres} mètres*.`} top={290} />
        <Hud reading={reading} top={1170} left={SAFE.left} width={WIDTH} />
      </Stage>
    );
  }

  if (frame === 2) {
    return (
      <Stage series={SERIES} episode={EPISODE}>
        <Headline lines={headline('La *corde*')} size={150} style={{ position: 'absolute', top: 280, left: SAFE.left }} />
        <div style={{ position: 'absolute', top: 452, left: SAFE.left, width: WIDTH, fontFamily: DISPLAY, fontWeight: 500, fontSize: 42, lineHeight: 1.15, color: INK.textSub }}>
          Le point où la voiture frôle l’intérieur du virage.
        </div>
        <CornerSchematic box={{ x: SAFE.left, y: 590, w: WIDTH, h: 760 }} state={SCHEMATIC_DONE} />
        <div style={{ position: 'absolute', top: 1376, left: SAFE.left, width: WIDTH, display: 'grid', gap: 12, fontFamily: MONO, fontSize: 22, letterSpacing: '0.06em', color: INK.text }}>
          <span><span style={{ color: INK.textSub }}>- - -</span>  au milieu : petit cercle, lent</span>
          <span>——  la trajectoire : grand cercle, rapide</span>
          <span style={{ color: INK.textSub }}>vitesse max ∝ √rayon</span>
        </div>
      </Stage>
    );
  }

  return (
    <Stage series={SERIES} episode={EPISODE}>
      <Headline lines={headline('La *preuve*')} size={130} style={{ position: 'absolute', top: 280, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 432, left: SAFE.left, fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em', color: INK.textSub, textTransform: 'uppercase' }}>
        Télémétrie réelle · {duel.location} {duel.year} · Qualifs
      </div>
      <ProofCard duel={duel} window={[t1 - 220, t1 + 140]} top={500} left={SAFE.left} width={WIDTH} />
      <div style={{ position: 'absolute', top: 1290, left: SAFE.left + 250, right: 1080 - SAFE.right, color: INK.text }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 76, lineHeight: 1 }}>{Math.round(braking.top)} → {Math.round(braking.min)} km/h</div>
        <div style={{ marginTop: 10, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub }}>{driver.code} · VIRAGE 1 · {driver.lapTime.toFixed(3)} S</div>
      </div>
      <MascotBubble lines={[]} from={-60} to={4} at={{ x: SAFE.left, y: 1300, size: 170 }} />
    </Stage>
  );
}
