import { useCurrentFrame } from 'remotion';
import { SAFE } from '../../format';
import BarChart from '../../kit/BarChart';
import Headline, { headline } from '../../kit/Headline';
import { INK } from '../../kit/ink';
import Stage from '../../kit/Stage';
import VoiceCaption from '../../kit/VoiceCaption';
import { DISPLAY, MONO } from '../../theme';
import { EASE_OUT, ramp } from '../motion';
import { TOP_SPEEDS } from './data';
import type { AltitudeStory } from './story';

// The real numbers: each circuit's median top speed in 2025 qualifying, the
// slowest first, Mexico last and on top, Monza just under it.

const CHART = { x: SAFE.left, y: 560, w: SAFE.right - SAFE.left, h: 600 };

export default function SpeedsScene({ story, from, series, episode }: { story: AltitudeStory; from: number; series: string; episode: string }) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const mexico = TOP_SPEEDS[TOP_SPEEDS.length - 1];
  const monza = TOP_SPEEDS.find(s => s.circuit === 'Monza')!;
  const lit = (circuit: string) => (circuit === mexico.circuit ? ramp(frame, cues.mexico - 6, cues.mexico + 10) : circuit === monza.circuit ? ramp(frame, cues.ahead - 6, cues.ahead + 10) : 0);
  const shown = TOP_SPEEDS.map((_, i) => ramp(frame, cues.bars - 10 + i * 8, cues.bars + 20 + i * 8, EASE_OUT));
  const badge = ramp(frame, cues.ahead, cues.ahead + 16, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('Vitesse de *pointe*')} size={100} reveal={() => ramp(frame, from + 4, from + 22, EASE_OUT)} style={{ position: 'absolute', top: 280, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 400, left: SAFE.left, fontFamily: MONO, fontSize: 21, lineHeight: 1.5, letterSpacing: '0.12em', color: INK.textSub }}>
        QUALIFS 2025 · MÉDIANE DES 20 PILOTES · KM/H
      </div>
      <BarChart
        bars={TOP_SPEEDS.map(s => ({ label: s.circuit.toUpperCase(), value: s.speed, color: lit(s.circuit) > 0.5 ? (s === mexico ? INK.text : INK.textSub) : INK.textGhost }))}
        shown={shown} box={CHART} max={mexico.speed * 1.08} format={v => String(Math.round(v))}
      />
      {badge > 0 && (
        <div style={{
          position: 'absolute', top: 1205, left: 0, right: 0, textAlign: 'center', opacity: badge, transform: `scale(${0.8 + 0.2 * badge})`,
          fontFamily: DISPLAY, fontWeight: 700, fontSize: 50, color: INK.bg,
        }}>
          <span style={{ background: INK.text, padding: '4px 18px' }}>MEXICO +{Math.round(mexico.speed - monza.speed)} KM/H SUR MONZA</span>
        </div>
      )}
      <VoiceCaption line={beats.speeds} top={1300} />
      <div style={{ position: 'absolute', top: 1440, right: 1080 - SAFE.right, fontFamily: MONO, fontSize: 18, letterSpacing: '0.12em', color: INK.textSub }}>SOURCE : METRIKDELTA.COM</div>
    </Stage>
  );
}
