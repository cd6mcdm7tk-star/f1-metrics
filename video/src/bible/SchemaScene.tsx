import { useCurrentFrame } from 'remotion';
import { SAFE } from '../format';
import CornerSchematic, { RACING_MARKS, type SchematicState } from '../kit/CornerSchematic';
import Headline, { headline } from '../kit/Headline';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import type { CordeStory } from './corde';
import { EASE_OUT, ramp } from './motion';

// The corner from above, drawn as the voice explains it: the road, the line
// through its middle on a small circle, the racing line from turn-in to apex
// to exit, its much larger circle, and the exit where the throttle goes back
// down. A left-hander, like Austin's turn 1 that the 3D flight ends over.

const BOX = { x: SAFE.left, y: 470, w: SAFE.right - SAFE.left, h: 820 };

/** The racing line drawn so far: to each marker as the voice names it */
function racingDrawn(frame: number, cues: CordeStory['cues']): number {
  if (frame < cues.outside) return RACING_MARKS.turnIn * ramp(frame, cues.outside - 50, cues.outside);
  if (frame < cues.apex) return RACING_MARKS.turnIn + (RACING_MARKS.apex - RACING_MARKS.turnIn) * ramp(frame, cues.outside, cues.apex);
  if (frame < cues.out) return RACING_MARKS.apex + (RACING_MARKS.exit - RACING_MARKS.apex) * ramp(frame, cues.apex, cues.out);
  return RACING_MARKS.exit + (1 - RACING_MARKS.exit) * ramp(frame, cues.out, cues.out + 40);
}

export default function SchemaScene({ story, from, series, episode }: { story: CordeStory; from: number; series: string; episode: string }) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const racing = racingDrawn(frame, cues);

  // The car shows each line in turn: slow round the middle, along the racing
  // line as it is drawn, round it again, then out of the corner
  const car: SchematicState['car'] = frame < beats.line.from
    ? frame >= cues.smallCircle ? { line: 'middle', at: ramp(frame, cues.smallCircle, beats.middle.to, (t: number) => t), tag: frame >= cues.slow ? 'LENT' : undefined } : undefined
    : frame < beats.circle.from
      ? frame >= cues.outside - 50 ? { line: 'racing', at: racing } : undefined
      : frame < beats.exit.from
        ? { line: 'racing', at: ramp(frame, beats.circle.from, beats.circle.to), tag: frame >= cues.faster ? 'RAPIDE' : undefined }
        : { line: 'racing', at: RACING_MARKS.apex + (1 - RACING_MARKS.apex) * ramp(frame, cues.throttle - 30, beats.exit.to + 20, (t: number) => t * t) };

  const state: SchematicState = {
    road: ramp(frame, from, from + 24, EASE_OUT),
    middle: ramp(frame, cues.middleLine - 10, cues.middleLine + 50),
    smallCircle: ramp(frame, cues.smallCircle - 6, cues.smallCircle + 50),
    racing,
    markers: ramp(frame, cues.outside, cues.outside + 14) + ramp(frame, cues.apex, cues.apex + 14) + ramp(frame, cues.out, cues.out + 14),
    bigCircle: ramp(frame, cues.bigCircle, cues.bigCircle + 70),
    exit: ramp(frame, cues.exit, cues.exit + 30),
    formula: ramp(frame, cues.radius - 20, cues.radius + 10),
    car,
  };
  const title = ramp(frame, from + 4, from + 22, EASE_OUT);

  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *corde*')} size={130} reveal={() => title} style={{ position: 'absolute', top: 280, left: SAFE.left }} />
      <CornerSchematic box={BOX} state={state} mirror />
      {(['middle', 'line', 'circle', 'exit'] as const).map(beat => <VoiceCaption key={beat} line={beats[beat]} top={1320} />)}
    </Stage>
  );
}
