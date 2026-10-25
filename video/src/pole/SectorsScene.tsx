import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE_OUT, ramp } from '../bible/motion';
import { SAFE, VIDEO } from '../format';
import { INK, inkOn } from '../kit/ink';
import { fitCamera } from '../kit/projection';
import Stage from '../kit/Stage';
import Track3D, { type Paint } from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import { DISPLAY, MONO } from '../theme';
import type { SceneProps } from './GridScenes';

// Who owns each sector, painted on the circuit in their team's colour, then
// the top six's top speeds as bars.

const MAP = { x: 40, y: 450, w: VIDEO.width - 80, h: 560 };

export default function SectorsScene({ session, facts, story, track, from, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const camera = fitCamera(ground, 1.1 + 0.15 * ramp(frame, from, story.beats.sectors.to + 40), 0.95, 40, MAP, VIDEO);
  const reveal = [story.cues.sectorOne, story.cues.sectorsTwo, story.cues.sectorsTwo + 12];
  const paints: Paint[] = facts.sectors.flatMap((sector, k) => (frame >= reveal[k]
    ? [{ from: k === 0 ? 0 : facts.sectors[k - 1].to, to: sector.to, color: sector.driver.color, glow: true }]
    : []));

  const speeds = session.drivers.map((driver, i) => ({ driver, speed: facts.topSpeeds[i] })).sort((a, b) => b.speed - a.speed);
  const [min, max] = [Math.min(...facts.topSpeeds) - 8, Math.max(...facts.topSpeeds)];
  const bars = ramp(frame, story.cues.topSpeed - 10, story.cues.topSpeed + 20, EASE_OUT);

  return (
    <Stage series={series} episode={episode} scene={<Track3D track={track} camera={camera} width={30} paints={paints} />}>
      <VoiceCaption line={story.beats.sectors} top={300} />
      <div style={{ position: 'absolute', top: 1030, left: SAFE.left, width: SAFE.right - SAFE.left, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {facts.sectors.map((sector, k) => {
          const t = ramp(frame, reveal[k] - 4, reveal[k] + 12, EASE_OUT);
          return (
            <div key={k} style={{ opacity: t, transform: `translateY(${(1 - t) * 24}px)`, padding: '10px 14px', background: sector.driver.color, color: inkOn(sector.driver.color) }}>
              <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.16em' }}>SECTEUR {k + 1}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 38, letterSpacing: '0.06em' }}>{sector.driver.code}</span>
                <span style={{ fontFamily: MONO, fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>{sector.time.toFixed(3)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {bars > 0 && (
        <div style={{ position: 'absolute', top: 1160, left: SAFE.left, width: SAFE.right - SAFE.left, opacity: bars, color: INK.text }}>
          <div style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.22em', color: INK.textSub }}>VITESSE DE POINTE · KM/H</div>
          {speeds.map(({ driver, speed }, i) => (
            <div key={driver.code} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 80px', alignItems: 'center', gap: 16, marginTop: 10 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: '0.08em' }}>{driver.code}</span>
              <div style={{ height: 18, background: 'rgba(242,230,216,0.08)' }}>
                <div style={{ height: '100%', width: `${((speed - min) / (max - min)) * 100 * ramp(frame, story.cues.topSpeed + i * 4, story.cues.topSpeed + i * 4 + 24, EASE_OUT)}%`, background: driver.color }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 26, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{Math.round(speed)}</span>
            </div>
          ))}
        </div>
      )}
    </Stage>
  );
}
