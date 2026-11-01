// What every episode of L'argent de la F1 shares: its layout, the circuit
// behind the figures, and the scenes that close it (standings, proof, end).
import { Img, staticFile, useCurrentFrame } from 'remotion';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import { SAFE, VIDEO } from '../format';
import Headline, { headline } from '../kit/Headline';
import { INK } from '../kit/ink';
import { EASE_OUT, ramp } from '../kit/motion';
import { orbit } from '../kit/projection';
import Stage from '../kit/Stage';
import type { Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import { BRAND_NAME, DISPLAY, MONO, SITE } from '../theme';
import type { VoiceLine } from '../voice';
import type { AccountsScan, SeasonSoFar } from './accounts';

export const SERIES = "L'ARGENT DE LA F1";

export const WIDTH = SAFE.right - SAFE.left;
export const CHART = { x: SAFE.left, y: 560, w: WIDTH, h: 800 };
export const kicker = { position: 'absolute' as const, left: SAFE.left, top: 470, fontFamily: MONO, fontSize: 24, letterSpacing: '0.2em', color: INK.textSub };
/** The same, centred across the frame */
export const centred = (top: number) => ({ ...kicker, top, left: 0, right: 0, textAlign: 'center' as const });

/** Bars coming in one after the other from `start` */
export const stagger = (frame: number, start: number, count: number, step = 10) =>
  Array.from({ length: count }, (_, i) => ramp(frame, start + i * step, start + i * step + 30, EASE_OUT));

/** The circuit turning slowly, dimmed behind the figures */
export function Backdrop({ track, frame, from, opacity = 0.4 }: { track: Track; frame: number; from: number; opacity?: number }) {
  const camera = orbit({ x: 0, y: 0, z: 0 }, Math.max(track.half.x, track.half.y) * 3.2, 0.4 + (frame - from) * 0.0015, 0.85, 40);
  return <div style={{ position: 'absolute', inset: 0, opacity }}><Track3D track={track} camera={camera} width={22} /></div>;
}

/** Where a scene sits in its episode */
export interface SceneFrame {
  from: number;
  series: string;
  episode: string;
}

/** The constructors' standings so far, the team picked out when the voice names its place (`at`) */
export function StandingsScene({ season, team, color, line, at, from, series, episode }: SceneFrame & {
  season: SeasonSoFar; team: string; color: string; line: VoiceLine; at: number;
}) {
  const frame = useCurrentFrame();
  const { standings, year, rounds } = season;
  const max = standings[0][1];
  const focus = ramp(frame, at - 10, at + 10);
  return (
    <Stage series={series} episode={episode}>
      <VoiceCaption line={line} top={300} />
      <div style={kicker}>CONSTRUCTEURS {year} · APRÈS {rounds} GRANDS PRIX</div>
      <div style={{ position: 'absolute', top: 530, left: SAFE.left, width: WIDTH }}>
        {standings.map(([name, points], i) => {
          const ours = name === team;
          const t = ramp(frame, from + 6 + i * 4, from + 30 + i * 4, EASE_OUT);
          return (
            <div key={name} style={{ display: 'grid', gridTemplateColumns: '330px 1fr 80px', alignItems: 'center', gap: 16, height: 74, opacity: ours ? 1 : 1 - 0.65 * focus }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: ours ? 36 : 30, color: INK.text, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>{i + 1}. {name.toUpperCase()}</span>
              <div style={{ height: ours ? 30 : 22, background: 'rgba(242,230,216,0.06)' }}>
                <div style={{ height: '100%', width: `${Math.max(0.6, (points / max) * 100) * t}%`, background: ours ? color : teamColor(name) }} />
              </div>
              <span style={{ fontFamily: MONO, fontSize: ours ? 34 : 26, textAlign: 'right', color: INK.text, fontVariantNumeric: 'tabular-nums' }}>{points}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 1380, right: VIDEO.width - SAFE.right, fontFamily: MONO, fontSize: 20, letterSpacing: '0.12em', color: INK.textSub }}>SOURCE : METRIKDELTA.COM/STATS</div>
    </Stage>
  );
}

/** The income statement's scan, its quoted lines circled when the voice names the accounts (`at`) */
export function ProofScene({ scan, company, number, line, at, from, series, episode }: SceneFrame & {
  scan: AccountsScan; company: string; number: string; line: VoiceLine; at: number;
}) {
  const frame = useCurrentFrame();
  const card = ramp(frame, from + 6, from + 30, EASE_OUT);
  const scale = WIDTH / scan.width;
  const marks = ramp(frame, at - 6, at + 14, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *preuve*')} size={110} reveal={() => ramp(frame, from, from + 18, EASE_OUT)} style={{ position: 'absolute', top: 270, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 392, left: SAFE.left, fontFamily: MONO, fontSize: 21, letterSpacing: '0.12em', color: INK.textSub }}>
        COMPANIES HOUSE · {company.toUpperCase()} · N° {number}
      </div>
      <div style={{
        position: 'absolute', top: 450, left: SAFE.left, width: WIDTH, height: scan.height * scale, overflow: 'hidden', borderRadius: 6,
        boxShadow: '0 30px 80px rgba(10,0,2,0.6)', opacity: card, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})`,
      }}>
        <Img src={staticFile(scan.file)} style={{ width: '100%', display: 'block' }} />
        {scan.rows.map(row => (
          <div key={row} style={{
            position: 'absolute', left: (scan.column[0] - 20) * scale, width: (scan.column[1] - scan.column[0] + 40) * scale,
            top: (row - 26) * scale, height: 52 * scale, border: `4px solid ${INK.brake}`, borderRadius: 4, opacity: marks,
          }} />
        ))}
      </div>
      <VoiceCaption line={line} top={1215} />
    </Stage>
  );
}

/** The closing card: a headline (`*word*` stressed), the last line, then the brand */
export function EndScene({ title, line, from, series, episode }: SceneFrame & { title: string; line: VoiceLine }) {
  const frame = useCurrentFrame();
  const brand = ramp(frame, from + 50, from + 70, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline
        lines={headline(title)} size={120} reveal={i => ramp(frame, from + 6 + i * 6, from + 22 + i * 6, EASE_OUT)}
        style={{ position: 'absolute', top: 300, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      />
      <VoiceCaption line={line} top={640} />
      <div style={{ position: 'absolute', top: 1360, left: 0, right: 0, textAlign: 'center', opacity: brand, transform: `translateY(${(1 - brand) * 30}px)` }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 64, letterSpacing: '0.16em', color: INK.text }}>{BRAND_NAME}</div>
        <div style={{ marginTop: 8, fontFamily: MONO, fontSize: 26, letterSpacing: '0.14em', color: INK.textSub }}>{SITE}</div>
      </div>
    </Stage>
  );
}
